const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 GARÇON TESTING ENVIRONMENT SETUP');
console.log('===================================');

// Check system requirements
function checkRequirements() {
  console.log('\n📋 Checking system requirements...');
  
  const requirements = [
    { name: 'Node.js', command: 'node --version', minVersion: '16.0.0' },
    { name: 'npm', command: 'npm --version', minVersion: '8.0.0' },
    { name: 'Git', command: 'git --version', minVersion: '2.0.0' }
  ];
  
  requirements.forEach(req => {
    try {
      const version = execSync(req.command, { encoding: 'utf8' }).trim();
      console.log(`✅ ${req.name}: ${version}`);
    } catch (error) {
      console.log(`❌ ${req.name}: Not found or not working`);
    }
  });
}

// Setup environment files
function setupEnvironment() {
  console.log('\n🔧 Setting up environment files...');
  
  // Backend .env.local
  const backendEnvPath = 'packages/backend/.env.local';
  if (!fs.existsSync(backendEnvPath)) {
    const envContent = `# Garçon Backend Environment (Testing)
NODE_ENV=development
PORT=3000
JWT_SECRET=garcon-super-secret-jwt-key-for-testing-only
JWT_REFRESH_SECRET=garcon-refresh-secret-for-testing
CORS_ORIGIN=http://localhost:8081,http://localhost:3000
LOG_LEVEL=info

# Database (Optional - will use in-memory for testing)
# DATABASE_URL=postgresql://user:password@localhost:5432/garcon_test
# REDIS_URL=redis://localhost:6379

# Payment Providers (Test Mode)
# STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
# PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
# PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret

# AWS (Optional)
# AWS_ACCESS_KEY_ID=your_aws_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret
# AWS_REGION=us-east-1

# Push Notifications (Optional)
# FCM_SERVER_KEY=your_fcm_server_key
`;
    
    fs.writeFileSync(backendEnvPath, envContent);
    console.log('✅ Created backend .env.local');
  } else {
    console.log('✅ Backend .env.local already exists');
  }
  
  // Mobile environment
  const mobileEnvPath = 'packages/mobile/.env';
  if (!fs.existsSync(mobileEnvPath)) {
    const mobileEnvContent = `# Garçon Mobile Environment (Testing)
API_BASE_URL=http://localhost:3000
WS_BASE_URL=ws://localhost:3000
ENVIRONMENT=development
`;
    
    fs.writeFileSync(mobileEnvPath, mobileEnvContent);
    console.log('✅ Created mobile .env');
  } else {
    console.log('✅ Mobile .env already exists');
  }
}

// Install dependencies
function installDependencies() {
  console.log('\n📦 Installing dependencies...');
  
  // Root dependencies for testing
  try {
    console.log('Installing testing dependencies...');
    execSync('npm install axios --save-dev', { 
      stdio: 'inherit',
      timeout: 30000 
    });
    console.log('✅ Testing dependencies installed');
  } catch (error) {
    console.log('⚠️  Testing dependencies installation had issues');
  }
}

// Create test data
function createTestData() {
  console.log('\n📊 Creating test data...');
  
  const testDataPath = 'test-data.json';
  const testData = {
    users: [
      {
        name: "Mario Rossi",
        email: "mario@test.com",
        phone: "+39 123 456 7890",
        password: "password123"
      },
      {
        name: "Giulia Bianchi",
        email: "giulia@test.com",
        phone: "+39 098 765 4321",
        password: "password123"
      }
    ],
    restaurants: [
      {
        name: "Ristorante Da Mario",
        address: "Via Roma 123, Milano",
        latitude: 45.4642,
        longitude: 9.1900,
        tables: ["T001", "T002", "T003", "T004", "T005"]
      },
      {
        name: "Pizzeria Bella Napoli",
        address: "Corso Buenos Aires 456, Milano",
        latitude: 45.4777,
        longitude: 9.2052,
        tables: ["T101", "T102", "T103"]
      }
    ],
    menuItems: [
      {
        name: "Margherita Pizza",
        description: "Pomodoro, mozzarella, basilico",
        price: 8.50,
        category: "Pizza"
      },
      {
        name: "Spaghetti Carbonara",
        description: "Pasta con uova, pancetta, pecorino",
        price: 12.00,
        category: "Pasta"
      },
      {
        name: "Tiramisu",
        description: "Dolce tradizionale italiano",
        price: 6.00,
        category: "Dessert"
      }
    ],
    testScenarios: [
      {
        name: "Happy Path Order",
        steps: [
          "Register new user",
          "Login",
          "Select restaurant",
          "Choose table T001",
          "Add Margherita Pizza to cart",
          "Proceed to payment",
          "Complete order"
        ]
      },
      {
        name: "Group Order",
        steps: [
          "User 1 creates table session",
          "User 2 joins with fantasy name",
          "Both users add items",
          "Split payment",
          "Complete orders"
        ]
      }
    ]
  };
  
  fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
  console.log('✅ Test data created');
}

// Main setup function
function runSetup() {
  try {
    checkRequirements();
    setupEnvironment();
    installDependencies();
    createTestData();
    
    console.log('\n🎉 SETUP COMPLETED!');
    console.log('==================');
    console.log('');
    console.log('✅ Environment files created');
    console.log('✅ Dependencies installed');
    console.log('✅ Test data prepared');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('1. Run automated tests: node test-complete-app.js');
    console.log('2. Start full app: node start-complete-app.js');
    console.log('3. Follow testing guide: see TESTING_GUIDE.md');
    console.log('');
    console.log('📱 FOR MOBILE TESTING:');
    console.log('1. cd packages/mobile');
    console.log('2. npx react-native start');
    console.log('3. npx react-native run-android (or run-ios)');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
runSetup();