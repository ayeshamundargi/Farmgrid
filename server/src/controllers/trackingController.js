const prisma = require('../utils/prisma');
const { calculateDistance } = require('../algorithms/conflictEngine');
const { broadcastTracking, sendToUser } = require('../socket/socketHandler');

/**
 * Helper to generate a 4-digit verification OTP
 */
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Status sequence map for timeline progression
 */
const STATUS_ORDER = [
  'ASSIGNED',
  'LOCATION_AVAILABLE',
  'ON_THE_WAY',
  'REACHED_LAND',
  'OTP_VERIFIED',
  'WORK_STARTED',
  'WORK_IN_PROGRESS',
  'WORK_COMPLETED',
  'RETURNING',
  'COMPLETED'
];

/**
 * Get tracking details for a booking
 * If tracking record does not exist yet, initializes one automatically.
 */
async function getBookingTracking(req, res, next) {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        resource: {
          include: {
            owner: { select: { id: true, name: true, phone: true, email: true } }
          }
        },
        request: {
          include: {
            farm: true,
            farmer: { select: { id: true, name: true, phone: true, email: true } }
          }
        },
        tracking: true
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Access authorization: Farmer of request, Owner of resource, or Admin
    const isFarmer = booking.request.farmerId === req.user.id;
    const isOwner = booking.resource.ownerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isFarmer && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this booking tracking.' });
    }

    let tracking = booking.tracking;

    // Auto-initialize tracking if not present
    if (!tracking) {
      const farm = booking.request.farm;
      const resource = booking.resource;
      const initialDistance = calculateDistance(
        resource.latitude,
        resource.longitude,
        farm.latitude,
        farm.longitude
      );
      const estMins = Math.max(1, Math.round((initialDistance / 25) * 60));

      tracking = await prisma.tractorLocation.create({
        data: {
          bookingId: booking.id,
          resourceId: resource.id,
          latitude: resource.latitude,
          longitude: resource.longitude,
          status: booking.status === 'COMPLETED' ? 'COMPLETED' : 'ASSIGNED',
          otp: generateOtp(),
          isOtpVerified: false,
          distanceRemaining: parseFloat(initialDistance.toFixed(2)),
          estimatedMinutes: estMins,
          heading: 0,
          speed: 0
        }
      });
    }

    // Build rich tracking payload
    const responsePayload = {
      bookingId: booking.id,
      status: tracking.status,
      bookingStatus: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      resource: {
        id: booking.resource.id,
        name: booking.resource.name,
        type: booking.resource.type,
        depotLatitude: booking.resource.latitude,
        depotLongitude: booking.resource.longitude,
        fuelRequirement: booking.resource.fuelRequirement,
        owner: booking.resource.owner
      },
      farm: {
        id: booking.request.farm.id,
        name: booking.request.farm.name,
        crop: booking.request.farm.crop,
        cropStage: booking.request.farm.cropStage,
        latitude: booking.request.farm.latitude,
        longitude: booking.request.farm.longitude,
        address: booking.request.farm.address
      },
      farmer: booking.request.farmer,
      currentLocation: {
        latitude: tracking.latitude,
        longitude: tracking.longitude,
        heading: tracking.heading || 0,
        speed: tracking.speed || 0,
        distanceRemaining: tracking.distanceRemaining !== null ? tracking.distanceRemaining : 0,
        estimatedMinutes: tracking.estimatedMinutes !== null ? tracking.estimatedMinutes : 0,
        lastUpdated: tracking.updatedAt
      },
      otp: tracking.otp, // Farmer views OTP to give to driver
      isOtpVerified: tracking.isOtpVerified,
      timestamps: {
        arrivedAt: tracking.arrivedAt,
        startedAt: tracking.startedAt,
        completedAt: tracking.completedAt,
        createdAt: tracking.createdAt,
        updatedAt: tracking.updatedAt
      }
    };

    res.json({ success: true, data: responsePayload });
  } catch (error) {
    next(error);
  }
}

/**
 * Update live tractor location coordinates (sent periodically by operator device GPS or simulator)
 */
async function updateTractorLocation(req, res, next) {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const { latitude, longitude, heading = 0, speed = 0 } = req.body;

    if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        resource: true,
        request: { include: { farm: true, farmer: true } },
        tracking: true
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const farm = booking.request.farm;
    const distanceRemaining = calculateDistance(lat, lng, farm.latitude, farm.longitude);
    const currentSpeed = parseFloat(speed) > 0 ? parseFloat(speed) : 25.0;
    const estimatedMinutes = Math.max(1, Math.round((distanceRemaining / currentSpeed) * 60));

    let tracking = booking.tracking;
    if (!tracking) {
      tracking = await prisma.tractorLocation.create({
        data: {
          bookingId: booking.id,
          resourceId: booking.resourceId,
          latitude: lat,
          longitude: lng,
          status: 'ON_THE_WAY',
          otp: generateOtp(),
          isOtpVerified: false,
          distanceRemaining: parseFloat(distanceRemaining.toFixed(2)),
          estimatedMinutes,
          heading: parseFloat(heading) || 0,
          speed: parseFloat(speed) || 0
        }
      });
    }

    let nextStatus = tracking.status;
    let arrivedAt = tracking.arrivedAt;

    // Arrival Geofence Detection (< 0.1 km / 100 meters)
    const isWithinGeofence = distanceRemaining <= 0.1;
    let geofenceJustTriggered = false;

    if (isWithinGeofence && (tracking.status === 'ON_THE_WAY' || tracking.status === 'ASSIGNED' || tracking.status === 'LOCATION_AVAILABLE')) {
      nextStatus = 'REACHED_LAND';
      arrivedAt = new Date();
      geofenceJustTriggered = true;

      // Notify farmer of tractor arrival
      await prisma.notification.create({
        data: {
          userId: booking.request.farmerId,
          title: `🚜 Tractor Reached Land: ${booking.resource.name}`,
          message: `The tractor has arrived at ${farm.name}! Please share your 4-digit verification code (${tracking.otp}) with the operator to commence work.`,
          type: 'ALERT'
        }
      });

      sendToUser(booking.request.farmerId, 'notification', {
        title: `🚜 Tractor Reached Land!`,
        message: `${booking.resource.name} is at ${farm.name}. Verification OTP: ${tracking.otp}`,
        type: 'ALERT',
        time: new Date()
      });
    }

    // Update tracking record
    const updatedTracking = await prisma.tractorLocation.update({
      where: { id: tracking.id },
      data: {
        latitude: lat,
        longitude: lng,
        heading: parseFloat(heading) || 0,
        speed: parseFloat(speed) || 0,
        distanceRemaining: parseFloat(distanceRemaining.toFixed(2)),
        estimatedMinutes: isWithinGeofence ? 0 : estimatedMinutes,
        status: nextStatus,
        arrivedAt
      }
    });

    const updateEventPayload = {
      bookingId: booking.id,
      resourceId: booking.resourceId,
      latitude: lat,
      longitude: lng,
      heading: parseFloat(heading) || 0,
      speed: parseFloat(speed) || 0,
      distanceRemaining: parseFloat(distanceRemaining.toFixed(2)),
      estimatedMinutes: isWithinGeofence ? 0 : estimatedMinutes,
      status: nextStatus,
      updatedAt: updatedTracking.updatedAt,
      geofenceArrived: isWithinGeofence
    };

    // Emit live location update to tracking room and broadcast
    broadcastTracking(booking.id, 'tractorLocationUpdated', updateEventPayload);

    if (geofenceJustTriggered) {
      broadcastTracking(booking.id, 'trackingStatusChanged', {
        bookingId: booking.id,
        status: 'REACHED_LAND',
        arrivedAt,
        message: 'Tractor reached land geofence'
      });
    }

    res.json({
      success: true,
      data: updateEventPayload
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update tracking lifecycle status (Start Trip, Reached Land, Start Work, etc.)
 */
async function updateTrackingStatus(req, res, next) {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const { status } = req.body;

    if (!status || !STATUS_ORDER.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${STATUS_ORDER.join(', ')}`
      });
    }

    const targetStatus = status.toUpperCase();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        resource: true,
        request: { include: { farm: true, farmer: true } },
        tracking: true
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    let tracking = booking.tracking;
    if (!tracking) {
      tracking = await prisma.tractorLocation.create({
        data: {
          bookingId: booking.id,
          resourceId: booking.resourceId,
          latitude: booking.resource.latitude,
          longitude: booking.resource.longitude,
          status: targetStatus,
          otp: generateOtp(),
          isOtpVerified: false
        }
      });
    }

    const dataToUpdate = { status: targetStatus };

    if (targetStatus === 'REACHED_LAND' && !tracking.arrivedAt) {
      dataToUpdate.arrivedAt = new Date();
    } else if (targetStatus === 'WORK_STARTED' && !tracking.startedAt) {
      dataToUpdate.startedAt = new Date();
    } else if (targetStatus === 'WORK_COMPLETED' && !tracking.completedAt) {
      dataToUpdate.completedAt = new Date();
    } else if (targetStatus === 'COMPLETED') {
      dataToUpdate.completedAt = dataToUpdate.completedAt || new Date();
      // Mark parent booking as completed
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' }
      });
      await prisma.resourceRequest.update({
        where: { id: booking.requestId },
        data: { status: 'COMPLETED' }
      });
    }

    const updatedTracking = await prisma.tractorLocation.update({
      where: { id: tracking.id },
      data: dataToUpdate
    });

    // Generate informative notification message for farmer
    const farmName = booking.request.farm.name;
    const resourceName = booking.resource.name;
    let notifTitle = `Tractor Status: ${targetStatus.replace(/_/g, ' ')}`;
    let notifMessage = `Tractor ${resourceName} status updated to ${targetStatus.replace(/_/g, ' ')}.`;
    let notifType = 'INFO';

    switch (targetStatus) {
      case 'ON_THE_WAY':
        notifTitle = `🚜 Tractor On The Way!`;
        notifMessage = `${resourceName} has departed and is en route to ${farmName}. Track live location on your dashboard.`;
        notifType = 'INFO';
        break;
      case 'REACHED_LAND':
        notifTitle = `📍 Tractor Reached Land!`;
        notifMessage = `${resourceName} has arrived at ${farmName}. Please provide your 4-digit code (${tracking.otp}) to driver.`;
        notifType = 'ALERT';
        break;
      case 'OTP_VERIFIED':
        notifTitle = `✅ Driver OTP Verified`;
        notifMessage = `Operator code confirmed successfully. Equipment authorized for operation.`;
        notifType = 'SUCCESS';
        break;
      case 'WORK_STARTED':
        notifTitle = `🌱 Field Work Started`;
        notifMessage = `${resourceName} has started agricultural operations on ${farmName}.`;
        notifType = 'SUCCESS';
        break;
      case 'WORK_IN_PROGRESS':
        notifTitle = `⚙️ Work In Progress`;
        notifMessage = `Field work is proceeding on ${farmName}.`;
        notifType = 'INFO';
        break;
      case 'WORK_COMPLETED':
        notifTitle = `🎉 Field Work Completed!`;
        notifMessage = `Scheduled tasks successfully finished for ${farmName}. Preparing for return transit.`;
        notifType = 'SUCCESS';
        break;
      case 'RETURNING':
        notifTitle = `🚜 Tractor Returning`;
        notifMessage = `${resourceName} has concluded work and is returning to regional depot.`;
        notifType = 'INFO';
        break;
      case 'COMPLETED':
        notifTitle = `🏁 Booking Completed`;
        notifMessage = `Deployment #${booking.id} has safely finished all logistics and field work.`;
        notifType = 'SUCCESS';
        break;
      default:
        break;
    }

    await prisma.notification.create({
      data: {
        userId: booking.request.farmerId,
        title: notifTitle,
        message: notifMessage,
        type: notifType
      }
    });

    sendToUser(booking.request.farmerId, 'notification', {
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      time: new Date()
    });

    // Broadcast tracking status changed
    broadcastTracking(booking.id, 'trackingStatusChanged', {
      bookingId: booking.id,
      status: targetStatus,
      tracking: updatedTracking,
      title: notifTitle,
      message: notifMessage
    });

    res.json({
      success: true,
      message: `Tracking status updated to ${targetStatus}`,
      data: updatedTracking
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify OTP provided by farmer to tractor operator upon arrival
 */
async function verifyOtp(req, res, next) {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Please provide the 4-digit OTP.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        resource: true,
        request: { include: { farm: true, farmer: true } },
        tracking: true
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const tracking = booking.tracking;
    if (!tracking) {
      return res.status(400).json({ success: false, message: 'Tracking record not initialized for this booking.' });
    }

    const submittedOtp = otp.toString().trim();
    const expectedOtp = (tracking.otp || '').toString().trim();

    if (submittedOtp !== expectedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please verify the 4-digit code shown on the farmer dashboard.'
      });
    }

    // OTP Verified! Update status
    const updated = await prisma.tractorLocation.update({
      where: { id: tracking.id },
      data: {
        isOtpVerified: true,
        status: 'OTP_VERIFIED'
      }
    });

    // Notify farmer
    await prisma.notification.create({
      data: {
        userId: booking.request.farmerId,
        title: '✅ OTP Verified By Tractor Operator',
        message: `Your verification code (${expectedOtp}) was verified by the tractor driver. Field work is authorized to start!`,
        type: 'SUCCESS'
      }
    });

    sendToUser(booking.request.farmerId, 'notification', {
      title: '✅ OTP Verified Successfully!',
      message: `Driver verified the OTP for ${booking.resource.name}. Work ready to begin.`,
      type: 'SUCCESS',
      time: new Date()
    });

    broadcastTracking(booking.id, 'trackingOtpVerified', {
      bookingId: booking.id,
      status: 'OTP_VERIFIED',
      isOtpVerified: true
    });

    broadcastTracking(booking.id, 'trackingStatusChanged', {
      bookingId: booking.id,
      status: 'OTP_VERIFIED',
      isOtpVerified: true
    });

    res.json({
      success: true,
      message: 'OTP verified successfully. Equipment ready to commence work.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get active trackings for the logged-in user (farmer or operator)
 */
async function getActiveTrackings(req, res, next) {
  try {
    const isFarmer = req.user.role === 'FARMER';
    const isOwner = req.user.role === 'OWNER';

    let bookings = [];

    if (isFarmer) {
      bookings = await prisma.booking.findMany({
        where: {
          request: { farmerId: req.user.id },
          status: { in: ['ACTIVE', 'COMPLETED'] }
        },
        include: {
          resource: { include: { owner: true } },
          request: { include: { farm: true } },
          tracking: true
        },
        orderBy: { startTime: 'desc' },
        take: 10
      });
    } else if (isOwner) {
      bookings = await prisma.booking.findMany({
        where: {
          resource: { ownerId: req.user.id },
          status: { in: ['ACTIVE', 'COMPLETED'] }
        },
        include: {
          resource: { include: { owner: true } },
          request: { include: { farm: true, farmer: true } },
          tracking: true
        },
        orderBy: { startTime: 'desc' },
        take: 10
      });
    } else {
      // Admin sees all active
      bookings = await prisma.booking.findMany({
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
        include: {
          resource: { include: { owner: true } },
          request: { include: { farm: true, farmer: true } },
          tracking: true
        },
        orderBy: { startTime: 'desc' },
        take: 15
      });
    }

    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBookingTracking,
  updateTractorLocation,
  updateTrackingStatus,
  verifyOtp,
  getActiveTrackings
};
