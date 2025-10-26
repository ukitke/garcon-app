import request from 'supertest';
import { app } from '../../app';
import jwt from 'jsonwebtoken';

// Mock AuthService for testing
const AuthService = {
  generateToken: (payload: any, expiresIn: string = '15m') => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn });
  }
};

describe('Security Penetration Tests', () => {
  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in login endpoint', async () => {
      const maliciousPayload = {
        email: "admin@test.com'; DROP TABLE users; --",
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should prevent SQL injection in location search', async () => {
      const maliciousQuery = "'; DROP TABLE locations; --";
      
      const response = await request(app)
        .get(`/api/locations/search?name=${encodeURIComponent(maliciousQuery)}`);

      expect(response.status).toBe(400);
    });

    it('should prevent SQL injection in menu item creation', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'owner' });
      const maliciousPayload = {
        name: "'; DROP TABLE menu_items; --",
        description: 'Test item',
        price: 10.99
      };

      const response = await request(app)
        .post('/api/menu/1/items')
        .set('Authorization', `Bearer ${token}`)
        .send(maliciousPayload);

      expect(response.status).toBe(400);
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize script tags in menu item descriptions', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'owner' });
      const xssPayload = {
        name: 'Test Item',
        description: '<script>alert("XSS")</script>Delicious pasta',
        price: 15.99
      };

      const response = await request(app)
        .post('/api/menu/1/items')
        .set('Authorization', `Bearer ${token}`)
        .send(xssPayload);

      if (response.status === 201) {
        expect(response.body.description).not.toContain('<script>');
        expect(response.body.description).toContain('Delicious pasta');
      }
    });

    it('should sanitize HTML in review comments', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'customer' });
      const xssPayload = {
        rating: 5,
        comment: '<img src="x" onerror="alert(\'XSS\')" />Great food!'
      };

      const response = await request(app)
        .post('/api/reviews/1')
        .set('Authorization', `Bearer ${token}`)
        .send(xssPayload);

      if (response.status === 201) {
        expect(response.body.comment).not.toContain('<img');
        expect(response.body.comment).not.toContain('onerror');
      }
    });
  });

  describe('Authentication Bypass Attempts', () => {
    it('should reject requests with malformed JWT tokens', async () => {
      const malformedTokens = [
        'Bearer invalid.token.here',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'Bearer null',
        'Bearer undefined',
        'Bearer ""'
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', token);

        expect(response.status).toBe(401);
      }
    });

    it('should reject expired tokens', async () => {
      // Create an expired token (simulate by using a very short expiry)
      const expiredToken = await AuthService.generateToken(
        { id: '1', role: 'customer' },
        '-1s' // Expired 1 second ago
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should prevent privilege escalation', async () => {
      const customerToken = await AuthService.generateToken({ id: '1', role: 'customer' });

      // Try to access owner-only endpoint
      const response = await request(app)
        .post('/api/menu/1/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test Item',
          description: 'Test',
          price: 10.99
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Input Validation Attacks', () => {
    it('should reject oversized payloads', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'owner' });
      const oversizedPayload = {
        name: 'A'.repeat(10000), // Very long name
        description: 'B'.repeat(50000), // Very long description
        price: 10.99
      };

      const response = await request(app)
        .post('/api/menu/1/items')
        .set('Authorization', `Bearer ${token}`)
        .send(oversizedPayload);

      expect(response.status).toBe(400);
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user..user@domain.com',
        'user@domain',
        '<script>alert("xss")</script>@domain.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            password: 'ValidPassword123!',
            name: 'Test User'
          });

        expect(response.status).toBe(400);
      }
    });

    it('should validate phone numbers strictly', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'customer' });
      const invalidPhones = [
        '123',
        'not-a-phone',
        '+1-800-CALL-NOW',
        '++1234567890',
        '<script>alert("xss")</script>'
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ phone });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Rate Limiting Protection', () => {
    it('should rate limit login attempts', async () => {
      const loginPayload = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple rapid requests
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send(loginPayload)
      );

      const responses = await Promise.all(requests);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit password reset requests', async () => {
      const requests = Array(15).fill(null).map(() =>
        request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'test@example.com' })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Security', () => {
    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/locations/nearby')
        .set('Origin', 'https://malicious-site.com');

      // Should either reject or not include CORS headers for unauthorized origin
      expect(
        response.headers['access-control-allow-origin'] === undefined ||
        response.headers['access-control-allow-origin'] !== 'https://malicious-site.com'
      ).toBe(true);
    });
  });

  describe('File Upload Security', () => {
    it('should reject malicious file uploads', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'owner' });
      
      // Try to upload a script file as image
      const response = await request(app)
        .post('/api/menu/1/items/1/image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', Buffer.from('<script>alert("xss")</script>'), 'malicious.js');

      expect(response.status).toBe(400);
    });

    it('should validate file size limits', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'owner' });
      
      // Create a large buffer (simulate oversized image)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      
      const response = await request(app)
        .post('/api/menu/1/items/1/image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', largeBuffer, 'large-image.jpg');

      expect(response.status).toBe(400);
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'customer' });

      // First, verify token works
      let response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Token should no longer work
      response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(401);
    });

    it('should prevent session fixation', async () => {
      // Login and get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      if (loginResponse.status === 200) {
        const token1 = loginResponse.body.token;

        // Login again with same credentials
        const loginResponse2 = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });

        if (loginResponse2.status === 200) {
          const token2 = loginResponse2.body.token;
          
          // Tokens should be different (new session created)
          expect(token1).not.toBe(token2);
        }
      }
    });
  });
});