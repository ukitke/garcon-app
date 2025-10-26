import { waiterApiService } from '../../src/services/waiterApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    request: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  })),
}));

describe('WaiterApiService', () => {
  let mockAxiosInstance: any;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };
    
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
    jest.clearAllMocks();
  });

  describe('Waiter Profile', () => {
    it('should get waiter profile successfully', async () => {
      const mockResponse = {
        data: {
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
            },
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.getWaiterProfile();

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('John Waiter');
      expect(result.data?.status.assignedTables).toHaveLength(2);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/waiter/profile',
      });
    });
  });

  describe('Shift Management', () => {
    it('should get current shift successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'shift-1',
            startTime: new Date('2024-01-15T08:00:00Z'),
            status: 'active',
            totalHours: 4.5,
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.getCurrentShift();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('active');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/waiter/shift/current',
      });
    });

    it('should start break successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            breakId: 'break-1',
            startTime: new Date(),
            duration: 30,
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.startBreak(30);

      expect(result.success).toBe(true);
      expect(result.data?.duration).toBe(30);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter/shift/break/start',
        data: { duration: 30 },
      });
    });

    it('should end break successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            breakId: 'break-1',
            endTime: new Date(),
            actualDuration: 28,
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.endBreak();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter/shift/break/end',
      });
    });
  });

  describe('Call Management', () => {
    it('should get active calls successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              id: 'call-1',
              sessionId: 'session-1',
              tableId: 'table-1',
              tableNumber: '5',
              callType: 'assistance',
              status: 'pending',
              priority: 'medium',
              createdAt: new Date(),
              participantCount: 2,
            },
            {
              id: 'call-2',
              sessionId: 'session-2',
              tableId: 'table-2',
              tableNumber: '8',
              callType: 'bill',
              status: 'acknowledged',
              priority: 'high',
              createdAt: new Date(),
              participantCount: 4,
            },
          ],
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.getActiveCalls();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].callType).toBe('assistance');
      expect(result.data?.[1].status).toBe('acknowledged');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/waiter/calls/active',
      });
    });

    it('should acknowledge call successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            callId: 'call-1',
            acknowledgedAt: new Date(),
            estimatedResponseTime: 5,
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.acknowledgeCall('call-1', 5);

      expect(result.success).toBe(true);
      expect(result.data?.estimatedResponseTime).toBe(5);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter/calls/call-1/acknowledge',
        data: { estimatedResponseTime: 5 },
      });
    });

    it('should resolve call successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            callId: 'call-1',
            resolvedAt: new Date(),
            resolution: 'Helped with menu selection',
            customerSatisfaction: 5,
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const resolutionData = {
        resolution: 'Helped with menu selection',
        customerSatisfaction: 5,
        followUpRequired: false,
      };

      const result = await waiterApiService.resolveCall('call-1', resolutionData);

      expect(result.success).toBe(true);
      expect(result.data?.resolution).toBe('Helped with menu selection');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter/calls/call-1/resolve',
        data: resolutionData,
      });
    });

    it('should transfer call successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            callId: 'call-1',
            transferredTo: 'waiter-2',
            transferredAt: new Date(),
            reason: 'Specialized knowledge required',
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.transferCall('call-1', 'waiter-2', 'Specialized knowledge required');

      expect(result.success).toBe(true);
      expect(result.data?.transferredTo).toBe('waiter-2');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter/calls/call-1/transfer',
        data: {
          toWaiterId: 'waiter-2',
          reason: 'Specialized knowledge required',
        },
      });
    });
  });

  describe('Table Management', () => {
    it('should get assigned tables successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              id: 'table-1',
              tableNumber: '5',
              capacity: 4,
              status: 'occupied',
              session: {
                id: 'session-1',
                startTime: new Date(),
                participantCount: 2,
                totalOrders: 1,
                totalAmount: 45.50,
                hasActiveCalls: true,
              },
              position: { x: 100, y: 150 },
            },
            {
              id: 'table-2',
              tableNumber: '8',
              capacity: 6,
              status: 'available',
              position: { x: 200, y: 150 },
            },
          ],
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.getAssignedTables();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].status).toBe('occupied');
      expect(result.data?.[1].status).toBe('available');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/waiter/tables/assigned',
      });
    });

    it('should get table details successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'table-1',
            tableNumber: '5',
            capacity: 4,
            status: 'occupied',
            session: {
              id: 'session-1',
              startTime: new Date(),
              participantCount: 2,
              participants: [
                {
                  id: 'participant-1',
                  fantasyName: 'Alice',
                  isHost: true,
                  orderCount: 2,
                  totalSpent: 25.50,
                },
                {
                  id: 'participant-2',
                  fantasyName: 'Bob',
                  isHost: false,
                  orderCount: 1,
                  totalSpent: 20.00,
                },
              ],
              recentOrders: [
                {
                  id: 'order-1',
                  participantName: 'Alice',
                  status: 'preparing',
                  totalAmount: 15.50,
                  createdAt: new Date(),
                },
              ],
            },
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.getTableDetails('table-1');

      expect(result.success).toBe(true);
      expect(result.data?.session?.participants).toHaveLength(2);
      expect(result.data?.session?.recentOrders).toHaveLength(1);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/waiter/tables/table-1',
      });
    });
  });

  describe('Notifications', () => {
    it('should get notifications successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              id: 'notif-1',
              type: 'new_call',
              title: 'New Customer Call',
              message: 'Table 5 needs assistance',
              priority: 'high',
              isRead: false,
              requiresAction: true,
              createdAt: new Date(),
            },
            {
              id: 'notif-2',
              type: 'order_ready',
              title: 'Order Ready',
              message: 'Order for Table 8 is ready',
              priority: 'medium',
              isRead: true,
              requiresAction: false,
              createdAt: new Date(),
            },
          ],
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.getNotifications();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].requiresAction).toBe(true);
      expect(result.data?.[1].isRead).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/waiter/notifications',
      });
    });

    it('should mark notification as read successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            notificationId: 'notif-1',
            readAt: new Date(),
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.markNotificationAsRead('notif-1');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter/notifications/notif-1/read',
      });
    });
  });

  describe('Performance Analytics', () => {
    it('should get waiter analytics successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
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
            },
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await waiterApiService.getWaiterAnalytics('2024-01-01', '2024-01-31');

      expect(result.success).toBe(true);
      expect(result.data?.performance.totalCalls).toBe(150);
      expect(result.data?.trends.callsByHour).toHaveLength(3);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/waiter/analytics',
        params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            success: false,
            error: 'Authentication required',
          },
        },
      };

      mockAxiosInstance.request.mockRejectedValueOnce(authError);

      const result = await waiterApiService.getWaiterProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.request.mockRejectedValueOnce(networkError);

      const result = await waiterApiService.getActiveCalls();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            success: false,
            error: 'Internal server error',
          },
        },
      };

      mockAxiosInstance.request.mockRejectedValueOnce(serverError);

      const result = await waiterApiService.acknowledgeCall('call-1', 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });
});