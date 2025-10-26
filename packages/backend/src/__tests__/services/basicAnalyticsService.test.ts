import { BasicAnalyticsService } from '../../services/basicAnalyticsService';
import { Pool } from 'pg';

// Mock the database pool
jest.mock('../../config/database', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn()
  }))
}));

describe('BasicAnalyticsService', () => {
  let basicAnalyticsService: BasicAnalyticsService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    basicAnalyticsService = new BasicAnalyticsService();
    mockPool = require('../../config/database').getPool();
    jest.clearAllMocks();
  });

  describe('getBasicAnalytics', () => {
    it('should return complete analytics data', async () => {
      // Mock all the individual method calls
      jest.spyOn(basicAnalyticsService, 'getOverviewStats').mockResolvedValueOnce({
        totalRevenue: 5000,
        totalOrders: 100,
        averageOrderValue: 50,
        totalCustomers: 80,
        conversionRate: 75,
        period: { start: new Date('2023-10-01'), end: new Date('2023-10-31') },
        previousPeriodComparison: { revenue: 10, orders: 5, customers: 8, aov: 2 }
      });

      jest.spyOn(basicAnalyticsService, 'getSalesAnalytics').mockResolvedValueOnce({
        dailySales: [],
        hourlySales: [],
        salesByPaymentMethod: [],
        salesByTable: [],
        topRevenueItems: []
      });

      jest.spyOn(basicAnalyticsService, 'getOrderAnalytics').mockResolvedValueOnce({
        ordersByStatus: [],
        ordersByHour: [],
        averageOrderTime: 25,
        orderCompletionRate: 95,
        cancelledOrdersRate: 5,
        peakHours: []
      });

      jest.spyOn(basicAnalyticsService, 'getMenuAnalytics').mockResolvedValueOnce({
        popularItems: [],
        categoryPerformance: [],
        itemRatings: [],
        menuOptimization: [],
        lowPerformingItems: []
      });

      jest.spyOn(basicAnalyticsService, 'getPerformanceStats').mockResolvedValueOnce({
        averageServiceTime: 15,
        tableUtilization: 70,
        waiterEfficiency: [],
        customerSatisfaction: 4.2,
        repeatCustomerRate: 60
      });

      jest.spyOn(basicAnalyticsService, 'getTrendAnalytics').mockResolvedValueOnce({
        weeklyTrends: [],
        monthlyTrends: [],
        seasonalPatterns: [],
        growthMetrics: {
          revenueGrowth: 15,
          orderGrowth: 10,
          customerGrowth: 12,
          monthOverMonth: 8,
          yearOverYear: 25
        }
      });

      const result = await basicAnalyticsService.getBasicAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('sales');
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('menu');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('trends');
      expect(result.overview.totalRevenue).toBe(5000);
    });
  });

  describe('getOverviewStats', () => {
    it('should return overview statistics with period comparison', async () => {
      const mockCurrentData = {
        total_revenue: '5000.00',
        total_orders: '100',
        total_customers: '80',
        avg_order_value: '50.00',
        conversion_rate: '75.00'
      };

      const mockPreviousData = {
        total_revenue: '4500.00',
        total_orders: '95',
        total_customers: '75',
        avg_order_value: '47.37',
        conversion_rate: '73.68'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockCurrentData] })
        .mockResolvedValueOnce({ rows: [mockPreviousData] });

      const result = await basicAnalyticsService.getOverviewStats(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.totalRevenue).toBe(5000);
      expect(result.totalOrders).toBe(100);
      expect(result.totalCustomers).toBe(80);
      expect(result.averageOrderValue).toBe(50);
      expect(result.conversionRate).toBe(75);
      expect(result.previousPeriodComparison.revenue).toBeCloseTo(11.11, 1);
      expect(result.previousPeriodComparison.orders).toBeCloseTo(5.26, 1);
    });

    it('should handle zero previous period values', async () => {
      const mockCurrentData = {
        total_revenue: '5000.00',
        total_orders: '100',
        total_customers: '80',
        avg_order_value: '50.00',
        conversion_rate: '75.00'
      };

      const mockPreviousData = {
        total_revenue: '0',
        total_orders: '0',
        total_customers: '0',
        avg_order_value: '0',
        conversion_rate: '0'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockCurrentData] })
        .mockResolvedValueOnce({ rows: [mockPreviousData] });

      const result = await basicAnalyticsService.getOverviewStats(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.previousPeriodComparison.revenue).toBe(0);
      expect(result.previousPeriodComparison.orders).toBe(0);
    });
  });

  describe('getSalesAnalytics', () => {
    it('should return comprehensive sales analytics', async () => {
      const mockDailySales = [
        { date: '2023-10-01T00:00:00Z', revenue: '500.00', orders: '10', customers: '8' },
        { date: '2023-10-02T00:00:00Z', revenue: '750.00', orders: '15', customers: '12' }
      ];

      const mockHourlySales = [
        { hour: '12', revenue: '200.00', orders: '4', avg_order_value: '50.00' },
        { hour: '19', revenue: '300.00', orders: '6', avg_order_value: '50.00' }
      ];

      const mockPaymentMethods = [
        { method: 'stripe', revenue: '3000.00', orders: '60' },
        { method: 'paypal', revenue: '2000.00', orders: '40' }
      ];

      const mockTableSales = [
        { table_number: '1', revenue: '800.00', orders: '16', utilization: '80.00' },
        { table_number: '2', revenue: '600.00', orders: '12', utilization: '60.00' }
      ];

      const mockTopItems = [
        { 
          id: 'item-1', 
          name: 'Pizza Margherita', 
          category: 'Pizza', 
          revenue: '1200.00', 
          orders: '24', 
          avg_price: '50.00' 
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockDailySales })
        .mockResolvedValueOnce({ rows: mockHourlySales })
        .mockResolvedValueOnce({ rows: mockPaymentMethods })
        .mockResolvedValueOnce({ rows: mockTableSales })
        .mockResolvedValueOnce({ rows: mockTopItems });

      const result = await basicAnalyticsService.getSalesAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.dailySales).toHaveLength(2);
      expect(result.dailySales[0].revenue).toBe(500);
      expect(result.hourlySales).toHaveLength(2);
      expect(result.salesByPaymentMethod).toHaveLength(2);
      expect(result.salesByPaymentMethod[0].percentage).toBe(60); // 3000/5000 * 100
      expect(result.salesByTable).toHaveLength(2);
      expect(result.topRevenueItems).toHaveLength(1);
    });
  });

  describe('getOrderAnalytics', () => {
    it('should return order analytics with performance metrics', async () => {
      const mockOrderStatus = [
        { status: 'delivered', count: '85' },
        { status: 'cancelled', count: '5' },
        { status: 'pending', count: '10' }
      ];

      const mockHourlyOrders = [
        { hour: '12', orders: '15', avg_value: '45.00' },
        { hour: '19', orders: '25', avg_value: '55.00' }
      ];

      const mockPerformance = {
        avg_order_time: '25.5',
        completion_rate: '85.00',
        cancellation_rate: '5.00'
      };

      const mockPeakHours = [
        { hour: '19', orders: '25', revenue: '1375.00', utilization: '90.00' },
        { hour: '12', orders: '15', revenue: '675.00', utilization: '70.00' }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockOrderStatus })
        .mockResolvedValueOnce({ rows: mockHourlyOrders })
        .mockResolvedValueOnce({ rows: [mockPerformance] })
        .mockResolvedValueOnce({ rows: mockPeakHours });

      const result = await basicAnalyticsService.getOrderAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.ordersByStatus).toHaveLength(3);
      expect(result.ordersByStatus[0].percentage).toBe(85); // 85/100 * 100
      expect(result.ordersByHour).toHaveLength(2);
      expect(result.averageOrderTime).toBe(25.5);
      expect(result.orderCompletionRate).toBe(85);
      expect(result.cancelledOrdersRate).toBe(5);
      expect(result.peakHours).toHaveLength(2);
      expect(result.peakHours[0].hour).toBe(19);
    });
  });

  describe('getMenuAnalytics', () => {
    it('should return menu analytics with item performance', async () => {
      const mockPopularItems = [
        {
          id: 'item-1',
          name: 'Pizza Margherita',
          category: 'Pizza',
          order_count: '50',
          revenue: '2500.00',
          rating: '4.5'
        },
        {
          id: 'item-2',
          name: 'Caesar Salad',
          category: 'Salads',
          order_count: '30',
          revenue: '600.00',
          rating: '4.2'
        }
      ];

      const mockCategoryPerformance = [
        {
          category: 'Pizza',
          revenue: '3000.00',
          orders: '60',
          avg_rating: '4.4'
        },
        {
          category: 'Salads',
          revenue: '800.00',
          orders: '40',
          avg_rating: '4.1'
        }
      ];

      const mockLowPerforming = [
        {
          id: 'item-3',
          name: 'Soup of the Day',
          category: 'Soups',
          order_count: '2',
          revenue: '40.00',
          last_ordered: '2023-09-15T10:00:00Z'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockPopularItems })
        .mockResolvedValueOnce({ rows: mockCategoryPerformance })
        .mockResolvedValueOnce({ rows: mockLowPerforming });

      const result = await basicAnalyticsService.getMenuAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.popularItems).toHaveLength(2);
      expect(result.popularItems[0].itemName).toBe('Pizza Margherita');
      expect(result.popularItems[0].orderCount).toBe(50);
      expect(result.popularItems[0].revenue).toBe(2500);
      expect(result.popularItems[0].rating).toBe(4.5);

      expect(result.categoryPerformance).toHaveLength(2);
      expect(result.categoryPerformance[0].category).toBe('Pizza');
      expect(result.categoryPerformance[0].revenue).toBe(3000);

      expect(result.lowPerformingItems).toHaveLength(1);
      expect(result.lowPerformingItems[0].itemName).toBe('Soup of the Day');
      expect(result.lowPerformingItems[0].orderCount).toBe(2);
    });
  });

  describe('getPerformanceStats', () => {
    it('should return performance statistics', async () => {
      const mockPerformance = {
        avg_service_time: '15.5',
        table_utilization: '75.00',
        customer_satisfaction: '4.2',
        repeat_customer_rate: '65.00'
      };

      const mockWaiterPerformance = [
        {
          id: 'waiter-1',
          name: 'John Doe',
          orders_served: '25',
          avg_service_time: '12.0',
          customer_rating: '4.5',
          efficiency: '8.5'
        },
        {
          id: 'waiter-2',
          name: 'Jane Smith',
          orders_served: '30',
          avg_service_time: '10.0',
          customer_rating: '4.7',
          efficiency: '9.2'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPerformance] })
        .mockResolvedValueOnce({ rows: mockWaiterPerformance });

      const result = await basicAnalyticsService.getPerformanceStats(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.averageServiceTime).toBe(15.5);
      expect(result.tableUtilization).toBe(75);
      expect(result.customerSatisfaction).toBe(4.2);
      expect(result.repeatCustomerRate).toBe(65);
      expect(result.waiterEfficiency).toHaveLength(2);
      expect(result.waiterEfficiency[0].waiterName).toBe('John Doe');
      expect(result.waiterEfficiency[0].ordersServed).toBe(25);
    });
  });

  describe('getTrendAnalytics', () => {
    it('should return trend analytics with growth metrics', async () => {
      const mockWeeklyTrends = [
        { week: '2023-40', revenue: '1200.00', orders: '24', customers: '20' },
        { week: '2023-41', revenue: '1350.00', orders: '27', customers: '22' },
        { week: '2023-42', revenue: '1100.00', orders: '22', customers: '18' }
      ];

      const mockMonthlyTrends = [
        { month: '2023-08', revenue: '4500.00', orders: '90', customers: '75' },
        { month: '2023-09', revenue: '4800.00', orders: '96', customers: '80' },
        { month: '2023-10', revenue: '5000.00', orders: '100', customers: '85' }
      ];

      // Mock the previous period revenue query
      mockPool.query
        .mockResolvedValueOnce({ rows: mockWeeklyTrends })
        .mockResolvedValueOnce({ rows: mockMonthlyTrends })
        .mockResolvedValueOnce({ rows: [{ revenue: '4200.00' }] }); // Previous period revenue

      const result = await basicAnalyticsService.getTrendAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.weeklyTrends).toHaveLength(3);
      expect(result.weeklyTrends[0].week).toBe('2023-40');
      expect(result.weeklyTrends[1].growth).toBeCloseTo(12.5, 1); // (1350-1200)/1200*100

      expect(result.monthlyTrends).toHaveLength(3);
      expect(result.monthlyTrends[0].month).toBe('2023-08');
      expect(result.monthlyTrends[2].growth).toBeCloseTo(4.17, 1); // (5000-4800)/4800*100

      expect(result.growthMetrics.revenueGrowth).toBeCloseTo(9.52, 1); // Based on total vs previous period
      expect(result.growthMetrics.monthOverMonth).toBeCloseTo(4.17, 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(basicAnalyticsService.getOverviewStats(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      )).rejects.toThrow('Database connection failed');
    });

    it('should handle empty result sets', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await basicAnalyticsService.getOverviewStats(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.totalCustomers).toBe(0);
    });

    it('should handle null values in database results', async () => {
      const mockData = {
        total_revenue: null,
        total_orders: null,
        total_customers: null,
        avg_order_value: null,
        conversion_rate: null
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockData] })
        .mockResolvedValueOnce({ rows: [mockData] });

      const result = await basicAnalyticsService.getOverviewStats(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.totalCustomers).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.conversionRate).toBe(0);
    });
  });

  describe('Data Aggregation', () => {
    it('should correctly aggregate daily sales data', async () => {
      const mockDailySales = [
        { date: '2023-10-01T00:00:00Z', revenue: '500.00', orders: '10', customers: '8' },
        { date: '2023-10-02T00:00:00Z', revenue: '750.00', orders: '15', customers: '12' },
        { date: '2023-10-03T00:00:00Z', revenue: '600.00', orders: '12', customers: '10' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockDailySales });

      const result = await basicAnalyticsService.getSalesAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-03')
      );

      expect(result.dailySales).toHaveLength(3);
      
      const totalRevenue = result.dailySales.reduce((sum, day) => sum + day.revenue, 0);
      const totalOrders = result.dailySales.reduce((sum, day) => sum + day.orders, 0);
      const totalCustomers = result.dailySales.reduce((sum, day) => sum + day.customers, 0);

      expect(totalRevenue).toBe(1850);
      expect(totalOrders).toBe(37);
      expect(totalCustomers).toBe(30);
    });

    it('should correctly calculate percentages for payment methods', async () => {
      const mockPaymentMethods = [
        { method: 'stripe', revenue: '3000.00', orders: '60' },
        { method: 'paypal', revenue: '1500.00', orders: '30' },
        { method: 'apple_pay', revenue: '500.00', orders: '10' }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // daily sales
        .mockResolvedValueOnce({ rows: [] }) // hourly sales
        .mockResolvedValueOnce({ rows: mockPaymentMethods }) // payment methods
        .mockResolvedValueOnce({ rows: [] }) // table sales
        .mockResolvedValueOnce({ rows: [] }); // top items

      const result = await basicAnalyticsService.getSalesAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.salesByPaymentMethod).toHaveLength(3);
      expect(result.salesByPaymentMethod[0].percentage).toBe(60); // 3000/5000 * 100
      expect(result.salesByPaymentMethod[1].percentage).toBe(30); // 1500/5000 * 100
      expect(result.salesByPaymentMethod[2].percentage).toBe(10); // 500/5000 * 100
    });
  });
});