const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { calculatePriorityScore } = require('../src/algorithms/priorityEngine');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting FarmGrid Database Seeding...');

  // Clean existing records in correct relation order
  await prisma.notification.deleteMany();
  await prisma.disruption.deleteMany();
  await prisma.priorityScore.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.resourceRequest.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Purged existing database tables');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('demo123', salt);

  // 1. Create Core Demo Accounts
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin (Master Scheduler)',
      email: 'admin@farmgrid.demo',
      passwordHash,
      role: 'ADMIN',
      phone: '+91 98765 00001'
    }
  });

  const primaryOwner = await prisma.user.create({
    data: {
      name: 'Rajesh Agri-Equipment Hub',
      email: 'owner@farmgrid.demo',
      passwordHash,
      role: 'OWNER',
      phone: '+91 98765 00002'
    }
  });

  const primaryFarmer = await prisma.user.create({
    data: {
      name: 'Ramesh Kumar (Demo Farmer)',
      email: 'farmer@farmgrid.demo',
      passwordHash,
      role: 'FARMER',
      phone: '+91 98765 00003'
    }
  });

  // 2. Create 9 More Farmers (Total 10+)
  const farmerNames = [
    { name: 'Suresh Gowda', email: 'suresh@farmer.demo' },
    { name: 'Anil Patil', email: 'anil@farmer.demo' },
    { name: 'Basavaraj Naikar', email: 'basava@farmer.demo' },
    { name: 'Pooja Reddy', email: 'pooja@farmer.demo' },
    { name: 'Manjunath Hegde', email: 'manju@farmer.demo' },
    { name: 'Kavitha Devi', email: 'kavitha@farmer.demo' },
    { name: 'Chandrappa K', email: 'chandra@farmer.demo' },
    { name: 'Gangadhar Rao', email: 'ganga@farmer.demo' },
    { name: 'Venkatesh Murthy', email: 'venki@farmer.demo' },
    { name: 'Shobha Rani', email: 'shobha@farmer.demo' }
  ];

  const otherFarmers = [];
  for (const f of farmerNames) {
    const user = await prisma.user.create({
      data: {
        name: f.name,
        email: f.email,
        passwordHash,
        role: 'FARMER',
        phone: `+91 98765 ${Math.floor(10000 + Math.random() * 90000)}`
      }
    });
    otherFarmers.push(user);
  }

  const allFarmers = [primaryFarmer, ...otherFarmers];

  // 3. Create 4 More Owners (Total 5+)
  const ownerNames = [
    { name: 'Cauvery Custom Hiring Center', email: 'cauvery@owner.demo' },
    { name: 'Krishna Agro Logistics', email: 'krishna@owner.demo' },
    { name: 'GreenFields Drone & Tech', email: 'greenfields@owner.demo' },
    { name: 'Deccan Farm Machinery Co', email: 'deccan@owner.demo' }
  ];

  const otherOwners = [];
  for (const o of ownerNames) {
    const user = await prisma.user.create({
      data: {
        name: o.name,
        email: o.email,
        passwordHash,
        role: 'OWNER',
        phone: `+91 98765 ${Math.floor(10000 + Math.random() * 90000)}`
      }
    });
    otherOwners.push(user);
  }

  const allOwners = [primaryOwner, ...otherOwners];

  console.log(`✅ Created ${allFarmers.length} Farmers, ${allOwners.length} Owners, and 1 Admin`);

  // 4. Create 16 Farms (Centered around Mandya / Mysore / Bangalore Agri Belt)
  const farmSpecs = [
    { name: 'Green Valley Tomato Fields', lat: 12.5218, lon: 76.8951, crop: 'Tomato', stage: 'PEAK_RIPENING', area: 4.5, farmerId: primaryFarmer.id },
    { name: 'Kaveri Basin Wheat Farm', lat: 12.5340, lon: 76.9120, crop: 'Wheat', stage: 'HARVEST', area: 8.0, farmerId: otherFarmers[0].id },
    { name: 'Mandya Rice Paddy 1', lat: 12.5110, lon: 76.8800, crop: 'Rice', stage: 'HARVEST', area: 6.2, farmerId: otherFarmers[1].id },
    { name: 'Sunny Slope Sugarcane', lat: 12.5480, lon: 76.9300, crop: 'Sugarcane', stage: 'VEGETATIVE', area: 12.0, farmerId: otherFarmers[2].id },
    { name: 'Rani Chennamma Cotton Estate', lat: 12.5020, lon: 76.8650, crop: 'Cotton', stage: 'FLOWERING', area: 7.5, farmerId: otherFarmers[3].id },
    { name: 'Hegde Organic Vegetable Plot', lat: 12.5290, lon: 76.8890, crop: 'Chilli', stage: 'PEAK_RIPENING', area: 3.2, farmerId: otherFarmers[4].id },
    { name: 'Kavitha Millet & Pulse Farm', lat: 12.5180, lon: 76.9250, crop: 'Ragi', stage: 'HARVEST', area: 5.0, farmerId: otherFarmers[5].id },
    { name: 'Deccan Groundnut Plantation', lat: 12.5550, lon: 76.8700, crop: 'Groundnut', stage: 'VEGETATIVE', area: 6.0, farmerId: otherFarmers[6].id },
    { name: 'Ganga Onion Farm', lat: 12.5090, lon: 76.9400, crop: 'Onion', stage: 'HARVEST', area: 4.0, farmerId: otherFarmers[7].id },
    { name: 'Mysore Silk Mulberry Plot', lat: 12.5390, lon: 76.8600, crop: 'Mulberry', stage: 'VEGETATIVE', area: 3.5, farmerId: otherFarmers[8].id },
    { name: 'Shobha Turmeric Groves', lat: 12.5250, lon: 76.9050, crop: 'Turmeric', stage: 'FLOWERING', area: 5.5, farmerId: otherFarmers[9].id },
    { name: 'Demo Secondary Farm (Corn)', lat: 12.5150, lon: 76.9100, crop: 'Corn', stage: 'SEEDLING', area: 2.5, farmerId: primaryFarmer.id },
    { name: 'East Mandya Banana Orchards', lat: 12.5620, lon: 76.9200, crop: 'Banana', stage: 'PEAK_RIPENING', area: 9.0, farmerId: otherFarmers[0].id },
    { name: 'North Kaveri Soybean Beds', lat: 12.5410, lon: 76.8850, crop: 'Soybean', stage: 'HARVEST', area: 7.0, farmerId: otherFarmers[1].id },
    { name: 'Bennur Ginger Garden', lat: 12.4950, lon: 76.9150, crop: 'Ginger', stage: 'VEGETATIVE', area: 2.0, farmerId: otherFarmers[2].id },
    { name: 'Maddur Rose & Floriculture Field', lat: 12.5800, lon: 76.9500, crop: 'Floriculture', stage: 'FLOWERING', area: 3.0, farmerId: otherFarmers[3].id }
  ];

  const createdFarms = [];
  for (const f of farmSpecs) {
    const farm = await prisma.farm.create({
      data: {
        farmerId: f.farmerId,
        name: f.name,
        latitude: f.lat,
        longitude: f.lon,
        address: `${f.name}, Mandya District, Karnataka`,
        crop: f.crop,
        cropStage: f.stage,
        cropArea: f.area
      }
    });
    createdFarms.push(farm);
  }

  console.log(`✅ Created ${createdFarms.length} Farms`);

  // 5. Create 21 Diverse Resources (Tractors, Harvesters, Pumps, Sprayers, Trucks, Labour, etc.)
  const resourceSpecs = [
    // Tractors (3 units)
    { name: 'Mahindra 575 DI (Tractor-01)', type: 'TRACTOR', lat: 12.5200, lon: 76.8900, status: 'AVAILABLE', ownerId: primaryOwner.id, opStart: '06:00', opEnd: '20:00', opReq: true, fuel: 'DIESEL' },
    { name: 'John Deere 5050 D (Tractor-02)', type: 'TRACTOR', lat: 12.5280, lon: 76.8980, status: 'AVAILABLE', ownerId: primaryOwner.id, opStart: '06:00', opEnd: '20:00', opReq: true, fuel: 'DIESEL' },
    { name: 'Sonalika Tiger DI 50 (Tractor-03)', type: 'TRACTOR', lat: 12.5120, lon: 76.8750, status: 'AVAILABLE', ownerId: otherOwners[0].id, opStart: '07:00', opEnd: '19:00', opReq: false, fuel: 'DIESEL' },

    // Harvesters (2 units)
    { name: 'Preet 987 Combine Harvester', type: 'HARVESTER', lat: 12.5350, lon: 76.9050, status: 'AVAILABLE', ownerId: primaryOwner.id, opStart: '07:00', opEnd: '18:00', opReq: true, fuel: 'DIESEL' },
    { name: 'Kubota DC-68G Multi-Crop Harvester', type: 'HARVESTER', lat: 12.5450, lon: 76.9200, status: 'BOOKED', ownerId: otherOwners[0].id, opStart: '06:00', opEnd: '18:00', opReq: true, fuel: 'DIESEL' },

    // Power Tillers & Seeders
    { name: 'VST Shakti 130 DI Power Tiller', type: 'TILLER', lat: 12.5180, lon: 76.8820, status: 'AVAILABLE', ownerId: otherOwners[1].id, opStart: '06:00', opEnd: '19:00', opReq: false, fuel: 'DIESEL' },
    { name: 'Pneumatic Precision Seeder 8-Row', type: 'SEEDER', lat: 12.5250, lon: 76.9150, status: 'AVAILABLE', ownerId: otherOwners[1].id, opStart: '07:00', opEnd: '18:00', opReq: true, fuel: 'ELECTRIC' },

    // Irrigation & Water
    { name: 'Kirloskar High-Capacity Diesel Pump 7.5HP', type: 'PUMP', lat: 12.5100, lon: 76.9000, status: 'AVAILABLE', ownerId: primaryOwner.id, opStart: '05:00', opEnd: '22:00', opReq: false, fuel: 'DIESEL' },
    { name: 'Jain Irrigation Drip Distribution System (2000m)', type: 'DRIP_LINE', lat: 12.5300, lon: 76.8700, status: 'AVAILABLE', ownerId: otherOwners[2].id, opStart: '06:00', opEnd: '20:00', opReq: false, fuel: 'SOLAR' },
    { name: 'Netafim Mobile Impact Sprinkler Kit', type: 'SPRINKLER', lat: 12.5400, lon: 76.8900, status: 'AVAILABLE', ownerId: otherOwners[2].id, opStart: '06:00', opEnd: '20:00', opReq: false, fuel: 'SOLAR' },

    // Transport & Logistics
    { name: 'Tata Ace Gold Agri Mini-Truck', type: 'MINI_TRUCK', lat: 12.5160, lon: 76.9080, status: 'AVAILABLE', ownerId: otherOwners[1].id, opStart: '06:00', opEnd: '22:00', opReq: true, fuel: 'DIESEL' },
    { name: 'Heavy Dual-Axle Grain Cart 10T', type: 'GRAIN_CART', lat: 12.5320, lon: 76.9250, status: 'AVAILABLE', ownerId: primaryOwner.id, opStart: '07:00', opEnd: '19:00', opReq: false, fuel: 'NONE' },
    { name: 'Tipping Hydraulic Agri-Trailer 5T', type: 'TRAILER', lat: 12.5220, lon: 76.8790, status: 'AVAILABLE', ownerId: otherOwners[3].id, opStart: '06:00', opEnd: '20:00', opReq: false, fuel: 'NONE' },

    // Storage
    { name: 'Dry-Grain Mobile Silo Storage Pod A', type: 'STORAGE', lat: 12.5270, lon: 76.8920, status: 'AVAILABLE', ownerId: otherOwners[3].id, opStart: '00:00', opEnd: '23:59', opReq: false, fuel: 'ELECTRIC' },

    // High Tech & Drone Services
    { name: 'Garuda Aerospace Agri-Drone Sprayer 16L', type: 'DRONE_SPRAYER', lat: 12.5260, lon: 76.8940, status: 'AVAILABLE', ownerId: otherOwners[2].id, opStart: '06:00', opEnd: '18:00', opReq: true, fuel: 'BATTERY' },
    { name: 'IoTech Mobile Soil Testing & NPK Lab Van', type: 'SOIL_TESTING', lat: 12.5310, lon: 76.9020, status: 'AVAILABLE', ownerId: otherOwners[2].id, opStart: '08:00', opEnd: '17:00', opReq: true, fuel: 'SOLAR' },
    { name: 'Precision Mango & Citrus Grafting Specialists', type: 'GRAFTING', lat: 12.5190, lon: 76.8870, status: 'AVAILABLE', ownerId: otherOwners[3].id, opStart: '07:00', opEnd: '16:00', opReq: true, fuel: 'NONE' },

    // Labour Teams
    { name: 'Mandya Skilled Harvesters Cooperative (8 Persons)', type: 'LABOUR_TEAM', lat: 12.5240, lon: 76.8910, status: 'BOOKED', ownerId: primaryOwner.id, opStart: '07:00', opEnd: '16:00', opReq: false, fuel: 'NONE' },
    { name: 'Mysore Paddy Transplanting Team (12 Persons)', type: 'LABOUR_TEAM', lat: 12.5130, lon: 76.8830, status: 'AVAILABLE', ownerId: otherOwners[3].id, opStart: '07:00', opEnd: '15:00', opReq: false, fuel: 'NONE' },

    // Maintenance & Disrupted Resources for Demo
    { name: 'Swaraj 855 FE (Under Annual Overhaul)', type: 'TRACTOR', lat: 12.5500, lon: 76.9100, status: 'MAINTENANCE', maintenanceStatus: 'IN_PROGRESS', ownerId: otherOwners[0].id, opStart: '06:00', opEnd: '20:00', opReq: true, fuel: 'DIESEL' },
    { name: 'Class Crop Tiger 30 Harvester (Damaged Cutter)', type: 'HARVESTER', lat: 12.5380, lon: 76.9350, status: 'UNAVAILABLE', maintenanceStatus: 'SCHEDULED', ownerId: otherOwners[0].id, opStart: '06:00', opEnd: '18:00', opReq: true, fuel: 'DIESEL' }
  ];

  const createdResources = [];
  for (const r of resourceSpecs) {
    const res = await prisma.resource.create({
      data: {
        ownerId: r.ownerId,
        name: r.name,
        type: r.type,
        description: `${r.name} deployed in Mandya district.`,
        latitude: r.lat,
        longitude: r.lon,
        status: r.status,
        maintenanceStatus: r.maintenanceStatus || 'NORMAL',
        operatingStart: r.opStart,
        operatingEnd: r.opEnd,
        operatorRequired: r.opReq,
        fuelRequirement: r.fuel
      }
    });
    createdResources.push(res);
  }

  console.log(`✅ Created ${createdResources.length} Resources`);

  // 6. Seed Demo Competing Requests Scenario
  // We set date to today / tomorrow
  const today = new Date();
  const baseDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const slotMorningStart = new Date(baseDay);
  slotMorningStart.setHours(8, 0, 0, 0);

  const slotMorningEnd = new Date(baseDay);
  slotMorningEnd.setHours(12, 0, 0, 0);

  const slotAfternoonStart = new Date(baseDay);
  slotAfternoonStart.setHours(12, 30, 0, 0);

  const slotAfternoonEnd = new Date(baseDay);
  slotAfternoonEnd.setHours(15, 30, 0, 0);

  const slotEveningStart = new Date(baseDay);
  slotEveningStart.setHours(16, 0, 0, 0);

  const slotEveningEnd = new Date(baseDay);
  slotEveningEnd.setHours(19, 0, 0, 0);

  // Competing Requests for Tractor-01:
  // Farmer A (Ramesh - Demo Farmer): Tomato, Peak Ripening, High Urgency, High Weather Risk -> Priority ~91
  // Farmer B (Suresh): Wheat, Harvest, Medium Urgency, Medium Weather Risk -> Priority ~78
  // Farmer C (Basava): Rice, Harvest, High Urgency, Low Weather Risk -> Priority ~74

  const tractor1 = createdResources[0]; // Mahindra 575 DI (Tractor-01)
  const tractor2 = createdResources[1]; // John Deere 5050 D (Tractor-02)
  const harvester1 = createdResources[3]; // Preet 987 Combine Harvester

  // Request A: Scheduled on Tractor-01 Morning
  const reqA = await prisma.resourceRequest.create({
    data: {
      farmerId: primaryFarmer.id,
      farmId: createdFarms[0].id, // Tomato
      resourceType: 'TRACTOR',
      preferredResourceId: tractor1.id,
      earliestStart: slotMorningStart,
      latestEnd: slotMorningEnd,
      durationMinutes: 120,
      urgencyLevel: 'HIGH',
      urgencyReason: 'Tomato crop reaches terminal spoilage in 24 hours if not tilled before heavy rain forecast.',
      cropStage: 'PEAK_RIPENING',
      weatherRisk: 'HIGH',
      status: 'SCHEDULED',
      createdAt: new Date(Date.now() - 10 * 3600000)
    }
  });

  const pScoreA = calculatePriorityScore(reqA, createdFarms[0], tractor1);
  await prisma.priorityScore.create({
    data: {
      requestId: reqA.id,
      urgencyScore: pScoreA.urgencyScore,
      weatherScore: pScoreA.weatherScore,
      cropReadinessScore: pScoreA.cropReadinessScore,
      waitingScore: pScoreA.waitingScore,
      distanceScore: pScoreA.distanceScore,
      resourceConstraintScore: pScoreA.resourceConstraintScore,
      totalScore: pScoreA.totalScore,
      explanation: pScoreA.explanation
    }
  });

  await prisma.resourceRequest.update({
    where: { id: reqA.id },
    data: { priorityScore: pScoreA.totalScore }
  });

  const bookingA = await prisma.booking.create({
    data: {
      requestId: reqA.id,
      resourceId: tractor1.id,
      startTime: slotMorningStart,
      endTime: new Date(slotMorningStart.getTime() + 120 * 60000),
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      travelMinutes: 8,
      status: 'ACTIVE',
      allocationExplanation: `Farmer A received ${tractor1.name} at 08:00 AM because priority score is ${pScoreA.totalScore}/100, tomato crop is at peak ripening, rain risk is high, and transit is under 2 km.`
    }
  });

  // Request B: Also competed for Tractor-01 at 08:00, allocated to Tractor-01 in afternoon or Tractor-02
  const reqB = await prisma.resourceRequest.create({
    data: {
      farmerId: otherFarmers[0].id,
      farmId: createdFarms[1].id, // Wheat
      resourceType: 'TRACTOR',
      preferredResourceId: tractor1.id,
      earliestStart: slotAfternoonStart,
      latestEnd: slotAfternoonEnd,
      durationMinutes: 120,
      urgencyLevel: 'MEDIUM',
      urgencyReason: 'Wheat field pre-seeding harrowing before seasonal sowing window closes.',
      cropStage: 'HARVEST',
      weatherRisk: 'MEDIUM',
      status: 'SCHEDULED',
      createdAt: new Date(Date.now() - 5 * 3600000)
    }
  });

  const pScoreB = calculatePriorityScore(reqB, createdFarms[1], tractor1);
  await prisma.priorityScore.create({
    data: {
      requestId: reqB.id,
      urgencyScore: pScoreB.urgencyScore,
      weatherScore: pScoreB.weatherScore,
      cropReadinessScore: pScoreB.cropReadinessScore,
      waitingScore: pScoreB.waitingScore,
      distanceScore: pScoreB.distanceScore,
      resourceConstraintScore: pScoreB.resourceConstraintScore,
      totalScore: pScoreB.totalScore,
      explanation: pScoreB.explanation
    }
  });

  await prisma.resourceRequest.update({
    where: { id: reqB.id },
    data: { priorityScore: pScoreB.totalScore }
  });

  const bookingB = await prisma.booking.create({
    data: {
      requestId: reqB.id,
      resourceId: tractor1.id,
      startTime: slotAfternoonStart,
      endTime: new Date(slotAfternoonStart.getTime() + 120 * 60000),
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      travelMinutes: 12,
      status: 'ACTIVE',
      allocationExplanation: `Farmer B allocated ${tractor1.name} at 12:30 PM after Farmer A completes operation and buffer window clears.`
    }
  });

  // Request C: Competing for 08:00 to 11:00 on Tractor-01 -> Direct Conflict Detected!
  const reqC = await prisma.resourceRequest.create({
    data: {
      farmerId: otherFarmers[1].id,
      farmId: createdFarms[2].id, // Rice
      resourceType: 'TRACTOR',
      preferredResourceId: tractor1.id,
      earliestStart: new Date(slotMorningStart.getTime() + 60 * 60000), // 09:00 - overlaps 08:00-10:00!
      latestEnd: new Date(slotMorningStart.getTime() + 180 * 60000),
      durationMinutes: 120,
      urgencyLevel: 'HIGH',
      urgencyReason: 'Rice nursery leveling needed immediately.',
      cropStage: 'HARVEST',
      weatherRisk: 'LOW',
      status: 'CONFLICT',
      createdAt: new Date(Date.now() - 2 * 3600000)
    }
  });

  const pScoreC = calculatePriorityScore(reqC, createdFarms[2], tractor1);
  await prisma.priorityScore.create({
    data: {
      requestId: reqC.id,
      urgencyScore: pScoreC.urgencyScore,
      weatherScore: pScoreC.weatherScore,
      cropReadinessScore: pScoreC.cropReadinessScore,
      waitingScore: pScoreC.waitingScore,
      distanceScore: pScoreC.distanceScore,
      resourceConstraintScore: pScoreC.resourceConstraintScore,
      totalScore: pScoreC.totalScore,
      explanation: pScoreC.explanation
    }
  });

  await prisma.resourceRequest.update({
    where: { id: reqC.id },
    data: { priorityScore: pScoreC.totalScore }
  });

  // 7. Seed 23 More Requests across diverse resource types and farms (Total 26 Requests)
  const additionalRequests = [
    // Harvester requests
    { farmIdx: 3, type: 'HARVESTER', stage: 'HARVEST', urgency: 'CRITICAL', risk: 'HIGH', dur: 180, resIdx: 3, status: 'SCHEDULED', startOffsetHours: 8 },
    { farmIdx: 4, type: 'HARVESTER', stage: 'PEAK_HARVEST', urgency: 'HIGH', risk: 'HIGH', dur: 180, resIdx: 4, status: 'SCHEDULED', startOffsetHours: 11 },
    { farmIdx: 6, type: 'HARVESTER', stage: 'HARVEST', urgency: 'MEDIUM', risk: 'MEDIUM', dur: 120, resIdx: 3, status: 'WAITLIST', startOffsetHours: 14 },

    // Irrigation Pump & Drip
    { farmIdx: 5, type: 'PUMP', stage: 'PEAK_RIPENING', urgency: 'HIGH', risk: 'LOW', dur: 240, resIdx: 7, status: 'SCHEDULED', startOffsetHours: 6 },
    { farmIdx: 7, type: 'PUMP', stage: 'VEGETATIVE', urgency: 'MEDIUM', risk: 'LOW', dur: 180, resIdx: 7, status: 'SCHEDULED', startOffsetHours: 11 },
    { farmIdx: 8, type: 'DRIP_LINE', stage: 'HARVEST', urgency: 'LOW', risk: 'LOW', dur: 360, resIdx: 8, status: 'SCHEDULED', startOffsetHours: 8 },

    // Transport (Mini-Truck & Grain Cart)
    { farmIdx: 0, type: 'MINI_TRUCK', stage: 'PEAK_RIPENING', urgency: 'HIGH', risk: 'HIGH', dur: 120, resIdx: 10, status: 'SCHEDULED', startOffsetHours: 13 },
    { farmIdx: 1, type: 'GRAIN_CART', stage: 'HARVEST', urgency: 'MEDIUM', risk: 'MEDIUM', dur: 240, resIdx: 11, status: 'SCHEDULED', startOffsetHours: 12 },
    { farmIdx: 2, type: 'TRAILER', stage: 'HARVEST', urgency: 'HIGH', risk: 'LOW', dur: 180, resIdx: 12, status: 'SCHEDULED', startOffsetHours: 15 },

    // Tech (Drone Sprayer & Soil Lab)
    { farmIdx: 4, type: 'DRONE_SPRAYER', stage: 'FLOWERING', urgency: 'CRITICAL', risk: 'CRITICAL', dur: 90, resIdx: 14, status: 'SCHEDULED', startOffsetHours: 7 },
    { farmIdx: 9, type: 'DRONE_SPRAYER', stage: 'VEGETATIVE', urgency: 'HIGH', risk: 'HIGH', dur: 90, resIdx: 14, status: 'SCHEDULED', startOffsetHours: 9 },
    { farmIdx: 10, type: 'SOIL_TESTING', stage: 'FLOWERING', urgency: 'MEDIUM', risk: 'LOW', dur: 120, resIdx: 15, status: 'SCHEDULED', startOffsetHours: 10 },
    { farmIdx: 11, type: 'GRAFTING', stage: 'SEEDLING', urgency: 'LOW', risk: 'LOW', dur: 180, resIdx: 16, status: 'SCHEDULED', startOffsetHours: 8 },

    // Labour Teams
    { farmIdx: 1, type: 'LABOUR_TEAM', stage: 'HARVEST', urgency: 'HIGH', risk: 'HIGH', dur: 300, resIdx: 17, status: 'SCHEDULED', startOffsetHours: 7 },
    { farmIdx: 2, type: 'LABOUR_TEAM', stage: 'HARVEST', urgency: 'HIGH', risk: 'MEDIUM', dur: 240, resIdx: 18, status: 'SCHEDULED', startOffsetHours: 8 },

    // Waitlisted & Competing Requests
    { farmIdx: 12, type: 'TRACTOR', stage: 'PEAK_RIPENING', urgency: 'MEDIUM', risk: 'LOW', dur: 120, resIdx: 0, status: 'WAITLIST', startOffsetHours: 10 },
    { farmIdx: 13, type: 'TRACTOR', stage: 'HARVEST', urgency: 'LOW', risk: 'LOW', dur: 120, resIdx: 1, status: 'WAITLIST', startOffsetHours: 14 },
    { farmIdx: 14, type: 'HARVESTER', stage: 'VEGETATIVE', urgency: 'LOW', risk: 'LOW', dur: 180, resIdx: 3, status: 'WAITLIST', startOffsetHours: 9 },
    { farmIdx: 15, type: 'DRONE_SPRAYER', stage: 'FLOWERING', urgency: 'MEDIUM', risk: 'MEDIUM', dur: 90, resIdx: 14, status: 'WAITLIST', startOffsetHours: 11 },
    { farmIdx: 6, type: 'PUMP', stage: 'HARVEST', urgency: 'MEDIUM', risk: 'LOW', dur: 180, resIdx: 7, status: 'WAITLIST', startOffsetHours: 15 },
    { farmIdx: 8, type: 'MINI_TRUCK', stage: 'HARVEST', urgency: 'LOW', risk: 'LOW', dur: 120, resIdx: 10, status: 'WAITLIST', startOffsetHours: 16 },
    { farmIdx: 10, type: 'TILLER', stage: 'FLOWERING', urgency: 'LOW', risk: 'LOW', dur: 150, resIdx: 5, status: 'PENDING', startOffsetHours: 8 },
    { farmIdx: 11, type: 'SEEDER', stage: 'SEEDLING', urgency: 'MEDIUM', risk: 'LOW', dur: 180, resIdx: 6, status: 'PENDING', startOffsetHours: 9 }
  ];

  let bookingsCreatedCount = 2; // already created bookingA and bookingB

  for (let idx = 0; idx < additionalRequests.length; idx++) {
    const item = additionalRequests[idx];
    const farm = createdFarms[item.farmIdx];
    const resource = createdResources[item.resIdx];

    const start = new Date(baseDay);
    start.setHours(item.startOffsetHours, 0, 0, 0);

    const end = new Date(start.getTime() + (item.dur + 60) * 60000);

    const req = await prisma.resourceRequest.create({
      data: {
        farmerId: farm.farmerId,
        farmId: farm.id,
        resourceType: item.type,
        preferredResourceId: resource.id,
        earliestStart: start,
        latestEnd: end,
        durationMinutes: item.dur,
        urgencyLevel: item.urgency,
        urgencyReason: `Operational field task for ${farm.crop} during ${item.stage} phase.`,
        cropStage: item.stage,
        weatherRisk: item.risk,
        status: item.status,
        createdAt: new Date(Date.now() - (idx + 1) * 3600000)
      }
    });

    const score = calculatePriorityScore(req, farm, resource);
    await prisma.priorityScore.create({
      data: {
        requestId: req.id,
        urgencyScore: score.urgencyScore,
        weatherScore: score.weatherScore,
        cropReadinessScore: score.cropReadinessScore,
        waitingScore: score.waitingScore,
        distanceScore: score.distanceScore,
        resourceConstraintScore: score.resourceConstraintScore,
        totalScore: score.totalScore,
        explanation: score.explanation
      }
    });

    await prisma.resourceRequest.update({
      where: { id: req.id },
      data: { priorityScore: score.totalScore }
    });

    if (item.status === 'SCHEDULED') {
      await prisma.booking.create({
        data: {
          requestId: req.id,
          resourceId: resource.id,
          startTime: start,
          endTime: new Date(start.getTime() + item.dur * 60000),
          bufferBeforeMinutes: 15,
          bufferAfterMinutes: 15,
          travelMinutes: Math.floor(5 + Math.random() * 15),
          status: 'ACTIVE',
          allocationExplanation: `${resource.name} scheduled for ${farm.name} (${score.totalScore}/100 priority score).`
        }
      });
      bookingsCreatedCount++;
    }
  }

  console.log(`✅ Created 26 Requests and ${bookingsCreatedCount} Bookings with Priority Scores`);

  // 8. Seed Notifications for Farmer
  await prisma.notification.create({
    data: {
      userId: primaryFarmer.id,
      title: 'Tractor Allocated for Tomato Harvesting',
      message: `Your request for Tractor (Mahindra 575 DI) has been confirmed for 08:00 AM tomorrow. Priority score: ${pScoreA.totalScore}/100.`,
      type: 'SUCCESS'
    }
  });

  await prisma.notification.create({
    data: {
      userId: primaryFarmer.id,
      title: 'Adverse Rain Warning in Mandya',
      message: 'Meteorological department predicts 45mm rainfall in your area tomorrow afternoon. Schedulers are prioritizing high-risk harvesting.',
      type: 'WARNING'
    }
  });

  console.log('✅ Created Demo Notifications');
  console.log('\n=============================================');
  console.log('🎉 FARMGRID DATABASE SEEDED SUCCESSFULLY!');
  console.log('=============================================');
  console.log('Demo Logins:');
  console.log('  👨‍🌾 Farmer: farmer@farmgrid.demo / demo123');
  console.log('  🚜 Owner:  owner@farmgrid.demo  / demo123');
  console.log('  👑 Admin:  admin@farmgrid.demo  / demo123');
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
