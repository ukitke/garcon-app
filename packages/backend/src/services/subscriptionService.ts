import { getPool } from '../config/database';
// import Stripe from 'stripe';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: string;
  maxLocations: number;
  maxTables: number;
  maxMenuItems: number;
  analyticsLevel: string;
  supportLevel: string;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  locationId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriptionService {
  private pool: any;
  private stripe: any;

  constructor() {
    this.pool = getPool();
    // this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    //   apiVersion: '2023-10-16',
    // });
  }

  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    const query = `
      SELECT * FROM subscription_plans 
      WHERE is_active = true 
      ORDER BY price ASC
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  async createSubscription(locationId: string, planId: string): Promise<Subscription> {
    const query = `
      INSERT INTO subscriptions (location_id, plan_id, status, current_period_start, current_period_end)
      VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 month')
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [locationId, planId]);
    return result.rows[0];
  }

  async getSubscriptionByLocationId(locationId: string): Promise<Subscription | null> {
    const query = `
      SELECT * FROM subscriptions 
      WHERE location_id = $1 AND status = 'active'
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [locationId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    const query = `
      UPDATE subscriptions 
      SET status = 'cancelled', cancelled_at = NOW()
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [subscriptionId]);
    return (result.rowCount || 0) > 0;
  }

  async updateSubscription(subscriptionId: string, planId: string): Promise<Subscription | null> {
    const query = `
      UPDATE subscriptions 
      SET plan_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [subscriptionId, planId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getSubscriptionAnalytics(startDate: Date, endDate: Date): Promise<any> {
    return {
      totalRevenue: 0,
      activeSubscriptions: 0,
      churnRate: 0,
      customerLifetimeValue: 0,
      subscriptionsByPlan: {},
      subscriptionsByStatus: {},
      revenueByPlan: {}
    };
  }

  // Additional methods needed by controller
  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.getAvailablePlans();
  }

  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const query = `SELECT * FROM subscription_plans WHERE id = $1`;
    const result = await this.pool.query(query, [planId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async createPlan(planData: any): Promise<SubscriptionPlan> {
    const query = `
      INSERT INTO subscription_plans (name, description, price, currency, billing_interval)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      planData.name, planData.description, planData.price, 
      planData.currency, planData.billingInterval
    ]);
    return result.rows[0];
  }

  async getSubscription(locationId: string): Promise<Subscription | null> {
    return this.getSubscriptionByLocationId(locationId);
  }

  async reactivateSubscription(subscriptionId: string): Promise<Subscription | null> {
    const query = `
      UPDATE subscriptions 
      SET status = 'active', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [subscriptionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getUsage(locationId: string, period: string): Promise<any> {
    return { usage: 0, limit: 100 };
  }

  async trackUsage(locationId: string, metric: string, value: number): Promise<void> {
    // Track usage metrics
  }

  async getInvoices(locationId: string, limit: number): Promise<any[]> {
    return [];
  }

  async createBillingPortalSession(locationId: string, returnUrl: string): Promise<any> {
    return { url: returnUrl };
  }
}

export default SubscriptionService;