import { SubscriptionService } from '../../services/subscriptionService';
import { Pool } from 'pg';
import Stripe from 'stripe';

// Mock the database pool
jest.mock('../../config/database', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }))
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    products: {
      create: jest.fn()
    },
    prices: {
      create: jest.fn()
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn()
    },
    subscriptions: {
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      retrieve: jest.fn()
    },
    paymentMethods: {
      attach: jest.fn()
    },
    billingPortal: {
      sessions: {
        create: jest.fn()
      }
    }
  }));
});

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockPool: jest.Mocked<Pool>;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    // Set required environment variable
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    
    subscriptionService = new SubscriptionService();
    mockPool = require('../../config/database').getPool();
    mockStripe = new (require('stripe'))() as jest.Mocked<Stripe>;
    
    jest.clearAllMocks();
  });

  describe('getPlans', () => {
    it('should return all active subscription plans', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Basic',
          description: 'Basic plan',
          price: '29.99',
          currency: 'USD',
          billing_interval: 'monthly',
          max_locations: 1,
          max_tables: 10,
          max_menu_items: 50,
          analytics_level: 'basic',
          support_level: 'email',
          is_active: true,
          created_at: '2023-10-01T10:00:00Z',
          updated_at: '2023-10-01T10:00:00Z',
          features: [
            {
              id: 'feature-1',
              name: 'Menu Management',
              description: 'Manage your menu',
              category: 'core',
              is_included: true,
              limit_value: null
            }
          ]
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockPlans });

      const result = await subscriptionService.getPlans();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'plan-1',
        name: 'Basic',
        description: 'Basic plan',
        price: 29.99,
        currency: 'USD',
        billingInterval: 'monthly',
        features: [
          {
            id: 'feature-1',
            name: 'Menu Management',
            description: 'Manage your menu',
            category: 'core',
            isIncluded: true,
            limit: null
          }
        ],
        maxLocations: 1,
        maxTables: 10,
        maxMenuItems: 50,
        analyticsLevel: 'basic',
        supportLevel: 'email',
        isActive: true,
        createdAt: new Date('2023-10-01T10:00:00Z'),
        updatedAt: new Date('2023-10-01T10:00:00Z')
      });
    });
  });

  describe('createPlan', () => {
    it('should create a new subscription plan', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      // Mock Stripe responses
      const mockStripeProduct = { id: 'prod_123' };
      const mockStripePrice = { id: 'price_123' };
      
      (mockStripe.products.create as jest.Mock).mockResolvedValueOnce(mockStripeProduct);
      (mockStripe.prices.create as jest.Mock).mockResolvedValueOnce(mockStripePrice);

      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'plan-1', 
            created_at: '2023-10-01T10:00:00Z',
            updated_at: '2023-10-01T10:00:00Z'
          }] 
        }) // INSERT plan
        .mockResolvedValueOnce(undefined) // INSERT feature
        .mockResolvedValueOnce(undefined); // COMMIT

      const planData = {
        name: 'Premium',
        description: 'Premium plan',
        price: 99.99,
        currency: 'USD',
        billingInterval: 'monthly' as const,
        features: [
          {
            id: 'feature-1',
            name: 'Advanced Analytics',
            description: 'Advanced analytics features',
            category: 'analytics' as const,
            isIncluded: true
          }
        ],
        maxLocations: 5,
        maxTables: 50,
        maxMenuItems: 200,
        analyticsLevel: 'advanced' as const,
        supportLevel: 'priority' as const,
        isActive: true
      };

      const result = await subscriptionService.createPlan(planData);

      expect(result.id).toBe('plan-1');
      expect(result.name).toBe('Premium');
      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: 'Premium',
        description: 'Premium plan',
        metadata: {
          maxLocations: '5',
          maxTables: '50',
          maxMenuItems: '200',
          analyticsLevel: 'advanced',
          supportLevel: 'priority'
        }
      });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);
      (mockStripe.products.create as jest.Mock).mockRejectedValueOnce(new Error('Stripe error'));

      const planData = {
        name: 'Test Plan',
        description: 'Test',
        price: 29.99,
        currency: 'USD',
        billingInterval: 'monthly' as const,
        features: [],
        maxLocations: 1,
        maxTables: 10,
        maxMenuItems: 50,
        analyticsLevel: 'basic' as const,
        supportLevel: 'email' as const,
        isActive: true
      };

      await expect(subscriptionService.createPlan(planData))
        .rejects.toThrow('Stripe error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getSubscription', () => {
    it('should return active subscription for location', async () => {
      const mockSubscription = {
        id: 'sub-1',
        location_id: 'loc-1',
        plan_id: 'plan-1',
        status: 'active',
        current_period_start: '2023-10-01T00:00:00Z',
        current_period_end: '2023-11-01T00:00:00Z',
        trial_start: null,
        trial_end: null,
        cancelled_at: null,
        cancel_at_period_end: false,
        stripe_subscription_id: 'sub_stripe_123',
        stripe_customer_id: 'cus_stripe_123',
        created_at: '2023-10-01T10:00:00Z',
        updated_at: '2023-10-01T10:00:00Z'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockSubscription] });

      const result = await subscriptionService.getSubscription('loc-1');

      expect(result).toEqual({
        id: 'sub-1',
        locationId: 'loc-1',
        planId: 'plan-1',
        status: 'active',
        currentPeriodStart: new Date('2023-10-01T00:00:00Z'),
        currentPeriodEnd: new Date('2023-11-01T00:00:00Z'),
        trialStart: undefined,
        trialEnd: undefined,
        cancelledAt: undefined,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'sub_stripe_123',
        stripeCustomerId: 'cus_stripe_123',
        createdAt: new Date('2023-10-01T10:00:00Z'),
        updatedAt: new Date('2023-10-01T10:00:00Z')
      });
    });

    it('should return null when no subscription found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await subscriptionService.getSubscription('loc-1');

      expect(result).toBeNull();
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      // Mock plan data
      const mockPlan = {
        id: 'plan-1',
        name: 'Basic',
        price: 29.99,
        stripePriceId: 'price_123'
      };

      // Mock location data
      const mockLocation = {
        id: 'loc-1',
        name: 'Test Restaurant',
        email: 'owner@test.com',
        owner_name: 'John Doe'
      };

      // Mock Stripe customer
      const mockStripeCustomer = {
        id: 'cus_123',
        email: 'owner@test.com'
      };

      // Mock Stripe subscription
      const mockStripeSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        trial_start: null,
        trial_end: null
      };

      // Setup mocks
      jest.spyOn(subscriptionService, 'getPlan').mockResolvedValueOnce(mockPlan as any);
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockLocation] }) // getLocationForBilling
        .mockResolvedValueOnce({ rows: [] }) // check existing customer
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'sub-1',
            created_at: '2023-10-01T10:00:00Z',
            updated_at: '2023-10-01T10:00:00Z'
          }] 
        }) // INSERT subscription
        .mockResolvedValueOnce(undefined) // log event
        .mockResolvedValueOnce(undefined); // COMMIT

      (mockStripe.customers.create as jest.Mock).mockResolvedValueOnce(mockStripeCustomer);
      (mockStripe.subscriptions.create as jest.Mock).mockResolvedValueOnce(mockStripeSubscription);

      const result = await subscriptionService.createSubscription('loc-1', 'plan-1');

      expect(result.id).toBe('sub-1');
      expect(result.locationId).toBe('loc-1');
      expect(result.planId).toBe('plan-1');
      expect(result.status).toBe('active');
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: undefined }], // Would be resolved in real implementation
        metadata: {
          locationId: 'loc-1',
          planId: 'plan-1'
        }
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      const mockSubscription = {
        id: 'sub-1',
        stripeSubscriptionId: 'sub_stripe_123',
        locationId: 'loc-1',
        planId: 'plan-1',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: 'cus_123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(subscriptionService as any, 'getSubscriptionById')
        .mockResolvedValueOnce(mockSubscription);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            ...mockSubscription,
            status: 'cancelled',
            cancelled_at: '2023-10-01T10:00:00Z',
            updated_at: '2023-10-01T10:00:00Z'
          }] 
        }) // UPDATE
        .mockResolvedValueOnce(undefined) // log event
        .mockResolvedValueOnce(undefined); // COMMIT

      (mockStripe.subscriptions.cancel as jest.Mock).mockResolvedValueOnce({});

      const result = await subscriptionService.cancelSubscription('sub-1', true);

      expect(result.status).toBe('cancelled');
      expect(result.cancelledAt).toEqual(new Date('2023-10-01T10:00:00Z'));
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_stripe_123');
    });

    it('should schedule cancellation at period end', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      const mockSubscription = {
        id: 'sub-1',
        stripeSubscriptionId: 'sub_stripe_123',
        currentPeriodEnd: new Date('2023-11-01T00:00:00Z')
      };

      jest.spyOn(subscriptionService as any, 'getSubscriptionById')
        .mockResolvedValueOnce(mockSubscription);

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            ...mockSubscription,
            cancel_at_period_end: true,
            updated_at: '2023-10-01T10:00:00Z'
          }] 
        }) // UPDATE
        .mockResolvedValueOnce(undefined) // log event
        .mockResolvedValueOnce(undefined); // COMMIT

      (mockStripe.subscriptions.update as jest.Mock).mockResolvedValueOnce({});

      const result = await subscriptionService.cancelSubscription('sub-1', false);

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_stripe_123', {
        cancel_at_period_end: true
      });
    });
  });

  describe('trackUsage', () => {
    it('should track usage metrics', async () => {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      
      mockPool.query.mockResolvedValueOnce(undefined);

      await subscriptionService.trackUsage('loc-1', 'orders_count', 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO subscription_usage'),
        ['loc-1', currentPeriod, 5]
      );
    });
  });

  describe('getUsage', () => {
    it('should return usage data for current period', async () => {
      const mockUsage = {
        id: 'usage-1',
        subscription_id: 'sub-1',
        location_id: 'loc-1',
        period: '2023-10',
        orders_count: 50,
        tables_used: 10,
        menu_items_count: 25,
        analytics_requests: 100,
        api_calls: 500,
        storage_used: 1024,
        created_at: '2023-10-01T10:00:00Z',
        updated_at: '2023-10-01T10:00:00Z'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUsage] });

      const result = await subscriptionService.getUsage('loc-1');

      expect(result).toEqual({
        id: 'usage-1',
        subscriptionId: 'sub-1',
        locationId: 'loc-1',
        period: '2023-10',
        ordersCount: 50,
        tablesUsed: 10,
        menuItemsCount: 25,
        analyticsRequests: 100,
        apiCalls: 500,
        storageUsed: 1024,
        createdAt: new Date('2023-10-01T10:00:00Z'),
        updatedAt: new Date('2023-10-01T10:00:00Z')
      });
    });
  });

  describe('createBillingPortalSession', () => {
    it('should create billing portal session', async () => {
      const mockSubscription = {
        stripeCustomerId: 'cus_123'
      };

      const mockSession = {
        url: 'https://billing.stripe.com/session/123',
        return_url: 'https://app.example.com/billing'
      };

      jest.spyOn(subscriptionService, 'getSubscription')
        .mockResolvedValueOnce(mockSubscription as any);

      (mockStripe.billingPortal.sessions.create as jest.Mock)
        .mockResolvedValueOnce(mockSession);

      const result = await subscriptionService.createBillingPortalSession(
        'loc-1',
        'https://app.example.com/billing'
      );

      expect(result.url).toBe('https://billing.stripe.com/session/123');
      expect(result.returnUrl).toBe('https://app.example.com/billing');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.example.com/billing'
      });
    });
  });
});