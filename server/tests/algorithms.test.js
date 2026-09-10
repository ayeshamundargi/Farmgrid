/**
 * FarmGrid Algorithmic Unit Tests
 * Verifies Priority Scoring, Conflict Engine, Feasible Slot Generation,
 * Competing Allocation, and Reallocation logic.
 */

const assert = require('assert');
const {
  calculateDistance,
  calculateTravelTime,
  intervalsOverlap,
  checkBookingConflict,
  findAllConflicts
} = require('../src/algorithms/conflictEngine');

const {
  calculatePriorityScore,
  calculateUrgencyScore,
  calculateWeatherScore,
  calculateCropReadinessScore
} = require('../src/algorithms/priorityEngine');

const {
  generateFeasibleSlots,
  smartAllocateRequest,
  generateMasterSchedule
} = require('../src/algorithms/schedulerEngine');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(err);
  }
}

console.log('\n========================================');
console.log('FARMGRID ALGORITHMIC TEST SUITE');
console.log('========================================\n');

// -------------------------------------------------------------
// TEST 1: Overlap & Conflict Detection
// -------------------------------------------------------------
runTest('Test 1: Two overlapping bookings on same resource trigger conflict detection', () => {
  const existingBookings = [
    {
      id: 1,
      resourceId: 101,
      startTime: new Date('2026-09-11T09:00:00Z'),
      endTime: new Date('2026-09-11T12:00:00Z'),
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      travelMinutes: 10,
      status: 'ACTIVE'
    }
  ];

  // Overlapping request (10:00 to 13:00)
  const candidate1 = {
    resourceId: 101,
    startTime: new Date('2026-09-11T10:00:00Z'),
    endTime: new Date('2026-09-11T13:00:00Z'),
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    travelMinutes: 10
  };

  const conflict1 = checkBookingConflict(candidate1, existingBookings);
  assert.strictEqual(conflict1.hasConflict, true, 'Direct operational overlap must trigger conflict');

  // Buffer collision (12:10 to 14:00) - within 15 min buffer + 10 min travel of previous booking ending at 12:00
  const candidate2 = {
    resourceId: 101,
    startTime: new Date('2026-09-11T12:10:00Z'),
    endTime: new Date('2026-09-11T14:00:00Z'),
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    travelMinutes: 10
  };

  const conflict2 = checkBookingConflict(candidate2, existingBookings);
  assert.strictEqual(conflict2.hasConflict, true, 'Transit and buffer margin collision must trigger conflict');

  // Safe non-overlapping request (13:30 to 15:30)
  const candidate3 = {
    resourceId: 101,
    startTime: new Date('2026-09-11T13:30:00Z'),
    endTime: new Date('2026-09-11T15:30:00Z'),
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    travelMinutes: 10
  };

  const conflict3 = checkBookingConflict(candidate3, existingBookings);
  assert.strictEqual(conflict3.hasConflict, false, 'Non-overlapping request with buffer margins must pass');
});

// -------------------------------------------------------------
// TEST 2: Competing Requests for One Resource (Priority Ranking)
// -------------------------------------------------------------
runTest('Test 2: Competing requests for same resource: Higher priority receives feasible slot first', () => {
  const resource = {
    id: 101,
    name: 'John Deere 5050D',
    type: 'TRACTOR',
    latitude: 12.9716,
    longitude: 77.5946,
    status: 'AVAILABLE',
    operatingStart: '06:00',
    operatingEnd: '20:00'
  };

  const farmA = { latitude: 12.9720, longitude: 77.5950 }; // High priority
  const farmB = { latitude: 12.9725, longitude: 77.5955 }; // Low priority

  // Request A: High urgency, high weather risk, peak ripening
  const requestA = {
    id: 1,
    farmId: 10,
    farm: farmA,
    resourceType: 'TRACTOR',
    earliestStart: '2026-09-11T08:00:00Z',
    latestEnd: '2026-09-11T12:00:00Z',
    durationMinutes: 120,
    urgencyLevel: 'HIGH',
    weatherRisk: 'HIGH',
    cropStage: 'PEAK_RIPENING',
    createdAt: new Date(Date.now() - 8 * 3600000)
  };

  // Request B: Low urgency, low weather risk, seedling stage
  const requestB = {
    id: 2,
    farmId: 20,
    farm: farmB,
    resourceType: 'TRACTOR',
    earliestStart: '2026-09-11T08:00:00Z',
    latestEnd: '2026-09-11T12:00:00Z',
    durationMinutes: 120,
    urgencyLevel: 'LOW',
    weatherRisk: 'LOW',
    cropStage: 'SEEDLING',
    createdAt: new Date()
  };

  const priorityA = calculatePriorityScore(requestA, farmA, resource);
  const priorityB = calculatePriorityScore(requestB, farmB, resource);

  assert.ok(priorityA.totalScore > priorityB.totalScore, `Priority A (${priorityA.totalScore}) must be greater than Priority B (${priorityB.totalScore})`);
  assert.ok(priorityA.totalScore >= 80, 'High urgency + weather + peak ripening should score >= 80');

  // Run Master Batch Scheduler
  const schedule = generateMasterSchedule([requestB, requestA], [resource], []);

  assert.strictEqual(schedule.scheduled.length, 1, 'Only one can get the limited slot');
  assert.strictEqual(schedule.scheduled[0].request.id, 1, 'Request A must win the allocation due to higher priority');
  assert.strictEqual(schedule.waitlisted.length, 1, 'Request B must be waitlisted');
  assert.strictEqual(schedule.waitlisted[0].request.id, 2);
});

// -------------------------------------------------------------
// TEST 3: Dynamic Reallocation on Resource Disruption
// -------------------------------------------------------------
runTest('Test 3: Resource breakdown reallocates affected booking to alternate resource', () => {
  const tractorPrimary = {
    id: 101,
    name: 'Tractor 01',
    type: 'TRACTOR',
    latitude: 12.9716,
    longitude: 77.5946,
    status: 'AVAILABLE',
    operatingStart: '06:00',
    operatingEnd: '20:00'
  };

  const tractorAlternate = {
    id: 102,
    name: 'Tractor 02',
    type: 'TRACTOR',
    latitude: 12.9750,
    longitude: 77.5960,
    status: 'AVAILABLE',
    operatingStart: '06:00',
    operatingEnd: '20:00'
  };

  const farm = { latitude: 12.9720, longitude: 77.5950 };

  const request = {
    id: 10,
    resourceType: 'TRACTOR',
    earliestStart: '2026-09-11T09:00:00Z',
    latestEnd: '2026-09-11T13:00:00Z',
    durationMinutes: 120,
    urgencyLevel: 'HIGH',
    weatherRisk: 'MEDIUM',
    cropStage: 'HARVEST'
  };

  // Primary tractor breaks down -> status = MAINTENANCE
  tractorPrimary.status = 'MAINTENANCE';

  // Smart allocation should automatically pick tractorAlternate
  const allocation = smartAllocateRequest(request, farm, [tractorPrimary, tractorAlternate], []);

  assert.strictEqual(allocation.allocated, true, 'Allocation should succeed on alternate tractor');
  assert.strictEqual(allocation.resource.id, 102, 'Should allocate to Tractor 02');
  assert.strictEqual(allocation.slot.resourceId, 102);
});

// -------------------------------------------------------------
// TEST 4: Scarcity & Waitlist when No Alternative Resource Exists
// -------------------------------------------------------------
runTest('Test 4: Scarcity scenario: Impossible request cleanly moves to WAITLIST', () => {
  const resource = {
    id: 201,
    name: 'Single Harvester',
    type: 'HARVESTER',
    latitude: 12.9716,
    longitude: 77.5946,
    status: 'AVAILABLE',
    operatingStart: '06:00',
    operatingEnd: '18:00'
  };

  const farm = { latitude: 12.9720, longitude: 77.5950 };

  // Existing booking fills entire day 08:00 - 17:00
  const existingBookings = [
    {
      id: 50,
      resourceId: 201,
      startTime: new Date('2026-09-11T08:00:00Z'),
      endTime: new Date('2026-09-11T17:00:00Z'),
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      travelMinutes: 15,
      status: 'ACTIVE'
    }
  ];

  const newRequest = {
    id: 99,
    resourceType: 'HARVESTER',
    earliestStart: '2026-09-11T10:00:00Z',
    latestEnd: '2026-09-11T14:00:00Z',
    durationMinutes: 180,
    urgencyLevel: 'HIGH',
    weatherRisk: 'HIGH',
    cropStage: 'PEAK_HARVEST'
  };

  const allocation = smartAllocateRequest(newRequest, farm, [resource], existingBookings);

  assert.strictEqual(allocation.allocated, false, 'Should not allocate when resource is fully booked');
  assert.ok(allocation.reason.includes('booked') || allocation.reason.includes('conflict'), 'Explanation should state booking conflict');
});

// -------------------------------------------------------------
// TEST 5: Haversine Distance & Travel Time Calculation
// -------------------------------------------------------------
runTest('Test 5: Geographic distance and transit time calculations are accurate', () => {
  // Bangalore center to Whitefield (~18 km)
  const lat1 = 12.9716;
  const lon1 = 77.5946;
  const lat2 = 12.9698;
  const lon2 = 77.7499;

  const distanceKm = calculateDistance(lat1, lon1, lat2, lon2);
  assert.ok(distanceKm > 15 && distanceKm < 20, `Distance should be ~17km, got ${distanceKm.toFixed(2)} km`);

  // At 30 km/h: 17 km takes ~34 minutes
  const travelMinutes = calculateTravelTime(distanceKm, 30);
  assert.ok(travelMinutes >= 30 && travelMinutes <= 40, `Travel time should be ~34 min, got ${travelMinutes} min`);
});

console.log('\n========================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
console.log('========================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
