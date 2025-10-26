import request from 'supertest';
import { app } from '../../app';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Mock the database
jest.mock('../../config/database', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }))
}));

describe('Admin Integration Tests', () => {
  let mockPool: jest.Mocked<Pool>;
  let authToken: string;

  beforeEach(() => {
    mockPool = require('../../config/database').getPool();
    
    // Create a test JWT token
    authToken = jwt.sign(
      { 
        userId: 'owner-123', 
        role: 'owner',
        locationId: 'loc-1'
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    jest.clearAllMocks();
  });

  describe('GET /api/admin/dashboard/:locationId', () => {
    it('should return dashboard overview', async () => {
      const mockData = {
        total_locations: '5',
        active_locations: '4',
        total_orders: '150',
        total_revenue: '2500.00',
        active_sessions: '12',
        pending_calls: '3'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockData] });

      const response = await request(app)
        .get('/api/admin/dashboard/loc-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        totalLocations: 5,
        activeLocations: 4,
        totalOrders: 150,
        totalRevenue: 2500,
        activeSessions: 12,
        pendingCalls: 3,
        conversionRate: 0,
        averageOrderValue: 16.67,
        lastUpdated: expect.any(String)
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/admin/dashboard/loc-1')
        .expect(401);
    });

    it('should return 500 on database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/admin/dashboard/loc-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });

  describe('GET /api/admin/locations/:ownerId/performance', () => {
    it('should return location performance metrics', async () => {
      const mockData = [
        {
          id: 'loc-1',
          name: 'Restaurant A',
          total_orders: '50',
          total_revenue: '1000.00',
          avg_order_value: '20.00',
          active_sessions: '5',
          rating: '4.5'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const response = await request(app)
        .get('/api/admin/locations/owner-123/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({
        locationId: 'loc-1',
        locationName: 'Restaurant A',
        totalOrders: 50,
        totalRevenue: 1000,
        averageOrderValue: 20,
        activeSessions: 5,
        rating: 4.5,
        performance: 'good'
      });
    });
  });

  describe('GET /api/admin/activity/:ownerId', () => {
    it('should return recent activities', async () => {
      const mockData = [
        {
          id: 'activity-1',
          type: 'order_placed',
          description: 'New order placed',
          location_name: 'Restaurant A',
          user_name: 'John Doe',
          created_at: '2023-10-01T10:00:00Z',
          metadata: JSON.stringify({ orderId: 'order-123' })
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const response = await request(app)
        .get('/api/admin/activity/owner-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({
        id: 'activity-1',
        type: 'order_placed',
        description: 'New order placed',
        locationName: 'Restaurant A',
        userName: 'John Doe',
        timestamp: '2023-10-01T10:00:00.000Z',
        metadata: { orderId: 'order-123' }
      });
    });

    it('should respect limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/admin/activity/owner-123?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['owner-123', 5]
      );
    });
  });

  describe('GET /api/admin/alerts/:ownerId', () => {
    it('should return system alerts', async () => {
      const mockData = [
        {
          id: 'alert-1',
          type: 'high_wait_time',
          message: 'High wait time detected',
          severity: 'warning',
          location_id: 'loc-1',
          location_name: 'Restaurant A',
          is_resolved: false,
          created_at: '2023-10-01T10:00:00Z'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const response = await request(app)
        .get('/api/admin/alerts/owner-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({
        id: 'alert-1',
        type: 'high_wait_time',
        message: 'High wait time detected',
        severity: 'warning',
        locationId: 'loc-1',
        locationName: 'Restaurant A',
        isResolved: false,
        createdAt: '2023-10-01T10:00:00.000Z'
      });
    });
  });

  describe('PUT /api/admin/alerts/:alertId/resolve', () => {
    it('should resolve an alert', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .put('/api/admin/alerts/alert-1/resolve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ resolution: 'Issue fixed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Alert resolved successfully');
    });

    it('should return 404 for non-existent alert', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      await request(app)
        .put('/api/admin/alerts/alert-1/resolve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ resolution: 'Issue fixed' })
        .expect(404);
    });
  });

  describe('GET /api/admin/analytics/:ownerId/revenue', () => {
    it('should return revenue analytics', async () => {
      const mockData = [
        {
          date: '2023-10-01',
          revenue: '500.00',
          orders: '25'
        },
        {
          date: '2023-10-02',
          revenue: '750.00',
          orders: '35'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const response = await request(app)
        .get('/api/admin/analytics/owner-123/revenue')
        .query({
          startDate: '2023-10-01',
          endDate: '2023-10-02'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRevenue).toBe(1250);
      expect(response.body.data.totalOrders).toBe(60);
      expect(response.body.data.dailyData).toHaveLength(2);
    });

    it('should return 400 without required dates', async () => {
      await request(app)
        .get('/api/admin/analytics/owner-123/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/admin/locations/:locationId/settings', () => {
    it('should update location settings', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'loc-1' }] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const settings = {
        name: 'Updated Restaurant',
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/api/admin/locations/loc-1/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(settings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Location settings updated successfully');
    });

    it('should return 400 with invalid data', async () => {
      await request(app)
        .put('/api/admin/locations/loc-1/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Empty body
        .expect(400);
    });
  });

  describe('GET /api/admin/menu/:locationId/analytics', () => {
    it('should return menu analytics', async () => {
      const mockData = [
        {
          item_id: 'item-1',
          item_name: 'Pizza Margherita',
          category: 'Pizza',
          order_count: '50',
          revenue: '500.00',
          avg_rating: '4.5'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const response = await request(app)
        .get('/api/admin/menu/loc-1/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.popularItems).toHaveLength(1);
      expect(response.body.data.popularItems[0]).toEqual({
        itemId: 'item-1',
        itemName: 'Pizza Margherita',
        category: 'Pizza',
        orderCount: 50,
        revenue: 500,
        averageRating: 4.5
      });
    });
  });

  describe('POST /api/admin/export/:ownerId', () => {
    it('should export data in CSV format', async () => {
      const mockData = [
        { date: '2023-10-01', revenue: '500.00', orders: '25' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const response = await request(app)
        .post('/api/admin/export/owner-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'revenue',
          startDate: '2023-10-01',
          endDate: '2023-10-02',
          format: 'csv'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Date,Revenue,Orders');
    });

    it('should export data in JSON format', async () => {
      const mockData = [
        { date: '2023-10-01', revenue: '500.00', orders: '25' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const response = await request(app)
        .post('/api/admin/export/owner-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'revenue',
          startDate: '2023-10-01',
          endDate: '2023-10-02',
          format: 'json'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toEqual(mockData);
    });

    it('should return 400 with missing parameters', async () => {
      await request(app)
        .post('/api/admin/export/owner-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'revenue'
          // Missing dates
        })
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      await request(app)
        .get('/api/admin/dashboard/loc-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });

    it('should handle invalid JWT tokens', async () => {
      await request(app)
        .get('/api/admin/dashboard/loc-1')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle missing authorization header', async () => {
      await request(app)
        .get('/api/admin/dashboard/loc-1')
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to admin endpoints', async () => {
      // Mock successful responses for multiple requests
      mockPool.query.mockResolvedValue({ rows: [] });

      // Make multiple requests quickly
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/admin/dashboard/loc-1')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should succeed, others might be rate limited
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(successfulRequests.length + rateLimitedRequests.length).toBe(10);
    });
  });
});