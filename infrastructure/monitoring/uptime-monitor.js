#!/usr/bin/env node

/**
 * Uptime monitoring script for Garçon App
 * This script can be run as a cron job or external monitoring service
 */

const https = require('https');
const http = require('http');
const { CloudWatch } = require('aws-sdk');

// Configuration
const config = {
  endpoints: [
    {
      name: 'API Health Check',
      url: process.env.API_URL || 'https://api.garcon-app.com/health',
      timeout: 10000,
      expectedStatus: 200,
    },
    {
      name: 'API Detailed Health',
      url: process.env.API_URL || 'https://api.garcon-app.com/api/health',
      timeout: 15000,
      expectedStatus: 200,
    },
    {
      name: 'Admin Panel',
      url: process.env.ADMIN_URL || 'https://admin.garcon-app.com',
      timeout: 10000,
      expectedStatus: 200,
    },
  ],
  cloudWatch: {
    region: process.env.AWS_REGION || 'us-east-1',
    namespace: 'Garcon/Uptime',
  },
};

// Initialize CloudWatch client
const cloudWatch = new CloudWatch({ region: config.cloudWatch.region });

/**
 * Check a single endpoint
 */
async function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(endpoint.url);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      timeout: endpoint.timeout,
      headers: {
        'User-Agent': 'Garcon-Uptime-Monitor/1.0',
      },
    };

    const req = client.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      const isHealthy = res.statusCode === endpoint.expectedStatus;
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          name: endpoint.name,
          url: endpoint.url,
          status: isHealthy ? 'UP' : 'DOWN',
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date().toISOString(),
          body: body.substring(0, 500), // Truncate response body
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        name: endpoint.name,
        url: endpoint.url,
        status: 'DOWN',
        statusCode: 0,
        responseTime,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        name: endpoint.name,
        url: endpoint.url,
        status: 'DOWN',
        statusCode: 0,
        responseTime,
        timestamp: new Date().toISOString(),
        error: 'Request timeout',
      });
    });

    req.end();
  });
}

/**
 * Send metrics to CloudWatch
 */
async function sendMetrics(results) {
  if (!process.env.AWS_REGION) {
    console.log('AWS_REGION not set, skipping CloudWatch metrics');
    return;
  }

  const metricData = [];

  for (const result of results) {
    // Availability metric (1 for UP, 0 for DOWN)
    metricData.push({
      MetricName: 'EndpointAvailability',
      Value: result.status === 'UP' ? 1 : 0,
      Unit: 'None',
      Dimensions: [
        {
          Name: 'EndpointName',
          Value: result.name,
        },
        {
          Name: 'URL',
          Value: result.url,
        },
      ],
      Timestamp: new Date(result.timestamp),
    });

    // Response time metric
    metricData.push({
      MetricName: 'ResponseTime',
      Value: result.responseTime,
      Unit: 'Milliseconds',
      Dimensions: [
        {
          Name: 'EndpointName',
          Value: result.name,
        },
        {
          Name: 'URL',
          Value: result.url,
        },
      ],
      Timestamp: new Date(result.timestamp),
    });
  }

  try {
    await cloudWatch.putMetricData({
      Namespace: config.cloudWatch.namespace,
      MetricData: metricData,
    }).promise();
    
    console.log(`Sent ${metricData.length} metrics to CloudWatch`);
  } catch (error) {
    console.error('Failed to send metrics to CloudWatch:', error.message);
  }
}

/**
 * Main monitoring function
 */
async function runMonitoring() {
  console.log(`Starting uptime monitoring at ${new Date().toISOString()}`);
  
  try {
    // Check all endpoints
    const results = await Promise.all(
      config.endpoints.map(endpoint => checkEndpoint(endpoint))
    );

    // Log results
    results.forEach(result => {
      const status = result.status === 'UP' ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.status} (${result.responseTime}ms)`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.statusCode && result.statusCode !== 200) {
        console.log(`   Status Code: ${result.statusCode}`);
      }
    });

    // Send metrics to CloudWatch
    await sendMetrics(results);

    // Check if any endpoints are down
    const downEndpoints = results.filter(r => r.status === 'DOWN');
    if (downEndpoints.length > 0) {
      console.error(`⚠️  ${downEndpoints.length} endpoint(s) are down!`);
      process.exit(1);
    } else {
      console.log('✅ All endpoints are healthy');
    }

  } catch (error) {
    console.error('Monitoring failed:', error.message);
    process.exit(1);
  }
}

// Run monitoring if this script is executed directly
if (require.main === module) {
  runMonitoring().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMonitoring, checkEndpoint, sendMetrics };