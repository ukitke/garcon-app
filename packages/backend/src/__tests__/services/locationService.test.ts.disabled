import { LocationService } from '../../services/locationService';
import { Pool } from 'pg';

// Mock the database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
} as unknown as jest.Mocked<Pool>;

describe('LocationService', () => {
  let locationService: LocationService;

  beforeEach(() => {
    locationService = new LocationService(mockPool);
    jest.clearAllMocks();
  });

  describe('detectNearbyLocations', () => {
    it('should detect locations within coverage radius', async () => {
      const mockLocations = [
        {
          id: 'location-1',
          name: 'Close Restaurant',
          address: '123 Test St',
          latitude: 40.7128,
          longitude: -74.0060,
          settings: { coverageRadius: 50 },
          distance: 25
        },
        {
          id: 'location-2',
          name: 'Far Restaurant',
          address: '456 Test Ave',
          latitude: 40.7200,
          longitude: -74.0100,
          settings: { coverageRadius: 50 },
          distance: 75
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockLocations
      });

      const result = await locationService.detectNearbyLocations({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10
      });

      expect(result.locations).toHaveLength(2);
      expect(result.locations[0].isWithinRange).toBe(true);
      expect(result.locations[1].isWithinRange).toBe(false);
      expect(result.detectedLocation).toBeDefined();
      expect(result.detectedLocation?.id).toBe('location-1');
      expect(result.requiresManualSelection).toBe(false);
    });

    it('should require manual selection when no locations are within range', async () => {
      const mockLocations = [
        {
          id: 'location-1',
          name: 'Far Restaurant',
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

      const result = await locationService.detectNearbyLocations({
        latitude: 40.7128,
        longitude: -74.0060
      });

      expect(result.locations).toHaveLength(1);
      expect(result.locations[0].isWithinRange).toBe(false);
      expect(result.detectedLocation).toBeUndefined();
      expect(result.requiresManualSelection).toBe(true);
    });

    it('should use default coverage radius when not specified', async () => {
      const mockLocations = [
        {
          id: 'location-1',
          name: 'Restaurant',
          address: '123 Test St',
          latitude: 40.7128,
          longitude: -74.0060,
          settings: {}, // No coverageRadius specified
          distance: 40
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockLocations
      });

      const result = await locationService.detectNearbyLocations({
        latitude: 40.7128,
        longitude: -74.0060
      });

      // Should use default 50m radius, so 40m distance should be within range
      expect(result.locations[0].isWithinRange).toBe(true);
      expect(result.detectedLocation).toBeDefined();
    });

    it('should limit search radius based on GPS accuracy', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      await locationService.detectNearbyLocations({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 200
      });

      // Should call query with doubled accuracy (400m) as search radius
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [40.7128, -74.0060, 400]
      );
    });

    it('should cap search radius at maximum limit', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      await locationService.detectNearbyLocations({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 1000 // Very high accuracy
      });

      // Should cap at 1000m maximum
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [40.7128, -74.0060, 1000]
      );
    });
  });

  describe('getLocationById', () => {
    it('should return location when found', async () => {
      const mockLocation = {
        id: 'location-1',
        name: 'Test Restaurant',
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
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

      const result = await locationService.getLocationById('location-1');

      expect(result).toEqual(mockLocation);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['location-1']
      );
    });

    it('should return null when location not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await locationService.getLocationById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('checkinToTable', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    beforeEach(() => {
      mockPool.connect.mockResolvedValue(mockClient as any);
    });

    it('should create new session and add participant', async () => {
      // Mock successful transaction
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
        .mockResolvedValueOnce({ // No existing session
          rows: []
        })
        .mockResolvedValueOnce({ // Create new session
          rows: [{ id: 'session-1' }]
        })
        .mockResolvedValueOnce({ // Add participant
          rows: [{ id: 'participant-1' }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await locationService.checkinToTable({
        locationId: 'location-1',
        tableNumber: '1',
        userId: 'user-1'
      });

      expect(result.sessionId).toBe('session-1');
      expect(result.participantId).toBe('participant-1');
      expect(result.fantasyName).toBeDefined();
      expect(result.tableInfo.number).toBe('1');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should join existing session', async () => {
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
        .mockResolvedValueOnce({ // Existing session
          rows: [{ id: 'existing-session' }]
        })
        .mockResolvedValueOnce({ // Add participant
          rows: [{ id: 'participant-2' }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await locationService.checkinToTable({
        locationId: 'location-1',
        tableNumber: '1',
        userId: 'user-2'
      });

      expect(result.sessionId).toBe('existing-session');
      expect(result.participantId).toBe('participant-2');
    });

    it('should throw error when table not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Table not found
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(locationService.checkinToTable({
        locationId: 'location-1',
        tableNumber: '999',
        userId: 'user-1'
      })).rejects.toThrow('Table not found or inactive');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when table is at full capacity', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Table validation
          rows: [{
            id: 'table-1',
            number: '1',
            capacity: 2
          }]
        })
        .mockResolvedValueOnce({ // Occupancy check - full
          rows: [{ occupancy: '2' }]
        })
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(locationService.checkinToTable({
        locationId: 'location-1',
        tableNumber: '1',
        userId: 'user-1'
      })).rejects.toThrow('Table is at full capacity');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback transaction on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Query fails

      await expect(locationService.checkinToTable({
        locationId: 'location-1',
        tableNumber: '1',
        userId: 'user-1'
      })).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getTableSession', () => {
    it('should return session with participants', async () => {
      const mockSessionData = [
        {
          id: 'session-1',
          tableId: 'table-1',
          startTime: new Date('2023-01-01T10:00:00Z'),
          endTime: null,
          isActive: true,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          participantId: 'participant-1',
          participantUserId: 'user-1',
          participantFantasyName: 'Brave Dragon',
          participantJoinedAt: new Date('2023-01-01T10:00:00Z')
        },
        {
          id: 'session-1',
          tableId: 'table-1',
          startTime: new Date('2023-01-01T10:00:00Z'),
          endTime: null,
          isActive: true,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          participantId: 'participant-2',
          participantUserId: 'user-2',
          participantFantasyName: 'Swift Eagle',
          participantJoinedAt: new Date('2023-01-01T10:05:00Z')
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockSessionData
      });

      const result = await locationService.getTableSession('table-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('session-1');
      expect(result!.participants).toHaveLength(2);
      expect(result!.participants[0].fantasyName).toBe('Brave Dragon');
      expect(result!.participants[1].fantasyName).toBe('Swift Eagle');
    });

    it('should return null when no active session', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await locationService.getTableSession('table-1');

      expect(result).toBeNull();
    });

    it('should handle session without participants', async () => {
      const mockSessionData = [
        {
          id: 'session-1',
          tableId: 'table-1',
          startTime: new Date('2023-01-01T10:00:00Z'),
          endTime: null,
          isActive: true,
          createdAt: new Date('2023-01-01T10:00:00Z'),
          participantId: null,
          participantUserId: null,
          participantFantasyName: null,
          participantJoinedAt: null
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockSessionData
      });

      const result = await locationService.getTableSession('table-1');

      expect(result).toBeDefined();
      expect(result!.participants).toHaveLength(0);
    });
  });

  describe('endTableSession', () => {
    it('should end session successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1
      });

      await locationService.endTableSession('session-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE table_sessions'),
        ['session-1']
      );
    });
  });

  describe('createLocation', () => {
    it('should create location successfully', async () => {
      const mockLocation = {
        id: 'location-1',
        name: 'New Restaurant',
        address: '123 New St',
        latitude: 40.7128,
        longitude: -74.0060,
        ownerId: 'owner-1',
        subscriptionTier: 'free',
        isActive: true,
        settings: { coverageRadius: 75 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockLocation]
      });

      const result = await locationService.createLocation('owner-1', {
        name: 'New Restaurant',
        address: '123 New St',
        latitude: 40.7128,
        longitude: -74.0060,
        settings: { coverageRadius: 75 }
      });

      expect(result).toEqual(mockLocation);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO locations'),
        expect.arrayContaining(['New Restaurant', '123 New St', 40.7128, -74.0060, 'owner-1'])
      );
    });
  });

  describe('generateFantasyName', () => {
    it('should generate different names on multiple calls', () => {
      const names = new Set();
      
      // Generate 20 names to test randomness
      for (let i = 0; i < 20; i++) {
        const name = (locationService as any).generateFantasyName();
        expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/); // Format: "Adjective Noun"
        names.add(name);
      }
      
      // Should have generated at least some different names
      expect(names.size).toBeGreaterThan(1);
    });

    it('should generate names with correct format', () => {
      const name = (locationService as any).generateFantasyName();
      
      expect(typeof name).toBe('string');
      expect(name.split(' ')).toHaveLength(2);
      expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    });
  });
});