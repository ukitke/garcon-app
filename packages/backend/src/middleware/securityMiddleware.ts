// Security middleware
import { Request, Response, NextFunction } from 'express';
// import rateLimit from 'express-rate-limit';
const rateLimit = (options: any) => (req: any, res: any, next: any) => next();

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

export const pathTraversalProtection = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('../') || req.path.includes('..\\')) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  next();
};

export default {
  rateLimitMiddleware,
  securityHeadersMiddleware,
  pathTraversalProtection
};