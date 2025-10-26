import { MenuService } from '../../services/menuService';
import { getPool } from '../../config/database';

// Mock dependencies
jest.mock('../../config/database');

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

(getPool as jest.Mock).mockReturnValue(mockPool);

describe('MenuService', () => {
  let menuService: MenuService;

  beforeEach(() => {
    menuService = new MenuService();
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('createCategory', () => {
    const mockLocationId = 'location-123';
    const mockCategoryData = {
      name: 'Appetizers',
      description: 'Delicious starters',
      displayOrder: 1,
    };

    it('should create a menu category successfully', async () => {
      const mockCategory = {
        id: 'category-123',
        locationId: mockLocationId,
        name: 'Appetizers',
        description: 'Delicious starters',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockCategory],
      });

      const result = await menuService.createCategory(mockLocationId, mockCategoryData);

      expect(result).toEqual(mockCategory);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_categories'),
        [mockLocationId, 'Appetizers', 'Delicious starters', 1]
      );
    });

    it('should create category with default values', async () => {
      const minimalData = { name: 'Main Courses' };
      const mockCategory = {
        id: 'category-456',
        locationId: mockLocationId,
        name: 'Main Courses',
        description: null,
        displayOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockCategory],
      });

      const result = await menuService.createCategory(mockLocationId, minimalData);

      expect(result).toEqual(mockCategory);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO menu_categories'),
        [mockLocationId, 'Main Courses', null, 0]
      );
    });
  });

  describe('getCategoriesByLocation', () => {
    const mockLocationId = 'location-123';

    it('should return categories for a location', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          locationId: mockLocationId,
          name: 'Appetizers',
          description: 'Starters',
          displayOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'category-2',
          locationId: mockLocationId,
          name: 'Main Courses',
          description: 'Main dishes',
          displayOrder: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockCategories,
      });

      const result = await menuService.getCategoriesByLocation(mockLocationId);

      expect(result).toEqual(mockCategories);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, location_id'),
        [mockLocationId]
      );
    });

    it('should return empty array when no categories exist', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await menuService.getCategoriesByLocation(mockLocationId);

      expect(result).toEqual([]);
    });
  });

  describe('createMenuItem', () => {
    const mockLocationId = 'location-123';
    const mockItemData = {
      categoryId: 'category-123',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with caesar dressing',
      price: 12.99,
      allergens: ['gluten', 'dairy'],
      displayOrder: 1,
    };

    it('should create a menu item successfully', async () => {
      const mockMenuItem = {
        id: 'item-123',
        locationId: mockLocationId,
        categoryId: 'category-123',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with caesar dressing',
        price: 12.99,
        imageUrl: null,
        allergens: ['gluten', 'dairy'],
        isAvailable: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockMenuItem] }) // INSERT menu item
        .mockResolvedValueOnce({}); // COMMIT

      const result = await menuService.createMenuItem(mockLocationId, mockItemData);

      expect(result).toEqual(mockMenuItem);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create menu item with customizations', async () => {
      const itemDataWithCustomizations = {
        ...mockItemData,
        customizations: [
          {
            name: 'Dressing Choice',
            type: 'single_choice' as const,
            isRequired: true,
            displayOrder: 1,
            options: [
              { name: 'Caesar', priceModifier: 0, displayOrder: 1 },
              { name: 'Ranch', priceModifier: 0.5, displayOrder: 2 },
            ],
          },
        ],
      };

      const mockMenuItem = {
        id: 'item-123',
        locationId: mockLocationId,
        categoryId: 'category-123',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with caesar dressing',
        price: 12.99,
        imageUrl: null,
        allergens: ['gluten', 'dairy'],
        isAvailable: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockMenuItem] }) // INSERT menu item
        .mockResolvedValueOnce({ rows: [{ id: 'customization-123' }] }) // INSERT customization
        .mockResolvedValueOnce({}) // INSERT option 1
        .mockResolvedValueOnce({}) // INSERT option 2
        .mockResolvedValueOnce({}); // COMMIT

      const result = await menuService.createMenuItem(mockLocationId, itemDataWithCustomizations);

      expect(result).toEqual(mockMenuItem);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails

      await expect(
        menuService.createMenuItem(mockLocationId, mockItemData)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getMenuByLocation', () => {
    const mockLocationId = 'location-123';

    it('should return complete menu with categories and items', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          locationId: mockLocationId,
          name: 'Appetizers',
          description: 'Starters',
          displayOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockItems = [
        {
          id: 'item-1',
          locationId: mockLocationId,
          categoryId: 'category-1',
          name: 'Caesar Salad',
          description: 'Fresh salad',
          price: 12.99,
          imageUrl: null,
          allergens: ['gluten'],
          isAvailable: true,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock getCategoriesByLocation
      menuService.getCategoriesByLocation = jest.fn().mockResolvedValue(mockCategories);

      mockPool.query
        .mockResolvedValueOnce({ rows: mockItems }) // Get items
        .mockResolvedValueOnce({ rows: [] }); // Get customizations

      const result = await menuService.getMenuByLocation(mockLocationId);

      expect(result.categories).toEqual(mockCategories);
      expect(result.items).toEqual(mockItems.map(item => ({ ...item, customizations: [] })));
    });

    it('should return empty menu when no items exist', async () => {
      const mockCategories = [];

      menuService.getCategoriesByLocation = jest.fn().mockResolvedValue(mockCategories);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await menuService.getMenuByLocation(mockLocationId);

      expect(result.categories).toEqual([]);
      expect(result.items).toEqual([]);
    });
  });

  describe('updateMenuItem', () => {
    const mockItemId = 'item-123';
    const mockLocationId = 'location-123';
    const mockUpdateData = {
      name: 'Updated Caesar Salad',
      price: 14.99,
      isAvailable: false,
    };

    it('should update menu item successfully', async () => {
      const mockUpdatedItem = {
        id: mockItemId,
        locationId: mockLocationId,
        categoryId: 'category-123',
        name: 'Updated Caesar Salad',
        description: 'Fresh salad',
        price: 14.99,
        imageUrl: null,
        allergens: ['gluten'],
        isAvailable: false,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedItem],
      });

      const result = await menuService.updateMenuItem(mockItemId, mockLocationId, mockUpdateData);

      expect(result).toEqual(mockUpdatedItem);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE menu_items'),
        expect.arrayContaining(['Updated Caesar Salad', 14.99, false, mockItemId, mockLocationId])
      );
    });

    it('should return null when item not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await menuService.updateMenuItem(mockItemId, mockLocationId, mockUpdateData);

      expect(result).toBeNull();
    });

    it('should return null when no update data provided', async () => {
      const result = await menuService.updateMenuItem(mockItemId, mockLocationId, {});

      expect(result).toBeNull();
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('deleteMenuItem', () => {
    const mockItemId = 'item-123';
    const mockLocationId = 'location-123';

    it('should soft delete menu item successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
      });

      const result = await menuService.deleteMenuItem(mockItemId, mockLocationId);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE menu_items SET is_available = false'),
        [mockItemId, mockLocationId]
      );
    });

    it('should return false when item not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 0,
      });

      const result = await menuService.deleteMenuItem(mockItemId, mockLocationId);

      expect(result).toBe(false);
    });
  });

  describe('updateMenuItemImage', () => {
    const mockItemId = 'item-123';
    const mockLocationId = 'location-123';
    const mockImageUrl = '/uploads/menu/image.jpg';

    it('should update menu item image successfully', async () => {
      const mockUpdatedItem = {
        id: mockItemId,
        locationId: mockLocationId,
        categoryId: 'category-123',
        name: 'Caesar Salad',
        description: 'Fresh salad',
        price: 12.99,
        imageUrl: mockImageUrl,
        allergens: ['gluten'],
        isAvailable: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedItem],
      });

      const result = await menuService.updateMenuItemImage(mockItemId, mockLocationId, mockImageUrl);

      expect(result).toEqual(mockUpdatedItem);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE menu_items SET image_url'),
        [mockImageUrl, mockItemId, mockLocationId]
      );
    });

    it('should return null when item not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await menuService.updateMenuItemImage(mockItemId, mockLocationId, mockImageUrl);

      expect(result).toBeNull();
    });
  });
});