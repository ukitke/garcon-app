import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database';
import redisClient from '../config/redis';
import { User, CreateUserRequest, LoginRequest, AuthTokens, JWTPayload, RefreshTokenPayload } from '../types/user';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly JWT_EXPIRES_IN = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';
  private readonly SALT_ROUNDS = 12;

  async register(userData: CreateUserRequest): Promise<{ user: Omit<User, 'passwordHash'>, tokens: AuthTokens }> {
    const { email, name, password, phone, role = 'customer' } = userData;

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user in database
    const query = `
      INSERT INTO users (id, email, name, phone, role, password_hash, is_email_verified, email_verification_token, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, email, name, phone, role, is_email_verified, created_at, updated_at
    `;
    
    const userId = crypto.randomUUID();
    const values = [userId, email, name, phone, role, passwordHash, false, emailVerificationToken];
    
    const result = await pool.query(query, values);
    const user = result.rows[0];

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      } as Omit<User, 'passwordHash'>,
      tokens,
    };
  }

  async login(credentials: LoginRequest): Promise<{ user: Omit<User, 'passwordHash'>, tokens: AuthTokens }> {
    const { email, password } = credentials;

    // Find user by email
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      
      // Check if refresh token exists in Redis
      const storedToken = await redisClient.get(`refresh_token:${decoded.userId}:${decoded.tokenId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = await this.findUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Revoke old refresh token
      await redisClient.del(`refresh_token:${decoded.userId}:${decoded.tokenId}`);

      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      await redisClient.del(`refresh_token:${userId}:${decoded.tokenId}`);
    } catch (error) {
      // Token might be invalid, but we still want to attempt logout
      console.warn('Error during logout:', error);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    // Get all refresh tokens for user
    const keys = await redisClient.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    const query = `
      UPDATE users 
      SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW()
      WHERE id = $3
    `;
    
    await pool.query(query, [resetToken, resetExpires, user.id]);
    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const query = `
      SELECT id FROM users 
      WHERE password_reset_token = $1 AND password_reset_expires > NOW()
    `;
    
    const result = await pool.query(query, [token]);
    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = result.rows[0].id;
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
      WHERE id = $2
    `;
    
    await pool.query(updateQuery, [passwordHash, userId]);

    // Logout all sessions
    await this.logoutAll(userId);
  }

  async verifyEmail(token: string): Promise<void> {
    const query = `
      UPDATE users 
      SET is_email_verified = true, email_verification_token = NULL, updated_at = NOW()
      WHERE email_verification_token = $1
    `;
    
    const result = await pool.query(query, [token]);
    if (result.rowCount === 0) {
      throw new Error('Invalid verification token');
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    // Generate refresh token
    const tokenId = crypto.randomUUID();
    const refreshTokenPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      tokenId,
    };

    const refreshToken = jwt.sign(refreshTokenPayload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    });

    // Store refresh token in Redis
    await redisClient.setEx(
      `refresh_token:${user.id}:${tokenId}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      refreshToken
    );

    return { accessToken, refreshToken };
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, phone, role, password_hash, is_email_verified, 
             email_verification_token, password_reset_token, password_reset_expires,
             created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      role: row.role,
      passwordHash: row.password_hash,
      isEmailVerified: row.is_email_verified,
      emailVerificationToken: row.email_verification_token,
      passwordResetToken: row.password_reset_token,
      passwordResetExpires: row.password_reset_expires,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async findUserById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, phone, role, password_hash, is_email_verified, 
             email_verification_token, password_reset_token, password_reset_expires,
             created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      role: row.role,
      passwordHash: row.password_hash,
      isEmailVerified: row.is_email_verified,
      emailVerificationToken: row.email_verification_token,
      passwordResetToken: row.password_reset_token,
      passwordResetExpires: row.password_reset_expires,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const authService = new AuthService();