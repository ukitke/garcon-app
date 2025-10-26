#!/usr/bin/env node

/**
 * Comprehensive deployment validation script
 * This script runs all validation checks after a production deployment
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'https://api.garcon-app.com',
  timeout: 300000, // 5 minutes total timeout
  waitBetweenTests: 5000, // 5 seconds between test suites
};

// Test results
const results = {
  suites: [],
  totalPassed: 0,
  totalFailed: 0,
  startTime: Date.now(),
};

/**
 * Run a test suite (external script)
 */
async function runTestSuite(suiteName, scriptPath, args = []) {
  console.log(`\n🚀 Running ${suiteName}...`);
  console.log(`📄 Script: ${scriptPath}`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'pipe',
      env: { ...process.env },
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;
      
      const result = {
        name: suiteName,
        success,
        code,
        duration,
        stdout,
        stderr,
      };
      
      results.suites.push(result);
      
      if (success) {
        console.log(`✅ ${suiteName} completed successfully (${duration}ms)`);
        results.totalPassed++;
      } else {
        console.log(`❌ ${suiteName} failed with code ${code} (${duration}ms)`);
        results.totalFailed++;
      }
      
      resolve(result);
    });
    
    // Set timeout
    setTimeout(() => {
      child.kill('SIGTERM');
      console.log(`⏰ ${suiteName} timed out`);
    }, config.timeout);
  });
}

/**
 * Wait for application to be ready
 */
async function waitForApplication() {
  console.log('⏳ Waiting for application to be ready...');
  
  const maxAttempts = 30;
  const delay = 10000; // 10 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const https = require('https');
      const url = new URL(`${config.baseUrl}/health`);
      
      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: url.hostname,
          port: 443,
          path: url.pathname,
          method: 'GET',
          timeout: 10000,
        }, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        
        req.end();
      });
      
      console.log(`✅ Application is ready (attempt ${attempt}/${maxAttempts})`);
      return;
      
    } catch (error) {
      console.log(`⏳ Attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      
      if (attempt === maxAttempts) {
        throw new Error('Application failed to become ready within timeout');
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Check deployment prerequisites
 */
async function checkPrerequisites() {
  console.log('🔍 Checking deployment prerequisites...');
  
  const required = [
    'API_URL',
    'AWS_REGION',
  ];
  
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ Prerequisites check passed');
}

/**
 * Generate deployment report
 */
function generateReport() {
  const totalDuration = Date.now() - results.startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 DEPLOYMENT VALIDATION REPORT');
  console.log('='.repeat(60));
  
  console.log(`🕐 Start Time: ${new Date(results.startTime).toISOString()}`);
  console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`🎯 Target URL: ${config.baseUrl}`);
  
  console.log('\n📊 Test Suite Results:');
  console.log('-'.repeat(40));
  
  results.suites.forEach(suite => {
    const status = suite.success ? '✅' : '❌';
    const duration = (suite.duration / 1000).toFixed(2);
    console.log(`${status} ${suite.name} (${duration}s)`);
    
    if (!suite.success && suite.stderr) {
      console.log(`   Error: ${suite.stderr.split('\n')[0]}`);
    }
  });
  
  console.log('\n📈 Summary:');
  console.log('-'.repeat(20));
  console.log(`✅ Passed: ${results.totalPassed}`);
  console.log(`❌ Failed: ${results.totalFailed}`);
  console.log(`📊 Total: ${results.suites.length}`);
  
  const successRate = (results.totalPassed / results.suites.length * 100).toFixed(1);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (results.totalFailed === 0) {
    console.log('\n🎉 DEPLOYMENT VALIDATION SUCCESSFUL!');
    console.log('✅ All tests passed. The application is ready for production use.');
  } else {
    console.log('\n❌ DEPLOYMENT VALIDATION FAILED!');
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  
  console.log('='.repeat(60));
}

/**
 * Main deployment validation function
 */
async function runDeploymentValidation() {
  console.log('🚀 Starting Garçon App Deployment Validation');
  console.log(`📅 ${new Date().toISOString()}`);
  
  try {
    // Check prerequisites
    await checkPrerequisites();
    
    // Wait for application to be ready
    await waitForApplication();
    
    // Run smoke tests
    await runTestSuite(
      'Smoke Tests',
      path.join(__dirname, 'smoke-tests.js')
    );
    
    // Wait between test suites
    console.log(`⏳ Waiting ${config.waitBetweenTests}ms before next test suite...`);
    await new Promise(resolve => setTimeout(resolve, config.waitBetweenTests));
    
    // Run integration tests
    await runTestSuite(
      'Integration Tests',
      path.join(__dirname, 'integration-tests.js')
    );
    
    // Wait between test suites
    console.log(`⏳ Waiting ${config.waitBetweenTests}ms before next test suite...`);
    await new Promise(resolve => setTimeout(resolve, config.waitBetweenTests));
    
    // Run uptime monitoring check
    await runTestSuite(
      'Uptime Monitoring',
      path.join(__dirname, '../monitoring/uptime-monitor.js')
    );
    
  } catch (error) {
    console.error(`💥 Validation failed: ${error.message}`);
    results.totalFailed++;
  } finally {
    // Generate and display report
    generateReport();
    
    // Exit with appropriate code
    process.exit(results.totalFailed > 0 ? 1 : 0);
  }
}

/**
 * Handle process signals
 */
process.on('SIGINT', () => {
  console.log('\n⚠️  Validation interrupted by user');
  generateReport();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Validation terminated');
  generateReport();
  process.exit(1);
});

// Run validation if this script is executed directly
if (require.main === module) {
  runDeploymentValidation().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runDeploymentValidation,
  runTestSuite,
  waitForApplication,
};