const http = require('http');
const assert = require('assert');
const { app, server } = require('../src/server');
const prisma = require('../src/utils/prisma');

const PORT = 5055;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: `/api${path}`,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let buf = '';
        res.on('data', (d) => (buf += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch {
            resolve({ status: res.statusCode, raw: buf });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runComprehensiveVerification() {
  console.log('====================================================');
  console.log('   FARMGRID COMPREHENSIVE END-TO-END VERIFICATION   ');
  console.log('====================================================\n');

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`📡 Test server running on http://127.0.0.1:${PORT}`);

  try {
    // 1. Health check
    console.log('\n[1/8] Verifying API Health & Server Initialization...');
    const health = await request('GET', '/health');
    assert.strictEqual(health.status, 200, 'Health check must return 200');
    assert.strictEqual(health.body.status, 'UP', 'Health status must be UP');
    console.log('  ✅ API Health: 200 UP');

    // 2. Authentication
    console.log('\n[2/8] Verifying Authentication & Role Permissions...');
    const farmerLogin = await request('POST', '/auth/login', { email: 'farmer@farmgrid.demo', password: 'demo123' });
    assert.strictEqual(farmerLogin.status, 200);
    const farmerToken = farmerLogin.body.data.token;
    const farmerUser = farmerLogin.body.data.user;
    assert.strictEqual(farmerUser.role, 'FARMER');
    console.log(`  ✅ Farmer Login OK (ID: ${farmerUser.id}, Name: ${farmerUser.name})`);

    const ownerLogin = await request('POST', '/auth/login', { email: 'owner@farmgrid.demo', password: 'demo123' });
    assert.strictEqual(ownerLogin.status, 200);
    const ownerToken = ownerLogin.body.data.token;
    const ownerUser = ownerLogin.body.data.user;
    assert.strictEqual(ownerUser.role, 'OWNER');
    console.log(`  ✅ Owner Login OK (ID: ${ownerUser.id}, Name: ${ownerUser.name})`);

    const adminLogin = await request('POST', '/auth/login', { email: 'admin@farmgrid.demo', password: 'demo123' });
    assert.strictEqual(adminLogin.status, 200);
    const adminToken = adminLogin.body.data.token;
    const adminUser = adminLogin.body.data.user;
    assert.strictEqual(adminUser.role, 'ADMIN');
    console.log(`  ✅ Admin Login OK (ID: ${adminUser.id}, Name: ${adminUser.name})`);

    const meRes = await request('GET', '/auth/me', null, farmerToken);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.data.user.email, 'farmer@farmgrid.demo');
    console.log('  ✅ /auth/me Profile verification OK');

    // 3. Farmer Operations
    console.log('\n[3/8] Verifying Farmer Operations & Farm Creation...');
    const farmsRes = await request('GET', '/farms', null, farmerToken);
    assert.strictEqual(farmsRes.status, 200);
    assert.ok(Array.isArray(farmsRes.body.data), 'Farms must return an array');
    console.log(`  ✅ Farmer Farms Query OK (${farmsRes.body.data.length} farms found)`);

    const testFarmName = `E2E Farm Test ${Date.now()}`;
    const newFarmRes = await request('POST', '/farms', {
      name: testFarmName,
      latitude: 12.525,
      longitude: 76.900,
      address: 'Mandya Test Block',
      crop: 'Sugarcane',
      cropStage: 'VEGETATIVE',
      cropArea: 3.5
    }, farmerToken);
    assert.strictEqual(newFarmRes.status, 201);
    const createdFarmId = newFarmRes.body.data.id;
    console.log(`  ✅ Farm Created OK (ID: ${createdFarmId}, Name: ${testFarmName})`);

    // 4. Request Creation & Priority Scoring
    console.log('\n[4/8] Verifying Resource Request & Priority Scoring Engine...');
    const tomorrow = new Date(Date.now() + 86400000);
    const startWindow = new Date(tomorrow);
    startWindow.setHours(9, 0, 0, 0);
    const endWindow = new Date(tomorrow);
    endWindow.setHours(17, 0, 0, 0);

    const reqCreateRes = await request('POST', '/requests', {
      farmId: createdFarmId,
      resourceType: 'TRACTOR',
      earliestStart: startWindow.toISOString(),
      latestEnd: endWindow.toISOString(),
      durationMinutes: 120,
      urgencyLevel: 'HIGH',
      urgencyReason: 'Pre-monsoon soil preparation',
      cropStage: 'VEGETATIVE',
      weatherRisk: 'MEDIUM'
    }, farmerToken);
    assert.strictEqual(reqCreateRes.status, 201);
    const createdRequest = reqCreateRes.body.data.request;
    const priority = reqCreateRes.body.data.priority;
    assert.ok(createdRequest.id, 'Request ID must exist');
    assert.ok(priority.totalScore > 0, 'Priority score must be calculated');
    console.log(`  ✅ Request Created OK (ID: ${createdRequest.id}, Status: ${createdRequest.status}, Priority Score: ${priority.totalScore}/100)`);
    console.log(`     Explanation: ${priority.explanation.split('\n')[0]}`);

    const singleReqRes = await request('GET', `/requests/${createdRequest.id}`, null, farmerToken);
    assert.strictEqual(singleReqRes.status, 200);
    assert.strictEqual(singleReqRes.body.data.id, createdRequest.id);
    console.log('  ✅ Single Request Query OK');

    const priorityRes = await request('GET', `/requests/${createdRequest.id}/priority`, null, farmerToken);
    assert.strictEqual(priorityRes.status, 200);
    assert.strictEqual(priorityRes.body.data.requestId, createdRequest.id);
    console.log('  ✅ Request Priority Query OK');

    // 5. Equipment Owner Operations
    console.log('\n[5/8] Verifying Equipment Owner Fleet Operations...');
    const ownerResourcesRes = await request('GET', '/resources/my', null, ownerToken);
    assert.strictEqual(ownerResourcesRes.status, 200);
    console.log(`  ✅ Owner Fleet Query OK (${ownerResourcesRes.body.data.length} resources owned)`);

    const newResourceRes = await request('POST', '/resources', {
      name: `E2E Mahindra Tractor ${Date.now()}`,
      type: 'TRACTOR',
      description: 'Test Tractor for Automated E2E Verification',
      latitude: 12.520,
      longitude: 76.890,
      operatingStart: '06:00',
      operatingEnd: '20:00',
      fuelRequirement: 'DIESEL'
    }, ownerToken);
    assert.strictEqual(newResourceRes.status, 201);
    const createdResId = newResourceRes.body.data.id;
    console.log(`  ✅ Equipment Registered OK (ID: ${createdResId}, Name: ${newResourceRes.body.data.name})`);

    const updateResRes = await request('PUT', `/resources/${createdResId}`, {
      description: 'Updated test description'
    }, ownerToken);
    assert.strictEqual(updateResRes.status, 200);
    console.log('  ✅ Equipment Update OK');

    const maintRes = await request('POST', `/resources/${createdResId}/maintenance`, {
      maintenanceStatus: 'SCHEDULED',
      status: 'MAINTENANCE'
    }, ownerToken);
    assert.strictEqual(maintRes.status, 200);
    assert.strictEqual(maintRes.body.data.status, 'MAINTENANCE');
    console.log('  ✅ Maintenance Status Toggle OK (Status: MAINTENANCE)');

    // 6. Admin System Operations
    console.log('\n[6/8] Verifying Admin Master Dashboard, Timeline & Conflicts...');
    const adminDashRes = await request('GET', '/admin/dashboard', null, adminToken);
    assert.strictEqual(adminDashRes.status, 200);
    const summary = adminDashRes.body.data.summary;
    console.log(`  ✅ Admin Dashboard Summary: ${summary.totalResources} Resources, ${summary.totalRequests} Requests, ${summary.activeBookings} Active Bookings, ${summary.activeConflictsCount} Conflicts`);

    const adminSchedRes = await request('GET', '/admin/schedule', null, adminToken);
    assert.strictEqual(adminSchedRes.status, 200);
    assert.ok(Array.isArray(adminSchedRes.body.data), 'Timeline data must be array');
    console.log(`  ✅ Admin Master Timeline Query OK (${adminSchedRes.body.data.length} equipment rows)`);

    const adminConflictsRes = await request('GET', '/admin/conflicts', null, adminToken);
    assert.strictEqual(adminConflictsRes.status, 200);
    console.log(`  ✅ Admin Conflicts Matrix Query OK (Total Conflicts: ${adminConflictsRes.body.data.totalConflicts})`);

    const adminReallocRes = await request('POST', '/admin/reallocate', {}, adminToken);
    assert.strictEqual(adminReallocRes.status, 200);
    console.log('  ✅ Admin Global Master Reallocation Executed OK');

    // 7. Disruption Simulator
    console.log('\n[7/8] Verifying Disruption Simulator (Breakdown, Weather, Cancellation)...');
    const weatherSimRes = await request('POST', '/admin/disruptions', {
      type: 'WEATHER',
      rainSeverity: 'CRITICAL'
    }, adminToken);
    assert.strictEqual(weatherSimRes.status, 200);
    console.log(`  ✅ Weather Disruption Simulated OK (${weatherSimRes.body.data.affectedRequestsCount} requests reprioritized)`);

    // 8. Clean up created test entities
    console.log('\n[8/8] Cleaning Up Temporary Test Records...');
    await request('POST', `/requests/${createdRequest.id}/cancel`, {}, farmerToken);
    await request('DELETE', `/resources/${createdResId}`, null, ownerToken);
    await prisma.farm.delete({ where: { id: createdFarmId } });
    console.log('  ✅ Temporary Test Entities Cleaned Up Cleanly');

    console.log('\n====================================================');
    console.log('   🎉 ALL 8/8 END-TO-END VERIFICATION MODULES PASSED ');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runComprehensiveVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ E2E VERIFICATION FAILED:', err);
    process.exit(1);
  });
