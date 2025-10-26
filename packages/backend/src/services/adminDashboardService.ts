import { Pool } from 'pg';
import { getPool } from '../config/database';
import { 
  DashboardStats, 
  MenuManagement,
  LocationSettings,
  StaffManagement,
  SystemNotification,
  BulkMenuUpdate
} from '../types/admin';

export class AdminDashboardService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async getDashboardStats(locationId: string, startDate: Date, endDate: Date): Promise<DashboardStats> {
    const [revenue, orders, customers, tables, waiters, reviews] = await Promise.all([
      this.getRevenueStats(locationId, startDate, endDate),
      this.getOrderStats(locationId, startDate, endDate),
      this.getCustomerStats(locationId, startDate, endDate),
      this.getTableStats(locationId, startDate, endDate),
      this.getWaiterStats(locationId, startDate, endDate),
      this.getReviewStats(locationId, startDate, endDate)
    ]);

    return {
      locationId,
      period: { start: startDate, end: endDate },
      revenue,
      orders,
      customers,
      tables,
      waiters,
      reviews
    };
  }

  private async getRevenueStats(locationId: string, startDate: Date, endDate: Date): Promise<any> {
    const revenueQuery = `
      SELECT 
        SUM(pi.amount) as total_revenue,
        COUNT(pi.id) as total_transactions,
        AVG(pi.amount) as average_order_value,
        DATE(pi.created_at) as date,
        pi.provider_id as payment_method
      FROM payment_intents pi
      JOIN table_sessions ts ON pi.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at BETWEEN $2 AND $3
      GROUP BY DATE(pi.created_at), pi.provider_id
      ORDER BY date DESC
    `;

    const result = await this.pool.query(revenueQuery, [locationId, startDate, endDate]);
    
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0);
    const averageOrderValue = result.rows.length > 0 ? 
      result.rows.reduce((sum, row) => sum + parseFloat(row.average_order_value || 0), 0) / result.rows.length : 0;

    // Group by date for daily revenue
    const dailyRevenue = result.rows.reduce((acc, row) => {
      const date = row.date;
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      acc[date].revenue += parseFloat(row.total_revenue || 0);
      acc[date].orders += parseInt(row.total_transactions || 0);
      return acc;
    }, {});

    // Group by payment method
    const byPaymentMethod = result.rows.reduce((acc, row) => {
      const method = row.payment_method || 'unknown';
      acc[method] = (acc[method] || 0) + parseFloat(row.total_revenue || 0);
      return acc;
    }, {});

    return {
      total: totalRevenue,
      change: 0, // TODO: Calculate from previous period
      daily: Object.values(dailyRevenue),
      byPaymentMethod,
      averageOrderValue
    };
  }

  private async getOrderStats(locationId: string, startDate: Date, endDate: Date): Promise<any> {
    const ordersQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_prep_time,
        EXTRACT(HOUR FROM created_at) as hour,
        mi.id as item_id,
        mi.name as item_name,
        SUM(oi.quantity) as item_quantity,
        SUM(oi.total_price) as item_revenue
      FROM orders o
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE t.location_id = $1 AND o.created_at BETWEEN $2 AND $3
      GROUP BY EXTRACT(HOUR FROM created_at), mi.id, mi.name
      ORDER BY item_quantity DESC
    `;

    const result = await this.pool.query(ordersQuery, [locationId, startDate, endDate]);
    
    const totalOrders = result.rows.reduce((sum, row) => sum + parseInt(row.total_orders || 0), 0);
    const completedOrders = result.rows.reduce((sum, row) => sum + parseInt(row.completed_orders || 0), 0);
    const cancelledOrders = result.rows.reduce((sum, row) => sum + parseInt(row.cancelled_orders || 0), 0);
    const avgPrepTime = result.rows.length > 0 ? 
      result.rows.reduce((sum, row) => sum + parseFloat(row.avg_prep_time || 0), 0) / result.rows.length : 0;

    // Peak hours
    const peakHours = result.rows.reduce((acc, row) => {
      const hour = row.hour?.toString();
      if (hour) {
        acc[hour] = (acc[hour] || 0) + parseInt(row.total_orders || 0);
      }
      return acc;
    }, {});

    // Popular items
    const popularItems = result.rows
      .filter(row => row.item_id)
      .slice(0, 10)
      .map(row => ({
        itemId: row.item_id,
        name: row.item_name,
        quantity: parseInt(row.item_quantity || 0),
        revenue: parseFloat(row.item_revenue || 0)
      }));

    return {
      total: totalOrders,
      completed: completedOrders,
      cancelled: cancelledOrders,
      averagePreparationTime: avgPrepTime,
      peakHours,
      popularItems
    };
  }

  private async getCustomerStats(locationId: string, startDate: Date, endDate: Date): Promise<any> {
    const customerQuery = `
      SELECT 
        COUNT(DISTINCT sp.user_id) as total_customers,
        COUNT(DISTINCT CASE WHEN u.created_at BETWEEN $2 AND $3 THEN sp.user_id END) as new_customers,
        AVG(participant_count.count) as avg_party_size,
        AVG(r.rating) as avg_satisfaction
      FROM session_participants sp
      JOIN table_sessions ts ON sp.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN reviews r ON ts.id = r.session_id
      LEFT JOIN (
        SELECT session_id, COUNT(*) as count
        FROM session_participants
        GROUP BY session_id
      ) participant_count ON sp.session_id = participant_count.session_id
      WHERE t.location_id = $1 AND sp.joined_at BETWEEN $2 AND $3
    `;

    const result = await this.pool.query(customerQuery, [locationId, startDate, endDate]);
    const data = result.rows[0] || {};

    return {
      totalCustomers: parseInt(data.total_customers || 0),
      newCustomers: parseInt(data.new_customers || 0),
      returningCustomers: parseInt(data.total_customers || 0) - parseInt(data.new_customers || 0),
      averagePartySize: parseFloat(data.avg_party_size || 0),
      customerSatisfaction: parseFloat(data.avg_satisfaction || 0)
    };
  }

  private async getTableStats(locationId: string, startDate: Date, endDate: Date): Promise<any> {
    const tableQuery = `
      SELECT 
        COUNT(DISTINCT t.id) as total_tables,
        COUNT(DISTINCT ts.table_id) as occupied_tables,
        AVG(EXTRACT(EPOCH FROM (ts.end_time - ts.start_time))/3600) as avg_session_duration,
        t.number as table_number,
        COUNT(ts.id) as session_count
      FROM tables t
      LEFT JOIN table_sessions ts ON t.id = ts.table_id 
        AND ts.start_time BETWEEN $2 AND $3
      WHERE t.location_id = $1
      GROUP BY t.id, t.number
      ORDER BY session_count DESC
    `;

    const result = await this.pool.query(tableQuery, [locationId, startDate, endDate]);
    
    const totalTables = result.rows.length;
    const occupiedTables = result.rows.filter(row => parseInt(row.session_count) > 0).length;
    const averageOccupancy = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;
    
    const mostPopularTables = result.rows
      .filter(row => parseInt(row.session_count) > 0)
      .slice(0, 5)
      .map(row => row.table_number);

    return {
      totalTables,
      averageOccupancy,
      turnoverRate: 0, // TODO: Calculate based on session duration
      mostPopularTables
    };
  }

  private async getWaiterStats(locationId: string, startDate: Date, endDate: Date): Promise<any> {
    const waiterQuery = `
      SELECT 
        COUNT(DISTINCT u.id) as total_waiters,
        COUNT(DISTINCT CASE WHEN ws.status != 'offline' THEN u.id END) as active_waiters,
        AVG(cr.response_time_seconds/60) as avg_response_time,
        u.id as waiter_id,
        u.name as waiter_name,
        COUNT(wc.id) as calls_handled,
        AVG(cr.customer_satisfaction) as satisfaction
      FROM users u
      LEFT JOIN waiter_status ws ON u.id = ws.waiter_id AND ws.location_id = $1
      LEFT JOIN waiter_calls wc ON u.id = wc.assigned_waiter_id 
        AND wc.created_at BETWEEN $2 AND $3
      LEFT JOIN call_responses cr ON wc.id = cr.call_id
      WHERE u.role = 'waiter'
      GROUP BY u.id, u.name
      ORDER BY calls_handled DESC
    `;

    const result = await this.pool.query(waiterQuery, [locationId, startDate, endDate]);
    
    const totalWaiters = result.rows.length;
    const activeWaiters = result.rows.filter(row => parseInt(row.calls_handled) > 0).length;
    const avgResponseTime = result.rows.length > 0 ? 
      result.rows.reduce((sum, row) => sum + parseFloat(row.avg_response_time || 0), 0) / result.rows.length : 0;

    const topPerformers = result.rows
      .filter(row => parseInt(row.calls_handled) > 0)
      .slice(0, 5)
      .map(row => ({
        waiterId: row.waiter_id,
        name: row.waiter_name,
        callsHandled: parseInt(row.calls_handled),
        averageResponseTime: parseFloat(row.avg_response_time || 0),
        customerSatisfaction: parseFloat(row.satisfaction || 0)
      }));

    return {
      totalWaiters,
      activeWaiters,
      averageResponseTime: avgResponseTime,
      topPerformers
    };
  }

  private async getReviewStats(locationId: string, startDate: Date, endDate: Date): Promise<any> {
    const reviewQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        AVG(food_rating) as avg_food,
        AVG(service_rating) as avg_service,
        AVG(atmosphere_rating) as avg_atmosphere,
        AVG(value_rating) as avg_value
      FROM reviews
      WHERE location_id = $1 
        AND status = 'approved'
        AND created_at BETWEEN $2 AND $3
    `;

    const result = await this.pool.query(reviewQuery, [locationId, startDate, endDate]);
    const data = result.rows[0] || {};

    return {
      totalReviews: parseInt(data.total_reviews || 0),
      averageRating: parseFloat(data.avg_rating || 0),
      ratingTrend: 0, // TODO: Calculate trend from previous period
      categoryBreakdown: {
        food: parseFloat(data.avg_food || 0),
        service: parseFloat(data.avg_service || 0),
        atmosphere: parseFloat(data.avg_atmosphere || 0),
        value: parseFloat(data.avg_value || 0)
      }
    };
  }

  async getMenuManagement(locationId: string): Promise<MenuManagement> {
    // Get categories
    const categoriesQuery = `
      SELECT mc.id, mc.name, mc.description, mc.display_order as "displayOrder",
             mc.is_active as "isActive", mc.created_at as "createdAt", mc.updated_at as "updatedAt",
             COUNT(mi.id) as item_count
      FROM menu_categories mc
      LEFT JOIN menu_items mi ON mc.id = mi.category_id AND mi.is_available = true
      WHERE mc.location_id = $1
      GROUP BY mc.id, mc.name, mc.description, mc.display_order, mc.is_active, mc.created_at, mc.updated_at
      ORDER BY mc.display_order ASC
    `;

    const categoriesResult = await this.pool.query(categoriesQuery, [locationId]);
    const categories = categoriesResult.rows.map(row => ({
      ...row,
      itemCount: parseInt(row.item_count)
    }));

    // Get items with analytics
    const itemsQuery = `
      SELECT mi.id, mi.category_id as "categoryId", mc.name as "categoryName",
             mi.name, mi.description, mi.price, mi.image_url as "imageUrl",
             mi.allergens, mi.is_available as "isAvailable", mi.display_order as "displayOrder",
             mi.created_at as "createdAt", mi.updated_at as "updatedAt",
             COALESCE(SUM(oi.quantity), 0) as popularity,
             COALESCE(SUM(oi.total_price), 0) as revenue
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN table_sessions ts ON o.session_id = ts.id
      LEFT JOIN tables t ON ts.table_id = t.id
      WHERE mi.location_id = $1
      GROUP BY mi.id, mi.category_id, mc.name, mi.name, mi.description, mi.price, 
               mi.image_url, mi.allergens, mi.is_available, mi.display_order, 
               mi.created_at, mi.updated_at
      ORDER BY mi.display_order ASC
    `;

    const itemsResult = await this.pool.query(itemsQuery, [locationId]);
    const items = itemsResult.rows.map(row => ({
      ...row,
      popularity: parseInt(row.popularity),
      revenue: parseFloat(row.revenue)
    }));

    // Calculate analytics
    const totalItems = items.length;
    const activeItems = items.filter(item => item.isAvailable).length;
    const topSellingItems = items
      .filter(item => item.popularity > 0)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10)
      .map(item => ({
        itemId: item.id,
        name: item.name,
        quantity: item.popularity,
        revenue: item.revenue
      }));

    const leastPopularItems = items
      .filter(item => item.isAvailable)
      .sort((a, b) => a.popularity - b.popularity)
      .slice(0, 5)
      .map(item => ({
        itemId: item.id,
        name: item.name,
        quantity: item.popularity,
        revenue: item.revenue
      }));

    const analytics = {
      totalItems,
      activeItems,
      topSellingItems,
      leastPopularItems,
      profitMargins: {}, // TODO: Calculate profit margins
      seasonalTrends: [] // TODO: Calculate seasonal trends
    };

    return {
      categories,
      items,
      analytics
    };
  }

  async bulkUpdateMenu(locationId: string, update: BulkMenuUpdate): Promise<{ success: boolean; affectedItems: number }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      let query = '';
      let params: any[] = [];

      switch (update.action) {
        case 'update_prices':
          const priceMultiplier = update.data.multiplier || 1;
          query = `
            UPDATE menu_items 
            SET price = price * $1, updated_at = NOW()
            WHERE id = ANY($2) AND location_id = $3
          `;
          params = [priceMultiplier, update.itemIds, locationId];
          break;

        case 'toggle_availability':
          const isAvailable = update.data.isAvailable;
          query = `
            UPDATE menu_items 
            SET is_available = $1, updated_at = NOW()
            WHERE id = ANY($2) AND location_id = $3
          `;
          params = [isAvailable, update.itemIds, locationId];
          break;

        case 'update_category':
          const categoryId = update.data.categoryId;
          query = `
            UPDATE menu_items 
            SET category_id = $1, updated_at = NOW()
            WHERE id = ANY($2) AND location_id = $3
          `;
          params = [categoryId, update.itemIds, locationId];
          break;

        case 'delete_items':
          query = `
            UPDATE menu_items 
            SET is_available = false, updated_at = NOW()
            WHERE id = ANY($1) AND location_id = $2
          `;
          params = [update.itemIds, locationId];
          break;

        default:
          throw new Error('Invalid bulk update action');
      }

      const result = await client.query(query, params);
      await client.query('COMMIT');

      return {
        success: true,
        affectedItems: result.rowCount || 0
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSystemNotifications(locationId?: string): Promise<SystemNotification[]> {
    let query = `
      SELECT id, type, title, message, location_id as "locationId", 
             is_read as "isRead", created_at as "createdAt", expires_at as "expiresAt"
      FROM system_notifications
      WHERE (expires_at IS NULL OR expires_at > NOW())
    `;

    const params: any[] = [];

    if (locationId) {
      query += ` AND (location_id = $1 OR location_id IS NULL)`;
      params.push(locationId);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const query = `
      UPDATE system_notifications 
      SET is_read = true 
      WHERE id = $1
      RETURNING id
    `;

    const result = await this.pool.query(query, [notificationId]);
    return result.rows.length > 0;
  }
}

export const adminDashboardService = new AdminDashboardService();