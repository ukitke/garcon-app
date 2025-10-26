import { Router } from 'express';
import { TableController } from '../controllers/tableController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

export function createTableRoutes(tableController: TableController): Router {
  const router = Router();

  // Public routes (no authentication required)
  router.get('/tables/:tableId', rateLimitMiddleware.api, tableController.getTableById);
  router.get('/locations/:locationId/availability', rateLimitMiddleware.api, tableController.getTableAvailability);

  // Protected routes (authentication required)
  router.get('/sessions/:sessionId/participants', authMiddleware, rateLimitMiddleware.api, tableController.getSessionParticipants);
  router.delete('/participants/:participantId', authMiddleware, rateLimitMiddleware.api, tableController.removeParticipant);

  // Owner-only routes
  router.post('/locations/:locationId/tables', authMiddleware, rateLimitMiddleware.api, tableController.createTable);
  router.put('/tables/:tableId', authMiddleware, rateLimitMiddleware.api, tableController.updateTable);
  router.get('/locations/:locationId/tables/manage', authMiddleware, rateLimitMiddleware.api, tableController.getTablesForManagement);
  router.delete('/tables/:tableId', authMiddleware, rateLimitMiddleware.api, tableController.deleteTable);

  return router;
}