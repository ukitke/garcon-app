import { Request, Response } from 'express';
import { waiterTabletService } from '../services/waiterTabletService';

export class WaiterTabletController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { waiterId, locationId } = req.params;

      const dashboardData = await waiterTabletService.getTabletDashboard(waiterId, locationId);
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Error fetching tablet dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data'
      });
    }
  }

  async getActiveCalls(req: Request, res: Response): Promise<void> {
    try {
      const { waiterId, locationId } = req.params;

      const activeCalls = await waiterTabletService.getActiveCallsForWaiter(waiterId, locationId);
      
      res.json({
        success: true,
        data: activeCalls
      });
    } catch (error) {
      console.error('Error fetching active calls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active calls'
      });
    }
  }

  async getActiveOrders(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const activeOrders = await waiterTabletService.getActiveOrdersForLocation(locationId);
      
      res.json({
        success: true,
        data: activeOrders
      });
    } catch (error) {
      console.error('Error fetching active orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active orders'
      });
    }
  }

  async getOrderDetails(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const orderDetails = await waiterTabletService.getOrderDetails(orderId);
      
      if (!orderDetails) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      res.json({
        success: true,
        data: orderDetails
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order details'
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;
      const waiterId = (req as any).user?.userId; // Assuming auth middleware sets this

      if (!waiterId) {
        res.status(401).json({
          success: false,
          error: 'Waiter ID not found in request'
        });
        return;
      }

      await waiterTabletService.updateOrderStatus(orderId, status, waiterId, notes);
      
      res.json({
        success: true,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update order status'
      });
    }
  }

  async markOrderDelivered(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { tableNumber } = req.body;
      const waiterId = (req as any).user?.userId;

      if (!waiterId) {
        res.status(401).json({
          success: false,
          error: 'Waiter ID not found in request'
        });
        return;
      }

      await waiterTabletService.markOrderAsDelivered(orderId, waiterId, tableNumber);
      
      res.json({
        success: true,
        message: 'Order marked as delivered successfully'
      });
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark order as delivered'
      });
    }
  }

  async getWaiterStats(req: Request, res: Response): Promise<void> {
    try {
      const { waiterId } = req.params;

      const stats = await waiterTabletService.getWaiterStats(waiterId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching waiter stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch waiter statistics'
      });
    }
  }

  async getLocationInfo(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const locationInfo = await waiterTabletService.getLocationInfo(locationId);
      
      res.json({
        success: true,
        data: locationInfo
      });
    } catch (error) {
      console.error('Error fetching location info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch location information'
      });
    }
  }

  async sendKitchenNotification(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { message, priority } = req.body;

      await waiterTabletService.createKitchenNotification(orderId, message, priority);
      
      res.json({
        success: true,
        message: 'Kitchen notification sent successfully'
      });
    } catch (error) {
      console.error('Error sending kitchen notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send kitchen notification'
      });
    }
  }

  async getTableStatus(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const query = `
        SELECT t.id, t.number, t.capacity, t.is_active as "isActive",
               ts.id as "sessionId", ts.is_active as "hasActiveSession",
               COUNT(sp.id) as "participantCount",
               COUNT(CASE WHEN o.status IN ('pending', 'confirmed', 'preparing') THEN 1 END) as "pendingOrders",
               COUNT(CASE WHEN wc.status IN ('pending', 'acknowledged') THEN 1 END) as "activeCalls"
        FROM tables t
        LEFT JOIN table_sessions ts ON t.id = ts.table_id AND ts.is_active = true
        LEFT JOIN session_participants sp ON ts.id = sp.session_id
        LEFT JOIN orders o ON ts.id = o.session_id
        LEFT JOIN waiter_calls wc ON ts.id = wc.session_id
        WHERE t.location_id = $1 AND t.is_active = true
        GROUP BY t.id, t.number, t.capacity, t.is_active, ts.id, ts.is_active
        ORDER BY t.number
      `;

      const result = await waiterTabletService['pool'].query(query, [locationId]);
      
      res.json({
        success: true,
        data: result.rows.map(row => ({
          ...row,
          participantCount: parseInt(row.participantCount) || 0,
          pendingOrders: parseInt(row.pendingOrders) || 0,
          activeCalls: parseInt(row.activeCalls) || 0
        }))
      });
    } catch (error) {
      console.error('Error fetching table status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch table status'
      });
    }
  }

  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { waiterId } = req.params;
      const { period } = req.query; // 'today', 'week', 'month'

      let dateFilter = '';
      const today = new Date();
      
      switch (period) {
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFilter = `AND created_at >= '${weekAgo.toISOString()}'`;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateFilter = `AND created_at >= '${monthAgo.toISOString()}'`;
          break;
        default: // today
          today.setHours(0, 0, 0, 0);
          dateFilter = `AND created_at >= '${today.toISOString()}'`;
      }

      const metricsQuery = `
        SELECT 
          COUNT(CASE WHEN wc.status = 'resolved' THEN 1 END) as calls_resolved,
          AVG(CASE WHEN cr.response_time_seconds IS NOT NULL THEN cr.response_time_seconds / 60.0 END) as avg_response_time,
          AVG(CASE WHEN cr.customer_satisfaction IS NOT NULL THEN cr.customer_satisfaction END) as avg_satisfaction,
          COUNT(CASE WHEN wc.call_type = 'assistance' THEN 1 END) as assistance_calls,
          COUNT(CASE WHEN wc.call_type = 'bill' THEN 1 END) as bill_calls,
          COUNT(CASE WHEN wc.call_type = 'complaint' THEN 1 END) as complaint_calls
        FROM waiter_calls wc
        LEFT JOIN call_responses cr ON wc.id = cr.call_id
        WHERE wc.assigned_waiter_id = $1 ${dateFilter}
      `;

      const result = await waiterTabletService['pool'].query(metricsQuery, [waiterId]);
      const metrics = result.rows[0];

      res.json({
        success: true,
        data: {
          callsResolved: parseInt(metrics.calls_resolved) || 0,
          averageResponseTime: parseFloat(metrics.avg_response_time) || 0,
          averageSatisfaction: parseFloat(metrics.avg_satisfaction) || 0,
          callsByType: {
            assistance: parseInt(metrics.assistance_calls) || 0,
            bill: parseInt(metrics.bill_calls) || 0,
            complaint: parseInt(metrics.complaint_calls) || 0
          }
        }
      });
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics'
      });
    }
  }
}

export const waiterTabletController = new WaiterTabletController();