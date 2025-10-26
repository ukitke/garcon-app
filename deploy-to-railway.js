const { execSync, spawn } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚂 GARÇON - RAILWAY DEPLOYMENT SCRIPT');
console.log('=====================================');

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`❓ ${question} `, resolve);
  });
}

function execCommand(command, options = {}) {
  try {
    console.log(`🔧 Executing: ${command}`);
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}

function checkPrerequisites() {
  console.log('\n📋 Checking prerequisites...');
  
  // Check if Railway CLI is installed
  try {
    execCommand('railway --version', { stdio: 'pipe' });
    console.log('✅ Railway CLI is installed');
  } catch (error) {
    console.log('❌ Railway CLI not found');
    console.log('📦 Installing Railway CLI...');
    execCommand('npm install -g @railway/cli');
    console.log('✅ Railway CLI installed');
  }
  
  // Check if user is logged in
  try {
    execCommand('railway whoami', { stdio: 'pipe' });
    console.log('✅ Logged in to Railway');
  } catch (error) {
    console.log('❌ Not logged in to Railway');
    console.log('🔐 Please login to Railway...');
    execCommand('railway login');
  }
  
  // Check required files
  const requiredFiles = [
    'railway.json',
    'Dockerfile',
    '.railwayignore',
    'packages/backend/src/index-railway-full.js'
  ];
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      throw new Error(`Required file ${file} is missing`);
    }
  });
}

async function setupProject() {
  console.log('\n🚀 Setting up Railway project...');
  
  const projectName = await askQuestion('Project name (default: garcon-backend):');
  const finalProjectName = projectName || 'garcon-backend';
  
  try {
    // Check if already in a Railway project
    execCommand('railway status', { stdio: 'pipe' });
    console.log('✅ Already connected to a Railway project');
    
    const useExisting = await askQuestion('Use existing project? (y/n):');
    if (useExisting.toLowerCase() !== 'y') {
      console.log('🔄 Creating new project...');
      execCommand(`railway new ${finalProjectName}`);
    }
  } catch (error) {
    console.log('🆕 Creating new Railway project...');
    execCommand(`railway new ${finalProjectName}`);
  }
}

async function configureEnvironment() {
  console.log('\n⚙️ Configuring environment variables...');
  
  const envVars = {
    'NODE_ENV': 'production',
    'PORT': '3000',
    'JWT_SECRET': '',
    'CORS_ORIGIN': '*'
  };
  
  // Generate JWT secret if not provided
  if (!envVars.JWT_SECRET) {
    const crypto = require('crypto');
    envVars.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.log('🔑 Generated JWT secret');
  }
  
  console.log('🔧 Setting environment variables...');
  for (const [key, value] of Object.entries(envVars)) {
    try {
      execCommand(`railway variables set ${key}="${value}"`, { stdio: 'pipe' });
      console.log(`✅ Set ${key}`);
    } catch (error) {
      console.log(`⚠️ Failed to set ${key}`);
    }
  }
  
  // Ask about database
  const addDatabase = await askQuestion('Add PostgreSQL database? (y/n):');
  if (addDatabase.toLowerCase() === 'y') {
    try {
      console.log('🗄️ Adding PostgreSQL...');
      execCommand('railway add postgresql');
      console.log('✅ PostgreSQL added');
    } catch (error) {
      console.log('⚠️ Failed to add PostgreSQL (might already exist)');
    }
  }
  
  // Ask about additional environment variables
  const addMoreVars = await askQuestion('Add more environment variables? (y/n):');
  if (addMoreVars.toLowerCase() === 'y') {
    await addCustomEnvironmentVariables();
  }
}

async function addCustomEnvironmentVariables() {
  console.log('\n🔧 Adding custom environment variables...');
  console.log('Enter variables in format KEY=VALUE (empty line to finish):');
  
  while (true) {
    const input = await askQuestion('Variable (KEY=VALUE):');
    if (!input.trim()) break;
    
    if (input.includes('=')) {
      const [key, ...valueParts] = input.split('=');
      const value = valueParts.join('=');
      
      try {
        execCommand(`railway variables set ${key}="${value}"`, { stdio: 'pipe' });
        console.log(`✅ Set ${key}`);
      } catch (error) {
        console.log(`❌ Failed to set ${key}`);
      }
    } else {
      console.log('❌ Invalid format. Use KEY=VALUE');
    }
  }
}

async function deployApplication() {
  console.log('\n🚀 Deploying application...');
  
  // Show current variables
  console.log('📋 Current environment variables:');
  try {
    execCommand('railway variables');
  } catch (error) {
    console.log('⚠️ Could not fetch variables');
  }
  
  const confirmDeploy = await askQuestion('Proceed with deployment? (y/n):');
  if (confirmDeploy.toLowerCase() !== 'y') {
    console.log('❌ Deployment cancelled');
    return false;
  }
  
  console.log('🔨 Starting deployment...');
  console.log('This may take several minutes...');
  
  try {
    execCommand('railway up --detach');
    console.log('✅ Deployment started successfully');
    return true;
  } catch (error) {
    console.log('❌ Deployment failed');
    throw error;
  }
}

async function monitorDeployment() {
  console.log('\n📊 Monitoring deployment...');
  
  console.log('🔍 Checking deployment status...');
  
  // Wait a bit for deployment to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    execCommand('railway status');
  } catch (error) {
    console.log('⚠️ Could not get status');
  }
  
  const watchLogs = await askQuestion('Watch deployment logs? (y/n):');
  if (watchLogs.toLowerCase() === 'y') {
    console.log('📝 Watching logs (Ctrl+C to stop):');
    try {
      execCommand('railway logs --follow');
    } catch (error) {
      console.log('⚠️ Log watching stopped');
    }
  }
}

async function testDeployment() {
  console.log('\n🧪 Testing deployment...');
  
  try {
    // Get the deployment URL
    const status = execSync('railway status --json', { encoding: 'utf8' });
    const statusData = JSON.parse(status);
    
    if (statusData.deployments && statusData.deployments.length > 0) {
      const latestDeployment = statusData.deployments[0];
      if (latestDeployment.url) {
        const url = latestDeployment.url;
        console.log(`🌐 Application URL: ${url}`);
        
        // Test health endpoint
        console.log('🏥 Testing health endpoint...');
        const axios = require('axios');
        
        try {
          const response = await axios.get(`${url}/health`, { timeout: 10000 });
          console.log('✅ Health check passed');
          console.log('📊 Health data:', JSON.stringify(response.data, null, 2));
        } catch (error) {
          console.log('❌ Health check failed');
          console.log('Error:', error.message);
        }
        
        // Test API endpoint
        console.log('📋 Testing API endpoint...');
        try {
          const response = await axios.get(`${url}/api/v1`, { timeout: 10000 });
          console.log('✅ API endpoint working');
          console.log('📋 API info:', JSON.stringify(response.data, null, 2));
        } catch (error) {
          console.log('❌ API endpoint failed');
          console.log('Error:', error.message);
        }
        
      } else {
        console.log('⚠️ No URL found in deployment status');
      }
    } else {
      console.log('⚠️ No deployments found');
    }
  } catch (error) {
    console.log('❌ Could not test deployment');
    console.log('Error:', error.message);
  }
}

async function showNextSteps() {
  console.log('\n🎉 DEPLOYMENT COMPLETED!');
  console.log('========================');
  
  console.log('\n📋 Next Steps:');
  console.log('1. 🌐 Check your application URL');
  console.log('2. 🧪 Test all endpoints');
  console.log('3. 📱 Update mobile app API URL');
  console.log('4. 🔧 Configure custom domain (optional)');
  console.log('5. 📊 Set up monitoring and alerts');
  
  console.log('\n🔧 Useful Commands:');
  console.log('• railway logs          - View logs');
  console.log('• railway status        - Check status');
  console.log('• railway variables     - View env vars');
  console.log('• railway restart       - Restart service');
  console.log('• railway shell         - Connect to container');
  
  console.log('\n📞 Support:');
  console.log('• Railway Docs: https://docs.railway.app');
  console.log('• Railway Discord: https://discord.gg/railway');
  console.log('• Health Check: [YOUR_URL]/health');
  console.log('• API Info: [YOUR_URL]/api/v1');
}

async function main() {
  try {
    checkPrerequisites();
    await setupProject();
    await configureEnvironment();
    
    const deployed = await deployApplication();
    if (deployed) {
      await monitorDeployment();
      await testDeployment();
      await showNextSteps();
    }
    
  } catch (error) {
    console.error('\n💥 Deployment failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check Railway CLI is installed and updated');
    console.log('2. Verify you are logged in: railway whoami');
    console.log('3. Check project status: railway status');
    console.log('4. View logs: railway logs');
    console.log('5. Check environment variables: railway variables');
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Install axios if not present for testing
try {
  require('axios');
} catch (error) {
  console.log('📦 Installing axios for testing...');
  execSync('npm install axios', { stdio: 'inherit' });
}

main();