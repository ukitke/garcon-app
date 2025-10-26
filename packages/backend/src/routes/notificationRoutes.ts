import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  createWaiterCallSchema,
  acknowledgeCallSchema,
  resolveCallSchema,
  updateWaiterStatusSchema,
  locationIdParamSchema,
  callIdParamSchema,
  waiterIdParamSchema,
  callHistoryQuerySchema
} from '../validation/notificationValidation';

const router = Router();

// Waiter call management
router.post(
  '/waiter-calls',
  authMiddleware,
  validateRequest({ body: createWaiterCallSchema }),
  notificationController.createWaiterCall.bind(notificationController)
);

router.get(
  '/waiter-calls/:callId',
  authMiddleware,
  validateRequest({ params: callIdParamSchema }),
  notificationController.getWaiterCall.bind(notificationController)
);

router.post(
  '/waiter-calls/:callId/acknowledge',
  authMiddleware,
  validateRequest({ params: callIdParamSchema, body: acknowledgeCallSchema }),
  notificationController.acknowledgeCall.bind(notificationController)
);

router.post(
  '/waiter-calls/:callId/resolve',
  authMiddleware,
  validateRequest({ params: callIdParamSchema, body: resolveCallSchema }),
  notificationController.resolveCall.bind(notificationController)
);

router.delete(
  '/waiter-calls/:callId',
  authMiddleware,
  validateRequest({ params: callIdParamSchema }),
  notificationController.cancelCall.bind(notificationController)
);

// Location-based queries
router.get(
  '/locations/:locationId/active-calls',
  authMiddleware,
  validateRequest({ params: locationIdParamSchema }),
  notificationController.getActiveCallsForLocation.bind(notificationController)
);

router.get(
  '/locations/:locationId/waiters',
  authMiddleware,
  validateRequest({ params: locationIdParamSchema }),
  notificationController.getWaitersForLocation.bind(notificationController)
);

router.get(
  '/locations/:locationId/call-history',
  authMiddleware,
  validateRequest({ params: locationIdParamSchema, query: callHistoryQuerySchema }),
  notificationController.getCallHistory.bind(notificationController)
);

// Waiter status management
router.put(
  '/waiters/:waiterId/status',
  authMiddleware,
  validateRequest({ params: waiterIdParamSchema, body: updateWaiterStatusSchema }),
  notificationController.updateWaiterStatus.bind(notificationController)
);

export { router as notificationRoutes };