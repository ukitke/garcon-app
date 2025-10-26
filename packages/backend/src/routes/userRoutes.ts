import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// Profile management routes
router.get('/profile', userController.getProfile);
router.put('/profile', rateLimitMiddleware.updateProfile, userController.updateProfile);
router.put('/password', rateLimitMiddleware.changePassword, userController.changePassword);
router.delete('/account', rateLimitMiddleware.deleteAccount, userController.deleteAccount);

// Admin routes (role-based access control handled in controller)
router.get('/by-role', userController.getUsersByRole);

export default router;