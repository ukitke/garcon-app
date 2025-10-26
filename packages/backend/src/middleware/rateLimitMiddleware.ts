import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../config/redis';

// Rate limiter configurations
const rateLimiters = {
  // Authentication endpoints
  register: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_register',
    points: 5, // Number of attempts
    duration: 3600, // Per 1 hour
    blockDuration: 3600, // Block for 1 hour
  }),

  login: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_login',
    points: 10, // Number of attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
  }),

  refresh: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_refresh',
    points: 20, // Number of attempts
    duration: 3600, // Per 1 hour
    blockDuration: 300, // Block for 5 minutes
  }),

  passwordReset: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_password_reset',
    points: 3, // Number of attempts
    duration: 3600, // Per 1 hour
    blockDuration: 3600, // Block for 1 hour
  }),

  emailVerification: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_email_verification',
    points: 5, // Number of attempts
    duration: 3600, // Per 1 hour
    blockDuration: 300, // Block for 5 minutes
  }),

  // Profile management endpoints
  updateProfile: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_update_profile',
    points: 10, // Number of attempts
    duration: 3600, // Per 1 hour
    blockDuration: 300, // Block for 5 minutes
  }),

  changePassword: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_change_password',
    points: 5, // Number of attempts
    duration: 3600, // Per 1 hour
    blockDuration: 1800, // Block for 30 minutes
  }),

  deleteAccount: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_delete_account',
    points: 3, // Number of attempts
    duration: 3600, // Per 1 hour
    blockDuration: 3600, // Block for 1 hour
  }),

  // General API rate limiting
  api: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_api',
    points: 100, // Number of requests
    duration: 60, // Per 1 minute
    blockDuration: 60, // Block for 1 minute
  }),
};

// Generic rate limit middleware factory
const createRateLimitMiddleware = (limiter: RateLimiterRedis) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use IP address as the key, but could be enhanced with user ID for authenticated requests
      const key = req.ip || req.connection.remoteAddress || 'unknown';
      
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes: any) {
      const remainingPoints = rateLimiterRes?.remainingPoints || 0;
      const msBeforeNext = rateLimiterRes?.msBeforeNext || 0;
      const totalHits = rateLimiterRes?.totalHits || 0;

      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000) || 1,
        'X-RateLimit-Limit': limiter.points,
        'X-RateLimit-Remaining': remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
      });

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.round(msBeforeNext / 1000),
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
};

// Export rate limit middleware for different endpoints
export const rateLimitMiddleware = {
  register: createRateLimitMiddleware(rateLimiters.register),
  login: createRateLimitMiddleware(rateLimiters.login),
  refresh: createRateLimitMiddleware(rateLimiters.refresh),
  passwordReset: createRateLimitMiddleware(rateLimiters.passwordReset),
  emailVerification: createRateLimitMiddleware(rateLimiters.emailVerification),
  updateProfile: createRateLimitMiddleware(rateLimiters.updateProfile),
  changePassword: createRateLimitMiddleware(rateLimiters.changePassword),
  deleteAccount: createRateLimitMiddleware(rateLimiters.deleteAccount),
  api: createRateLimitMiddleware(rateLimiters.api),
};

// Enhanced rate limiting with user-based keys for authenticated requests
export const createUserBasedRateLimit = (limiter: RateLimiterRedis) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use user ID if authenticated, otherwise fall back to IP
      const user = (req as any).user;
      const key = user?.userId || req.ip || req.connection.remoteAddress || 'unknown';
      
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes: any) {
      const remainingPoints = rateLimiterRes?.remainingPoints || 0;
      const msBeforeNext = rateLimiterRes?.msBeforeNext || 0;

      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000) || 1,
        'X-RateLimit-Limit': limiter.points,
        'X-RateLimit-Remaining': remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
      });

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.round(msBeforeNext / 1000),
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
};