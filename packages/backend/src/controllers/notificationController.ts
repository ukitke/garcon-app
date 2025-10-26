import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { 
  WaiterCallRequest,
  AcknowledgeCallRequest,
  ResolveCallRequest
} from '../types/notification';

export class NotificationController {
  async createWaiterCall(req: Request, res: Response): Promise<void> {
    try {
      const callRequest: WaiterCallRequest = req.body;

      const call = await notificationService.createWaiterCall(callRequest);
      
      res.status(201).json({
        success: true,
        data: {
          call,
          estimatedResponseTime: this.calculateEstimatedResponseTime(call.priority)
        }
      });
    } catch (error) {
      console.error('Error creating waiter call:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create waiter call'
      });
    }
  }

  async getActiveCallsForLocation(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const calls = await notificationService.getActiveCallsForLocation(locationId);
      
      res.json({
        success: true,
        data: calls
      });
    } catch (error) {
      console.error('Error fetching active calls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active calls'
      });
    }
  }

  async acknowledgeCall(req: Request, res: Response): Promise<void> {
    try {
      const { callId } = req.params;
      const { waiterId, estimatedArrivalTime } = req.body;

      const request: AcknowledgeCallRequest = {
        callId,
        waiterId,
        estimatedArrivalTime
      };

      await notificationService.acknowledgeCall(request.callId, request.waiterId, request.estimatedArrivalTime);
      
      res.json({
        success: true,
        message: 'Call acknowledged successfully'
      });
    } catch (error) {
      console.error('Error acknowledging call:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to acknowledge call'
      });
    }
  }

  async resolveCall(req: Request, res: Response): Promise<void> {
    try {
      const { callId } = req.params;
      const { waiterId, resolution, customerSatisfaction } = req.body;

      const request: ResolveCallRequest = {
        callId,
        waiterId,
        resolution,
        customerSatisfaction
      };

      await notificationService.resolveCall(
        request.callId, 
        request.waiterId, 
        request.resolution, 
        request.customerSatisfaction
      );
      
      res.json({
        success: true,
        message: 'Call resolved successfully'
      });
    } catch (error) {
      console.error('Error resolving call:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve call'
      });
    }
  }

  async getWaiterCall(req: Request, res: Response): Promise<void> {
    try {
      const { callId } = req.params;

      const call = await notificationService.getWaiterCall(callId);
      
      if (!call) {
        res.status(404).json({
          success: false,
          error: 'Waiter call not found'
        });
        return;
      }

      res.json({
        success: true,
        data: call
      });
    } catch (error) {
      console.error('Error fetching waiter call:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch waiter call'
      });
    }
  }

  async getWaitersForLocation(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const waiters = await notificationService.getWaitersForLocation(locationId);
      
      res.json({
        success: true,
        data: waiters
      });
    } catch (error) {
      console.error('Error fetching waiters:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch waiters'
      });
    }
  }

  async updateWaiterStatus(req: Request, res: Response): Promise<void> {
    try {
      const { waiterId } = req.params;
      const { locationId, status, currentCalls } = req.body;

      await notificationService.updateWaiterStatus({
        waiterId,
        locationId,
        status,
        currentCalls: currentCalls || [],
        lastSeen: new Date()
      });
      
      res.json({
        success: true,
        message: 'Waiter status updated successfully'
      });
    } catch (error) {
      console.error('Error updating waiter status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update waiter status'
      });
    }
  }

  async cancelCall(req: Request, res: Response): Promise<void> {
    try {
      const { callId } = req.params;

      // Update call status to cancelled
      const query = `
        UPDATE waiter_calls 
        SET status = 'cancelled', resolved_at = NOW()
        WHERE id = $1 AND status IN ('pending', 'acknowledged')
        RETURNING location_id
      `;

      const result = await notificationService['pool'].query(query, [callId]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Call not found or cannot be cancelled'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Call cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling call:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel call'
      });
    }
  }

  async getCallHistory(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate, status, callType } = req.query;

      let query = `
        SELECT wc.id, wc.session_id as "sessionId", wc.table_id as "tableId",
               wc.participant_id as "participantId", wc.location_id as "locationId",
               wc.call_type as "callType", wc.priority, wc.message, wc.status,
               wc.assigned_waiter_id as "assignedWaiterId", wc.created_at as "createdAt",
               wc.acknowledged_at as "acknowledgedAt", wc.resolved_at as "resolvedAt",
               t.number as "tableNumber", u.name as "waiterName",
               cr.response_time_seconds as "responseTimeSeconds",
               cr.customer_satisfaction as "customerSatisfaction"
        FROM waiter_calls wc
        JOIN tables t ON wc.table_id = t.id
        LEFT JOIN users u ON wc.assigned_waiter_id = u.id
        LEFT JOIN call_responses cr ON wc.id = cr.call_id
        WHERE wc.location_id = $1
      `;

      const params: any[] = [locationId];
      let paramCount = 1;

      if (startDate) {
        query += ` AND wc.created_at >= $${++paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND wc.created_at <= $${++paramCount}`;
        params.push(endDate);
      }

      if (status) {
        query += ` AND wc.status = $${++paramCount}`;
        params.push(status);
      }

      if (callType) {
        query += ` AND wc.call_type = $${++paramCount}`;
        params.push(callType);
      }

      query += ` ORDER BY wc.created_at DESC LIMIT 100`;

      const result = await notificationService['pool'].query(query, params);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching call history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch call history'
      });
    }
  }

  private calculateEstimatedResponseTime(priority: string): number {
    switch (priority) {
      case 'urgent': return 2;
      case 'high': return 5;
      case 'medium': return 10;
      case 'low': return 15;
      default: return 10;
    }
  }
}

export const notificationController = new NotificationController();