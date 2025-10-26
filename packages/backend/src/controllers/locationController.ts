import { Request, Response } from 'express';
import { LocationService } from '../services/locationService';
import { 
  LocationDetectionRequest, 
  CheckinRequest, 
  CreateLocationRequest, 
  UpdateLocationRequest 
} from '../types/location';

export class LocationController {
  private locationService: LocationService;

  constructor(locationService: LocationService) {
    this.locationService = locationService;
  }

  /**
   * GET /locations/nearby?lat={lat}&lng={lng}&accuracy={accuracy}
   * Detect nearby restaurants based on GPS coordinates
   */
  detectNearbyLocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng, accuracy } = req.query;

      if (!lat || !lng) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Latitude and longitude are required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const gpsAccuracy = accuracy ? parseFloat(accuracy as string) : undefined;

      if (isNaN(latitude) || isNaN(longitude)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid latitude or longitude format',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const request: LocationDetectionRequest = {
        latitude,
        longitude,
        accuracy: gpsAccuracy
      };

      const result = await this.locationService.detectNearbyLocations(request);
      
      res.json(result);
    } catch (error) {
      console.error('Error detecting nearby locations:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to detect nearby locations',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * GET /locations/{locationId}
   * Get location details by ID
   */
  getLocationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { locationId } = req.params;

      const location = await this.locationService.getLocationById(locationId);
      
      if (!location) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Location not found',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.json(location);
    } catch (error) {
      console.error('Error getting location:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get location details',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * GET /locations/{locationId}/tables
   * Get all tables for a location with availability status
   */
  getLocationTables = async (req: Request, res: Response): Promise<void> => {
    try {
      const { locationId } = req.params;

      const tables = await this.locationService.getLocationTables(locationId);
      
      res.json({ tables });
    } catch (error) {
      console.error('Error getting location tables:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get location tables',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * POST /locations/{locationId}/checkin
   * Check in to a table at the location
   */
  checkinToTable = async (req: Request, res: Response): Promise<void> => {
    try {
      const { locationId } = req.params;
      const { tableNumber } = req.body;
      const userId = (req as any).user?.userId; // From auth middleware

      if (!tableNumber) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Table number is required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const request: CheckinRequest = {
        locationId,
        tableNumber,
        userId
      };

      const result = await this.locationService.checkinToTable(request);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error checking in to table:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Table not found or inactive') {
          res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: 'Table not found or inactive',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }
        
        if (error.message === 'Table is at full capacity') {
          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: 'Table is at full capacity',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check in to table',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * GET /locations/tables/{tableId}/session
   * Get active session for a table
   */
  getTableSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId } = req.params;

      const session = await this.locationService.getTableSession(tableId);
      
      if (!session) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'No active session found for this table',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('Error getting table session:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get table session',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * POST /locations/sessions/{sessionId}/end
   * End a table session
   */
  endTableSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      await this.locationService.endTableSession(sessionId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error ending table session:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to end table session',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * POST /locations
   * Create a new location (for restaurant owners)
   */
  createLocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (userRole !== 'owner') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only restaurant owners can create locations',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const { name, address, latitude, longitude, settings } = req.body;

      if (!name || !address || latitude === undefined || longitude === undefined) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, address, latitude, and longitude are required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const request: CreateLocationRequest = {
        name,
        address,
        latitude,
        longitude,
        settings
      };

      const location = await this.locationService.createLocation(userId, request);
      
      res.status(201).json(location);
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create location',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * PUT /locations/{locationId}
   * Update location details (for restaurant owners)
   */
  updateLocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { locationId } = req.params;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (userRole !== 'owner') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only restaurant owners can update locations',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const request: UpdateLocationRequest = req.body;

      const location = await this.locationService.updateLocation(locationId, userId, request);
      
      if (!location) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Location not found or you do not have permission to update it',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.json(location);
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update location',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };
}