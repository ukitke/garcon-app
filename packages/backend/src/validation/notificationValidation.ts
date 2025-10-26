import Joi from 'joi';

export const createWaiterCallSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  participantId: Joi.string().uuid().required(),
  callType: Joi.string().valid('assistance', 'bill', 'complaint').required(),
  message: Joi.string().max(500).optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional()
});

export const acknowledgeCallSchema = Joi.object({
  waiterId: Joi.string().uuid().required(),
  estimatedArrivalTime: Joi.number().integer().min(1).max(60).optional()
});

export const resolveCallSchema = Joi.object({
  waiterId: Joi.string().uuid().required(),
  resolution: Joi.string().min(1).max(1000).required(),
  customerSatisfaction: Joi.number().integer().min(1).max(5).optional()
});

export const updateWaiterStatusSchema = Joi.object({
  locationId: Joi.string().uuid().required(),
  status: Joi.string().valid('available', 'busy', 'break', 'offline').required(),
  currentCalls: Joi.array().items(Joi.string().uuid()).optional()
});

export const locationIdParamSchema = Joi.object({
  locationId: Joi.string().uuid().required()
});

export const callIdParamSchema = Joi.object({
  callId: Joi.string().uuid().required()
});

export const waiterIdParamSchema = Joi.object({
  waiterId: Joi.string().uuid().required()
});

export const callHistoryQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  status: Joi.string().valid('pending', 'acknowledged', 'in_progress', 'resolved', 'cancelled').optional(),
  callType: Joi.string().valid('assistance', 'bill', 'complaint', 'order_ready').optional()
});