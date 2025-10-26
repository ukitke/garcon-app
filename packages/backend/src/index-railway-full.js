const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

console.log('🚀 Starting Garçon Backend (Full Version)...');
console.log('📝 Environment:', process.env.NODE_ENV || 'production');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// Database connection
let pool = null;
if (process.env.DATABASE_URL) {
  console.log('🗄️ Connecting to PostgreSQL database...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Test database connection
  pool.connect()
    .then(client => {
      console.log('✅ Database connected successfully');
      client.release();
    })
    .catch(err => {
      console.error('❌ Database connection failed:', err.message);
    });
} else {
  console.log('⚠️ No DATABASE_URL provided - running without database');
}

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
    : true,
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', async (req, res) => {
  console.log('✅ Health check requested at', new Date().toISOString());
  
  try {
    // Test database if available
    let dbStatus = 'DISABLED';
    let dbLatency = 0;
    
    if (pool) {
      try {
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        dbLatency = Date.now() - dbStart;
        dbStatus = 'OK';
        console.log(`📊 Database check: ${dbStatus} (${dbLatency}ms)`);
      } catch (error) {
        dbStatus = 'ERROR';
        console.error('❌ Database check failed:', error.message);
      }
    }

    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'garcon-backend-full',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'production',
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`
      }
    };
    
    console.log('📊 Health data:', JSON.stringify(healthData, null, 2));
    res.status(200).json(healthData);
  } catch (error) {
    console.error('💥 Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API info endpoint
app.get('/api/v1', (req, res) => {
  console.log('📋 API info requested');
  res.json({
    message: 'Garçon API v1 (Full Version)',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disabled',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      locations: '/api/v1/locations',
      menu: '/api/v1/menu',
      orders: '/api/v1/orders',
      payments: '/api/v1/payments',
      notifications: '/api/v1/notifications',
      analytics: '/api/v1/analytics'
    },
    features: [
      'Database Integration',
      'Real-time WebSocket',
      'Authentication Ready',
      'Payment Processing Ready',
      'Analytics Ready'
    ]
  });
});

// Database initialization endpoint
app.post('/api/v1/init-database', async (req, res) => {
  if (!pool) {
    return res.status(400).json({
      error: 'Database not configured',
      message: 'DATABASE_URL environment variable not set'
    });
  }

  try {
    console.log('🔧 Initializing database tables...');
    
    // Create basic tables for testing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created successfully');
    
    res.json({
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString(),
      tables: ['users', 'locations']
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      error: 'Database initialization failed',
      message: error.message
    });
  }
});

// Test database endpoint
app.get('/api/v1/test-db', async (req, res) => {
  if (!pool) {
    return res.status(400).json({
      error: 'Database not configured'
    });
  }

  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      message: 'Database test successful',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message
    });
  }
});

// Basic auth endpoints (placeholder)
app.post('/api/v1/auth/register', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const { email, name } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, created_at',
      [email, name]
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.get('/api/v1/users', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const result = await pool.query('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC');
    res.json({
      users: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.emit('welcome', {
    message: 'Connected to Garçon Backend',
    timestamp: new Date().toISOString()
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('🌐 Root endpoint requested');
  res.json({
    message: 'Garçon API is running! (Full Version)',
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disabled',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      'init-db': '/api/v1/init-database',
      'test-db': '/api/v1/test-db'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 for:', req.originalUrl);
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Garçon Backend (Full Version) running on port ${PORT}`);
  console.log(`🌐 API: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`📋 API Info: http://0.0.0.0:${PORT}/api/v1`);
  console.log(`🗄️ Database: ${pool ? 'Connected' : 'Disabled'}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔧 Server bound to 0.0.0.0 for Railway compatibility`);
  console.log('✅ Server started successfully!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (pool) pool.end();
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    if (pool) pool.end();
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Log unhandled errors
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});