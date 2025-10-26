export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly';
  features: PlanFeature[];
  maxLocations: number;
  maxTables: number;
  maxMenuItems: number;
  analyticsLevel: 'basic' | 'advanced' | 'premium';
  supportLevel: 'email' | 'priority' | '24/7';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'analytics' | 'integrations' | 'support';
  isIncluded: boolean;
  limit?: number;
}

export interface Subscription {
  id: string;
  locationId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'trialing';
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

export interface SubscriptionUsage {
  id: string;
  subscriptionId: string;
  locationId: string;
  period: string; // YYYY-MM format
  ordersCount: number;
  tablesUsed: number;
  menuItemsCount: number;
  analyticsRequests: number;
  apiCalls: number;
  storageUsed: number; // in MB
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  locationId: string;
  stripeInvoiceId?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  paidAt?: Date;
  invoiceUrl?: string;
  hostedInvoiceUrl?: string;
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  period?: {
    start: Date;
    end: Date;
  };
}

export interface PaymentMethod {
  id: string;
  locationId: string;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account' | 'sepa_debit';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
    accountType: string;
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingAddress {
  id: string;
  locationId: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  type: 'created' | 'updated' | 'cancelled' | 'renewed' | 'payment_failed' | 'payment_succeeded';
  data: any;
  processedAt?: Date;
  createdAt: Date;
}

export interface UsageAlert {
  id: string;
  subscriptionId: string;
  locationId: string;
  metric: 'orders' | 'tables' | 'menu_items' | 'api_calls' | 'storage';
  threshold: number;
  currentUsage: number;
  alertLevel: 'warning' | 'critical';
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
}

export interface SubscriptionAnalytics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  churnRate: number;
  customerLifetimeValue: number;
  averageRevenuePerUser: number;
  subscriptionsByPlan: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  revenueByPlan: Record<string, number>;
  period: {
    start: Date;
    end: Date;
  };
}

export interface PlanComparison {
  planId: string;
  planName: string;
  currentPlan: boolean;
  price: number;
  savings?: number;
  features: {
    name: string;
    included: boolean;
    limit?: number;
    upgrade?: boolean;
  }[];
}

export interface SubscriptionPreview {
  planId: string;
  prorationAmount: number;
  nextInvoiceAmount: number;
  nextInvoiceDate: Date;
  immediateCharge: number;
  items: {
    description: string;
    amount: number;
    period: {
      start: Date;
      end: Date;
    };
  }[];
}

export interface TrialEligibility {
  eligible: boolean;
  reason?: string;
  trialDays: number;
  trialEnd?: Date;
}

export interface DowngradePreview {
  effectiveDate: Date;
  featuresLost: string[];
  dataRetention: {
    analytics: number; // days
    orders: number; // days
    backups: number; // days
  };
  refundAmount?: number;
}

export interface BillingPortalSession {
  url: string;
  returnUrl: string;
  expiresAt: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  processed: boolean;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
}

export interface SubscriptionMetrics {
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  pastDueSubscriptions: number;
  totalRevenue: number;
  monthlyGrowthRate: number;
  churnRate: number;
  averageLifetime: number;
}