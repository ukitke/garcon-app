import { Request, Response } from 'express';
import { paymentService } from '../services/paymentService';
import { splitPaymentService } from '../services/splitPaymentService';
import { 
  CreatePaymentIntentRequest,
  ConfirmPaymentRequest,
  RefundRequest,
  SplitPaymentRequest,
  TreatSomeoneRequest
} from '../types/payment';

export class PaymentController {
  async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const request: CreatePaymentIntentRequest = req.body;

      const response = await paymentService.createPaymentIntent(request);
      
      res.status(201).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment intent'
      });
    }
  }

  async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const request: ConfirmPaymentRequest = req.body;

      const paymentIntent = await paymentService.confirmPayment(request);
      
      res.json({
        success: true,
        data: paymentIntent
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment'
      });
    }
  }

  async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentIntentId } = req.params;
      const { amount, reason } = req.body;

      const request: RefundRequest = {
        paymentIntentId,
        amount,
        reason
      };

      const refund = await paymentService.refundPayment(request);
      
      res.json({
        success: true,
        data: refund
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund'
      });
    }
  }

  async createSplitPayment(req: Request, res: Response): Promise<void> {
    try {
      const request: SplitPaymentRequest = req.body;

      const splitPayment = await paymentService.createSplitPayment(request);
      
      res.status(201).json({
        success: true,
        data: splitPayment
      });
    } catch (error) {
      console.error('Error creating split payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create split payment'
      });
    }
  }

  async treatSomeone(req: Request, res: Response): Promise<void> {
    try {
      const request: TreatSomeoneRequest = req.body;

      const paymentIntent = await paymentService.processTreatSomeone(request);
      
      res.status(201).json({
        success: true,
        data: paymentIntent
      });
    } catch (error) {
      console.error('Error processing treat someone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process treat someone payment'
      });
    }
  }

  async getPaymentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const analytics = await paymentService.getPaymentAnalytics(
        locationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment analytics'
      });
    }
  }

  // Split payment endpoints
  async createSplitSession(req: Request, res: Response): Promise<void> {
    try {
      const splitSession = await splitPaymentService.createSplitSession(req.body);
      
      res.status(201).json({
        success: true,
        data: splitSession
      });
    } catch (error) {
      console.error('Error creating split session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create split session'
      });
    }
  }

  async paySplit(req: Request, res: Response): Promise<void> {
    try {
      const contribution = await splitPaymentService.paySplit(req.body);
      
      res.json({
        success: true,
        data: contribution
      });
    } catch (error) {
      console.error('Error paying split:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pay split'
      });
    }
  }

  async getSplitSession(req: Request, res: Response): Promise<void> {
    try {
      const { splitSessionId } = req.params;

      const splitSession = await splitPaymentService.getSplitSession(splitSessionId);
      
      res.json({
        success: true,
        data: splitSession
      });
    } catch (error) {
      console.error('Error fetching split session:', error);
      res.status(404).json({
        success: false,
        error: 'Split session not found'
      });
    }
  }

  async addTipToSplit(req: Request, res: Response): Promise<void> {
    try {
      const { splitSessionId } = req.params;
      const { tipAmount, tipDistribution, customTipSplits } = req.body;

      const splitSession = await splitPaymentService.addTipToSplit({
        splitSessionId,
        tipAmount,
        tipDistribution,
        customTipSplits
      });
      
      res.json({
        success: true,
        data: splitSession
      });
    } catch (error) {
      console.error('Error adding tip to split:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add tip to split'
      });
    }
  }

  async getGroupBill(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const groupBill = await splitPaymentService.getGroupBillSummary(sessionId);
      
      res.json({
        success: true,
        data: groupBill
      });
    } catch (error) {
      console.error('Error fetching group bill:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch group bill'
      });
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const signature = req.headers['stripe-signature'] || req.headers['paypal-auth-algo'] || '';
      
      // This would be handled by the specific payment provider
      // For now, just acknowledge the webhook
      
      res.status(200).json({
        success: true,
        message: 'Webhook received'
      });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to process webhook'
      });
    }
  }

  async getPaymentMethods(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const query = `
        SELECT id, type, provider, details, is_default as "isDefault", created_at as "createdAt"
        FROM payment_methods
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC
      `;

      const result = await paymentService['pool'].query(query, [userId]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment methods'
      });
    }
  }

  async addPaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { type, provider, providerPaymentMethodId, details, isDefault } = req.body;

      const query = `
        INSERT INTO payment_methods (user_id, type, provider, provider_payment_method_id, details, is_default)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, type, provider, details, is_default as "isDefault", created_at as "createdAt"
      `;

      const result = await paymentService['pool'].query(query, [
        userId,
        type,
        provider,
        providerPaymentMethodId,
        JSON.stringify(details),
        isDefault || false
      ]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add payment method'
      });
    }
  }

  async deletePaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const { paymentMethodId } = req.params;

      const query = `
        DELETE FROM payment_methods
        WHERE id = $1
        RETURNING id
      `;

      const result = await paymentService['pool'].query(query, [paymentMethodId]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Payment method not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Payment method deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete payment method'
      });
    }
  }
}

export const paymentController = new PaymentController();