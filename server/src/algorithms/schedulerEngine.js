/**
 * FarmGrid Scheduling Engine
 * Generates feasible slots, ranks allocations by priority, distance, and logistics,
 * and produces deterministic master schedules without first-come-first-served bias.
 */

const { calculateDistance, calculateTravelTime, checkBookingConflict, DEFAULT_BUFFER_MINUTES } = require('./conflictEngine');
const { calculatePriorityScore } = require('./priorityEngine');

/**
 * Parses "HH:mm" time string into minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, mins] = timeStr.split(':').map(Number);
  return hours * 60 + (mins || 0);
}

/**
 * Checks if a slot [startTime, endTime] falls within resource operating hours
 */
function isWithinOperatingHours(startTime, endTime, operatingStartStr, operatingEndStr) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const opStartMin = parseTimeToMinutes(operatingStartStr || '06:00');
  const opEndMin = parseTimeToMinutes(operatingEndStr || '20:00');

  const slotStartMin = start.getHours() * 60 + start.getMinutes();
  const slotEndMin = end.getHours() * 60 + end.getMinutes();

  // If slot spans multiple days or starts before operating hours or ends after
  if (start.toDateString() !== end.toDateString()) {
    return false;
  }

  return slotStartMin >= opStartMin && slotEndMin <= opEndMin;
}

/**
 * Generate candidate feasible slots for a request on a specific resource
 */
function generateFeasibleSlots(request, resource, existingBookings = [], farm = null) {
  if (!resource || resource.status === 'MAINTENANCE' || resource.status === 'UNAVAILABLE') {
    return [];
  }

  const durationMs = (request.durationMinutes || 120) * 60 * 1000;
  const earliest = new Date(request.earliestStart).getTime();
  const latest = new Date(request.latestEnd).getTime();

  if (earliest + durationMs > latest) {
    return [];
  }

  // Calculate distance and travel time
  let distanceKm = 5.0;
  if (farm && resource && typeof farm.latitude === 'number' && typeof resource.latitude === 'number') {
    distanceKm = calculateDistance(farm.latitude, farm.longitude, resource.latitude, resource.longitude);
  }
  const travelMinutes = calculateTravelTime(distanceKm);
  const bufferBefore = DEFAULT_BUFFER_MINUTES;
  const bufferAfter = DEFAULT_BUFFER_MINUTES;

  const feasibleSlots = [];
  const stepMs = 30 * 60 * 1000; // 30-minute search resolution

  for (let slotStartMs = earliest; slotStartMs + durationMs <= latest; slotStartMs += stepMs) {
    const slotStartTime = new Date(slotStartMs);
    const slotEndTime = new Date(slotStartMs + durationMs);

    // 1. Operating hours check
    if (!isWithinOperatingHours(slotStartTime, slotEndTime, resource.operatingStart, resource.operatingEnd)) {
      continue;
    }

    // 2. Conflict and buffer check
    const candidate = {
      resourceId: resource.id,
      startTime: slotStartTime,
      endTime: slotEndTime,
      travelMinutes,
      bufferBeforeMinutes: bufferBefore,
      bufferAfterMinutes: bufferAfter
    };

    const conflict = checkBookingConflict(candidate, existingBookings);
    if (!conflict.hasConflict) {
      feasibleSlots.push({
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.type,
        startTime: slotStartTime,
        endTime: slotEndTime,
        travelMinutes,
        distanceKm,
        bufferBeforeMinutes: bufferBefore,
        bufferAfterMinutes: bufferAfter
      });
    }
  }

  return feasibleSlots;
}

/**
 * Smart allocation for a single request across all compatible resources
 */
function smartAllocateRequest(request, farm, resources = [], currentBookings = []) {
  // Find compatible resources of same type
  let compatibleResources = resources.filter(r =>
    r.type.toUpperCase() === request.resourceType.toUpperCase() &&
    r.status !== 'MAINTENANCE' &&
    r.status !== 'UNAVAILABLE'
  );

  // If farmer preferred a specific resource, prioritize that resource
  if (request.preferredResourceId) {
    const preferred = compatibleResources.find(r => r.id === request.preferredResourceId);
    if (preferred) {
      compatibleResources = [preferred, ...compatibleResources.filter(r => r.id !== request.preferredResourceId)];
    }
  }

  if (compatibleResources.length === 0) {
    return {
      allocated: false,
      reason: `No available resources of type ${request.resourceType} found in service registry.`,
      bestSlot: null,
      priority: calculatePriorityScore(request, farm, null)
    };
  }

  const candidateAllocations = [];

  for (const res of compatibleResources) {
    const priority = calculatePriorityScore(request, farm, res);
    const slots = generateFeasibleSlots(request, res, currentBookings, farm);

    for (const slot of slots) {
      // Quality score: Prioritize high priority, proximity, and earlier completion
      const hoursToStart = (new Date(slot.startTime) - new Date()) / (1000 * 60 * 60);
      const proximityScore = Math.max(0, 50 - slot.distanceKm);
      const earlyBonus = Math.max(0, 30 - hoursToStart);

      const allocationQuality = (priority.totalScore * 1.5) + proximityScore + earlyBonus;

      candidateAllocations.push({
        resource: res,
        slot,
        priority,
        allocationQuality
      });
    }
  }

  if (candidateAllocations.length === 0) {
    const fallbackPriority = calculatePriorityScore(request, farm, compatibleResources[0]);
    return {
      allocated: false,
      reason: `All ${compatibleResources.length} matching resources are currently fully booked or have buffer/travel conflicts within the requested window.`,
      bestSlot: null,
      priority: fallbackPriority
    };
  }

  // Rank allocations descending by quality
  candidateAllocations.sort((a, b) => b.allocationQuality - a.allocationQuality);
  const best = candidateAllocations[0];

  const explanation = `${best.priority.explanation}\n• Smart Allocation: Allocated to ${best.resource.name} (${best.slot.distanceKm.toFixed(1)} km transit, ${best.slot.travelMinutes}m travel + ${best.slot.bufferBeforeMinutes}m buffer) starting ${new Date(best.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} without conflicts.`;

  return {
    allocated: true,
    resource: best.resource,
    slot: best.slot,
    priority: {
      ...best.priority,
      explanation
    },
    allFeasibleSlotsCount: candidateAllocations.length
  };
}

/**
 * Master Batch Scheduling:
 * Deterministically sorts pending requests by Priority Score (highest first)
 * and allocates feasible slots without first-come-first-served bias.
 */
function generateMasterSchedule(requests = [], resources = [], existingBookings = [], farmsMap = {}) {
  // 1. Calculate base priority for all pending requests
  const prioritizedRequests = requests.map(req => {
    const farm = farmsMap[req.farmId] || req.farm;
    const priority = calculatePriorityScore(req, farm, null);
    return {
      ...req,
      farm,
      calculatedPriority: priority
    };
  });

  // 2. Sort descending by totalScore (ties broken by wait time, then earliest deadline)
  prioritizedRequests.sort((a, b) => {
    if (b.calculatedPriority.totalScore !== a.calculatedPriority.totalScore) {
      return b.calculatedPriority.totalScore - a.calculatedPriority.totalScore;
    }
    const aWait = a.calculatedPriority.waitingScore;
    const bWait = b.calculatedPriority.waitingScore;
    if (bWait !== aWait) return bWait - aWait;
    return new Date(a.earliestStart) - new Date(b.earliestStart);
  });

  const scheduled = [];
  const waitlisted = [];
  const simulatedBookings = [...existingBookings];

  // 3. Sequentially allocate highest priority requests
  for (const req of prioritizedRequests) {
    const farm = req.farm || farmsMap[req.farmId];
    const allocation = smartAllocateRequest(req, farm, resources, simulatedBookings);

    if (allocation.allocated) {
      const newBooking = {
        id: `sim-${req.id}-${Date.now()}`,
        requestId: req.id,
        resourceId: allocation.resource.id,
        startTime: allocation.slot.startTime,
        endTime: allocation.slot.endTime,
        travelMinutes: allocation.slot.travelMinutes,
        bufferBeforeMinutes: allocation.slot.bufferBeforeMinutes,
        bufferAfterMinutes: allocation.slot.bufferAfterMinutes,
        status: 'ACTIVE',
        allocationExplanation: allocation.priority.explanation
      };

      simulatedBookings.push(newBooking);
      scheduled.push({
        request: req,
        resource: allocation.resource,
        slot: allocation.slot,
        priority: allocation.priority,
        booking: newBooking
      });
    } else {
      waitlisted.push({
        request: req,
        priority: allocation.priority,
        reason: allocation.reason
      });
    }
  }

  return {
    scheduled,
    waitlisted,
    totalEvaluated: requests.length,
    timestamp: new Date()
  };
}

module.exports = {
  parseTimeToMinutes,
  isWithinOperatingHours,
  generateFeasibleSlots,
  smartAllocateRequest,
  generateMasterSchedule
};
