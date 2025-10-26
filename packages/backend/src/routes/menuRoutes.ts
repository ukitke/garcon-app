import { Router } from 'express';
import { menuController } from '../controllers/menuController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  locationIdSchema,
  categoryIdSchema,
  itemIdSchema
} from '../validation/menuValidation';

const router = Router();

// Simple file upload middleware placeholder
// In production, this would use multer or similar
const uploadMiddleware = (req: any, res: any, next: any) => {
  // Placeholder for file upload handling
  // This would be replaced with proper multer configuration
  next();
};

// Menu Categories Routes
router.post(
  '/:locationId/categories',
  authMiddleware,
  validateRequest({ params: locationIdSchema, body: createMenuCategorySchema }),
  menuController.createCategory.bind(menuController)
);

router.get(
  '/:locationId/categories',
  validateRequest({ params: locationIdSchema }),
  menuController.getCategories.bind(menuController)
);

router.put(
  '/:locationId/categories/:categoryId',
  authMiddleware,
  validateRequest({ params: categoryIdSchema, body: updateMenuCategorySchema }),
  menuController.updateCategory.bind(menuController)
);

router.delete(
  '/:locationId/categories/:categoryId',
  authMiddleware,
  validateRequest({ params: categoryIdSchema }),
  menuController.deleteCategory.bind(menuController)
);

// Menu Items Routes
router.post(
  '/:locationId/items',
  authMiddleware,
  validateRequest({ params: locationIdSchema, body: createMenuItemSchema }),
  menuController.createMenuItem.bind(menuController)
);

router.get(
  '/:locationId',
  validateRequest({ params: locationIdSchema }),
  menuController.getMenu.bind(menuController)
);

router.get(
  '/:locationId/items/:itemId',
  validateRequest({ params: itemIdSchema }),
  menuController.getMenuItem.bind(menuController)
);

router.put(
  '/:locationId/items/:itemId',
  authMiddleware,
  validateRequest({ params: itemIdSchema, body: updateMenuItemSchema }),
  menuController.updateMenuItem.bind(menuController)
);

router.delete(
  '/:locationId/items/:itemId',
  authMiddleware,
  validateRequest({ params: itemIdSchema }),
  menuController.deleteMenuItem.bind(menuController)
);

// Image Upload Route (placeholder - requires multer in production)
router.post(
  '/:locationId/items/:itemId/image',
  authMiddleware,
  validateRequest({ params: itemIdSchema }),
  uploadMiddleware,
  menuController.uploadItemImage.bind(menuController)
);

export { router as menuRoutes };