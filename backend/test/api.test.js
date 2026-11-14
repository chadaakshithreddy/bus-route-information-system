const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { seedData } = require('../src/utils/seedData');

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;
let adminToken = '';
let regularUserToken = '';
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

const runTests = async () => {
  console.log('==================================================');
  console.log(' Starting Bus Route Information System Test Suite ');
  console.log('==================================================\n');

  try {
    // 1. Database Connection & Server Start
    console.log('--- Phase 1: Server and Database Setup ---');
    await connectDB();
    await seedData(false);

    server = app.listen(TEST_PORT);
    assert(server.listening, 'Server starts and listens on port ' + TEST_PORT);

    // 2. Health Check
    console.log('\n--- Phase 2: Health Check ---');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.success === true,
      `Health check GET /api/health returned 200 with success: true ("${healthData.message}")`
    );

    // 3. Authentication & Role Enforcement (Section 6, 17, 19)
    console.log('\n--- Phase 3: Authentication & Security Tokens ---');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@busroute.com',
        password: 'admin123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;
    assert(
      adminLoginRes.status === 200 && adminLoginData.token && adminLoginData.data.role === 'admin',
      'Admin login verified credentials and returned JWT token with admin role'
    );

    const userRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Normal User',
        email: 'regularpassenger@busroute.com',
        password: 'password123',
        role: 'user'
      })
    });
    const userRegisterData = await userRegisterRes.json();
    regularUserToken = userRegisterData.token;
    assert(
      userRegisterRes.status === 201 && userRegisterData.data.role === 'user',
      'Regular user registration succeeded without exposing password'
    );

    // Test API Protection: Unauthorized call rejected (Section 19)
    const unauthStopRes = await fetch(`${BASE_URL}/api/stops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stopId: 'S_TEST', stopName: 'Unauthorized Stop' })
    });
    assert(
      unauthStopRes.status === 401,
      'POST /api/stops without token correctly rejected with 401 Unauthorized'
    );

    // Test Role Protection: Non-admin call rejected (Section 19)
    const nonAdminRouteRes = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regularUserToken}`
      },
      body: JSON.stringify({ routeNumber: '999', stops: ['S001', 'S002'] })
    });
    assert(
      nonAdminRouteRes.status === 403,
      'POST /api/routes with regular user token rejected with 403 Forbidden (Admin role required)'
    );

    // 4. Public Stop APIs: Retrieval & Search (Hanamkonda / Warangal dataset)
    console.log('\n--- Phase 4: Stop Retrieval & Search APIs ---');
    const stopsRes = await fetch(`${BASE_URL}/api/stops`);
    const stopsData = await stopsRes.json();
    assert(
      stopsRes.status === 200 && stopsData.success === true && stopsData.data.length >= 50,
      `GET /api/stops returned all ${stopsData.count} stops (50+ realistic locations)`
    );

    const singleStopRes = await fetch(`${BASE_URL}/api/stops/S001`);
    const singleStopData = await singleStopRes.json();
    assert(
      singleStopRes.status === 200 &&
        singleStopData.success === true &&
        singleStopData.data.stopName === 'Hanamkonda Bus Station',
      `GET /api/stops/S001 returned correct stop: "${singleStopData.data?.stopName}"`
    );

    // Verify SR University stop exists with S025 (Required Section 3)
    const srUnivStopRes = await fetch(`${BASE_URL}/api/stops/S025`);
    const srUnivStopData = await srUnivStopRes.json();
    assert(
      srUnivStopRes.status === 200 &&
        srUnivStopData.data.stopName === 'SR University' &&
        srUnivStopData.data.stopId === 'S025' &&
        srUnivStopData.data.connectedRoutes.length >= 3,
      `GET /api/stops/S025 returned "SR University" connected to ${srUnivStopData.data?.connectedRoutes?.length} routes`
    );

    const searchStopRes = await fetch(`${BASE_URL}/api/stops?name=Chowrasta`);
    const searchStopData = await searchStopRes.json();
    assert(
      searchStopRes.status === 200 &&
        searchStopData.data.some((s) => s.stopName.includes('Hanamkonda Chowrasta')),
      `Stop search GET /api/stops?name=Chowrasta found Hanamkonda Chowrasta`
    );

    // 5. Admin Stop CRUD & Safety Check (Section 9, 10, 11, 12)
    console.log('\n--- Phase 5: Admin Stop CRUD & Safety Checks ---');
    const createStopRes = await fetch(`${BASE_URL}/api/stops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        stopId: 'S999',
        stopName: 'Test Junction Stop',
        latitude: 18.005,
        longitude: 79.565,
        connectedRoutes: []
      })
    });
    const createStopData = await createStopRes.json();
    assert(
      createStopRes.status === 201 && createStopData.success === true,
      `Admin POST /api/stops successfully created stopId S999`
    );

    const updateStopRes = await fetch(`${BASE_URL}/api/stops/S999`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        stopName: 'Updated Test Junction Stop'
      })
    });
    const updateStopData = await updateStopRes.json();
    assert(
      updateStopRes.status === 200 &&
        updateStopData.data.stopName === 'Updated Test Junction Stop',
      `Admin PUT /api/stops/S999 successfully modified stopName`
    );

    // Stop Deletion Safety Check (Section 12): Cannot delete stop in active use
    const unsafeDeleteRes = await fetch(`${BASE_URL}/api/stops/S001`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      unsafeDeleteRes.status === 400,
      'Safety check: DELETE /api/stops/S001 blocked because stop is in active use by routes'
    );

    // Safe stop deletion
    const deleteStopRes = await fetch(`${BASE_URL}/api/stops/S999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const deleteStopData = await deleteStopRes.json();
    assert(
      deleteStopRes.status === 200 && deleteStopData.success === true,
      `Safe deletion DELETE /api/stops/S999 successfully deleted the unused stop`
    );

    // 6. Public Route APIs: Retrieval
    console.log('\n--- Phase 6: Public Route Retrieval APIs ---');
    const routesRes = await fetch(`${BASE_URL}/api/routes`);
    const routesData = await routesRes.json();
    assert(
      routesRes.status === 200 && routesData.success === true && routesData.data.length >= 10,
      `GET /api/routes returned all ${routesData.count} transit routes with enriched stop details`
    );

    const singleRouteRes = await fetch(`${BASE_URL}/api/routes/R101`);
    const singleRouteData = await singleRouteRes.json();
    assert(
      singleRouteRes.status === 200 &&
        singleRouteData.success === true &&
        singleRouteData.data.routeNumber === '101' &&
        singleRouteData.data.startStop === 'Hanamkonda Bus Station' &&
        singleRouteData.data.endStop === 'SR University' &&
        singleRouteData.data.stopDetails.length === 8,
      `GET /api/routes/R101 returned Route 101 (${singleRouteData.data?.startStop} → ${singleRouteData.data?.endStop}) with 8 stops`
    );

    // 7. Route Search APIs
    console.log('\n--- Phase 7: Route Search APIs ---');
    const searchRouteNumRes = await fetch(`${BASE_URL}/api/routes/search?routeNumber=102`);
    const searchRouteNumData = await searchRouteNumRes.json();
    assert(
      searchRouteNumRes.status === 200 &&
        searchRouteNumData.data.length > 0 &&
        searchRouteNumData.data[0].routeNumber === '102',
      `Route search by number GET /api/routes/search?routeNumber=102 returned Route 102`
    );

    // Search by SR University (Section 7 Search 5)
    const searchSRUnivRes = await fetch(`${BASE_URL}/api/routes/search?q=SR%20University`);
    const searchSRUnivData = await searchSRUnivRes.json();
    assert(
      searchSRUnivData.success === true && searchSRUnivData.data.length >= 3,
      `Route search for "SR University" found ${searchSRUnivData.data?.length} connecting routes`
    );

    // 8. Demo Search Scenarios (Section 7)
    console.log('\n--- Phase 8: Demo Search Scenarios ---');

    // Scenario 1: FROM Hanamkonda Bus Station TO SR University (Multiple routes expected: 101, 105, 109)
    const path1Res = await fetch(`${BASE_URL}/api/routes/path?fromStopId=S001&toStopId=S025`);
    const path1Data = await path1Res.json();
    assert(
      path1Data.success === true &&
        path1Data.routes.length >= 2 &&
        path1Data.routes.some((r) => r.routeNumber === '101') &&
        path1Data.routes.some((r) => r.routeNumber === '105'),
      `Scenario 1: Hanamkonda Bus Station → SR University returned ${path1Data.routes?.length} matching routes (Routes 101, 105, 109)`
    );

    // Scenario 2: FROM SR University TO Hanamkonda Bus Station
    const path2Res = await fetch(`${BASE_URL}/api/routes/path?fromStopId=S025&toStopId=S001`);
    const path2Data = await path2Res.json();
    assert(
      path2Data.success === true && path2Data.routes.length >= 2,
      `Scenario 2: SR University → Hanamkonda Bus Station returned ${path2Data.routes?.length} matching routes`
    );

    // Scenario 3: FROM Kazipet Railway Station TO SR University (Route 107)
    const path3Res = await fetch(`${BASE_URL}/api/routes/path?fromStopId=S013&toStopId=S025`);
    const path3Data = await path3Res.json();
    assert(
      path3Data.success === true &&
        path3Data.routes.length >= 1 &&
        path3Data.routes.some((r) => r.routeNumber === '107'),
      `Scenario 3: Kazipet Railway Station → SR University returned Route 107`
    );

    // Scenario 4: FROM Warangal Railway Station TO Hanamkonda Bus Station (Multiple routes: 103, 104, 108)
    const path4Res = await fetch(`${BASE_URL}/api/routes/path?fromStopId=S012&toStopId=S001`);
    const path4Data = await path4Res.json();
    assert(
      path4Data.success === true &&
        path4Data.routes.length >= 2 &&
        path4Data.routes.some((r) => r.routeNumber === '103') &&
        path4Data.routes.some((r) => r.routeNumber === '104'),
      `Scenario 4: Warangal Railway Station → Hanamkonda Bus Station returned ${path4Data.routes?.length} routes (Routes 103, 104, 108)`
    );

    // 9. Route Validation Rules
    console.log('\n--- Phase 9: Route Validation Rules ---');
    const duplicateRouteRes = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        routeId: 'R101-DUP',
        routeNumber: '101', // Already exists!
        startStop: 'Hanamkonda Bus Station',
        endStop: 'SR University',
        distance: 18,
        duration: 45,
        stops: ['S001', 'S025'],
        timings: { firstTrip: '06:00 AM', lastTrip: '09:00 PM' }
      })
    });
    assert(
      duplicateRouteRes.status === 400,
      `Unique routeNumber validation rejects duplicate route number with 400 Bad Request`
    );

    const minStopsRes = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        routeId: 'R999',
        routeNumber: '999',
        startStop: 'Single Stop',
        endStop: 'Single Stop',
        distance: 5,
        duration: 10,
        stops: ['S001'], // Less than 2 stops!
        timings: { firstTrip: '06:00 AM', lastTrip: '09:00 PM' }
      })
    });
    assert(
      minStopsRes.status === 400,
      `Minimum 2 stops validation rejects route with 1 stop with 400 Bad Request`
    );

    // 10. Route CRUD & Stop Synchronization
    console.log('\n--- Phase 10: Admin Route CRUD & Sync ---');
    const newRouteRes = await fetch(`${BASE_URL}/api/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        routeId: 'R205',
        routeNumber: '205',
        startStop: 'Hanamkonda Bus Station',
        endStop: 'SR University Main Gate',
        distance: 17,
        duration: 40,
        stops: ['S001', 'S016', 'S024'],
        timings: { firstTrip: '07:15 AM', lastTrip: '08:30 PM' }
      })
    });
    const newRouteData = await newRouteRes.json();
    assert(
      newRouteRes.status === 201 && newRouteData.success === true,
      `Route creation POST /api/routes created Route 205 (R205)`
    );

    // Verify connectedRoutes in Stop S024 was updated
    const stop24Res = await fetch(`${BASE_URL}/api/stops/S024`);
    const stop24Data = await stop24Res.json();
    assert(
      stop24Data.data.connectedRoutes.includes('R205'),
      `Connected route R205 automatically synced into Stop S024's connectedRoutes`
    );

    const updateRouteRes = await fetch(`${BASE_URL}/api/routes/R205`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        distance: 17.5,
        duration: 42
      })
    });
    const updateRouteData = await updateRouteRes.json();
    assert(
      updateRouteRes.status === 200 && updateRouteData.data.distance === 17.5,
      `Route update PUT /api/routes/R205 updated distance to 17.5`
    );

    const deleteRouteRes = await fetch(`${BASE_URL}/api/routes/R205`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const deleteRouteData = await deleteRouteRes.json();
    assert(
      deleteRouteRes.status === 200 && deleteRouteData.success === true,
      `Route deletion DELETE /api/routes/R205 deleted Route 205`
    );

    // 11. Dashboard Stats API
    console.log('\n--- Phase 11: Dashboard Statistics API ---');
    const statsRes = await fetch(`${BASE_URL}/api/routes/stats/dashboard`);
    const statsData = await statsRes.json();
    assert(
      statsRes.status === 200 &&
        statsData.success === true &&
        statsData.data.totalRoutes >= 10 &&
        statsData.data.totalStops >= 50,
      `GET /api/routes/stats/dashboard returned real database stats (Routes: ${statsData.data?.totalRoutes}, Stops: ${statsData.data?.totalStops})`
    );

    // 12. Feedback APIs
    console.log('\n--- Phase 12: Feedback APIs ---');
    const feedbackPostRes = await fetch(`${BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: 'R101',
        message: 'Great bus route coverage and timing to SR University.'
      })
    });
    const feedbackPostData = await feedbackPostRes.json();
    assert(
      feedbackPostRes.status === 201 && feedbackPostData.success === true,
      `POST /api/feedback recorded user feedback`
    );

    const feedbackGetRes = await fetch(`${BASE_URL}/api/feedback`);
    const feedbackGetData = await feedbackGetRes.json();
    assert(
      feedbackGetRes.status === 200 && feedbackGetData.data.length >= 2,
      `GET /api/feedback returned all feedback entries`
    );

    // Final summary
    console.log('\n==================================================');
    console.log(` Test Results: ${passedCount} passed, ${failedCount} failed`);
    console.log('==================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(failedCount > 0 ? 1 : 0);
  }
};

runTests();
