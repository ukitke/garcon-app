import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
// Use simple logger for development to avoid complex dependencies
import logger from './config/simple-logger';

// Conditional imports for production features
let monitoringService: any = null;
let requestIdMiddleware: any = null;
let httpLoggingMiddleware: any = null;
let errorLoggingMiddleware: any = null;
let performanceMiddleware: any = null;

if (!process.env.DISABLE_MONITORING) {
  try {
    const monitoring = require('./services/monitoringService');
    monitoringService = monitoring.monitoringService;
    
    const loggingMiddleware = require('./middleware/loggingMiddleware');
    requestIdMiddleware = loggingMiddleware.requestIdMiddleware;
    httpLoggingMiddleware = loggingMiddleware.httpLoggingMiddleware;
    errorLoggingMiddleware = loggingMiddleware.errorLoggingMiddleware;
    performanceMiddleware = loggingMiddleware.performanceMiddleware;
  } catch (error) {
    console.log('⚠️  Advanced monitoring disabled for testing');
  }
}
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { createLocationRoutes } from './routes/locationRoutes';
import { menuRoutes } from './routes/menuRoutes';
import { orderRoutes } from './routes/orderRoutes';
import { groupOrderingRoutes } from './routes/groupOrderingRoutes';
import { notificationRoutes } from './routes/notificationRoutes';
import { waiterTabletRoutes } from './routes/waiterTabletRoutes';
import { NotificationService } from './services/notificationService';
// Database imports - conditional loading
let redisClient: any = null;
let pool: any = null;

// Only load database connections if not disabled
if (!process.env.DISABLE_MONITORING && process.env.DATABASE_URL) {
  try {
    redisClient = require('./config/redis').default;
    pool = require('./config/database').default;
  } catch (error) {
    console.log('⚠️  Database connections disabled for testing');
  }
}
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware';
import { LocationService } from './services/locationService';
import { LocationController } from './controllers/locationController';
import { TableService } from './services/tableService';
import { TableController } from './controllers/tableController';
import { createTableRoutes } from './routes/tableRoutes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Initialize services
const locationService = new LocationService(pool);
const locationController = new LocationController(locationService);
const tableService = new TableService(pool);
const tableController = new TableController(tableService);

// Initialize notification service with Socket.io
const notificationServiceInstance = new NotificationService(io);

// Set the global notification service instance
import { setNotificationService } from './services/notificationService';
setNotificationService(notificationServiceInstance);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
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

// Request tracking and logging middleware (conditional)
if (requestIdMiddleware) app.use(requestIdMiddleware);
if (httpLoggingMiddleware) app.use(httpLoggingMiddleware);
if (performanceMiddleware) app.use(performanceMiddleware);

// Global rate limiting
app.use('/api', rateLimitMiddleware.api);

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    // Basic health check
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'garcon-backend',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'garcon-backend',
      error: 'Health check failed'
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    // Detailed health check with dependencies
    const startTime = Date.now();
    
    // Check database connection
    let dbStatus = 'DISABLED';
    let dbLatency = 0;
    if (pool) {
      try {
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        dbLatency = Date.now() - dbStart;
        dbStatus = 'OK';
      } catch (error) {
        dbStatus = 'ERROR';
      }
    }

    // Check Redis connection
    let redisStatus = 'DISABLED';
    let redisLatency = 0;
    if (redisClient) {
      try {
        const redisStart = Date.now();
        await redisClient.ping();
        redisLatency = Date.now() - redisStart;
        redisStatus = 'OK';
      } catch (error) {
        redisStatus = 'ERROR';
      }
    }

    const totalLatency = Date.now() - startTime;
    const isHealthy = (dbStatus === 'OK' || dbStatus === 'DISABLED') && (redisStatus === 'OK' || redisStatus === 'DISABLED');

    const health = {
      status: isHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      service: 'garcon-backend',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: dbStatus,
          latency: `${dbLatency}ms`
        },
        redis: {
          status: redisStatus,
          latency: `${redisLatency}ms`
        }
      },
      responseTime: `${totalLatency}ms`
    };

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'garcon-backend',
      error: 'Health check failed'
    });
  }
});

// Readiness probe (for Kubernetes/ECS)
app.get('/ready', async (req, res) => {
  try {
    // Check if application is ready to serve traffic
    if (pool) await pool.query('SELECT 1');
    if (redisClient) await redisClient.ping();
    
    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: 'Dependencies not available'
    });
  }
});

// Liveness probe (for Kubernetes/ECS)
app.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint for monitoring
app.get('/metrics', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Get database pool stats
    let dbConnections = 0;
    try {
      const result = await pool.query('SELECT count(*) as connections FROM pg_stat_activity WHERE state = \'active\'');
      dbConnections = parseInt(result.rows[0].connections);
    } catch (error) {
      // Ignore error for metrics
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      service: 'garcon-backend',
      system: {
        uptime: process.uptime(),
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      database: {
        activeConnections: dbConnections,
        poolSize: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      }
    };

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Garçon API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      locations: '/api/v1/locations',
      menu: '/api/v1/menu',
      orders: '/api/v1/orders',
      payments: '/api/v1/payments',
      reservations: '/api/v1/reservations',
      analytics: '/api/v1/analytics',
    },
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/locations', createLocationRoutes(locationController));
app.use('/api/v1/locations', createLocationRoutes(locationController));
app.use('/api', createTableRoutes(tableController));
app.use('/api/v1', createTableRoutes(tableController));
app.use('/api/menu', menuRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/groups', groupOrderingRoutes);
app.use('/api/v1/groups', groupOrderingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/tablet', waiterTabletRoutes);
app.use('/api/v1/tablet', waiterTabletRoutes);

// Error handling middleware
if (errorLoggingMiddleware) app.use(errorLoggingMiddleware);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isDevelopment ? err.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId || 'unknown'
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString(),
    },
  });
});

// Initialize monitoring
if (process.env.NODE_ENV === 'production' && monitoringService) {
  logger.info('Starting monitoring service');
  monitoringService.startSystemMetricsCollection();
}

// Log application startup
logger.info('Garçon Backend Application Started', {
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  port: process.env.PORT || 3000,
  websocketPort: process.env.WEBSOCKET_PORT || 3001,
});

export { app, server, io };