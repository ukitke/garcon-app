import { PremiumAnalyticsService } from '../../services/premiumAnalyticsService';
import { Pool } from 'pg';

// Mock the database pool
jest.mock('../../config/database', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn()
  }))
}));

describe('PremiumAnalyticsService', () => {
  let premiumAnalyticsService: PremiumAnalyticsService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    premiumAnalyticsService = new PremiumAnalyticsService();
    mockPool = require('../../config/database').getPool();
    jest.clearAllMocks();
  });

  describe('getPremiumAnalytics', () => {
    it('should return complete premium analytics data', async () => {
      // Mock all the individual method calls
      jest.spyOn(premiumAnalyticsService, 'getCustomerBehaviorAnalytics').mockResolvedValueOnce({
        customerSegments: [],
        customerLifecycle: {
          newCustomers: 50,
          returningCustomers: 30,
          loyalCustomers: 20,
          churnedCustomers: 10,
          averageLifespan: 180,
          lifetimeValue: 500,
          acquisitionCost: 25,
          retentionRate: 75
        },
        behaviorPatterns: [],
        loyaltyMetrics: {
          npsScore: 8.5,
          repeatPurchaseRate: 65,
          averageOrderFrequency: 2.5,
          customerSatisfactionScore: 4.2,
          loyaltyProgramEngagement: 40,
          referralRate: 15
        },
        churnAnalysis: {
          churnRate: 15,
          churnReasons: [],
          atRiskCustomers: [],
          retentionStrategies: [],
          churnPrevention: {
            earlyWarningSignals: [],
            interventionTriggers: [],
            preventionTactics: []
          }
        },
        customerJourney: []
      });

      jest.spyOn(premiumAnalyticsService, 'getBusinessInsights').mockResolvedValueOnce({
        revenueDrivers: [],
        profitabilityAnalysis: {
          grossMargin: 70,
          netMargin: 15,
          profitByCategory: [],
          profitByTime: [],
          costBreakdown: [],
          marginTrends: []
        },
        operationalEfficiency: {
          tableUtilization: 75,
          staffEfficiency: 85,
          kitchenEfficiency: 90,
          serviceSpeed: 12,
          wasteReduction: 20,
          energyEfficiency: 80
        },
        marketingInsights: {
          campaignEffectiveness: [],
          channelPerformance: [],
          customerAcquisitionCost: 25,
          returnOnMarketingInvestment: 300,
          brandSentiment: {
            overallSentiment: 75,
            positiveReviews: 80,
            negativeReviews: 10,
            neutralReviews: 10,
            sentimentTrends: []
          }
        },
        staffPerformance: {
          productivityMetrics: [],
          customerSatisfactionByStaff: [],
          trainingNeeds: [],
          performanceComparison: []
        },
        costAnalysis: {
          foodCosts: 30,
          laborCosts: 35,
          overheadCosts: 20,
          costPerCustomer: 15,
          costTrends: [],
          costOptimization: []
        }
      });

      jest.spyOn(premiumAnalyticsService, 'getSeasonalTrends').mockResolvedValueOnce({
        yearOverYear: [],
        seasonalPatterns: [],
        holidayImpact: [],
        weatherCorrelation: [],
        eventImpact: [],
        forecastAccuracy: {
          metric: 'revenue',
          accuracy: 85,
          meanAbsoluteError: 5.2,
          confidenceInterval: 90
        }
      });

      jest.spyOn(premiumAnalyticsService, 'getMenuOptimization').mockResolvedValueOnce({
        itemPerformance: [],
        pricingOptimization: [],
        menuEngineering: {
          stars: [],
          plowhorses: [],
          puzzles: [],
          dogs: [],
          recommendations: []
        },
        crossSelling: {
          itemPairs: [],
          bundleOpportunities: [],
          upsellPotential: []
        },
        inventoryOptimization: {
          optimalStockLevels: [],
          reorderPoints: [],
          wasteReduction: [],
          supplierPerformance: []
        },
        nutritionalAnalysis: []
      });

      jest.spyOn(premiumAnalyticsService, 'getPredictiveAnalytics').mockResolvedValueOnce({
        demandForecasting: [],
        revenueProjections: [],
        customerLifetimeValue: [],
        churnPrediction: [],
        inventoryForecasting: [],
        staffingOptimization: []
      });

      jest.spyOn(premiumAnalyticsService, 'getCompetitiveAnalysis').mockResolvedValueOnce({
        marketPosition: {
          overallRanking: 3,
          categoryRanking: 2,
          strengthAreas: [],
          improvementAreas: [],
          competitiveAdvantages: []
        },
        benchmarking: {
          metric: 'AOV',
          yourValue: 45,
          industryAverage: 40,
          topPerformers: 55,
          percentile: 75
        },
        pricingComparison: [],
        marketShare: {
          totalMarket: 1000000,
          yourShare: 50000,
          sharePercentage: 5,
          trend: 'growing',
          opportunities: []
        },
        competitorInsights: []
      });

      jest.spyOn(premiumAnalyticsService, 'getCustomReports').mockResolvedValueOnce([]);

      const result = await premiumAnalyticsService.getPremiumAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result).toHaveProperty('customerBehavior');
      expect(result).toHaveProperty('businessInsights');
      expect(result).toHaveProperty('seasonalTrends');
      expect(result).toHaveProperty('menuOptimization');
      expect(result).toHaveProperty('predictiveAnalytics');
      expect(result).toHaveProperty('competitiveAnalysis');
      expect(result).toHaveProperty('customReports');
    });
  });

  describe('getCustomerBehaviorAnalytics', () => {
    it('should return customer segmentation based on RFM analysis', async () => {
      const mockSegmentationData = [
        {
          segment: 'Champions',
          customer_count: '25',
          avg_order_value: '65.00',
          avg_frequency: '8.5',
          total_revenue: '13812.50'
        },
        {
          segment: 'Loyal Customers',
          customer_count: '40',
          avg_order_value: '45.00',
          avg_frequency: '5.2',
          total_revenue: '9360.00'
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

      const mockLoyaltyData = {
        avg_satisfaction: '4.2',
        repeat_rate: '65.5',
        avg_frequency: '2.8'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: mockSegmentationData })
        .mockResolvedValueOnce({ rows: [mockLifecycleData] })
        .mockResolvedValueOnce({ rows: [mockLoyaltyData] });

      const result = await premiumAnalyticsService.getCustomerBehaviorAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.customerSegments).toHaveLength(3);
      expect(result.customerSegments[0].name).toBe('Champions');
      expect(result.customerSegments[0].customerCount).toBe(25);
      expect(result.customerSegments[0].averageOrderValue).toBe(65);
      expect(result.customerSegments[0].totalRevenue).toBe(13812.5);

      expect(result.customerLifecycle.newCustomers).toBe(50);
      expect(result.customerLifecycle.returningCustomers).toBe(75);
      expect(result.customerLifecycle.loyalCustomers).toBe(25);
      expect(result.customerLifecycle.averageLifespan).toBe(180.5);

      expect(result.loyaltyMetrics.repeatPurchaseRate).toBe(65.5);
      expect(result.loyaltyMetrics.customerSatisfactionScore).toBe(4.2);

      expect(result.behaviorPatterns).toHaveLength(2);
      expect(result.churnAnalysis.churnRate).toBe(15.5);
      expect(result.customerJourney).toHaveLength(2);
    });

    it('should handle segment descriptions and recommendations', async () => {
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

      const result = await premiumAnalyticsService.getCustomerBehaviorAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      const championsSegment = result.customerSegments[0];
      expect(championsSegment.description).toContain('High-value customers');
      expect(championsSegment.characteristics).toContain('High frequency');
      expect(championsSegment.recommendations).toContain('VIP treatment');
    });
  });

  describe('getBusinessInsights', () => {
    it('should return comprehensive business insights', async () => {
      const mockProfitabilityData = {
        total_revenue: '50000.00',
        estimated_costs: '15000.00',
        gross_profit: '35000.00',
        gross_margin: '70.00'
      };

      const mockEfficiencyData = {
        table_utilization: '75.50',
        avg_response_time: '12.5',
        order_completion_rate: '94.5'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockProfitabilityData] })
        .mockResolvedValueOnce({ rows: [mockEfficiencyData] });

      const result = await premiumAnalyticsService.getBusinessInsights(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.revenueDrivers).toHaveLength(2);
      expect(result.revenueDrivers[0].driver).toBe('Menu Item Popularity');
      expect(result.revenueDrivers[0].impact).toBe(35);

      expect(result.profitabilityAnalysis.grossMargin).toBe(70);
      expect(result.operationalEfficiency.tableUtilization).toBe(75.5);
      expect(result.operationalEfficiency.serviceSpeed).toBe(12.5);
    });
  });

  describe('getSeasonalTrends', () => {
    it('should return year-over-year trends', async () => {
      const mockYoYData = {
        metric: 'revenue',
        current_year: '50000.00',
        previous_year: '45000.00'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockYoYData] });

      const result = await premiumAnalyticsService.getSeasonalTrends(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.yearOverYear).toHaveLength(1);
      expect(result.yearOverYear[0].metric).toBe('revenue');
      expect(result.yearOverYear[0].currentYear).toBe(50000);
      expect(result.yearOverYear[0].previousYear).toBe(45000);
      expect(result.yearOverYear[0].growth).toBeCloseTo(11.11, 1);
    });

    it('should handle zero previous year values', async () => {
      const mockYoYData = {
        metric: 'revenue',
        current_year: '50000.00',
        previous_year: '0'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockYoYData] });

      const result = await premiumAnalyticsService.getSeasonalTrends(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.yearOverYear[0].growth).toBe(0);
    });
  });

  describe('getMenuOptimization', () => {
    it('should return item performance analysis', async () => {
      const mockItemPerformance = [
        {
          id: 'item-1',
          name: 'Pizza Margherita',
          order_count: '50',
          revenue: '2500.00',
          avg_price: '50.00',
          profitability: '0.75',
          popularity: '25.00'
        },
        {
          id: 'item-2',
          name: 'Caesar Salad',
          order_count: '30',
          revenue: '600.00',
          avg_price: '20.00',
          profitability: '0.60',
          popularity: '15.00'
        },
        {
          id: 'item-3',
          name: 'Soup Special',
          order_count: '5',
          revenue: '75.00',
          avg_price: '15.00',
          profitability: '0.40',
          popularity: '2.50'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockItemPerformance });

      const result = await premiumAnalyticsService.getMenuOptimization(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.itemPerformance).toHaveLength(3);
      
      const pizzaItem = result.itemPerformance[0];
      expect(pizzaItem.itemName).toBe('Pizza Margherita');
      expect(pizzaItem.profitability).toBe(0.75);
      expect(pizzaItem.popularity).toBe(25);
      expect(pizzaItem.recommendation).toBe('Star - Promote heavily');

      const saladItem = result.itemPerformance[1];
      expect(saladItem.recommendation).toBe('Plow Horse - Reduce costs');

      const soupItem = result.itemPerformance[2];
      expect(soupItem.recommendation).toBe('Dog - Consider removal');
    });

    it('should categorize items correctly based on performance', async () => {
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
          name: 'High Profit Low Pop',
          order_count: '10',
          revenue: '500.00',
          avg_price: '50.00',
          profitability: '0.80',
          popularity: '20.00'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockItemPerformance });

      const result = await premiumAnalyticsService.getMenuOptimization(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.itemPerformance[0].recommendation).toBe('Star - Promote heavily');
      expect(result.itemPerformance[1].recommendation).toBe('Puzzle - Increase marketing');
    });
  });

  describe('getPredictiveAnalytics', () => {
    it('should return demand forecasting', async () => {
      const mockForecastData = [
        {
          forecast_date: '2023-11-01T00:00:00Z',
          predicted_demand: '1250.00'
        },
        {
          forecast_date: '2023-11-02T00:00:00Z',
          predicted_demand: '1100.00'
        },
        {
          forecast_date: '2023-11-03T00:00:00Z',
          predicted_demand: '1400.00'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockForecastData });

      const result = await premiumAnalyticsService.getPredictiveAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.demandForecasting).toHaveLength(3);
      expect(result.demandForecasting[0].predictedDemand).toBe(1250);
      expect(result.demandForecasting[0].confidenceInterval).toEqual([1000, 1500]);
      expect(result.demandForecasting[0].factors).toHaveLength(2);
      expect(result.demandForecasting[0].factors[0].factor).toBe('Historical Trend');
    });

    it('should handle empty forecast data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await premiumAnalyticsService.getPredictiveAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.demandForecasting).toHaveLength(0);
    });
  });

  describe('getCompetitiveAnalysis', () => {
    it('should return mock competitive analysis data', async () => {
      const result = await premiumAnalyticsService.getCompetitiveAnalysis('loc-1');

      expect(result.marketPosition.overallRanking).toBe(3);
      expect(result.marketPosition.categoryRanking).toBe(2);
      expect(result.marketPosition.strengthAreas).toContain('Service Quality');
      expect(result.marketPosition.improvementAreas).toContain('Price Competitiveness');

      expect(result.benchmarking.metric).toBe('Average Order Value');
      expect(result.benchmarking.yourValue).toBe(25.50);
      expect(result.benchmarking.industryAverage).toBe(22.30);
      expect(result.benchmarking.percentile).toBe(75);

      expect(result.marketShare.sharePercentage).toBe(5.0);
      expect(result.marketShare.trend).toBe('growing');
    });
  });

  describe('getCustomReports', () => {
    it('should return custom reports for location', async () => {
      const mockReports = [
        {
          id: 'report-1',
          name: 'Weekly Revenue Report',
          description: 'Weekly revenue breakdown',
          metrics: ['revenue', 'orders'],
          filters: [],
          schedule: { frequency: 'weekly', time: '09:00', timezone: 'UTC', enabled: true },
          format: 'pdf',
          recipients: ['owner@restaurant.com']
        },
        {
          id: 'report-2',
          name: 'Monthly Customer Analysis',
          description: 'Monthly customer behavior analysis',
          metrics: ['customers', 'retention'],
          filters: [],
          schedule: { frequency: 'monthly', time: '08:00', timezone: 'UTC', enabled: false },
          format: 'excel',
          recipients: ['manager@restaurant.com']
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockReports });

      const result = await premiumAnalyticsService.getCustomReports('loc-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Weekly Revenue Report');
      expect(result[0].metrics).toEqual(['revenue', 'orders']);
      expect(result[0].schedule.frequency).toBe('weekly');
      expect(result[1].name).toBe('Monthly Customer Analysis');
      expect(result[1].format).toBe('excel');
    });

    it('should handle empty custom reports', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await premiumAnalyticsService.getCustomReports('loc-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('Helper Methods', () => {
    it('should provide correct segment descriptions', async () => {
      const service = premiumAnalyticsService as any;
      
      expect(service.getSegmentDescription('Champions')).toContain('High-value customers');
      expect(service.getSegmentDescription('At Risk')).toContain('haven\'t visited recently');
      expect(service.getSegmentDescription('Unknown Segment')).toBe('Customer segment');
    });

    it('should provide correct segment characteristics', async () => {
      const service = premiumAnalyticsService as any;
      
      const championsCharacteristics = service.getSegmentCharacteristics('Champions');
      expect(championsCharacteristics).toContain('High frequency');
      expect(championsCharacteristics).toContain('High spend');

      const atRiskCharacteristics = service.getSegmentCharacteristics('At Risk');
      expect(atRiskCharacteristics).toContain('Declining frequency');
      expect(atRiskCharacteristics).toContain('Needs attention');
    });

    it('should provide correct segment recommendations', async () => {
      const service = premiumAnalyticsService as any;
      
      const championsRecommendations = service.getSegmentRecommendations('Champions');
      expect(championsRecommendations).toContain('VIP treatment');
      expect(championsRecommendations).toContain('Exclusive offers');

      const newCustomerRecommendations = service.getSegmentRecommendations('New Customers');
      expect(newCustomerRecommendations).toContain('Welcome offers');
      expect(newCustomerRecommendations).toContain('Menu guidance');
    });

    it('should provide correct item recommendations', async () => {
      const service = premiumAnalyticsService as any;
      
      expect(service.getItemRecommendation(0.8, 0.8)).toBe('Star - Promote heavily');
      expect(service.getItemRecommendation(0.8, 0.5)).toBe('Puzzle - Increase marketing');
      expect(service.getItemRecommendation(0.5, 0.8)).toBe('Plow Horse - Reduce costs');
      expect(service.getItemRecommendation(0.5, 0.5)).toBe('Dog - Consider removal');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(premiumAnalyticsService.getCustomerBehaviorAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      )).rejects.toThrow('Database connection failed');
    });

    it('should handle empty result sets', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [{}] });

      const result = await premiumAnalyticsService.getCustomerBehaviorAnalytics(
        'loc-1',
        new Date('2023-10-01'),
        new Date('2023-10-31')
      );

      expect(result.customerSegments).toHaveLength(0);
      expect(result.customerLifecycle.newCustomers).toBe(0);
    });
  });
});