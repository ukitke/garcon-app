import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

console.log('🚀 Starting Garçon Backend (Simple Version)...');
console.log('📝 Environment:', process.env.NODE_ENV || 'development');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = parseInt(process.env.PORT || '3000', 10);

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
  
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'garcon-backend-simple',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  console.log('📊 Health data:', JSON.stringify(healthData, null, 2));
  res.status(200).json(healthData);
});

// API info endpoint
app.get('/api/v1', (req, res) => {
  console.log('📋 API info requested');
  res.json({
    message: 'Garçon API v1 (Simple Version)',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      test: '/api/v1/test'
    },
    note: 'This is a simplified version for testing. Database features disabled.'
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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.emit('welcome', {
    message: 'Connected to Garçon Backend (Simple)',
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
    message: 'Garçon API is running! (Simple Version)',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/v1',
      test: '/api/v1/test'
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Garçon Backend (Simple Version) running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`📋 API Info: http://localhost:${PORT}/api/v1`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/v1/test`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
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