import { Pool } from 'pg';
import { getPool } from '../config/database';
import Stripe from 'stripe';
import {
  SubscriptionPlan,
  Subscription,
  SubscriptionUsage,
  Invoice,
  PaymentMethod,
  BillingAddress,
  SubscriptionEvent,
  UsageAlert,
  SubscriptionAnalytics,
  PlanComparison,
  SubscriptionPreview,
  TrialEligibility,
  BillingPortalSession,
  SubscriptionMetrics
} from '../types/subscription';

export class SubscriptionService {
  private pool: Pool;
  private stripe: Stripe;

  constructor() {
    this.pool = getPool();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
  }

  // Plan Management
  async getPlans(): Promise<SubscriptionPlan[]> {
    const query = `
      SELECT sp.*, 
             json_agg(
               json_build_object(
                 'id', pf.id,
                 'name', pf.name,
                 'description', pf.description,
                 'category', pf.category,
                 'isIncluded', pf.is_included,
                 'limit', pf.limit_value
               )
             ) as features
      FROM subscription_plans sp
      LEFT JOIN plan_features pf ON sp.id = pf.plan_id
      WHERE sp.is_active = true
      GROUP BY sp.id
      ORDER BY sp.price ASC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      currency: row.currency,
      billingInterval: row.billing_interval,
      features: row.features || [],
      maxLocations: row.max_locations,
      maxTables: row.max_tables,
      maxMenuItems: row.max_menu_items,
      analyticsLevel: row.analytics_level,
      supportLevel: row.support_level,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    })); 
 }

  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const plans = await this.getPlans();
    return plans.find(plan => plan.id === planId) || null;
  }

  async createPlan(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create Stripe product and price
      const stripeProduct = await this.stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          maxLocations: plan.maxLocations.toString(),
          maxTables: plan.maxTables.toString(),
          maxMenuItems: plan.maxMenuItems.toString(),
          analyticsLevel: plan.analyticsLevel,
          supportLevel: plan.supportLevel
        }
      });

      const stripePrice = await this.stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(plan.price * 100), // Convert to cents
        currency: plan.currency,
        recurring: {
          interval: plan.billingInterval === 'yearly' ? 'year' : 'month'
        }
      });

      // Insert plan into database
      const planQuery = `
        INSERT INTO subscription_plans (
          name, description, price, currency, billing_interval,
          max_locations, max_tables, max_menu_items, analytics_level,
          support_level, stripe_product_id, stripe_price_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, created_at, updated_at
      `;

      const planResult = await client.query(planQuery, [
        plan.name, plan.description, plan.price, plan.currency, plan.billingInterval,
        plan.maxLocations, plan.maxTables, plan.maxMenuItems, plan.analyticsLevel,
        plan.supportLevel, stripeProduct.id, stripePrice.id, plan.isActive
      ]);

      const newPlanId = planResult.rows[0].id;

      // Insert features
      if (plan.features && plan.features.length > 0) {
        const featureQuery = `
          INSERT INTO plan_features (plan_id, name, description, category, is_included, limit_value)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;

        for (const feature of plan.features) {
          await client.query(featureQuery, [
            newPlanId, feature.name, feature.description, feature.category,
            feature.isIncluded, feature.limit
          ]);
        }
      }

      await client.query('COMMIT');

      return {
        ...plan,
        id: newPlanId,
        createdAt: new Date(planResult.rows[0].created_at),
        updatedAt: new Date(planResult.rows[0].updated_at)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Subscription Management
  async getSubscription(locationId: string): Promise<Subscription | null> {
    const query = `
      SELECT * FROM subscriptions 
      WHERE location_id = $1 AND status != 'cancelled'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [locationId]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      locationId: row.location_id,
      planId: row.plan_id,
      status: row.status,
      currentPeriodStart: new Date(row.current_period_start),
      currentPeriodEnd: new Date(row.current_period_end),
      trialStart: row.trial_start ? new Date(row.trial_start) : undefined,
      trialEnd: row.trial_end ? new Date(row.trial_end) : undefined,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async createSubscription(
    locationId: string, 
    planId: string, 
    paymentMethodId?: string,
    trialDays?: number
  ): Promise<Subscription> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get plan details
      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get or create Stripe customer
      const location = await this.getLocationForBilling(locationId);
      let stripeCustomer = await this.getOrCreateStripeCustomer(location);

      // Attach payment method if provided
      if (paymentMethodId) {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomer.id
        });

        // Set as default payment method
        await this.stripe.customers.update(stripeCustomer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }

      // Create Stripe subscription
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: stripeCustomer.id,
        items: [{
          price: await this.getStripePriceId(planId)
        }],
        metadata: {
          locationId: locationId,
          planId: planId
        }
      };

      if (trialDays && trialDays > 0) {
        subscriptionParams.trial_period_days = trialDays;
      }

      const stripeSubscription = await this.stripe.subscriptions.create(subscriptionParams);

      // Save subscription to database
      const subscriptionQuery = `
        INSERT INTO subscriptions (
          location_id, plan_id, status, current_period_start, current_period_end,
          trial_start, trial_end, stripe_subscription_id, stripe_customer_id,
          cancel_at_period_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at, updated_at
      `;

      const subscriptionResult = await client.query(subscriptionQuery, [
        locationId,
        planId,
        stripeSubscription.status,
        new Date(stripeSubscription.current_period_start * 1000),
        new Date(stripeSubscription.current_period_end * 1000),
        stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        stripeSubscription.id,
        stripeCustomer.id,
        false
      ]);

      // Log subscription event
      await this.logSubscriptionEvent(subscriptionResult.rows[0].id, 'created', {
        planId,
        stripeSubscriptionId: stripeSubscription.id,
        trialDays
      });

      await client.query('COMMIT');

      return {
        id: subscriptionResult.rows[0].id,
        locationId,
        planId,
        status: stripeSubscription.status as any,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : undefined,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeCustomer.id,
        createdAt: new Date(subscriptionResult.rows[0].created_at),
        updatedAt: new Date(subscriptionResult.rows[0].updated_at)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSubscription(subscriptionId: string, planId: string): Promise<Subscription> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current subscription
      const currentSub = await this.getSubscriptionById(subscriptionId);
      if (!currentSub) {
        throw new Error('Subscription not found');
      }

      // Get new plan
      const newPlan = await this.getPlan(planId);
      if (!newPlan) {
        throw new Error('Plan not found');
      }

      // Update Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.update(
        currentSub.stripeSubscriptionId!,
        {
          items: [{
            id: (await this.stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId!)).items.data[0].id,
            price: await this.getStripePriceId(planId)
          }],
          proration_behavior: 'create_prorations'
        }
      );

      // Update database
      const updateQuery = `
        UPDATE subscriptions 
        SET plan_id = $1, status = $2, current_period_start = $3, 
            current_period_end = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        planId,
        stripeSubscription.status,
        new Date(stripeSubscription.current_period_start * 1000),
        new Date(stripeSubscription.current_period_end * 1000),
        subscriptionId
      ]);

      // Log subscription event
      await this.logSubscriptionEvent(subscriptionId, 'updated', {
        oldPlanId: currentSub.planId,
        newPlanId: planId
      });

      await client.query('COMMIT');

      const row = result.rows[0];
      return {
        id: row.id,
        locationId: row.location_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: new Date(row.current_period_start),
        currentPeriodEnd: new Date(row.current_period_end),
        trialStart: row.trial_start ? new Date(row.trial_start) : undefined,
        trialEnd: row.trial_end ? new Date(row.trial_end) : undefined,
        cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripeCustomerId: row.stripe_customer_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<Subscription> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (immediately) {
        // Cancel immediately
        await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId!);
        
        const updateQuery = `
          UPDATE subscriptions 
          SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, [subscriptionId]);
        
        await this.logSubscriptionEvent(subscriptionId, 'cancelled', { immediately: true });
        
        await client.query('COMMIT');
        
        const row = result.rows[0];
        return {
          ...subscription,
          status: 'cancelled',
          cancelledAt: new Date(row.cancelled_at),
          updatedAt: new Date(row.updated_at)
        };
      } else {
        // Cancel at period end
        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId!, {
          cancel_at_period_end: true
        });
        
        const updateQuery = `
          UPDATE subscriptions 
          SET cancel_at_period_end = true, updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, [subscriptionId]);
        
        await this.logSubscriptionEvent(subscriptionId, 'cancelled', { 
          immediately: false,
          effectiveDate: subscription.currentPeriodEnd
        });
        
        await client.query('COMMIT');
        
        const row = result.rows[0];
        return {
          ...subscription,
          cancelAtPeriodEnd: true,
          updatedAt: new Date(row.updated_at)
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Reactivate in Stripe
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId!, {
      cancel_at_period_end: false
    });

    // Update database
    const updateQuery = `
      UPDATE subscriptions 
      SET cancel_at_period_end = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(updateQuery, [subscriptionId]);
    
    await this.logSubscriptionEvent(subscriptionId, 'updated', { reactivated: true });

    const row = result.rows[0];
    return {
      ...subscription,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(row.updated_at)
    };
  }

  // Usage Tracking
  async trackUsage(locationId: string, metric: string, value: number): Promise<void> {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const query = `
      INSERT INTO subscription_usage (subscription_id, location_id, period, ${metric})
      VALUES (
        (SELECT id FROM subscriptions WHERE location_id = $1 AND status = 'active'),
        $1, $2, $3
      )
      ON CONFLICT (subscription_id, period)
      DO UPDATE SET ${metric} = subscription_usage.${metric} + $3, updated_at = NOW()
    `;

    await this.pool.query(query, [locationId, period, value]);

    // Check usage alerts
    await this.checkUsageAlerts(locationId, metric, value);
  }

  async getUsage(locationId: string, period?: string): Promise<SubscriptionUsage | null> {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);
    
    const query = `
      SELECT * FROM subscription_usage 
      WHERE location_id = $1 AND period = $2
    `;

    const result = await this.pool.query(query, [locationId, currentPeriod]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      locationId: row.location_id,
      period: row.period,
      ordersCount: row.orders_count || 0,
      tablesUsed: row.tables_used || 0,
      menuItemsCount: row.menu_items_count || 0,
      analyticsRequests: row.analytics_requests || 0,
      apiCalls: row.api_calls || 0,
      storageUsed: row.storage_used || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Billing and Invoices
  async getInvoices(locationId: string, limit: number = 10): Promise<Invoice[]> {
    const query = `
      SELECT i.*, 
             json_agg(
               json_build_object(
                 'id', ii.id,
                 'description', ii.description,
                 'quantity', ii.quantity,
                 'unitPrice', ii.unit_price,
                 'amount', ii.amount,
                 'period', json_build_object(
                   'start', ii.period_start,
                   'end', ii.period_end
                 )
               )
             ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.location_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [locationId, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      subscriptionId: row.subscription_id,
      locationId: row.location_id,
      stripeInvoiceId: row.stripe_invoice_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      dueDate: new Date(row.due_date),
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      invoiceUrl: row.invoice_url,
      hostedInvoiceUrl: row.hosted_invoice_url,
      items: row.items || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async createBillingPortalSession(locationId: string, returnUrl: string): Promise<BillingPortalSession> {
    const subscription = await this.getSubscription(locationId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId!,
      return_url: returnUrl
    });

    return {
      url: session.url,
      returnUrl: returnUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  // Analytics and Reporting
  async getSubscriptionAnalytics(startDate: Date, endDate: Date): Promise<SubscriptionAnalytics> {
    const query = `
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trial_subscriptions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
        SUM(CASE WHEN status = 'active' THEN sp.price ELSE 0 END) as mrr,
        AVG(sp.price) as arpu
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.created_at BETWEEN $1 AND $2
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    const data = result.rows[0];

    // Calculate additional metrics
    const totalRevenue = await this.calculateTotalRevenue(startDate, endDate);
    const churnRate = await this.calculateChurnRate(startDate, endDate);
    const clv = await this.calculateCustomerLifetimeValue();

    return {
      totalRevenue,
      monthlyRecurringRevenue: parseFloat(data.mrr) || 0,
      annualRecurringRevenue: (parseFloat(data.mrr) || 0) * 12,
      churnRate,
      customerLifetimeValue: clv,
      averageRevenuePerUser: parseFloat(data.arpu) || 0,
      subscriptionsByPlan: await this.getSubscriptionsByPlan(),
      subscriptionsByStatus: await this.getSubscriptionsByStatus(),
      revenueByPlan: await this.getRevenueByPlan(),
      period: { start: startDate, end: endDate }
    };
  }

  // Helper methods
  private async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    const query = `SELECT * FROM subscriptions WHERE id = $1`;
    const result = await this.pool.query(query, [subscriptionId]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      locationId: row.location_id,
      planId: row.plan_id,
      status: row.status,
      currentPeriodStart: new Date(row.current_period_start),
      currentPeriodEnd: new Date(row.current_period_end),
      trialStart: row.trial_start ? new Date(row.trial_start) : undefined,
      trialEnd: row.trial_end ? new Date(row.trial_end) : undefined,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async getLocationForBilling(locationId: string): Promise<any> {
    const query = `
      SELECT l.*, u.email, u.name as owner_name
      FROM locations l
      JOIN users u ON l.owner_id = u.id
      WHERE l.id = $1
    `;
    
    const result = await this.pool.query(query, [locationId]);
    if (result.rows.length === 0) {
      throw new Error('Location not found');
    }
    
    return result.rows[0];
  }

  private async getOrCreateStripeCustomer(location: any): Promise<Stripe.Customer> {
    // Check if customer already exists
    const existingQuery = `
      SELECT stripe_customer_id FROM subscriptions 
      WHERE location_id = $1 AND stripe_customer_id IS NOT NULL
      LIMIT 1
    `;
    
    const existingResult = await this.pool.query(existingQuery, [location.id]);
    
    if (existingResult.rows.length > 0) {
      return await this.stripe.customers.retrieve(existingResult.rows[0].stripe_customer_id) as Stripe.Customer;
    }

    // Create new customer
    return await this.stripe.customers.create({
      email: location.email,
      name: location.owner_name,
      metadata: {
        locationId: location.id,
        locationName: location.name
      }
    });
  }

  private async getStripePriceId(planId: string): Promise<string> {
    const query = `SELECT stripe_price_id FROM subscription_plans WHERE id = $1`;
    const result = await this.pool.query(query, [planId]);
    
    if (result.rows.length === 0) {
      throw new Error('Plan not found');
    }
    
    return result.rows[0].stripe_price_id;
  }

  private async logSubscriptionEvent(subscriptionId: string, type: string, data: any): Promise<void> {
    const query = `
      INSERT INTO subscription_events (subscription_id, type, data)
      VALUES ($1, $2, $3)
    `;
    
    await this.pool.query(query, [subscriptionId, type, JSON.stringify(data)]);
  }

  private async checkUsageAlerts(locationId: string, metric: string, currentValue: number): Promise<void> {
    const query = `
      SELECT * FROM usage_alerts 
      WHERE location_id = $1 AND metric = $2 AND is_active = true
    `;
    
    const result = await this.pool.query(query, [locationId, metric]);
    
    for (const alert of result.rows) {
      if (currentValue >= alert.threshold) {
        // Trigger alert
        await this.triggerUsageAlert(alert.id, currentValue);
      }
    }
  }

  private async triggerUsageAlert(alertId: string, currentUsage: number): Promise<void> {
    const updateQuery = `
      UPDATE usage_alerts 
      SET last_triggered = NOW()
      WHERE id = $1
    `;
    
    await this.pool.query(updateQuery, [alertId]);
    
    // Here you would send notification to the user
    console.log(`Usage alert triggered: ${alertId}, current usage: ${currentUsage}`);
  }

  private async calculateTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
    const query = `
      SELECT SUM(amount) as total_revenue
      FROM invoices
      WHERE status = 'paid' AND paid_at BETWEEN $1 AND $2
    `;
    
    const result = await this.pool.query(query, [startDate, endDate]);
    return parseFloat(result.rows[0]?.total_revenue) || 0;
  }

  private async calculateChurnRate(startDate: Date, endDate: Date): Promise<number> {
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'cancelled' AND cancelled_at BETWEEN $1 AND $2 THEN 1 END) as churned,
        COUNT(CASE WHEN created_at < $1 THEN 1 END) as total_at_start
      FROM subscriptions
    `;
    
    const result = await this.pool.query(query, [startDate, endDate]);
    const data = result.rows[0];
    
    const churned = parseInt(data.churned) || 0;
    const totalAtStart = parseInt(data.total_at_start) || 1;
    
    return (churned / totalAtStart) * 100;
  }

  private async calculateCustomerLifetimeValue(): Promise<number> {
    const query = `
      SELECT AVG(sp.price * 12) as avg_annual_value
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active'
    `;
    
    const result = await this.pool.query(query);
    return parseFloat(result.rows[0]?.avg_annual_value) || 0;
  }

  private async getSubscriptionsByPlan(): Promise<Record<string, number>> {
    const query = `
      SELECT sp.name, COUNT(*) as count
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active'
      GROUP BY sp.name
    `;
    
    const result = await this.pool.query(query);
    const data: Record<string, number> = {};
    
    result.rows.forEach(row => {
      data[row.name] = parseInt(row.count);
    });
    
    return data;
  }

  private async getSubscriptionsByStatus(): Promise<Record<string, number>> {
    const query = `
      SELECT status, COUNT(*) as count
      FROM subscriptions
      GROUP BY status
    `;
    
    const result = await this.pool.query(query);
    const data: Record<string, number> = {};
    
    result.rows.forEach(row => {
      data[row.status] = parseInt(row.count);
    });
    
    return data;
  }

  private async getRevenueByPlan(): Promise<Record<string, number>> {
    const query = `
      SELECT sp.name, SUM(sp.price) as revenue
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.status = 'active'
      GROUP BY sp.name
    `;
    
    const result = await this.pool.query(query);
    const data: Record<string, number> = {};
    
    result.rows.forEach(row => {
      data[row.name] = parseFloat(row.revenue);
    });
    
    return data;
  }
}

export const subscriptionService = new SubscriptionService();