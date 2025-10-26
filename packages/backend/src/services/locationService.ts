import { Pool } from 'pg';
import { 
  Location, 
  Table, 
  TableSession, 
  SessionParticipant,
  LocationDetectionRequest,
  LocationDetectionResponse,
  NearbyLocation,
  CheckinRequest,
  CheckinResponse,
  CreateLocationRequest,
  UpdateLocationRequest
} from '../types/location';

export class LocationService {
  private db: Pool;
  private readonly DEFAULT_COVERAGE_RADIUS = 50; // meters
  private readonly MAX_SEARCH_RADIUS = 1000; // meters

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Detect nearby restaurants based on GPS coordinates
   * Implements requirement 1.1: Automatic location identification within 30 seconds
   * Implements requirement 1.2: 50-meter accuracy for location identification
   */
  async detectNearbyLocations(request: LocationDetectionRequest): Promise<LocationDetectionResponse> {
    const { latitude, longitude, accuracy = 50 } = request;

    // Calculate search radius based on GPS accuracy
    const searchRadius = Math.min(accuracy * 2, this.MAX_SEARCH_RADIUS);

    const query = `
      SELECT 
        id,
        name,
        address,
        latitude,
        longitude,
        settings,
        (
          6371000 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          )
        ) AS distance
      FROM locations 
      WHERE is_active = true
        AND (
          6371000 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          )
        ) <= $3
      ORDER BY distance ASC
      LIMIT 10
    `;

    const result = await this.db.query(query, [latitude, longitude, searchRadius]);
    
    const nearbyLocations: NearbyLocation[] = result.rows.map(row => {
      const coverageRadius = row.settings?.coverageRadius || this.DEFAULT_COVERAGE_RADIUS;
      return {
        id: row.id,
        name: row.name,
        address: row.address,
        distance: Math.round(row.distance),
        isWithinRange: row.distance <= coverageRadius
      };
    });

    // Find the closest location within coverage range
    const detectedLocation = nearbyLocations.find(loc => loc.isWithinRange);
    
    return {
      locations: nearbyLocations,
      detectedLocation,
      requiresManualSelection: !detectedLocation && nearbyLocations.length > 0
    };
  }

  /**
   * Get location details by ID
   */
  async getLocationById(locationId: string): Promise<Location | null> {
    const query = `
      SELECT 
        id,
        name,
        address,
        latitude,
        longitude,
        owner_id as "ownerId",
        subscription_tier as "subscriptionTier",
        is_active as "isActive",
        settings,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM locations 
      WHERE id = $1 AND is_active = true
    `;

    const result = await this.db.query(query, [locationId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Location;
  }

  /**
   * Get all tables for a location
   * Implements requirement 2.1: Table number validation
   */
  async getLocationTables(locationId: string): Promise<Table[]> {
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
      WHERE t.location_id = $1 AND t.is_active = true
      ORDER BY t.number::integer
    `;

    const result = await this.db.query(query, [locationId]);
    
    const tablesMap = new Map<string, Table>();
    
    result.rows.forEach(row => {
      if (!tablesMap.has(row.id)) {
        tablesMap.set(row.id, {
          id: row.id,
          locationId: row.locationId,
          number: row.number,
          capacity: row.capacity,
          isActive: row.isActive,
          createdAt: row.createdAt,
          currentSession: row.sessionId ? {
            id: row.sessionId,
            tableId: row.id,
            startTime: row.sessionStartTime,
            endTime: row.sessionEndTime,
            isActive: row.sessionIsActive,
            participants: []
          } : undefined
        });
      }
    });

    return Array.from(tablesMap.values());
  }

  /**
   * Check in to a table and create/join session
   * Implements requirement 2.2: Table occupancy tracking
   * Implements requirement 2.3: Active session detection
   */
  async checkinToTable(request: CheckinRequest): Promise<CheckinResponse> {
    const { locationId, tableNumber, userId } = request;

    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Validate table exists and is active
      const tableQuery = `
        SELECT id, number, capacity 
        FROM tables 
        WHERE location_id = $1 AND number = $2 AND is_active = true
      `;
      const tableResult = await client.query(tableQuery, [locationId, tableNumber]);
      
      if (tableResult.rows.length === 0) {
        throw new Error('Table not found or inactive');
      }

      const table = tableResult.rows[0];

      // Check table capacity before allowing checkin
      const occupancyQuery = `
        SELECT COUNT(sp.id) as occupancy
        FROM table_sessions ts
        JOIN session_participants sp ON ts.id = sp.session_id
        WHERE ts.table_id = $1 AND ts.is_active = true
      `;
      const occupancyResult = await client.query(occupancyQuery, [table.id]);
      const currentOccupancy = parseInt(occupancyResult.rows[0].occupancy) || 0;

      if (currentOccupancy >= table.capacity) {
        throw new Error('Table is at full capacity');
      }

      // Check for existing active session
      let sessionId: string;
      const existingSessionQuery = `
        SELECT id FROM table_sessions 
        WHERE table_id = $1 AND is_active = true
      `;
      const existingSessionResult = await client.query(existingSessionQuery, [table.id]);

      if (existingSessionResult.rows.length > 0) {
        // Join existing session
        sessionId = existingSessionResult.rows[0].id;
      } else {
        // Create new session
        const newSessionQuery = `
          INSERT INTO table_sessions (table_id, start_time, is_active)
          VALUES ($1, NOW(), true)
          RETURNING id
        `;
        const newSessionResult = await client.query(newSessionQuery, [table.id]);
        sessionId = newSessionResult.rows[0].id;
      }

      // Generate fantasy name
      const fantasyName = this.generateFantasyName();

      // Add participant to session
      const participantQuery = `
        INSERT INTO session_participants (session_id, user_id, fantasy_name, joined_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
      `;
      const participantResult = await client.query(participantQuery, [sessionId, userId, fantasyName]);
      const participantId = participantResult.rows[0].id;

      await client.query('COMMIT');

      return {
        sessionId,
        participantId,
        fantasyName,
        tableInfo: {
          id: table.id,
          number: table.number,
          capacity: table.capacity
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get active session for a table
   * Implements requirement 2.4: Table selection interface with availability status
   */
  async getTableSession(tableId: string): Promise<TableSession | null> {
    const query = `
      SELECT 
        ts.id,
        ts.table_id as "tableId",
        ts.start_time as "startTime",
        ts.end_time as "endTime",
        ts.is_active as "isActive",
        ts.created_at as "createdAt",
        sp.id as "participantId",
        sp.user_id as "participantUserId",
        sp.fantasy_name as "participantFantasyName",
        sp.joined_at as "participantJoinedAt"
      FROM table_sessions ts
      LEFT JOIN session_participants sp ON ts.id = sp.session_id
      WHERE ts.table_id = $1 AND ts.is_active = true
      ORDER BY sp.joined_at ASC
    `;

    const result = await this.db.query(query, [tableId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const firstRow = result.rows[0];
    const participants: SessionParticipant[] = result.rows
      .filter(row => row.participantId)
      .map(row => ({
        id: row.participantId,
        sessionId: row.id,
        userId: row.participantUserId,
        fantasyName: row.participantFantasyName,
        joinedAt: row.participantJoinedAt
      }));

    return {
      id: firstRow.id,
      tableId: firstRow.tableId,
      startTime: firstRow.startTime,
      endTime: firstRow.endTime,
      isActive: firstRow.isActive,
      participants,
      createdAt: firstRow.createdAt
    };
  }

  /**
   * End a table session
   * Implements requirement 2.5: Session management
   */
  async endTableSession(sessionId: string): Promise<void> {
    const query = `
      UPDATE table_sessions 
      SET is_active = false, end_time = NOW()
      WHERE id = $1
    `;
    
    await this.db.query(query, [sessionId]);
  }

  /**
   * Create a new location (for restaurant owners)
   */
  async createLocation(ownerId: string, request: CreateLocationRequest): Promise<Location> {
    const { name, address, latitude, longitude, settings = {} } = request;

    const query = `
      INSERT INTO locations (name, address, latitude, longitude, owner_id, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        name,
        address,
        latitude,
        longitude,
        owner_id as "ownerId",
        subscription_tier as "subscriptionTier",
        is_active as "isActive",
        settings,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [
      name, 
      address, 
      latitude, 
      longitude, 
      ownerId, 
      JSON.stringify(settings)
    ]);

    return result.rows[0] as Location;
  }

  /**
   * Update location details
   */
  async updateLocation(locationId: string, ownerId: string, request: UpdateLocationRequest): Promise<Location | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (request.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(request.name);
    }
    if (request.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(request.address);
    }
    if (request.latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(request.latitude);
    }
    if (request.longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(request.longitude);
    }
    if (request.settings !== undefined) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(request.settings));
    }
    if (request.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(request.isActive);
    }

    if (updates.length === 0) {
      return this.getLocationById(locationId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(locationId, ownerId);

    const query = `
      UPDATE locations 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND owner_id = $${paramCount++}
      RETURNING 
        id,
        name,
        address,
        latitude,
        longitude,
        owner_id as "ownerId",
        subscription_tier as "subscriptionTier",
        is_active as "isActive",
        settings,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, values);
    
    return result.rows.length > 0 ? result.rows[0] as Location : null;
  }

  /**
   * Generate a random fantasy name for table participants
   */
  private generateFantasyName(): string {
    const adjectives = [
      'Brave', 'Swift', 'Clever', 'Noble', 'Mighty', 'Wise', 'Bold', 'Fierce',
      'Gentle', 'Bright', 'Silent', 'Golden', 'Silver', 'Crimson', 'Azure'
    ];
    
    const nouns = [
      'Dragon', 'Phoenix', 'Tiger', 'Eagle', 'Wolf', 'Lion', 'Bear', 'Falcon',
      'Raven', 'Fox', 'Hawk', 'Panther', 'Stallion', 'Serpent', 'Owl'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective} ${noun}`;
  }
}