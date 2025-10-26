import { Request, Response } from 'express';
import { basicAnalyticsService } from '../services/basicAnalyticsService';

export class BasicAnalyticsController {
  async getBasicAnalytics(req: Request, res: Response): Promise<void> {
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

      const analytics = await basicAnalyticsService.getBasicAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching basic analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch basic analytics'
      });
    }
  }

  async getOverviewStats(req: Request, res: Response): Promise<void> {
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

      const overview = await basicAnalyticsService.getOverviewStats(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch overview stats'
      });
    }
  }

  async getSalesAnalytics(req: Request, res: Response): Promise<void> {
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

      const sales = await basicAnalyticsService.getSalesAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: sales
      });
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sales analytics'
      });
    }
  }

  async getOrderAnalytics(req: Request, res: Response): Promise<void> {
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

      const orders = await basicAnalyticsService.getOrderAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order analytics'
      });
    }
  }

  async getMenuAnalytics(req: Request, res: Response): Promise<void> {
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

      const menu = await basicAnalyticsService.getMenuAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      console.error('Error fetching menu analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu analytics'
      });
    }
  }

  async getPerformanceStats(req: Request, res: Response): Promise<void> {
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

      const performance = await basicAnalyticsService.getPerformanceStats(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance stats'
      });
    }
  }

  async getTrendAnalytics(req: Request, res: Response): Promise<void> {
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

      const trends = await basicAnalyticsService.getTrendAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Error fetching trend analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trend analytics'
      });
    }
  }

  async getPopularItems(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate, limit = 10 } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const menu = await basicAnalyticsService.getMenuAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      const popularItems = menu.popularItems.slice(0, parseInt(limit as string));

      res.json({
        success: true,
        data: popularItems
      });
    } catch (error) {
      console.error('Error fetching popular items:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch popular items'
      });
    }
  }

  async getDailySummary(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { date } = req.query;

      const targetDate = date ? new Date(date as string) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const [overview, sales, orders] = await Promise.all([
        basicAnalyticsService.getOverviewStats(locationId, startOfDay, endOfDay),
        basicAnalyticsService.getSalesAnalytics(locationId, startOfDay, endOfDay),
        basicAnalyticsService.getOrderAnalytics(locationId, startOfDay, endOfDay)
      ]);

      const summary = {
        date: targetDate,
        revenue: overview.totalRevenue,
        orders: overview.totalOrders,
        customers: overview.totalCustomers,
        averageOrderValue: overview.averageOrderValue,
        peakHour: orders.peakHours[0] || null,
        topPaymentMethod: sales.salesByPaymentMethod[0] || null,
        completionRate: orders.orderCompletionRate
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch daily summary'
      });
    }
  }

  async getWeeklySummary(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { week } = req.query;

      // Calculate week start and end
      const targetDate = week ? new Date(week as string) : new Date();
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const [overview, sales, trends] = await Promise.all([
        basicAnalyticsService.getOverviewStats(locationId, startOfWeek, endOfWeek),
        basicAnalyticsService.getSalesAnalytics(locationId, startOfWeek, endOfWeek),
        basicAnalyticsService.getTrendAnalytics(locationId, startOfWeek, endOfWeek)
      ]);

      const summary = {
        week: `${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}`,
        revenue: overview.totalRevenue,
        orders: overview.totalOrders,
        customers: overview.totalCustomers,
        averageOrderValue: overview.averageOrderValue,
        dailyBreakdown: sales.dailySales,
        growth: overview.previousPeriodComparison.revenue,
        bestDay: sales.dailySales.reduce((best, day) => 
          day.revenue > best.revenue ? day : best, sales.dailySales[0] || { revenue: 0 }
        )
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch weekly summary'
      });
    }
  }

  async getMonthlySummary(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { month } = req.query;

      // Calculate month start and end
      const targetDate = month ? new Date(month as string) : new Date();
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const [overview, sales, menu, trends] = await Promise.all([
        basicAnalyticsService.getOverviewStats(locationId, startOfMonth, endOfMonth),
        basicAnalyticsService.getSalesAnalytics(locationId, startOfMonth, endOfMonth),
        basicAnalyticsService.getMenuAnalytics(locationId, startOfMonth, endOfMonth),
        basicAnalyticsService.getTrendAnalytics(locationId, startOfMonth, endOfMonth)
      ]);

      const summary = {
        month: targetDate.toISOString().slice(0, 7),
        revenue: overview.totalRevenue,
        orders: overview.totalOrders,
        customers: overview.totalCustomers,
        averageOrderValue: overview.averageOrderValue,
        growth: overview.previousPeriodComparison.revenue,
        topItems: menu.popularItems.slice(0, 5),
        weeklyTrends: trends.weeklyTrends,
        categoryPerformance: menu.categoryPerformance
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch monthly summary'
      });
    }
  }

  async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate, format = 'json', type = 'overview' } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      let data: any;

      switch (type) {
        case 'overview':
          data = await basicAnalyticsService.getOverviewStats(
            locationId,
            new Date(startDate),
            new Date(endDate)
          );
          break;
        case 'sales':
          data = await basicAnalyticsService.getSalesAnalytics(
            locationId,
            new Date(startDate),
            new Date(endDate)
          );
          break;
        case 'orders':
          data = await basicAnalyticsService.getOrderAnalytics(
            locationId,
            new Date(startDate),
            new Date(endDate)
          );
          break;
        case 'menu':
          data = await basicAnalyticsService.getMenuAnalytics(
            locationId,
            new Date(startDate),
            new Date(endDate)
          );
          break;
        case 'full':
          data = await basicAnalyticsService.getBasicAnalytics(
            locationId,
            new Date(startDate),
            new Date(endDate)
          );
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Invalid export type'
          });
          return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${type}_analytics_${locationId}_${timestamp}`;

      if (format === 'csv') {
        const csv = this.convertToCSV(data, type);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json(data);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics'
      });
    }
  }

  private convertToCSV(data: any, type: string): string {
    switch (type) {
      case 'overview':
        return this.overviewToCSV(data);
      case 'sales':
        return this.salesToCSV(data);
      case 'orders':
        return this.ordersToCSV(data);
      case 'menu':
        return this.menuToCSV(data);
      default:
        return JSON.stringify(data);
    }
  }

  private overviewToCSV(data: any): string {
    const headers = ['Metric', 'Value', 'Previous Period', 'Growth %'];
    const rows = [
      ['Total Revenue', data.totalRevenue, '', data.previousPeriodComparison.revenue],
      ['Total Orders', data.totalOrders, '', data.previousPeriodComparison.orders],
      ['Total Customers', data.totalCustomers, '', data.previousPeriodComparison.customers],
      ['Average Order Value', data.averageOrderValue, '', data.previousPeriodComparison.aov],
      ['Conversion Rate', data.conversionRate, '', '']
    ];

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private salesToCSV(data: any): string {
    const headers = ['Date', 'Revenue', 'Orders', 'Customers'];
    const rows = data.dailySales.map((day: any) => [
      day.date.toISOString().split('T')[0],
      day.revenue,
      day.orders,
      day.customers
    ]);

    return [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
  }

  private ordersToCSV(data: any): string {
    const headers = ['Hour', 'Orders', 'Average Value'];
    const rows = data.ordersByHour.map((hour: any) => [
      hour.hour,
      hour.orders,
      hour.averageValue
    ]);

    return [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
  }

  private menuToCSV(data: any): string {
    const headers = ['Item Name', 'Category', 'Order Count', 'Revenue', 'Rating'];
    const rows = data.popularItems.map((item: any) => [
      item.itemName,
      item.category,
      item.orderCount,
      item.revenue,
      item.rating
    ]);

    return [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
  }
}

export const basicAnalyticsController = new BasicAnalyticsController();