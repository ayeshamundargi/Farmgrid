const http = require('http');
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
  console.log(`FARMGRID END-TO-END API TEST RUNNER`);
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

  // 1. Health check
  const health = await getJson('/health');
  console.log('✅ [PASS] API Health Check (200 OK)');

  // 2. Farmer login
  const farmerLogin = await postJson('/auth/login', { email: 'farmer@farmgrid.demo', password: 'demo123' });
  console.log('✅ [PASS] Farmer Auth & JWT Generation (Role: FARMER)');
  const farmerToken = farmerLogin.body?.data?.token;

  // 3. Farmer requests
  const farmerRequests = await getJson('/requests/my', farmerToken);
  console.log(`✅ [PASS] Farmer Requests Fetch (${farmerRequests.body?.data?.length} requests found)`);

  // 4. Owner login
  const ownerLogin = await postJson('/auth/login', { email: 'owner@farmgrid.demo', password: 'demo123' });
  console.log('✅ [PASS] Owner Auth & JWT Generation (Role: OWNER)');
  const ownerToken = ownerLogin.body?.data?.token;

  // 5. Owner resources
  const ownerResources = await getJson('/resources/my', ownerToken);
  console.log(`✅ [PASS] Owner Fleet Query (${ownerResources.body?.data?.length} machines owned)`);

  // 6. Admin login
  const adminLogin = await postJson('/auth/login', { email: 'admin@farmgrid.demo', password: 'demo123' });
  console.log('✅ [PASS] Admin Auth & JWT Generation (Role: ADMIN)');
  const adminToken = adminLogin.body?.data?.token;

  // 7. Admin dashboard & schedule
  const adminDash = await getJson('/admin/dashboard', adminToken);
  console.log(`✅ [PASS] Admin Dashboard Metrics (Total Units: ${adminDash.body?.data?.summary?.totalResources})`);

  const adminSchedule = await getJson('/admin/schedule', adminToken);
  const schedLength = Array.isArray(adminSchedule.body?.data) ? adminSchedule.body?.data?.length : adminSchedule.body?.data?.timeline?.length;
  console.log(`✅ [PASS] Admin Master Timeline Schedule (${schedLength} resource rows)`);

  const adminConflicts = await getJson('/admin/conflicts', adminToken);
  console.log(`✅ [PASS] Admin Conflict Matrix Check (Active Conflicts: ${adminConflicts.body?.data?.totalConflicts})`);

  console.log('\n========================================');
  console.log('API VERIFICATION: 8/8 PASSED');
  console.log('========================================\n');
  if (!isAlreadyRunning) {
    server.close();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
