import { AuthService } from '../../services/authService';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../config/database';
import redisClient from '../../config/redis';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../config/redis');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const mockUserData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123!',
      phone: '+1234567890',
      role: 'customer' as const,
    };

    it('should register a new user successfully', async () => {
      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // User doesn't exist
        .mockResolvedValueOnce({ // User creation
          rows: [{
            id: 'user-id',
            email: 'test@example.com',
            name: 'Test User',
            phone: '+1234567890',
            role: 'customer',
            is_email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          }],
        });

      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockJwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await authService.register(mockUserData);

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
    });

    it('should throw error if user already exists', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }],
      });

      await expect(authService.register(mockUserData)).rejects.toThrow(
        'User already exists with this email'
      );
    });
  });

  describe('login', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890',
      role: 'customer',
      passwordHash: 'hashed-password',
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login user successfully with valid credentials', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          phone: '+1234567890',
          role: 'customer',
          password_hash: 'hashed-password',
          is_email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await authService.login(mockCredentials);

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('access-token');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashed-password');
    });

    it('should throw error for invalid email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.login(mockCredentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error for invalid password', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          password_hash: 'hashed-password',
        }],
      });

      mockBcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(mockCredentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid-refresh-token';

    it('should refresh tokens successfully', async () => {
      const mockDecoded = {
        userId: 'user-id',
        tokenId: 'token-id',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      mockJwt.verify.mockReturnValue(mockDecoded);
      mockRedisClient.get.mockResolvedValue(mockRefreshToken);
      mockRedisClient.del.mockResolvedValue(1);
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer',
          password_hash: 'hashed-password',
          is_email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      mockJwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await authService.refreshToken(mockRefreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error for invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('resetPassword', () => {
    const mockToken = 'reset-token';
    const mockNewPassword = 'NewPassword123!';

    it('should reset password successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'user-id' }] }) // Valid token
        .mockResolvedValueOnce({ rowCount: 1 }); // Password update

      mockBcrypt.hash.mockResolvedValue('new-hashed-password');
      mockRedisClient.keys.mockResolvedValue(['refresh_token:user-id:token1']);
      mockRedisClient.del.mockResolvedValue(1);

      await expect(authService.resetPassword(mockToken, mockNewPassword)).resolves.not.toThrow();

      expect(mockBcrypt.hash).toHaveBeenCalledWith(mockNewPassword, 12);
    });

    it('should throw error for invalid token', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.resetPassword(mockToken, mockNewPassword)).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });
  });

  describe('verifyEmail', () => {
    const mockToken = 'verification-token';

    it('should verify email successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      await expect(authService.verifyEmail(mockToken)).resolves.not.toThrow();
    });

    it('should throw error for invalid token', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      await expect(authService.verifyEmail(mockToken)).rejects.toThrow(
        'Invalid verification token'
      );
    });
  });
});