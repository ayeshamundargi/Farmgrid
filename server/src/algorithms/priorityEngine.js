/**
 * FarmGrid Priority Engine
 * Deterministic, rule-based 0-100 scoring system.
 *
 * Exact Weights:
 * - Urgency / Deadline Proximity: 25 points
 * - Weather Risk Exposure:        25 points
 * - Crop Readiness / Stage:       20 points
 * - Queue Waiting Time:           15 points
 * - Distance & Logistics:         10 points
 * - Resource Constraints:          5 points
 * ----------------------------------------
 * TOTAL:                         100 points
 */

const { calculateDistance } = require('./conflictEngine');

/**
 * 1. Urgency / Deadline Proximity (Max 25 pts)
 */
function calculateUrgencyScore(request) {
  const level = (request.urgencyLevel || 'MEDIUM').toUpperCase();
  let baseScore = 12;

  switch (level) {
    case 'CRITICAL':
      baseScore = 25;
      break;
    case 'HIGH':
      baseScore = 20;
      break;
    case 'MEDIUM':
      baseScore = 12;
      break;
    case 'LOW':
      baseScore = 5;
      break;
    default:
      baseScore = 10;
  }

  // Factor in time proximity to earliestStart if provided
  if (request.earliestStart) {
    const hoursUntilStart = (new Date(request.earliestStart) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilStart <= 4 && hoursUntilStart >= 0) {
      baseScore = Math.min(25, baseScore + 3);
    } else if (hoursUntilStart < 0) {
      // Overdue/immediate request
      baseScore = Math.min(25, baseScore + 4);
    }
  }

  return Math.min(25, Math.max(0, baseScore));
}

/**
 * 2. Weather Risk Exposure (Max 25 pts)
 */
function calculateWeatherScore(request) {
  const risk = (request.weatherRisk || 'LOW').toUpperCase();
  switch (risk) {
    case 'CRITICAL':
      return 25;
    case 'HIGH':
      return 20;
    case 'MEDIUM':
      return 12;
    case 'LOW':
    default:
      return 3;
  }
}

/**
 * 3. Crop Readiness / Biological Stage (Max 20 pts)
 */
function calculateCropReadinessScore(request) {
  const stage = (request.cropStage || 'VEGETATIVE').toUpperCase();
  switch (stage) {
    case 'PEAK_RIPENING':
    case 'PEAK_HARVEST':
      return 20;
    case 'HARVEST':
      return 17;
    case 'FLOWERING':
      return 12;
    case 'VEGETATIVE':
      return 7;
    case 'SEEDLING':
    default:
      return 4;
  }
}

/**
 * 4. Queue Waiting Time (Max 15 pts)
 */
function calculateWaitingScore(request) {
  if (!request.createdAt) return 3;

  const now = new Date();
  const created = new Date(request.createdAt);
  const diffHours = Math.max(0, (now - created) / (1000 * 60 * 60));

  if (diffHours >= 24) return 15;
  if (diffHours >= 12) return 12;
  if (diffHours >= 6) return 9;
  if (diffHours >= 2) return 6;
  return 3;
}

/**
 * 5. Distance & Logistics Overhead (Max 10 pts)
 */
function calculateDistanceScore(farm, resource) {
  if (!farm || !resource || typeof farm.latitude !== 'number' || typeof resource.latitude !== 'number') {
    return 7; // Neutral fallback when evaluating request before resource assignment
  }

  const distanceKm = calculateDistance(
    farm.latitude,
    farm.longitude,
    resource.latitude,
    resource.longitude
  );

  if (distanceKm <= 5) return 10;
  if (distanceKm <= 15) return 8;
  if (distanceKm <= 30) return 5;
  if (distanceKm <= 50) return 2;
  return 0;
}

/**
 * 6. Resource Constraints & Specialization (Max 5 pts)
 */
function calculateResourceConstraintScore(request, resource) {
  const type = (request.resourceType || '').toUpperCase();
  let score = 3;

  // Highly specialized/scarce assets get highest constraint score
  const highScarcity = ['DRONE_SPRAYER', 'HARVESTER', 'SOIL_TESTING', 'GRAFTING'];
  const medScarcity = ['TRACTOR', 'MINI_TRUCK', 'PUMP', 'SEEDER', 'LABOUR_TEAM'];

  if (highScarcity.includes(type)) {
    score = 5;
  } else if (medScarcity.includes(type)) {
    score = 4;
  } else {
    score = 3;
  }

  // If resource is provided and operator constraint is matched
  if (resource && resource.operatorRequired) {
    score = Math.min(5, score + 1);
  }

  return Math.min(5, score);
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(scores, request, resource, distanceKm) {
  const bullets = [];

  // Urgency
  const urgencyLabel = request.urgencyLevel || 'Medium';
  bullets.push(`• Urgency level is ${urgencyLabel} (${scores.urgencyScore}/25 pts)${request.urgencyReason ? ': ' + request.urgencyReason : '.'}`);

  // Weather
  const weatherLabel = request.weatherRisk || 'Low';
  if (scores.weatherScore >= 18) {
    bullets.push(`• High adverse weather risk during scheduling window (${scores.weatherScore}/25 pts). Immediate allocation advised.`);
  } else {
    bullets.push(`• Weather risk level is ${weatherLabel} (${scores.weatherScore}/25 pts).`);
  }

  // Crop stage
  const stageLabel = (request.cropStage || 'Vegetative').replace('_', ' ');
  bullets.push(`• Biological crop status: ${stageLabel} (${scores.cropReadinessScore}/20 pts).`);

  // Waiting time
  bullets.push(`• Queue wait score: ${scores.waitingScore}/15 pts based on request timestamp.`);

  // Distance
  if (typeof distanceKm === 'number') {
    bullets.push(`• Transit proximity: ${distanceKm.toFixed(1)} km from farm (${scores.distanceScore}/10 pts).`);
  } else {
    bullets.push(`• Transit proximity baseline evaluated (${scores.distanceScore}/10 pts).`);
  }

  // Constraints
  bullets.push(`• Equipment scarcity and operational requirements evaluated (${scores.resourceConstraintScore}/5 pts).`);

  return `Priority Score: ${scores.totalScore}/100.\nThis request was evaluated because:\n${bullets.join('\n')}`;
}

/**
 * Calculate full deterministic Priority Score
 */
function calculatePriorityScore(request, farm = null, resource = null) {
  const urgencyScore = calculateUrgencyScore(request);
  const weatherScore = calculateWeatherScore(request);
  const cropReadinessScore = calculateCropReadinessScore(request);
  const waitingScore = calculateWaitingScore(request);
  const distanceScore = calculateDistanceScore(farm || request.farm, resource);
  const resourceConstraintScore = calculateResourceConstraintScore(request, resource);

  let rawTotal =
    urgencyScore +
    weatherScore +
    cropReadinessScore +
    waitingScore +
    distanceScore +
    resourceConstraintScore;

  const totalScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

  let distanceKm = null;
  if (farm && resource && typeof farm.latitude === 'number' && typeof resource.latitude === 'number') {
    distanceKm = calculateDistance(farm.latitude, farm.longitude, resource.latitude, resource.longitude);
  }

  const scores = {
    urgencyScore,
    weatherScore,
    cropReadinessScore,
    waitingScore,
    distanceScore,
    resourceConstraintScore,
    totalScore
  };

  const explanation = generateExplanation(scores, request, resource, distanceKm);

  return {
    ...scores,
    explanation,
    distanceKm
  };
}

module.exports = {
  calculateUrgencyScore,
  calculateWeatherScore,
  calculateCropReadinessScore,
  calculateWaitingScore,
  calculateDistanceScore,
  calculateResourceConstraintScore,
  calculatePriorityScore,
  generateExplanation
};
