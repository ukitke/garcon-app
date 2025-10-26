import { TableService } from '../../services/tableService';
import { Pool } from 'pg';

// Mock the database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
} as unknown as jest.Mocked<Pool>;

describe('TableService', () => {
  let tableService: TableService;

  beforeEach(() => {
    tableService = new TableService(mockPool);
    jest.clearAllMocks();
  });

  describe('createTable', () => {
    it('should create table successfully', async () => {
      const mockTable = {
        id: 'table-1',
        locationId: 'location-1',
        number: '1',
        capacity: 4,
        isActive: true,
        createdAt: new Date()
      };

      // Mock location ownership verification
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'location-1' }] }) // Location exists
        .mockResolvedValueOnce({ rows: [mockTable] }); // Table creation

      const result = await tableService.createTable('owner-1', {
        locationId: 'location-1',
        number: '1',
        capacity: 4
      });

      expect(result).toEqual(mockTable);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error when location not found or access denied', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Location not found

      await expect(tableService.createTable('owner-1', {
        locationId: 'location-1',
        number: '1',
        capacity: 4
      })).rejects.toThrow('Location not found or access denied');
    });

    it('should throw error when table number already exists', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'location-1' }] }) // Location exists
        .mockRejectedValueOnce({ code: '23505' }); // Unique constraint violation

      await expect(tableService.createTable('owner-1', {
        locationId: 'location-1',
        number: '1',
        capacity: 4
      })).rejects.toThrow('Table number already exists for this location');
    });
  });

  describe('getTableAvailability', () => {
    it('should return table availability with session info', async () => {
      const mockTables = [
        {
          tableId: 'table-1',
          number: '1',
          capacity: 4,
          isActive: true,
          sessionId: null,
          sessionStartTime: null,
          currentOccupancy: '0'
        },
        {
          tableId: 'table-2',
          number: '2',
          capacity: 2,
          isActive: true,
          sessionId: 'session-1',
          sessionStartTime: new Date(),
          currentOccupancy: '1'
        },
        {
          tableId: 'table-3',
          number: '3',
          capacity: 2,
          isActive: true,
          sessionId: 'session-2',
          sessionStartTime: new Date(),
          currentOccupancy: '2'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockTables
      });

      const result = await tableService.getTableAvailability('location-1');

      expect(result).toHaveLength(3);
      
      // Table 1: No session, available
      expect(result[0].isAvailable).toBe(true);
      expect(result[0].currentOccupancy).toBe(0);
      expect(result[0].sessionId).toBeUndefined();
      
      // Table 2: Has session but not full, available
      expect(result[1].isAvailable).toBe(true);
      expect(result[1].currentOccupancy).toBe(1);
      expect(result[1].sessionId).toBe('session-1');
      
      // Table 3: Has session and full, not available
      expect(result[2].isAvailable).toBe(false);
      expect(result[2].currentOccupancy).toBe(2);
      expect(result[2].sessionId).toBe('session-2');
    });

    it('should handle tables with no sessions', async () => {
      const mockTables = [
        {
          tableId: 'table-1',
          number: '1',
          capacity: 4,
          isActive: true,
          sessionId: null,
          sessionStartTime: null,
          currentOccupancy: '0'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockTables
      });

      const result = await tableService.getTableAvailability('location-1');

      expect(result).toHaveLength(1);
      expect(result[0].isAvailable).toBe(true);
      expect(result[0].currentOccupancy).toBe(0);
    });
  });

  describe('validateTableForCheckin', () => {
    it('should validate available table successfully', async () => {
      const mockTableData = [
        {
          tableId: 'table-1',
          capacity: 4,
          sessionId: 'session-1',
          occupancy: '2'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockTableData
      });

      const result = await tableService.validateTableForCheckin('location-1', '1');

      expect(result.tableId).toBe('table-1');
      expect(result.isAvailable).toBe(true);
      expect(result.currentSession).toBe('session-1');
      expect(result.occupancy).toBe(2);
      expect(result.capacity).toBe(4);
    });

    it('should indicate table is not available when at capacity', async () => {
      const mockTableData = [
        {
          tableId: 'table-1',
          capacity: 2,
          sessionId: 'session-1',
          occupancy: '2'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockTableData
      });

      const result = await tableService.validateTableForCheckin('location-1', '1');

      expect(result.isAvailable).toBe(false);
      expect(result.occupancy).toBe(2);
      expect(result.capacity).toBe(2);
    });

    it('should throw error when table not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      await expect(tableService.validateTableForCheckin('location-1', '999'))
        .rejects.toThrow('Table not found or inactive');
    });

    it('should handle table with no session', async () => {
      const mockTableData = [
        {
          tableId: 'table-1',
          capacity: 4,
          sessionId: null,
          occupancy: '0'
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockTableData
      });

      const result = await tableService.validateTableForCheckin('location-1', '1');

      expect(result.isAvailable).toBe(true);
      expect(result.currentSession).toBeUndefined();
      expect(result.occupancy).toBe(0);
    });
  });

  describe('getSessionParticipants', () => {
    it('should return session participants', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          sessionId: 'session-1',
          userId: 'user-1',
          fantasyName: 'Brave Dragon',
          joinedAt: new Date('2023-01-01T10:00:00Z')
        },
        {
          id: 'participant-2',
          sessionId: 'session-1',
          userId: 'user-2',
          fantasyName: 'Swift Eagle',
          joinedAt: new Date('2023-01-01T10:05:00Z')
        }
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockParticipants
      });

      const result = await tableService.getSessionParticipants('session-1');

      expect(result).toHaveLength(2);
      expect(result[0].fantasyName).toBe('Brave Dragon');
      expect(result[1].fantasyName).toBe('Swift Eagle');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY joined_at ASC'),
        ['session-1']
      );
    });

    it('should return empty array when no participants', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await tableService.getSessionParticipants('session-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('removeParticipantFromSession', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    beforeEach(() => {
      mockPool.connect.mockResolvedValue(mockClient as any);
    });

    it('should remove participant and keep session active when others remain', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Remove participant
          rows: [{ session_id: 'session-1' }]
        })
        .mockResolvedValueOnce({ // Count remaining participants
          rows: [{ count: '1' }]
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      await tableService.removeParticipantFromSession('participant-1');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE table_sessions'),
        expect.any(Array)
      );
    });

    it('should end session when last participant is removed', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ // Remove participant
          rows: [{ session_id: 'session-1' }]
        })
        .mockResolvedValueOnce({ // Count remaining participants
          rows: [{ count: '0' }]
        })
        .mockResolvedValueOnce(undefined) // End session
        .mockResolvedValueOnce(undefined); // COMMIT

      await tableService.removeParticipantFromSession('participant-1');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE table_sessions'),
        ['session-1']
      );
    });

    it('should throw error when participant not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Participant not found
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(tableService.removeParticipantFromSession('non-existent'))
        .rejects.toThrow('Participant not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback transaction on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(tableService.removeParticipantFromSession('participant-1'))
        .rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getLocationTablesForOwner', () => {
    it('should return tables for owner', async () => {
      const mockTables = [
        {
          id: 'table-1',
          locationId: 'location-1',
          number: '1',
          capacity: 4,
          isActive: true,
          createdAt: new Date(),
          sessionId: 'session-1',
          sessionStartTime: new Date(),
          sessionEndTime: null,
          sessionIsActive: true,
          participantCount: '2'
        },
        {
          id: 'table-2',
          locationId: 'location-1',
          number: '2',
          capacity: 2,
          isActive: true,
          createdAt: new Date(),
          sessionId: null,
          sessionStartTime: null,
          sessionEndTime: null,
          sessionIsActive: null,
          participantCount: '0'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'location-1' }] }) // Ownership verification
        .mockResolvedValueOnce({ rows: mockTables }); // Tables query

      const result = await tableService.getLocationTablesForOwner('owner-1', 'location-1');

      expect(result).toHaveLength(2);
      expect(result[0].currentSession).toBeDefined();
      expect(result[1].currentSession).toBeUndefined();
    });

    it('should throw error when location not owned by user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Ownership verification fails

      await expect(tableService.getLocationTablesForOwner('owner-1', 'location-1'))
        .rejects.toThrow('Location not found or access denied');
    });
  });

  describe('deleteTable', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    beforeEach(() => {
      mockPool.connect.mockResolvedValue(mockClient as any);
    });

    it('should delete table successfully when no active sessions', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // No active sessions
        .mockResolvedValueOnce({ rowCount: 1 }) // Delete successful
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await tableService.deleteTable('owner-1', 'table-1');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error when table has active sessions', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'session-1' }] }) // Active session exists
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(tableService.deleteTable('owner-1', 'table-1'))
        .rejects.toThrow('Cannot delete table with active sessions');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return false when table not found or access denied', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // No active sessions
        .mockResolvedValueOnce({ rowCount: 0 }) // Delete failed (not found)
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await tableService.deleteTable('owner-1', 'table-1');

      expect(result).toBe(false);
    });
  });

  describe('updateTable', () => {
    it('should update table successfully', async () => {
      const mockUpdatedTable = {
        id: 'table-1',
        locationId: 'location-1',
        number: '1A',
        capacity: 6,
        isActive: true,
        createdAt: new Date()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedTable]
      });

      const result = await tableService.updateTable('owner-1', 'table-1', {
        number: '1A',
        capacity: 6
      });

      expect(result).toEqual(mockUpdatedTable);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tables'),
        expect.arrayContaining(['1A', 6, 'table-1', 'owner-1'])
      );
    });

    it('should return null when table not found or access denied', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await tableService.updateTable('owner-1', 'table-1', {
        capacity: 6
      });

      expect(result).toBeNull();
    });

    it('should return current table when no updates provided', async () => {
      const mockTable = {
        id: 'table-1',
        locationId: 'location-1',
        number: '1',
        capacity: 4,
        isActive: true,
        createdAt: new Date()
      };

      // Mock getTableById call
      mockPool.query.mockResolvedValueOnce({
        rows: [mockTable]
      });

      const result = await tableService.updateTable('owner-1', 'table-1', {});

      expect(result).toEqual(mockTable);
    });
  });

  describe('getTableById', () => {
    it('should return table with current session', async () => {
      const mockTable = {
        id: 'table-1',
        locationId: 'location-1',
        number: '1',
        capacity: 4,
        isActive: true,
        createdAt: new Date(),
        sessionId: 'session-1',
        sessionStartTime: new Date(),
        sessionEndTime: null,
        sessionIsActive: true
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockTable]
      });

      const result = await tableService.getTableById('table-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('table-1');
      expect(result!.currentSession).toBeDefined();
      expect(result!.currentSession!.id).toBe('session-1');
    });

    it('should return table without session', async () => {
      const mockTable = {
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
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockTable]
      });

      const result = await tableService.getTableById('table-1');

      expect(result).toBeDefined();
      expect(result!.currentSession).toBeUndefined();
    });

    it('should return null when table not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await tableService.getTableById('non-existent');

      expect(result).toBeNull();
    });
  });
});