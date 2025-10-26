import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  createOrderSchema,
  updateOrderSchema,
  createOrderItemSchema,
  updateCartItemQuantitySchema,
  orderIdSchema,
  sessionIdSchema,
  participantIdSchema,
  orderItemIdSchema,
  cartParamsSchema
} from '../validation/orderValidation';

const router = Router();

// Order management routes
router.post(
  '/',
  authMiddleware,
  validateRequest({ body: createOrderSchema }),
  orderController.createOrder.bind(orderController)
);

router.get(
  '/:orderId',
  authMiddleware,
  validateRequest({ params: orderIdSchema }),
  orderController.getOrder.bind(orderController)
);

router.put(
  '/:orderId/status',
  authMiddleware,
  validateRequest({ params: orderIdSchema, body: updateOrderSchema }),
  orderController.updateOrderStatus.bind(orderController)
);

router.post(
  '/:orderId/confirm',
  authMiddleware,
  validateRequest({ params: orderIdSchema }),
  orderController.confirmOrder.bind(orderController)
);

router.delete(
  '/:orderId',
  authMiddleware,
  validateRequest({ params: orderIdSchema }),
  orderController.cancelOrder.bind(orderController)
);

// Session and participant order queries
router.get(
  '/session/:sessionId',
  authMiddleware,
  validateRequest({ params: sessionIdSchema }),
  orderController.getOrdersBySession.bind(orderController)
);

router.get(
  '/participant/:participantId',
  authMiddleware,
  validateRequest({ params: participantIdSchema }),
  orderController.getOrdersByParticipant.bind(orderController)
);

// Shopping cart routes
router.get(
  '/cart/:participantId',
  authMiddleware,
  validateRequest({ params: participantIdSchema }),
  orderController.getCart.bind(orderController)
);

router.post(
  '/cart/:sessionId/:participantId/items',
  authMiddleware,
  validateRequest({ params: cartParamsSchema, body: createOrderItemSchema }),
  orderController.addItemToCart.bind(orderController)
);

router.put(
  '/cart/items/:orderItemId/quantity',
  authMiddleware,
  validateRequest({ params: orderItemIdSchema, body: updateCartItemQuantitySchema }),
  orderController.updateCartItemQuantity.bind(orderController)
);

router.delete(
  '/cart/items/:orderItemId',
  authMiddleware,
  validateRequest({ params: orderItemIdSchema }),
  orderController.removeItemFromCart.bind(orderController)
);

export { router as orderRoutes };