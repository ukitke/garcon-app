import { Pool } from 'pg';
import { 
  MenuCategory, 
  MenuItem, 
  MenuCustomization,
  CustomizationOption,
  CreateMenuCategoryRequest,
  UpdateMenuCategoryRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  CreateMenuCustomizationRequest,
  MenuResponse
} from '../types/menu';
import { getPool } from '../config/database';

export class MenuService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  // Menu Categories
  async createCategory(locationId: string, categoryData: CreateMenuCategoryRequest): Promise<MenuCategory> {
    const query = `
      INSERT INTO menu_categories (location_id, name, description, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING id, location_id as "locationId", name, description, display_order as "displayOrder", 
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const values = [
      locationId,
      categoryData.name,
      categoryData.description || null,
      categoryData.displayOrder || 0
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getCategoriesByLocation(locationId: string): Promise<MenuCategory[]> {
    const query = `
      SELECT id, location_id as "locationId", name, description, display_order as "displayOrder",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM menu_categories
      WHERE location_id = $1 AND is_active = true
      ORDER BY display_order ASC, name ASC
    `;

    const result = await this.pool.query(query, [locationId]);
    return result.rows;
  }

  async updateCategory(categoryId: string, locationId: string, updateData: UpdateMenuCategoryRequest): Promise<MenuCategory | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updateData.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      setClauses.push(`description = $${paramCount++}`);
      values.push(updateData.description);
    }
    if (updateData.displayOrder !== undefined) {
      setClauses.push(`display_order = $${paramCount++}`);
      values.push(updateData.displayOrder);
    }
    if (updateData.isActive !== undefined) {
      setClauses.push(`is_active = $${paramCount++}`);
      values.push(updateData.isActive);
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(categoryId, locationId);

    const query = `
      UPDATE menu_categories 
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount++} AND location_id = $${paramCount++}
      RETURNING id, location_id as "locationId", name, description, display_order as "displayOrder",
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async deleteCategory(categoryId: string, locationId: string): Promise<boolean> {
    const query = `
      UPDATE menu_categories 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND location_id = $2
    `;

    const result = await this.pool.query(query, [categoryId, locationId]);
    return result.rowCount > 0;
  }

  // Menu Items
  async createMenuItem(locationId: string, itemData: CreateMenuItemRequest): Promise<MenuItem> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert menu item
      const itemQuery = `
        INSERT INTO menu_items (location_id, category_id, name, description, price, allergens, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, location_id as "locationId", category_id as "categoryId", name, description, 
                  price, image_url as "imageUrl", allergens, is_available as "isAvailable",
                  display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"
      `;

      const itemValues = [
        locationId,
        itemData.categoryId || null,
        itemData.name,
        itemData.description || null,
        itemData.price,
        itemData.allergens || [],
        itemData.displayOrder || 0
      ];

      const itemResult = await client.query(itemQuery, itemValues);
      const menuItem = itemResult.rows[0];

      // Insert customizations if provided
      if (itemData.customizations && itemData.customizations.length > 0) {
        for (const customization of itemData.customizations) {
          await this.createCustomization(client, menuItem.id, customization);
        }
      }

      await client.query('COMMIT');
      return menuItem;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMenuByLocation(locationId: string): Promise<MenuResponse> {
    // Get categories
    const categories = await this.getCategoriesByLocation(locationId);

    // Get all menu items for the location
    const itemsQuery = `
      SELECT mi.id, mi.location_id as "locationId", mi.category_id as "categoryId", 
             mi.name, mi.description, mi.price, mi.image_url as "imageUrl", 
             mi.allergens, mi.is_available as "isAvailable", mi.display_order as "displayOrder",
             mi.created_at as "createdAt", mi.updated_at as "updatedAt"
      FROM menu_items mi
      WHERE mi.location_id = $1 AND mi.is_available = true
      ORDER BY mi.display_order ASC, mi.name ASC
    `;

    const itemsResult = await this.pool.query(itemsQuery, [locationId]);
    const items = itemsResult.rows;

    // Get customizations for all items
    if (items.length > 0) {
      const itemIds = items.map(item => item.id);
      const customizations = await this.getCustomizationsByItemIds(itemIds);
      
      // Group customizations by item ID
      const customizationsByItem = customizations.reduce((acc, customization) => {
        if (!acc[customization.menuItemId]) {
          acc[customization.menuItemId] = [];
        }
        acc[customization.menuItemId].push(customization);
        return acc;
      }, {} as Record<string, MenuCustomization[]>);

      // Attach customizations to items
      items.forEach(item => {
        item.customizations = customizationsByItem[item.id] || [];
      });
    }

    return { categories, items };
  }

  async getMenuItem(itemId: string, locationId: string): Promise<MenuItem | null> {
    const query = `
      SELECT id, location_id as "locationId", category_id as "categoryId", name, description,
             price, image_url as "imageUrl", allergens, is_available as "isAvailable",
             display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"
      FROM menu_items
      WHERE id = $1 AND location_id = $2
    `;

    const result = await this.pool.query(query, [itemId, locationId]);
    if (result.rows.length === 0) {
      return null;
    }

    const item = result.rows[0];
    item.customizations = await this.getCustomizationsByItemIds([itemId]);
    
    return item;
  }

  async updateMenuItem(itemId: string, locationId: string, updateData: UpdateMenuItemRequest): Promise<MenuItem | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updateData.categoryId !== undefined) {
      setClauses.push(`category_id = $${paramCount++}`);
      values.push(updateData.categoryId);
    }
    if (updateData.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      setClauses.push(`description = $${paramCount++}`);
      values.push(updateData.description);
    }
    if (updateData.price !== undefined) {
      setClauses.push(`price = $${paramCount++}`);
      values.push(updateData.price);
    }
    if (updateData.allergens !== undefined) {
      setClauses.push(`allergens = $${paramCount++}`);
      values.push(updateData.allergens);
    }
    if (updateData.isAvailable !== undefined) {
      setClauses.push(`is_available = $${paramCount++}`);
      values.push(updateData.isAvailable);
    }
    if (updateData.displayOrder !== undefined) {
      setClauses.push(`display_order = $${paramCount++}`);
      values.push(updateData.displayOrder);
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(itemId, locationId);

    const query = `
      UPDATE menu_items 
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount++} AND location_id = $${paramCount++}
      RETURNING id, location_id as "locationId", category_id as "categoryId", name, description,
                price, image_url as "imageUrl", allergens, is_available as "isAvailable",
                display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async updateMenuItemImage(itemId: string, locationId: string, imageUrl: string): Promise<MenuItem | null> {
    const query = `
      UPDATE menu_items 
      SET image_url = $1, updated_at = NOW()
      WHERE id = $2 AND location_id = $3
      RETURNING id, location_id as "locationId", category_id as "categoryId", name, description,
                price, image_url as "imageUrl", allergens, is_available as "isAvailable",
                display_order as "displayOrder", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, [imageUrl, itemId, locationId]);
    return result.rows[0] || null;
  }

  async deleteMenuItem(itemId: string, locationId: string): Promise<boolean> {
    const query = `
      UPDATE menu_items 
      SET is_available = false, updated_at = NOW()
      WHERE id = $1 AND location_id = $2
    `;

    const result = await this.pool.query(query, [itemId, locationId]);
    return result.rowCount > 0;
  }

  // Private helper methods
  private async createCustomization(client: any, menuItemId: string, customizationData: CreateMenuCustomizationRequest): Promise<void> {
    const customizationQuery = `
      INSERT INTO menu_customizations (menu_item_id, name, type, is_required, display_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const customizationValues = [
      menuItemId,
      customizationData.name,
      customizationData.type,
      customizationData.isRequired || false,
      customizationData.displayOrder || 0
    ];

    const customizationResult = await client.query(customizationQuery, customizationValues);
    const customizationId = customizationResult.rows[0].id;

    // Insert options if provided
    if (customizationData.options && customizationData.options.length > 0) {
      for (const option of customizationData.options) {
        const optionQuery = `
          INSERT INTO customization_options (customization_id, name, price_modifier, display_order)
          VALUES ($1, $2, $3, $4)
        `;

        const optionValues = [
          customizationId,
          option.name,
          option.priceModifier || 0,
          option.displayOrder || 0
        ];

        await client.query(optionQuery, optionValues);
      }
    }
  }

  private async getCustomizationsByItemIds(itemIds: string[]): Promise<MenuCustomization[]> {
    if (itemIds.length === 0) return [];

    const query = `
      SELECT mc.id, mc.menu_item_id as "menuItemId", mc.name, mc.type, 
             mc.is_required as "isRequired", mc.display_order as "displayOrder", mc.created_at as "createdAt",
             co.id as "optionId", co.name as "optionName", co.price_modifier as "optionPriceModifier",
             co.display_order as "optionDisplayOrder", co.is_available as "optionIsAvailable"
      FROM menu_customizations mc
      LEFT JOIN customization_options co ON mc.id = co.customization_id AND co.is_available = true
      WHERE mc.menu_item_id = ANY($1)
      ORDER BY mc.display_order ASC, co.display_order ASC
    `;

    const result = await this.pool.query(query, [itemIds]);
    
    // Group results by customization
    const customizationsMap = new Map<string, MenuCustomization>();
    
    result.rows.forEach(row => {
      if (!customizationsMap.has(row.id)) {
        customizationsMap.set(row.id, {
          id: row.id,
          menuItemId: row.menuItemId,
          name: row.name,
          type: row.type,
          isRequired: row.isRequired,
          displayOrder: row.displayOrder,
          createdAt: row.createdAt,
          options: []
        });
      }

      const customization = customizationsMap.get(row.id)!;
      
      if (row.optionId) {
        customization.options!.push({
          id: row.optionId,
          customizationId: row.id,
          name: row.optionName,
          priceModifier: row.optionPriceModifier,
          displayOrder: row.optionDisplayOrder,
          isAvailable: row.optionIsAvailable,
          createdAt: row.createdAt
        });
      }
    });

    return Array.from(customizationsMap.values());
  }
}

export const menuService = new MenuService();