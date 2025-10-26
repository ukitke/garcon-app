import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();

// Public routes with rate limiting
router.post('/register', rateLimitMiddleware.register, authController.register);
router.post('/login', rateLimitMiddleware.login, authController.login);
router.post('/refresh', rateLimitMiddleware.refresh, authController.refreshToken);
router.post('/password-reset/request', rateLimitMiddleware.passwordReset, authController.requestPasswordReset);
router.post('/password-reset/confirm', rateLimitMiddleware.passwordReset, authController.resetPassword);
router.post('/verify-email', rateLimitMiddleware.emailVerification, authController.verifyEmail);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.post('/logout-all', authMiddleware, authController.logoutAll);

export default router;