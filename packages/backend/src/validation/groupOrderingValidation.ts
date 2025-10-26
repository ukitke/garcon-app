import Joi from 'joi';

export const joinSessionSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  customFantasyName: Joi.string().min(1).max(50).optional()
});

export const updateFantasyNameSchema = Joi.object({
  fantasyName: Joi.string().min(1).max(50).required()
});

export const transferOrderSchema = Joi.object({
  fromParticipantId: Joi.string().uuid().required(),
  toParticipantId: Joi.string().uuid().required()
});

export const sessionIdParamSchema = Joi.object({
  sessionId: Joi.string().uuid().required()
});

export const participantIdParamSchema = Joi.object({
  participantId: Joi.string().uuid().required()
});

export const orderIdParamSchema = Joi.object({
  orderId: Joi.string().uuid().required()
});