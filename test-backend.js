const http = require('http');
const { spawn } = require('child_process');

// Function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testBackend() {
  // Start the backend server
  console.log('Starting backend server...');
  const server = spawn('node', ['backend/server.js'], { stdio: 'inherit' });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Test 1: GET /api/countries
    console.log('\n=== Testing GET /api/countries ===');
    const countriesResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/countries',
      method: 'GET'
    });

    console.log(`Status: ${countriesResponse.statusCode}`);
    console.log(`Countries count: ${countriesResponse.data.countries?.length}`);
    console.log(`Response time: ${countriesResponse.data.response_time}ms`);

    if (countriesResponse.statusCode === 200 && countriesResponse.data.countries?.length > 0) {
      console.log('✓ Countries list endpoint working');
    } else {
      console.log('✗ Countries list endpoint failed');
    }

    // Test 2: GET /api/countries/:id (valid)
    console.log('\n=== Testing GET /api/countries/arg (valid ID) ===');
    const countryResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/countries/arg',
      method: 'GET'
    });

    console.log(`Status: ${countryResponse.statusCode}`);
    console.log(`Country: ${countryResponse.data.country?.name}`);
    console.log(`Response time: ${countryResponse.data.response_time}ms`);

    if (countryResponse.statusCode === 200 && countryResponse.data.country?.name === 'Argentina') {
      console.log('✓ Valid country detail endpoint working');
    } else {
      console.log('✗ Valid country detail endpoint failed');
    }

    // Test 3: GET /api/countries/:id (invalid)
    console.log('\n=== Testing GET /api/countries/invalid-id (invalid ID) ===');
    const invalidResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/countries/invalid-id',
      method: 'GET'
    });

    console.log(`Status: ${invalidResponse.statusCode}`);
    console.log(`Error: ${invalidResponse.data.error}`);

    if (invalidResponse.statusCode === 404 && invalidResponse.data.error === 'Country not found') {
      console.log('✓ Invalid country ID handling working');
    } else {
      console.log('✗ Invalid country ID handling failed');
    }

    // Test 4: GET /api/countries/:id (malformed)
    console.log('\n=== Testing GET /api/countries/@@invalid@@ (malformed ID) ===');
    const malformedResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/countries/@@invalid@@',
      method: 'GET'
    });

    console.log(`Status: ${malformedResponse.statusCode}`);
    console.log(`Error: ${malformedResponse.data.error}`);

    if (malformedResponse.statusCode === 400) {
      console.log('✓ Malformed ID validation working');
    } else {
      console.log('✗ Malformed ID validation failed');
    }

    // Test 5: Check CORS headers
    console.log('\n=== Testing CORS headers ===');
    const corsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/countries',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:4200'
      }
    });

    console.log(`CORS header: ${corsResponse.headers['access-control-allow-origin']}`);

    if (corsResponse.headers['access-control-allow-origin']) {
      console.log('✓ CORS headers present');
    } else {
      console.log('✗ CORS headers missing');
    }

    console.log('\n=== Backend API Testing Complete ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up: kill the server
    server.kill();
  }
}

testBackend().catch(console.error);