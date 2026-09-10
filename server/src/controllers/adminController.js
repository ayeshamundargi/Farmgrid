const prisma = require('../utils/prisma');
const { findAllConflicts } = require('../algorithms/conflictEngine');
const { generateMasterSchedule } = require('../algorithms/schedulerEngine');
const { handleDisruption, handleCancellation } = require('../algorithms/reallocationEngine');
const { getIO } = require('../socket/socketHandler');

/**
 * Get comprehensive Master Admin Dashboard metrics & charts data
 */
async function getDashboard(req, res, next) {
  try {
    const [
      totalResources,
      resourcesByStatus,
      totalRequests,
      requestsByStatus,
      activeBookings,
      allBookings,
      highPriorityRequests,
      recentDisruptions
    ] = await Promise.all([
      prisma.resource.count(),
      prisma.resource.groupBy({ by: ['status'], _count: true }),
      prisma.resourceRequest.count(),
      prisma.resourceRequest.groupBy({ by: ['status'], _count: true }),
      prisma.booking.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.findMany({ include: { resource: true, request: { include: { farm: true } } } }),
      prisma.resourceRequest.count({ where: { priorityScore: { gte: 80 } } }),
      prisma.disruption.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { resource: true } })
    ]);

    // Calculate system conflicts
    const conflicts = findAllConflicts(allBookings);

    // Requests by resource type for charts
    const requestsByType = await prisma.resourceRequest.groupBy({
      by: ['resourceType'],
      _count: true
    });

    // Priority distribution
    const allScores = await prisma.priorityScore.findMany({ select: { totalScore: true } });
    const priorityDistribution = [
      { range: '0-20', count: allScores.filter(s => s.totalScore <= 20).length },
      { range: '21-40', count: allScores.filter(s => s.totalScore > 20 && s.totalScore <= 40).length },
      { range: '41-60', count: allScores.filter(s => s.totalScore > 40 && s.totalScore <= 60).length },
      { range: '61-80', count: allScores.filter(s => s.totalScore > 60 && s.totalScore <= 80).length },
      { range: '81-100', count: allScores.filter(s => s.totalScore > 80).length }
    ];

    const statusCounts = requestsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {});

    const resourceCounts = resourcesByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          totalResources,
          availableResources: resourceCounts['AVAILABLE'] || 0,
          bookedResources: resourceCounts['BOOKED'] || 0,
          maintenanceResources: resourceCounts['MAINTENANCE'] || 0,
          totalRequests,
          activeBookings,
          scheduledRequests: statusCounts['SCHEDULED'] || 0,
          waitlistedRequests: statusCounts['WAITLIST'] || 0,
          pendingRequests: statusCounts['PENDING'] || 0,
          conflictRequests: statusCounts['CONFLICT'] || 0,
          activeConflictsCount: conflicts.length,
          highPriorityCount: highPriorityRequests
        },
        charts: {
          requestsByType: requestsByType.map(r => ({ type: r.resourceType, count: r._count })),
          priorityDistribution,
          resourceStatuses: [
            { name: 'Available', value: resourceCounts['AVAILABLE'] || 0 },
            { name: 'Booked', value: resourceCounts['BOOKED'] || 0 },
            { name: 'Maintenance', value: resourceCounts['MAINTENANCE'] || 0 }
          ],
          requestStatuses: [
            { name: 'Scheduled', value: statusCounts['SCHEDULED'] || 0 },
            { name: 'Waitlist', value: statusCounts['WAITLIST'] || 0 },
            { name: 'Conflict', value: statusCounts['CONFLICT'] || 0 },
            { name: 'Pending', value: statusCounts['PENDING'] || 0 }
          ]
        },
        recentDisruptions
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all resources
 */
async function getAllResources(req, res, next) {
  try {
    const resources = await prisma.resource.findMany({
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        bookings: { where: { status: 'ACTIVE' } }
      },
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all requests
 */
async function getAllRequests(req, res, next) {
  try {
    const requests = await prisma.resourceRequest.findMany({
      include: {
        farmer: { select: { id: true, name: true, phone: true } },
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
 * Get all bookings
 */
async function getAllBookings(req, res, next) {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        resource: true,
        request: {
          include: {
            farmer: { select: { id: true, name: true } },
            farm: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
}

/**
 * Get detected conflicts across active bookings
 */
async function getConflicts(req, res, next) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'ACTIVE' },
      include: {
        resource: true,
        request: { include: { farmer: true, farm: true } }
      }
    });

    const conflicts = findAllConflicts(bookings);

    // Also include requests in CONFLICT status
    const conflictRequests = await prisma.resourceRequest.findMany({
      where: { status: 'CONFLICT' },
      include: {
        farmer: true,
        farm: true,
        priorityScores: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    res.json({
      success: true,
      data: {
        bookingConflicts: conflicts,
        conflictRequests,
        totalConflicts: conflicts.length + conflictRequests.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get the Priority Queue ranked deterministically
 */
async function getPriorityQueue(req, res, next) {
  try {
    const requests = await prisma.resourceRequest.findMany({
      include: {
        farmer: { select: { id: true, name: true } },
        farm: true,
        booking: { include: { resource: true } },
        priorityScores: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { priorityScore: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

/**
 * Get full Master Schedule formatted for timeline visualization
 */
async function getMasterSchedule(req, res, next) {
  try {
    const resources = await prisma.resource.findMany({
      include: {
        bookings: {
          where: { status: { in: ['ACTIVE', 'DISRUPTED'] } },
          include: {
            request: {
              include: {
                farmer: { select: { id: true, name: true } },
                farm: true
              }
            }
          },
          orderBy: { startTime: 'asc' }
        },
        disruptions: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    // Format into visual timeline items
    const timelineData = resources.map(resItem => {
      const blocks = [];

      // Add bookings with buffer and travel intervals
      for (const b of resItem.bookings) {
        const start = new Date(b.startTime);
        const end = new Date(b.endTime);

        // Travel block before booking
        if (b.travelMinutes > 0) {
          const travelStart = new Date(start.getTime() - b.travelMinutes * 60000);
          blocks.push({
            id: `travel-${b.id}`,
            type: 'TRAVEL',
            startTime: travelStart,
            endTime: start,
            title: `Transit (${b.travelMinutes}m)`,
            farmerName: b.request.farmer.name,
            farmName: b.request.farm.name
          });
        }

        // Buffer before
        if (b.bufferBeforeMinutes > 0) {
          const bufferStart = new Date(start.getTime() - (b.travelMinutes + b.bufferBeforeMinutes) * 60000);
          blocks.push({
            id: `buf-before-${b.id}`,
            type: 'BUFFER',
            startTime: bufferStart,
            endTime: new Date(start.getTime() - b.travelMinutes * 60000),
            title: `Prep Buffer (${b.bufferBeforeMinutes}m)`
          });
        }

        // Main booking block
        blocks.push({
          id: `book-${b.id}`,
          bookingId: b.id,
          type: b.status === 'DISRUPTED' ? 'CONFLICT' : 'BOOKING',
          startTime: start,
          endTime: end,
          title: `${b.request.farmer.name} - ${b.request.farm.crop}`,
          farmerName: b.request.farmer.name,
          farmName: b.request.farm.name,
          status: b.status,
          explanation: b.allocationExplanation
        });

        // Buffer after
        if (b.bufferAfterMinutes > 0) {
          blocks.push({
            id: `buf-after-${b.id}`,
            type: 'BUFFER',
            startTime: end,
            endTime: new Date(end.getTime() + b.bufferAfterMinutes * 60000),
            title: `Logistics Buffer (${b.bufferAfterMinutes}m)`
          });
        }
      }

      // Add maintenance blocks
      for (const d of resItem.disruptions) {
        blocks.push({
          id: `disruption-${d.id}`,
          type: 'MAINTENANCE',
          startTime: new Date(d.startTime),
          endTime: d.endTime ? new Date(d.endTime) : new Date(new Date(d.startTime).getTime() + 8 * 3600000),
          title: `[${d.type}] ${d.title}`,
          description: d.description
        });
      }

      // Sort chronological
      blocks.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      return {
        resourceId: resItem.id,
        resourceName: resItem.name,
        resourceType: resItem.type,
        status: resItem.status,
        operatingStart: resItem.operatingStart,
        operatingEnd: resItem.operatingEnd,
        blocks
      };
    });

    res.json({ success: true, data: timelineData });
  } catch (error) {
    next(error);
  }
}

/**
 * Disruption Simulator endpoint (Simulate Breakdown, Heavy Rain, Cancellation)
 * Returns BEFORE vs AFTER diff!
 */
async function simulateDisruption(req, res, next) {
  try {
    const { type, resourceId, bookingId, rainSeverity = 'HIGH' } = req.body;

    const io = getIO();

    if (type === 'BREAKDOWN') {
      let targetResourceId = resourceId;

      // If no specific resourceId provided, pick the first active resource with bookings
      if (!targetResourceId) {
        const busyResource = await prisma.resource.findFirst({
          where: {
            status: 'AVAILABLE',
            bookings: { some: { status: 'ACTIVE' } }
          }
        });
        if (busyResource) {
          targetResourceId = busyResource.id;
        } else {
          const anyRes = await prisma.resource.findFirst();
          targetResourceId = anyRes ? anyRes.id : 1;
        }
      }

      // Capture BEFORE state
      const beforeResource = await prisma.resource.findUnique({
        where: { id: parseInt(targetResourceId) },
        include: { bookings: { where: { status: 'ACTIVE' }, include: { request: { include: { farmer: true } } } } }
      });

      // Create disruption record
      const disruption = await prisma.disruption.create({
        data: {
          resourceId: parseInt(targetResourceId),
          type: 'BREAKDOWN',
          title: `Simulated Breakdown: Engine Failure on ${beforeResource.name}`,
          description: 'Emergency mechanical breakdown triggered during hackathon demo.',
          startTime: new Date(),
          severity: 'CRITICAL',
          status: 'ACTIVE'
        }
      });

      // Run reallocation engine
      const reallocation = await handleDisruption(disruption.id, prisma, io);

      // Return Before & After diff
      return res.status(201).json({
        success: true,
        message: `Breakdown simulated on ${beforeResource.name}. Reallocation completed.`,
        data: {
          type: 'BREAKDOWN',
          resource: beforeResource,
          before: {
            resourceName: beforeResource.name,
            status: beforeResource.status,
            activeBookingsCount: beforeResource.bookings.length,
            bookings: beforeResource.bookings
          },
          after: {
            resourceName: beforeResource.name,
            status: 'MAINTENANCE',
            reallocatedCount: reallocation.reallocatedCount,
            waitlistedCount: reallocation.waitlistedCount,
            reallocatedDetails: reallocation.reallocated,
            waitlistedDetails: reallocation.waitlisted
          },
          reallocation
        }
      });
    } else if (type === 'WEATHER') {
      // Simulate heavy rain across area
      // Updates weatherRisk to HIGH/CRITICAL for active requests and re-runs priorities & allocations
      const affectedRequests = await prisma.resourceRequest.findMany({
        where: { status: { in: ['PENDING', 'WAITLIST', 'SCHEDULED'] } },
        include: { farm: true }
      });

      for (const reqItem of affectedRequests) {
        await prisma.resourceRequest.update({
          where: { id: reqItem.id },
          data: { weatherRisk: rainSeverity.toUpperCase() }
        });
      }

      // Trigger reallocation across system
      const reallocation = await executeMasterReallocation();

      if (io) {
        io.emit('scheduleUpdated', { source: 'weather_simulation' });
      }

      return res.json({
        success: true,
        message: `Simulated Heavy Rain event. Priority scores elevated for ${affectedRequests.length} requests and schedule re-computed.`,
        data: {
          type: 'WEATHER',
          severity: rainSeverity,
          affectedRequestsCount: affectedRequests.length,
          reallocation
        }
      });
    } else if (type === 'CANCELLATION') {
      let targetBookingId = bookingId;

      if (!targetBookingId) {
        const anyActive = await prisma.booking.findFirst({
          where: { status: 'ACTIVE' },
          include: { resource: true, request: { include: { farmer: true } } }
        });
        if (!anyActive) {
          return res.status(400).json({ success: false, message: 'No active bookings available to cancel.' });
        }
        targetBookingId = anyActive.id;
      }

      const cancellationResult = await handleCancellation(parseInt(targetBookingId), prisma, io);

      return res.json({
        success: true,
        message: 'Booking cancelled and waitlist reallocation executed.',
        data: {
          type: 'CANCELLATION',
          cancellationResult
        }
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid disruption type. Use BREAKDOWN, WEATHER, or CANCELLATION.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper to run master scheduling over all pending/waitlisted requests
 */
async function executeMasterReallocation() {
  const pendingRequests = await prisma.resourceRequest.findMany({
    where: { status: { in: ['PENDING', 'WAITLIST'] } },
    include: { farm: true }
  });

  const allResources = await prisma.resource.findMany({
    where: { status: { notIn: ['MAINTENANCE', 'UNAVAILABLE'] } }
  });

  const activeBookings = await prisma.booking.findMany({
    where: { status: 'ACTIVE' }
  });

  const farms = await prisma.farm.findMany();
  const farmsMap = farms.reduce((acc, f) => { acc[f.id] = f; return acc; }, {});

  const schedule = generateMasterSchedule(pendingRequests, allResources, activeBookings, farmsMap);

  // Commit scheduled bookings to DB
  for (const item of schedule.scheduled) {
    const existing = await prisma.booking.findUnique({
      where: { requestId: item.request.id }
    });

    if (!existing) {
      await prisma.booking.create({
        data: {
          requestId: item.request.id,
          resourceId: item.resource.id,
          startTime: item.slot.startTime,
          endTime: item.slot.endTime,
          bufferBeforeMinutes: item.slot.bufferBeforeMinutes,
          bufferAfterMinutes: item.slot.bufferAfterMinutes,
          travelMinutes: item.slot.travelMinutes,
          status: 'ACTIVE',
          allocationExplanation: item.priority.explanation
        }
      });
    }

    await prisma.resourceRequest.update({
      where: { id: item.request.id },
      data: {
        status: 'SCHEDULED',
        priorityScore: item.priority.totalScore
      }
    });
  }

  // Update waitlisted
  for (const item of schedule.waitlisted) {
    await prisma.resourceRequest.update({
      where: { id: item.request.id },
      data: {
        status: 'WAITLIST',
        priorityScore: item.priority.totalScore
      }
    });
  }

  return schedule;
}

/**
 * Manual trigger to re-run full Master Reallocation
 */
async function runReallocation(req, res, next) {
  try {
    const result = await executeMasterReallocation();
    const io = getIO();
    if (io) {
      io.emit('scheduleUpdated', { source: 'manual_reallocation' });
    }

    res.json({
      success: true,
      message: 'Master reallocation completed successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getAllResources,
  getAllRequests,
  getAllBookings,
  getConflicts,
  getPriorityQueue,
  getMasterSchedule,
  simulateDisruption,
  runReallocation
};
