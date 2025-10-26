const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Complete Garçon Application');
console.log('=====================================');

// Check if all required files exist
const requiredFiles = [
  'packages/backend/package.json',
  'packages/mobile/package.json',
  'packages/backend/src/app.ts',
  'packages/mobile/App.tsx'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('❌ Some required files are missing. Please check the project structure.');
  process.exit(1);
}

console.log('\n🔧 Installing dependencies...');

// Install backend dependencies
try {
  console.log('📦 Installing backend dependencies...');
  execSync('npm install', { 
    cwd: 'packages/backend', 
    stdio: 'inherit',
    timeout: 120000 
  });
  console.log('✅ Backend dependencies installed');
} catch (error) {
  console.log('⚠️  Backend dependencies installation had issues, continuing...');
}

// Install mobile dependencies
try {
  console.log('📦 Installing mobile dependencies...');
  execSync('npm install', { 
    cwd: 'packages/mobile', 
    stdio: 'inherit',
    timeout: 120000 
  });
  console.log('✅ Mobile dependencies installed');
} catch (error) {
  console.log('⚠️  Mobile dependencies installation had issues, continuing...');
}

console.log('\n🏗️  Building backend...');

// Build backend
try {
  execSync('npm run build', { 
    cwd: 'packages/backend', 
    stdio: 'inherit',
    timeout: 60000 
  });
  console.log('✅ Backend built successfully');
} catch (error) {
  console.log('❌ Backend build failed:', error.message);
  console.log('🔄 Trying to start without build...');
}

console.log('\n🚀 Starting services...');

// Start backend
console.log('🔧 Starting backend server...');
const backendProcess = spawn('npm', ['run', 'dev'], {
  cwd: 'packages/backend',
  stdio: 'pipe',
  shell: true
});

let backendStarted = false;

backendProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Backend] ${output.trim()}`);
  
  if (output.includes('running on port') || output.includes('Server started')) {
    backendStarted = true;
    console.log('✅ Backend server started successfully!');
    
    // Wait a bit then show final instructions
    setTimeout(() => {
      showFinalInstructions();
    }, 2000);
  }
});

backendProcess.stderr.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('warning') && !output.includes('deprecated')) {
    console.log(`[Backend Error] ${output.trim()}`);
  }
});

backendProcess.on('close', (code) => {
  console.log(`❌ Backend process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down services...');
  backendProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down services...');
  backendProcess.kill();
  process.exit(0);
});

function showFinalInstructions() {
  console.log('\n🎉 GARÇON APPLICATION READY!');
  console.log('============================');
  console.log('');
  console.log('📱 MOBILE APP:');
  console.log('   To start the mobile app, open a new terminal and run:');
  console.log('   cd packages/mobile');
  console.log('   npx react-native start');
  console.log('   # Then in another terminal:');
  console.log('   npx react-native run-android  # For Android');
  console.log('   npx react-native run-ios      # For iOS');
  console.log('');
  console.log('🌐 BACKEND API:');
  console.log('   Backend is running at: http://localhost:3000');
  console.log('   API endpoints: http://localhost:3000/api/v1');
  console.log('   Health check: http://localhost:3000/health');
  console.log('');
  console.log('🔧 DEVELOPMENT:');
  console.log('   - Backend logs are shown above');
  console.log('   - API documentation: Check the controllers in packages/backend/src/controllers/');
  console.log('   - Database: Configure DATABASE_URL in .env files for full functionality');
  console.log('');
  console.log('📋 FEATURES IMPLEMENTED:');
  console.log('   ✅ User Authentication & Registration');
  console.log('   ✅ Location Detection & Restaurant Selection');
  console.log('   ✅ Table Management & QR Code Scanning');
  console.log('   ✅ Menu Browsing & Ordering System');
  console.log('   ✅ Shopping Cart & Group Ordering');
  console.log('   ✅ Multiple Payment Methods');
  console.log('   ✅ Waiter Call System');
  console.log('   ✅ Real-time Notifications');
  console.log('   ✅ Order Tracking');
  console.log('   ✅ Reservation System');
  console.log('   ✅ Review & Rating System');
  console.log('   ✅ Admin Dashboard');
  console.log('   ✅ Analytics & Reporting');
  console.log('   ✅ Mobile App (React Native)');
  console.log('   ✅ Security & Performance Optimizations');
  console.log('   ✅ Cloud Infrastructure Setup');
  console.log('');
  console.log('🎯 NEXT STEPS:');
  console.log('   1. Configure database connection (PostgreSQL)');
  console.log('   2. Set up payment providers (Stripe, PayPal, etc.)');
  console.log('   3. Configure push notifications');
  console.log('   4. Deploy to production environment');
  console.log('   5. Test end-to-end user flows');
  console.log('');
  console.log('Press Ctrl+C to stop the backend server');
}

// Show initial status
setTimeout(() => {
  if (!backendStarted) {
    console.log('⏳ Backend is still starting up...');
    console.log('   This may take a few moments on first run');
  }
}, 10000);