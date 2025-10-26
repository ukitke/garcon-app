import request from 'supertest';
import { app } from '../../index';
import pool from '../../config/database';
import redisClient from '../../config/redis';

// Mock external dependencies
jest.mock('../../config/database');
jest.mock('../../config/redis');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

describe('Location Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/locations/nearby', () => {
    it('should detect nearby locations successfully', async () => {
      const mockLocations = [
        {
          id: 'location-1',
          name: 'Test Restaurant',
          address: '123 Test St',
          latitude: 40.7128,
          longitude: -74.0060,
          settings: { coverageRadius: 50 },
          distance: 25
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockLocations
      });

      const response = await request(app)
        .get('/api/v1/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 })
        .expect(200);

      expect(response.body.locations).toHaveLength(1);
      expect(response.body.locations[0].name).toBe('Test Restaurant');
      expect(response.body.locations[0].isWithinRange).toBe(true);
      expect(response.body.detectedLocation).toBeDefined();
      expect(response.body.requiresManualSelection).toBe(false);
    });

    it('should require manual selection when no location is within range', async () => {
      const mockLocations = [
        {
          id: 'location-1',
          name: 'Distant Restaurant',
          address: '123 Test St',
          latitude: 40.7128,
          longitude: -74.0060,
          settings: { coverageRadius: 50 },
          distance: 100
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockLocations
      });

      const response = await request(app)
        .get('/api/v1/locations/nearby')
        .query({ lat: 40.7128, lng: -74.0060 })
        .expect(200);

      expect(response.body.locations).toHaveLength(1);
      expect(response.body.locations[0].isWithinRange).toBe(false);
      expect(response.body.detectedLocation).toBeUndefined();
      expect(response.body.requiresManualSelection).toBe(true);
    });

    it('should return 400 for missing coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/locations/nearby')
        .query({ lat: 40.7128 }) // Missing lng
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toContain('Latitude and longitude are required');
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/locations/nearby')
        .query({ lat: 'invalid', lng: -74.0060 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid latitude or longitude format');
    });
  });

  describe('GET /api/v1/locations/:locationId', () => {
    it('should get location details successfully', async () => {
      const mockLocation = {
        id: 'location-1',
        name: 'Test Restaurant',
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
        ownerId: 'owner-1',
        subscriptionTier: 'free',
        isActive: true,
        settings: { coverageRadius: 50 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockLocation]
      });

      const response = await request(app)
        .get('/api/v1/locations/location-1')
        .expect(200);

      expect(response.body.name).toBe('Test Restaurant');
      expect(response.body.id).toBe('location-1');
    });

    it('should return 404 for non-existent location', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/v1/locations/non-existent')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/locations/:locationId/tables', () => {
    it('should get location tables with availability status', async () => {
      const mockTables = [
        {
          id: 'table-1',
          locationId: 'location-1',
          number: '1',
          capacity: 4,
          isActive: true,
          createdAt: new Date(),
          sessionId: null,
          sessionStartTime: null,
          sessionEndTime: null,
          sessionIsActive: null
        },
        {
          id: 'table-2',
          locationId: 'location-1',
          number: '2',
          capacity: 2,
          isActive: true,
          createdAt: new Date(),
          sessionId: 'session-1',
          sessionStartTime: new Date(),
          sessionEndTime: null,
          sessionIsActive: true
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockTables
      });

      const response = await request(app)
        .get('/api/v1/locations/location-1/tables')
        .expect(200);

      expect(response.body.tables).toHaveLength(2);
      expect(response.body.tables[0].currentSession).toBeUndefined();
      expect(response.body.tables[1].currentSession).toBeDefined();
    });
  });

  describe('POST /api/v1/locations/:locationId/checkin', () => {
    const mockAuthToken = 'Bearer valid-token';

    beforeEach(() => {
      // Mock auth middleware
      mockRedisClient.get.mockResolvedValue('valid-token');
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          role: 'customer'
        }]
      });
    });

    it('should checkin to table successfully', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      // Mock transaction queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Table validation
          rows: [{
            id: 'table-1',
            number: '1',
            capacity: 4
          }]
        })
        .mockResolvedValueOnce({ // Occupancy check
          rows: [{ occupancy: '0' }]
        })
        .mockResolvedValueOnce({ // Existing session check
          rows: []
        })
        .mockResolvedValueOnce({ // Create new session
          rows: [{ id: 'session-1' }]
        })
        .mockResolvedValueOnce({ // Add participant
          rows: [{ id: 'participant-1' }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const response = await request(app)
        .post('/api/v1/locations/location-1/checkin')
        .set('Authorization', mockAuthToken)
        .send({ tableNumber: '1' })
        .expect(201);

      expect(response.body.sessionId).toBe('session-1');
      expect(response.body.participantId).toBe('participant-1');
      expect(response.body.fantasyName).toBeDefined();
      expect(response.body.tableInfo.number).toBe('1');
    });

    it('should join existing session when table is occupied', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      // Mock transaction queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Table validation
          rows: [{
            id: 'table-1',
            number: '1',
            capacity: 4
          }]
        })
        .mockResolvedValueOnce({ // Occupancy check
          rows: [{ occupancy: '1' }]
        })
        .mockResolvedValueOnce({ // Existing session check
          rows: [{ id: 'existing-session' }]
        })
        .mockResolvedValueOnce({ // Add participant
          rows: [{ id: 'participant-2' }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const response = await request(app)
        .post('/api/v1/locations/location-1/checkin')
        .set('Authorization', mockAuthToken)
        .send({ tableNumber: '1' })
        .expect(201);

      expect(response.body.sessionId).toBe('existing-session');
      expect(response.body.participantId).toBe('participant-2');
    });

    it('should return 404 for non-existent table', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Table not found
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const response = await request(app)
        .post('/api/v1/locations/location-1/checkin')
        .set('Authorization', mockAuthToken)
        .send({ tableNumber: '999' })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 409 when table is at full capacity', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Table validation
          rows: [{
            id: 'table-1',
            number: '1',
            capacity: 2
          }]
        })
        .mockResolvedValueOnce({ // Occupancy check - full capacity
          rows: [{ occupancy: '2' }]
        })
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const response = await request(app)
        .post('/api/v1/locations/location-1/checkin')
        .set('Authorization', mockAuthToken)
        .send({ tableNumber: '1' })
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('full capacity');
    });

    it('should return 400 for missing table number', async () => {
      const response = await request(app)
        .post('/api/v1/locations/location-1/checkin')
        .set('Authorization', mockAuthToken)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/locations/tables/:tableId/session', () => {
    const mockAuthToken = 'Bearer valid-token';

    beforeEach(() => {
      // Mock auth middleware
      mockRedisClient.get.mockResolvedValue('valid-token');
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          role: 'customer'
        }]
      });
    });

    it('should get active table session with participants', async () => {
      const mockSessionData = [
        {
          id: 'session-1',
          tableId: 'table-1',
          startTime: new Date(),
          endTime: null,
          isActive: true,
          createdAt: new Date(),
          participantId: 'participant-1',
          participantUserId: 'user-1',
          participantFantasyName: 'Brave Dragon',
          participantJoinedAt: new Date()
        },
        {
          id: 'session-1',
          tableId: 'table-1',
          startTime: new Date(),
          endTime: null,
          isActive: true,
          createdAt: new Date(),
          participantId: 'participant-2',
          participantUserId: 'user-2',
          participantFantasyName: 'Swift Eagle',
          participantJoinedAt: new Date()
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockSessionData
      });

      const response = await request(app)
        .get('/api/v1/locations/tables/table-1/session')
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.id).toBe('session-1');
      expect(response.body.participants).toHaveLength(2);
      expect(response.body.participants[0].fantasyName).toBe('Brave Dragon');
      expect(response.body.participants[1].fantasyName).toBe('Swift Eagle');
    });

    it('should return 404 for table with no active session', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/v1/locations/tables/table-1/session')
        .set('Authorization', mockAuthToken)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/locations/sessions/:sessionId/end', () => {
    const mockAuthToken = 'Bearer valid-token';

    beforeEach(() => {
      // Mock auth middleware
      mockRedisClient.get.mockResolvedValue('valid-token');
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          role: 'customer'
        }]
      });
    });

    it('should end table session successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1
      });

      const response = await request(app)
        .post('/api/v1/locations/sessions/session-1/end')
        .set('Authorization', mockAuthToken)
        .expect(204);

      expect(response.body).toEqual({});
    });
  });

  describe('Table Management - Owner Operations', () => {
    const mockOwnerToken = 'Bearer owner-token';

    beforeEach(() => {
      // Mock auth middleware for owner
      mockRedisClient.get.mockResolvedValue('owner-token');
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'owner-1',
          email: 'owner@example.com',
          role: 'owner'
        }]
      });
    });

    describe('POST /api/v1/locations', () => {
      it('should create location successfully for owner', async () => {
        const mockLocation = {
          id: 'location-1',
          name: 'New Restaurant',
          address: '456 New St',
          latitude: 40.7589,
          longitude: -73.9851,
          ownerId: 'owner-1',
          subscriptionTier: 'free',
          isActive: true,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockLocation]
        });

        const locationData = {
          name: 'New Restaurant',
          address: '456 New St',
          latitude: 40.7589,
          longitude: -73.9851
        };

        const response = await request(app)
          .post('/api/v1/locations')
          .set('Authorization', mockOwnerToken)
          .send(locationData)
          .expect(201);

        expect(response.body.name).toBe('New Restaurant');
        expect(response.body.ownerId).toBe('owner-1');
      });

      it('should return 403 for non-owner users', async () => {
        // Mock customer user
        mockPool.query.mockReset();
        mockPool.query.mockResolvedValueOnce({
          rows: [{
            id: 'user-1',
            email: 'customer@example.com',
            role: 'customer'
          }]
        });

        const locationData = {
          name: 'New Restaurant',
          address: '456 New St',
          latitude: 40.7589,
          longitude: -73.9851
        };

        const response = await request(app)
          .post('/api/v1/locations')
          .set('Authorization', 'Bearer customer-token')
          .send(locationData)
          .expect(403);

        expect(response.body.error.code).toBe('FORBIDDEN');
      });
    });

    describe('PUT /api/v1/locations/:locationId', () => {
      it('should update location successfully for owner', async () => {
        const mockUpdatedLocation = {
          id: 'location-1',
          name: 'Updated Restaurant',
          address: '456 Updated St',
          latitude: 40.7589,
          longitude: -73.9851,
          ownerId: 'owner-1',
          subscriptionTier: 'free',
          isActive: true,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockPool.query.mockResolvedValueOnce({
          rows: [mockUpdatedLocation]
        });

        const updateData = {
          name: 'Updated Restaurant',
          address: '456 Updated St'
        };

        const response = await request(app)
          .put('/api/v1/locations/location-1')
          .set('Authorization', mockOwnerToken)
          .send(updateData)
          .expect(200);

        expect(response.body.name).toBe('Updated Restaurant');
      });

      it('should return 404 for location not owned by user', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: []
        });

        const updateData = {
          name: 'Updated Restaurant'
        };

        const response = await request(app)
          .put('/api/v1/locations/location-1')
          .set('Authorization', mockOwnerToken)
          .send(updateData)
          .expect(404);

        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });
  });
});