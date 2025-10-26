import { Pool } from 'pg';
import { getPool } from '../config/database';
import { notificationService } from './notificationService';

export interface BillRequest {
  id: string;
  sessionId: string;
  participantId?: string;
  requestType: 'individual' | 'group' | 'split';
  totalAmount: number;
  status: 'pending' | 'acknowledged' | 'preparing' | 'ready' | 'delivered' | 'paid';
  paymentMethod: 'cash' | 'card' | 'mixed';
  notes?: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  deliveredAt?: Date;
  paidAt?: Date;
}

export interface CreateBillRequestData {
  sessionId: string;
  participantId?: string;
  requestType: 'individual' | 'group' | 'split';
  paymentMethod?: 'cash' | 'card' | 'mixed';
  notes?: string;
}

export interface POSIntegration {
  id: string;
  locationId: string;
  posSystem: 'square' | 'toast' | 'lightspeed' | 'generic';
  config: POSConfig;
  isActive: boolean;
}

export interface POSConfig {
  apiEndpoint?: string;
  apiKey?: string;
  terminalId?: string;
  merchantId?: string;
  environment: 'sandbox' | 'production';
}

export interface DigitalReceipt {
  id: string;
  billRequestId: string;
  receiptData: ReceiptData;
  deliveryMethod: 'email' | 'sms' | 'app';
  deliveryAddress: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
}

export interface ReceiptData {
  receiptNumber: string;
  locationName: string;
  locationAddress: string;
  tableNumber: string;
  serverName?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  tipAmount?: number;
  totalAmount: number;
  paymentMethod: string;
  transactionDate: Date;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: string[];
  notes?: string;
}

export class TraditionalPaymentService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createBillRequest(data: CreateBillRequestData): Promise<BillRequest> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Calculate total amount from orders
      const totalAmount = await this.calculateSessionTotal(data.sessionId, data.participantId);

      // Create bill request
      const billQuery = `
        INSERT INTO bill_requests (session_id, participant_id, request_type, total_amount, payment_method, notes, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id, session_id as "sessionId", participant_id as "participantId", 
                  request_type as "requestType", total_amount as "totalAmount", 
                  payment_method as "paymentMethod", notes, status, created_at as "createdAt"
      `;

      const billResult = await client.query(billQuery, [
        data.sessionId,
        data.participantId || null,
        data.requestType,
        totalAmount,
        data.paymentMethod || 'cash',
        data.notes || null
      ]);

      const billRequest = billResult.rows[0];

      // Notify waiters about bill request
      await this.notifyWaitersAboutBillRequest(billRequest);

      await client.query('COMMIT');
      return billRequest;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async acknowledgeBillRequest(billRequestId: string, waiterId: string): Promise<BillRequest> {
    const updateQuery = `
      UPDATE bill_requests 
      SET status = 'acknowledged', acknowledged_at = NOW(), waiter_id = $1
      WHERE id = $2 AND status = 'pending'
      RETURNING id, session_id as "sessionId", participant_id as "participantId",
                request_type as "requestType", total_amount as "totalAmount",
                payment_method as "paymentMethod", notes, status, created_at as "createdAt",
                acknowledged_at as "acknowledgedAt"
    `;

    const result = await this.pool.query(updateQuery, [waiterId, billRequestId]);
    
    if (result.rows.length === 0) {
      throw new Error('Bill request not found or already acknowledged');
    }

    const billRequest = result.rows[0];

    // Notify customer that bill is being prepared
    await this.notifyCustomerAboutBillStatus(billRequest, 'acknowledged');

    return billRequest;
  }

  async markBillReady(billRequestId: string, waiterId: string): Promise<BillRequest> {
    const updateQuery = `
      UPDATE bill_requests 
      SET status = 'ready'
      WHERE id = $1 AND waiter_id = $2 AND status IN ('acknowledged', 'preparing')
      RETURNING id, session_id as "sessionId", participant_id as "participantId",
                request_type as "requestType", total_amount as "totalAmount",
                payment_method as "paymentMethod", notes, status, created_at as "createdAt",
                acknowledged_at as "acknowledgedAt"
    `;

    const result = await this.pool.query(updateQuery, [billRequestId, waiterId]);
    
    if (result.rows.length === 0) {
      throw new Error('Bill request not found or not assigned to this waiter');
    }

    const billRequest = result.rows[0];

    // Notify customer that bill is ready
    await this.notifyCustomerAboutBillStatus(billRequest, 'ready');

    return billRequest;
  }

  async deliverBill(billRequestId: string, waiterId: string): Promise<BillRequest> {
    const updateQuery = `
      UPDATE bill_requests 
      SET status = 'delivered', delivered_at = NOW()
      WHERE id = $1 AND waiter_id = $2 AND status = 'ready'
      RETURNING id, session_id as "sessionId", participant_id as "participantId",
                request_type as "requestType", total_amount as "totalAmount",
                payment_method as "paymentMethod", notes, status, created_at as "createdAt",
                acknowledged_at as "acknowledgedAt", delivered_at as "deliveredAt"
    `;

    const result = await this.pool.query(updateQuery, [billRequestId, waiterId]);
    
    if (result.rows.length === 0) {
      throw new Error('Bill request not found or not ready for delivery');
    }

    return result.rows[0];
  }

  async markBillPaid(billRequestId: string, waiterId: string, actualPaymentMethod: string, tipAmount?: number): Promise<BillRequest> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE bill_requests 
        SET status = 'paid', paid_at = NOW(), actual_payment_method = $1, tip_amount = $2
        WHERE id = $3 AND waiter_id = $4 AND status = 'delivered'
        RETURNING id, session_id as "sessionId", participant_id as "participantId",
                  request_type as "requestType", total_amount as "totalAmount",
                  payment_method as "paymentMethod", notes, status, created_at as "createdAt",
                  acknowledged_at as "acknowledgedAt", delivered_at as "deliveredAt", paid_at as "paidAt"
      `;

      const result = await client.query(updateQuery, [actualPaymentMethod, tipAmount || 0, billRequestId, waiterId]);
      
      if (result.rows.length === 0) {
        throw new Error('Bill request not found or not delivered yet');
      }

      const billRequest = result.rows[0];

      // Generate digital receipt
      await this.generateDigitalReceipt(client, billRequest);

      await client.query('COMMIT');
      return billRequest;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getBillRequestsForLocation(locationId: string, status?: string): Promise<BillRequest[]> {
    let query = `
      SELECT br.id, br.session_id as "sessionId", br.participant_id as "participantId",
             br.request_type as "requestType", br.total_amount as "totalAmount",
             br.payment_method as "paymentMethod", br.notes, br.status,
             br.created_at as "createdAt", br.acknowledged_at as "acknowledgedAt",
             br.delivered_at as "deliveredAt", br.paid_at as "paidAt",
             t.number as "tableNumber", sp.fantasy_name as "customerName",
             u.name as "waiterName"
      FROM bill_requests br
      JOIN table_sessions ts ON br.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN session_participants sp ON br.participant_id = sp.id
      LEFT JOIN users u ON br.waiter_id = u.id
      WHERE t.location_id = $1
    `;

    const params = [locationId];

    if (status) {
      query += ` AND br.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY br.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async sendDigitalReceipt(billRequestId: string, deliveryMethod: 'email' | 'sms', deliveryAddress: string): Promise<DigitalReceipt> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get bill request details
      const billQuery = `
        SELECT br.*, t.number as table_number, l.name as location_name, l.address as location_address
        FROM bill_requests br
        JOIN table_sessions ts ON br.session_id = ts.id
        JOIN tables t ON ts.table_id = t.id
        JOIN locations l ON t.location_id = l.id
        WHERE br.id = $1
      `;

      const billResult = await client.query(billQuery, [billRequestId]);
      
      if (billResult.rows.length === 0) {
        throw new Error('Bill request not found');
      }

      const bill = billResult.rows[0];

      // Generate receipt data
      const receiptData = await this.generateReceiptData(bill);

      // Create digital receipt record
      const receiptQuery = `
        INSERT INTO digital_receipts (bill_request_id, receipt_data, delivery_method, delivery_address, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id, bill_request_id as "billRequestId", receipt_data as "receiptData",
                  delivery_method as "deliveryMethod", delivery_address as "deliveryAddress",
                  status, created_at as "createdAt"
      `;

      const receiptResult = await client.query(receiptQuery, [
        billRequestId,
        JSON.stringify(receiptData),
        deliveryMethod,
        deliveryAddress
      ]);

      const digitalReceipt = receiptResult.rows[0];

      // Send receipt (simulate)
      await this.sendReceiptViaMethod(digitalReceipt, receiptData);

      // Update status to sent
      await client.query(
        'UPDATE digital_receipts SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', digitalReceipt.id]
      );

      await client.query('COMMIT');

      return {
        ...digitalReceipt,
        receiptData,
        sentAt: new Date()
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Private helper methods
  private async calculateSessionTotal(sessionId: string, participantId?: string): Promise<number> {
    let query = `
      SELECT SUM(total_amount) as total
      FROM orders
      WHERE session_id = $1 AND status NOT IN ('cancelled')
    `;

    const params = [sessionId];

    if (participantId) {
      query += ` AND participant_id = $2`;
      params.push(participantId);
    }

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0]?.total || '0');
  }

  private async notifyWaitersAboutBillRequest(billRequest: BillRequest): Promise<void> {
    // Get location ID
    const locationQuery = `
      SELECT t.location_id 
      FROM table_sessions ts
      JOIN tables t ON ts.table_id = t.id
      WHERE ts.id = $1
    `;

    const locationResult = await this.pool.query(locationQuery, [billRequest.sessionId]);
    const locationId = locationResult.rows[0]?.location_id;

    if (locationId && notificationService) {
      // Create waiter call for bill request
      await notificationService.createWaiterCall({
        sessionId: billRequest.sessionId,
        participantId: billRequest.participantId || 'system',
        callType: 'bill',
        priority: 'medium',
        message: `Bill requested for ${billRequest.requestType} payment (€${billRequest.totalAmount})`
      });
    }
  }

  private async notifyCustomerAboutBillStatus(billRequest: BillRequest, status: string): Promise<void> {
    // This would send a notification to the customer about bill status
    // Implementation depends on notification service setup
  }

  private async generateDigitalReceipt(client: any, billRequest: BillRequest): Promise<void> {
    // Generate receipt data and store it
    const receiptData = await this.generateReceiptData(billRequest);

    const receiptQuery = `
      INSERT INTO digital_receipts (bill_request_id, receipt_data, delivery_method, delivery_address, status)
      VALUES ($1, $2, 'app', 'in-app', 'delivered')
    `;

    await client.query(receiptQuery, [billRequest.id, JSON.stringify(receiptData)]);
  }

  private async generateReceiptData(bill: any): Promise<ReceiptData> {
    // Get order items for the bill
    const itemsQuery = `
      SELECT mi.name, oi.quantity, oi.unit_price, oi.total_price, oi.notes
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.session_id = $1
      ${bill.participant_id ? 'AND o.participant_id = $2' : ''}
      ORDER BY o.created_at, oi.created_at
    `;

    const itemsParams = bill.participant_id ? [bill.session_id, bill.participant_id] : [bill.session_id];
    const itemsResult = await this.pool.query(itemsQuery, itemsParams);

    const items: ReceiptItem[] = itemsResult.rows.map(row => ({
      name: row.name,
      quantity: row.quantity,
      unitPrice: parseFloat(row.unit_price),
      totalPrice: parseFloat(row.total_price),
      notes: row.notes
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + taxAmount + (bill.tip_amount || 0);

    return {
      receiptNumber: `BILL-${bill.id.substring(0, 8).toUpperCase()}`,
      locationName: bill.location_name || 'Restaurant',
      locationAddress: bill.location_address || '',
      tableNumber: bill.table_number || 'Unknown',
      items,
      subtotal,
      taxAmount,
      tipAmount: bill.tip_amount || 0,
      totalAmount,
      paymentMethod: bill.actual_payment_method || bill.payment_method,
      transactionDate: bill.paid_at || new Date()
    };
  }

  private async sendReceiptViaMethod(digitalReceipt: DigitalReceipt, receiptData: ReceiptData): Promise<void> {
    // Simulate sending receipt via email/SMS
    // In real implementation, this would integrate with email/SMS services
    console.log(`Sending receipt via ${digitalReceipt.deliveryMethod} to ${digitalReceipt.deliveryAddress}`);
  }
}

export const traditionalPaymentService = new TraditionalPaymentService();