import { Pool } from 'pg';
import { 
  TableSession, 
  SessionParticipant, 
  CheckinRequest, 
  CheckinResponse 
} from '../types/location';
import { Order } from '../types/menu';
import { getPool } from '../config/database';
import { fantasyNameService } from './fantasyNameService';


export interface GroupOrderSummary {
  sessionId: string;
  tableNumber: string;
  participants: SessionParticipant[];
  orders: Order[];
  totalAmount: number;
  individualTotals: { [participantId: string]: number };
}

export interface JoinGroupRequest {
  sessionId: string;
  userId?: string;
  customFantasyName?: string;
}

export interface JoinGroupResponse {
  participantId: string;
  fantasyName: string;
  sessionInfo: {
    id: string;
    tableNumber: string;
    participantCount: number;
  };
}

export class GroupOrderingService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async joinTableSession(request: JoinGroupRequest): Promise<JoinGroupResponse> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify session exists and is active
      const sessionQuery = `
        SELECT ts.id, ts.table_id, t.number as table_number, ts.is_active
        FROM table_sessions ts
        JOIN tables t ON ts.table_id = t.id
        WHERE ts.id = $1 AND ts.is_active = true
      `;
      
      const sessionResult = await client.query(sessionQuery, [request.sessionId]);
      
      if (sessionResult.rows.length === 0) {
        throw new Error('Table session not found or not active');
      }

      const session = sessionResult.rows[0];

      // Get existing participant names to ensure uniqueness
      const existingNamesQuery = `
        SELECT fantasy_name FROM session_participants WHERE session_id = $1
      `;
      const existingNamesResult = await client.query(existingNamesQuery, [request.sessionId]);
      const existingNames = existingNamesResult.rows.map(row => row.fantasy_name);

      // Generate or validate fantasy name
      let fantasyName: string;
      if (request.customFantasyName) {
        if (!fantasyNameService.validateFantasyName(request.customFantasyName)) {
          throw new Error('Invalid fantasy name format');
        }
        if (existingNames.includes(request.customFantasyName)) {
          throw new Error('Fantasy name already taken');
        }
        fantasyName = request.customFantasyName.trim();
      } else {
        fantasyName = fantasyNameService.generateUniqueFantasyName(existingNames);
      }

      // Check if user is already in this session
      if (request.userId) {
        const existingParticipantQuery = `
          SELECT id FROM session_participants 
          WHERE session_id = $1 AND user_id = $2
        `;
        const existingParticipantResult = await client.query(existingParticipantQuery, [request.sessionId, request.userId]);
        
        if (existingParticipantResult.rows.length > 0) {
          throw new Error('User is already part of this session');
        }
      }

      // Add participant to session
      const participantQuery = `
        INSERT INTO session_participants (session_id, user_id, fantasy_name)
        VALUES ($1, $2, $3)
        RETURNING id, session_id as "sessionId", user_id as "userId", 
                  fantasy_name as "fantasyName", joined_at as "joinedAt"
      `;

      const participantValues = [request.sessionId, request.userId || null, fantasyName];
      const participantResult = await client.query(participantQuery, participantValues);
      const participant = participantResult.rows[0];

      // Get participant count
      const countQuery = `
        SELECT COUNT(*) as participant_count FROM session_participants WHERE session_id = $1
      `;
      const countResult = await client.query(countQuery, [request.sessionId]);
      const participantCount = parseInt(countResult.rows[0].participant_count);

      await client.query('COMMIT');

      return {
        participantId: participant.id,
        fantasyName: participant.fantasyName,
        sessionInfo: {
          id: request.sessionId,
          tableNumber: session.table_number,
          participantCount
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async leaveTableSession(participantId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if participant has any pending orders
      const pendingOrdersQuery = `
        SELECT COUNT(*) as pending_count 
        FROM orders 
        WHERE participant_id = $1 AND status IN ('pending', 'confirmed', 'preparing')
      `;
      const pendingOrdersResult = await client.query(pendingOrdersQuery, [participantId]);
      const pendingCount = parseInt(pendingOrdersResult.rows[0].pending_count);

      if (pendingCount > 0) {
        throw new Error('Cannot leave session with pending orders');
      }

      // Remove participant from session
      const deleteQuery = `
        DELETE FROM session_participants 
        WHERE id = $1
        RETURNING session_id
      `;
      const deleteResult = await client.query(deleteQuery, [participantId]);
      
      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const sessionId = deleteResult.rows[0].session_id;

      // Check if this was the last participant
      const remainingQuery = `
        SELECT COUNT(*) as remaining_count FROM session_participants WHERE session_id = $1
      `;
      const remainingResult = await client.query(remainingQuery, [sessionId]);
      const remainingCount = parseInt(remainingResult.rows[0].remaining_count);

      // If no participants left, end the session
      if (remainingCount === 0) {
        const endSessionQuery = `
          UPDATE table_sessions 
          SET is_active = false, end_time = NOW()
          WHERE id = $1
        `;
        await client.query(endSessionQuery, [sessionId]);
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getGroupOrderSummary(sessionId: string): Promise<GroupOrderSummary> {
    // Get session and table info
    const sessionQuery = `
      SELECT ts.id, t.number as table_number
      FROM table_sessions ts
      JOIN tables t ON ts.table_id = t.id
      WHERE ts.id = $1
    `;
    const sessionResult = await this.pool.query(sessionQuery, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionResult.rows[0];

    // Get all participants
    const participantsQuery = `
      SELECT id, session_id as "sessionId", user_id as "userId", 
             fantasy_name as "fantasyName", joined_at as "joinedAt"
      FROM session_participants
      WHERE session_id = $1
      ORDER BY joined_at ASC
    `;
    const participantsResult = await this.pool.query(participantsQuery, [sessionId]);
    const participants = participantsResult.rows;

    // Get all orders for the session
    const orderServiceInstance = new (await import('./orderService')).OrderService();
    const orders = await orderServiceInstance.getOrdersBySession(sessionId);

    // Calculate individual totals
    const individualTotals: { [participantId: string]: number } = {};
    let totalAmount = 0;

    participants.forEach(participant => {
      individualTotals[participant.id] = 0;
    });

    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        individualTotals[order.participantId] = (individualTotals[order.participantId] || 0) + order.totalAmount;
        totalAmount += order.totalAmount;
      }
    });

    return {
      sessionId,
      tableNumber: session.table_number,
      participants,
      orders,
      totalAmount,
      individualTotals
    };
  }

  async getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    const query = `
      SELECT id, session_id as "sessionId", user_id as "userId", 
             fantasy_name as "fantasyName", joined_at as "joinedAt"
      FROM session_participants
      WHERE session_id = $1
      ORDER BY joined_at ASC
    `;

    const result = await this.pool.query(query, [sessionId]);
    return result.rows;
  }

  async updateParticipantFantasyName(participantId: string, newFantasyName: string): Promise<SessionParticipant | null> {
    if (!fantasyNameService.validateFantasyName(newFantasyName)) {
      throw new Error('Invalid fantasy name format');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current participant info
      const currentQuery = `
        SELECT session_id FROM session_participants WHERE id = $1
      `;
      const currentResult = await client.query(currentQuery, [participantId]);
      
      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const sessionId = currentResult.rows[0].session_id;

      // Check if name is already taken in this session
      const existingQuery = `
        SELECT id FROM session_participants 
        WHERE session_id = $1 AND fantasy_name = $2 AND id != $3
      `;
      const existingResult = await client.query(existingQuery, [sessionId, newFantasyName.trim(), participantId]);
      
      if (existingResult.rows.length > 0) {
        throw new Error('Fantasy name already taken');
      }

      // Update the fantasy name
      const updateQuery = `
        UPDATE session_participants 
        SET fantasy_name = $1
        WHERE id = $2
        RETURNING id, session_id as "sessionId", user_id as "userId", 
                  fantasy_name as "fantasyName", joined_at as "joinedAt"
      `;

      const updateResult = await client.query(updateQuery, [newFantasyName.trim(), participantId]);
      
      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async transferOrderToParticipant(orderId: string, fromParticipantId: string, toParticipantId: string): Promise<Order | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify both participants are in the same session
      const participantsQuery = `
        SELECT sp1.session_id as from_session, sp2.session_id as to_session
        FROM session_participants sp1, session_participants sp2
        WHERE sp1.id = $1 AND sp2.id = $2
      `;
      const participantsResult = await client.query(participantsQuery, [fromParticipantId, toParticipantId]);
      
      if (participantsResult.rows.length === 0) {
        throw new Error('One or both participants not found');
      }

      const { from_session, to_session } = participantsResult.rows[0];
      if (from_session !== to_session) {
        throw new Error('Participants are not in the same session');
      }

      // Verify order belongs to the from participant and is transferable
      const orderQuery = `
        SELECT id, participant_id, status 
        FROM orders 
        WHERE id = $1 AND participant_id = $2 AND status IN ('pending', 'confirmed')
      `;
      const orderResult = await client.query(orderQuery, [orderId, fromParticipantId]);
      
      if (orderResult.rows.length === 0) {
        throw new Error('Order not found or cannot be transferred');
      }

      // Transfer the order
      const transferQuery = `
        UPDATE orders 
        SET participant_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, session_id as "sessionId", participant_id as "participantId",
                  status, notes, subtotal, tax_amount as "taxAmount", 
                  total_amount as "totalAmount", created_at as "createdAt", updated_at as "updatedAt"
      `;

      const transferResult = await client.query(transferQuery, [toParticipantId, orderId]);
      
      await client.query('COMMIT');
      
      const order = transferResult.rows[0];
      // Get order items using a direct query since we can't access private method
      const itemsQuery = `
        SELECT oi.id, oi.order_id as "orderId", oi.menu_item_id as "menuItemId",
               oi.quantity, oi.unit_price as "unitPrice", oi.total_price as "totalPrice",
               oi.notes, oi.created_at as "createdAt"
        FROM order_items oi
        WHERE oi.order_id = $1
        ORDER BY oi.created_at ASC
      `;
      const itemsResult = await client.query(itemsQuery, [orderId]);
      order.items = itemsResult.rows;
      
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const groupOrderingService = new GroupOrderingService();