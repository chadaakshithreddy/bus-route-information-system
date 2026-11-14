const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { seedData } = require('../src/utils/seedData');

const TEST_PORT = 5056;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;
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

const runFrontendTests = async () => {
  console.log('==================================================');
  console.log(' Running Task 2 Frontend & Integration Test Suite ');
  console.log('==================================================\n');

  try {
    await connectDB();
    await seedData(false);

    server = app.listen(TEST_PORT);
    assert(server.listening, `Server listening on port ${TEST_PORT} serving frontend and API`);

    // 1. Static Asset Delivery
    console.log('\n--- Phase 1: Static Page and Asset Delivery ---');
    const indexRes = await fetch(`${BASE_URL}/`);
    const indexHtml = await indexRes.text();
    assert(
      indexRes.status === 200 &&
        indexHtml.includes('Bus Route') &&
        indexHtml.includes('heroSearchInput') &&
        indexHtml.includes('fromStopSelect'),
      'GET / serves index.html with Hero search and Path Finder elements'
    );

    const searchRes = await fetch(`${BASE_URL}/search.html`);
    const searchHtml = await searchRes.text();
    assert(
      searchRes.status === 200 &&
        searchHtml.includes('querySearchInput') &&
        searchHtml.includes('searchFromStopSelect'),
      'GET /search.html serves search.html with query and path selectors'
    );

    const detailsRes = await fetch(`${BASE_URL}/route-details.html`);
    const detailsHtml = await detailsRes.text();
    assert(
      detailsRes.status === 200 && detailsHtml.includes('routeDetailsContainer'),
      'GET /route-details.html serves route-details.html container'
    );

    const cssRes = await fetch(`${BASE_URL}/css/style.css`);
    const cssText = await cssRes.text();
    assert(
      cssRes.status === 200 && cssText.includes('--primary: #0f274a'),
      'GET /css/style.css delivers the public transport stylesheet'
    );

    const apiJsRes = await fetch(`${BASE_URL}/js/api.js`);
    const apiJsText = await apiJsRes.text();
    assert(
      apiJsRes.status === 200 && apiJsText.includes('findRoutesBetweenStops'),
      'GET /js/api.js delivers the central API client'
    );

    const appJsRes = await fetch(`${BASE_URL}/js/app.js`);
    const appJsText = await appJsRes.text();
    assert(
      appJsRes.status === 200 && appJsText.includes('initPathFinder'),
      'GET /js/app.js delivers home page application logic'
    );

    const searchJsRes = await fetch(`${BASE_URL}/js/search.js`);
    const searchJsText = await searchJsRes.text();
    assert(
      searchJsRes.status === 200 && searchJsText.includes('executePathSearch'),
      'GET /js/search.js delivers search page controller logic'
    );

    const detailsJsRes = await fetch(`${BASE_URL}/js/route-details.js`);
    const detailsJsText = await detailsJsRes.text();
    assert(
      detailsJsRes.status === 200 && detailsJsText.includes('renderStopTimeline'),
      'GET /js/route-details.js delivers route timeline logic'
    );

    // 2. Data Contract Verification for Frontend
    console.log('\n--- Phase 2: Frontend Data Contract Verification ---');

    // Verification 1: Stops dropdown population
    const stopsRes = await fetch(`${BASE_URL}/api/stops`);
    const stopsData = await stopsRes.json();
    assert(
      stopsData.success === true &&
        Array.isArray(stopsData.data) &&
        stopsData.data.every((s) => s.stopId && s.stopName),
      'GET /api/stops supplies valid stopId and stopName for dropdown population'
    );

    // Verification 2: Search by route number (e.g. "101")
    const searchRouteRes = await fetch(`${BASE_URL}/api/routes/search?q=101`);
    const searchRouteData = await searchRouteRes.json();
    assert(
      searchRouteData.success === true &&
        searchRouteData.data.some((r) => r.routeNumber === '101'),
      'Route search by "101" returns Route 101'
    );

    // Verification 3: Search by stop name (e.g. "University")
    const searchStopRes = await fetch(`${BASE_URL}/api/routes/search?q=University`);
    const searchStopData = await searchStopRes.json();
    assert(
      searchStopData.success === true && searchStopData.data.length >= 2,
      'Route search by stop name "University" returns connecting routes (101 & 104)'
    );

    // Verification 4: Stop autocomplete suggestions
    const suggestRes = await fetch(`${BASE_URL}/api/stops?name=Hanam`);
    const suggestData = await suggestRes.json();
    assert(
      suggestData.success === true &&
        suggestData.data.some((s) => s.stopName === 'Hanamkonda Bus Station'),
      'Stop name prefix search for "Hanam" returns "Hanamkonda Bus Station" for autocomplete'
    );

    // Verification 5: From -> To search with connected stops (Hanamkonda Bus Station -> SR University)
    const pathRes = await fetch(`${BASE_URL}/api/routes/path?fromStopId=S001&toStopId=S025`);
    const pathData = await pathRes.json();
    assert(
      pathData.success === true &&
        pathData.routes.length > 0 &&
        pathData.routes.some((r) => r.routeNumber === '101') &&
        pathData.routes[0].startStop === 'Hanamkonda Bus Station' &&
        pathData.routes[0].firstTrip === '06:00 AM' &&
        pathData.routes[0].lastTrip === '09:30 PM' &&
        Array.isArray(pathData.routes[0].stops),
      'From -> To path search (Hanamkonda Bus Station S001 -> SR University S025) returns Route 101'
    );

    // Verification 6: From -> To search with no connecting route
    const noPathRes = await fetch(`${BASE_URL}/api/routes/path?fromStopId=S008&toStopId=S027`);
    const noPathData = await noPathRes.json();
    assert(
      noPathData.success === true &&
        noPathData.routes.length === 0 &&
        noPathData.message === 'No route found between the selected stops',
      'From -> To search with unconnected stops returns expected empty response format'
    );

    // Verification 7: Route details with ordered stops sequence
    const routeDetailsRes = await fetch(`${BASE_URL}/api/routes/R101`);
    const routeDetailsData = await routeDetailsRes.json();
    const route = routeDetailsData.data;
    assert(
      routeDetailsData.success === true &&
        route.routeId === 'R101' &&
        route.routeNumber === '101' &&
        route.stopDetails.length === 8 &&
        route.stopDetails[0].stopName === 'Hanamkonda Bus Station' &&
        route.stopDetails[7].stopName === 'SR University',
      'GET /api/routes/R101 returns ordered stop sequence for vertical timeline (Hanamkonda to SR University)'
    );

    console.log('\n==================================================');
    console.log(` Frontend Test Results: ${passedCount} passed, ${failedCount} failed`);
    console.log('==================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Frontend test error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(failedCount > 0 ? 1 : 0);
  }
};

runFrontendTests();
