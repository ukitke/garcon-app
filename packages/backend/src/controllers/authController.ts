import { Request, Response } from 'express';
import { authService } from '../services/authService';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  emailVerificationSchema,
} from '../validation/authValidation';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = registerSchema.validate(req.body);
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

      // Register user
      const result = await authService.register(value);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        message: 'User registered successfully. Please verify your email.',
      });
    } catch (error: any) {
      if (error.message === 'User already exists with this email') {
        res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      console.error('Registration error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = loginSchema.validate(req.body);
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

      // Login user
      const result = await authService.login(value);

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        message: 'Login successful',
      });
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      console.error('Login error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = refreshTokenSchema.validate(req.body);
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

      // Refresh tokens
      const tokens = await authService.refreshToken(value.refreshToken);

      res.status(200).json({
        success: true,
        data: { tokens },
        message: 'Tokens refreshed successfully',
      });
    } catch (error: any) {
      res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = (req as any).user?.userId;

      if (!refreshToken || !userId) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Refresh token and user ID are required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      await authService.logout(userId, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'User ID is required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      await authService.logoutAll(userId);

      res.status(200).json({
        success: true,
        message: 'All sessions logged out successfully',
      });
    } catch (error: any) {
      console.error('Logout all error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout all failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = passwordResetRequestSchema.validate(req.body);
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

      await authService.generatePasswordResetToken(value.email);

      // Always return success for security (don't reveal if email exists)
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error: any) {
      // Always return success for security
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = passwordResetSchema.validate(req.body);
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

      await authService.resetPassword(value.token, value.password);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      if (error.message === 'Invalid or expired reset token') {
        res.status(400).json({
          error: {
            code: 'INVALID_RESET_TOKEN',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      console.error('Password reset error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Password reset failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = emailVerificationSchema.validate(req.body);
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

      await authService.verifyEmail(value.token);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      if (error.message === 'Invalid verification token') {
        res.status(400).json({
          error: {
            code: 'INVALID_VERIFICATION_TOKEN',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      console.error('Email verification error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Email verification failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

export const authController = new AuthController();