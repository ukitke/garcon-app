const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');

console.log('🔧 Loading environment variables...');

const PORT = parseInt(process.env.PORT || '3000', 10);
const WEBSOCKET_PORT = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);

console.log('📝 Configuration loaded:');
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'production'}`);
console.log(`   WEBSOCKET_PORT: ${WEBSOCKET_PORT}`);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

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

// Health check endpoint (quello che Railway sta cercando)
app.get('/health', (req, res) => {
  console.log('✅ Health check requested at', new Date().toISOString());
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'garcon-backend',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production'
  };
  console.log('📊 Health data:', JSON.stringify(healthData, null, 2));
  res.status(200).json(healthData);
});

// API health endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'garcon-backend',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    checks: {
      database: { status: 'DISABLED', latency: '0ms' },
      redis: { status: 'DISABLED', latency: '0ms' }
    },
    responseTime: '0ms'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  console.log('🌐 Root endpoint requested');
  res.json({
    message: 'Garçon API is running!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/v1'
    }
  });
});

// API version endpoint
app.get('/api/v1', (req, res) => {
  console.log('📋 API info requested');
  res.json({
    message: 'Garçon API v1',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api_health: '/api/health',
      auth: '/api/v1/auth (disabled)',
      locations: '/api/v1/locations (disabled)',
      menu: '/api/v1/menu (disabled)',
      orders: '/api/v1/orders (disabled)',
    },
    note: 'This is a minimal version for testing. Full API requires database setup.'
  });
});

// Test endpoint
app.get('/api/v1/test', (req, res) => {
  console.log('🧪 Test endpoint requested');
  res.json({
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

app.post('/api/v1/test', (req, res) => {
  res.json({
    message: 'POST test endpoint working!',
    timestamp: new Date().toISOString(),
    body: req.body,
    headers: {
      'content-type': req.get('Content-Type'),
      'user-agent': req.get('User-Agent')
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 for:', req.originalUrl);
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Application Error:', err.message);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isDevelopment ? err.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    },
  });
});

// Start HTTP server - BIND SU 0.0.0.0 PER RAILWAY
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Garçon Backend Server (Railway Direct) running on port ${PORT}`);
  console.log(`🌐 API: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`📋 API Info: http://0.0.0.0:${PORT}/api/v1`);
  console.log(`🧪 Test: http://0.0.0.0:${PORT}/api/v1/test`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔧 Server bound to 0.0.0.0 for Railway compatibility`);
  console.log('✅ Server started successfully!');
});

// Error handling per l'avvio del server
server.on('error', (error) => {
  console.error('💥 Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Unhandled errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});