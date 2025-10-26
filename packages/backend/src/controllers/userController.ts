import { Request, Response } from 'express';
import { userService } from '../services/userService';
import {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  getUsersByRoleSchema,
} from '../validation/userValidation';

export class UserController {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found in token',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const user = await userService.getUserProfile(userId);

      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
        message: 'Profile retrieved successfully',
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve profile',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found in token',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate request body
      const { error, value } = updateProfileSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Additional validation for phone if provided
      if (value.phone && value.phone !== '') {
        const isValidPhone = await userService.validatePhone(value.phone);
        if (!isValidPhone) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid phone number format',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      }

      const updatedUser = await userService.updateUserProfile(userId, value);

      res.status(200).json({
        success: true,
        data: { user: updatedUser },
        message: 'Profile updated successfully',
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (error.message === 'No fields to update') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      console.error('Update profile error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update profile',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found in token',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate request body
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      await userService.changePassword(userId, value);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (error.message === 'Current password is incorrect') {
        res.status(400).json({
          error: {
            code: 'INVALID_PASSWORD',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      console.error('Change password error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to change password',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found in token',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate request body
      const { error, value } = deleteAccountSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      await userService.deleteUserAccount(userId, value.password);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (error.message === 'Password is incorrect') {
        res.status(400).json({
          error: {
            code: 'INVALID_PASSWORD',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      console.error('Delete account error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete account',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async getUsersByRole(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      // Only owners and admins can access this endpoint
      if (userRole !== 'owner') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied. Only owners can view users by role.',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate query parameters
      const { error, value } = getUsersByRoleSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const users = await userService.getUsersByRole(value.role);

      res.status(200).json({
        success: true,
        data: { users, count: users.length },
        message: `Users with role '${value.role}' retrieved successfully`,
      });
    } catch (error: any) {
      console.error('Get users by role error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve users',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

export const userController = new UserController();