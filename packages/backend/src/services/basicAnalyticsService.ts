import { Pool } from 'pg';
import { getPool } from '../config/database';

export interface BasicAnalytics {
  overview: OverviewStats;
  sales: SalesAnalytics;
  orders: OrderAnalytics;
  menu: MenuAnalytics;
  performance: PerformanceStats;
  trends: TrendAnalytics;
}

export interface OverviewStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  conversionRate: number;
  period: {
    start: Date;
    end: Date;
  };
  previousPeriodComparison: {
    revenue: number;
    orders: number;
    customers: number;
    aov: number;
  };
}

export interface SalesAnalytics {
  dailySales: DailySales[];
  hourlySales: HourlySales[];
  salesByPaymentMethod: PaymentMethodSales[];
  salesByTable: TableSales[];
  topRevenueItems: RevenueItem[];
}

export interface OrderAnalytics {
  ordersByStatus: OrderStatus[];
  ordersByHour: HourlyOrders[];
  averageOrderTime: number;
  orderCompletionRate: number;
  cancelledOrdersRate: number;
  peakHours: PeakHour[];
}

export interface MenuAnalytics {
  popularItems: PopularItem[];
  categoryPerformance: CategoryPerformance[];
  itemRatings: ItemRating[];
  menuOptimization: MenuOptimization[];
  lowPerformingItems: LowPerformingItem[];
}

export interface PerformanceStats {
  averageServiceTime: number;
  tableUtilization: number;
  waiterEfficiency: WaiterEfficiency[];
  customerSatisfaction: number;
  repeatCustomerRate: number;
}

export interface TrendAnalytics {
  weeklyTrends: WeeklyTrend[];
  monthlyTrends: MonthlyTrend[];
  seasonalPatterns: SeasonalPattern[];
  growthMetrics: GrowthMetrics;
}

export interface DailySales {
  date: Date;
  revenue: number;
  orders: number;
  customers: number;
}

export interface HourlySales {
  hour: number;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface PaymentMethodSales {
  method: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface TableSales {
  tableNumber: string;
  revenue: number;
  orders: number;
  utilization: number;
}

export interface RevenueItem {
  itemId: string;
  itemName: string;
  category: string;
  revenue: number;
  orders: number;
  averagePrice: number;
}

export interface OrderStatus {
  status: string;
  count: number;
  percentage: number;
}

export interface HourlyOrders {
  hour: number;
  orders: number;
  averageValue: number;
}

export interface PeakHour {
  hour: number;
  orders: number;
  revenue: number;
  utilization: number;
}

export interface PopularItem {
  itemId: string;
  itemName: string;
  category: string;
  orderCount: number;
  revenue: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  orders: number;
  averageRating: number;
  profitMargin: number;
}

export interface ItemRating {
  itemId: string;
  itemName: string;
  averageRating: number;
  reviewCount: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface MenuOptimization {
  itemId: string;
  itemName: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  reason: string;
}

export interface LowPerformingItem {
  itemId: string;
  itemName: string;
  category: string;
  orderCount: number;
  revenue: number;
  lastOrdered: Date;
}

export interface WaiterEfficiency {
  waiterId: string;
  waiterName: string;
  ordersServed: number;
  averageServiceTime: number;
  customerRating: number;
  efficiency: number;
}

export interface WeeklyTrend {
  week: string;
  revenue: number;
  orders: number;
  customers: number;
  growth: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  orders: number;
  customers: number;
  growth: number;
}

export interface SeasonalPattern {
  season: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  popularItems: string[];
}

export interface GrowthMetrics {
  revenueGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
  monthOverMonth: number;
  yearOverYear: number;
}

export class BasicAnalyticsService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async getBasicAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<BasicAnalytics> {
    const [overview, sales, orders, menu, performance, trends] = await Promise.all([
      this.getOverviewStats(locationId, startDate, endDate),
      this.getSalesAnalytics(locationId, startDate, endDate),
      this.getOrderAnalytics(locationId, startDate, endDate),
      this.getMenuAnalytics(locationId, startDate, endDate),
      this.getPerformanceStats(locationId, startDate, endDate),
      this.getTrendAnalytics(locationId, startDate, endDate)
    ]);

    return {
      overview,
      sales,
      orders,
      menu,
      performance,
      trends
    };
  }

  async getOverviewStats(locationId: string, startDate: Date, endDate: Date): Promise<OverviewStats> {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN pi.status = 'succeeded' THEN pi.amount END), 0) as total_revenue,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT sp.id) as total_customers,
        COALESCE(AVG(CASE WHEN pi.status = 'succeeded' THEN pi.amount END), 0) as avg_order_value,
        COALESCE(
          COUNT(CASE WHEN pi.status = 'succeeded' THEN 1 END)::float / 
          NULLIF(COUNT(DISTINCT ts.id), 0) * 100, 0
        ) as conversion_rate
      FROM table_sessions ts
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      LEFT JOIN orders o ON ts.id = o.session_id
      LEFT JOIN payment_intents pi ON o.id = pi.order_id
      WHERE t.location_id = $1 
        AND ts.created_at BETWEEN $2 AND $3
    `;

    const result = await this.pool.query(query, [locationId, startDate, endDate]);
    const data = result.rows[0];

    // Get previous period for comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodDuration);
    const previousEnd = new Date(startDate.getTime());

    const previousResult = await this.pool.query(query, [locationId, previousStart, previousEnd]);
    const previousData = previousResult.rows[0];

    return {
      totalRevenue: parseFloat(data.total_revenue) || 0,
      totalOrders: parseInt(data.total_orders) || 0,
      averageOrderValue: parseFloat(data.avg_order_value) || 0,
      totalCustomers: parseInt(data.total_customers) || 0,
      conversionRate: parseFloat(data.conversion_rate) || 0,
      period: { start: startDate, end: endDate },
      previousPeriodComparison: {
        revenue: this.calculateGrowth(data.total_revenue, previousData.total_revenue),
        orders: this.calculateGrowth(data.total_orders, previousData.total_orders),
        customers: this.calculateGrowth(data.total_customers, previousData.total_customers),
        aov: this.calculateGrowth(data.avg_order_value, previousData.avg_order_value)
      }
    };
  }

  async getSalesAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<SalesAnalytics> {
    // Daily sales
    const dailySalesQuery = `
      SELECT 
        DATE_TRUNC('day', pi.created_at) as date,
        SUM(pi.amount) as revenue,
        COUNT(DISTINCT o.id) as orders,
        COUNT(DISTINCT sp.id) as customers
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC('day', pi.created_at)
      ORDER BY date
    `;

    const dailySalesResult = await this.pool.query(dailySalesQuery, [locationId, startDate, endDate]);
    const dailySales: DailySales[] = dailySalesResult.rows.map(row => ({
      date: new Date(row.date),
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
      customers: parseInt(row.customers)
    }));

    // Hourly sales
    const hourlySalesQuery = `
      SELECT 
        EXTRACT(HOUR FROM pi.created_at) as hour,
        SUM(pi.amount) as revenue,
        COUNT(DISTINCT o.id) as orders,
        AVG(pi.amount) as avg_order_value
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at BETWEEN $2 AND $3
      GROUP BY EXTRACT(HOUR FROM pi.created_at)
      ORDER BY hour
    `;

    const hourlySalesResult = await this.pool.query(hourlySalesQuery, [locationId, startDate, endDate]);
    const hourlySales: HourlySales[] = hourlySalesResult.rows.map(row => ({
      hour: parseInt(row.hour),
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
      averageOrderValue: parseFloat(row.avg_order_value)
    }));

    // Sales by payment method
    const paymentMethodQuery = `
      SELECT 
        pi.provider_id as method,
        SUM(pi.amount) as revenue,
        COUNT(*) as orders
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at BETWEEN $2 AND $3
      GROUP BY pi.provider_id
    `;

    const paymentMethodResult = await this.pool.query(paymentMethodQuery, [locationId, startDate, endDate]);
    const totalRevenue = paymentMethodResult.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);
    const salesByPaymentMethod: PaymentMethodSales[] = paymentMethodResult.rows.map(row => ({
      method: row.method,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
      percentage: (parseFloat(row.revenue) / totalRevenue) * 100
    }));

    // Sales by table
    const tableSalesQuery = `
      SELECT 
        t.table_number,
        SUM(pi.amount) as revenue,
        COUNT(DISTINCT o.id) as orders,
        COUNT(DISTINCT ts.id)::float / 
        (SELECT COUNT(*) FROM tables WHERE location_id = $1) * 100 as utilization
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at BETWEEN $2 AND $3
      GROUP BY t.table_number
      ORDER BY revenue DESC
    `;

    const tableSalesResult = await this.pool.query(tableSalesQuery, [locationId, startDate, endDate]);
    const salesByTable: TableSales[] = tableSalesResult.rows.map(row => ({
      tableNumber: row.table_number,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
      utilization: parseFloat(row.utilization)
    }));

    // Top revenue items
    const topItemsQuery = `
      SELECT 
        mi.id,
        mi.name,
        mc.name as category,
        SUM(oi.total_price) as revenue,
        COUNT(oi.id) as orders,
        AVG(oi.unit_price) as avg_price
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      JOIN orders o ON oi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND o.created_at BETWEEN $2 AND $3
      GROUP BY mi.id, mi.name, mc.name
      ORDER BY revenue DESC
      LIMIT 10
    `;

    const topItemsResult = await this.pool.query(topItemsQuery, [locationId, startDate, endDate]);
    const topRevenueItems: RevenueItem[] = topItemsResult.rows.map(row => ({
      itemId: row.id,
      itemName: row.name,
      category: row.category || 'Uncategorized',
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
      averagePrice: parseFloat(row.avg_price)
    }));

    return {
      dailySales,
      hourlySales,
      salesByPaymentMethod,
      salesByTable,
      topRevenueItems
    };
  }

  async getOrderAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<OrderAnalytics> {
    // Orders by status
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM orders o
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND o.created_at BETWEEN $2 AND $3
      GROUP BY status
    `;

    const statusResult = await this.pool.query(statusQuery, [locationId, startDate, endDate]);
    const totalOrders = statusResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const ordersByStatus: OrderStatus[] = statusResult.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count),
      percentage: (parseInt(row.count) / totalOrders) * 100
    }));

    // Orders by hour
    const hourlyOrdersQuery = `
      SELECT 
        EXTRACT(HOUR FROM o.created_at) as hour,
        COUNT(*) as orders,
        AVG(o.total_amount) as avg_value
      FROM orders o
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND o.created_at BETWEEN $2 AND $3
      GROUP BY EXTRACT(HOUR FROM o.created_at)
      ORDER BY hour
    `;

    const hourlyOrdersResult = await this.pool.query(hourlyOrdersQuery, [locationId, startDate, endDate]);
    const ordersByHour: HourlyOrders[] = hourlyOrdersResult.rows.map(row => ({
      hour: parseInt(row.hour),
      orders: parseInt(row.orders),
      averageValue: parseFloat(row.avg_value)
    }));

    // Performance metrics
    const performanceQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at))/60) as avg_order_time,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::float / COUNT(*) * 100 as completion_rate,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::float / COUNT(*) * 100 as cancellation_rate
      FROM orders o
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND o.created_at BETWEEN $2 AND $3
    `;

    const performanceResult = await this.pool.query(performanceQuery, [locationId, startDate, endDate]);
    const performance = performanceResult.rows[0];

    // Peak hours
    const peakHoursQuery = `
      SELECT 
        EXTRACT(HOUR FROM o.created_at) as hour,
        COUNT(*) as orders,
        SUM(o.total_amount) as revenue,
        COUNT(DISTINCT ts.table_id)::float / 
        (SELECT COUNT(*) FROM tables WHERE location_id = $1) * 100 as utilization
      FROM orders o
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND o.created_at BETWEEN $2 AND $3
      GROUP BY EXTRACT(HOUR FROM o.created_at)
      ORDER BY orders DESC
      LIMIT 5
    `;

    const peakHoursResult = await this.pool.query(peakHoursQuery, [locationId, startDate, endDate]);
    const peakHours: PeakHour[] = peakHoursResult.rows.map(row => ({
      hour: parseInt(row.hour),
      orders: parseInt(row.orders),
      revenue: parseFloat(row.revenue),
      utilization: parseFloat(row.utilization)
    }));

    return {
      ordersByStatus,
      ordersByHour,
      averageOrderTime: parseFloat(performance.avg_order_time) || 0,
      orderCompletionRate: parseFloat(performance.completion_rate) || 0,
      cancelledOrdersRate: parseFloat(performance.cancellation_rate) || 0,
      peakHours
    };
  }

  async getMenuAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<MenuAnalytics> {
    // Popular items
    const popularItemsQuery = `
      SELECT 
        mi.id,
        mi.name,
        mc.name as category,
        COUNT(oi.id) as order_count,
        SUM(oi.total_price) as revenue,
        COALESCE(AVG(r.rating), 0) as rating
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN table_sessions ts ON o.session_id = ts.id
      LEFT JOIN tables t ON ts.table_id = t.id
      LEFT JOIN reviews r ON mi.id = r.item_id
      WHERE mi.location_id = $1 
        AND (o.created_at IS NULL OR o.created_at BETWEEN $2 AND $3)
      GROUP BY mi.id, mi.name, mc.name
      ORDER BY order_count DESC
      LIMIT 20
    `;

    const popularItemsResult = await this.pool.query(popularItemsQuery, [locationId, startDate, endDate]);
    const popularItems: PopularItem[] = popularItemsResult.rows.map(row => ({
      itemId: row.id,
      itemName: row.name,
      category: row.category || 'Uncategorized',
      orderCount: parseInt(row.order_count) || 0,
      revenue: parseFloat(row.revenue) || 0,
      rating: parseFloat(row.rating) || 0,
      trend: 'stable' // TODO: Calculate trend based on historical data
    }));

    // Category performance
    const categoryQuery = `
      SELECT 
        COALESCE(mc.name, 'Uncategorized') as category,
        SUM(oi.total_price) as revenue,
        COUNT(oi.id) as orders,
        AVG(r.rating) as avg_rating
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN table_sessions ts ON o.session_id = ts.id
      LEFT JOIN tables t ON ts.table_id = t.id
      LEFT JOIN reviews r ON mi.id = r.item_id
      WHERE mi.location_id = $1 
        AND (o.created_at IS NULL OR o.created_at BETWEEN $2 AND $3)
      GROUP BY mc.name
      ORDER BY revenue DESC
    `;

    const categoryResult = await this.pool.query(categoryQuery, [locationId, startDate, endDate]);
    const categoryPerformance: CategoryPerformance[] = categoryResult.rows.map(row => ({
      category: row.category,
      revenue: parseFloat(row.revenue) || 0,
      orders: parseInt(row.orders) || 0,
      averageRating: parseFloat(row.avg_rating) || 0,
      profitMargin: 0 // TODO: Calculate based on cost data
    }));

    // Low performing items
    const lowPerformingQuery = `
      SELECT 
        mi.id,
        mi.name,
        COALESCE(mc.name, 'Uncategorized') as category,
        COUNT(oi.id) as order_count,
        SUM(oi.total_price) as revenue,
        MAX(o.created_at) as last_ordered
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN table_sessions ts ON o.session_id = ts.id
      LEFT JOIN tables t ON ts.table_id = t.id
      WHERE mi.location_id = $1 
        AND mi.is_available = true
        AND (o.created_at IS NULL OR o.created_at BETWEEN $2 AND $3)
      GROUP BY mi.id, mi.name, mc.name
      HAVING COUNT(oi.id) < 5 OR MAX(o.created_at) < NOW() - INTERVAL '7 days'
      ORDER BY order_count ASC, last_ordered ASC
      LIMIT 10
    `;

    const lowPerformingResult = await this.pool.query(lowPerformingQuery, [locationId, startDate, endDate]);
    const lowPerformingItems: LowPerformingItem[] = lowPerformingResult.rows.map(row => ({
      itemId: row.id,
      itemName: row.name,
      category: row.category,
      orderCount: parseInt(row.order_count) || 0,
      revenue: parseFloat(row.revenue) || 0,
      lastOrdered: row.last_ordered ? new Date(row.last_ordered) : new Date(0)
    }));

    return {
      popularItems,
      categoryPerformance,
      itemRatings: [], // TODO: Implement detailed ratings
      menuOptimization: [], // TODO: Implement optimization suggestions
      lowPerformingItems
    };
  }

  async getPerformanceStats(locationId: string, startDate: Date, endDate: Date): Promise<PerformanceStats> {
    // Service time and efficiency
    const performanceQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (wc.resolved_at - wc.created_at))/60) as avg_service_time,
        COUNT(DISTINCT ts.table_id)::float / 
        (SELECT COUNT(*) FROM tables WHERE location_id = $1) * 100 as table_utilization,
        AVG(cr.customer_satisfaction) as customer_satisfaction,
        COUNT(DISTINCT CASE WHEN sp.user_id IS NOT NULL THEN sp.user_id END)::float /
        COUNT(DISTINCT sp.id) * 100 as repeat_customer_rate
      FROM table_sessions ts
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      LEFT JOIN waiter_calls wc ON ts.id = wc.session_id
      LEFT JOIN call_responses cr ON wc.id = cr.call_id
      WHERE t.location_id = $1 
        AND ts.created_at BETWEEN $2 AND $3
    `;

    const performanceResult = await this.pool.query(performanceQuery, [locationId, startDate, endDate]);
    const performance = performanceResult.rows[0];

    // Waiter efficiency
    const waiterQuery = `
      SELECT 
        u.id,
        u.name,
        COUNT(DISTINCT wc.id) as orders_served,
        AVG(EXTRACT(EPOCH FROM (wc.resolved_at - wc.acknowledged_at))/60) as avg_service_time,
        AVG(cr.customer_satisfaction) as customer_rating,
        COUNT(DISTINCT wc.id)::float / 
        EXTRACT(EPOCH FROM ($3 - $2))/3600 as efficiency
      FROM users u
      LEFT JOIN waiter_calls wc ON u.id = wc.assigned_waiter_id
      LEFT JOIN call_responses cr ON wc.id = cr.call_id
      WHERE wc.location_id = $1 
        AND wc.created_at BETWEEN $2 AND $3
      GROUP BY u.id, u.name
      HAVING COUNT(DISTINCT wc.id) > 0
      ORDER BY efficiency DESC
    `;

    const waiterResult = await this.pool.query(waiterQuery, [locationId, startDate, endDate]);
    const waiterEfficiency: WaiterEfficiency[] = waiterResult.rows.map(row => ({
      waiterId: row.id,
      waiterName: row.name,
      ordersServed: parseInt(row.orders_served),
      averageServiceTime: parseFloat(row.avg_service_time) || 0,
      customerRating: parseFloat(row.customer_rating) || 0,
      efficiency: parseFloat(row.efficiency) || 0
    }));

    return {
      averageServiceTime: parseFloat(performance.avg_service_time) || 0,
      tableUtilization: parseFloat(performance.table_utilization) || 0,
      waiterEfficiency,
      customerSatisfaction: parseFloat(performance.customer_satisfaction) || 0,
      repeatCustomerRate: parseFloat(performance.repeat_customer_rate) || 0
    };
  }

  async getTrendAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<TrendAnalytics> {
    // Weekly trends
    const weeklyQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('week', pi.created_at), 'YYYY-WW') as week,
        SUM(pi.amount) as revenue,
        COUNT(DISTINCT o.id) as orders,
        COUNT(DISTINCT sp.id) as customers
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC('week', pi.created_at)
      ORDER BY week
    `;

    const weeklyResult = await this.pool.query(weeklyQuery, [locationId, startDate, endDate]);
    const weeklyTrends: WeeklyTrend[] = weeklyResult.rows.map((row, index) => ({
      week: row.week,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
      customers: parseInt(row.customers),
      growth: index > 0 ? 
        this.calculateGrowth(row.revenue, weeklyResult.rows[index - 1].revenue) : 0
    }));

    // Monthly trends
    const monthlyQuery = `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', pi.created_at), 'YYYY-MM') as month,
        SUM(pi.amount) as revenue,
        COUNT(DISTINCT o.id) as orders,
        COUNT(DISTINCT sp.id) as customers
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at >= DATE_TRUNC('month', $2) - INTERVAL '11 months'
        AND pi.created_at <= $3
      GROUP BY DATE_TRUNC('month', pi.created_at)
      ORDER BY month
    `;

    const monthlyResult = await this.pool.query(monthlyQuery, [locationId, startDate, endDate]);
    const monthlyTrends: MonthlyTrend[] = monthlyResult.rows.map((row, index) => ({
      month: row.month,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders),
      customers: parseInt(row.customers),
      growth: index > 0 ? 
        this.calculateGrowth(row.revenue, monthlyResult.rows[index - 1].revenue) : 0
    }));

    // Growth metrics
    const currentPeriodRevenue = weeklyTrends.reduce((sum, week) => sum + week.revenue, 0);
    const previousPeriodRevenue = await this.getPreviousPeriodRevenue(locationId, startDate, endDate);
    
    const growthMetrics: GrowthMetrics = {
      revenueGrowth: this.calculateGrowth(currentPeriodRevenue, previousPeriodRevenue),
      orderGrowth: 0, // TODO: Calculate
      customerGrowth: 0, // TODO: Calculate
      monthOverMonth: monthlyTrends.length > 1 ? 
        this.calculateGrowth(
          monthlyTrends[monthlyTrends.length - 1].revenue,
          monthlyTrends[monthlyTrends.length - 2].revenue
        ) : 0,
      yearOverYear: 0 // TODO: Calculate
    };

    return {
      weeklyTrends,
      monthlyTrends,
      seasonalPatterns: [], // TODO: Implement seasonal analysis
      growthMetrics
    };
  }

  // Helper methods
  private calculateGrowth(current: number, previous: number): number {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private async getPreviousPeriodRevenue(locationId: string, startDate: Date, endDate: Date): Promise<number> {
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodDuration);
    const previousEnd = new Date(startDate.getTime());

    const query = `
      SELECT COALESCE(SUM(pi.amount), 0) as revenue
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at BETWEEN $2 AND $3
    `;

    const result = await this.pool.query(query, [locationId, previousStart, previousEnd]);
    return parseFloat(result.rows[0].revenue) || 0;
  }
}

export const basicAnalyticsService = new BasicAnalyticsService();