#!/usr/bin/env node

/**
 * Integration tests for third-party services and external dependencies
 * These tests verify that all external integrations are working correctly
 */

const https = require('https');
const http = require('http');
const { CloudWatch, RDS, ElastiCache, S3 } = require('aws-sdk');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'https://api.garcon-app.com',
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    rdsInstanceId: process.env.RDS_INSTANCE_ID || 'garcon-app-db',
    elasticacheClusterId: process.env.ELASTICACHE_CLUSTER_ID || 'garcon-app-redis',
    s3BucketName: process.env.S3_BUCKET_NAME,
  },
  timeout: 30000,
};

// Initialize AWS clients
const cloudWatch = new CloudWatch({ region: config.aws.region });
const rds = new RDS({ region: config.aws.region });
const elasticache = new ElastiCache({ region: config.aws.region });
const s3 = new S3({ region: config.aws.region });

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

/**
 * Execute a test and track results
 */
async function executeTest(testName, testFunction) {
  console.log(`\n🔍 Testing: ${testName}`);
  
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
    });
  } catch (error) {
    console.log(`❌ FAILED: ${testName} - ${error.message}`);
    results.failed++;
    results.tests.push({
      name: testName,
      status: 'FAILED',
      error: error.message,
    });
  }
}

/**
 * Test: RDS Database connectivity and status
 */
async function testRDSDatabase() {
  try {
    const response = await rds.describeDBInstances({
      DBInstanceIdentifier: config.aws.rdsInstanceId,
    }).promise();
    
    const dbInstance = response.DBInstances[0];
    
    if (!dbInstance) {
      throw new Error('RDS instance not found');
    }
    
    if (dbInstance.DBInstanceStatus !== 'available') {
      throw new Error(`RDS instance status is ${dbInstance.DBInstanceStatus}, expected 'available'`);
    }
    
    console.log(`   📊 RDS Status: ${dbInstance.DBInstanceStatus}`);
    console.log(`   💾 Engine: ${dbInstance.Engine} ${dbInstance.EngineVersion}`);
    console.log(`   🏗️  Instance Class: ${dbInstance.DBInstanceClass}`);
    console.log(`   📈 Storage: ${dbInstance.AllocatedStorage}GB`);
    
  } catch (error) {
    throw new Error(`RDS check failed: ${error.message}`);
  }
}

/**
 * Test: ElastiCache Redis connectivity and status
 */
async function testElastiCacheRedis() {
  try {
    const response = await elasticache.describeCacheClusters({
      CacheClusterId: config.aws.elasticacheClusterId,
      ShowCacheNodeInfo: true,
    }).promise();
    
    const cluster = response.CacheClusters[0];
    
    if (!cluster) {
      throw new Error('ElastiCache cluster not found');
    }
    
    if (cluster.CacheClusterStatus !== 'available') {
      throw new Error(`ElastiCache status is ${cluster.CacheClusterStatus}, expected 'available'`);
    }
    
    console.log(`   📊 Redis Status: ${cluster.CacheClusterStatus}`);
    console.log(`   🏗️  Node Type: ${cluster.CacheNodeType}`);
    console.log(`   🔢 Nodes: ${cluster.NumCacheNodes}`);
    console.log(`   🌐 Engine: ${cluster.Engine} ${cluster.EngineVersion}`);
    
  } catch (error) {
    throw new Error(`ElastiCache check failed: ${error.message}`);
  }
}

/**
 * Test: S3 bucket accessibility
 */
async function testS3Bucket() {
  if (!config.aws.s3BucketName) {
    console.log('   ⏭️  S3 bucket name not configured, skipping test');
    return;
  }
  
  try {
    // Check if bucket exists and is accessible
    await s3.headBucket({ Bucket: config.aws.s3BucketName }).promise();
    
    // Get bucket location
    const location = await s3.getBucketLocation({ Bucket: config.aws.s3BucketName }).promise();
    
    // Check bucket versioning
    const versioning = await s3.getBucketVersioning({ Bucket: config.aws.s3BucketName }).promise();
    
    console.log(`   📍 S3 Bucket: ${config.aws.s3BucketName}`);
    console.log(`   🌍 Region: ${location.LocationConstraint || 'us-east-1'}`);
    console.log(`   📝 Versioning: ${versioning.Status || 'Disabled'}`);
    
  } catch (error) {
    throw new Error(`S3 check failed: ${error.message}`);
  }
}

/**
 * Test: CloudWatch metrics and logs
 */
async function testCloudWatchMetrics() {
  try {
    // Check if custom metrics are being sent
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 10 * 60 * 1000); // 10 minutes ago
    
    const response = await cloudWatch.getMetricStatistics({
      Namespace: 'Garcon/Application',
      MetricName: 'ApiRequestCount',
      StartTime: startTime,
      EndTime: endTime,
      Period: 300,
      Statistics: ['Sum'],
    }).promise();
    
    console.log(`   📊 Metric Data Points: ${response.Datapoints.length}`);
    
    if (response.Datapoints.length > 0) {
      const latestDatapoint = response.Datapoints[response.Datapoints.length - 1];
      console.log(`   📈 Latest Request Count: ${latestDatapoint.Sum}`);
    }
    
  } catch (error) {
    throw new Error(`CloudWatch check failed: ${error.message}`);
  }
}

/**
 * Test: Load balancer health
 */
async function testLoadBalancerHealth() {
  try {
    // Get load balancer metrics
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    const response = await cloudWatch.getMetricStatistics({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'HealthyHostCount',
      StartTime: startTime,
      EndTime: endTime,
      Period: 300,
      Statistics: ['Average'],
      Dimensions: [
        {
          Name: 'LoadBalancer',
          Value: process.env.LOAD_BALANCER_ARN_SUFFIX || 'unknown',
        },
      ],
    }).promise();
    
    if (response.Datapoints.length > 0) {
      const latestDatapoint = response.Datapoints[response.Datapoints.length - 1];
      console.log(`   🏥 Healthy Hosts: ${latestDatapoint.Average}`);
      
      if (latestDatapoint.Average < 1) {
        throw new Error('No healthy hosts detected');
      }
    } else {
      console.log('   ⚠️  No load balancer metrics found (may be expected for new deployment)');
    }
    
  } catch (error) {
    throw new Error(`Load balancer check failed: ${error.message}`);
  }
}

/**
 * Test: ECS service health
 */
async function testECSServiceHealth() {
  try {
    const { ECS } = require('aws-sdk');
    const ecs = new ECS({ region: config.aws.region });
    
    const clusterName = process.env.ECS_CLUSTER_NAME || 'garcon-app-cluster';
    const serviceName = process.env.ECS_SERVICE_NAME || 'garcon-app-backend';
    
    const response = await ecs.describeServices({
      cluster: clusterName,
      services: [serviceName],
    }).promise();
    
    const service = response.services[0];
    
    if (!service) {
      throw new Error('ECS service not found');
    }
    
    console.log(`   📊 Service Status: ${service.status}`);
    console.log(`   🎯 Desired Tasks: ${service.desiredCount}`);
    console.log(`   ✅ Running Tasks: ${service.runningCount}`);
    console.log(`   ⏳ Pending Tasks: ${service.pendingCount}`);
    
    if (service.runningCount < service.desiredCount) {
      throw new Error(`Only ${service.runningCount}/${service.desiredCount} tasks are running`);
    }
    
  } catch (error) {
    if (error.code === 'ClusterNotFoundException' || error.code === 'ServiceNotFoundException') {
      console.log('   ⏭️  ECS service not found (may be expected in some environments)');
    } else {
      throw new Error(`ECS check failed: ${error.message}`);
    }
  }
}

/**
 * Test: DNS resolution
 */
async function testDNSResolution() {
  const dns = require('dns').promises;
  
  try {
    const url = new URL(config.baseUrl);
    const addresses = await dns.resolve4(url.hostname);
    
    console.log(`   🌐 DNS Resolution: ${url.hostname} -> ${addresses.join(', ')}`);
    
    if (addresses.length === 0) {
      throw new Error('No IP addresses resolved');
    }
    
  } catch (error) {
    throw new Error(`DNS resolution failed: ${error.message}`);
  }
}

/**
 * Test: SSL certificate validity
 */
async function testSSLCertificate() {
  if (!config.baseUrl.startsWith('https://')) {
    console.log('   ⏭️  Not HTTPS, skipping SSL test');
    return;
  }
  
  return new Promise((resolve, reject) => {
    const url = new URL(config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      method: 'GET',
      path: '/health',
    };
    
    const req = https.request(options, (res) => {
      const cert = res.connection.getPeerCertificate();
      
      if (!cert || Object.keys(cert).length === 0) {
        reject(new Error('No SSL certificate found'));
        return;
      }
      
      const now = new Date();
      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      
      console.log(`   📜 Certificate Subject: ${cert.subject.CN}`);
      console.log(`   📅 Valid From: ${validFrom.toISOString()}`);
      console.log(`   📅 Valid To: ${validTo.toISOString()}`);
      console.log(`   🏢 Issuer: ${cert.issuer.O}`);
      
      if (now < validFrom) {
        reject(new Error('SSL certificate is not yet valid'));
        return;
      }
      
      if (now > validTo) {
        reject(new Error('SSL certificate has expired'));
        return;
      }
      
      const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
      console.log(`   ⏰ Days until expiry: ${daysUntilExpiry}`);
      
      if (daysUntilExpiry < 30) {
        console.log('   ⚠️  Certificate expires in less than 30 days');
      }
      
      resolve();
    });
    
    req.on('error', (error) => {
      reject(new Error(`SSL check failed: ${error.message}`));
    });
    
    req.setTimeout(config.timeout, () => {
      req.destroy();
      reject(new Error('SSL check timeout'));
    });
    
    req.end();
  });
}

/**
 * Test: Application performance under load
 */
async function testPerformanceBaseline() {
  const numRequests = 10;
  const concurrency = 3;
  
  console.log(`   🏃 Running ${numRequests} requests with concurrency ${concurrency}`);
  
  const makeRequest = () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const url = new URL(`${config.baseUrl}/health`);
      
      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'GET',
      }, (res) => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          responseTime,
        });
      });
      
      req.on('error', reject);
      req.setTimeout(config.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  };
  
  const results = [];
  
  // Run requests in batches
  for (let i = 0; i < numRequests; i += concurrency) {
    const batch = [];
    for (let j = 0; j < concurrency && i + j < numRequests; j++) {
      batch.push(makeRequest());
    }
    
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
  }
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 200);
  const responseTimes = successful.map(r => r.value.responseTime);
  
  if (successful.length === 0) {
    throw new Error('No successful requests');
  }
  
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxResponseTime = Math.max(...responseTimes);
  const minResponseTime = Math.min(...responseTimes);
  
  console.log(`   📊 Successful Requests: ${successful.length}/${numRequests}`);
  console.log(`   ⏱️  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   ⚡ Min Response Time: ${minResponseTime}ms`);
  console.log(`   🐌 Max Response Time: ${maxResponseTime}ms`);
  
  if (avgResponseTime > 2000) {
    throw new Error(`Average response time too high: ${avgResponseTime.toFixed(2)}ms`);
  }
  
  if (successful.length < numRequests * 0.95) {
    throw new Error(`Success rate too low: ${(successful.length / numRequests * 100).toFixed(1)}%`);
  }
}

/**
 * Main integration test runner
 */
async function runIntegrationTests() {
  console.log('🔗 Starting Garçon App Integration Tests');
  console.log(`📍 Target URL: ${config.baseUrl}`);
  console.log(`🌍 AWS Region: ${config.aws.region}`);
  
  const startTime = Date.now();
  
  // Run all integration tests
  await executeTest('RDS Database Status', testRDSDatabase);
  await executeTest('ElastiCache Redis Status', testElastiCacheRedis);
  await executeTest('S3 Bucket Access', testS3Bucket);
  await executeTest('CloudWatch Metrics', testCloudWatchMetrics);
  await executeTest('Load Balancer Health', testLoadBalancerHealth);
  await executeTest('ECS Service Health', testECSServiceHealth);
  await executeTest('DNS Resolution', testDNSResolution);
  await executeTest('SSL Certificate', testSSLCertificate);
  await executeTest('Performance Baseline', testPerformanceBaseline);
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  console.log('\n📊 Integration Test Summary');
  console.log('============================');
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
    console.log('\n🎉 All integration tests passed!');
    process.exit(0);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests,
  executeTest,
};