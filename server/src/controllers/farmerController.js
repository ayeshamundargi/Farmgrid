const prisma = require('../utils/prisma');
const { calculatePriorityScore } = require('../algorithms/priorityEngine');
const { smartAllocateRequest, generateFeasibleSlots } = require('../algorithms/schedulerEngine');
const { handleCancellation } = require('../algorithms/reallocationEngine');
const { getIO } = require('../socket/socketHandler');

/**
 * Get farmer profile
 */
async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, role: true, farms: true }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * Update farmer profile
 */
async function updateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone },
      select: { id: true, name: true, email: true, phone: true, role: true }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new farm
 */
async function createFarm(req, res, next) {
  try {
    const { name, latitude, longitude, address, crop, cropStage = 'VEGETATIVE', cropArea = 1.0 } = req.body;

    if (!name || latitude === undefined || longitude === undefined || !crop) {
      return res.status(400).json({
        success: false,
        message: 'Farm name, latitude, longitude, and crop are required.'
      });
    }

    const farm = await prisma.farm.create({
      data: {
        farmerId: req.user.id,
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
        crop,
        cropStage,
        cropArea: parseFloat(cropArea)
      }
    });

    res.status(201).json({ success: true, data: farm });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all farms owned by the logged-in farmer
 */
async function getFarms(req, res, next) {
  try {
    const farms = await prisma.farm.findMany({
      where: { farmerId: req.user.id },
      include: {
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
    res.json({ success: true, data: farms });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new resource request with instant Priority Scoring and Smart Feasible Allocation
 */
async function createRequest(req, res, next) {
  try {
    const {
      farmId,
      resourceType,
      preferredResourceId,
      earliestStart,
      latestEnd,
      durationMinutes = 120,
      urgencyLevel = 'MEDIUM',
      urgencyReason,
      cropStage = 'VEGETATIVE',
      weatherRisk = 'LOW'
    } = req.body;

    if (!farmId || !resourceType || !earliestStart || !latestEnd) {
      return res.status(400).json({
        success: false,
        message: 'Farm ID, resource type, earliest start, and latest end are required.'
      });
    }

    // Verify farm exists and belongs to farmer
    const farm = await prisma.farm.findFirst({
      where: { id: parseInt(farmId), farmerId: req.user.id }
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Specified farm was not found for this farmer.'
      });
    }

    // 1. Create the request record
    const newRequest = await prisma.resourceRequest.create({
      data: {
        farmerId: req.user.id,
        farmId: farm.id,
        resourceType: resourceType.toUpperCase(),
        preferredResourceId: preferredResourceId ? parseInt(preferredResourceId) : null,
        earliestStart: new Date(earliestStart),
        latestEnd: new Date(latestEnd),
        durationMinutes: parseInt(durationMinutes),
        urgencyLevel: urgencyLevel.toUpperCase(),
        urgencyReason,
        cropStage: cropStage.toUpperCase(),
        weatherRisk: weatherRisk.toUpperCase(),
        status: 'PENDING'
      }
    });

    // 2. Fetch compatible resources and active bookings for scheduling evaluation
    const compatibleResources = await prisma.resource.findMany({
      where: {
        type: resourceType.toUpperCase(),
        status: { notIn: ['MAINTENANCE', 'UNAVAILABLE'] }
      }
    });

    const currentBookings = await prisma.booking.findMany({
      where: { status: 'ACTIVE' }
    });

    // 3. Run smart allocation
    const allocation = smartAllocateRequest(newRequest, farm, compatibleResources, currentBookings);

    // 4. Save PriorityScore calculation to database
    const priorityRecord = await prisma.priorityScore.create({
      data: {
        requestId: newRequest.id,
        urgencyScore: allocation.priority.urgencyScore,
        weatherScore: allocation.priority.weatherScore,
        cropReadinessScore: allocation.priority.cropReadinessScore,
        waitingScore: allocation.priority.waitingScore,
        distanceScore: allocation.priority.distanceScore,
        resourceConstraintScore: allocation.priority.resourceConstraintScore,
        totalScore: allocation.priority.totalScore,
        explanation: allocation.priority.explanation
      }
    });

    let booking = null;
    let finalStatus = 'WAITLIST';

    if (allocation.allocated) {
      finalStatus = 'SCHEDULED';

      // Create booking record
      booking = await prisma.booking.create({
        data: {
          requestId: newRequest.id,
          resourceId: allocation.resource.id,
          startTime: allocation.slot.startTime,
          endTime: allocation.slot.endTime,
          bufferBeforeMinutes: allocation.slot.bufferBeforeMinutes,
          bufferAfterMinutes: allocation.slot.bufferAfterMinutes,
          travelMinutes: allocation.slot.travelMinutes,
          status: 'ACTIVE',
          allocationExplanation: allocation.priority.explanation
        },
        include: { resource: true }
      });

      // Notify farmer
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: `Resource Allocated: ${allocation.resource.name}`,
          message: `Your request for ${resourceType} has been scheduled for ${new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Priority score: ${allocation.priority.totalScore}/100.`,
          type: 'SUCCESS'
        }
      });
    } else {
      // Could not allocate: Check if conflict with existing bookings
      finalStatus = allocation.reason.toLowerCase().includes('conflict') ? 'CONFLICT' : 'WAITLIST';

      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: `Request ${finalStatus === 'CONFLICT' ? 'Conflict Detected' : 'Waitlisted'}`,
          message: allocation.reason,
          type: 'ALERT'
        }
      });
    }

    // Update request with final status and score
    const updatedRequest = await prisma.resourceRequest.update({
      where: { id: newRequest.id },
      data: {
        status: finalStatus,
        priorityScore: allocation.priority.totalScore
      },
      include: {
        farm: true,
        booking: { include: { resource: true } },
        priorityScores: true
      }
    });

    // Broadcast update via Socket.IO
    const io = getIO();
    if (io) {
      io.emit('scheduleUpdated', { requestId: updatedRequest.id, status: finalStatus });
      if (finalStatus === 'CONFLICT') {
        io.emit('conflictDetected', {
          request: updatedRequest,
          reason: allocation.reason
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        request: updatedRequest,
        priority: priorityRecord,
        booking,
        allocationResult: allocation
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all requests for logged-in farmer
 */
async function getMyRequests(req, res, next) {
  try {
    const requests = await prisma.resourceRequest.findMany({
      where: { farmerId: req.user.id },
      include: {
        farm: true,
        booking: { include: { resource: true } },
        priorityScores: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single request by ID with full priority and booking breakdown
 */
async function getRequestById(req, res, next) {
  try {
    const { id } = req.params;
    const request = await prisma.resourceRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        farm: true,
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        booking: { include: { resource: true } },
        priorityScores: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Authorize farmer or admin
    if (req.user.role === 'FARMER' && request.farmerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to this request.' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
}

/**
 * Get detailed priority breakdown for a request
 */
async function getRequestPriority(req, res, next) {
  try {
    const { id } = req.params;
    const priority = await prisma.priorityScore.findFirst({
      where: { requestId: parseInt(id) },
      orderBy: { createdAt: 'desc' }
    });

    if (!priority) {
      return res.status(404).json({ success: false, message: 'Priority score not found for this request.' });
    }

    res.json({ success: true, data: priority });
  } catch (error) {
    next(error);
  }
}

/**
 * Get assigned schedule and timeline for a request
 */
async function getRequestSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { requestId: parseInt(id) },
      include: {
        resource: true,
        request: { include: { farm: true } }
      }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'No active booking found for this request.' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel a request and reallocate capacity if booking existed
 */
async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    const request = await prisma.resourceRequest.findUnique({
      where: { id: parseInt(id) },
      include: { booking: true }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (req.user.role === 'FARMER' && request.farmerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this request.' });
    }

    if (request.booking && request.booking.status === 'ACTIVE') {
      const io = getIO();
      await handleCancellation(request.booking.id, prisma, io);
    } else {
      await prisma.resourceRequest.update({
        where: { id: request.id },
        data: { status: 'CANCELLED' }
      });
    }

    res.json({ success: true, message: 'Request cancelled successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  createFarm,
  getFarms,
  createRequest,
  getMyRequests,
  getRequestById,
  getRequestPriority,
  getRequestSchedule,
  cancelRequest
};
