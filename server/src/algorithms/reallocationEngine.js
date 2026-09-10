/**
 * FarmGrid Dynamic Reallocation Engine
 * Handles real-world disruptions (breakdowns, heavy rain, cancellations),
 * recalculates priorities, searches alternate resources, updates schedules,
 * and broadcasts real-time updates via Socket.IO.
 */

const { smartAllocateRequest } = require('./schedulerEngine');
const { calculatePriorityScore } = require('./priorityEngine');

/**
 * Handle resource disruption (Breakdown, Weather, etc.)
 *
 * @param {Number} disruptionId
 * @param {Object} prisma - Prisma Client instance
 * @param {Object|null} io - Socket.IO server instance
 */
async function handleDisruption(disruptionId, prisma, io = null) {
  const disruption = await prisma.disruption.findUnique({
    where: { id: disruptionId },
    include: { resource: true }
  });

  if (!disruption) {
    throw new Error(`Disruption with ID ${disruptionId} not found`);
  }

  const resourceId = disruption.resourceId;

  // 1. Update resource status to MAINTENANCE or UNAVAILABLE
  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      status: disruption.type === 'BREAKDOWN' ? 'MAINTENANCE' : 'UNAVAILABLE',
      maintenanceStatus: disruption.type === 'BREAKDOWN' ? 'IN_PROGRESS' : 'SCHEDULED'
    }
  });

  // 2. Identify affected active bookings
  const affectedBookings = await prisma.booking.findMany({
    where: {
      resourceId,
      status: 'ACTIVE',
      endTime: { gte: disruption.startTime }
    },
    include: {
      request: {
        include: { farm: true, farmer: true }
      },
      resource: true
    }
  });

  // 3. Mark affected bookings as DISRUPTED
  for (const b of affectedBookings) {
    await prisma.booking.update({
      where: { id: b.id },
      data: { status: 'DISRUPTED' }
    });
  }

  // 4. Fetch all available resources and active bookings for reallocation
  const allResources = await prisma.resource.findMany({
    where: {
      status: { notIn: ['MAINTENANCE', 'UNAVAILABLE'] }
    }
  });

  const activeBookings = await prisma.booking.findMany({
    where: { status: 'ACTIVE' }
  });

  const reallocated = [];
  const waitlisted = [];

  // 5. Attempt smart reallocation for each affected request
  for (const b of affectedBookings) {
    const request = b.request;
    const farm = request.farm;

    const allocation = smartAllocateRequest(request, farm, allResources, activeBookings);

    if (allocation.allocated) {
      // Create new booking on alternate resource
      const newBooking = await prisma.booking.create({
        data: {
          requestId: request.id,
          resourceId: allocation.resource.id,
          startTime: allocation.slot.startTime,
          endTime: allocation.slot.endTime,
          bufferBeforeMinutes: allocation.slot.bufferBeforeMinutes,
          bufferAfterMinutes: allocation.slot.bufferAfterMinutes,
          travelMinutes: allocation.slot.travelMinutes,
          status: 'ACTIVE',
          allocationExplanation: `Reallocated due to disruption on ${b.resource.name} (${disruption.title}): ${allocation.priority.explanation}`
        },
        include: { resource: true }
      });

      // Update request status
      await prisma.resourceRequest.update({
        where: { id: request.id },
        data: {
          status: 'SCHEDULED',
          priorityScore: allocation.priority.totalScore
        }
      });

      // Add to running activeBookings so subsequent iterations don't double book
      activeBookings.push(newBooking);

      // Create notification
      const notifMessage = `${disruption.resource.name} experienced a disruption (${disruption.title}). Your request was seamlessly reallocated to ${allocation.resource.name} for ${new Date(newBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
      await prisma.notification.create({
        data: {
          userId: request.farmerId,
          title: `Booking Reallocated: ${allocation.resource.name}`,
          message: notifMessage,
          type: 'WARNING'
        }
      });

      reallocated.push({
        request,
        oldResource: b.resource,
        newResource: allocation.resource,
        oldSlot: { startTime: b.startTime, endTime: b.endTime },
        newSlot: allocation.slot,
        booking: newBooking
      });
    } else {
      // Mark as WAITLIST
      await prisma.resourceRequest.update({
        where: { id: request.id },
        data: {
          status: 'WAITLIST',
          priorityScore: allocation.priority.totalScore
        }
      });

      // Create notification
      const waitlistMsg = `${disruption.resource.name} experienced a disruption (${disruption.title}). No immediate alternative slot is available; your request has been placed into priority WAITLIST.`;
      await prisma.notification.create({
        data: {
          userId: request.farmerId,
          title: 'Request Waitlisted due to Disruption',
          message: waitlistMsg,
          type: 'ALERT'
        }
      });

      waitlisted.push({
        request,
        resource: b.resource,
        reason: allocation.reason,
        priority: allocation.priority
      });
    }
  }

  const result = {
    disruption,
    totalAffected: affectedBookings.length,
    reallocatedCount: reallocated.length,
    waitlistedCount: waitlisted.length,
    reallocated,
    waitlisted
  };

  // 6. Broadcast via Socket.IO if connected
  if (io) {
    io.emit('disruptionCreated', disruption);
    io.emit('bookingReallocated', result);
    io.emit('scheduleUpdated', { source: 'disruption', disruptionId });
  }

  return result;
}

/**
 * Handle booking cancellation and reallocate freed capacity to waitlisted farmers
 *
 * @param {Number} bookingId
 * @param {Object} prisma
 * @param {Object|null} io
 */
async function handleCancellation(bookingId, prisma, io = null) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { request: true, resource: true }
  });

  if (!booking) {
    throw new Error(`Booking with ID ${bookingId} not found`);
  }

  // 1. Mark booking CANCELLED and request CANCELLED
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' }
  });

  await prisma.resourceRequest.update({
    where: { id: booking.requestId },
    data: { status: 'CANCELLED' }
  });

  // 2. Find eligible waitlisted or pending requests
  const waitingRequests = await prisma.resourceRequest.findMany({
    where: {
      status: { in: ['WAITLIST', 'PENDING'] },
      resourceType: booking.resource.type
    },
    include: { farm: true, farmer: true }
  });

  let reallocatedRequest = null;
  let newBooking = null;

  if (waitingRequests.length > 0) {
    // Rank waiting requests by priority score
    const scoredRequests = waitingRequests.map(req => ({
      req,
      priority: calculatePriorityScore(req, req.farm, booking.resource)
    }));

    scoredRequests.sort((a, b) => b.priority.totalScore - a.priority.totalScore);

    const activeBookings = await prisma.booking.findMany({
      where: { status: 'ACTIVE' }
    });

    for (const item of scoredRequests) {
      const allocation = smartAllocateRequest(item.req, item.req.farm, [booking.resource], activeBookings);

      if (allocation.allocated) {
        newBooking = await prisma.booking.create({
          data: {
            requestId: item.req.id,
            resourceId: booking.resource.id,
            startTime: allocation.slot.startTime,
            endTime: allocation.slot.endTime,
            bufferBeforeMinutes: allocation.slot.bufferBeforeMinutes,
            bufferAfterMinutes: allocation.slot.bufferAfterMinutes,
            travelMinutes: allocation.slot.travelMinutes,
            status: 'ACTIVE',
            allocationExplanation: `Allocated from waitlist after cancellation of booking #${booking.id}: ${allocation.priority.explanation}`
          }
        });

        await prisma.resourceRequest.update({
          where: { id: item.req.id },
          data: {
            status: 'SCHEDULED',
            priorityScore: allocation.priority.totalScore
          }
        });

        await prisma.notification.create({
          data: {
            userId: item.req.farmerId,
            title: `Capacity Available: ${booking.resource.name}`,
            message: `A newly freed slot on ${booking.resource.name} has been allocated to your waitlisted request!`,
            type: 'SUCCESS'
          }
        });

        reallocatedRequest = item.req;
        break;
      }
    }
  }

  const result = {
    cancelledBookingId: bookingId,
    reallocatedRequest,
    newBooking
  };

  if (io) {
    io.emit('scheduleUpdated', { source: 'cancellation', bookingId });
  }

  return result;
}

module.exports = {
  handleDisruption,
  handleCancellation
};
