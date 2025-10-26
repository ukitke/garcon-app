import { PaymentProviderInterface } from '../paymentService';

export class PayPalPaymentProvider implements PaymentProviderInterface {
  private clientId: string;
  private clientSecret: string;
  private environment: 'sandbox' | 'production';

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || 'paypal_client_id_placeholder';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'paypal_client_secret_placeholder';
    this.environment = (process.env.NODE_ENV === 'production') ? 'production' : 'sandbox';
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<any> {
    // Simulate PayPal order creation
    await this.delay(150);

    const order = {
      id: `PAYPAL_${this.generateId()}`,
      status: 'CREATED',
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: amount.toFixed(2)
        },
        description: metadata?.description || 'Restaurant order payment'
      }],
      links: [
        {
          href: `https://api.${this.environment}.paypal.com/v2/checkout/orders/PAYPAL_${this.generateId()}`,
          rel: 'self',
          method: 'GET'
        },
        {
          href: `https://www.${this.environment}.paypal.com/checkoutnow?token=PAYPAL_${this.generateId()}`,
          rel: 'approve',
          method: 'GET'
        }
      ],
      metadata: metadata || {}
    };

    return order;
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<any> {
    // Simulate PayPal order capture
    await this.delay(200);

    const isSuccess = !paymentMethodId.includes('fail');

    if (isSuccess) {
      return {
        id: paymentIntentId,
        status: 'COMPLETED',
        transaction_id: `TXN_${this.generateId()}`,
        purchase_units: [{
          payments: {
            captures: [{
              id: `CAPTURE_${this.generateId()}`,
              status: 'COMPLETED',
              amount: {
                currency_code: 'EUR',
                value: '29.99'
              }
            }]
          }
        }],
        payer: {
          email_address: 'customer@example.com',
          payer_id: `PAYER_${this.generateId()}`
        }
      };
    } else {
      return {
        id: paymentIntentId,
        status: 'FAILED',
        error: {
          name: 'PAYMENT_DENIED',
          message: 'Payment was denied by PayPal',
          details: [{
            issue: 'PAYMENT_DENIED',
            description: 'The payment was denied by the payment processor'
          }]
        }
      };
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number, reason?: string): Promise<any> {
    // Simulate PayPal refund
    await this.delay(180);

    return {
      id: `REFUND_${this.generateId()}`,
      status: 'COMPLETED',
      amount: {
        currency_code: 'EUR',
        value: amount?.toFixed(2) || '29.99'
      },
      note_to_payer: reason || 'Refund processed',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    };
  }

  async getPaymentStatus(paymentIntentId: string): Promise<string> {
    // Simulate PayPal status check
    await this.delay(75);

    const statuses = ['CREATED', 'APPROVED', 'COMPLETED', 'CANCELLED'];
    const paypalStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Map PayPal status to our standard status
    const statusMap: Record<string, string> = {
      'CREATED': 'requires_payment_method',
      'APPROVED': 'requires_confirmation',
      'COMPLETED': 'succeeded',
      'CANCELLED': 'cancelled'
    };

    return statusMap[paypalStatus] || 'pending';
  }

  async handleWebhook(payload: any, signature: string): Promise<any> {
    // Simulate PayPal webhook processing
    const event = {
      id: payload.id || `WH_${this.generateId()}`,
      event_type: payload.event_type || 'PAYMENT.CAPTURE.COMPLETED',
      resource: payload.resource || {},
      create_time: payload.create_time || new Date().toISOString()
    };

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        return this.handlePaymentCompleted(event.resource);
      case 'PAYMENT.CAPTURE.DENIED':
        return this.handlePaymentDenied(event.resource);
      case 'CUSTOMER.DISPUTE.CREATED':
        return this.handleDisputeCreated(event.resource);
      default:
        return { processed: false, message: 'Unhandled event type' };
    }
  }

  private async handlePaymentCompleted(resource: any): Promise<any> {
    return {
      processed: true,
      action: 'payment_confirmed',
      paymentIntentId: resource.id,
      captureId: resource.id
    };
  }

  private async handlePaymentDenied(resource: any): Promise<any> {
    return {
      processed: true,
      action: 'payment_failed',
      paymentIntentId: resource.id,
      reason: resource.reason_code
    };
  }

  private async handleDisputeCreated(resource: any): Promise<any> {
    return {
      processed: true,
      action: 'dispute_created',
      disputeId: resource.dispute_id,
      amount: resource.disputed_transactions[0]?.seller_transaction_id
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // PayPal-specific methods
  async createBillingAgreement(planId: string): Promise<any> {
    await this.delay(120);
    
    return {
      id: `BA_${this.generateId()}`,
      state: 'Active',
      plan: {
        id: planId
      },
      payer: {
        payment_method: 'paypal'
      }
    };
  }

  async getAccessToken(): Promise<string> {
    // Simulate OAuth token request
    await this.delay(100);
    return `ACCESS_TOKEN_${this.generateId()}`;
  }
}

export default PayPalPaymentProvider;