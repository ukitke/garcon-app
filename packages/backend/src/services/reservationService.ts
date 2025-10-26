import { Pool } from 'pg';
import { getPool } from '../config/database';
import { 
  Reservation, 
  CreateReservationRequest, 
  UpdateReservationRequest,
  ReservationAvailability,
  TimeSlot,
  ReservationSettings,
  ReservationAnalytics
} from '../types/reservation';

export class ReservationService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createReservation(request: CreateReservationRequest): Promise<Reservation> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate availability
      const isAvailable = await this.checkAvailability(
        request.locationId,
        request.reservationDate,
        request.reservationTime,
        request.partySize
      );

      if (!isAvailable) {
        throw new Error('No availability for the requested time slot');
      }

      // Create reservation
      const reservationQuery = `
        INSERT INTO reservations (
          location_id, user_id, customer_name, customer_email, customer_phone,
          party_size, reservation_date, reservation_time, special_requests
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, location_id as "locationId", user_id as "userId", customer_name as "customerName",
                  customer_email as "customerEmail", customer_phone as "customerPhone", party_size as "partySize",
                  reservation_date as "reservationDate", reservation_time as "reservationTime", duration,
                  status, table_id as "tableId", special_requests as "specialRequests",
                  created_at as "createdAt", updated_at as "updatedAt"
      `;

      const reservationResult = await client.query(reservationQuery, [
        request.locationId,
        request.userId || null,
        request.customerName,
        request.customerEmail,
        request.customerPhone,
        request.partySize,
        request.reservationDate,
        request.reservationTime,
        request.specialRequests || null
      ]);

      const reservation = reservationResult.rows[0];

      // Schedule confirmation reminder
      await this.scheduleReminder(client, reservation.id, 'confirmation', new Date(Date.now() + 5 * 60 * 1000));

      await client.query('COMMIT');
      return reservation;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getReservation(reservationId: string): Promise<Reservation | null> {
    const query = `
      SELECT r.id, r.location_id as "locationId", r.user_id as "userId", r.customer_name as "customerName",
             r.customer_email as "customerEmail", r.customer_phone as "customerPhone", r.party_size as "partySize",
             r.reservation_date as "reservationDate", r.reservation_time as "reservationTime", r.duration,
             r.status, r.table_id as "tableId", r.special_requests as "specialRequests",
             r.created_at as "createdAt", r.updated_at as "updatedAt", r.confirmed_at as "confirmedAt",
             r.seated_at as "seatedAt", r.completed_at as "completedAt", r.cancelled_at as "cancelledAt"
      FROM reservations r
      WHERE r.id = $1
    `;

    const result = await this.pool.query(query, [reservationId]);
    return result.rows[0] || null;
  }

  async updateReservation(reservationId: string, updates: UpdateReservationRequest): Promise<Reservation | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.customerName !== undefined) {
      setClauses.push(`customer_name = $${paramCount++}`);
      values.push(updates.customerName);
    }
    if (updates.customerEmail !== undefined) {
      setClauses.push(`customer_email = $${paramCount++}`);
      values.push(updates.customerEmail);
    }
    if (updates.customerPhone !== undefined) {
      setClauses.push(`customer_phone = $${paramCount++}`);
      values.push(updates.customerPhone);
    }
    if (updates.partySize !== undefined) {
      setClauses.push(`party_size = $${paramCount++}`);
      values.push(updates.partySize);
    }
    if (updates.reservationDate !== undefined) {
      setClauses.push(`reservation_date = $${paramCount++}`);
      values.push(updates.reservationDate);
    }
    if (updates.reservationTime !== undefined) {
      setClauses.push(`reservation_time = $${paramCount++}`);
      values.push(updates.reservationTime);
    }
    if (updates.specialRequests !== undefined) {
      setClauses.push(`special_requests = $${paramCount++}`);
      values.push(updates.specialRequests);
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(reservationId);

    const query = `
      UPDATE reservations 
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount++}
      RETURNING id, location_id as "locationId", user_id as "userId", customer_name as "customerName",
                customer_email as "customerEmail", customer_phone as "customerPhone", party_size as "partySize",
                reservation_date as "reservationDate", reservation_time as "reservationTime", duration,
                status, table_id as "tableId", special_requests as "specialRequests",
                created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async confirmReservation(reservationId: string): Promise<Reservation | null> {
    const query = `
      UPDATE reservations 
      SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING id, location_id as "locationId", user_id as "userId", customer_name as "customerName",
                customer_email as "customerEmail", customer_phone as "customerPhone", party_size as "partySize",
                reservation_date as "reservationDate", reservation_time as "reservationTime", duration,
                status, table_id as "tableId", special_requests as "specialRequests",
                created_at as "createdAt", updated_at as "updatedAt", confirmed_at as "confirmedAt"
    `;

    const result = await this.pool.query(query, [reservationId]);
    
    if (result.rows.length > 0) {
      // Schedule reminder for 24 hours before reservation
      const reservation = result.rows[0];
      const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationTime}`);
      const reminderTime = new Date(reservationDateTime.getTime() - 24 * 60 * 60 * 1000);
      
      if (reminderTime > new Date()) {
        await this.scheduleReminder(this.pool, reservationId, 'reminder', reminderTime);
      }
    }

    return result.rows[0] || null;
  }

  async cancelReservation(reservationId: string, reason?: string): Promise<Reservation | null> {
    const query = `
      UPDATE reservations 
      SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status IN ('pending', 'confirmed')
      RETURNING id, location_id as "locationId", user_id as "userId", customer_name as "customerName",
                customer_email as "customerEmail", customer_phone as "customerPhone", party_size as "partySize",
                reservation_date as "reservationDate", reservation_time as "reservationTime", duration,
                status, table_id as "tableId", special_requests as "specialRequests",
                created_at as "createdAt", updated_at as "updatedAt", cancelled_at as "cancelledAt"
    `;

    const result = await this.pool.query(query, [reservationId]);
    return result.rows[0] || null;
  }

  async seatReservation(reservationId: string, tableId: string): Promise<Reservation | null> {
    const query = `
      UPDATE reservations 
      SET status = 'seated', table_id = $1, seated_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND status = 'confirmed'
      RETURNING id, location_id as "locationId", user_id as "userId", customer_name as "customerName",
                customer_email as "customerEmail", customer_phone as "customerPhone", party_size as "partySize",
                reservation_date as "reservationDate", reservation_time as "reservationTime", duration,
                status, table_id as "tableId", special_requests as "specialRequests",
                created_at as "createdAt", updated_at as "updatedAt", seated_at as "seatedAt"
    `;

    const result = await this.pool.query(query, [tableId, reservationId]);
    return result.rows[0] || null;
  }

  async completeReservation(reservationId: string): Promise<Reservation | null> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE reservations 
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'seated'
        RETURNING id, location_id as "locationId", user_id as "userId", customer_name as "customerName",
                  customer_email as "customerEmail", customer_phone as "customerPhone", party_size as "partySize",
                  reservation_date as "reservationDate", reservation_time as "reservationTime", duration,
                  status, table_id as "tableId", special_requests as "specialRequests",
                  created_at as "createdAt", updated_at as "updatedAt", completed_at as "completedAt"
      `;

      const result = await client.query(query, [reservationId]);
      
      if (result.rows.length > 0) {
        // Schedule follow-up reminder for review
        await this.scheduleReminder(client, reservationId, 'follow_up', new Date(Date.now() + 2 * 60 * 60 * 1000));
      }

      await client.query('COMMIT');
      return result.rows[0] || null;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getReservationsForLocation(locationId: string, date?: string, status?: string): Promise<Reservation[]> {
    let query = `
      SELECT r.id, r.location_id as "locationId", r.user_id as "userId", r.customer_name as "customerName",
             r.customer_email as "customerEmail", r.customer_phone as "customerPhone", r.party_size as "partySize",
             r.reservation_date as "reservationDate", r.reservation_time as "reservationTime", r.duration,
             r.status, r.table_id as "tableId", r.special_requests as "specialRequests",
             r.created_at as "createdAt", r.updated_at as "updatedAt",
             t.number as "tableNumber"
      FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      WHERE r.location_id = $1
    `;

    const params = [locationId];
    let paramCount = 1;

    if (date) {
      query += ` AND r.reservation_date = $${++paramCount}`;
      params.push(date);
    }

    if (status) {
      query += ` AND r.status = $${++paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY r.reservation_date ASC, r.reservation_time ASC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async checkAvailability(locationId: string, date: string, time: string, partySize: number): Promise<boolean> {
    // Get available tables for the party size
    const tablesQuery = `
      SELECT COUNT(*) as available_tables
      FROM tables t
      WHERE t.location_id = $1 AND t.capacity >= $2 AND t.is_active = true
    `;

    const tablesResult = await this.pool.query(tablesQuery, [locationId, partySize]);
    const totalTables = parseInt(tablesResult.rows[0].available_tables);

    if (totalTables === 0) {
      return false;
    }

    // Check existing reservations for the time slot
    const reservationsQuery = `
      SELECT COUNT(*) as booked_tables
      FROM reservations r
      WHERE r.location_id = $1 
        AND r.reservation_date = $2 
        AND r.reservation_time = $3
        AND r.status IN ('confirmed', 'seated')
    `;

    const reservationsResult = await this.pool.query(reservationsQuery, [locationId, date, time]);
    const bookedTables = parseInt(reservationsResult.rows[0].booked_tables);

    return (totalTables - bookedTables) > 0;
  }

  async getAvailability(locationId: string, date: string): Promise<ReservationAvailability> {
    // Get reservation settings
    const settingsQuery = `
      SELECT operating_hours, default_reservation_duration
      FROM reservation_settings
      WHERE location_id = $1
    `;

    const settingsResult = await this.pool.query(settingsQuery, [locationId]);
    const settings = settingsResult.rows[0];

    if (!settings) {
      throw new Error('Reservation settings not found for location');
    }

    const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const operatingHours = settings.operating_hours[dayOfWeek];

    if (!operatingHours || !operatingHours.isOpen) {
      return {
        date,
        timeSlots: []
      };
    }

    // Generate time slots
    const timeSlots: TimeSlot[] = [];
    const slots = operatingHours.reservationSlots || this.generateTimeSlots(operatingHours.open, operatingHours.close);

    for (const time of slots) {
      const available = await this.checkAvailability(locationId, date, time, 1); // Check for minimum party size
      const availableTables = await this.getAvailableTablesCount(locationId, date, time);
      const maxPartySize = await this.getMaxPartySizeForSlot(locationId, date, time);

      timeSlots.push({
        time,
        available,
        availableTables,
        maxPartySize,
        estimatedWaitTime: available ? 0 : 15
      });
    }

    return {
      date,
      timeSlots
    };
  }

  async getReservationAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<ReservationAnalytics> {
    const query = `
      SELECT 
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN status = 'confirmed' OR status = 'seated' OR status = 'completed' THEN 1 END) as confirmed_reservations,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_reservations,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show_reservations,
        AVG(party_size) as average_party_size,
        json_object_agg(
          EXTRACT(HOUR FROM reservation_time)::text, 
          COUNT(CASE WHEN EXTRACT(HOUR FROM reservation_time) IS NOT NULL THEN 1 END)
        ) as peak_hours,
        json_object_agg(
          EXTRACT(DOW FROM reservation_date)::text,
          COUNT(CASE WHEN EXTRACT(DOW FROM reservation_date) IS NOT NULL THEN 1 END)
        ) as peak_days
      FROM reservations
      WHERE location_id = $1 AND reservation_date BETWEEN $2 AND $3
    `;

    const result = await this.pool.query(query, [locationId, startDate, endDate]);
    const data = result.rows[0];

    const totalReservations = parseInt(data.total_reservations) || 0;
    const confirmedReservations = parseInt(data.confirmed_reservations) || 0;
    const cancelledReservations = parseInt(data.cancelled_reservations) || 0;
    const noShowReservations = parseInt(data.no_show_reservations) || 0;

    return {
      locationId,
      period: { start: startDate, end: endDate },
      totalReservations,
      confirmedReservations,
      cancelledReservations,
      noShowReservations,
      averagePartySize: parseFloat(data.average_party_size) || 0,
      peakHours: data.peak_hours || {},
      peakDays: data.peak_days || {},
      confirmationRate: totalReservations > 0 ? (confirmedReservations / totalReservations) * 100 : 0,
      cancellationRate: totalReservations > 0 ? (cancelledReservations / totalReservations) * 100 : 0,
      noShowRate: totalReservations > 0 ? (noShowReservations / totalReservations) * 100 : 0
    };
  }

  // Private helper methods
  private async scheduleReminder(client: any, reservationId: string, type: string, scheduledAt: Date): Promise<void> {
    const query = `
      INSERT INTO reservation_reminders (reservation_id, type, scheduled_at, method)
      VALUES ($1, $2, $3, 'email')
    `;

    await client.query(query, [reservationId, type, scheduledAt]);
  }

  private generateTimeSlots(openTime: string, closeTime: string): string[] {
    const slots: string[] = [];
    const start = this.timeToMinutes(openTime);
    const end = this.timeToMinutes(closeTime);
    const interval = 30; // 30-minute intervals

    for (let minutes = start; minutes < end; minutes += interval) {
      slots.push(this.minutesToTime(minutes));
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private async getAvailableTablesCount(locationId: string, date: string, time: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as available
      FROM tables t
      WHERE t.location_id = $1 
        AND t.is_active = true
        AND t.id NOT IN (
          SELECT COALESCE(r.table_id, '00000000-0000-0000-0000-000000000000')
          FROM reservations r
          WHERE r.location_id = $1 
            AND r.reservation_date = $2 
            AND r.reservation_time = $3
            AND r.status IN ('confirmed', 'seated')
        )
    `;

    const result = await this.pool.query(query, [locationId, date, time]);
    return parseInt(result.rows[0].available);
  }

  private async getMaxPartySizeForSlot(locationId: string, date: string, time: string): Promise<number> {
    const query = `
      SELECT MAX(t.capacity) as max_capacity
      FROM tables t
      WHERE t.location_id = $1 
        AND t.is_active = true
        AND t.id NOT IN (
          SELECT COALESCE(r.table_id, '00000000-0000-0000-0000-000000000000')
          FROM reservations r
          WHERE r.location_id = $1 
            AND r.reservation_date = $2 
            AND r.reservation_time = $3
            AND r.status IN ('confirmed', 'seated')
        )
    `;

    const result = await this.pool.query(query, [locationId, date, time]);
    return parseInt(result.rows[0].max_capacity) || 0;
  }
}

export const reservationService = new ReservationService();