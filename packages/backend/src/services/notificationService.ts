import { Pool } from 'pg';
import { Server } from 'socket.io';
import { 
  WaiterCall, 
  NotificationEvent, 
  WaiterCallRequest, 
  WaiterCallResponse,
  AcknowledgeCallRequest,
  ResolveCallRequest,
  WaiterStatus,
  NotificationPreferences,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
} from '../types/notification';
import { getPool } from '../config/database';

export class NotificationService {
  private pool: Pool;
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    this.pool = getPool();
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('join_location', async (locationId: string, userType: 'customer' | 'waiter' | 'kitchen') => {
        socket.data.locationId = locationId;
        socket.data.userType = userType;
        await socket.join(`location:${locationId}`);
        await socket.join(`${userType}:${locationId}`);
        
        console.log(`${userType} joined location ${locationId}`);
      });

      socket.on('leave_location', async (locationId: string) => {
        await socket.leave(`location:${locationId}`);
        await socket.leave(`customer:${locationId}`);
        await socket.leave(`waiter:${locationId}`);
        await socket.leave(`kitchen:${locationId}`);
        
        socket.data.locationId = undefined;
        socket.data.userType = undefined;
      });

      socket.on('create_waiter_call', async (request: WaiterCallRequest) => {
        try {
          const call = await this.createWaiterCall(request);
          const response: WaiterCallResponse = {
            callId: call.id,
            estimatedResponseTime: this.calculateEstimatedResponseTime(call.priority),
          };
          
          socket.emit('waiter_call_created', call);
          
          // Notify all waiters at this location
          this.io.to(`waiter:${call.locationId}`).emit('waiter_call_created', call);
          
          // Send response back to caller
          socket.emit('waiter_call_created', call);
        } catch (error) {
          console.error('Error creating waiter call:', error);
        }
      });

      socket.on('acknowledge_call', async (request: AcknowledgeCallRequest) => {
        try {
          await this.acknowledgeCall(request.callId, request.waiterId, request.estimatedArrivalTime);
          
          // Notify customer and other waiters
          const call = await this.getWaiterCall(request.callId);
          if (call) {
            this.io.to(`location:${call.locationId}`).emit('waiter_call_acknowledged', 
              request.callId, request.waiterId, request.estimatedArrivalTime || 5);
          }
        } catch (error) {
          console.error('Error acknowledging call:', error);
        }
      });

      socket.on('resolve_call', async (request: ResolveCallRequest) => {
        try {
          await this.resolveCall(request.callId, request.waiterId, request.resolution, request.customerSatisfaction);
          
          // Notify all participants
          const call = await this.getWaiterCall(request.callId);
          if (call) {
            this.io.to(`location:${call.locationId}`).emit('waiter_call_resolved', request.callId, request.resolution);
          }
        } catch (error) {
          console.error('Error resolving call:', error);
        }
      });

      socket.on('update_waiter_status', async (statusUpdate) => {
        try {
          if (socket.data.userType === 'waiter' && socket.data.userId) {
            const status: WaiterStatus = {
              ...statusUpdate,
              waiterId: socket.data.userId,
              lastSeen: new Date(),
            };
            
            await this.updateWaiterStatus(status);
            
            // Notify location about waiter status change
            if (socket.data.locationId) {
              this.io.to(`location:${socket.data.locationId}`).emit('waiter_status_changed', 
                status.waiterId, status.status);
            }
          }
        } catch (error) {
          console.error('Error updating waiter status:', error);
        }
      });

      socket.on('mark_notification_read', async (notificationId: string) => {
        try {
          await this.markNotificationAsRead(notificationId, socket.data.userId);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        // Update waiter status to offline if it was a waiter
        if (socket.data.userType === 'waiter' && socket.data.userId) {
          this.updateWaiterStatus({
            waiterId: socket.data.userId,
            locationId: socket.data.locationId || '',
            status: 'offline',
            currentCalls: [],
            lastSeen: new Date(),
          }).catch(console.error);
        }
      });
    });
  }

  async createWaiterCall(request: WaiterCallRequest): Promise<WaiterCall> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get session and table information
      const sessionQuery = `
        SELECT ts.table_id, t.location_id 
        FROM table_sessions ts
        JOIN tables t ON ts.table_id = t.id
        WHERE ts.id = $1 AND ts.is_active = true
      `;
      const sessionResult = await client.query(sessionQuery, [request.sessionId]);
      
      if (sessionResult.rows.length === 0) {
        throw new Error('Active session not found');
      }

      const { table_id: tableId, location_id: locationId } = sessionResult.rows[0];

      // Create waiter call
      const callQuery = `
        INSERT INTO waiter_calls (session_id, table_id, participant_id, location_id, call_type, priority, message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, session_id as "sessionId", table_id as "tableId", participant_id as "participantId",
                  location_id as "locationId", call_type as "callType", priority, message, status,
                  assigned_waiter_id as "assignedWaiterId", created_at as "createdAt",
                  acknowledged_at as "acknowledgedAt", resolved_at as "resolvedAt"
      `;

      const callValues = [
        request.sessionId,
        tableId,
        request.participantId,
        locationId,
        request.callType,
        request.priority || 'medium',
        request.message || null
      ];

      const callResult = await client.query(callQuery, callValues);
      const call = callResult.rows[0];

      // Create notification event
      await this.createNotificationEvent({
        type: 'waiter_call',
        targetType: 'waiter',
        locationId,
        data: {
          callId: call.id,
          callType: call.callType,
          tableId,
          priority: call.priority,
          message: call.message
        },
        priority: call.priority,
      });

      await client.query('COMMIT');
      return call;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async acknowledgeCall(callId: string, waiterId: string, estimatedArrivalTime?: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE waiter_calls 
        SET status = 'acknowledged', assigned_waiter_id = $1, acknowledged_at = NOW()
        WHERE id = $2 AND status = 'pending'
        RETURNING location_id
      `;

      const result = await client.query(updateQuery, [waiterId, callId]);
      
      if (result.rows.length === 0) {
        throw new Error('Call not found or already acknowledged');
      }

      const locationId = result.rows[0].location_id;

      // Update waiter status
      await this.addCallToWaiter(waiterId, callId);

      // Create notification for customer
      await this.createNotificationEvent({
        type: 'waiter_call',
        targetType: 'customer',
        locationId,
        data: {
          callId,
          status: 'acknowledged',
          waiterId,
          estimatedArrivalTime: estimatedArrivalTime || 5
        },
        priority: 'medium',
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async resolveCall(callId: string, waiterId: string, resolution: string, customerSatisfaction?: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get call start time for response time calculation
      const callQuery = `
        SELECT created_at, acknowledged_at, location_id 
        FROM waiter_calls 
        WHERE id = $1 AND assigned_waiter_id = $2
      `;
      const callResult = await client.query(callQuery, [callId, waiterId]);
      
      if (callResult.rows.length === 0) {
        throw new Error('Call not found or not assigned to this waiter');
      }

      const { created_at, acknowledged_at, location_id } = callResult.rows[0];
      const responseTimeSeconds = Math.floor((Date.now() - new Date(acknowledged_at || created_at).getTime()) / 1000);

      // Update call status
      const updateQuery = `
        UPDATE waiter_calls 
        SET status = 'resolved', resolved_at = NOW()
        WHERE id = $1
      `;
      await client.query(updateQuery, [callId]);

      // Record response metrics
      const responseQuery = `
        INSERT INTO call_responses (call_id, waiter_id, response_time_seconds, customer_satisfaction, resolution_notes)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(responseQuery, [callId, waiterId, responseTimeSeconds, customerSatisfaction, resolution]);

      // Remove call from waiter's current calls
      await this.removeCallFromWaiter(waiterId, callId);

      // Create notification for customer
      await this.createNotificationEvent({
        type: 'waiter_call',
        targetType: 'customer',
        locationId: location_id,
        data: {
          callId,
          status: 'resolved',
          resolution,
          waiterId
        },
        priority: 'low',
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getWaiterCall(callId: string): Promise<WaiterCall | null> {
    const query = `
      SELECT id, session_id as "sessionId", table_id as "tableId", participant_id as "participantId",
             location_id as "locationId", call_type as "callType", priority, message, status,
             assigned_waiter_id as "assignedWaiterId", created_at as "createdAt",
             acknowledged_at as "acknowledgedAt", resolved_at as "resolvedAt"
      FROM waiter_calls
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [callId]);
    return result.rows[0] || null;
  }

  async getActiveCallsForLocation(locationId: string): Promise<WaiterCall[]> {
    const query = `
      SELECT wc.id, wc.session_id as "sessionId", wc.table_id as "tableId", 
             wc.participant_id as "participantId", wc.location_id as "locationId",
             wc.call_type as "callType", wc.priority, wc.message, wc.status,
             wc.assigned_waiter_id as "assignedWaiterId", wc.created_at as "createdAt",
             wc.acknowledged_at as "acknowledgedAt", wc.resolved_at as "resolvedAt",
             t.number as "tableNumber", u.name as "waiterName"
      FROM waiter_calls wc
      JOIN tables t ON wc.table_id = t.id
      LEFT JOIN users u ON wc.assigned_waiter_id = u.id
      WHERE wc.location_id = $1 AND wc.status IN ('pending', 'acknowledged', 'in_progress')
      ORDER BY 
        CASE wc.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        wc.created_at ASC
    `;

    const result = await this.pool.query(query, [locationId]);
    return result.rows;
  }

  async updateWaiterStatus(status: WaiterStatus): Promise<void> {
    const query = `
      INSERT INTO waiter_status (waiter_id, location_id, status, current_calls, last_seen)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (waiter_id) 
      DO UPDATE SET 
        location_id = EXCLUDED.location_id,
        status = EXCLUDED.status,
        current_calls = EXCLUDED.current_calls,
        last_seen = EXCLUDED.last_seen,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      status.waiterId,
      status.locationId,
      status.status,
      status.currentCalls,
      status.lastSeen
    ]);
  }

  async getWaitersForLocation(locationId: string): Promise<WaiterStatus[]> {
    const query = `
      SELECT ws.waiter_id as "waiterId", ws.location_id as "locationId", 
             ws.status, ws.current_calls as "currentCalls", ws.last_seen as "lastSeen",
             u.name as "waiterName"
      FROM waiter_status ws
      JOIN users u ON ws.waiter_id = u.id
      WHERE ws.location_id = $1 AND ws.last_seen > NOW() - INTERVAL '1 hour'
      ORDER BY ws.status, ws.last_seen DESC
    `;

    const result = await this.pool.query(query, [locationId]);
    return result.rows;
  }

  private async createNotificationEvent(event: Omit<NotificationEvent, 'id' | 'createdAt'>): Promise<NotificationEvent> {
    const query = `
      INSERT INTO notification_events (type, target_type, target_id, location_id, data, priority, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, type, target_type as "targetType", target_id as "targetId", 
                location_id as "locationId", data, priority, created_at as "createdAt",
                expires_at as "expiresAt"
    `;

    const expiresAt = event.priority === 'urgent' ? 
      new Date(Date.now() + 30 * 60 * 1000) : // 30 minutes for urgent
      new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours for others

    const values = [
      event.type,
      event.targetType,
      event.targetId || null,
      event.locationId,
      JSON.stringify(event.data),
      event.priority,
      expiresAt
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  private async addCallToWaiter(waiterId: string, callId: string): Promise<void> {
    const query = `
      UPDATE waiter_status 
      SET current_calls = array_append(current_calls, $2),
          status = CASE WHEN status = 'available' THEN 'busy' ELSE status END,
          updated_at = NOW()
      WHERE waiter_id = $1
    `;

    await this.pool.query(query, [waiterId, callId]);
  }

  private async removeCallFromWaiter(waiterId: string, callId: string): Promise<void> {
    const query = `
      UPDATE waiter_status 
      SET current_calls = array_remove(current_calls, $2),
          status = CASE 
            WHEN array_length(array_remove(current_calls, $2), 1) = 0 THEN 'available'
            ELSE status 
          END,
          updated_at = NOW()
      WHERE waiter_id = $1
    `;

    await this.pool.query(query, [waiterId, callId]);
  }

  private async markNotificationAsRead(notificationId: string, userId?: string): Promise<void> {
    const query = `
      UPDATE notification_events 
      SET is_read = true 
      WHERE id = $1 AND (target_id = $2 OR target_id IS NULL)
    `;

    await this.pool.query(query, [notificationId, userId]);
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

  // Broadcast methods for external services
  async broadcastOrderUpdate(orderId: string, status: string, locationId: string, estimatedTime?: number): Promise<void> {
    this.io.to(`location:${locationId}`).emit('order_status_updated', orderId, status, estimatedTime);
  }

  async broadcastPaymentRequest(sessionId: string, amount: number, locationId: string, splitDetails?: any): Promise<void> {
    this.io.to(`location:${locationId}`).emit('payment_request', sessionId, amount, splitDetails);
  }

  async sendNotificationToUser(userId: string, notification: NotificationEvent): Promise<void> {
    // Find user's socket and send notification
    const sockets = await this.io.fetchSockets();
    const userSocket = sockets.find(socket => socket.data.userId === userId);
    
    if (userSocket) {
      userSocket.emit('notification', notification);
    }
  }
}

// The service instance will be set from index.ts
export let notificationService: NotificationService;

export function setNotificationService(service: NotificationService) {
  notificationService = service;
}