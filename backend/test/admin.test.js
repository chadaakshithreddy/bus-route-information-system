const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { seedData } = require('../src/utils/seedData');

const TEST_PORT = 5057;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;
let adminToken = '';
let passedCount = 0;
let failedCount = 0;

const assert = (condition, description) => {
  if (condition) {
    console.log(`  ✓ [PASS] ${description}`);
    passedCount++;
  } else {
    console.error(`  ✗ [FAIL] ${description}`);
    failedCount++;
  }
};

const runAdminTests = async () => {
  console.log('==================================================');
  console.log(' Running Task 3 Admin Dashboard & End-to-End Suite ');
  console.log('==================================================\n');

  try {
    await connectDB();
    await seedData(false);

    server = app.listen(TEST_PORT);
    assert(server.listening, `Server listening on port ${TEST_PORT}`);

    // 1. Admin Page Delivery
    console.log('\n--- Phase 1: Admin Pages Delivery ---');
    const loginPageRes = await fetch(`${BASE_URL}/admin/login.html`);
    const loginHtml = await loginPageRes.text();
    assert(
      loginPageRes.status === 200 &&
        loginHtml.includes('ADMIN LOGIN') &&
        loginHtml.includes('adminLoginForm'),
      'GET /admin/login.html delivers the Admin Login page'
    );

    const adminAliasRes = await fetch(`${BASE_URL}/admin`);
    assert(adminAliasRes.status === 200, 'GET /admin alias serves login page');

    const dashPageRes = await fetch(`${BASE_URL}/admin/dashboard.html`);
    const dashHtml = await dashPageRes.text();
    assert(
      dashPageRes.status === 200 &&
        dashHtml.includes('Bus Route Admin') &&
        dashHtml.includes('routeModal') &&
        dashHtml.includes('stopModal'),
      'GET /admin/dashboard.html delivers the Admin Dashboard and Management modals'
    );

    const dashAliasRes = await fetch(`${BASE_URL}/admin/dashboard`);
    assert(dashAliasRes.status === 200, 'GET /admin/dashboard alias serves dashboard page');

    const adminCssRes = await fetch(`${BASE_URL}/admin/css/admin.css`);
    const adminCss = await adminCssRes.text();
    assert(
      adminCssRes.status === 200 && adminCss.includes('--admin-sidebar-width'),
      'GET /admin/css/admin.css delivers admin layout styling'
    );

    const adminJsRes = await fetch(`${BASE_URL}/admin/js/admin.js`);
    const adminJs = await adminJsRes.text();
    assert(
      adminJsRes.status === 200 && adminJs.includes('checkAdminAuth'),
      'GET /admin/js/admin.js delivers admin controller with authentication guard'
    );

    // 2. Authentication Logic & Role Guard
    console.log('\n--- Phase 2: Authentication & Role Enforcement ---');
    // Wrong password test
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@busroute.com', password: 'wrongPassword' })
    });
    assert(badLoginRes.status === 401, 'Login with incorrect password returns 401 Unauthorized');

    // Admin login test
    const goodLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@busroute.com', password: 'admin123' })
    });
    const goodLoginData = await goodLoginRes.json();
    adminToken = goodLoginData.token;
    assert(
      goodLoginRes.status === 200 && goodLoginData.data.role === 'admin' && adminToken,
      'Valid Admin login returns JWT token and admin role confirmation'
    );

    // 3. Real-Time Dashboard Statistics
    console.log('\n--- Phase 3: Dashboard Statistics ---');
    const statsRes = await fetch(`${BASE_URL}/api/routes/stats/dashboard`);
    const statsData = await statsRes.json();
    assert(
      statsRes.status === 200 &&
        statsData.data.totalRoutes >= 10 &&
        statsData.data.totalStops >= 50 &&
        statsData.data.routeWithMostStops !== null &&
        Array.isArray(statsData.data.topConnectedStops),
      'Dashboard stats provides totalRoutes, totalStops, topConnectedStops, and routeWithMostStops'
    );

    // 4. Complete Integration & Lifecycle Test (Sections 28, 29, 30)
    console.log('\n--- Phase 4: Complete Admin Integration Lifecycle ---');

    // Step 4.1: Admin creates Route 300 connecting S001, S006, S025
    const createRouteRes = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        routeId: 'R300',
        routeNumber: '300',
        startStop: 'Hanamkonda Bus Station',
        endStop: 'SR University',
        distance: 22,
        duration: 55,
        stops: ['S001', 'S006', 'S025'],
        timings: { firstTrip: '06:00 AM', lastTrip: '10:00 PM' }
      })
    });
    const createRouteData = await createRouteRes.json();
    assert(
      createRouteRes.status === 201 && createRouteData.success === true,
      'Admin creates new Route 300 via POST /api/routes'
    );

    // Step 4.2: Verify Route 300 is discoverable on public route search
    const searchRes = await fetch(`${BASE_URL}/api/routes/search?q=300`);
    const searchData = await searchRes.json();
    assert(
      searchData.data.length > 0 && searchData.data[0].routeNumber === '300',
      'Integration verified: Route 300 is immediately visible in public route search'
    );

    // Step 4.3: Verify Route 300 appears on public From -> To path search (S001 -> S025)
    const pathRes = await fetch(`${BASE_URL}/api/routes/path?fromStopId=S001&toStopId=S025`);
    const pathData = await pathRes.json();
    assert(
      pathData.routes.some((r) => r.routeNumber === '300'),
      'Integration verified: Route 300 appears in From -> To path search between S001 and S025'
    );

    // Step 4.4: Admin updates Route 300 distance to 24 km and duration to 58 min
    const updateRes = await fetch(`${BASE_URL}/api/routes/R300`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ distance: 24, duration: 58 })
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 && updateData.data.distance === 24,
      'Admin updates Route 300 distance to 24 km'
    );

    // Step 4.5: Verify updated metrics reflect on public Route Details API
    const detailsRes = await fetch(`${BASE_URL}/api/routes/R300`);
    const detailsData = await detailsRes.json();
    assert(
      detailsData.data.distance === 24 && detailsData.data.duration === 58,
      'Integration verified: Public route details reflects updated distance (24 km) and duration (58 min)'
    );

    // Step 4.6: Admin Stop Management: Create new stop S099
    const createStopRes = await fetch(`${BASE_URL}/api/stops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        stopId: 'S099',
        stopName: 'New Airport Terminal',
        latitude: 18.0500,
        longitude: 79.6200
      })
    });
    const createStopData = await createStopRes.json();
    assert(
      createStopRes.status === 201 && createStopData.success === true,
      'Admin creates new stop S099 ("New Airport Terminal")'
    );

    // Step 4.7: Safety Check: Try to delete in-use stop S001 -> blocked
    const unsafeDeleteRes = await fetch(`${BASE_URL}/api/stops/S001`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      unsafeDeleteRes.status === 400,
      'Safety check: Deletion of active stop S001 is safely blocked'
    );

    // Step 4.8: Safe deletion of newly created unused stop S099
    const safeDeleteRes = await fetch(`${BASE_URL}/api/stops/S099`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      safeDeleteRes.status === 200,
      'Admin safely deletes unused stop S099'
    );

    // Step 4.9: Admin deletes Route 300
    const deleteRouteRes = await fetch(`${BASE_URL}/api/routes/R300`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      deleteRouteRes.status === 200,
      'Admin deletes Route 300'
    );

    // Step 4.10: Verify deleted route is no longer found in public search
    const verifyDeleteRes = await fetch(`${BASE_URL}/api/routes/search?q=300`);
    const verifyDeleteData = await verifyDeleteRes.json();
    assert(
      verifyDeleteData.data.length === 0,
      'Integration verified: Deleted Route 300 no longer appears in public search'
    );

    console.log('\n==================================================');
    console.log(` Admin Test Results: ${passedCount} passed, ${failedCount} failed`);
    console.log('==================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Admin test error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(failedCount > 0 ? 1 : 0);
  }
};

runAdminTests();
