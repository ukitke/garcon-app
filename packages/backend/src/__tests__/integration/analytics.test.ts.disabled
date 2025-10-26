import request from 'supertest';
import { app } from '../../app';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Mock the database
jest.mock('../../config/database', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn()
  }))
}));

describe('Analytics Integration Tests', () => {
  let mockPool: jest.Mocked<Pool>;
  let authToken: string;

  beforeEach(() => {
    mockPool = require('../../config/database').getPool();
    
    // Create a test JWT token
    authToken = jwt.sign(
      { 
        userId: 'owner-123', 
        role: 'owner',
        locationId: 'loc-1'
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    jest.clearAllMocks();
  });

  describe('Basic Analytics Endpoints', () => {
    describe('GET /api/analytics/basic/:locationId', () => {
      it('should return complete basic analytics', async () => {
        // Mock overview stats
        const mockOverviewData = {
          total_revenue: '5000.00',
          total_orders: '100',
          total_customers: '80',
          avg_order_value: '50.00',
          conversion_rate: '75.00'
        };

        // Mock previous period data
        const mockPreviousData = {
          total_revenue: '4500.00',
          total_orders: '90',
          total_customers: '75',
          avg_order_value: '50.00',
          conversion_rate: '75.00'
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockOverviewData] })
          .mockResolvedValueOnce({ rows: [mockPreviousData] })
          .mockResolvedValueOnce({ rows: [] }) // daily sales
          .mockResolvedValueOnce({ rows: [] }) // hourly sales
          .mockResolvedValueOnce({ rows: [] }) // payment methods
          .mockResolvedValueOnce({ rows: [] }) // table sales
          .mockResolvedValueOnce({ rows: [] }) // top items
          .mockResolvedValueOnce({ rows: [] }) // order status
          .mockResolvedValueOnce({ rows: [] }) // hourly orders
          .mockResolvedValueOnce({ rows: [{ avg_order_time: '25', completion_rate: '95', cancellation_rate: '5' }] })
          .mockResolvedValueOnce({ rows: [] }) // peak hours
          .mockResolvedValueOnce({ rows: [] }) // popular items
          .mockResolvedValueOnce({ rows: [] }) // category performance
          .mockResolvedValueOnce({ rows: [] }) // low performing items
          .mockResolvedValueOnce({ rows: [{ avg_service_time: '15', table_utilization: '75', customer_satisfaction: '4.2', repeat_customer_rate: '65' }] })
          .mockResolvedValueOnce({ rows: [] }) // waiter performance
          .mockResolvedValueOnce({ rows: [] }) // weekly trends
          .mockResolvedValueOnce({ rows: [] }) // monthly trends
          .mockResolvedValueOnce({ rows: [{ revenue: '4000.00' }] }); // previous period revenue

        const response = await request(app)
          .get('/api/analytics/basic/loc-1')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('overview');
        expect(response.body.data).toHaveProperty('sales');
        expect(response.body.data).toHaveProperty('orders');
        expect(response.body.data).toHaveProperty('menu');
        expect(response.body.data).toHaveProperty('performance');
        expect(response.body.data).toHaveProperty('trends');

        expect(response.body.data.overview.totalRevenue).toBe(5000);
        expect(response.body.data.overview.totalOrders).toBe(100);
      });

      it('should return 400 without required dates', async () => {
        await request(app)
          .get('/api/analytics/basic/loc-1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .get('/api/analytics/basic/loc-1')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .expect(401);
      });
    });

    describe('GET /api/analytics/basic/:locationId/overview', () => {
      it('should return overview statistics', async () => {
        const mockData = {
          total_revenue: '5000.00',
          total_orders: '100',
          total_customers: '80',
          avg_order_value: '50.00',
          conversion_rate: '75.00'
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockData] })
          .mockResolvedValueOnce({ rows: [mockData] });

        const response = await request(app)
          .get('/api/analytics/basic/loc-1/overview')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalRevenue).toBe(5000);
        expect(response.body.data.totalOrders).toBe(100);
        expect(response.body.data.averageOrderValue).toBe(50);
      });
    });

    describe('GET /api/analytics/basic/:locationId/sales', () => {
      it('should return sales analytics', async () => {
        const mockDailySales = [
          { date: '2023-10-01T00:00:00Z', revenue: '500.00', orders: '10', customers: '8' }
        ];

        const mockPaymentMethods = [
          { method: 'stripe', revenue: '3000.00', orders: '60' },
          { method: 'paypal', revenue: '2000.00', orders: '40' }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: mockDailySales })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: mockPaymentMethods })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/analytics/basic/loc-1/sales')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.dailySales).toHaveLength(1);
        expect(response.body.data.salesByPaymentMethod).toHaveLength(2);
        expect(response.body.data.salesByPaymentMethod[0].percentage).toBe(60);
      });
    });

    describe('GET /api/analytics/basic/:locationId/popular-items', () => {
      it('should return popular items with limit', async () => {
        const mockPopularItems = [
          { id: 'item-1', name: 'Pizza', category: 'Main', order_count: '50', revenue: '2500.00', rating: '4.5' },
          { id: 'item-2', name: 'Salad', category: 'Appetizer', order_count: '30', revenue: '600.00', rating: '4.2' }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: mockPopularItems })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/analytics/basic/loc-1/popular-items')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31',
            limit: 5
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].itemName).toBe('Pizza');
        expect(response.body.data[0].orderCount).toBe(50);
      });
    });

    describe('GET /api/analytics/basic/:locationId/daily-summary', () => {
      it('should return daily summary for specific date', async () => {
        const mockOverviewData = {
          total_revenue: '1500.00',
          total_orders: '30',
          total_customers: '25',
          avg_order_value: '50.00',
          conversion_rate: '83.33'
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockOverviewData] })
          .mockResolvedValueOnce({ rows: [mockOverviewData] })
          .mockResolvedValueOnce({ rows: [] }) // sales analytics calls
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }) // order analytics calls
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ avg_order_time: '25', completion_rate: '95', cancellation_rate: '5' }] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/analytics/basic/loc-1/daily-summary')
          .query({ date: '2023-10-15' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.revenue).toBe(1500);
        expect(response.body.data.orders).toBe(30);
        expect(response.body.data.customers).toBe(25);
        expect(response.body.data.completionRate).toBe(95);
      });

      it('should use current date when no date provided', async () => {
        mockPool.query.mockResolvedValue({ rows: [{}] });

        const response = await request(app)
          .get('/api/analytics/basic/loc-1/daily-summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('date');
      });
    });

    describe('POST /api/analytics/basic/:locationId/export', () => {
      it('should export analytics in CSV format', async () => {
        const mockData = {
          total_revenue: '5000.00',
          total_orders: '100',
          total_customers: '80',
          avg_order_value: '50.00',
          conversion_rate: '75.00'
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockData] })
          .mockResolvedValueOnce({ rows: [mockData] });

        const response = await request(app)
          .post('/api/analytics/basic/loc-1/export')
          .send({
            startDate: '2023-10-01',
            endDate: '2023-10-31',
            format: 'csv',
            type: 'overview'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.text).toContain('Metric,Value');
      });

      it('should export analytics in JSON format', async () => {
        const mockData = {
          total_revenue: '5000.00',
          total_orders: '100',
          total_customers: '80',
          avg_order_value: '50.00',
          conversion_rate: '75.00'
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockData] })
          .mockResolvedValueOnce({ rows: [mockData] });

        const response = await request(app)
          .post('/api/analytics/basic/loc-1/export')
          .send({
            startDate: '2023-10-01',
            endDate: '2023-10-31',
            format: 'json',
            type: 'overview'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body.totalRevenue).toBe(5000);
      });
    });
  });

  describe('Premium Analytics Endpoints', () => {
    describe('GET /api/analytics/premium/:locationId', () => {
      it('should return complete premium analytics', async () => {
        // Mock customer segmentation data
        const mockSegmentationData = [
          {
            segment: 'Champions',
            customer_count: '25',
            avg_order_value: '65.00',
            avg_frequency: '8.5',
            total_revenue: '13812.50'
          }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: mockSegmentationData })
          .mockResolvedValueOnce({ rows: [{}] })
          .mockResolvedValueOnce({ rows: [{}] })
          .mockResolvedValueOnce({ rows: [{}] })
          .mockResolvedValueOnce({ rows: [{}] })
          .mockResolvedValueOnce({ rows: [{}] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/analytics/premium/loc-1')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('customerBehavior');
        expect(response.body.data).toHaveProperty('businessInsights');
        expect(response.body.data).toHaveProperty('seasonalTrends');
        expect(response.body.data).toHaveProperty('menuOptimization');
        expect(response.body.data).toHaveProperty('predictiveAnalytics');
        expect(response.body.data).toHaveProperty('competitiveAnalysis');
        expect(response.body.data).toHaveProperty('customReports');
      });
    });

    describe('GET /api/analytics/premium/:locationId/customer-segmentation', () => {
      it('should return customer segmentation analysis', async () => {
        const mockSegmentationData = [
          {
            segment: 'Champions',
            customer_count: '25',
            avg_order_value: '65.00',
            avg_frequency: '8.5',
            total_revenue: '13812.50'
          },
          {
            segment: 'At Risk',
            customer_count: '15',
            avg_order_value: '35.00',
            avg_frequency: '2.1',
            total_revenue: '1102.50'
          }
        ];

        const mockLifecycleData = {
          new_customers: '50',
          returning_customers: '75',
          loyal_customers: '25',
          churned_customers: '10',
          avg_lifespan: '180.5',
          avg_lifetime_value: '485.75'
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: mockSegmentationData })
          .mockResolvedValueOnce({ rows: [mockLifecycleData] })
          .mockResolvedValueOnce({ rows: [{}] });

        const response = await request(app)
          .get('/api/analytics/premium/loc-1/customer-segmentation')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.segments).toHaveLength(2);
        expect(response.body.data.segments[0].name).toBe('Champions');
        expect(response.body.data.lifecycle.newCustomers).toBe(50);
        expect(response.body.data.loyaltyMetrics).toBeDefined();
      });
    });

    describe('GET /api/analytics/premium/:locationId/churn-analysis', () => {
      it('should return churn analysis', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{}] })
          .mockResolvedValueOnce({ rows: [{}] });

        const response = await request(app)
          .get('/api/analytics/premium/loc-1/churn-analysis')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('churnRate');
        expect(response.body.data).toHaveProperty('churnReasons');
        expect(response.body.data).toHaveProperty('retentionStrategies');
      });
    });

    describe('GET /api/analytics/premium/:locationId/demand-forecast', () => {
      it('should return demand forecast', async () => {
        const mockForecastData = [
          { forecast_date: '2023-11-01T00:00:00Z', predicted_demand: '1250.00' },
          { forecast_date: '2023-11-02T00:00:00Z', predicted_demand: '1100.00' }
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockForecastData });

        const response = await request(app)
          .get('/api/analytics/premium/loc-1/demand-forecast')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31',
            days: 2
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.forecast).toHaveLength(2);
        expect(response.body.data.forecast[0].predictedDemand).toBe(1250);
        expect(response.body.data.accuracy).toBeDefined();
        expect(response.body.data.factors).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/analytics/premium/:locationId/menu-engineering', () => {
      it('should return menu engineering analysis', async () => {
        const mockItemPerformance = [
          {
            id: 'item-1',
            name: 'High Profit High Pop',
            order_count: '50',
            revenue: '2500.00',
            avg_price: '50.00',
            profitability: '0.80',
            popularity: '80.00'
          },
          {
            id: 'item-2',
            name: 'Low Profit High Pop',
            order_count: '40',
            revenue: '1200.00',
            avg_price: '30.00',
            profitability: '0.40',
            popularity: '70.00'
          },
          {
            id: 'item-3',
            name: 'High Profit Low Pop',
            order_count: '10',
            revenue: '500.00',
            avg_price: '50.00',
            profitability: '0.80',
            popularity: '20.00'
          },
          {
            id: 'item-4',
            name: 'Low Profit Low Pop',
            order_count: '5',
            revenue: '100.00',
            avg_price: '20.00',
            profitability: '0.30',
            popularity: '10.00'
          }
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockItemPerformance });

        const response = await request(app)
          .get('/api/analytics/premium/loc-1/menu-engineering')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stars).toHaveLength(1); // High profit, high popularity
        expect(response.body.data.plowhorses).toHaveLength(1); // Low profit, high popularity
        expect(response.body.data.puzzles).toHaveLength(1); // High profit, low popularity
        expect(response.body.data.dogs).toHaveLength(1); // Low profit, low popularity
        expect(response.body.data.recommendations).toHaveLength(4);
      });
    });

    describe('POST /api/analytics/premium/:locationId/custom-reports', () => {
      it('should create a custom report', async () => {
        const reportData = {
          name: 'Weekly Revenue Report',
          description: 'Weekly revenue breakdown',
          metrics: ['revenue', 'orders'],
          schedule: { frequency: 'weekly', time: '09:00', timezone: 'UTC', enabled: true },
          format: 'pdf',
          recipients: ['owner@restaurant.com']
        };

        const response = await request(app)
          .post('/api/analytics/premium/loc-1/custom-reports')
          .send(reportData)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Weekly Revenue Report');
        expect(response.body.data.metrics).toEqual(['revenue', 'orders']);
        expect(response.body.data.status).toBe('active');
      });

      it('should return 400 for invalid report data', async () => {
        const invalidData = {
          name: 'Test Report'
          // Missing required metrics
        };

        await request(app)
          .post('/api/analytics/premium/loc-1/custom-reports')
          .send(invalidData)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('POST /api/analytics/premium/:locationId/export', () => {
      it('should export premium analytics in JSON format', async () => {
        mockPool.query.mockResolvedValue({ rows: [] });

        const response = await request(app)
          .post('/api/analytics/premium/loc-1/export')
          .send({
            startDate: '2023-10-01',
            endDate: '2023-10-31',
            format: 'json',
            sections: ['customerBehavior', 'businessInsights']
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should export premium analytics in CSV format', async () => {
        const mockSegmentationData = [
          {
            segment: 'Champions',
            customer_count: '25',
            avg_order_value: '65.00',
            avg_frequency: '8.5',
            total_revenue: '13812.50'
          }
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: mockSegmentationData })
          .mockResolvedValueOnce({ rows: [{}] })
          .mockResolvedValueOnce({ rows: [{}] });

        const response = await request(app)
          .post('/api/analytics/premium/loc-1/export')
          .send({
            startDate: '2023-10-01',
            endDate: '2023-10-31',
            format: 'csv',
            sections: ['customerBehavior']
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('Segment,Customer Count');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      await request(app)
        .get('/api/analytics/basic/loc-1/overview')
        .query({
          startDate: '2023-10-01',
          endDate: '2023-10-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });

    it('should handle invalid date formats', async () => {
      await request(app)
        .get('/api/analytics/basic/loc-1/overview')
        .query({
          startDate: 'invalid-date',
          endDate: '2023-10-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // Date parsing will fail
    });

    it('should handle missing authentication', async () => {
      await request(app)
        .get('/api/analytics/basic/loc-1/overview')
        .query({
          startDate: '2023-10-01',
          endDate: '2023-10-31'
        })
        .expect(401);
    });

    it('should handle invalid JWT tokens', async () => {
      await request(app)
        .get('/api/analytics/basic/loc-1/overview')
        .query({
          startDate: '2023-10-01',
          endDate: '2023-10-31'
        })
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large date ranges efficiently', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const startTime = Date.now();
      
      await request(app)
        .get('/api/analytics/basic/loc-1/overview')
        .query({
          startDate: '2022-01-01',
          endDate: '2023-12-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 5 seconds even for large date ranges
      expect(responseTime).toBeLessThan(5000);
    });

    it('should handle concurrent requests', async () => {
      mockPool.query.mockResolvedValue({ rows: [{}] });

      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/analytics/basic/loc-1/overview')
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31'
          })
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});