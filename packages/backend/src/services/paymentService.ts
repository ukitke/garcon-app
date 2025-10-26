import { Pool } from 'pg';
import { 
  PaymentIntent, 
  PaymentMethod, 
  PaymentSplit,
  PaymentTransaction,
  Receipt,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentRequest,
  RefundRequest,
  RefundResponse,
  SplitPaymentRequest,
  SplitPaymentResponse,
  TreatSomeoneRequest,
  PaymentAnalytics
} from '../types/payment';
import { getPool } from '../config/database';
import { StripePaymentProvider } from './paymentProviders/stripeProvider';
import { PayPalPaymentProvider } from './paymentProviders/paypalProvider';
import { GooglePayProvider } from './paymentProviders/googlePayProvider';
import { ApplePayProvider } from './paymentProviders/applePayProvider';
import { SatispayProvider } from './paymentProviders/satispayProvider';

export interface PaymentProviderInterface {
  createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<any>;
  confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<any>;
  refundPayment(paymentIntentId: string, amount?: number, reason?: string): Promise<any>;
  getPaymentStatus(paymentIntentId: string): Promise<string>;
  handleWebhook(payload: any, signature: string): Promise<any>;
}

export class PaymentService {
  private pool: Pool;
  private providers: Map<string, PaymentProviderInterface>;

  constructor() {
    this.pool = getPool();
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('stripe', new StripePaymentProvider());
    this.providers.set('paypal', new PayPalPaymentProvider());
    this.providers.set('google_pay', new GooglePayProvider());
    this.providers.set('apple_pay', new ApplePayProvider());
    this.providers.set('satispay', new SatispayProvider());
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate session exists
      const sessionQuery = `
        SELECT ts.id, t.location_id 
        FROM table_sessions ts
        JOIN tables t ON ts.table_id = t.id
        WHERE ts.id = $1 AND ts.is_active = true
      `;
      const sessionResult = await client.query(sessionQuery, [request.sessionId]);
      
      if (sessionResult.rows.length === 0) {
        throw new Error('Active session not found');
      }

      // Determine payment provider (default to Stripe for now)
      const providerId = this.determineProvider(request.paymentMethodId);
      const provider = this.providers.get(providerId);
      
      if (!provider) {
        throw new Error(`Payment provider ${providerId} not available`);
      }

      // Create payment intent in database
      const intentQuery = `
        INSERT INTO payment_intents (session_id, participant_id, order_id, amount, currency, provider_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, session_id as "sessionId", participant_id as "participantId", 
                  order_id as "orderId", amount, currency, status, provider_id as "providerId",
                  created_at as "createdAt", updated_at as "updatedAt"
      `;

      const intentValues = [
        request.sessionId,
        request.participantId || null,
        request.orderId || null,
        request.amount,
        request.currency || 'EUR',
        providerId,
        JSON.stringify(request.metadata || {})
      ];

      const intentResult = await client.query(intentQuery, intentValues);
      const paymentIntent = intentResult.rows[0];

      // Create payment intent with provider
      const providerIntent = await provider.createPaymentIntent(
        request.amount,
        request.currency || 'EUR',
        {
          sessionId: request.sessionId,
          participantId: request.participantId,
          orderId: request.orderId,
          ...request.metadata
        }
      );

      // Update with provider payment ID and client secret
      const updateQuery = `
        UPDATE payment_intents 
        SET provider_payment_id = $1, client_secret = $2, updated_at = NOW()
        WHERE id = $3
      `;
      
      await client.query(updateQuery, [
        providerIntent.id,
        providerIntent.client_secret || null,
        paymentIntent.id
      ]);

      await client.query('COMMIT');

      return {
        paymentIntent: {
          ...paymentIntent,
          providerPaymentId: providerIntent.id,
          clientSecret: providerIntent.client_secret
        },
        clientSecret: providerIntent.client_secret,
        redirectUrl: providerIntent.redirect_url,
        qrCode: providerIntent.qr_code
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmPayment(request: ConfirmPaymentRequest): Promise<PaymentIntent> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get payment intent
      const intentQuery = `
        SELECT id, provider_id, provider_payment_id, amount, currency, status
        FROM payment_intents
        WHERE id = $1
      `;
      const intentResult = await client.query(intentQuery, [request.paymentIntentId]);
      
      if (intentResult.rows.length === 0) {
        throw new Error('Payment intent not found');
      }

      const intent = intentResult.rows[0];
      
      if (intent.status !== 'pending') {
        throw new Error('Payment intent is not in pending status');
      }

      const provider = this.providers.get(intent.provider_id);
      if (!provider) {
        throw new Error(`Payment provider ${intent.provider_id} not available`);
      }

      // Update status to processing
      await client.query(
        'UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2',
        ['processing', request.paymentIntentId]
      );

      // Confirm payment with provider
      const providerResult = await provider.confirmPayment(
        intent.provider_payment_id,
        request.paymentMethodId
      );

      // Update payment intent based on provider result
      const finalStatus = this.mapProviderStatus(providerResult.status);
      const updateQuery = `
        UPDATE payment_intents 
        SET status = $1, updated_at = NOW(), completed_at = CASE WHEN $1 = 'succeeded' THEN NOW() ELSE NULL END
        WHERE id = $2
        RETURNING id, session_id as "sessionId", participant_id as "participantId",
                  order_id as "orderId", amount, currency, status, provider_id as "providerId",
                  provider_payment_id as "providerPaymentId", created_at as "createdAt",
                  updated_at as "updatedAt", completed_at as "completedAt"
      `;

      const updatedResult = await client.query(updateQuery, [finalStatus, request.paymentIntentId]);
      const updatedIntent = updatedResult.rows[0];

      // Create transaction record
      if (finalStatus === 'succeeded') {
        await this.createTransactionRecord(client, updatedIntent, providerResult);
        await this.generateReceipt(client, updatedIntent);
      }

      await client.query('COMMIT');
      return updatedIntent;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createSplitPayment(request: SplitPaymentRequest): Promise<SplitPaymentResponse> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create main payment intent
      const paymentIntentRequest: CreatePaymentIntentRequest = {
        sessionId: request.sessionId,
        amount: request.totalAmount,
        currency: request.currency || 'EUR',
        splitPayment: true,
        metadata: { splitPayment: true, participantCount: request.splits.length }
      };

      const paymentIntentResponse = await this.createPaymentIntent(paymentIntentRequest);
      const paymentIntentId = paymentIntentResponse.paymentIntent.id;

      // Create payment splits
      const splits: PaymentSplit[] = [];
      for (const splitRequest of request.splits) {
        const splitQuery = `
          INSERT INTO payment_splits (payment_intent_id, participant_id, amount, payment_method_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id, payment_intent_id as "paymentIntentId", participant_id as "participantId",
                    amount, status, payment_method_id as "paymentMethodId", created_at as "createdAt"
        `;

        const splitResult = await client.query(splitQuery, [
          paymentIntentId,
          splitRequest.participantId,
          splitRequest.amount,
          splitRequest.paymentMethodId || null
        ]);

        splits.push(splitResult.rows[0]);
      }

      await client.query('COMMIT');

      return {
        paymentIntentId,
        splits,
        totalAmount: request.totalAmount,
        status: 'pending'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async processTreatSomeone(request: TreatSomeoneRequest): Promise<PaymentIntent> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Determine amount if not provided
      let amount = request.amount;
      if (!amount && request.orderId) {
        const orderQuery = `SELECT total_amount FROM orders WHERE id = $1`;
        const orderResult = await client.query(orderQuery, [request.orderId]);
        if (orderResult.rows.length === 0) {
          throw new Error('Order not found');
        }
        amount = orderResult.rows[0].total_amount;
      }

      if (!amount) {
        throw new Error('Amount must be specified');
      }

      // Create payment intent
      const paymentIntentRequest: CreatePaymentIntentRequest = {
        sessionId: request.sessionId,
        participantId: request.fromParticipantId,
        orderId: request.orderId,
        amount,
        paymentMethodId: request.paymentMethodId,
        metadata: {
          treatSomeone: true,
          fromParticipantId: request.fromParticipantId,
          toParticipantId: request.toParticipantId
        }
      };

      const paymentIntentResponse = await this.createPaymentIntent(paymentIntentRequest);

      // Create treat payment record
      const treatQuery = `
        INSERT INTO treat_payments (payment_intent_id, from_participant_id, to_participant_id, order_id, amount)
        VALUES ($1, $2, $3, $4, $5)
      `;

      await client.query(treatQuery, [
        paymentIntentResponse.paymentIntent.id,
        request.fromParticipantId,
        request.toParticipantId,
        request.orderId || null,
        amount
      ]);

      await client.query('COMMIT');
      return paymentIntentResponse.paymentIntent;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get payment intent
      const intentQuery = `
        SELECT provider_id, provider_payment_id, amount, status
        FROM payment_intents
        WHERE id = $1
      `;
      const intentResult = await client.query(intentQuery, [request.paymentIntentId]);
      
      if (intentResult.rows.length === 0) {
        throw new Error('Payment intent not found');
      }

      const intent = intentResult.rows[0];
      
      if (intent.status !== 'succeeded') {
        throw new Error('Can only refund succeeded payments');
      }

      const provider = this.providers.get(intent.provider_id);
      if (!provider) {
        throw new Error(`Payment provider ${intent.provider_id} not available`);
      }

      const refundAmount = request.amount || intent.amount;
      
      // Process refund with provider
      const providerRefund = await provider.refundPayment(
        intent.provider_payment_id,
        refundAmount,
        request.reason
      );

      // Create refund record
      const refundQuery = `
        INSERT INTO payment_refunds (payment_intent_id, provider_refund_id, amount, reason, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const refundResult = await client.query(refundQuery, [
        request.paymentIntentId,
        providerRefund.id,
        refundAmount,
        request.reason,
        this.mapProviderStatus(providerRefund.status)
      ]);

      await client.query('COMMIT');

      return {
        refundId: refundResult.rows[0].id,
        amount: refundAmount,
        status: this.mapProviderStatus(providerRefund.status),
        reason: request.reason
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPaymentAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<PaymentAnalytics> {
    const query = `
      SELECT 
        COUNT(pi.id) as total_transactions,
        SUM(pi.amount) as total_revenue,
        AVG(pi.amount) as average_order_value,
        COUNT(CASE WHEN pi.status = 'failed' THEN 1 END) as failed_transactions,
        COUNT(CASE WHEN pr.id IS NOT NULL THEN 1 END) as refunded_transactions,
        json_object_agg(pi.provider_id, provider_counts.count) as payment_method_breakdown
      FROM payment_intents pi
      JOIN table_sessions ts ON pi.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN payment_refunds pr ON pi.id = pr.payment_intent_id
      LEFT JOIN (
        SELECT provider_id, COUNT(*) as count
        FROM payment_intents pi2
        JOIN table_sessions ts2 ON pi2.session_id = ts2.id
        JOIN tables t2 ON ts2.table_id = t2.id
        WHERE t2.location_id = $1 AND pi2.created_at BETWEEN $2 AND $3
        GROUP BY provider_id
      ) provider_counts ON pi.provider_id = provider_counts.provider_id
      WHERE t.location_id = $1 AND pi.created_at BETWEEN $2 AND $3
    `;

    const result = await this.pool.query(query, [locationId, startDate, endDate]);
    const data = result.rows[0];

    const totalTransactions = parseInt(data.total_transactions) || 0;
    const failedTransactions = parseInt(data.failed_transactions) || 0;
    const refundedTransactions = parseInt(data.refunded_transactions) || 0;

    return {
      totalRevenue: parseFloat(data.total_revenue) || 0,
      totalTransactions,
      averageOrderValue: parseFloat(data.average_order_value) || 0,
      paymentMethodBreakdown: data.payment_method_breakdown || {},
      failureRate: totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0,
      refundRate: totalTransactions > 0 ? (refundedTransactions / totalTransactions) * 100 : 0,
      period: {
        start: startDate,
        end: endDate
      }
    };
  }

  // Private helper methods
  private determineProvider(paymentMethodId?: string): string {
    // Logic to determine which provider to use based on payment method
    // For now, default to Stripe
    return 'stripe';
  }

  private mapProviderStatus(providerStatus: string): string {
    // Map provider-specific statuses to our standard statuses
    const statusMap: Record<string, string> = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'processing',
      'processing': 'processing',
      'succeeded': 'succeeded',
      'canceled': 'cancelled',
      'failed': 'failed'
    };

    return statusMap[providerStatus] || providerStatus;
  }

  private async createTransactionRecord(client: any, paymentIntent: PaymentIntent, providerResult: any): Promise<void> {
    const fees = this.calculateFees(paymentIntent.amount, paymentIntent.providerId);
    
    const transactionQuery = `
      INSERT INTO payment_transactions (
        payment_intent_id, provider_id, provider_transaction_id, amount, currency, 
        status, processing_fee, platform_fee, total_fees, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `;

    await client.query(transactionQuery, [
      paymentIntent.id,
      paymentIntent.providerId,
      providerResult.transaction_id || providerResult.id,
      paymentIntent.amount,
      paymentIntent.currency,
      'completed',
      fees.processingFee,
      fees.platformFee,
      fees.totalFees
    ]);
  }

  private calculateFees(amount: number, providerId: string): { processingFee: number; platformFee: number; totalFees: number } {
    // Calculate fees based on provider and amount
    let processingFeeRate = 0.029; // 2.9% default
    let fixedFee = 0.30; // €0.30 fixed fee
    
    switch (providerId) {
      case 'stripe':
        processingFeeRate = 0.029;
        fixedFee = 0.30;
        break;
      case 'paypal':
        processingFeeRate = 0.034;
        fixedFee = 0.35;
        break;
      default:
        processingFeeRate = 0.029;
        fixedFee = 0.30;
    }

    const processingFee = (amount * processingFeeRate) + fixedFee;
    const platformFee = amount * 0.01; // 1% platform fee
    const totalFees = processingFee + platformFee;

    return {
      processingFee: Math.round(processingFee * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100
    };
  }

  private async generateReceipt(client: any, paymentIntent: PaymentIntent): Promise<void> {
    // Get order details if order payment
    let items = [];
    let subtotal = paymentIntent.amount;
    let taxAmount = 0;

    if (paymentIntent.orderId) {
      const orderQuery = `
        SELECT o.subtotal, o.tax_amount, 
               json_agg(
                 json_build_object(
                   'name', mi.name,
                   'quantity', oi.quantity,
                   'unitPrice', oi.unit_price,
                   'totalPrice', oi.total_price
                 )
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE o.id = $1
        GROUP BY o.id, o.subtotal, o.tax_amount
      `;

      const orderResult = await client.query(orderQuery, [paymentIntent.orderId]);
      if (orderResult.rows.length > 0) {
        const orderData = orderResult.rows[0];
        items = orderData.items || [];
        subtotal = orderData.subtotal;
        taxAmount = orderData.tax_amount;
      }
    }

    // Get location ID
    const locationQuery = `
      SELECT t.location_id 
      FROM table_sessions ts
      JOIN tables t ON ts.table_id = t.id
      WHERE ts.id = $1
    `;
    const locationResult = await client.query(locationQuery, [paymentIntent.sessionId]);
    const locationId = locationResult.rows[0]?.location_id;

    if (locationId) {
      const receiptQuery = `
        INSERT INTO receipts (
          payment_intent_id, session_id, location_id, receipt_number, items,
          subtotal, tax_amount, total_amount, payment_method
        )
        VALUES ($1, $2, $3, generate_receipt_number(), $4, $5, $6, $7, $8)
      `;

      await client.query(receiptQuery, [
        paymentIntent.id,
        paymentIntent.sessionId,
        locationId,
        JSON.stringify(items),
        subtotal,
        taxAmount,
        paymentIntent.amount,
        paymentIntent.providerId
      ]);
    }
  }
}

export const paymentService = new PaymentService();