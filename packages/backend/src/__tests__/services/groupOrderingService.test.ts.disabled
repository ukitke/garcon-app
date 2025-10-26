import { GroupOrderingService } from '../../services/groupOrderingService';
import { getPool } from '../../config/database';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../services/fantasyNameService');

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

(getPool as jest.Mock).mockReturnValue(mockPool);

// Mock fantasy name service
const mockFantasyNameService = {
  generateUniqueFantasyName: jest.fn(),
  validateFantasyName: jest.fn(),
};

jest.doMock('../../services/fantasyNameService', () => ({
  fantasyNameService: mockFantasyNameService,
}));

describe('GroupOrderingService', () => {
  let groupOrderingService: GroupOrderingService;

  beforeEach(() => {
    groupOrderingService = new GroupOrderingService();
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('joinTableSession', () => {
    const mockJoinRequest = {
      sessionId: 'session-123',
      userId: 'user-123',
    };

    it('should join table session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        table_id: 'table-123',
        table_number: '5',
        is_active: true,
      };

      const mockParticipant = {
        id: 'participant-123',
        sessionId: 'session-123',
        userId: 'user-123',
        fantasyName: 'Brave Dragon',
        joinedAt: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSession] }) // Get session
        .mockResolvedValueOnce({ rows: [] }) // Get existing names
        .mockResolvedValueOnce({ rows: [] }) // Check existing participant
        .mockResolvedValueOnce({ rows: [mockParticipant] }) // Insert participant
        .mockResolvedValueOnce({ rows: [{ participant_count: '2' }] }) // Get participant count
        .mockResolvedValueOnce({}); // COMMIT

      mockFantasyNameService.generateUniqueFantasyName.mockReturnValue('Brave Dragon');

      const result = await groupOrderingService.joinTableSession(mockJoinRequest);

      expect(result.participantId).toBe('participant-123');
      expect(result.fantasyName).toBe('Brave Dragon');
      expect(result.sessionInfo.tableNumber).toBe('5');
      expect(result.sessionInfo.participantCount).toBe(2);
    });

    it('should use custom fantasy name when provided', async () => {
      const requestWithCustomName = {
        ...mockJoinRequest,
        customFantasyName: 'Custom Hero',
      };

      const mockSession = {
        id: 'session-123',
        table_id: 'table-123',
        table_number: '5',
        is_active: true,
      };

      const mockParticipant = {
        id: 'participant-123',
        sessionId: 'session-123',
        userId: 'user-123',
        fantasyName: 'Custom Hero',
        joinedAt: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSession] }) // Get session
        .mockResolvedValueOnce({ rows: [] }) // Get existing names
        .mockResolvedValueOnce({ rows: [] }) // Check existing participant
        .mockResolvedValueOnce({ rows: [mockParticipant] }) // Insert participant
        .mockResolvedValueOnce({ rows: [{ participant_count: '1' }] }) // Get participant count
        .mockResolvedValueOnce({}); // COMMIT

      mockFantasyNameService.validateFantasyName.mockReturnValue(true);

      const result = await groupOrderingService.joinTableSession(requestWithCustomName);

      expect(result.fantasyName).toBe('Custom Hero');
      expect(mockFantasyNameService.validateFantasyName).toHaveBeenCalledWith('Custom Hero');
    });

    it('should throw error when session not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Session not found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        groupOrderingService.joinTableSession(mockJoinRequest)
      ).rejects.toThrow('Table session not found or not active');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when fantasy name is taken', async () => {
      const requestWithTakenName = {
        ...mockJoinRequest,
        customFantasyName: 'Taken Name',
      };

      const mockSession = {
        id: 'session-123',
        table_id: 'table-123',
        table_number: '5',
        is_active: true,
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSession] }) // Get session
        .mockResolvedValueOnce({ rows: [{ fantasy_name: 'Taken Name' }] }) // Existing names
        .mockResolvedValueOnce({}); // ROLLBACK

      mockFantasyNameService.validateFantasyName.mockReturnValue(true);

      await expect(
        groupOrderingService.joinTableSession(requestWithTakenName)
      ).rejects.toThrow('Fantasy name already taken');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when user already in session', async () => {
      const mockSession = {
        id: 'session-123',
        table_id: 'table-123',
        table_number: '5',
        is_active: true,
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSession] }) // Get session
        .mockResolvedValueOnce({ rows: [] }) // Get existing names
        .mockResolvedValueOnce({ rows: [{ id: 'existing-participant' }] }) // User already exists
        .mockResolvedValueOnce({}); // ROLLBACK

      mockFantasyNameService.generateUniqueFantasyName.mockReturnValue('Brave Dragon');

      await expect(
        groupOrderingService.joinTableSession(mockJoinRequest)
      ).rejects.toThrow('User is already part of this session');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('leaveTableSession', () => {
    const mockParticipantId = 'participant-123';

    it('should leave session successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ pending_count: '0' }] }) // No pending orders
        .mockResolvedValueOnce({ rows: [{ session_id: 'session-123' }] }) // Delete participant
        .mockResolvedValueOnce({ rows: [{ remaining_count: '1' }] }) // Remaining participants
        .mockResolvedValueOnce({}); // COMMIT

      const result = await groupOrderingService.leaveTableSession(mockParticipantId);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should end session when last participant leaves', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ pending_count: '0' }] }) // No pending orders
        .mockResolvedValueOnce({ rows: [{ session_id: 'session-123' }] }) // Delete participant
        .mockResolvedValueOnce({ rows: [{ remaining_count: '0' }] }) // No remaining participants
        .mockResolvedValueOnce({}) // End session
        .mockResolvedValueOnce({}); // COMMIT

      const result = await groupOrderingService.leaveTableSession(mockParticipantId);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE table_sessions SET is_active = false'),
        ['session-123']
      );
    });

    it('should throw error when participant has pending orders', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ pending_count: '2' }] }) // Has pending orders
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        groupOrderingService.leaveTableSession(mockParticipantId)
      ).rejects.toThrow('Cannot leave session with pending orders');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return false when participant not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ pending_count: '0' }] }) // No pending orders
        .mockResolvedValueOnce({ rows: [] }) // Participant not found
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await groupOrderingService.leaveTableSession(mockParticipantId);

      expect(result).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getGroupOrderSummary', () => {
    const mockSessionId = 'session-123';

    it('should return complete group order summary', async () => {
      const mockSession = {
        id: 'session-123',
        table_number: '5',
      };

      const mockParticipants = [
        {
          id: 'participant-1',
          sessionId: 'session-123',
          userId: 'user-1',
          fantasyName: 'Brave Dragon',
          joinedAt: new Date(),
        },
        {
          id: 'participant-2',
          sessionId: 'session-123',
          userId: 'user-2',
          fantasyName: 'Swift Eagle',
          joinedAt: new Date(),
        },
      ];

      const mockOrders = [
        {
          id: 'order-1',
          sessionId: 'session-123',
          participantId: 'participant-1',
          status: 'confirmed',
          totalAmount: 25.99,
          items: [],
        },
        {
          id: 'order-2',
          sessionId: 'session-123',
          participantId: 'participant-2',
          status: 'pending',
          totalAmount: 18.50,
          items: [],
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] }) // Get session
        .mockResolvedValueOnce({ rows: mockParticipants }); // Get participants

      // Mock the dynamic import and OrderService
      const mockOrderService = {
        getOrdersBySession: jest.fn().mockResolvedValue(mockOrders),
      };

      jest.doMock('../../services/orderService', () => ({
        OrderService: jest.fn().mockImplementation(() => mockOrderService),
      }));

      const result = await groupOrderingService.getGroupOrderSummary(mockSessionId);

      expect(result.sessionId).toBe('session-123');
      expect(result.tableNumber).toBe('5');
      expect(result.participants).toEqual(mockParticipants);
      expect(result.totalAmount).toBe(44.49);
      expect(result.individualTotals['participant-1']).toBe(25.99);
      expect(result.individualTotals['participant-2']).toBe(18.50);
    });

    it('should throw error when session not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        groupOrderingService.getGroupOrderSummary(mockSessionId)
      ).rejects.toThrow('Session not found');
    });
  });

  describe('updateParticipantFantasyName', () => {
    const mockParticipantId = 'participant-123';
    const mockNewName = 'New Fantasy Name';

    it('should update fantasy name successfully', async () => {
      const mockUpdatedParticipant = {
        id: 'participant-123',
        sessionId: 'session-123',
        userId: 'user-123',
        fantasyName: 'New Fantasy Name',
        joinedAt: new Date(),
      };

      mockFantasyNameService.validateFantasyName.mockReturnValue(true);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ session_id: 'session-123' }] }) // Get current participant
        .mockResolvedValueOnce({ rows: [] }) // Check name availability
        .mockResolvedValueOnce({ rows: [mockUpdatedParticipant] }) // Update name
        .mockResolvedValueOnce({}); // COMMIT

      const result = await groupOrderingService.updateParticipantFantasyName(
        mockParticipantId,
        mockNewName
      );

      expect(result?.fantasyName).toBe('New Fantasy Name');
      expect(mockFantasyNameService.validateFantasyName).toHaveBeenCalledWith(mockNewName);
    });

    it('should throw error for invalid fantasy name', async () => {
      mockFantasyNameService.validateFantasyName.mockReturnValue(false);

      await expect(
        groupOrderingService.updateParticipantFantasyName(mockParticipantId, 'Invalid@Name!')
      ).rejects.toThrow('Invalid fantasy name format');
    });

    it('should throw error when name is already taken', async () => {
      mockFantasyNameService.validateFantasyName.mockReturnValue(true);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ session_id: 'session-123' }] }) // Get current participant
        .mockResolvedValueOnce({ rows: [{ id: 'other-participant' }] }) // Name already taken
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        groupOrderingService.updateParticipantFantasyName(mockParticipantId, mockNewName)
      ).rejects.toThrow('Fantasy name already taken');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return null when participant not found', async () => {
      mockFantasyNameService.validateFantasyName.mockReturnValue(true);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Participant not found
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await groupOrderingService.updateParticipantFantasyName(
        mockParticipantId,
        mockNewName
      );

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('transferOrderToParticipant', () => {
    const mockOrderId = 'order-123';
    const mockFromParticipantId = 'participant-1';
    const mockToParticipantId = 'participant-2';

    it('should transfer order successfully', async () => {
      const mockTransferredOrder = {
        id: 'order-123',
        sessionId: 'session-123',
        participantId: 'participant-2',
        status: 'pending',
        notes: null,
        subtotal: 25.99,
        taxAmount: 2.60,
        totalAmount: 28.59,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOrderItems = [
        {
          id: 'order-item-1',
          orderId: 'order-123',
          menuItemId: 'item-123',
          quantity: 2,
          unitPrice: 12.99,
          totalPrice: 25.98,
          notes: null,
          createdAt: new Date(),
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // Verify participants in same session
          rows: [{ from_session: 'session-123', to_session: 'session-123' }],
        })
        .mockResolvedValueOnce({ // Verify order ownership and status
          rows: [{ id: 'order-123', participant_id: 'participant-1', status: 'pending' }],
        })
        .mockResolvedValueOnce({ rows: [mockTransferredOrder] }) // Transfer order
        .mockResolvedValueOnce({ rows: mockOrderItems }) // Get order items
        .mockResolvedValueOnce({}); // COMMIT

      const result = await groupOrderingService.transferOrderToParticipant(
        mockOrderId,
        mockFromParticipantId,
        mockToParticipantId
      );

      expect(result?.participantId).toBe('participant-2');
      expect(result?.items).toEqual(mockOrderItems);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error when participants not in same session', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // Different sessions
          rows: [{ from_session: 'session-123', to_session: 'session-456' }],
        })
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        groupOrderingService.transferOrderToParticipant(
          mockOrderId,
          mockFromParticipantId,
          mockToParticipantId
        )
      ).rejects.toThrow('Participants are not in the same session');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when order cannot be transferred', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // Same session
          rows: [{ from_session: 'session-123', to_session: 'session-123' }],
        })
        .mockResolvedValueOnce({ rows: [] }) // Order not found or not transferable
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        groupOrderingService.transferOrderToParticipant(
          mockOrderId,
          mockFromParticipantId,
          mockToParticipantId
        )
      ).rejects.toThrow('Order not found or cannot be transferred');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getSessionParticipants', () => {
    const mockSessionId = 'session-123';

    it('should return session participants', async () => {
      const mockParticipants = [
        {
          id: 'participant-1',
          sessionId: 'session-123',
          userId: 'user-1',
          fantasyName: 'Brave Dragon',
          joinedAt: new Date(),
        },
        {
          id: 'participant-2',
          sessionId: 'session-123',
          userId: null,
          fantasyName: 'Swift Eagle',
          joinedAt: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockParticipants });

      const result = await groupOrderingService.getSessionParticipants(mockSessionId);

      expect(result).toEqual(mockParticipants);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, session_id'),
        [mockSessionId]
      );
    });

    it('should return empty array when no participants', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await groupOrderingService.getSessionParticipants(mockSessionId);

      expect(result).toEqual([]);
    });
  });
});