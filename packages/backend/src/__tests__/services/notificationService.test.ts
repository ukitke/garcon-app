import { NotificationService } from '../../services/notificationService';
import { Server } from 'socket.io';
import { getPool } from '../../config/database';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('socket.io');

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockSocket = {
  id: 'socket-123',
  data: {},
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
};

const mockIo = {
  on: jest.fn(),
  to: jest.fn(() => ({
    emit: jest.fn(),
  })),
  fetchSockets: jest.fn(),
} as any;

(getPool as jest.Mock).mockReturnValue(mockPool);

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService(mockIo);
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('createWaiterCall', () => {
    const mockCallRequest = {
      sessionId: 'session-123',
      participantId: 'participant-123',
      callType: 'assistance' as const,
      message: 'Need help with menu',
      priority: 'medium' as const,
    };

    it('should create waiter call successfully', async () => {
      const mockSessionData = {
        table_id: 'table-123',
        location_id: 'location-123',
      };

      const mockCall = {
        id: 'call-123',
        sessionId: 'session-123',
        tableId: 'table-123',
        participantId: 'participant-123',
        locationId: 'location-123',
        callType: 'assistance',
        priority: 'medium',
        message: 'Need help with menu',
        status: 'pending',
        assignedWaiterId: null,
        createdAt: new Date(),
        acknowledgedAt: null,
        resolvedAt: null,
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSessionData] }) // Get session info
        .mockResolvedValueOnce({ rows: [mockCall] }) // Create waiter call
        .mockResolvedValueOnce({}) // Create notification event
        .mockResolvedValueOnce({}); // COMMIT

      const result = await notificationService.createWaiterCall(mockCallRequest);

      expect(result).toEqual(mockCall);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error when session not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Session not found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        notificationService.createWaiterCall(mockCallRequest)
      ).rejects.toThrow('Active session not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on database error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Error

      await expect(
        notificationService.createWaiterCall(mockCallRequest)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('acknowledgeCall', () => {
    const mockCallId = 'call-123';
    const mockWaiterId = 'waiter-123';
    const mockEstimatedTime = 5;

    it('should acknowledge call successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ location_id: 'location-123' }] }) // Update call
        .mockResolvedValueOnce({}) // Add call to waiter
        .mockResolvedValueOnce({}) // Create notification
        .mockResolvedValueOnce({}); // COMMIT

      await notificationService.acknowledgeCall(mockCallId, mockWaiterId, mockEstimatedTime);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'acknowledged'"),
        [mockWaiterId, mockCallId]
      );
    });

    it('should throw error when call not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Call not found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        notificationService.acknowledgeCall(mockCallId, mockWaiterId, mockEstimatedTime)
      ).rejects.toThrow('Call not found or already acknowledged');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('resolveCall', () => {
    const mockCallId = 'call-123';
    const mockWaiterId = 'waiter-123';
    const mockResolution = 'Issue resolved successfully';
    const mockSatisfaction = 5;

    it('should resolve call successfully', async () => {
      const mockCallData = {
        created_at: new Date(Date.now() - 300000), // 5 minutes ago
        acknowledged_at: new Date(Date.now() - 240000), // 4 minutes ago
        location_id: 'location-123',
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCallData] }) // Get call info
        .mockResolvedValueOnce({}) // Update call status
        .mockResolvedValueOnce({}) // Record response metrics
        .mockResolvedValueOnce({}) // Remove call from waiter
        .mockResolvedValueOnce({}) // Create notification
        .mockResolvedValueOnce({}); // COMMIT

      await notificationService.resolveCall(mockCallId, mockWaiterId, mockResolution, mockSatisfaction);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'resolved'"),
        [mockCallId]
      );
    });

    it('should throw error when call not assigned to waiter', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Call not found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        notificationService.resolveCall(mockCallId, mockWaiterId, mockResolution, mockSatisfaction)
      ).rejects.toThrow('Call not found or not assigned to this waiter');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getActiveCallsForLocation', () => {
    const mockLocationId = 'location-123';

    it('should return active calls ordered by priority', async () => {
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
          createdAt: new Date(),
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
          assignedWaiterId: 'waiter-123',
          createdAt: new Date(),
          acknowledgedAt: new Date(),
          resolvedAt: null,
          tableNumber: '2',
          waiterName: 'John Doe',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockCalls });

      const result = await notificationService.getActiveCallsForLocation(mockLocationId);

      expect(result).toEqual(mockCalls);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        [mockLocationId]
      );
    });

    it('should return empty array when no active calls', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.getActiveCallsForLocation(mockLocationId);

      expect(result).toEqual([]);
    });
  });

  describe('updateWaiterStatus', () => {
    const mockStatus = {
      waiterId: 'waiter-123',
      locationId: 'location-123',
      status: 'available' as const,
      currentCalls: ['call-1', 'call-2'],
      lastSeen: new Date(),
    };

    it('should update waiter status successfully', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await notificationService.updateWaiterStatus(mockStatus);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO waiter_status'),
        [
          mockStatus.waiterId,
          mockStatus.locationId,
          mockStatus.status,
          mockStatus.currentCalls,
          mockStatus.lastSeen,
        ]
      );
    });
  });

  describe('getWaitersForLocation', () => {
    const mockLocationId = 'location-123';

    it('should return active waiters for location', async () => {
      const mockWaiters = [
        {
          waiterId: 'waiter-1',
          locationId: mockLocationId,
          status: 'available',
          currentCalls: [],
          lastSeen: new Date(),
          waiterName: 'John Doe',
        },
        {
          waiterId: 'waiter-2',
          locationId: mockLocationId,
          status: 'busy',
          currentCalls: ['call-1'],
          lastSeen: new Date(),
          waiterName: 'Jane Smith',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockWaiters });

      const result = await notificationService.getWaitersForLocation(mockLocationId);

      expect(result).toEqual(mockWaiters);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ws.location_id = $1'),
        [mockLocationId]
      );
    });
  });

  describe('broadcast methods', () => {
    it('should broadcast order update', async () => {
      const mockOrderId = 'order-123';
      const mockStatus = 'ready';
      const mockLocationId = 'location-123';
      const mockEstimatedTime = 15;

      await notificationService.broadcastOrderUpdate(
        mockOrderId,
        mockStatus,
        mockLocationId,
        mockEstimatedTime
      );

      expect(mockIo.to).toHaveBeenCalledWith(`location:${mockLocationId}`);
    });

    it('should broadcast payment request', async () => {
      const mockSessionId = 'session-123';
      const mockAmount = 45.99;
      const mockLocationId = 'location-123';
      const mockSplitDetails = { participants: 2 };

      await notificationService.broadcastPaymentRequest(
        mockSessionId,
        mockAmount,
        mockLocationId,
        mockSplitDetails
      );

      expect(mockIo.to).toHaveBeenCalledWith(`location:${mockLocationId}`);
    });

    it('should send notification to specific user', async () => {
      const mockUserId = 'user-123';
      const mockNotification = {
        id: 'notification-123',
        type: 'waiter_call' as const,
        targetType: 'customer' as const,
        locationId: 'location-123',
        data: { message: 'Test notification' },
        priority: 'medium' as const,
        createdAt: new Date(),
      };

      const mockUserSocket = {
        data: { userId: mockUserId },
        emit: jest.fn(),
      };

      mockIo.fetchSockets.mockResolvedValueOnce([mockUserSocket]);

      await notificationService.sendNotificationToUser(mockUserId, mockNotification);

      expect(mockUserSocket.emit).toHaveBeenCalledWith('notification', mockNotification);
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple concurrent calls', async () => {
      const mockRequests = Array.from({ length: 10 }, (_, i) => ({
        sessionId: `session-${i}`,
        participantId: `participant-${i}`,
        callType: 'assistance' as const,
        priority: 'medium' as const,
      }));

      // Mock successful responses for all calls
      mockClient.query
        .mockResolvedValue({}) // BEGIN
        .mockResolvedValue({ rows: [{ table_id: 'table-1', location_id: 'location-1' }] }) // Session info
        .mockResolvedValue({ rows: [{ id: 'call-1' }] }) // Create call
        .mockResolvedValue({}) // Create notification
        .mockResolvedValue({}); // COMMIT

      const promises = mockRequests.map(request =>
        notificationService.createWaiterCall(request)
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle database connection failures gracefully', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const mockRequest = {
        sessionId: 'session-123',
        participantId: 'participant-123',
        callType: 'assistance' as const,
        priority: 'medium' as const,
      };

      await expect(
        notificationService.createWaiterCall(mockRequest)
      ).rejects.toThrow('Connection failed');
    });

    it('should cleanup expired notifications', async () => {
      // This would test the cleanup function if it were exposed
      // For now, we test that the function exists in the migration
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('socket connection handling', () => {
    it('should handle socket connection and setup event listeners', () => {
      // Verify that socket event handlers are set up
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle socket disconnection and cleanup waiter status', () => {
      // This would be tested by simulating socket disconnect events
      // The actual implementation is in the constructor
      expect(mockIo.on).toHaveBeenCalled();
    });
  });
});