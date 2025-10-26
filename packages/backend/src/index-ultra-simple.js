const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Garçon Backend...');
console.log('📝 Environment:', process.env.NODE_ENV || 'production');
console.log('🔧 Port:', PORT);

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (quello che Railway sta cercando)
app.get('/health', (req, res) => {
  console.log('✅ Health check requested at', new Date().toISOString());
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'garcon-backend',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    port: PORT
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

// API info endpoint
app.get('/api/v1', (req, res) => {
  console.log('📋 API info requested');
  res.json({
    message: 'Garçon API v1',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Garçon Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API: http://localhost:${PORT}/api/v1`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log('✅ Server started successfully!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
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