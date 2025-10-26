import request from 'supertest';
import { app } from '../../index';
import pool from '../../config/database';

// Mock database and Redis
jest.mock('../../config/database');
jest.mock('../../config/redis');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('Order API Integration Tests', () => {
  const mockAuthToken = 'Bearer valid-jwt-token';
  const mockSessionId = 'session-123';
  const mockParticipantId = 'participant-123';
  const mockOrderId = 'order-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/orders', () => {
    it('should create order successfully', async () => {
      const orderData = {
        sessionId: mockSessionId,
        participantId: mockParticipantId,
        items: [
          {
            menuItemId: 'item-123',
            quantity: 2,
            notes: 'No onions',
            customizations: [
              {
                customizationId: 'custom-123',
                optionId: 'option-123',
              },
            ],
          },
        ],
        notes: 'Table order',
      };

      const mockOrder = {
        id: mockOrderId,
        sessionId: mockSessionId,
        participantId: mockParticipantId,
        status: 'pending',
        notes: 'Table order',
        subtotal: 25.98,
        taxAmount: 2.60,
        totalAmount: 28.58,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [
          {
            id: 'order-item-123',
            orderId: mockOrderId,
            menuItemId: 'item-123',
            quantity: 2,
            unitPrice: 12.99,
            totalPrice: 25.98,
            notes: 'No onions',
            createdAt: new Date().toISOString(),
            customizations: [],
          },
        ],
      };

      // Mock menu item price lookup
      mockPool.query.mockResolvedValueOnce({
        rows: [{ price: 12.99 }],
      });

      // Mock customization price lookup
      mockPool.query.mockResolvedValueOnce({
        rows: [{ price_modifier: 0 }],
      });

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [mockOrder] }) // INSERT order
          .mockResolvedValueOnce({ rows: [{ price: 12.99 }] }) // Menu item price
          .mockResolvedValueOnce({ rows: [{ price_modifier: 0 }] }) // Customization price
          .mockResolvedValueOnce({ rows: [mockOrder.items[0]] }) // INSERT order item
          .mockResolvedValueOnce({}) // INSERT customization
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', mockAuthToken)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockOrderId);
      expect(response.body.data.totalAmount).toBe(28.58);
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should return 400 for invalid order data', async () => {
      const invalidData = {
        sessionId: 'invalid-uuid',
        participantId: mockParticipantId,
        items: [], // Empty items array
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 without authentication', async () => {
      const orderData = {
        sessionId: mockSessionId,
        participantId: mockParticipantId,
        items: [
          {
            menuItemId: 'item-123',
            quantity: 1,
          },
        ],
      };

      await request(app)
        .post('/api/v1/orders')
        .send(orderData)
        .expect(401);
    });
  });

  describe('GET /api/v1/orders/:orderId', () => {
    it('should return order details', async () => {
      const mockOrder = {
        id: mockOrderId,
        sessionId: mockSessionId,
        participantId: mockParticipantId,
        status: 'pending',
        notes: 'Table order',
        subtotal: 25.98,
        taxAmount: 2.60,
        totalAmount: 28.58,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockOrderItems = [
        {
          id: 'order-item-123',
          orderId: mockOrderId,
          menuItemId: 'item-123',
          quantity: 2,
          unitPrice: 12.99,
          totalPrice: 25.98,
          notes: 'No onions',
          createdAt: new Date().toISOString(),
          menuItemName: 'Caesar Salad',
          menuItemDescription: 'Fresh salad',
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockOrder] }) // Get order
        .mockResolvedValueOnce({ rows: mockOrderItems }) // Get order items
        .mockResolvedValueOnce({ rows: [] }); // Get customizations

      const response = await request(app)
        .get(`/api/v1/orders/${mockOrderId}`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockOrderId);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].menuItemName).toBe('Caesar Salad');
    });

    it('should return 404 when order not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/api/v1/orders/${mockOrderId}`)
        .set('Authorization', mockAuthToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });
  });

  describe('PUT /api/v1/orders/:orderId/status', () => {
    it('should update order status successfully', async () => {
      const updateData = {
        status: 'confirmed',
        notes: 'Order confirmed by kitchen',
      };

      const mockUpdatedOrder = {
        id: mockOrderId,
        sessionId: mockSessionId,
        participantId: mockParticipantId,
        status: 'confirmed',
        notes: 'Order confirmed by kitchen',
        subtotal: 25.98,
        taxAmount: 2.60,
        totalAmount: 28.58,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUpdatedOrder] }) // Update order
        .mockResolvedValueOnce({ rows: [] }) // Get order items
        .mockResolvedValueOnce({ rows: [] }); // Get customizations

      const response = await request(app)
        .put(`/api/v1/orders/${mockOrderId}/status`)
        .set('Authorization', mockAuthToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
      expect(response.body.data.notes).toBe('Order confirmed by kitchen');
    });

    it('should return 400 for invalid status', async () => {
      const invalidData = {
        status: 'invalid-status',
      };

      const response = await request(app)
        .put(`/api/v1/orders/${mockOrderId}/status`)
        .set('Authorization', mockAuthToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/orders/:orderId/confirm', () => {
    it('should confirm order successfully', async () => {
      const mockConfirmedOrder = {
        id: mockOrderId,
        sessionId: mockSessionId,
        participantId: mockParticipantId,
        status: 'confirmed',
        notes: null,
        subtotal: 25.98,
        taxAmount: 2.60,
        totalAmount: 28.58,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockConfirmedOrder] }) // Update order status
        .mockResolvedValueOnce({ rows: [] }) // Get order items
        .mockResolvedValueOnce({ rows: [] }); // Get customizations

      const response = await request(app)
        .post(`/api/v1/orders/${mockOrderId}/confirm`)
        .set('Authorization', mockAuthToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
      expect(response.body.message).toBe('Order confirmed and sent to kitchen');
    });
  });

  describe('Shopping Cart Endpoints', () => {
    describe('GET /api/v1/orders/cart/:participantId', () => {
      it('should return participant cart', async () => {
        const mockOrders = [
          {
            id: mockOrderId,
            sessionId: mockSessionId,
            participantId: mockParticipantId,
            status: 'pending',
            notes: null,
            subtotal: 25.98,
            taxAmount: 2.60,
            totalAmount: 28.58,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [
              {
                id: 'order-item-123',
                orderId: mockOrderId,
                menuItemId: 'item-123',
                quantity: 2,
                unitPrice: 12.99,
                totalPrice: 25.98,
                notes: null,
                createdAt: new Date().toISOString(),
                customizations: [],
              },
            ],
          },
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: mockOrders }) // Get orders by participant
          .mockResolvedValueOnce({ rows: mockOrders[0].items }) // Get order items
          .mockResolvedValueOnce({ rows: [] }); // Get customizations

        const response = await request(app)
          .get(`/api/v1/orders/cart/${mockParticipantId}`)
          .set('Authorization', mockAuthToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.orderId).toBe(mockOrderId);
        expect(response.body.data.items).toHaveLength(1);
        expect(response.body.data.totalAmount).toBe(28.58);
      });

      it('should return empty cart when no pending orders', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get(`/api/v1/orders/cart/${mockParticipantId}`)
          .set('Authorization', mockAuthToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toEqual([]);
        expect(response.body.data.totalAmount).toBe(0);
      });
    });

    describe('POST /api/v1/orders/cart/:sessionId/:participantId/items', () => {
      it('should add item to cart successfully', async () => {
        const itemData = {
          menuItemId: 'item-123',
          quantity: 1,
          notes: 'Extra cheese',
          customizations: [],
        };

        const mockOrderItem = {
          id: 'order-item-123',
          orderId: mockOrderId,
          menuItemId: 'item-123',
          quantity: 1,
          unitPrice: 12.99,
          totalPrice: 12.99,
          notes: 'Extra cheese',
          createdAt: new Date().toISOString(),
          customizations: [],
        };

        // Mock existing pending order
        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: mockOrderId }],
        });

        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ price: 12.99 }] }) // Menu item price
            .mockResolvedValueOnce({ rows: [mockOrderItem] }) // INSERT order item
            .mockResolvedValueOnce({ rows: [{ total_price: 12.99 }] }) // Get items for recalculation
            .mockResolvedValueOnce({}) // Update order totals
            .mockResolvedValueOnce({}), // COMMIT
          release: jest.fn(),
        };

        mockPool.connect.mockResolvedValueOnce(mockClient);
        mockPool.query.mockResolvedValueOnce({ rows: [] }); // Get customizations

        const response = await request(app)
          .post(`/api/v1/orders/cart/${mockSessionId}/${mockParticipantId}/items`)
          .set('Authorization', mockAuthToken)
          .send(itemData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.menuItemId).toBe('item-123');
        expect(response.body.data.quantity).toBe(1);
      });

      it('should return 400 for invalid item data', async () => {
        const invalidData = {
          menuItemId: 'invalid-uuid',
          quantity: 0, // Invalid quantity
        };

        const response = await request(app)
          .post(`/api/v1/orders/cart/${mockSessionId}/${mockParticipantId}/items`)
          .set('Authorization', mockAuthToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('PUT /api/v1/orders/cart/items/:orderItemId/quantity', () => {
      const mockOrderItemId = 'order-item-123';

      it('should update item quantity successfully', async () => {
        const quantityData = { quantity: 3 };

        const mockUpdatedItem = {
          id: mockOrderItemId,
          orderId: mockOrderId,
          menuItemId: 'item-123',
          quantity: 3,
          unitPrice: 12.99,
          totalPrice: 38.97,
          notes: null,
          createdAt: new Date().toISOString(),
          customizations: [],
        };

        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ unit_price: 12.99, order_id: mockOrderId }] }) // Get current item
            .mockResolvedValueOnce({ rows: [mockUpdatedItem] }) // Update quantity
            .mockResolvedValueOnce({ rows: [{ total_price: 38.97 }] }) // Get items for recalculation
            .mockResolvedValueOnce({}) // Update order totals
            .mockResolvedValueOnce({}), // COMMIT
          release: jest.fn(),
        };

        mockPool.connect.mockResolvedValueOnce(mockClient);
        mockPool.query.mockResolvedValueOnce({ rows: [] }); // Get customizations

        const response = await request(app)
          .put(`/api/v1/orders/cart/items/${mockOrderItemId}/quantity`)
          .set('Authorization', mockAuthToken)
          .send(quantityData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.quantity).toBe(3);
        expect(response.body.data.totalPrice).toBe(38.97);
      });

      it('should remove item when quantity is 0', async () => {
        const quantityData = { quantity: 0 };

        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ order_id: mockOrderId }] }) // Get order ID
            .mockResolvedValueOnce({ rowCount: 1 }) // Delete order item
            .mockResolvedValueOnce({ rows: [] }) // Get remaining items
            .mockResolvedValueOnce({}) // Update order totals
            .mockResolvedValueOnce({}), // COMMIT
          release: jest.fn(),
        };

        mockPool.connect.mockResolvedValueOnce(mockClient);

        const response = await request(app)
          .put(`/api/v1/orders/cart/items/${mockOrderItemId}/quantity`)
          .set('Authorization', mockAuthToken)
          .send(quantityData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Item removed from cart');
      });
    });

    describe('DELETE /api/v1/orders/cart/items/:orderItemId', () => {
      const mockOrderItemId = 'order-item-123';

      it('should remove item from cart successfully', async () => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [{ order_id: mockOrderId }] }) // Get order ID
            .mockResolvedValueOnce({ rowCount: 1 }) // Delete order item
            .mockResolvedValueOnce({ rows: [] }) // Get remaining items
            .mockResolvedValueOnce({}) // Update order totals
            .mockResolvedValueOnce({}), // COMMIT
          release: jest.fn(),
        };

        mockPool.connect.mockResolvedValueOnce(mockClient);

        const response = await request(app)
          .delete(`/api/v1/orders/cart/items/${mockOrderItemId}`)
          .set('Authorization', mockAuthToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Item removed from cart successfully');
      });

      it('should return 404 when item not found', async () => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({}) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // Order item not found
            .mockResolvedValueOnce({}), // ROLLBACK
          release: jest.fn(),
        };

        mockPool.connect.mockResolvedValueOnce(mockClient);

        const response = await request(app)
          .delete(`/api/v1/orders/cart/items/${mockOrderItemId}`)
          .set('Authorization', mockAuthToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Order item not found');
      });
    });
  });
});