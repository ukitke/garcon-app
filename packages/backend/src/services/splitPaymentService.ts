import { Pool } from 'pg';
import { getPool } from '../config/database';
import { paymentService } from './paymentService';
import { notificationService } from './notificationService';

export interface SplitPaymentSession {
  id: string;
  sessionId: string;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'partial' | 'completed' | 'cancelled';
  splits: SplitContribution[];
  createdAt: Date;
  completedAt?: Date;
}

export interface SplitContribution {
  id: string;
  splitSessionId: string;
  participantId: string;
  participantName: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paymentIntentId?: string;
  paidAt?: Date;
  paymentMethod?: string;
}

export interface CreateSplitSessionRequest {
  sessionId: string;
  totalAmount: number;
  currency?: string;
  splitType: 'equal' | 'custom' | 'by_order';
  customSplits?: CustomSplitAmount[];
  includeParticipants?: string[]; // If not provided, includes all session participants
}

export interface CustomSplitAmount {
  participantId: string;
  amount: number;
}

export interface PaySplitRequest {
  splitSessionId: string;
  participantId: string;
  paymentMethodId: string;
  amount?: number; // For partial payments
}

export interface TipSplitRequest {
  splitSessionId: string;
  tipAmount: number;
  tipDistribution: 'equal' | 'proportional' | 'custom';
  customTipSplits?: CustomSplitAmount[];
}

export interface GroupBillSummary {
  sessionId: string;
  tableNumber: string;
  participants: ParticipantBillSummary[];
  orders: OrderBillSummary[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  splitSessions: SplitPaymentSession[];
}

export interface ParticipantBillSummary {
  participantId: string;
  fantasyName: string;
  orders: OrderBillSummary[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export interface OrderBillSummary {
  orderId: string;
  participantId: string;
  items: OrderItemSummary[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  paidAmount: number;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: string[];
}

export class SplitPaymentService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createSplitSession(request: CreateSplitSessionRequest): Promise<SplitPaymentSession> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get session participants
      const participantsQuery = `
        SELECT sp.id, sp.fantasy_name as "fantasyName"
        FROM session_participants sp
        WHERE sp.session_id = $1
        ${request.includeParticipants ? 'AND sp.id = ANY($2)' : ''}
        ORDER BY sp.joined_at ASC
      `;

      const participantsParams = request.includeParticipants ? 
        [request.sessionId, request.includeParticipants] : 
        [request.sessionId];

      const participantsResult = await client.query(participantsQuery, participantsParams);
      const participants = participantsResult.rows;

      if (participants.length === 0) {
        throw new Error('No participants found for split payment');
      }

      // Create split session
      const splitSessionQuery = `
        INSERT INTO split_payment_sessions (session_id, total_amount, currency, split_type, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id, session_id as "sessionId", total_amount as "totalAmount", 
                  currency, status, created_at as "createdAt"
      `;

      const splitSessionResult = await client.query(splitSessionQuery, [
        request.sessionId,
        request.totalAmount,
        request.currency || 'EUR',
        request.splitType
      ]);

      const splitSession = splitSessionResult.rows[0];

      // Calculate split amounts
      const splits = this.calculateSplitAmounts(
        participants,
        request.totalAmount,
        request.splitType,
        request.customSplits
      );

      // Create split contributions
      const splitContributions: SplitContribution[] = [];
      for (const split of splits) {
        const contributionQuery = `
          INSERT INTO split_contributions (split_session_id, participant_id, participant_name, amount, status)
          VALUES ($1, $2, $3, $4, 'pending')
          RETURNING id, split_session_id as "splitSessionId", participant_id as "participantId",
                    participant_name as "participantName", amount, status, created_at as "createdAt"
        `;

        const contributionResult = await client.query(contributionQuery, [
          splitSession.id,
          split.participantId,
          split.participantName,
          split.amount
        ]);

        splitContributions.push(contributionResult.rows[0]);
      }

      await client.query('COMMIT');

      // Send notifications to participants
      await this.notifyParticipantsAboutSplit(splitSession.id, splitContributions);

      return {
        ...splitSession,
        splits: splitContributions
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async paySplit(request: PaySplitRequest): Promise<SplitContribution> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get split contribution details
      const contributionQuery = `
        SELECT sc.*, sps.session_id, sps.currency
        FROM split_contributions sc
        JOIN split_payment_sessions sps ON sc.split_session_id = sps.id
        WHERE sc.split_session_id = $1 AND sc.participant_id = $2 AND sc.status = 'pending'
      `;

      const contributionResult = await client.query(contributionQuery, [
        request.splitSessionId,
        request.participantId
      ]);

      if (contributionResult.rows.length === 0) {
        throw new Error('Split contribution not found or already paid');
      }

      const contribution = contributionResult.rows[0];
      const paymentAmount = request.amount || contribution.amount;

      // Create payment intent
      const paymentIntentRequest = {
        sessionId: contribution.session_id,
        participantId: request.participantId,
        amount: paymentAmount,
        currency: contribution.currency,
        paymentMethodId: request.paymentMethodId,
        metadata: {
          splitPayment: true,
          splitSessionId: request.splitSessionId,
          contributionId: contribution.id
        }
      };

      const paymentIntentResponse = await paymentService.createPaymentIntent(paymentIntentRequest);

      // Update contribution with payment intent
      const updateQuery = `
        UPDATE split_contributions 
        SET payment_intent_id = $1, status = 'processing'
        WHERE id = $2
        RETURNING id, split_session_id as "splitSessionId", participant_id as "participantId",
                  participant_name as "participantName", amount, status, payment_intent_id as "paymentIntentId",
                  paid_at as "paidAt", payment_method as "paymentMethod"
      `;

      const updateResult = await client.query(updateQuery, [
        paymentIntentResponse.paymentIntent.id,
        contribution.id
      ]);

      await client.query('COMMIT');

      return updateResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmSplitPayment(paymentIntentId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Find the split contribution
      const contributionQuery = `
        SELECT sc.*, sps.id as split_session_id
        FROM split_contributions sc
        JOIN split_payment_sessions sps ON sc.split_session_id = sps.id
        WHERE sc.payment_intent_id = $1
      `;

      const contributionResult = await client.query(contributionQuery, [paymentIntentId]);

      if (contributionResult.rows.length === 0) {
        throw new Error('Split contribution not found for payment intent');
      }

      const contribution = contributionResult.rows[0];

      // Update contribution status
      const updateQuery = `
        UPDATE split_contributions 
        SET status = 'paid', paid_at = NOW(), payment_method = $1
        WHERE id = $2
      `;

      await client.query(updateQuery, ['card', contribution.id]); // TODO: Get actual payment method

      // Check if all contributions are paid
      const allPaidQuery = `
        SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid
        FROM split_contributions
        WHERE split_session_id = $1
      `;

      const allPaidResult = await client.query(allPaidQuery, [contribution.split_session_id]);
      const { total, paid } = allPaidResult.rows[0];

      // Update split session status
      let sessionStatus = 'partial';
      if (parseInt(paid) === parseInt(total)) {
        sessionStatus = 'completed';
      }

      const updateSessionQuery = `
        UPDATE split_payment_sessions 
        SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END
        WHERE id = $2
      `;

      await client.query(updateSessionQuery, [sessionStatus, contribution.split_session_id]);

      await client.query('COMMIT');

      // Notify other participants about payment progress
      await this.notifyPaymentProgress(contribution.split_session_id, contribution.participant_name);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addTipToSplit(request: TipSplitRequest): Promise<SplitPaymentSession> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current split session
      const sessionQuery = `
        SELECT * FROM split_payment_sessions WHERE id = $1
      `;
      const sessionResult = await client.query(sessionQuery, [request.splitSessionId]);

      if (sessionResult.rows.length === 0) {
        throw new Error('Split session not found');
      }

      const session = sessionResult.rows[0];

      // Get current contributions
      const contributionsQuery = `
        SELECT * FROM split_contributions WHERE split_session_id = $1
      `;
      const contributionsResult = await client.query(contributionsQuery, [request.splitSessionId]);
      const contributions = contributionsResult.rows;

      // Calculate tip distribution
      const tipSplits = this.calculateTipSplits(
        contributions,
        request.tipAmount,
        request.tipDistribution,
        request.customTipSplits
      );

      // Update contributions with tip amounts
      for (const tipSplit of tipSplits) {
        const updateQuery = `
          UPDATE split_contributions 
          SET amount = amount + $1, tip_amount = $1
          WHERE participant_id = $2 AND split_session_id = $3
        `;

        await client.query(updateQuery, [
          tipSplit.amount,
          tipSplit.participantId,
          request.splitSessionId
        ]);
      }

      // Update session total
      const updateSessionQuery = `
        UPDATE split_payment_sessions 
        SET total_amount = total_amount + $1, tip_amount = $1
        WHERE id = $2
      `;

      await client.query(updateSessionQuery, [request.tipAmount, request.splitSessionId]);

      await client.query('COMMIT');

      // Get updated session
      return await this.getSplitSession(request.splitSessionId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSplitSession(splitSessionId: string): Promise<SplitPaymentSession> {
    const sessionQuery = `
      SELECT sps.id, sps.session_id as "sessionId", sps.total_amount as "totalAmount",
             sps.currency, sps.status, sps.created_at as "createdAt", sps.completed_at as "completedAt"
      FROM split_payment_sessions sps
      WHERE sps.id = $1
    `;

    const sessionResult = await this.pool.query(sessionQuery, [splitSessionId]);

    if (sessionResult.rows.length === 0) {
      throw new Error('Split session not found');
    }

    const session = sessionResult.rows[0];

    // Get contributions
    const contributionsQuery = `
      SELECT id, split_session_id as "splitSessionId", participant_id as "participantId",
             participant_name as "participantName", amount, status, payment_intent_id as "paymentIntentId",
             paid_at as "paidAt", payment_method as "paymentMethod"
      FROM split_contributions
      WHERE split_session_id = $1
      ORDER BY participant_name ASC
    `;

    const contributionsResult = await this.pool.query(contributionsQuery, [splitSessionId]);

    return {
      ...session,
      splits: contributionsResult.rows
    };
  }

  async getGroupBillSummary(sessionId: string): Promise<GroupBillSummary> {
    // Get table information
    const tableQuery = `
      SELECT t.number as table_number
      FROM table_sessions ts
      JOIN tables t ON ts.table_id = t.id
      WHERE ts.id = $1
    `;
    const tableResult = await this.pool.query(tableQuery, [sessionId]);
    const tableNumber = tableResult.rows[0]?.table_number || 'Unknown';

    // Get participants
    const participantsQuery = `
      SELECT sp.id, sp.fantasy_name as "fantasyName"
      FROM session_participants sp
      WHERE sp.session_id = $1
      ORDER BY sp.joined_at ASC
    `;
    const participantsResult = await this.pool.query(participantsQuery, [sessionId]);
    const participants = participantsResult.rows;

    // Get all orders for the session
    const ordersQuery = `
      SELECT o.id, o.participant_id as "participantId", o.subtotal, o.tax_amount as "taxAmount",
             o.total_amount as "totalAmount", o.status,
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
      WHERE o.session_id = $1
      GROUP BY o.id, o.participant_id, o.subtotal, o.tax_amount, o.total_amount, o.status
      ORDER BY o.created_at ASC
    `;
    const ordersResult = await this.pool.query(ordersQuery, [sessionId]);
    const orders = ordersResult.rows;

    // Get payment information
    const paymentsQuery = `
      SELECT pi.order_id, pi.participant_id, pi.amount, pi.status
      FROM payment_intents pi
      WHERE pi.session_id = $1 AND pi.status = 'succeeded'
    `;
    const paymentsResult = await this.pool.query(paymentsQuery, [sessionId]);
    const payments = paymentsResult.rows;

    // Get split sessions
    const splitSessionsQuery = `
      SELECT id FROM split_payment_sessions WHERE session_id = $1
    `;
    const splitSessionsResult = await this.pool.query(splitSessionsQuery, [sessionId]);
    const splitSessions = await Promise.all(
      splitSessionsResult.rows.map(row => this.getSplitSession(row.id))
    );

    // Calculate participant summaries
    const participantSummaries: ParticipantBillSummary[] = participants.map(participant => {
      const participantOrders = orders.filter(order => order.participantId === participant.id);
      const participantPayments = payments.filter(payment => payment.participant_id === participant.id);
      
      const totalAmount = participantOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
      const paidAmount = participantPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

      return {
        participantId: participant.id,
        fantasyName: participant.fantasyName,
        orders: participantOrders.map(order => ({
          orderId: order.id,
          participantId: order.participantId,
          items: order.items || [],
          subtotal: parseFloat(order.subtotal),
          taxAmount: parseFloat(order.taxAmount),
          totalAmount: parseFloat(order.totalAmount),
          status: order.status,
          paidAmount: participantPayments
            .filter(p => p.order_id === order.id)
            .reduce((sum, p) => sum + parseFloat(p.amount), 0)
        })),
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount
      };
    });

    const totalAmount = participantSummaries.reduce((sum, p) => sum + p.totalAmount, 0);
    const paidAmount = participantSummaries.reduce((sum, p) => sum + p.paidAmount, 0);

    return {
      sessionId,
      tableNumber,
      participants: participantSummaries,
      orders: orders.map(order => ({
        orderId: order.id,
        participantId: order.participantId,
        items: order.items || [],
        subtotal: parseFloat(order.subtotal),
        taxAmount: parseFloat(order.taxAmount),
        totalAmount: parseFloat(order.totalAmount),
        status: order.status,
        paidAmount: payments
          .filter(p => p.order_id === order.id)
          .reduce((sum, p) => sum + parseFloat(p.amount), 0)
      })),
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount - paidAmount,
      splitSessions
    };
  }

  // Private helper methods
  private calculateSplitAmounts(
    participants: any[],
    totalAmount: number,
    splitType: string,
    customSplits?: CustomSplitAmount[]
  ): Array<{ participantId: string; participantName: string; amount: number }> {
    switch (splitType) {
      case 'equal':
        const equalAmount = Math.round((totalAmount / participants.length) * 100) / 100;
        return participants.map(p => ({
          participantId: p.id,
          participantName: p.fantasyName,
          amount: equalAmount
        }));

      case 'custom':
        if (!customSplits) {
          throw new Error('Custom splits required for custom split type');
        }
        return customSplits.map(split => {
          const participant = participants.find(p => p.id === split.participantId);
          return {
            participantId: split.participantId,
            participantName: participant?.fantasyName || 'Unknown',
            amount: split.amount
          };
        });

      case 'by_order':
        // This would require order information - simplified for now
        return this.calculateSplitAmounts(participants, totalAmount, 'equal');

      default:
        throw new Error('Invalid split type');
    }
  }

  private calculateTipSplits(
    contributions: any[],
    tipAmount: number,
    distribution: string,
    customTipSplits?: CustomSplitAmount[]
  ): CustomSplitAmount[] {
    switch (distribution) {
      case 'equal':
        const equalTip = Math.round((tipAmount / contributions.length) * 100) / 100;
        return contributions.map(c => ({
          participantId: c.participant_id,
          amount: equalTip
        }));

      case 'proportional':
        const totalAmount = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
        return contributions.map(c => ({
          participantId: c.participant_id,
          amount: Math.round((tipAmount * (parseFloat(c.amount) / totalAmount)) * 100) / 100
        }));

      case 'custom':
        return customTipSplits || [];

      default:
        throw new Error('Invalid tip distribution type');
    }
  }

  private async notifyParticipantsAboutSplit(splitSessionId: string, contributions: SplitContribution[]): Promise<void> {
    // Send notifications to all participants about the split payment request
    for (const contribution of contributions) {
      if (notificationService) {
        // This would send a notification to the participant
        // Implementation depends on notification service setup
      }
    }
  }

  private async notifyPaymentProgress(splitSessionId: string, paidParticipantName: string): Promise<void> {
    // Notify other participants about payment progress
    if (notificationService) {
      // Implementation depends on notification service setup
    }
  }
}

export const splitPaymentService = new SplitPaymentService();