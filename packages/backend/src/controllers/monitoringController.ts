import { Request, Response } from 'express';
import { monitoringService } from '../services/monitoringService';
import { AlertRule } from '../types/analytics';

export class MonitoringController {
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await monitoringService.getSystemHealth();
      
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system health'
      });
    }
  }

  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await monitoringService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics'
      });
    }
  }

  async getActiveAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.query;
      const alerts = await monitoringService.getActiveAlerts(locationId as string);
      
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active alerts'
      });
    }
  }

  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      await monitoringService.acknowledgeAlert(alertId, userId);
      
      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }
  }

  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { userId, resolution } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      await monitoringService.resolveAlert(alertId, userId, resolution);
      
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  }

  async createAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const { name, metric, condition, threshold, recipients, frequency } = req.body;

      if (!name || !metric || !condition || threshold === undefined) {
        res.status(400).json({
          success: false,
          error: 'Name, metric, condition, and threshold are required'
        });
        return;
      }

      const rule: Omit<AlertRule, 'id'> = {
        name,
        metric,
        condition,
        threshold: parseFloat(threshold),
        isActive: true,
        recipients: recipients || [],
        frequency: frequency || 'hourly'
      };

      const newRule = await monitoringService.createAlertRule(rule);
      
      res.status(201).json({
        success: true,
        data: newRule
      });
    } catch (error) {
      console.error('Error creating alert rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create alert rule'
      });
    }
  }

  async updateAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const updates = req.body;

      const updatedRule = await monitoringService.updateAlertRule(ruleId, updates);
      
      if (!updatedRule) {
        res.status(404).json({
          success: false,
          error: 'Alert rule not found'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedRule
      });
    } catch (error) {
      console.error('Error updating alert rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update alert rule'
      });
    }
  }

  async deleteAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;

      const deleted = await monitoringService.deleteAlertRule(ruleId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Alert rule not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Alert rule deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert rule'
      });
    }
  }

  async testAlert(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId, testValue } = req.body;

      if (!ruleId || testValue === undefined) {
        res.status(400).json({
          success: false,
          error: 'Rule ID and test value are required'
        });
        return;
      }

      // This would simulate an alert condition
      const mockMetrics = {
        apiResponseTime: testValue,
        errorCount: testValue,
        activeUsers: testValue,
        memoryUsage: testValue,
        cpuUsage: testValue
      };

      await monitoringService.checkMetricThresholds('test-location', mockMetrics);
      
      res.json({
        success: true,
        message: 'Alert test completed'
      });
    } catch (error) {
      console.error('Error testing alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test alert'
      });
    }
  }

  async getAlertHistory(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, startDate, endDate, severity } = req.query;
      
      // This would implement alert history retrieval
      // For now, return empty array
      res.json({
        success: true,
        data: [],
        message: 'Alert history feature not yet implemented'
      });
    } catch (error) {
      console.error('Error fetching alert history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alert history'
      });
    }
  }

  async getMetricsTrends(req: Request, res: Response): Promise<void> {
    try {
      const { metric, period = '24h' } = req.query;
      
      if (!metric) {
        res.status(400).json({
          success: false,
          error: 'Metric parameter is required'
        });
        return;
      }

      // This would implement metrics trends retrieval
      // For now, return mock data
      const mockTrends = {
        metric: metric,
        period: period,
        data: [],
        summary: {
          average: 0,
          min: 0,
          max: 0,
          trend: 'stable'
        }
      };

      res.json({
        success: true,
        data: mockTrends
      });
    } catch (error) {
      console.error('Error fetching metrics trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics trends'
      });
    }
  }
}

export const monitoringController = new MonitoringController();