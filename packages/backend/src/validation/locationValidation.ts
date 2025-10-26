import Joi from 'joi';

export const locationDetectionSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(1).max(1000).optional()
});

export const checkinSchema = Joi.object({
  tableNumber: Joi.string().trim().min(1).max(10).required()
});

export const createLocationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  address: Joi.string().trim().min(1).max(500).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  settings: Joi.object({
    coverageRadius: Joi.number().min(10).max(500).optional(),
    autoAcceptOrders: Joi.boolean().optional(),
    operatingHours: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        open: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        close: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        isOpen: Joi.boolean().required()
      })
    ).optional(),
    maxTableCapacity: Joi.number().min(1).max(50).optional()
  }).optional()
});

export const updateLocationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  address: Joi.string().trim().min(1).max(500).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  isActive: Joi.boolean().optional(),
  settings: Joi.object({
    coverageRadius: Joi.number().min(10).max(500).optional(),
    autoAcceptOrders: Joi.boolean().optional(),
    operatingHours: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        open: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        close: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        isOpen: Joi.boolean().required()
      })
    ).optional(),
    maxTableCapacity: Joi.number().min(1).max(50).optional()
  }).optional()
}).min(1); // At least one field must be provided