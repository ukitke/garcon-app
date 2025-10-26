export interface PaymentProvider {
  id: string;
  name: string;
  type: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'satispay';
  isEnabled: boolean;
  config: PaymentProviderConfig;
}

export interface PaymentProviderConfig {
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  merchantId?: string;
  environment: 'sandbox' | 'production';
  supportedCurrencies: string[];
  supportedCountries: string[];
}

export interface PaymentIntent {
  id: string;
  sessionId: string;
  participantId?: string; // null for group payments
  orderId?: string; // null for bill requests
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  paymentMethod: PaymentMethod;
  providerId: string;
  providerPaymentId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'digital_wallet' | 'bank_transfer';
  provider: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'satispay';
  details: PaymentMethodDetails;
  isDefault: boolean;
  userId?: string;
  createdAt: Date;
}

export interface PaymentMethodDetails {
  // Card details (for Stripe)
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  
  // Digital wallet details
  walletType?: 'google_pay' | 'apple_pay' | 'paypal' | 'satispay';
  email?: string;
  
  // Bank transfer details
  bankName?: string;
  accountLast4?: string;
}

export interface PaymentSplit {
  id: string;
  paymentIntentId: string;
  participantId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paymentMethodId?: string;
  paidAt?: Date;
  createdAt: Date;
}

export interface PaymentTransaction {
  id: string;
  paymentIntentId: string;
  providerId: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  fees: PaymentFees;
  createdAt: Date;
  completedAt?: Date;
}

export interface PaymentFees {
  processingFee: number;
  platformFee: number;
  totalFees: number;
}

export interface Receipt {
  id: string;
  paymentIntentId: string;
  sessionId: string;
  locationId: string;
  receiptNumber: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  createdAt: Date;
  emailSent: boolean;
  downloadUrl?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: string[];
}

// Request/Response types
export interface CreatePaymentIntentRequest {
  sessionId: string;
  participantId?: string;
  orderId?: string;
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  splitPayment?: boolean;
  metadata?: Record<string, any>;
}

export interface CreatePaymentIntentResponse {
  paymentIntent: PaymentIntent;
  clientSecret?: string;
  redirectUrl?: string;
  qrCode?: string; // For mobile payments
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId: string;
  billingDetails?: BillingDetails;
}

export interface BillingDetails {
  name: string;
  email: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // partial refund if specified
  reason: string;
}

export interface RefundResponse {
  refundId: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  reason: string;
}

export interface SplitPaymentRequest {
  sessionId: string;
  totalAmount: number;
  splits: PaymentSplitRequest[];
  currency?: string;
}

export interface PaymentSplitRequest {
  participantId: string;
  amount: number;
  paymentMethodId?: string;
}

export interface SplitPaymentResponse {
  paymentIntentId: string;
  splits: PaymentSplit[];
  totalAmount: number;
  status: 'pending' | 'partial' | 'completed';
}

export interface TreatSomeoneRequest {
  sessionId: string;
  fromParticipantId: string;
  toParticipantId: string;
  orderId?: string;
  amount?: number;
  paymentMethodId: string;
}

export interface PaymentWebhookEvent {
  id: string;
  type: string;
  providerId: string;
  data: any;
  signature: string;
  processed: boolean;
  createdAt: Date;
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  paymentMethodBreakdown: Record<string, number>;
  failureRate: number;
  refundRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

// Provider-specific types
export interface StripePaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  metadata: Record<string, string>;
}

export interface PayPalOrder {
  id: string;
  status: string;
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
  }>;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface GooglePayPaymentData {
  apiVersion: number;
  apiVersionMinor: number;
  paymentMethodData: {
    type: string;
    tokenizationData: {
      type: string;
      token: string;
    };
  };
}

export interface ApplePayPaymentData {
  version: string;
  data: string;
  signature: string;
  header: {
    ephemeralPublicKey: string;
    publicKeyHash: string;
    transactionId: string;
  };
}

export interface SatispayPaymentRequest {
  flow: string;
  amount_unit: number;
  currency: string;
  callback_url: string;
  metadata?: Record<string, string>;
}

export interface SatispayPaymentResponse {
  id: string;
  code_identifier: string;
  status: string;
  amount_unit: number;
  currency: string;
  redirect_url: string;
}