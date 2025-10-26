import { Request, Response } from 'express';
import { menuService } from '../services/menuService';
import { fileStorageService } from '../services/fileStorageService';
import { 
  CreateMenuCategoryRequest, 
  UpdateMenuCategoryRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest
} from '../types/menu';

export class MenuController {
  // Categories
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const categoryData: CreateMenuCategoryRequest = req.body;

      const category = await menuService.createCategory(locationId, categoryData);
      
      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error creating menu category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create menu category'
      });
    }
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const categories = await menuService.getCategoriesByLocation(locationId);
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching menu categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu categories'
      });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, categoryId } = req.params;
      const updateData: UpdateMenuCategoryRequest = req.body;

      const category = await menuService.updateCategory(categoryId, locationId, updateData);
      
      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error updating menu category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update menu category'
      });
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, categoryId } = req.params;

      const deleted = await menuService.deleteCategory(categoryId, locationId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting menu category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu category'
      });
    }
  }

  // Menu Items
  async createMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const itemData: CreateMenuItemRequest = req.body;

      const item = await menuService.createMenuItem(locationId, itemData);
      
      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('Error creating menu item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create menu item'
      });
    }
  }

  async getMenu(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const menu = await menuService.getMenuByLocation(locationId);
      
      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      console.error('Error fetching menu:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu'
      });
    }
  }

  async getMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, itemId } = req.params;

      const item = await menuService.getMenuItem(itemId, locationId);
      
      if (!item) {
        res.status(404).json({
          success: false,
          error: 'Menu item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('Error fetching menu item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu item'
      });
    }
  }

  async updateMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, itemId } = req.params;
      const updateData: UpdateMenuItemRequest = req.body;

      const item = await menuService.updateMenuItem(itemId, locationId, updateData);
      
      if (!item) {
        res.status(404).json({
          success: false,
          error: 'Menu item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('Error updating menu item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update menu item'
      });
    }
  }

  async deleteMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, itemId } = req.params;

      const deleted = await menuService.deleteMenuItem(itemId, locationId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Menu item not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Menu item deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete menu item'
      });
    }
  }

  async uploadItemImage(req: Request, res: Response): Promise<void> {
    try {
      const { locationId, itemId } = req.params;
      
      if (!(req as any).file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
        return;
      }

      // Upload image using file storage service
      const uploadResult = await fileStorageService.uploadMenuImage((req as any).file);
      
      const item = await menuService.updateMenuItemImage(itemId, locationId, uploadResult.url);
      
      if (!item) {
        res.status(404).json({
          success: false,
          error: 'Menu item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          imageUrl: uploadResult.url,
          uploadInfo: uploadResult,
          item
        }
      });
    } catch (error) {
      console.error('Error uploading menu item image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload image'
      });
    }
  }
}

export const menuController = new MenuController();