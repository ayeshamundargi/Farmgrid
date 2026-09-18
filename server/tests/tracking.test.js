const http = require('http');
const assert = require('assert');
const { app, server } = require('../src/server');

function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const PORT = process.env.PORT || 5000;
  const isAlreadyRunning = await checkServerRunning(PORT);

  if (!isAlreadyRunning) {
    await new Promise((resolve) => {
      server.listen(PORT, resolve);
    });
  }

  console.log(`\n========================================`);
  console.log(`FARMGRID TRACTOR TRACKING TEST RUNNER`);
  console.log(`========================================`);

  async function postJson(endpoint, body, token) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api${endpoint}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
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
      req.write(data);
      req.end();
    });
  }

  async function getJson(endpoint, token) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api${endpoint}`,
          method: 'GET',
          headers: {
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
      req.end();
    });
  }

  // 1. Authenticate Farmer and Owner
  const farmerLogin = await postJson('/auth/login', { email: 'farmer@farmgrid.demo', password: 'demo123' });
  assert.strictEqual(farmerLogin.status, 200, 'Farmer login should succeed');
  const farmerToken = farmerLogin.body.data.token;

  const ownerLogin = await postJson('/auth/login', { email: 'owner@farmgrid.demo', password: 'demo123' });
  assert.strictEqual(ownerLogin.status, 200, 'Owner login should succeed');
  const ownerToken = ownerLogin.body.data.token;

  console.log('✅ [PASS] Authentication successful for Farmer and Owner');

  // 2. Fetch Farmer requests to find booking #1
  const farmerRequests = await getJson('/requests/my', farmerToken);
  assert.strictEqual(farmerRequests.status, 200);
  const scheduledRequest = farmerRequests.body.data.find((r) => r.booking && r.status === 'SCHEDULED');
  assert.ok(scheduledRequest, 'Must find a scheduled request with a booking');
  const bookingId = scheduledRequest.booking.id;
  console.log(`✅ [PASS] Located Active Booking ID: ${bookingId}`);

  // 3. Fetch Tracking Details
  const trackingRes = await getJson(`/tracking/${bookingId}`, farmerToken);
  assert.strictEqual(trackingRes.status, 200, 'Tracking query should return 200 OK');
  const trackingData = trackingRes.body.data;
  assert.ok(trackingData.currentLocation, 'Tracking payload must contain current location');
  assert.ok(trackingData.otp, 'Farmer must receive the verification OTP');
  console.log(`✅ [PASS] Tracking Query OK (Status: ${trackingData.status}, OTP: ${trackingData.otp})`);

  // 4. Update Tractor Location (Mid-route coordinates)
  const locUpdateRes = await postJson(`/tracking/${bookingId}/location`, {
    latitude: 12.5210,
    longitude: 76.8930,
    heading: 45,
    speed: 26.5
  }, ownerToken);
  assert.strictEqual(locUpdateRes.status, 200, 'Location update should return 200 OK');
  assert.strictEqual(locUpdateRes.body.data.speed, 26.5);
  console.log(`✅ [PASS] Real-Time Location Update Succeeded (Speed: 26.5 km/h, Dist: ${locUpdateRes.body.data.distanceRemaining} km)`);

  // 5. Test Geofence Arrival Detection (Coordinates set within 50 meters of farm at 12.5218, 76.8951)
  const geofenceRes = await postJson(`/tracking/${bookingId}/location`, {
    latitude: 12.5218,
    longitude: 76.8951,
    heading: 90,
    speed: 5.0
  }, ownerToken);
  assert.strictEqual(geofenceRes.status, 200);
  assert.strictEqual(geofenceRes.body.data.status, 'REACHED_LAND', 'Entering farm geofence must automatically trigger REACHED_LAND status');
  console.log('✅ [PASS] Automatic Geofence Arrival Detection (< 100m -> REACHED_LAND)');

  // 6. Test OTP Verification
  const invalidOtpRes = await postJson(`/tracking/${bookingId}/verify-otp`, { otp: '9999' }, ownerToken);
  assert.strictEqual(invalidOtpRes.status, 400, 'Invalid OTP should fail with 400 Bad Request');
  console.log('✅ [PASS] Incorrect OTP rejection verified');

  const validOtpRes = await postJson(`/tracking/${bookingId}/verify-otp`, { otp: trackingData.otp }, ownerToken);
  assert.strictEqual(validOtpRes.status, 200, 'Valid OTP should succeed');
  assert.strictEqual(validOtpRes.body.data.status, 'OTP_VERIFIED');
  assert.strictEqual(validOtpRes.body.data.isOtpVerified, true);
  console.log('✅ [PASS] Valid OTP Verification Succeeded (Status: OTP_VERIFIED)');

  // 7. Test Work Lifecycle Transitions
  const startWorkRes = await postJson(`/tracking/${bookingId}/status`, { status: 'WORK_STARTED' }, ownerToken);
  assert.strictEqual(startWorkRes.status, 200);
  assert.strictEqual(startWorkRes.body.data.status, 'WORK_STARTED');

  const wipRes = await postJson(`/tracking/${bookingId}/status`, { status: 'WORK_IN_PROGRESS' }, ownerToken);
  assert.strictEqual(wipRes.status, 200);
  assert.strictEqual(wipRes.body.data.status, 'WORK_IN_PROGRESS');

  const workDoneRes = await postJson(`/tracking/${bookingId}/status`, { status: 'WORK_COMPLETED' }, ownerToken);
  assert.strictEqual(workDoneRes.status, 200);
  assert.strictEqual(workDoneRes.body.data.status, 'WORK_COMPLETED');

  const returnRes = await postJson(`/tracking/${bookingId}/status`, { status: 'RETURNING' }, ownerToken);
  assert.strictEqual(returnRes.status, 200);
  assert.strictEqual(returnRes.body.data.status, 'RETURNING');

  const completeRes = await postJson(`/tracking/${bookingId}/status`, { status: 'COMPLETED' }, ownerToken);
  assert.strictEqual(completeRes.status, 200);
  assert.strictEqual(completeRes.body.data.status, 'COMPLETED');
  console.log('✅ [PASS] Complete Work Lifecycle Progressed (WORK_STARTED -> WORK_IN_PROGRESS -> WORK_COMPLETED -> RETURNING -> COMPLETED)');

  // 8. Query Active Trackings List
  const activeRes = await getJson('/tracking/active', farmerToken);
  assert.strictEqual(activeRes.status, 200);
  assert.ok(Array.isArray(activeRes.body.data), 'Active trackings must return an array');
  console.log(`✅ [PASS] Active Trackings Query OK (${activeRes.body.data.length} trackings returned)`);

  console.log('\n========================================');
  console.log('TRACTOR TRACKING SUITE: 8/8 TESTS PASSED');
  console.log('========================================\n');

  if (!isAlreadyRunning) {
    server.close();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Tracking test failed:', err);
  process.exit(1);
});
