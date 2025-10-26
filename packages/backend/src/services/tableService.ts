import { Pool } from 'pg';
import { Table, TableSession, SessionParticipant } from '../types/location';

export interface CreateTableRequest {
  locationId: string;
  number: string;
  capacity: number;
}

export interface UpdateTableRequest {
  number?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface TableAvailability {
  tableId: string;
  number: string;
  capacity: number;
  isAvailable: boolean;
  currentOccupancy: number;
  sessionId?: string;
  sessionStartTime?: Date;
}

export class TableService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Create a new table for a location
   * Implements requirement 2.1: Table number validation
   */
  async createTable(ownerId: string, request: CreateTableRequest): Promise<Table> {
    const { locationId, number, capacity } = request;

    // Verify the location belongs to the owner
    const locationQuery = `
      SELECT id FROM locations 
      WHERE id = $1 AND owner_id = $2 AND is_active = true
    `;
    const locationResult = await this.db.query(locationQuery, [locationId, ownerId]);
    
    if (locationResult.rows.length === 0) {
      throw new Error('Location not found or access denied');
    }

    const query = `
      INSERT INTO tables (location_id, number, capacity, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING 
        id,
        location_id as "locationId",
        number,
        capacity,
        is_active as "isActive",
        created_at as "createdAt"
    `;

    try {
      const result = await this.db.query(query, [locationId, number, capacity]);
      return result.rows[0] as Table;
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Table number already exists for this location');
      }
      throw error;
    }
  }

  /**
   * Update table details
   */
  async updateTable(ownerId: string, tableId: string, request: UpdateTableRequest): Promise<Table | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (request.number !== undefined) {
      updates.push(`number = $${paramCount++}`);
      values.push(request.number);
    }
    if (request.capacity !== undefined) {
      updates.push(`capacity = $${paramCount++}`);
      values.push(request.capacity);
    }
    if (request.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(request.isActive);
    }

    if (updates.length === 0) {
      return this.getTableById(tableId);
    }

    values.push(tableId, ownerId);

    const query = `
      UPDATE tables 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} 
        AND location_id IN (
          SELECT id FROM locations WHERE owner_id = $${paramCount++}
        )
      RETURNING 
        id,
        location_id as "locationId",
        number,
        capacity,
        is_active as "isActive",
        created_at as "createdAt"
    `;

    const result = await this.db.query(query, values);
    
    return result.rows.length > 0 ? result.rows[0] as Table : null;
  }

  /**
   * Get table by ID
   */
  async getTableById(tableId: string): Promise<Table | null> {
    const query = `
      SELECT 
        t.id,
        t.location_id as "locationId",
        t.number,
        t.capacity,
        t.is_active as "isActive",
        t.created_at as "createdAt",
        ts.id as "sessionId",
        ts.start_time as "sessionStartTime",
        ts.end_time as "sessionEndTime",
        ts.is_active as "sessionIsActive"
      FROM tables t
      LEFT JOIN table_sessions ts ON t.id = ts.table_id AND ts.is_active = true
      WHERE t.id = $1
    `;

    const result = await this.db.query(query, [tableId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      locationId: row.locationId,
      number: row.number,
      capacity: row.capacity,
      isActive: row.isActive,
      createdAt: row.createdAt,
      currentSession: row.sessionId ? {
            id: row.sessionId,
            tableId: row.tableId,
            startTime: row.sessionStartTime,
            endTime: row.sessionEndTime,
            isActive: row.sessionIsActive,
            createdAt: row.sessionStartTime || new Date(),
            participants: []
          } : undefined
    };
  }

  /**
   * Get table availability status for a location
   * Implements requirement 2.4: Table selection interface with availability status
   */
  async getTableAvailability(locationId: string): Promise<TableAvailability[]> {
    const query = `
      SELECT 
        t.id as "tableId",
        t.number,
        t.capacity,
        t.is_active as "isActive",
        ts.id as "sessionId",
        ts.start_time as "sessionStartTime",
        COUNT(sp.id) as "currentOccupancy"
      FROM tables t
      LEFT JOIN table_sessions ts ON t.id = ts.table_id AND ts.is_active = true
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      WHERE t.location_id = $1 AND t.is_active = true
      GROUP BY t.id, t.number, t.capacity, t.is_active, ts.id, ts.start_time
      ORDER BY t.number::integer
    `;

    const result = await this.db.query(query, [locationId]);
    
    return result.rows.map(row => ({
      tableId: row.tableId,
      number: row.number,
      capacity: row.capacity,
      isAvailable: !row.sessionId || row.currentOccupancy < row.capacity,
      currentOccupancy: parseInt(row.currentOccupancy) || 0,
      sessionId: row.sessionId,
      sessionStartTime: row.sessionStartTime
    }));
  }

  /**
   * Validate table number exists and is active
   * Implements requirement 2.2: Table occupancy tracking
   */
  async validateTableForCheckin(locationId: string, tableNumber: string): Promise<{
    tableId: string;
    isAvailable: boolean;
    currentSession?: string;
    occupancy: number;
    capacity: number;
  }> {
    const query = `
      SELECT 
        t.id as "tableId",
        t.capacity,
        ts.id as "sessionId",
        COUNT(sp.id) as "occupancy"
      FROM tables t
      LEFT JOIN table_sessions ts ON t.id = ts.table_id AND ts.is_active = true
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      WHERE t.location_id = $1 AND t.number = $2 AND t.is_active = true
      GROUP BY t.id, t.capacity, ts.id
    `;

    const result = await this.db.query(query, [locationId, tableNumber]);
    
    if (result.rows.length === 0) {
      throw new Error('Table not found or inactive');
    }

    const row = result.rows[0];
    const occupancy = parseInt(row.occupancy) || 0;
    
    return {
      tableId: row.tableId,
      isAvailable: occupancy < row.capacity,
      currentSession: row.sessionId,
      occupancy,
      capacity: row.capacity
    };
  }

  /**
   * Get session participants for a table
   * Implements requirement 2.3: Active session detection
   */
  async getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    const query = `
      SELECT 
        id,
        session_id as "sessionId",
        user_id as "userId",
        fantasy_name as "fantasyName",
        joined_at as "joinedAt"
      FROM session_participants
      WHERE session_id = $1
      ORDER BY joined_at ASC
    `;

    const result = await this.db.query(query, [sessionId]);
    
    return result.rows as SessionParticipant[];
  }

  /**
   * Remove participant from session
   * Implements requirement 2.5: Session management
   */
  async removeParticipantFromSession(participantId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Remove the participant
      const removeQuery = `
        DELETE FROM session_participants 
        WHERE id = $1
        RETURNING session_id
      `;
      const removeResult = await client.query(removeQuery, [participantId]);
      
      if (removeResult.rows.length === 0) {
        throw new Error('Participant not found');
      }

      const sessionId = removeResult.rows[0].session_id;

      // Check if session is now empty
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM session_participants 
        WHERE session_id = $1
      `;
      const countResult = await client.query(countQuery, [sessionId]);
      const participantCount = parseInt(countResult.rows[0].count);

      // If no participants left, end the session
      if (participantCount === 0) {
        const endSessionQuery = `
          UPDATE table_sessions 
          SET is_active = false, end_time = NOW()
          WHERE id = $1
        `;
        await client.query(endSessionQuery, [sessionId]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all tables for a location (for owners)
   */
  async getLocationTablesForOwner(ownerId: string, locationId: string): Promise<Table[]> {
    // Verify ownership
    const ownershipQuery = `
      SELECT id FROM locations 
      WHERE id = $1 AND owner_id = $2
    `;
    const ownershipResult = await this.db.query(ownershipQuery, [locationId, ownerId]);
    
    if (ownershipResult.rows.length === 0) {
      throw new Error('Location not found or access denied');
    }

    const query = `
      SELECT 
        t.id,
        t.location_id as "locationId",
        t.number,
        t.capacity,
        t.is_active as "isActive",
        t.created_at as "createdAt",
        ts.id as "sessionId",
        ts.start_time as "sessionStartTime",
        ts.end_time as "sessionEndTime",
        ts.is_active as "sessionIsActive",
        COUNT(sp.id) as "participantCount"
      FROM tables t
      LEFT JOIN table_sessions ts ON t.id = ts.table_id AND ts.is_active = true
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      WHERE t.location_id = $1
      GROUP BY t.id, t.location_id, t.number, t.capacity, t.is_active, t.created_at, 
               ts.id, ts.start_time, ts.end_time, ts.is_active
      ORDER BY t.number::integer
    `;

    const result = await this.db.query(query, [locationId]);
    
    return result.rows.map(row => ({
      id: row.id,
      locationId: row.locationId,
      number: row.number,
      capacity: row.capacity,
      isActive: row.isActive,
      createdAt: row.createdAt,
      currentSession: row.sessionId ? {
            id: row.sessionId,
            tableId: row.tableId,
            startTime: row.sessionStartTime,
            endTime: row.sessionEndTime,
            isActive: row.sessionIsActive,
            createdAt: row.sessionStartTime || new Date(),
            participants: []
          } : undefined
    }));
  }

  /**
   * Delete a table (for owners)
   */
  async deleteTable(ownerId: string, tableId: string): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if table has active sessions
      const activeSessionQuery = `
        SELECT ts.id 
        FROM table_sessions ts
        JOIN tables t ON ts.table_id = t.id
        JOIN locations l ON t.location_id = l.id
        WHERE t.id = $1 AND l.owner_id = $2 AND ts.is_active = true
      `;
      const activeSessionResult = await client.query(activeSessionQuery, [tableId, ownerId]);
      
      if (activeSessionResult.rows.length > 0) {
        throw new Error('Cannot delete table with active sessions');
      }

      // Delete the table
      const deleteQuery = `
        DELETE FROM tables 
        WHERE id = $1 
          AND location_id IN (
            SELECT id FROM locations WHERE owner_id = $2
          )
      `;
      const deleteResult = await client.query(deleteQuery, [tableId, ownerId]);
      
      await client.query('COMMIT');
      
      return (deleteResult.rowCount || 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}