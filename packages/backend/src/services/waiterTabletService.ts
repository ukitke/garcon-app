import { Pool } from 'pg';
import { getPool } from '../config/database';
import { notificationService } from './notificationService';

export interface TabletDashboardData {
  activeCalls: WaiterCallSummary[];
  activeOrders: OrderSummary[];
  waiterStats: WaiterStats;
  locationInfo: LocationInfo;
}

export interface WaiterCallSummary {
  id: string;
  tableNumber: string;
  callType: 'assistance' | 'bill' | 'complaint' | 'order_ready';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message?: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved';
  createdAt: Date;
  acknowledgedAt?: Date;
  customerName?: string;
  estimatedResponseTime: number;
}

export interface OrderSummary {
  id: string;
  tableNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
  estimatedReadyTime?: Date;
  customerNames: string[];
  specialRequests?: string;
}

export interface WaiterStats {
  callsHandledToday: number;
  averageResponseTime: number; // in minutes
  customerSatisfactionRating: number; // 1-5
  ordersDeliveredToday: number;
  currentActiveCalls: number;
}

export interface LocationInfo {
  id: string;
  name: string;
  activeWaiters: number;
  activeTables: number;
  totalCallsToday: number;
}

export interface KitchenOrderUpdate {
  orderId: string;
  status: 'preparing' | 'ready';
  estimatedReadyTime?: Date;
  notes?: string;
}

export class WaiterTabletService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async getTabletDashboard(waiterId: string, locationId: string): Promise<TabletDashboardData> {
    const [activeCalls, activeOrders, waiterStats, locationInfo] = await Promise.all([
      this.getActiveCallsForWaiter(waiterId, locationId),
      this.getActiveOrdersForLocation(locationId),
      this.getWaiterStats(waiterId),
      this.getLocationInfo(locationId)
    ]);

    return {
      activeCalls,
      activeOrders,
      waiterStats,
      locationInfo
    };
  }

  async getActiveCallsForWaiter(waiterId: string, locationId: string): Promise<WaiterCallSummary[]> {
    const query = `
      SELECT wc.id, t.number as "tableNumber", wc.call_type as "callType", 
             wc.priority, wc.message, wc.status, wc.created_at as "createdAt",
             wc.acknowledged_at as "acknowledgedAt", sp.fantasy_name as "customerName"
      FROM waiter_calls wc
      JOIN tables t ON wc.table_id = t.id
      JOIN session_participants sp ON wc.participant_id = sp.id
      WHERE wc.location_id = $1 
        AND (wc.assigned_waiter_id = $2 OR wc.status = 'pending')
        AND wc.status IN ('pending', 'acknowledged', 'in_progress')
      ORDER BY 
        CASE wc.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        wc.created_at ASC
    `;

    const result = await this.pool.query(query, [locationId, waiterId]);
    
    return result.rows.map(row => ({
      ...row,
      estimatedResponseTime: this.calculateEstimatedResponseTime(row.priority, row.createdAt)
    }));
  }

  async getActiveOrdersForLocation(locationId: string): Promise<OrderSummary[]> {
    const query = `
      SELECT o.id, t.number as "tableNumber", o.status, o.total_amount as "totalAmount",
             o.created_at as "createdAt", o.notes as "specialRequests",
             COUNT(oi.id) as "itemCount",
             ARRAY_AGG(DISTINCT sp.fantasy_name) as "customerNames"
      FROM orders o
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      JOIN session_participants sp ON o.participant_id = sp.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE t.location_id = $1 
        AND o.status IN ('confirmed', 'preparing', 'ready')
      GROUP BY o.id, t.number, o.status, o.total_amount, o.created_at, o.notes
      ORDER BY 
        CASE o.status 
          WHEN 'ready' THEN 1 
          WHEN 'preparing' THEN 2 
          WHEN 'confirmed' THEN 3 
        END,
        o.created_at ASC
    `;

    const result = await this.pool.query(query, [locationId]);
    
    return result.rows.map(row => ({
      ...row,
      itemCount: parseInt(row.itemCount),
      estimatedReadyTime: this.calculateEstimatedReadyTime(row.createdAt, row.itemCount)
    }));
  }

  async getWaiterStats(waiterId: string): Promise<WaiterStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN wc.status = 'resolved' AND wc.created_at >= $2 THEN 1 END) as calls_handled_today,
        AVG(CASE WHEN cr.response_time_seconds IS NOT NULL THEN cr.response_time_seconds / 60.0 END) as avg_response_time,
        AVG(CASE WHEN cr.customer_satisfaction IS NOT NULL THEN cr.customer_satisfaction END) as avg_satisfaction,
        COUNT(CASE WHEN o.status = 'delivered' AND o.updated_at >= $2 THEN 1 END) as orders_delivered_today,
        COUNT(CASE WHEN wc.status IN ('acknowledged', 'in_progress') THEN 1 END) as current_active_calls
      FROM waiter_calls wc
      LEFT JOIN call_responses cr ON wc.id = cr.call_id
      LEFT JOIN orders o ON wc.assigned_waiter_id = o.participant_id -- This is a simplified join
      WHERE wc.assigned_waiter_id = $1
    `;

    const result = await this.pool.query(statsQuery, [waiterId, today]);
    const stats = result.rows[0];

    return {
      callsHandledToday: parseInt(stats.calls_handled_today) || 0,
      averageResponseTime: parseFloat(stats.avg_response_time) || 0,
      customerSatisfactionRating: parseFloat(stats.avg_satisfaction) || 0,
      ordersDeliveredToday: parseInt(stats.orders_delivered_today) || 0,
      currentActiveCalls: parseInt(stats.current_active_calls) || 0
    };
  }

  async getLocationInfo(locationId: string): Promise<LocationInfo> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const infoQuery = `
      SELECT 
        l.id, l.name,
        COUNT(DISTINCT ws.waiter_id) as active_waiters,
        COUNT(DISTINCT CASE WHEN ts.is_active = true THEN ts.table_id END) as active_tables,
        COUNT(CASE WHEN wc.created_at >= $2 THEN 1 END) as total_calls_today
      FROM locations l
      LEFT JOIN waiter_status ws ON l.id = ws.location_id AND ws.status != 'offline'
      LEFT JOIN tables t ON l.id = t.location_id
      LEFT JOIN table_sessions ts ON t.id = ts.table_id
      LEFT JOIN waiter_calls wc ON l.id = wc.location_id
      WHERE l.id = $1
      GROUP BY l.id, l.name
    `;

    const result = await this.pool.query(infoQuery, [locationId, today]);
    const info = result.rows[0];

    return {
      id: info.id,
      name: info.name,
      activeWaiters: parseInt(info.active_waiters) || 0,
      activeTables: parseInt(info.active_tables) || 0,
      totalCallsToday: parseInt(info.total_calls_today) || 0
    };
  }

  async updateOrderStatus(orderId: string, status: string, waiterId: string, notes?: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update order status
      const updateQuery = `
        UPDATE orders 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING session_id, total_amount
      `;
      
      const result = await client.query(updateQuery, [status, orderId]);
      
      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      const { session_id, total_amount } = result.rows[0];

      // Log the status change
      const logQuery = `
        INSERT INTO order_status_log (order_id, status, changed_by, notes, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      
      await client.query(logQuery, [orderId, status, waiterId, notes]);

      // Get location ID for broadcasting
      const locationQuery = `
        SELECT t.location_id 
        FROM table_sessions ts
        JOIN tables t ON ts.table_id = t.id
        WHERE ts.id = $1
      `;
      
      const locationResult = await client.query(locationQuery, [session_id]);
      const locationId = locationResult.rows[0]?.location_id;

      await client.query('COMMIT');

      // Broadcast order status update
      if (locationId && notificationService) {
        const estimatedTime = status === 'preparing' ? 
          this.calculateEstimatedReadyTime(new Date(), 3) : undefined;
        
        await notificationService.broadcastOrderUpdate(
          orderId, 
          status, 
          locationId, 
          estimatedTime ? Math.floor((estimatedTime.getTime() - Date.now()) / 60000) : undefined
        );
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markOrderAsDelivered(orderId: string, waiterId: string, tableNumber: string): Promise<void> {
    await this.updateOrderStatus(orderId, 'delivered', waiterId, `Delivered to table ${tableNumber}`);
  }

  async getOrderDetails(orderId: string): Promise<any> {
    const query = `
      SELECT o.id, o.session_id as "sessionId", o.status, o.total_amount as "totalAmount",
             o.subtotal, o.tax_amount as "taxAmount", o.notes, o.created_at as "createdAt",
             t.number as "tableNumber", sp.fantasy_name as "customerName",
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menuItemName', mi.name,
                 'quantity', oi.quantity,
                 'unitPrice', oi.unit_price,
                 'totalPrice', oi.total_price,
                 'notes', oi.notes,
                 'customizations', oi_customizations.customizations
               )
             ) as items
      FROM orders o
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      JOIN session_participants sp ON o.participant_id = sp.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'name', mc.name,
            'value', COALESCE(co.name, oic.custom_value)
          )
        ) as customizations
        FROM order_item_customizations oic
        LEFT JOIN menu_customizations mc ON oic.customization_id = mc.id
        LEFT JOIN customization_options co ON oic.option_id = co.id
        WHERE oic.order_item_id = oi.id
      ) oi_customizations ON true
      WHERE o.id = $1
      GROUP BY o.id, o.session_id, o.status, o.total_amount, o.subtotal, 
               o.tax_amount, o.notes, o.created_at, t.number, sp.fantasy_name
    `;

    const result = await this.pool.query(query, [orderId]);
    return result.rows[0];
  }

  async createKitchenNotification(orderId: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    // Get order location
    const locationQuery = `
      SELECT t.location_id 
      FROM orders o
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE o.id = $1
    `;
    
    const result = await this.pool.query(locationQuery, [orderId]);
    
    if (result.rows.length > 0 && notificationService) {
      const locationId = result.rows[0].location_id;
      
      // Create notification event
      const notificationQuery = `
        INSERT INTO notification_events (type, target_type, location_id, data, priority)
        VALUES ('order_update', 'kitchen', $1, $2, $3)
      `;
      
      await this.pool.query(notificationQuery, [
        locationId,
        JSON.stringify({ orderId, message }),
        priority
      ]);
    }
  }

  private calculateEstimatedResponseTime(priority: string, createdAt: Date): number {
    const baseTime = {
      'urgent': 2,
      'high': 5,
      'medium': 10,
      'low': 15
    }[priority] || 10;

    const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return Math.max(0, baseTime - elapsedMinutes);
  }

  private calculateEstimatedReadyTime(createdAt: Date, itemCount: number): Date {
    // Base preparation time: 15 minutes + 3 minutes per item
    const preparationMinutes = 15 + (itemCount * 3);
    const readyTime = new Date(createdAt);
    readyTime.setMinutes(readyTime.getMinutes() + preparationMinutes);
    return readyTime;
  }
}

export const waiterTabletService = new WaiterTabletService();