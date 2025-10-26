import Joi from 'joi';

export const createMenuCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  displayOrder: Joi.number().integer().min(0).optional()
});

export const updateMenuCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional()
});

export const createCustomizationOptionSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  priceModifier: Joi.number().min(-999.99).max(999.99).optional(),
  displayOrder: Joi.number().integer().min(0).optional()
});

export const createMenuCustomizationSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('single_choice', 'multiple_choice', 'text_input').required(),
  isRequired: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  options: Joi.array().items(createCustomizationOptionSchema).optional()
});

export const createMenuItemSchema = Joi.object({
  categoryId: Joi.string().uuid().optional(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).max(9999.99).required(),
  allergens: Joi.array().items(Joi.string().max(50)).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  customizations: Joi.array().items(createMenuCustomizationSchema).optional()
});

export const updateMenuItemSchema = Joi.object({
  categoryId: Joi.string().uuid().optional(),
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).max(9999.99).optional(),
  allergens: Joi.array().items(Joi.string().max(50)).optional(),
  isAvailable: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional()
});

export const locationIdSchema = Joi.object({
  locationId: Joi.string().uuid().required()
});

export const categoryIdSchema = Joi.object({
  locationId: Joi.string().uuid().required(),
  categoryId: Joi.string().uuid().required()
});

export const itemIdSchema = Joi.object({
  locationId: Joi.string().uuid().required(),
  itemId: Joi.string().uuid().required()
});