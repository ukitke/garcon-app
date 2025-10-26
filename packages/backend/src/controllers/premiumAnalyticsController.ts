import { Request, Response } from 'express';
import { premiumAnalyticsService } from '../services/premiumAnalyticsService';

export class PremiumAnalyticsController {
  async getPremiumAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const analytics = await premiumAnalyticsService.getPremiumAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching premium analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch premium analytics'
      });
    }
  }

  async getCustomerBehaviorAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const customerBehavior = await premiumAnalyticsService.getCustomerBehaviorAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: customerBehavior
      });
    } catch (error) {
      console.error('Error fetching customer behavior analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer behavior analytics'
      });
    }
  }

  async getBusinessInsights(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const businessInsights = await premiumAnalyticsService.getBusinessInsights(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: businessInsights
      });
    } catch (error) {
      console.error('Error fetching business insights:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch business insights'
      });
    }
  }

  async getSeasonalTrends(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const seasonalTrends = await premiumAnalyticsService.getSeasonalTrends(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: seasonalTrends
      });
    } catch (error) {
      console.error('Error fetching seasonal trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch seasonal trends'
      });
    }
  }

  async getMenuOptimization(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const menuOptimization = await premiumAnalyticsService.getMenuOptimization(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: menuOptimization
      });
    } catch (error) {
      console.error('Error fetching menu optimization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu optimization'
      });
    }
  }

  async getPredictiveAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const predictiveAnalytics = await premiumAnalyticsService.getPredictiveAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: predictiveAnalytics
      });
    } catch (error) {
      console.error('Error fetching predictive analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch predictive analytics'
      });
    }
  }

  async getCompetitiveAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const competitiveAnalysis = await premiumAnalyticsService.getCompetitiveAnalysis(locationId);

      res.json({
        success: true,
        data: competitiveAnalysis
      });
    } catch (error) {
      console.error('Error fetching competitive analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch competitive analysis'
      });
    }
  }

  async getCustomerSegmentation(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const customerBehavior = await premiumAnalyticsService.getCustomerBehaviorAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: {
          segments: customerBehavior.customerSegments,
          lifecycle: customerBehavior.customerLifecycle,
          loyaltyMetrics: customerBehavior.loyaltyMetrics
        }
      });
    } catch (error) {
      console.error('Error fetching customer segmentation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer segmentation'
      });
    }
  }

  async getChurnAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const customerBehavior = await premiumAnalyticsService.getCustomerBehaviorAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: customerBehavior.churnAnalysis
      });
    } catch (error) {
      console.error('Error fetching churn analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch churn analysis'
      });
    }
  }

  async getRevenueDrivers(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const businessInsights = await premiumAnalyticsService.getBusinessInsights(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: {
          revenueDrivers: businessInsights.revenueDrivers,
          profitability: businessInsights.profitabilityAnalysis
        }
      });
    } catch (error) {
      console.error('Error fetching revenue drivers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue drivers'
      });
    }
  }

  async getDemandForecast(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate, days = 7 } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const predictiveAnalytics = await premiumAnalyticsService.getPredictiveAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      const forecast = predictiveAnalytics.demandForecasting.slice(0, parseInt(days as string));

      res.json({
        success: true,
        data: {
          forecast,
          accuracy: 'Based on historical trends and patterns',
          confidence: 'Medium to High',
          factors: ['Historical data', 'Day of week patterns', 'Seasonal trends']
        }
      });
    } catch (error) {
      console.error('Error fetching demand forecast:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch demand forecast'
      });
    }
  }

  async getMenuEngineering(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const menuOptimization = await premiumAnalyticsService.getMenuOptimization(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      // Categorize items based on profitability and popularity
      const items = menuOptimization.itemPerformance;
      const avgProfitability = items.reduce((sum, item) => sum + item.profitability, 0) / items.length;
      const avgPopularity = items.reduce((sum, item) => sum + item.popularity, 0) / items.length;

      const menuEngineering = {
        stars: items.filter(item => item.profitability > avgProfitability && item.popularity > avgPopularity),
        plowhorses: items.filter(item => item.profitability <= avgProfitability && item.popularity > avgPopularity),
        puzzles: items.filter(item => item.profitability > avgProfitability && item.popularity <= avgPopularity),
        dogs: items.filter(item => item.profitability <= avgProfitability && item.popularity <= avgPopularity),
        recommendations: [
          {
            type: 'Promote Stars',
            description: 'Highlight high-profit, popular items',
            impact: 'High revenue increase',
            priority: 'high' as const
          },
          {
            type: 'Reposition Puzzles',
            description: 'Increase marketing for profitable but unpopular items',
            impact: 'Medium revenue increase',
            priority: 'medium' as const
          },
          {
            type: 'Reduce Costs for Plowhorses',
            description: 'Optimize costs for popular but low-profit items',
            impact: 'Improved margins',
            priority: 'medium' as const
          },
          {
            type: 'Consider Removing Dogs',
            description: 'Evaluate removing low-profit, unpopular items',
            impact: 'Cost reduction',
            priority: 'low' as const
          }
        ]
      };

      res.json({
        success: true,
        data: menuEngineering
      });
    } catch (error) {
      console.error('Error fetching menu engineering:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu engineering'
      });
    }
  }

  async getCustomReports(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const customReports = await premiumAnalyticsService.getCustomReports(locationId);

      res.json({
        success: true,
        data: customReports
      });
    } catch (error) {
      console.error('Error fetching custom reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch custom reports'
      });
    }
  }

  async createCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { name, description, metrics, filters, schedule, format, recipients } = req.body;

      if (!name || !metrics || !Array.isArray(metrics)) {
        res.status(400).json({
          success: false,
          error: 'Name and metrics array are required'
        });
        return;
      }

      // TODO: Implement custom report creation in database
      const reportId = `report_${Date.now()}`;

      res.status(201).json({
        success: true,
        data: {
          id: reportId,
          name,
          description,
          metrics,
          filters: filters || [],
          schedule: schedule || { frequency: 'weekly', time: '09:00', timezone: 'UTC', enabled: false },
          format: format || 'pdf',
          recipients: recipients || [],
          createdAt: new Date(),
          status: 'active'
        }
      });
    } catch (error) {
      console.error('Error creating custom report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create custom report'
      });
    }
  }

  async generateCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, reportId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      // TODO: Implement custom report generation
      const reportData = {
        reportId,
        locationId,
        generatedAt: new Date(),
        period: {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        },
        data: {
          summary: 'Custom report generated successfully',
          metrics: [],
          charts: [],
          insights: []
        }
      };

      res.json({
        success: true,
        data: reportData
      });
    } catch (error) {
      console.error('Error generating custom report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate custom report'
      });
    }
  }

  async exportPremiumAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate, format = 'json', sections } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const analytics = await premiumAnalyticsService.getPremiumAnalytics(
        locationId,
        new Date(startDate),
        new Date(endDate)
      );

      // Filter sections if specified
      let exportData = analytics;
      if (sections && Array.isArray(sections)) {
        exportData = {};
        sections.forEach(section => {
          if (analytics[section as keyof typeof analytics]) {
            (exportData as any)[section] = analytics[section as keyof typeof analytics];
          }
        });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `premium_analytics_${locationId}_${timestamp}`;

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertAnalyticsToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      } else if (format === 'excel') {
        // TODO: Implement Excel export
        res.status(501).json({
          success: false,
          error: 'Excel export not yet implemented'
        });
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json(exportData);
      }
    } catch (error) {
      console.error('Error exporting premium analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export premium analytics'
      });
    }
  }

  private convertAnalyticsToCSV(data: any): string {
    // Simple CSV conversion for customer segments
    if (data.customerBehavior && data.customerBehavior.customerSegments) {
      const headers = ['Segment', 'Customer Count', 'Average Order Value', 'Frequency', 'Total Revenue'];
      const rows = data.customerBehavior.customerSegments.map((segment: any) => [
        segment.name,
        segment.customerCount,
        segment.averageOrderValue,
        segment.frequency,
        segment.totalRevenue
      ]);

      return [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
    }

    // Fallback to JSON string
    return JSON.stringify(data, null, 2);
  }
}

export const premiumAnalyticsController = new PremiumAnalyticsController();