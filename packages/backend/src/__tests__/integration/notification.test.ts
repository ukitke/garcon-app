import request from 'supertest';
import { app } from '../../index';
import pool from '../../config/database';

// Mock database and Redis
jest.mock('../../config/database');
jest.mock('../../config/redis');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('Notification API Integration Tests', () => {
  const mockAuthToken = 'Bearer valid-jwt-token';
  const mockLocationId = 'location-123';
  const mockCallId = 'call-123';
  const mockWaiterId = 'waiter-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/notifications/waiter-calls', () => {
    it('should create waiter call successfully', async () => {
      const callData = {
        sessionId: 'session-123',
        participantId: 'participant-123',
        callType: 'assistance',
        message: 'Need help with menu',
        priority: 'medium',
      };

      const mockCall = {
        id: mockCallId,
        sessionId: 'session-123',
        tableId: 'table-123',
        participantId: 'participant-123',
        locationId: mockLocationId,
        callType: 'assistance',
        priority: 'medium',
        message: 'Need help with menu',
        status: 'pending',
        assignedWaiterId: null,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
      };

      // Mock the service call
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ table_id: 'table-123', location_id: mockLocationId }] }) // Session info
          .mockResolvedValueOnce({ rows: [mockCall] }) // Create call
          .mockResolvedValueOnce({}) // Create notification
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const response = await request(app)
        .post('/api/v1/notifications/waiter-calls')
        .set('Authorization', mockAuthToken)
        .send(callData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.call.id).toBe(mockCallId);
      expect(response.body.data.estimatedResponseTime).toBeDefined();
    });

    it('should return 400 for invalid call data', async () => {
      const invalidData = {
        sessionId: 'invalid-uuid',
        participantId: 'participant-123',
        callType: 'invalid-type',
      };

      const response = await request(app)
        .post('/api/v1/notifications/waiter-calls')
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 without authentication', async () => {
      const callData = {
        sessionId: 'session-123',
        participantId: 'participant-123',
        callType: 'assistance',
      };

      await request(app)
        .post('/api/v1/notifications/waiter-calls')
        .send(callData)
        .expect(401);
    });
  });

  describe('GET /api/v1/notifications/waiter-calls/:callId', () => {
    it('should return waiter call details', async () => {
      const mockCall = {
        id: mockCallId,
        sessionId: 'session-123',
        tableId: 'table-123',
        participantId: 'participant-123',
        locationId: mockLocationId,
        callType: 'assistance',
        priority: 'medium',
        message: 'Need help',
        status: 'pending',
        assignedWaiterId: null,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockCall] });

      const response = await request(app)
        .get(`/api/v1/notifications/waiter-calls/${mockCallId}`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockCallId);
      expect(response.body.data.callType).toBe('assistance');
    });

    it('should return 404 when call not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/api/v1/notifications/waiter-calls/${mockCallId}`)
        .set('Authorization', mockAuthToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Waiter call not found');
    });
  });

  describe('POST /api/v1/notifications/waiter-calls/:callId/acknowledge', () => {
    it('should acknowledge call successfully', async () => {
      const acknowledgeData = {
        waiterId: mockWaiterId,
        estimatedArrivalTime: 5,
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ location_id: mockLocationId }] }) // Update call
          .mockResolvedValueOnce({}) // Add call to waiter
          .mockResolvedValueOnce({}) // Create notification
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const response = await request(app)
        .post(`/api/v1/notifications/waiter-calls/${mockCallId}/acknowledge`)
        .set('Authorization', mockAuthToken)
        .send(acknowledgeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Call acknowledged successfully');
    });

    it('should return 400 for invalid waiter ID', async () => {
      const invalidData = {
        waiterId: 'invalid-uuid',
        estimatedArrivalTime: 5,
      };

      const response = await request(app)
        .post(`/api/v1/notifications/waiter-calls/${mockCallId}/acknowledge`)
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/notifications/waiter-calls/:callId/resolve', () => {
    it('should resolve call successfully', async () => {
      const resolveData = {
        waiterId: mockWaiterId,
        resolution: 'Issue resolved successfully',
        customerSatisfaction: 5,
      };

      const mockCallData = {
        created_at: new Date(Date.now() - 300000),
        acknowledged_at: new Date(Date.now() - 240000),
        location_id: mockLocationId,
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [mockCallData] }) // Get call info
          .mockResolvedValueOnce({}) // Update call status
          .mockResolvedValueOnce({}) // Record response metrics
          .mockResolvedValueOnce({}) // Remove call from waiter
          .mockResolvedValueOnce({}) // Create notification
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const response = await request(app)
        .post(`/api/v1/notifications/waiter-calls/${mockCallId}/resolve`)
        .set('Authorization', mockAuthToken)
        .send(resolveData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Call resolved successfully');
    });

    it('should return 400 for missing resolution', async () => {
      const invalidData = {
        waiterId: mockWaiterId,
        // Missing resolution
        customerSatisfaction: 5,
      };

      const response = await request(app)
        .post(`/api/v1/notifications/waiter-calls/${mockCallId}/resolve`)
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /api/v1/notifications/waiter-calls/:callId', () => {
    it('should cancel call successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ location_id: mockLocationId }],
      });

      const response = await request(app)
        .delete(`/api/v1/notifications/waiter-calls/${mockCallId}`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Call cancelled successfully');
    });

    it('should return 404 when call cannot be cancelled', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete(`/api/v1/notifications/waiter-calls/${mockCallId}`)
        .set('Authorization', mockAuthToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Call not found or cannot be cancelled');
    });
  });

  describe('GET /api/v1/notifications/locations/:locationId/active-calls', () => {
    it('should return active calls for location', async () => {
      const mockCalls = [
        {
          id: 'call-1',
          sessionId: 'session-1',
          tableId: 'table-1',
          participantId: 'participant-1',
          locationId: mockLocationId,
          callType: 'assistance',
          priority: 'urgent',
          message: 'Emergency',
          status: 'pending',
          assignedWaiterId: null,
          createdAt: new Date().toISOString(),
          acknowledgedAt: null,
          resolvedAt: null,
          tableNumber: '1',
          waiterName: null,
        },
        {
          id: 'call-2',
          sessionId: 'session-2',
          tableId: 'table-2',
          participantId: 'participant-2',
          locationId: mockLocationId,
          callType: 'bill',
          priority: 'medium',
          message: 'Ready to pay',
          status: 'acknowledged',
          assignedWaiterId: mockWaiterId,
          createdAt: new Date().toISOString(),
          acknowledgedAt: new Date().toISOString(),
          resolvedAt: null,
          tableNumber: '2',
          waiterName: 'John Doe',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockCalls });

      const response = await request(app)
        .get(`/api/v1/notifications/locations/${mockLocationId}/active-calls`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].priority).toBe('urgent');
      expect(response.body.data[1].status).toBe('acknowledged');
    });

    it('should return empty array when no active calls', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/api/v1/notifications/locations/${mockLocationId}/active-calls`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/notifications/locations/:locationId/waiters', () => {
    it('should return waiters for location', async () => {
      const mockWaiters = [
        {
          waiterId: 'waiter-1',
          locationId: mockLocationId,
          status: 'available',
          currentCalls: [],
          lastSeen: new Date().toISOString(),
          waiterName: 'John Doe',
        },
        {
          waiterId: 'waiter-2',
          locationId: mockLocationId,
          status: 'busy',
          currentCalls: ['call-1'],
          lastSeen: new Date().toISOString(),
          waiterName: 'Jane Smith',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockWaiters });

      const response = await request(app)
        .get(`/api/v1/notifications/locations/${mockLocationId}/waiters`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].status).toBe('available');
      expect(response.body.data[1].status).toBe('busy');
    });
  });

  describe('PUT /api/v1/notifications/waiters/:waiterId/status', () => {
    it('should update waiter status successfully', async () => {
      const statusData = {
        locationId: mockLocationId,
        status: 'available',
        currentCalls: [],
      };

      mockPool.query.mockResolvedValueOnce({});

      const response = await request(app)
        .put(`/api/v1/notifications/waiters/${mockWaiterId}/status`)
        .set('Authorization', mockAuthToken)
        .send(statusData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Waiter status updated successfully');
    });

    it('should return 400 for invalid status', async () => {
      const invalidData = {
        locationId: mockLocationId,
        status: 'invalid-status',
        currentCalls: [],
      };

      const response = await request(app)
        .put(`/api/v1/notifications/waiters/${mockWaiterId}/status`)
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/notifications/locations/:locationId/call-history', () => {
    it('should return call history with filters', async () => {
      const mockHistory = [
        {
          id: 'call-1',
          sessionId: 'session-1',
          tableId: 'table-1',
          participantId: 'participant-1',
          locationId: mockLocationId,
          callType: 'assistance',
          priority: 'medium',
          message: 'Help needed',
          status: 'resolved',
          assignedWaiterId: mockWaiterId,
          createdAt: new Date().toISOString(),
          acknowledgedAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          tableNumber: '1',
          waiterName: 'John Doe',
          responseTimeSeconds: 180,
          customerSatisfaction: 5,
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockHistory });

      const response = await request(app)
        .get(`/api/v1/notifications/locations/${mockLocationId}/call-history`)
        .query({
          status: 'resolved',
          callType: 'assistance',
        })
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('resolved');
      expect(response.body.data[0].responseTimeSeconds).toBe(180);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent call creations', async () => {
      const callData = {
        sessionId: 'session-123',
        participantId: 'participant-123',
        callType: 'assistance',
        priority: 'medium',
      };

      const mockCall = {
        id: 'call-123',
        sessionId: 'session-123',
        tableId: 'table-123',
        participantId: 'participant-123',
        locationId: mockLocationId,
        callType: 'assistance',
        priority: 'medium',
        status: 'pending',
        assignedWaiterId: null,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValue({}) // All queries succeed
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ table_id: 'table-123', location_id: mockLocationId }] }) // Session
          .mockResolvedValueOnce({ rows: [mockCall] }) // Create call
          .mockResolvedValueOnce({}) // Notification
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Create 5 concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/v1/notifications/waiter-calls')
          .set('Authorization', mockAuthToken)
          .send(callData)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle high-frequency status updates', async () => {
      const statusData = {
        locationId: mockLocationId,
        status: 'available',
        currentCalls: [],
      };

      mockPool.query.mockResolvedValue({});

      // Create 10 rapid status updates
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .put(`/api/v1/notifications/waiters/${mockWaiterId}/status`)
          .set('Authorization', mockAuthToken)
          .send(statusData)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should respond quickly to location queries', async () => {
      const mockCalls = Array.from({ length: 50 }, (_, i) => ({
        id: `call-${i}`,
        sessionId: `session-${i}`,
        tableId: `table-${i}`,
        participantId: `participant-${i}`,
        locationId: mockLocationId,
        callType: 'assistance',
        priority: 'medium',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }));

      mockPool.query.mockResolvedValueOnce({ rows: mockCalls });

      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/v1/notifications/locations/${mockLocationId}/active-calls`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(50);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});