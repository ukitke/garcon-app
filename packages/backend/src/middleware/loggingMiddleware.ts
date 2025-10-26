import { Request, Response, NextFunction } from 'express';
// import { v4 as uuidv4 } from 'uuid';
const uuidv4 = () => Math.random().toString(36).substr(2, 9);
import logger, { logRequest } from '../config/logger';
// import MonitoringService from '../services/monitoringService';

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

/**
 * Middleware to add request ID and start time to requests
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

/**
 * Middleware to log HTTP requests and responses
 */
export const httpLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request
  logger.http('Incoming Request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentLength: req.get('Content-Length'),
    userId: (req as any).user?.id,
  });

  // Override res.end to capture response
  
        const endTime = Date.now();
        const duration = endTime - startTime;
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          requestId: (req as any).requestId
        });
        next();

  next();
};

/**
 * Middleware to log errors
 */
export const errorLoggingMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errorId = uuidv4();
  
  logger.error('Request Error', {
    errorId,
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    message: error.message,
    stack: error.stack,
    userId: (req as any).user?.id,
    ip: req.ip || req.connection.remoteAddress,
  });

  // Add error ID to response for tracking
  res.setHeader('X-Error-ID', errorId);
  
  next(error);
};

/**
 * Middleware to track business events
 */
export const businessEventMiddleware = (eventType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Store event type for later use
    (req as any).businessEvent = eventType;
    
    // Override res.json to capture successful business events
    const originalJson = res.json;
    res.json = function(body?: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.info('Business Event', {
          event: eventType,
          requestId: req.requestId,
          userId: (req as any).user?.id,
          data: body,
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Middleware to track database operations
 */
export const databaseLoggingMiddleware = {
  logQuery: (query: string, params?: any[], duration?: number, error?: Error) => {
    const logData = {
      query: query.substring(0, 200), // Truncate long queries
      paramCount: params?.length || 0,
      duration: duration ? `${duration}ms` : undefined,
    };

    if (error) {
      logger.error('Database Query Error', {
        ...logData,
        error: error.message,
        stack: error.stack,
      });
      
      // Track error metric
      // monitoringService.trackDatabaseOperation('query', duration || 0, false);
    } else {
      if (duration && duration > 1000) {
        logger.warn('Slow Database Query', logData);
      } else {
        logger.debug('Database Query', logData);
      }
      
      // Track success metric
      if (duration) {
        // monitoringService.trackDatabaseOperation('query', duration, true);
      }
    }
  },
};

/**
 * Middleware for security event logging
 */
export const securityLoggingMiddleware = {
  logAuthAttempt: (req: Request, success: boolean, reason?: string) => {
    logger.info('Authentication Attempt', {
      requestId: req.requestId,
      success,
      reason,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      email: req.body?.email,
    });
  },

  logSuspiciousActivity: (req: Request, activity: string, details?: any) => {
    logger.warn('Suspicious Activity', {
      requestId: req.requestId,
      activity,
      details,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    });
  },

  logRateLimitExceeded: (req: Request, limit: number) => {
    logger.warn('Rate Limit Exceeded', {
      requestId: req.requestId,
      limit,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      endpoint: req.url,
    });
  },
};

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow Request', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
      });
    }
    
    // Track performance metrics
    const endpoint = req.route?.path || req.url;
    // monitoringService.trackApiRequest(endpoint, req.method, res.statusCode, duration);
  });
  
  next();
};