/**
 * FarmGrid Conflict Detection Engine
 * Enforces zero double-booking, computes Haversine distances,
 * and accounts for transit time and logistics buffers.
 */

const EARTH_RADIUS_KM = 6371.0;
const DEFAULT_AVERAGE_SPEED_KMH = 30.0;
const DEFAULT_BUFFER_MINUTES = 15;

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const toRad = (deg) => (deg * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate travel time in minutes based on distance and average speed
 */
function calculateTravelTime(distanceKm, averageSpeedKmh = DEFAULT_AVERAGE_SPEED_KMH) {
  if (distanceKm <= 0) return 0;
  const hours = distanceKm / averageSpeedKmh;
  return Math.ceil(hours * 60);
}

/**
 * Check if two time intervals overlap:
 * Interval 1: [start1, end1]
 * Interval 2: [start2, end2]
 * Condition: start1 < end2 && end1 > start2
 */
function intervalsOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();

  return s1 < e2 && e1 > s2;
}

/**
 * Check if a candidate slot conflicts with any existing booking for a resource
 * including travel and buffer margins.
 *
 * @param {Object} candidate - { resourceId, startTime, endTime, travelMinutes, bufferBefore, bufferAfter }
 * @param {Array} existingBookings - Array of active Bookings for the resource
 * @param {Number|null} excludeBookingId - Optional ID to ignore (for rescheduling an existing booking)
 */
function checkBookingConflict(candidate, existingBookings = [], excludeBookingId = null) {
  const candidateStart = new Date(candidate.startTime);
  const candidateEnd = new Date(candidate.endTime);
  const bufferBefore = candidate.bufferBeforeMinutes ?? DEFAULT_BUFFER_MINUTES;
  const bufferAfter = candidate.bufferAfterMinutes ?? DEFAULT_BUFFER_MINUTES;
  const travelMinutes = candidate.travelMinutes ?? 0;

  // Effective candidate blocked window:
  // Starts before operational work begins (for travel & setup buffer)
  const candidateBlockedStart = new Date(candidateStart.getTime() - (travelMinutes + bufferBefore) * 60000);
  const candidateBlockedEnd = new Date(candidateEnd.getTime() + bufferAfter * 60000);

  for (const b of existingBookings) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.status === 'CANCELLED' || b.status === 'DISRUPTED') continue;
    if (b.resourceId !== candidate.resourceId) continue;

    const bStart = new Date(b.startTime);
    const bEnd = new Date(b.endTime);
    const bBufferBefore = b.bufferBeforeMinutes ?? DEFAULT_BUFFER_MINUTES;
    const bBufferAfter = b.bufferAfterMinutes ?? DEFAULT_BUFFER_MINUTES;
    const bTravel = b.travelMinutes ?? 0;

    const existingBlockedStart = new Date(bStart.getTime() - (bTravel + bBufferBefore) * 60000);
    const existingBlockedEnd = new Date(bEnd.getTime() + bBufferAfter * 60000);

    // Direct operational overlap
    const directOverlap = intervalsOverlap(candidateStart, candidateEnd, bStart, bEnd);

    // Buffer/transit margin overlap
    const marginOverlap = intervalsOverlap(candidateBlockedStart, candidateBlockedEnd, existingBlockedStart, existingBlockedEnd);

    if (directOverlap || marginOverlap) {
      return {
        hasConflict: true,
        conflictingBooking: b,
        type: directOverlap ? 'DIRECT_OVERLAP' : 'LOGISTICS_BUFFER_CONFLICT',
        message: directOverlap
          ? `Direct double-booking detected on resource ${candidate.resourceId} between ${bStart.toISOString()} and ${bEnd.toISOString()}`
          : `Logistics buffer conflict on resource ${candidate.resourceId}. Transit/buffer margin overlaps existing booking.`
      };
    }
  }

  return {
    hasConflict: false,
    conflictingBooking: null,
    type: null,
    message: null
  };
}

/**
 * Scan all active bookings across the system to identify current conflict states
 */
function findAllConflicts(bookings = []) {
  const conflicts = [];
  const activeBookings = bookings.filter(b => b.status === 'ACTIVE');

  for (let i = 0; i < activeBookings.length; i++) {
    for (let j = i + 1; j < activeBookings.length; j++) {
      const b1 = activeBookings[i];
      const b2 = activeBookings[j];

      if (b1.resourceId === b2.resourceId) {
        const overlap = intervalsOverlap(b1.startTime, b1.endTime, b2.startTime, b2.endTime);
        if (overlap) {
          conflicts.push({
            resourceId: b1.resourceId,
            bookingA: b1,
            bookingB: b2,
            reason: 'Double booking on same physical resource'
          });
        }
      }
    }
  }

  return conflicts;
}

module.exports = {
  calculateDistance,
  calculateTravelTime,
  intervalsOverlap,
  checkBookingConflict,
  findAllConflicts,
  DEFAULT_AVERAGE_SPEED_KMH,
  DEFAULT_BUFFER_MINUTES
};
