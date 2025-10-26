import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import logger from './config/simple-logger';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

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
    ? process.env.CORS_ORIGIN?.split(',') || []
    : true,
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple health check endpoints
app.get('/health', (req, res) => {
  console.log('✅ Health check requested at', new Date().toISOString());
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'garcon-backend',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  console.log('📊 Health data:', JSON.stringify(healthData, null, 2));
  res.status(200).json(healthData);
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'garcon-backend',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'DISABLED', latency: '0ms' },
      redis: { status: 'DISABLED', latency: '0ms' }
    },
    responseTime: '0ms'
  });
});

// API version endpoint
app.get('/api/v1', (req, res) => {
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

// Simple test endpoints
app.get('/api/v1/test', (req, res) => {
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isDevelopment ? err.message : 'Internal server error',
      timestamp: new Date().toISOString(),
    },
  });
});

// Log application startup
logger.info('Garçon Backend Application Started (Simple Mode)', {
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  port: process.env.PORT || 3000,
  websocketPort: process.env.WEBSOCKET_PORT || 3001,
});

export { app, server, io };