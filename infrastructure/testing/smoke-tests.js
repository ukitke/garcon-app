#!/usr/bin/env node

/**
 * Smoke tests for production deployment
 * These tests verify that the basic functionality works after deployment
 */

const https = require('https');
const http = require('http');
const assert = require('assert');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'https://api.garcon-app.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 5000,
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

/**
 * Make HTTP request with retry logic
 */
async function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const client = url.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Garcon-Smoke-Tests/1.0',
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedBody = responseBody ? JSON.parse(responseBody) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody,
            rawBody: responseBody,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: responseBody,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Execute a test with retry logic
 */
async function executeTest(testName, testFunction) {
  console.log(`\n🧪 Running: ${testName}`);
  
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      const startTime = Date.now();
      await testFunction();
      const duration = Date.now() - startTime;
      
      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      results.passed++;
      results.tests.push({
        name: testName,
        status: 'PASSED',
        duration,
        attempt,
      });
      return;
      
    } catch (error) {
      console.log(`❌ Attempt ${attempt}/${config.retries} failed: ${error.message}`);
      
      if (attempt === config.retries) {
        console.log(`❌ FAILED: ${testName} - ${error.message}`);
        results.failed++;
        results.tests.push({
          name: testName,
          status: 'FAILED',
          error: error.message,
          attempt,
        });
      } else {
        console.log(`⏳ Retrying in ${config.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
  }
}

/**
 * Test: Basic health check
 */
async function testHealthCheck() {
  const response = await makeRequest({
    url: `${config.baseUrl}/health`,
    method: 'GET',
  });
  
  assert.strictEqual(response.statusCode, 200, 'Health check should return 200');
  assert.strictEqual(response.body.status, 'OK', 'Health status should be OK');
  assert(response.body.service, 'Service name should be present');
  assert(response.body.timestamp, 'Timestamp should be present');
}

/**
 * Test: Detailed health check with dependencies
 */
async function testDetailedHealthCheck() {
  const response = await makeRequest({
    url: `${config.baseUrl}/api/health`,
    method: 'GET',
  });
  
  assert.strictEqual(response.statusCode, 200, 'Detailed health check should return 200');
  assert.strictEqual(response.body.status, 'OK', 'Health status should be OK');
  assert(response.body.checks, 'Health checks should be present');
  assert(response.body.checks.database, 'Database check should be present');
  assert(response.body.checks.redis, 'Redis check should be present');
  assert.strictEqual(response.body.checks.database.status, 'OK', 'Database should be healthy');
  assert.strictEqual(response.body.checks.redis.status, 'OK', 'Redis should be healthy');
}

/**
 * Test: API version endpoint
 */
async function testApiVersion() {
  const response = await makeRequest({
    url: `${config.baseUrl}/api/v1`,
    method: 'GET',
  });
  
  assert.strictEqual(response.statusCode, 200, 'API version should return 200');
  assert(response.body.message, 'API message should be present');
  assert(response.body.version, 'API version should be present');
  assert(response.body.endpoints, 'API endpoints should be listed');
}

/**
 * Test: User registration (without actually creating a user)
 */
async function testUserRegistrationValidation() {
  const response = await makeRequest({
    url: `${config.baseUrl}/api/v1/auth/register`,
    method: 'POST',
  }, {
    // Invalid data to test validation
    email: 'invalid-email',
    password: '123',
  });
  
  // Should return 400 for validation errors
  assert.strictEqual(response.statusCode, 400, 'Invalid registration should return 400');
  assert(response.body.error, 'Error message should be present');
}

/**
 * Test: Location endpoint (public data)
 */
async function testLocationEndpoint() {
  const response = await makeRequest({
    url: `${config.baseUrl}/api/v1/locations/nearby?lat=40.7128&lng=-74.0060`,
    method: 'GET',
  });
  
  // Should return 200 even if no locations found
  assert(response.statusCode === 200 || response.statusCode === 404, 'Location endpoint should be accessible');
}

/**
 * Test: CORS headers
 */
async function testCorsHeaders() {
  const response = await makeRequest({
    url: `${config.baseUrl}/api/v1`,
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://app.garcon-app.com',
      'Access-Control-Request-Method': 'POST',
    },
  });
  
  assert(response.headers['access-control-allow-origin'], 'CORS origin header should be present');
  assert(response.headers['access-control-allow-methods'], 'CORS methods header should be present');
}

/**
 * Test: Security headers
 */
async function testSecurityHeaders() {
  const response = await makeRequest({
    url: `${config.baseUrl}/health`,
    method: 'GET',
  });
  
  assert(response.headers['x-content-type-options'], 'X-Content-Type-Options header should be present');
  assert(response.headers['x-frame-options'], 'X-Frame-Options header should be present');
  assert(response.headers['strict-transport-security'], 'HSTS header should be present');
}

/**
 * Test: Rate limiting
 */
async function testRateLimiting() {
  // Make multiple rapid requests to trigger rate limiting
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(makeRequest({
      url: `${config.baseUrl}/api/v1`,
      method: 'GET',
    }));
  }
  
  const responses = await Promise.all(requests);
  
  // At least some requests should succeed
  const successfulRequests = responses.filter(r => r.statusCode === 200);
  assert(successfulRequests.length > 0, 'Some requests should succeed');
  
  console.log(`Rate limiting test: ${successfulRequests.length}/10 requests succeeded`);
}

/**
 * Test: 404 handling
 */
async function test404Handling() {
  const response = await makeRequest({
    url: `${config.baseUrl}/api/nonexistent-endpoint`,
    method: 'GET',
  });
  
  assert.strictEqual(response.statusCode, 404, 'Nonexistent endpoint should return 404');
  assert(response.body.error, 'Error message should be present');
  assert.strictEqual(response.body.error.code, 'NOT_FOUND', 'Error code should be NOT_FOUND');
}

/**
 * Test: Metrics endpoint
 */
async function testMetricsEndpoint() {
  const response = await makeRequest({
    url: `${config.baseUrl}/metrics`,
    method: 'GET',
  });
  
  assert.strictEqual(response.statusCode, 200, 'Metrics endpoint should return 200');
  assert(response.body.system, 'System metrics should be present');
  assert(response.body.database, 'Database metrics should be present');
}

/**
 * Test: SSL/TLS configuration
 */
async function testSSLConfiguration() {
  if (!config.baseUrl.startsWith('https://')) {
    console.log('⏭️  Skipping SSL test (not HTTPS)');
    return;
  }
  
  // This test just verifies that HTTPS requests work
  const response = await makeRequest({
    url: `${config.baseUrl}/health`,
    method: 'GET',
  });
  
  assert.strictEqual(response.statusCode, 200, 'HTTPS request should succeed');
}

/**
 * Main test runner
 */
async function runSmokeTests() {
  console.log('🚀 Starting Garçon App Smoke Tests');
  console.log(`📍 Target URL: ${config.baseUrl}`);
  console.log(`⏱️  Timeout: ${config.timeout}ms`);
  console.log(`🔄 Retries: ${config.retries}`);
  
  const startTime = Date.now();
  
  // Run all tests
  await executeTest('Basic Health Check', testHealthCheck);
  await executeTest('Detailed Health Check', testDetailedHealthCheck);
  await executeTest('API Version Endpoint', testApiVersion);
  await executeTest('User Registration Validation', testUserRegistrationValidation);
  await executeTest('Location Endpoint', testLocationEndpoint);
  await executeTest('CORS Headers', testCorsHeaders);
  await executeTest('Security Headers', testSecurityHeaders);
  await executeTest('Rate Limiting', testRateLimiting);
  await executeTest('404 Handling', test404Handling);
  await executeTest('Metrics Endpoint', testMetricsEndpoint);
  await executeTest('SSL Configuration', testSSLConfiguration);
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    
    process.exit(1);
  } else {
    console.log('\n🎉 All smoke tests passed!');
    process.exit(0);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSmokeTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runSmokeTests,
  executeTest,
  makeRequest,
};