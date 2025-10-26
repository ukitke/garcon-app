import { Router } from 'express';
import { LocationController } from '../controllers/locationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

export function createLocationRoutes(locationController: LocationController): Router {
  const router = Router();

  // Public routes (no authentication required)
  router.get('/nearby', rateLimitMiddleware.api, locationController.detectNearbyLocations);
  router.get('/:locationId', rateLimitMiddleware.api, locationController.getLocationById);
  router.get('/:locationId/tables', rateLimitMiddleware.api, locationController.getLocationTables);

  // Protected routes (authentication required)
  router.post('/:locationId/checkin', authMiddleware, rateLimitMiddleware.api, locationController.checkinToTable);
  router.get('/tables/:tableId/session', authMiddleware, rateLimitMiddleware.api, locationController.getTableSession);
  router.post('/sessions/:sessionId/end', authMiddleware, rateLimitMiddleware.api, locationController.endTableSession);

  // Owner-only routes
  router.post('/', authMiddleware, rateLimitMiddleware.api, locationController.createLocation);
  router.put('/:locationId', authMiddleware, rateLimitMiddleware.api, locationController.updateLocation);

  return router;
}