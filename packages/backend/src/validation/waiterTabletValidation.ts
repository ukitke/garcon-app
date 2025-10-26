import Joi from 'joi';

export const waiterLocationParamsSchema = Joi.object({
  waiterId: Joi.string().uuid().required(),
  locationId: Joi.string().uuid().required()
});

export const locationIdParamSchema = Joi.object({
  locationId: Joi.string().uuid().required()
});

export const waiterIdParamSchema = Joi.object({
  waiterId: Joi.string().uuid().required()
});

export const orderIdParamSchema = Joi.object({
  orderId: Joi.string().uuid().required()
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'preparing', 'ready', 'delivered', 'cancelled').required(),
  notes: Joi.string().max(500).optional()
});

export const markOrderDeliveredSchema = Joi.object({
  tableNumber: Joi.string().min(1).max(10).required()
});

export const kitchenNotificationSchema = Joi.object({
  message: Joi.string().min(1).max(500).required(),
  priority: Joi.string().valid('low', 'medium', 'high').optional()
});

export const performanceMetricsQuerySchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month').optional()
});