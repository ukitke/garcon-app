import request from 'supertest';
import { app } from '../../index';
import pool from '../../config/database';
import redisClient from '../../config/redis';

// Mock external dependencies
jest.mock('../../config/database');
jest.mock('../../config/redis');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123!',
      phone: '+1234567890',
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

      mockRedisClient.setEx.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('valid email');
    });

    it('should return 400 for weak password', async () => {
      const invalidData = { ...validUserData, password: 'weak' };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Password must');
    });

    it('should return 409 for existing user', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-user' }],
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body.error.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully with valid credentials', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          phone: '+1234567890',
          role: 'customer',
          password_hash: '$2a$12$hashedpassword',
          is_email_verified: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      mockRedisClient.setEx.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(validCredentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should return 400 for missing email', async () => {
      const invalidData = { password: 'Password123!' };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for invalid credentials', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(validCredentials)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshTokenData = {
        refreshToken: 'valid-refresh-token',
      };

      mockRedisClient.get.mockResolvedValue('valid-refresh-token');
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.setEx.mockResolvedValue('OK');

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

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send(refreshTokenData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/password-reset/request', () => {
    it('should always return success for security', async () => {
      const resetData = {
        email: 'test@example.com',
      };

      const response = await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/v1/auth/password-reset/request')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const verificationData = {
        token: 'valid-verification-token',
      };

      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send(verificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email verified successfully');
    });

    it('should return 400 for invalid token', async () => {
      const verificationData = {
        token: 'invalid-token',
      };

      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send(verificationData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });
  });
});