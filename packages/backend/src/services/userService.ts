import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { User } from '../types/user';

export interface UpdateUserProfileRequest {
  name?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  private readonly SALT_ROUNDS = 12;

  async getUserProfile(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const query = `
      SELECT id, email, name, phone, role, is_email_verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [userId]);
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
      isEmailVerified: row.is_email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateUserProfile(userId: string, updates: UpdateUserProfileRequest): Promise<Omit<User, 'passwordHash'>> {
    const { name, phone } = updates;
    
    // Build dynamic query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, phone, role, is_email_verified, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      role: row.role,
      isEmailVerified: row.is_email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async changePassword(userId: string, passwordData: ChangePasswordRequest): Promise<void> {
    const { currentPassword, newPassword } = passwordData;

    // Get current password hash
    const userQuery = `SELECT password_hash FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const currentPasswordHash = userResult.rows[0].password_hash;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update password
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await pool.query(updateQuery, [newPasswordHash, userId]);
  }

  async deleteUserAccount(userId: string, password: string): Promise<void> {
    // Get user and verify password
    const userQuery = `SELECT password_hash FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const passwordHash = userResult.rows[0].password_hash;

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    if (!isPasswordValid) {
      throw new Error('Password is incorrect');
    }

    // Start transaction for account deletion
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Delete user data in correct order (respecting foreign key constraints)
      // Note: In a real application, you might want to soft delete or anonymize data
      
      // Delete user sessions (refresh tokens will be handled by Redis TTL)
      // Delete user orders, reservations, reviews, etc. would go here
      
      // Finally delete the user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    // Basic email validation (additional to Joi validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async validatePhone(phone: string): Promise<boolean> {
    // International phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  async checkEmailExists(email: string, excludeUserId?: string): Promise<boolean> {
    let query = 'SELECT id FROM users WHERE email = $1';
    const values: any[] = [email];

    if (excludeUserId) {
      query += ' AND id != $2';
      values.push(excludeUserId);
    }

    const result = await pool.query(query, values);
    return result.rows.length > 0;
  }

  async getUsersByRole(role: 'customer' | 'owner' | 'waiter'): Promise<Omit<User, 'passwordHash'>[]> {
    const query = `
      SELECT id, email, name, phone, role, is_email_verified, created_at, updated_at
      FROM users 
      WHERE role = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [role]);
    
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      role: row.role,
      isEmailVerified: row.is_email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

export const userService = new UserService();