import { AdminDashboardService } from '../../services/adminDashboardService';
import { Pool } from 'pg';

// Mock the database pool
jest.mock('../../config/database', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }))
}));

describe('AdminDashboardService', () => {
  let adminDashboardService: AdminDashboardService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    adminDashboardService = new AdminDashboardService();
    mockPool = require('../../config/database').getPool();
    jest.clearAllMocks();
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard overview with correct metrics', async () => {
      const mockData = {
        total_locations: '5',
        active_locations: '4',
        total_orders: '150',
        total_revenue: '2500.00',
        active_sessions: '12',
        pending_calls: '3'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockData] });

      const result = await adminDashboardService.getDashboardOverview('owner-123');

      expect(result).toEqual({
        totalLocations: 5,
        activeLocations: 4,
        totalOrders: 150,
        totalRevenue: 2500,
        activeSessions: 12,
        pendingCalls: 3,
        conversionRate: 0,
        averageOrderValue: 16.67,
        lastUpdated: expect.any(Date)
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['owner-123']
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(adminDashboardService.getDashboardOverview('owner-123'))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getLocationPerformance', () => {
    it('should return performance metrics for all locations', async () => {
      const mockData = [
        {
          id: 'loc-1',
          name: 'Restaurant A',
          total_orders: '50',
          total_revenue: '1000.00',
          avg_order_value: '20.00',
          active_sessions: '5',
          rating: '4.5'
        },
        {
          id: 'loc-2',
          name: 'Restaurant B',
          total_orders: '30',
          total_revenue: '600.00',
          avg_order_value: '20.00',
          active_sessions: '3',
          rating: '4.2'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await adminDashboardService.getLocationPerformance('owner-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
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

    it('should return empty array when no locations found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await adminDashboardService.getLocationPerformance('owner-123');

      expect(result).toEqual([]);
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activities with proper formatting', async () => {
      const mockData = [
        {
          id: 'activity-1',
          type: 'order_placed',
          description: 'New order placed',
          location_name: 'Restaurant A',
          user_name: 'John Doe',
          created_at: '2023-10-01T10:00:00Z',
          metadata: JSON.stringify({ orderId: 'order-123', amount: 25.50 })
        },
        {
          id: 'activity-2',
          type: 'waiter_call',
          description: 'Waiter called to table 5',
          location_name: 'Restaurant B',
          user_name: 'Jane Smith',
          created_at: '2023-10-01T09:30:00Z',
          metadata: JSON.stringify({ tableNumber: 5, callType: 'assistance' })
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await adminDashboardService.getRecentActivity('owner-123', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'activity-1',
        type: 'order_placed',
        description: 'New order placed',
        locationName: 'Restaurant A',
        userName: 'John Doe',
        timestamp: new Date('2023-10-01T10:00:00Z'),
        metadata: { orderId: 'order-123', amount: 25.50 }
      });
    });
  });

  describe('getSystemAlerts', () => {
    it('should return system alerts with proper priority', async () => {
      const mockData = [
        {
          id: 'alert-1',
          type: 'high_wait_time',
          message: 'High wait time at Restaurant A',
          severity: 'warning',
          location_id: 'loc-1',
          location_name: 'Restaurant A',
          is_resolved: false,
          created_at: '2023-10-01T10:00:00Z'
        },
        {
          id: 'alert-2',
          type: 'payment_failed',
          message: 'Payment processing error',
          severity: 'critical',
          location_id: 'loc-2',
          location_name: 'Restaurant B',
          is_resolved: false,
          created_at: '2023-10-01T09:45:00Z'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await adminDashboardService.getSystemAlerts('owner-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'alert-1',
        type: 'high_wait_time',
        message: 'High wait time at Restaurant A',
        severity: 'warning',
        locationId: 'loc-1',
        locationName: 'Restaurant A',
        isResolved: false,
        createdAt: new Date('2023-10-01T10:00:00Z')
      });
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics with trends', async () => {
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

      const startDate = new Date('2023-10-01');
      const endDate = new Date('2023-10-02');
      const result = await adminDashboardService.getRevenueAnalytics('owner-123', startDate, endDate);

      expect(result.totalRevenue).toBe(1250);
      expect(result.totalOrders).toBe(60);
      expect(result.averageOrderValue).toBe(20.83);
      expect(result.dailyData).toHaveLength(2);
      expect(result.dailyData[0]).toEqual({
        date: new Date('2023-10-01'),
        revenue: 500,
        orders: 25
      });
    });
  });

  describe('updateLocationSettings', () => {
    it('should update location settings successfully', async () => {
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
        description: 'Updated description',
        settings: { theme: 'dark' }
      };

      const result = await adminDashboardService.updateLocationSettings('loc-1', 'owner-123', settings);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Update failed')); // UPDATE fails

      const settings = { name: 'Updated Restaurant' };

      await expect(adminDashboardService.updateLocationSettings('loc-1', 'owner-123', settings))
        .rejects.toThrow('Update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getMenuAnalytics', () => {
    it('should return menu analytics with popular items', async () => {
      const mockData = [
        {
          item_id: 'item-1',
          item_name: 'Pizza Margherita',
          category: 'Pizza',
          order_count: '50',
          revenue: '500.00',
          avg_rating: '4.5'
        },
        {
          item_id: 'item-2',
          item_name: 'Caesar Salad',
          category: 'Salads',
          order_count: '30',
          revenue: '240.00',
          avg_rating: '4.2'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await adminDashboardService.getMenuAnalytics('loc-1');

      expect(result.popularItems).toHaveLength(2);
      expect(result.popularItems[0]).toEqual({
        itemId: 'item-1',
        itemName: 'Pizza Margherita',
        category: 'Pizza',
        orderCount: 50,
        revenue: 500,
        averageRating: 4.5
      });
      expect(result.totalRevenue).toBe(740);
      expect(result.totalOrders).toBe(80);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await adminDashboardService.resolveAlert('alert-1', 'owner-123', 'Issue resolved');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE system_alerts'),
        ['alert-1', 'owner-123', 'Issue resolved']
      );
    });

    it('should return false when alert not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await adminDashboardService.resolveAlert('alert-1', 'owner-123');

      expect(result).toBe(false);
    });
  });

  describe('exportData', () => {
    it('should export data in CSV format', async () => {
      const mockData = [
        { date: '2023-10-01', revenue: '500.00', orders: '25' },
        { date: '2023-10-02', revenue: '750.00', orders: '35' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await adminDashboardService.exportData(
        'owner-123',
        'revenue',
        new Date('2023-10-01'),
        new Date('2023-10-02'),
        'csv'
      );

      expect(result.format).toBe('csv');
      expect(result.data).toContain('Date,Revenue,Orders');
      expect(result.data).toContain('2023-10-01,500.00,25');
      expect(result.filename).toMatch(/revenue_export_\d+\.csv/);
    });

    it('should export data in JSON format', async () => {
      const mockData = [
        { date: '2023-10-01', revenue: '500.00', orders: '25' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockData });

      const result = await adminDashboardService.exportData(
        'owner-123',
        'revenue',
        new Date('2023-10-01'),
        new Date('2023-10-02'),
        'json'
      );

      expect(result.format).toBe('json');
      expect(JSON.parse(result.data)).toEqual(mockData);
      expect(result.filename).toMatch(/revenue_export_\d+\.json/);
    });
  });
});