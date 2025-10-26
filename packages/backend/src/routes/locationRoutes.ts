import { Router } from 'express';
import { LocationController } from '../controllers/locationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

export function createLocationRoutes(locationController: LocationController): Router {
  const router = Router();

  // Public routes (no authentication required)
  router.get('/nearby', rateLimitMiddleware, locationController.detectNearbyLocations);
  router.get('/:locationId', rateLimitMiddleware, locationController.getLocationById);
  router.get('/:locationId/tables', rateLimitMiddleware, locationController.getLocationTables);

  // Protected routes (authentication required)
  router.post('/:locationId/checkin', authMiddleware, rateLimitMiddleware, locationController.checkinToTable);
  router.get('/tables/:tableId/session', authMiddleware, rateLimitMiddleware, locationController.getTableSession);
  router.post('/sessions/:sessionId/end', authMiddleware, rateLimitMiddleware, locationController.endTableSession);

  // Owner-only routes
  router.post('/', authMiddleware, rateLimitMiddleware, locationController.createLocation);
  router.put('/:locationId', authMiddleware, rateLimitMiddleware, locationController.updateLocation);

  return router;
}