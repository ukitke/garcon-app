import Joi from 'joi';

export const createOrderItemCustomizationSchema = Joi.object({
  customizationId: Joi.string().uuid().required(),
  optionId: Joi.string().uuid().optional(),
  customValue: Joi.string().max(200).optional()
});

export const createOrderItemSchema = Joi.object({
  menuItemId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).max(50).required(),
  notes: Joi.string().max(200).optional(),
  customizations: Joi.array().items(createOrderItemCustomizationSchema).optional()
});

export const createOrderSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  participantId: Joi.string().uuid().required(),
  items: Joi.array().items(createOrderItemSchema).min(1).required(),
  notes: Joi.string().max(500).optional()
});

export const updateOrderSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled').optional(),
  notes: Joi.string().max(500).optional()
});

export const updateCartItemQuantitySchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(50).required()
});

export const orderIdSchema = Joi.object({
  orderId: Joi.string().uuid().required()
});

export const sessionIdSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

export const participantIdSchema = Joi.object({
  participantId: Joi.string().uuid().required()
});

export const orderItemIdSchema = Joi.object({
  orderItemId: Joi.string().uuid().required()
});

export const cartParamsSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  participantId: Joi.string().uuid().required()
});