import { Router } from 'express';
import { waiterTabletController } from '../controllers/waiterTabletController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  waiterLocationParamsSchema,
  locationIdParamSchema,
  waiterIdParamSchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
  markOrderDeliveredSchema,
  kitchenNotificationSchema,
  performanceMetricsQuerySchema
} from '../validation/waiterTabletValidation';

const router = Router();

// Dashboard and overview
router.get(
  '/dashboard/:waiterId/:locationId',
  authMiddleware,
  validateRequest({ params: waiterLocationParamsSchema }),
  waiterTabletController.getDashboard.bind(waiterTabletController)
);

// Active calls management
router.get(
  '/calls/:waiterId/:locationId',
  authMiddleware,
  validateRequest({ params: waiterLocationParamsSchema }),
  waiterTabletController.getActiveCalls.bind(waiterTabletController)
);

// Order management
router.get(
  '/orders/:locationId',
  authMiddleware,
  validateRequest({ params: locationIdParamSchema }),
  waiterTabletController.getActiveOrders.bind(waiterTabletController)
);

router.get(
  '/orders/:orderId/details',
  authMiddleware,
  validateRequest({ params: orderIdParamSchema }),
  waiterTabletController.getOrderDetails.bind(waiterTabletController)
);

router.put(
  '/orders/:orderId/status',
  authMiddleware,
  validateRequest({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  waiterTabletController.updateOrderStatus.bind(waiterTabletController)
);

router.post(
  '/orders/:orderId/delivered',
  authMiddleware,
  validateRequest({ params: orderIdParamSchema, body: markOrderDeliveredSchema }),
  waiterTabletController.markOrderDelivered.bind(waiterTabletController)
);

// Kitchen communication
router.post(
  '/orders/:orderId/kitchen-notification',
  authMiddleware,
  validateRequest({ params: orderIdParamSchema, body: kitchenNotificationSchema }),
  waiterTabletController.sendKitchenNotification.bind(waiterTabletController)
);

// Statistics and performance
router.get(
  '/stats/:waiterId',
  authMiddleware,
  validateRequest({ params: waiterIdParamSchema }),
  waiterTabletController.getWaiterStats.bind(waiterTabletController)
);

router.get(
  '/performance/:waiterId',
  authMiddleware,
  validateRequest({ params: waiterIdParamSchema, query: performanceMetricsQuerySchema }),
  waiterTabletController.getPerformanceMetrics.bind(waiterTabletController)
);

// Location information
router.get(
  '/location/:locationId/info',
  authMiddleware,
  validateRequest({ params: locationIdParamSchema }),
  waiterTabletController.getLocationInfo.bind(waiterTabletController)
);

router.get(
  '/location/:locationId/tables',
  authMiddleware,
  validateRequest({ params: locationIdParamSchema }),
  waiterTabletController.getTableStatus.bind(waiterTabletController)
);

export { router as waiterTabletRoutes };