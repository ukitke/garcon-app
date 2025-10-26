const axios = require('axios');
const { execSync } = require('child_process');

console.log('🧪 RAILWAY DEPLOYMENT TESTER');
console.log('=============================');

async function getRailwayURL() {
  try {
    console.log('🔍 Getting Railway deployment URL...');
    const status = execSync('railway status --json', { encoding: 'utf8' });
    const statusData = JSON.parse(status);
    
    if (statusData.deployments && statusData.deployments.length > 0) {
      const latestDeployment = statusData.deployments[0];
      if (latestDeployment.url) {
        console.log(`✅ Found URL: ${latestDeployment.url}`);
        return latestDeployment.url;
      }
    }
    
    throw new Error('No deployment URL found');
  } catch (error) {
    console.error('❌ Could not get Railway URL:', error.message);
    console.log('💡 Make sure you are in a Railway project directory');
    console.log('💡 Run: railway status');
    return null;
  }
}

async function testEndpoint(url, endpoint, expectedStatus = 200) {
  try {
    console.log(`🔗 Testing ${endpoint}...`);
    const response = await axios.get(`${url}${endpoint}`, { 
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });
    
    if (response.status === expectedStatus) {
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      return { success: true, data: response.data, status: response.status };
    } else {
      console.log(`⚠️ ${endpoint} - Expected: ${expectedStatus}, Got: ${response.status}`);
      return { success: false, data: response.data, status: response.status };
    }
  } catch (error) {
    console.log(`❌ ${endpoint} - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testWebSocket(url) {
  try {
    console.log('🔌 Testing WebSocket connection...');
    
    // Simple WebSocket test using socket.io-client if available
    try {
      const io = require('socket.io-client');
      const socket = io(url, { timeout: 5000 });
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          console.log('⚠️ WebSocket - Connection timeout');
          resolve({ success: false, error: 'Connection timeout' });
        }, 5000);
        
        socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket - Connected successfully');
          socket.disconnect();
          resolve({ success: true });
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.log(`❌ WebSocket - Connection error: ${error.message}`);
          resolve({ success: false, error: error.message });
        });
      });
    } catch (error) {
      console.log('⚠️ WebSocket - socket.io-client not available, skipping test');
      return { success: false, error: 'socket.io-client not installed' };
    }
  } catch (error) {
    console.log(`❌ WebSocket test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testDatabase(url) {
  try {
    console.log('🗄️ Testing database connection...');
    const result = await testEndpoint(url, '/api/v1/test-db');
    
    if (result.success) {
      console.log('✅ Database - Connection successful');
      if (result.data && result.data.data) {
        console.log(`📊 Database info:`, result.data.data);
      }
    } else {
      console.log('⚠️ Database - Connection failed or not configured');
    }
    
    return result;
  } catch (error) {
    console.log(`❌ Database test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function performLoadTest(url) {
  console.log('⚡ Performing basic load test...');
  
  const requests = [];
  const startTime = Date.now();
  
  // Send 10 concurrent requests
  for (let i = 0; i < 10; i++) {
    requests.push(
      axios.get(`${url}/health`, { timeout: 10000 })
        .then(response => ({ success: true, time: Date.now() - startTime, status: response.status }))
        .catch(error => ({ success: false, error: error.message }))
    );
  }
  
  try {
    const results = await Promise.all(requests);
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`📊 Load test results:`);
    console.log(`   ✅ Successful: ${successful}/${results.length}`);
    console.log(`   ❌ Failed: ${failed}/${results.length}`);
    
    if (successful > 0) {
      const avgTime = results
        .filter(r => r.success && r.time)
        .reduce((sum, r) => sum + r.time, 0) / successful;
      console.log(`   ⏱️ Average response time: ${avgTime.toFixed(2)}ms`);
    }
    
    return { successful, failed, total: results.length };
  } catch (error) {
    console.log(`❌ Load test failed: ${error.message}`);
    return { successful: 0, failed: 10, total: 10 };
  }
}

async function runAllTests() {
  const url = await getRailwayURL();
  if (!url) {
    console.log('❌ Cannot proceed without deployment URL');
    return;
  }
  
  console.log(`\n🎯 Testing deployment at: ${url}`);
  console.log('=' .repeat(50));
  
  const results = {
    health: await testEndpoint(url, '/health'),
    root: await testEndpoint(url, '/'),
    api: await testEndpoint(url, '/api/v1'),
    test: await testEndpoint(url, '/api/v1/test'),
    notFound: await testEndpoint(url, '/nonexistent', 404),
    database: await testDatabase(url),
    websocket: await testWebSocket(url),
    loadTest: await performLoadTest(url)
  };
  
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(30));
  
  let passed = 0;
  let total = 0;
  
  Object.entries(results).forEach(([test, result]) => {
    total++;
    if (result.success || (test === 'notFound' && result.status === 404)) {
      passed++;
      console.log(`✅ ${test.toUpperCase()}: PASSED`);
    } else {
      console.log(`❌ ${test.toUpperCase()}: FAILED`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  });
  
  console.log('\n' + '=' .repeat(30));
  console.log(`📈 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Your deployment is working correctly.');
  } else if (passed >= total * 0.8) {
    console.log('⚠️ Most tests passed. Check failed tests above.');
  } else {
    console.log('❌ Many tests failed. Check your deployment configuration.');
  }
  
  console.log('\n🔧 NEXT STEPS:');
  console.log(`• 🌐 Your app is live at: ${url}`);
  console.log(`• 🏥 Health check: ${url}/health`);
  console.log(`• 📋 API info: ${url}/api/v1`);
  console.log('• 📱 Update your mobile app to use this URL');
  console.log('• 🔧 Configure custom domain if needed');
  console.log('• 📊 Set up monitoring and alerts');
  
  console.log('\n📞 SUPPORT:');
  console.log('• Railway logs: railway logs');
  console.log('• Railway status: railway status');
  console.log('• Railway docs: https://docs.railway.app');
}

// Install socket.io-client if not present for WebSocket testing
try {
  require('socket.io-client');
} catch (error) {
  console.log('📦 Installing socket.io-client for WebSocket testing...');
  try {
    execSync('npm install socket.io-client', { stdio: 'inherit' });
  } catch (installError) {
    console.log('⚠️ Could not install socket.io-client, WebSocket test will be skipped');
  }
}

runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});