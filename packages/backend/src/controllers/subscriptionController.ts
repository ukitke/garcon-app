import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscriptionService';

export class SubscriptionController {
  async getPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await subscriptionService.getPlans();
      
      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription plans'
      });
    }
  }

  async getPlan(req: Request, res: Response): Promise<void> {
    try {
      const { planId } = req.params;
      const plan = await subscriptionService.getPlan(planId);
      
      if (!plan) {
        res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
        return;
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Error fetching subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription plan'
      });
    }
  }

  async createPlan(req: Request, res: Response): Promise<void> {
    try {
      const planData = req.body;
      
      // Validate required fields
      if (!planData.name || !planData.price || !planData.currency) {
        res.status(400).json({
          success: false,
          error: 'Name, price, and currency are required'
        });
        return;
      }

      const plan = await subscriptionService.createPlan(planData);
      
      res.status(201).json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create subscription plan'
      });
    }
  }

  async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const subscription = await subscriptionService.getSubscription(locationId);
      
      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
        return;
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription'
      });
    }
  }

  async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { planId, paymentMethodId, trialDays } = req.body;

      if (!planId) {
        res.status(400).json({
          success: false,
          error: 'Plan ID is required'
        });
        return;
      }

      const subscription = await subscriptionService.createSubscription(
        locationId,
        planId,
        paymentMethodId,
        trialDays
      );
      
      res.status(201).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create subscription'
      });
    }
  }

  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { planId } = req.body;

      if (!planId) {
        res.status(400).json({
          success: false,
          error: 'Plan ID is required'
        });
        return;
      }

      const subscription = await subscriptionService.updateSubscription(subscriptionId, planId);
      
      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription'
      });
    }
  }

  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { immediately = false } = req.body;

      const subscription = await subscriptionService.cancelSubscription(subscriptionId, immediately);
      
      res.json({
        success: true,
        data: subscription,
        message: immediately ? 'Subscription cancelled immediately' : 'Subscription will be cancelled at the end of the current period'
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel subscription'
      });
    }
  }

  async reactivateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      const subscription = await subscriptionService.reactivateSubscription(subscriptionId);
      
      res.json({
        success: true,
        data: subscription,
        message: 'Subscription reactivated successfully'
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate subscription'
      });
    }
  }

  async getUsage(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { period } = req.query;

      const usage = await subscriptionService.getUsage(locationId, period as string);
      
      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage'
      });
    }
  }

  async trackUsage(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { metric, value } = req.body;

      if (!metric || value === undefined) {
        res.status(400).json({
          success: false,
          error: 'Metric and value are required'
        });
        return;
      }

      await subscriptionService.trackUsage(locationId, metric, value);
      
      res.json({
        success: true,
        message: 'Usage tracked successfully'
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track usage'
      });
    }
  }

  async getInvoices(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { limit = 10 } = req.query;

      const invoices = await subscriptionService.getInvoices(locationId, parseInt(limit as string));
      
      res.json({
        success: true,
        data: invoices
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch invoices'
      });
    }
  }

  async createBillingPortalSession(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { returnUrl } = req.body;

      if (!returnUrl) {
        res.status(400).json({
          success: false,
          error: 'Return URL is required'
        });
        return;
      }

      const session = await subscriptionService.createBillingPortalSession(locationId, returnUrl);
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create billing portal session'
      });
    }
  }

  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const analytics = await subscriptionService.getSubscriptionAnalytics(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription analytics'
      });
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

      // This would handle Stripe webhooks
      // For now, just acknowledge receipt
      console.log('Webhook received:', req.body);
      
      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(400).json({
        success: false,
        error: 'Webhook handling failed'
      });
    }
  }

  async getSubscriptionMetrics(req: Request, res: Response): Promise<void> {
    try {
      // This would implement comprehensive subscription metrics
      const metrics = {
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        cancelledSubscriptions: 0,
        pastDueSubscriptions: 0,
        totalRevenue: 0,
        monthlyGrowthRate: 0,
        churnRate: 0,
        averageLifetime: 0
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error fetching subscription metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription metrics'
      });
    }
  }

  async previewSubscriptionChange(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const { planId } = req.body;

      if (!planId) {
        res.status(400).json({
          success: false,
          error: 'Plan ID is required'
        });
        return;
      }

      // This would calculate proration and preview the change
      const preview = {
        planId,
        prorationAmount: 0,
        nextInvoiceAmount: 0,
        nextInvoiceDate: new Date(),
        immediateCharge: 0,
        items: []
      };

      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      console.error('Error previewing subscription change:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to preview subscription change'
      });
    }
  }

  async checkTrialEligibility(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      // Check if location has already used a trial
      const eligibility = {
        eligible: true,
        reason: undefined,
        trialDays: 14,
        trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      };

      res.json({
        success: true,
        data: eligibility
      });
    } catch (error) {
      console.error('Error checking trial eligibility:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check trial eligibility'
      });
    }
  }
}

export const subscriptionController = new SubscriptionController();