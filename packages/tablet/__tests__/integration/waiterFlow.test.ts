import { waiterApiService } from '../../src/services/waiterApi';
import { waiterSocketService } from '../../src/services/waiterSocket';

// Mock the services
jest.mock('../../src/services/waiterApi');
jest.mock('../../src/services/waiterSocket');

const mockWaiterApiService = waiterApiService as jest.Mocked<typeof waiterApiService>;
const mockWaiterSocketService = waiterSocketService as jest.Mocked<typeof waiterSocketService>;

describe('Waiter Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Shift Management Flow', () => {
    it('should handle complete shift workflow', async () => {
      // Mock shift start
      mockWaiterApiService.getCurrentShift.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'shift-1',
          startTime: new Date(),
          status: 'active',
          totalHours: 0,
        },
      });

      // Mock waiter profile
      mockWaiterApiService.getWaiterProfile.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'waiter-1',
          name: 'John Waiter',
          email: 'john@restaurant.com',
          locationId: 'loc-1',
          locationName: 'Restaurant A',
          role: 'waiter',
          status: {
            isOnline: true,
            isAvailable: true,
            currentCalls: [],
            assignedTables: ['table-1', 'table-2'],
            lastActivity: new Date(),
          },
          shift: {
            id: 'shift-1',
            startTime: new Date(),
            status: 'active',
            totalHours: 0,
          },
          performance: {
            todayStats: {
              callsHandled: 0,
              averageResponseTime: 0,
              customerSatisfaction: 0,
              ordersServed: 0,
              revenue: 0,
            },
            weeklyStats: {
              callsHandled: 0,
              averageResponseTime: 0,
              customerSatisfaction: 0,
              ordersServed: 0,
              revenue: 0,
            },
            monthlyStats: {
              callsHandled: 0,
              averageResponseTime: 0,
              customerSatisfaction: 0,
              ordersServed: 0,
              revenue: 0,
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Test shift initialization
      const shiftResult = await mockWaiterApiService.getCurrentShift();
      const profileResult = await mockWaiterApiService.getWaiterProfile();

      expect(shiftResult.success).toBe(true);
      expect(shiftResult.data?.status).toBe('active');
      expect(profileResult.success).toBe(true);
      expect(profileResult.data?.status.isAvailable).toBe(true);

      // Mock break start
      mockWaiterApiService.startBreak.mockResolvedValueOnce({
        success: true,
        data: {
          breakId: 'break-1',
          startTime: new Date(),
          duration: 30,
        },
      });

      // Test break workflow
      const breakResult = await mockWaiterApiService.startBreak(30);
      expect(breakResult.success).toBe(true);
      expect(breakResult.data?.duration).toBe(30);

      // Mock break end
      mockWaiterApiService.endBreak.mockResolvedValueOnce({
        success: true,
        data: {
          breakId: 'break-1',
          endTime: new Date(),
          actualDuration: 28,
        },
      });

      // Test break end
      const breakEndResult = await mockWaiterApiService.endBreak();
      expect(breakEndResult.success).toBe(true);
    });
  });

  describe('Call Handling Flow', () => {
    it('should handle complete call resolution workflow', async () => {
      const mockCall = {
        id: 'call-1',
        sessionId: 'session-1',
        tableId: 'table-1',
        tableNumber: '5',
        locationId: 'loc-1',
        callType: 'assistance' as const,
        status: 'pending' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        participantCount: 2,
        message: 'Need help with menu',
      };

      // Mock getting active calls
      mockWaiterApiService.getActiveCalls.mockResolvedValueOnce({
        success: true,
        data: [mockCall],
      });

      // Test getting active calls
      const callsResult = await mockWaiterApiService.getActiveCalls();
      expect(callsResult.success).toBe(true);
      expect(callsResult.data).toHaveLength(1);
      expect(callsResult.data?.[0].status).toBe('pending');

      // Mock call acknowledgment
      mockWaiterApiService.acknowledgeCall.mockResolvedValueOnce({
        success: true,
        data: {
          callId: 'call-1',
          acknowledgedAt: new Date(),
          estimatedResponseTime: 5,
        },
      });

      // Test call acknowledgment
      const ackResult = await mockWaiterApiService.acknowledgeCall('call-1', 5);
      expect(ackResult.success).toBe(true);
      expect(ackResult.data?.estimatedResponseTime).toBe(5);

      // Mock socket acknowledgment
      mockWaiterSocketService.acknowledgeCall.mockImplementation(() => {});
      mockWaiterSocketService.acknowledgeCall('call-1', 5);
      expect(mockWaiterSocketService.acknowledgeCall).toHaveBeenCalledWith('call-1', 5);

      // Mock call resolution
      const resolutionData = {
        resolution: 'Helped with menu selection',
        customerSatisfaction: 5,
        followUpRequired: false,
      };

      mockWaiterApiService.resolveCall.mockResolvedValueOnce({
        success: true,
        data: {
          callId: 'call-1',
          resolvedAt: new Date(),
          resolution: 'Helped with menu selection',
          customerSatisfaction: 5,
        },
      });

      // Test call resolution
      const resolveResult = await mockWaiterApiService.resolveCall('call-1', resolutionData);
      expect(resolveResult.success).toBe(true);
      expect(resolveResult.data?.resolution).toBe('Helped with menu selection');
      expect(resolveResult.data?.customerSatisfaction).toBe(5);
    });

    it('should handle call transfer workflow', async () => {
      // Mock call transfer
      mockWaiterApiService.transferCall.mockResolvedValueOnce({
        success: true,
        data: {
          callId: 'call-1',
          transferredTo: 'waiter-2',
          transferredAt: new Date(),
          reason: 'Specialized knowledge required',
        },
      });

      // Test call transfer
      const transferResult = await mockWaiterApiService.transferCall(
        'call-1',
        'waiter-2',
        'Specialized knowledge required'
      );

      expect(transferResult.success).toBe(true);
      expect(transferResult.data?.transferredTo).toBe('waiter-2');

      // Mock socket transfer
      mockWaiterSocketService.transferCall.mockImplementation(() => {});
      mockWaiterSocketService.transferCall('call-1', 'waiter-2', 'Specialized knowledge required');
      expect(mockWaiterSocketService.transferCall).toHaveBeenCalledWith(
        'call-1',
        'waiter-2',
        'Specialized knowledge required'
      );
    });
  });

  describe('Table Management Flow', () => {
    it('should handle table overview and details workflow', async () => {
      const mockTables = [
        {
          id: 'table-1',
          tableNumber: '5',
          capacity: 4,
          status: 'occupied' as const,
          session: {
            id: 'session-1',
            startTime: new Date(),
            participantCount: 2,
            totalOrders: 1,
            totalAmount: 45.50,
            hasActiveCalls: true,
            hasUnpaidOrders: false,
            participants: [
              {
                id: 'participant-1',
                fantasyName: 'Alice',
                isHost: true,
                orderCount: 1,
                totalSpent: 25.50,
                joinedAt: new Date(),
              },
            ],
            recentOrders: [
              {
                id: 'order-1',
                participantName: 'Alice',
                status: 'preparing' as const,
                totalAmount: 25.50,
                createdAt: new Date(),
                items: [
                  {
                    id: 'item-1',
                    menuItemName: 'Pasta Carbonara',
                    quantity: 1,
                    status: 'preparing' as const,
                    preparationTime: 15,
                  },
                ],
              },
            ],
          },
          position: { x: 100, y: 150 },
        },
        {
          id: 'table-2',
          tableNumber: '8',
          capacity: 6,
          status: 'available' as const,
          position: { x: 200, y: 150 },
        },
      ];

      // Mock getting assigned tables
      mockWaiterApiService.getAssignedTables.mockResolvedValueOnce({
        success: true,
        data: mockTables,
      });

      // Test getting assigned tables
      const tablesResult = await mockWaiterApiService.getAssignedTables();
      expect(tablesResult.success).toBe(true);
      expect(tablesResult.data).toHaveLength(2);
      expect(tablesResult.data?.[0].status).toBe('occupied');
      expect(tablesResult.data?.[1].status).toBe('available');

      // Mock getting table details
      mockWaiterApiService.getTableDetails.mockResolvedValueOnce({
        success: true,
        data: mockTables[0],
      });

      // Test getting table details
      const tableDetailsResult = await mockWaiterApiService.getTableDetails('table-1');
      expect(tableDetailsResult.success).toBe(true);
      expect(tableDetailsResult.data?.session?.participantCount).toBe(2);
      expect(tableDetailsResult.data?.session?.hasActiveCalls).toBe(true);
    });
  });

  describe('Notification Flow', () => {
    it('should handle notification workflow', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'new_call' as const,
          title: 'New Customer Call',
          message: 'Table 5 needs assistance',
          priority: 'high' as const,
          isRead: false,
          requiresAction: true,
          actionLabel: 'Respond',
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          type: 'order_ready' as const,
          title: 'Order Ready',
          message: 'Order for Table 8 is ready',
          priority: 'medium' as const,
          isRead: false,
          requiresAction: true,
          actionLabel: 'Deliver',
          createdAt: new Date(),
        },
      ];

      // Mock getting notifications
      mockWaiterApiService.getNotifications.mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      // Test getting notifications
      const notificationsResult = await mockWaiterApiService.getNotifications();
      expect(notificationsResult.success).toBe(true);
      expect(notificationsResult.data).toHaveLength(2);
      expect(notificationsResult.data?.[0].requiresAction).toBe(true);

      // Mock marking notification as read
      mockWaiterApiService.markNotificationAsRead.mockResolvedValueOnce({
        success: true,
        data: {
          notificationId: 'notif-1',
          readAt: new Date(),
        },
      });

      // Test marking notification as read
      const readResult = await mockWaiterApiService.markNotificationAsRead('notif-1');
      expect(readResult.success).toBe(true);
    });
  });

  describe('Socket Integration Flow', () => {
    it('should handle socket events properly', async () => {
      // Mock socket connection
      mockWaiterSocketService.connect.mockResolvedValueOnce(undefined);
      mockWaiterSocketService.on.mockImplementation(() => {});
      mockWaiterSocketService.emit.mockImplementation(() => {});

      // Test socket connection
      await mockWaiterSocketService.connect();
      expect(mockWaiterSocketService.connect).toHaveBeenCalled();

      // Test event listeners setup
      mockWaiterSocketService.on('waiter:new_call', jest.fn());
      mockWaiterSocketService.on('waiter:call_updated', jest.fn());
      mockWaiterSocketService.on('kitchen:order_ready', jest.fn());

      expect(mockWaiterSocketService.on).toHaveBeenCalledTimes(3);

      // Test status updates
      mockWaiterSocketService.updateStatus.mockImplementation(() => {});
      mockWaiterSocketService.updateStatus('online', true);
      expect(mockWaiterSocketService.updateStatus).toHaveBeenCalledWith('online', true);
    });
  });

  describe('Performance Analytics Flow', () => {
    it('should handle analytics data retrieval', async () => {
      const mockAnalytics = {
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        performance: {
          totalCalls: 150,
          averageResponseTime: 3.5,
          customerSatisfaction: 4.2,
          ordersServed: 89,
          revenue: 2450.75,
          hoursWorked: 160,
          efficiency: 0.85,
        },
        trends: {
          callsByHour: [
            { hour: 12, count: 25 },
            { hour: 13, count: 30 },
            { hour: 19, count: 35 },
          ],
          responseTimeByDay: [
            { date: new Date('2024-01-15'), avgTime: 3.2 },
            { date: new Date('2024-01-16'), avgTime: 3.8 },
          ],
          satisfactionTrend: [
            { date: new Date('2024-01-15'), rating: 4.1 },
            { date: new Date('2024-01-16'), rating: 4.3 },
          ],
        },
        comparisons: {
          teamAverage: {
            responseTime: 4.0,
            satisfaction: 4.0,
            efficiency: 0.80,
          },
          previousPeriod: {
            responseTime: 4.2,
            satisfaction: 3.9,
            callsHandled: 140,
          },
        },
      };

      // Mock analytics API call
      mockWaiterApiService.getWaiterAnalytics.mockResolvedValueOnce({
        success: true,
        data: mockAnalytics,
      });

      // Test analytics retrieval
      const analyticsResult = await mockWaiterApiService.getWaiterAnalytics('2024-01-01', '2024-01-31');
      expect(analyticsResult.success).toBe(true);
      expect(analyticsResult.data?.performance.totalCalls).toBe(150);
      expect(analyticsResult.data?.trends.callsByHour).toHaveLength(3);
      expect(analyticsResult.data?.comparisons.teamAverage.efficiency).toBe(0.80);
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockWaiterApiService.getActiveCalls.mockResolvedValueOnce({
        success: false,
        error: 'Network error occurred',
      });

      // Test error handling
      const result = await mockWaiterApiService.getActiveCalls();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });

    it('should handle socket disconnection', async () => {
      // Mock socket disconnection
      mockWaiterSocketService.on.mockImplementation((event, callback) => {
        if (event === 'connection:lost') {
          callback();
        }
      });

      // Test disconnection handling
      const disconnectCallback = jest.fn();
      mockWaiterSocketService.on('connection:lost', disconnectCallback);
      
      // Simulate disconnection
      mockWaiterSocketService.on('connection:lost', () => {
        disconnectCallback();
      });

      expect(mockWaiterSocketService.on).toHaveBeenCalledWith('connection:lost', expect.any(Function));
    });
  });
});