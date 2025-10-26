import { WaiterTabletService } from '../../services/waiterTabletService';
import { getPool } from '../../config/database';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../services/notificationService');

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

(getPool as jest.Mock).mockReturnValue(mockPool);

describe('WaiterTabletService', () => {
  let waiterTabletService: WaiterTabletService;

  beforeEach(() => {
    waiterTabletService = new WaiterTabletService();
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('getTabletDashboard', () => {
    const mockWaiterId = 'waiter-123';
    const mockLocationId = 'location-123';

    it('should return complete dashboard data', async () => {
      const mockActiveCalls = [
        {
          id: 'call-1',
          tableNumber: '5',
          callType: 'assistance',
          priority: 'high',
          status: 'pending',
          createdAt: new Date(),
          customerName: 'Brave Dragon',
          estimatedResponseTime: 8,
        },
      ];

      const mockActiveOrders = [
        {
          id: 'order-1',
          tableNumber: '3',
          status: 'ready',
          totalAmount: 45.99,
          itemCount: 3,
          createdAt: new Date(),
          customerNames: ['Swift Eagle', 'Mighty Wolf'],
          estimatedReadyTime: new Date(),
        },
      ];

      const mockWaiterStats = {
        callsHandledToday: 12,
        averageResponseTime: 4.5,
        customerSatisfactionRating: 4.8,
        ordersDeliveredToday: 25,
        currentActiveCalls: 2,
      };

      const mockLocationInfo = {
        id: mockLocationId,
        name: 'Test Restaurant',
        activeWaiters: 3,
        activeTables: 8,
        totalCallsToday: 45,
      };

      // Mock all the individual method calls
      waiterTabletService.getActiveCallsForWaiter = jest.fn().mockResolvedValue(mockActiveCalls);
      waiterTabletService.getActiveOrdersForLocation = jest.fn().mockResolvedValue(mockActiveOrders);
      waiterTabletService.getWaiterStats = jest.fn().mockResolvedValue(mockWaiterStats);
      waiterTabletService.getLocationInfo = jest.fn().mockResolvedValue(mockLocationInfo);

      const result = await waiterTabletService.getTabletDashboard(mockWaiterId, mockLocationId);

      expect(result.activeCalls).toEqual(mockActiveCalls);
      expect(result.activeOrders).toEqual(mockActiveOrders);
      expect(result.waiterStats).toEqual(mockWaiterStats);
      expect(result.locationInfo).toEqual(mockLocationInfo);
    });
  });

  describe('getActiveCallsForWaiter', () => {
    const mockWaiterId = 'waiter-123';
    const mockLocationId = 'location-123';

    it('should return active calls ordered by priority', async () => {
      const mockCalls = [
        {
          id: 'call-1',
          tableNumber: '5',
          callType: 'assistance',
          priority: 'urgent',
          message: 'Emergency',
          status: 'pending',
          createdAt: new Date(Date.now() - 120000), // 2 minutes ago
          acknowledgedAt: null,
          customerName: 'Brave Dragon',
        },
        {
          id: 'call-2',
          tableNumber: '3',
          callType: 'bill',
          priority: 'medium',
          message: 'Ready to pay',
          status: 'acknowledged',
          createdAt: new Date(Date.now() - 300000), // 5 minutes ago
          acknowledgedAt: new Date(Date.now() - 240000), // 4 minutes ago
          customerName: 'Swift Eagle',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockCalls });

      const result = await waiterTabletService.getActiveCallsForWaiter(mockWaiterId, mockLocationId);

      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe('urgent');
      expect(result[0].estimatedResponseTime).toBeDefined();
      expect(result[1].status).toBe('acknowledged');
    });

    it('should return empty array when no active calls', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await waiterTabletService.getActiveCallsForWaiter(mockWaiterId, mockLocationId);

      expect(result).toEqual([]);
    });
  });

  describe('getActiveOrdersForLocation', () => {
    const mockLocationId = 'location-123';

    it('should return active orders with customer names', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          tableNumber: '5',
          status: 'ready',
          total_amount: 45.99,
          created_at: new Date(Date.now() - 900000), // 15 minutes ago
          specialRequests: 'No onions',
          itemCount: '3',
          customerNames: ['Brave Dragon', 'Swift Eagle'],
        },
        {
          id: 'order-2',
          tableNumber: '2',
          status: 'preparing',
          total_amount: 28.50,
          created_at: new Date(Date.now() - 600000), // 10 minutes ago
          specialRequests: null,
          itemCount: '2',
          customerNames: ['Mighty Wolf'],
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockOrders });

      const result = await waiterTabletService.getActiveOrdersForLocation(mockLocationId);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('ready');
      expect(result[0].itemCount).toBe(3);
      expect(result[0].estimatedReadyTime).toBeDefined();
      expect(result[1].customerNames).toEqual(['Mighty Wolf']);
    });
  });

  describe('getWaiterStats', () => {
    const mockWaiterId = 'waiter-123';

    it('should return waiter performance statistics', async () => {
      const mockStats = {
        calls_handled_today: '12',
        avg_response_time: '4.5',
        avg_satisfaction: '4.8',
        orders_delivered_today: '25',
        current_active_calls: '2',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await waiterTabletService.getWaiterStats(mockWaiterId);

      expect(result.callsHandledToday).toBe(12);
      expect(result.averageResponseTime).toBe(4.5);
      expect(result.customerSatisfactionRating).toBe(4.8);
      expect(result.ordersDeliveredToday).toBe(25);
      expect(result.currentActiveCalls).toBe(2);
    });

    it('should handle null values gracefully', async () => {
      const mockStats = {
        calls_handled_today: null,
        avg_response_time: null,
        avg_satisfaction: null,
        orders_delivered_today: null,
        current_active_calls: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await waiterTabletService.getWaiterStats(mockWaiterId);

      expect(result.callsHandledToday).toBe(0);
      expect(result.averageResponseTime).toBe(0);
      expect(result.customerSatisfactionRating).toBe(0);
      expect(result.ordersDeliveredToday).toBe(0);
      expect(result.currentActiveCalls).toBe(0);
    });
  });

  describe('getLocationInfo', () => {
    const mockLocationId = 'location-123';

    it('should return location information and statistics', async () => {
      const mockInfo = {
        id: mockLocationId,
        name: 'Test Restaurant',
        active_waiters: '3',
        active_tables: '8',
        total_calls_today: '45',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockInfo] });

      const result = await waiterTabletService.getLocationInfo(mockLocationId);

      expect(result.id).toBe(mockLocationId);
      expect(result.name).toBe('Test Restaurant');
      expect(result.activeWaiters).toBe(3);
      expect(result.activeTables).toBe(8);
      expect(result.totalCallsToday).toBe(45);
    });
  });

  describe('updateOrderStatus', () => {
    const mockOrderId = 'order-123';
    const mockWaiterId = 'waiter-123';
    const mockStatus = 'ready';
    const mockNotes = 'Order is ready for pickup';

    it('should update order status successfully', async () => {
      const mockOrderData = {
        session_id: 'session-123',
        total_amount: 45.99,
      };

      const mockLocationData = {
        location_id: 'location-123',
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockOrderData] }) // Update order
        .mockResolvedValueOnce({}) // Log status change
        .mockResolvedValueOnce({ rows: [mockLocationData] }) // Get location
        .mockResolvedValueOnce({}); // COMMIT

      await waiterTabletService.updateOrderStatus(mockOrderId, mockStatus, mockWaiterId, mockNotes);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        [mockStatus, mockOrderId]
      );
    });

    it('should throw error when order not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Order not found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        waiterTabletService.updateOrderStatus(mockOrderId, mockStatus, mockWaiterId, mockNotes)
      ).rejects.toThrow('Order not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on database error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Error

      await expect(
        waiterTabletService.updateOrderStatus(mockOrderId, mockStatus, mockWaiterId, mockNotes)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('markOrderAsDelivered', () => {
    const mockOrderId = 'order-123';
    const mockWaiterId = 'waiter-123';
    const mockTableNumber = '5';

    it('should mark order as delivered', async () => {
      const mockOrderData = {
        session_id: 'session-123',
        total_amount: 45.99,
      };

      const mockLocationData = {
        location_id: 'location-123',
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockOrderData] }) // Update order
        .mockResolvedValueOnce({}) // Log status change
        .mockResolvedValueOnce({ rows: [mockLocationData] }) // Get location
        .mockResolvedValueOnce({}); // COMMIT

      await waiterTabletService.markOrderAsDelivered(mockOrderId, mockWaiterId, mockTableNumber);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        ['delivered', mockOrderId]
      );
    });
  });

  describe('getOrderDetails', () => {
    const mockOrderId = 'order-123';

    it('should return detailed order information', async () => {
      const mockOrderDetails = {
        id: mockOrderId,
        sessionId: 'session-123',
        status: 'ready',
        totalAmount: 45.99,
        subtotal: 41.81,
        taxAmount: 4.18,
        notes: 'No onions',
        createdAt: new Date(),
        tableNumber: '5',
        customerName: 'Brave Dragon',
        items: [
          {
            id: 'item-1',
            menuItemName: 'Caesar Salad',
            quantity: 2,
            unitPrice: 12.99,
            totalPrice: 25.98,
            notes: 'Extra dressing',
            customizations: [
              {
                name: 'Dressing',
                value: 'Caesar',
              },
            ],
          },
        ],
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockOrderDetails] });

      const result = await waiterTabletService.getOrderDetails(mockOrderId);

      expect(result.id).toBe(mockOrderId);
      expect(result.status).toBe('ready');
      expect(result.items).toBeDefined();
      expect(result.tableNumber).toBe('5');
    });

    it('should return undefined when order not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await waiterTabletService.getOrderDetails(mockOrderId);

      expect(result).toBeUndefined();
    });
  });

  describe('createKitchenNotification', () => {
    const mockOrderId = 'order-123';
    const mockMessage = 'Special preparation needed';
    const mockPriority = 'high';

    it('should create kitchen notification successfully', async () => {
      const mockLocationData = {
        location_id: 'location-123',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockLocationData] }) // Get location
        .mockResolvedValueOnce({}); // Create notification

      await waiterTabletService.createKitchenNotification(mockOrderId, mockMessage, mockPriority);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_events'),
        expect.arrayContaining(['location-123', JSON.stringify({ orderId: mockOrderId, message: mockMessage }), mockPriority])
      );
    });

    it('should handle missing location gracefully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Should not throw error
      await expect(
        waiterTabletService.createKitchenNotification(mockOrderId, mockMessage, mockPriority)
      ).resolves.not.toThrow();
    });
  });

  describe('performance calculations', () => {
    it('should calculate estimated response time correctly', async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const mockCall = {
        id: 'call-1',
        tableNumber: '5',
        callType: 'assistance',
        priority: 'medium', // Base time: 10 minutes
        status: 'pending',
        createdAt: fiveMinutesAgo, // 5 minutes elapsed
        customerName: 'Test User',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockCall] });

      const result = await waiterTabletService.getActiveCallsForWaiter('waiter-123', 'location-123');

      // Should be 10 - 5 = 5 minutes remaining
      expect(result[0].estimatedResponseTime).toBe(5);
    });

    it('should not return negative response times', async () => {
      const now = new Date();
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);

      const mockCall = {
        id: 'call-1',
        tableNumber: '5',
        callType: 'assistance',
        priority: 'medium', // Base time: 10 minutes
        status: 'pending',
        createdAt: twentyMinutesAgo, // 20 minutes elapsed (more than base time)
        customerName: 'Test User',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockCall] });

      const result = await waiterTabletService.getActiveCallsForWaiter('waiter-123', 'location-123');

      // Should be 0, not negative
      expect(result[0].estimatedResponseTime).toBe(0);
    });

    it('should calculate estimated ready time based on item count', async () => {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      const mockOrder = {
        id: 'order-1',
        tableNumber: '5',
        status: 'preparing',
        total_amount: 45.99,
        created_at: tenMinutesAgo,
        itemCount: '5', // 5 items = 15 + (5 * 3) = 30 minutes total
        customerNames: ['Test User'],
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockOrder] });

      const result = await waiterTabletService.getActiveOrdersForLocation('location-123');

      const expectedReadyTime = new Date(tenMinutesAgo.getTime() + 30 * 60 * 1000);
      expect(result[0].estimatedReadyTime.getTime()).toBeCloseTo(expectedReadyTime.getTime(), -3);
    });
  });
});