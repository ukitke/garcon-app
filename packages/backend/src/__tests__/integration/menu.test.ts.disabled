import request from 'supertest';
import { app } from '../../index';
import pool from '../../config/database';

// Mock database and Redis
jest.mock('../../config/database');
jest.mock('../../config/redis');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('Menu API Integration Tests', () => {
  const mockLocationId = 'location-123';
  const mockAuthToken = 'Bearer valid-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/menu/:locationId/categories', () => {
    it('should create a menu category successfully', async () => {
      const categoryData = {
        name: 'Appetizers',
        description: 'Delicious starters',
        displayOrder: 1,
      };

      const mockCategory = {
        id: 'category-123',
        locationId: mockLocationId,
        name: 'Appetizers',
        description: 'Delicious starters',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockCategory],
      });

      const response = await request(app)
        .post(`/api/v1/menu/${mockLocationId}/categories`)
        .set('Authorization', mockAuthToken)
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Appetizers');
      expect(response.body.data.description).toBe('Delicious starters');
    });

    it('should return 400 for invalid category data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        displayOrder: -1, // Negative order should fail
      };

      const response = await request(app)
        .post(`/api/v1/menu/${mockLocationId}/categories`)
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 without authentication', async () => {
      const categoryData = {
        name: 'Appetizers',
        description: 'Delicious starters',
      };

      await request(app)
        .post(`/api/v1/menu/${mockLocationId}/categories`)
        .send(categoryData)
        .expect(401);
    });
  });

  describe('GET /api/v1/menu/:locationId/categories', () => {
    it('should return categories for a location', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          locationId: mockLocationId,
          name: 'Appetizers',
          description: 'Starters',
          displayOrder: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'category-2',
          locationId: mockLocationId,
          name: 'Main Courses',
          description: 'Main dishes',
          displayOrder: 2,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockCategories,
      });

      const response = await request(app)
        .get(`/api/v1/menu/${mockLocationId}/categories`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Appetizers');
      expect(response.body.data[1].name).toBe('Main Courses');
    });

    it('should return empty array when no categories exist', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .get(`/api/v1/menu/${mockLocationId}/categories`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/v1/menu/:locationId/items', () => {
    it('should create a menu item successfully', async () => {
      const itemData = {
        categoryId: 'category-123',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with caesar dressing',
        price: 12.99,
        allergens: ['gluten', 'dairy'],
        displayOrder: 1,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Mock the transaction
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [mockMenuItem] }) // INSERT
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const response = await request(app)
        .post(`/api/v1/menu/${mockLocationId}/items`)
        .set('Authorization', mockAuthToken)
        .send(itemData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Caesar Salad');
      expect(response.body.data.price).toBe(12.99);
    });

    it('should create menu item with customizations', async () => {
      const itemDataWithCustomizations = {
        categoryId: 'category-123',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce',
        price: 12.99,
        customizations: [
          {
            name: 'Dressing Choice',
            type: 'single_choice',
            isRequired: true,
            options: [
              { name: 'Caesar', priceModifier: 0 },
              { name: 'Ranch', priceModifier: 0.5 },
            ],
          },
        ],
      };

      const mockMenuItem = {
        id: 'item-123',
        locationId: mockLocationId,
        categoryId: 'category-123',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce',
        price: 12.99,
        imageUrl: null,
        allergens: [],
        isAvailable: true,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [mockMenuItem] }) // INSERT item
          .mockResolvedValueOnce({ rows: [{ id: 'customization-123' }] }) // INSERT customization
          .mockResolvedValueOnce({}) // INSERT option 1
          .mockResolvedValueOnce({}) // INSERT option 2
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const response = await request(app)
        .post(`/api/v1/menu/${mockLocationId}/items`)
        .set('Authorization', mockAuthToken)
        .send(itemDataWithCustomizations)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Caesar Salad');
    });

    it('should return 400 for invalid menu item data', async () => {
      const invalidData = {
        name: '', // Empty name
        price: -5, // Negative price
      };

      const response = await request(app)
        .post(`/api/v1/menu/${mockLocationId}/items`)
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/menu/:locationId', () => {
    it('should return complete menu with categories and items', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          locationId: mockLocationId,
          name: 'Appetizers',
          description: 'Starters',
          displayOrder: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockCategories }) // Get categories
        .mockResolvedValueOnce({ rows: mockItems }) // Get items
        .mockResolvedValueOnce({ rows: [] }); // Get customizations

      const response = await request(app)
        .get(`/api/v1/menu/${mockLocationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(1);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].customizations).toEqual([]);
    });
  });

  describe('PUT /api/v1/menu/:locationId/items/:itemId', () => {
    const mockItemId = 'item-123';

    it('should update menu item successfully', async () => {
      const updateData = {
        name: 'Updated Caesar Salad',
        price: 14.99,
        isAvailable: false,
      };

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedItem],
      });

      const response = await request(app)
        .put(`/api/v1/menu/${mockLocationId}/items/${mockItemId}`)
        .set('Authorization', mockAuthToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Caesar Salad');
      expect(response.body.data.price).toBe(14.99);
      expect(response.body.data.isAvailable).toBe(false);
    });

    it('should return 404 when item not found', async () => {
      const updateData = {
        name: 'Updated Caesar Salad',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .put(`/api/v1/menu/${mockLocationId}/items/${mockItemId}`)
        .set('Authorization', mockAuthToken)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Menu item not found');
    });
  });

  describe('DELETE /api/v1/menu/:locationId/items/:itemId', () => {
    const mockItemId = 'item-123';

    it('should delete menu item successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
      });

      const response = await request(app)
        .delete(`/api/v1/menu/${mockLocationId}/items/${mockItemId}`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Menu item deleted successfully');
    });

    it('should return 404 when item not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 0,
      });

      const response = await request(app)
        .delete(`/api/v1/menu/${mockLocationId}/items/${mockItemId}`)
        .set('Authorization', mockAuthToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Menu item not found');
    });
  });
});