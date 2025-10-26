import { Request, Response } from 'express';
import { TableService, CreateTableRequest, UpdateTableRequest } from '../services/tableService';

export class TableController {
  private tableService: TableService;

  constructor(tableService: TableService) {
    this.tableService = tableService;
  }

  /**
   * POST /locations/{locationId}/tables
   * Create a new table (for restaurant owners)
   */
  createTable = async (req: Request, res: Response): Promise<void> => {
    try {
      const { locationId } = req.params;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (userRole !== 'owner') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only restaurant owners can create tables',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const { number, capacity } = req.body;

      if (!number || !capacity) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Table number and capacity are required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const request: CreateTableRequest = {
        locationId,
        number,
        capacity
      };

      const table = await this.tableService.createTable(userId, request);
      
      res.status(201).json(table);
    } catch (error) {
      console.error('Error creating table:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Location not found or access denied') {
          res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: 'Location not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id'] || 'unknown'
            }
          });
          return;
        }
        
        if (error.message === 'Table number already exists for this location') {
          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: 'Table number already exists for this location',
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
          message: 'Failed to create table',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * PUT /tables/{tableId}
   * Update table details (for restaurant owners)
   */
  updateTable = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId } = req.params;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (userRole !== 'owner') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only restaurant owners can update tables',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const request: UpdateTableRequest = req.body;

      const table = await this.tableService.updateTable(userId, tableId, request);
      
      if (!table) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Table not found or you do not have permission to update it',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.json(table);
    } catch (error) {
      console.error('Error updating table:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update table',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * GET /tables/{tableId}
   * Get table details
   */
  getTableById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId } = req.params;

      const table = await this.tableService.getTableById(tableId);
      
      if (!table) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Table not found',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.json(table);
    } catch (error) {
      console.error('Error getting table:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get table details',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * GET /locations/{locationId}/availability
   * Get table availability for a location
   */
  getTableAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { locationId } = req.params;

      const availability = await this.tableService.getTableAvailability(locationId);
      
      res.json({ tables: availability });
    } catch (error) {
      console.error('Error getting table availability:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get table availability',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * GET /sessions/{sessionId}/participants
   * Get session participants
   */
  getSessionParticipants = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      const participants = await this.tableService.getSessionParticipants(sessionId);
      
      res.json({ participants });
    } catch (error) {
      console.error('Error getting session participants:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get session participants',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * DELETE /participants/{participantId}
   * Remove participant from session
   */
  removeParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { participantId } = req.params;

      await this.tableService.removeParticipantFromSession(participantId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error removing participant:', error);
      
      if (error instanceof Error && error.message === 'Participant not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Participant not found',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove participant',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * GET /locations/{locationId}/tables/manage
   * Get all tables for location management (for owners)
   */
  getTablesForManagement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { locationId } = req.params;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (userRole !== 'owner') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only restaurant owners can manage tables',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const tables = await this.tableService.getLocationTablesForOwner(userId, locationId);
      
      res.json({ tables });
    } catch (error) {
      console.error('Error getting tables for management:', error);
      
      if (error instanceof Error && error.message === 'Location not found or access denied') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Location not found or access denied',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get tables for management',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };

  /**
   * DELETE /tables/{tableId}
   * Delete a table (for owners)
   */
  deleteTable = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableId } = req.params;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (userRole !== 'owner') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only restaurant owners can delete tables',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      const deleted = await this.tableService.deleteTable(userId, tableId);
      
      if (!deleted) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Table not found or you do not have permission to delete it',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting table:', error);
      
      if (error instanceof Error && error.message === 'Cannot delete table with active sessions') {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Cannot delete table with active sessions',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete table',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };
}