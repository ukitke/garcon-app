import { OrderService } from '../../services/orderService';
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

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService();
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('createOrder', () => {
    const mockOrderData = {
      sessionId: 'session-123',
      participantId: 'participant-123',
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

    it('should create order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        sessionId: 'session-123',
        participantId: 'participant-123',
        status: 'pending',
        notes: 'Table order',
        subtotal: 25.98,
        taxAmount: 2.60,
        totalAmount: 28.58,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOrderItem = {
        id: 'order-item-123',
        orderId: 'order-123',
        menuItemId: 'item-123',
        quantity: 2,
        unitPrice: 12.99,
        totalPrice: 25.98,
        notes: 'No onions',
        createdAt: new Date(),
      };

      // Mock menu item price lookup
      mockPool.query.mockResolvedValueOnce({
        rows: [{ price: 12.99 }],
      });

      // Mock customization price lookup
      mockPool.query.mockResolvedValueOnce({
        rows: [{ price_modifier: 0 }],
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockOrder] }) // INSERT order
        .mockResolvedValueOnce({ rows: [{ price: 12.99 }] }) // Menu item price
        .mockResolvedValueOnce({ rows: [{ price_modifier: 0 }] }) // Customization price
        .mockResolvedValueOnce({ rows: [mockOrderItem] }) // INSERT order item
        .mockResolvedValueOnce({}) // INSERT customization
        .mockResolvedValueOnce({}); // COMMIT

      const result = await orderService.createOrder(mockOrderData);

      expect(result.id).toBe('order-123');
      expect(result.totalAmount).toBe(28.58);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Menu item not found'));

      await expect(orderService.createOrder(mockOrderData)).rejects.toThrow('Menu item not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getOrder', () => {
    const mockOrderId = 'order-123';

    it('should return order with items', async () => {
      const mockOrder = {
        id: 'order-123',
        sessionId: 'session-123',
        participantId: 'participant-123',
        status: 'pending',
        notes: 'Table order',
        subtotal: 25.98,
        taxAmount: 2.60,
        totalAmount: 28.58,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOrderItems = [
        {
          id: 'order-item-123',
          orderId: 'order-123',
          menuItemId: 'item-123',
          quantity: 2,
          unitPrice: 12.99,
          totalPrice: 25.98,
          notes: 'No onions',
          createdAt: new Date(),
          menuItemName: 'Caesar Salad',
          menuItemDescription: 'Fresh salad',
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockOrder] }) // Get order
        .mockResolvedValueOnce({ rows: mockOrderItems }) // Get order items
        .mockResolvedValueOnce({ rows: [] }); // Get customizations

      const result = await orderService.getOrder(mockOrderId);

      expect(result).toEqual({
        ...mockOrder,
        items: mockOrderItems.map(item => ({ ...item, customizations: [] })),
      });
    });

    it('should return null when order not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await orderService.getOrder(mockOrderId);

      expect(result).toBeNull();
    });
  });

  describe('updateOrderStatus', () => {
    const mockOrderId = 'order-123';
    const mockUpdateData = {
      status: 'confirmed' as const,
      notes: 'Order confirmed',
    };

    it('should update order status successfully', async () => {
      const mockUpdatedOrder = {
        id: 'order-123',
        sessionId: 'session-123',
        participantId: 'participant-123',
        status: 'confirmed',
        notes: 'Order confirmed',
        subtotal: 25.98,
        taxAmount: 2.60,
        totalAmount: 28.58,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUpdatedOrder] }) // Update order
        .mockResolvedValueOnce({ rows: [] }) // Get order items
        .mockResolvedValueOnce({ rows: [] }); // Get customizations

      const result = await orderService.updateOrderStatus(mockOrderId, mockUpdateData);

      expect(result?.status).toBe('confirmed');
      expect(result?.notes).toBe('Order confirmed');
    });

    it('should return null when no update data provided', async () => {
      const result = await orderService.updateOrderStatus(mockOrderId, {});

      expect(result).toBeNull();
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('addItemToCart', () => {
    const mockSessionId = 'session-123';
    const mockParticipantId = 'participant-123';
    const mockItemData = {
      menuItemId: 'item-123',
      quantity: 1,
      notes: 'Extra cheese',
      customizations: [],
    };

    it('should add item to existing cart', async () => {
      const mockOrderId = 'order-123';
      const mockOrderItem = {
        id: 'order-item-123',
        orderId: mockOrderId,
        menuItemId: 'item-123',
        quantity: 1,
        unitPrice: 12.99,
        totalPrice: 12.99,
        notes: 'Extra cheese',
        createdAt: new Date(),
      };

      // Mock existing pending order
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: mockOrderId }],
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ price: 12.99 }] }) // Menu item price
        .mockResolvedValueOnce({ rows: [mockOrderItem] }) // INSERT order item
        .mockResolvedValueOnce({ rows: [{ total_price: 12.99 }] }) // Get items for recalculation
        .mockResolvedValueOnce({}) // Update order totals
        .mockResolvedValueOnce({}); // COMMIT

      const result = await orderService.addItemToCart(mockSessionId, mockParticipantId, mockItemData);

      expect(result.menuItemId).toBe('item-123');
      expect(result.quantity).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create new cart if none exists', async () => {
      const mockOrderId = 'order-456';
      const mockOrderItem = {
        id: 'order-item-456',
        orderId: mockOrderId,
        menuItemId: 'item-123',
        quantity: 1,
        unitPrice: 12.99,
        totalPrice: 12.99,
        notes: 'Extra cheese',
        createdAt: new Date(),
      };

      // Mock no existing pending order
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No existing order
        .mockResolvedValueOnce({ rows: [{ id: mockOrderId }] }); // Create new order

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ price: 12.99 }] }) // Menu item price
        .mockResolvedValueOnce({ rows: [mockOrderItem] }) // INSERT order item
        .mockResolvedValueOnce({ rows: [{ total_price: 12.99 }] }) // Get items for recalculation
        .mockResolvedValueOnce({}) // Update order totals
        .mockResolvedValueOnce({}); // COMMIT

      const result = await orderService.addItemToCart(mockSessionId, mockParticipantId, mockItemData);

      expect(result.menuItemId).toBe('item-123');
    });
  });

  describe('removeItemFromCart', () => {
    const mockOrderItemId = 'order-item-123';

    it('should remove item from cart successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ order_id: 'order-123' }] }) // Get order ID
        .mockResolvedValueOnce({ rowCount: 1 }) // Delete order item
        .mockResolvedValueOnce({ rows: [] }) // Get remaining items for recalculation
        .mockResolvedValueOnce({}) // Update order totals
        .mockResolvedValueOnce({}); // COMMIT

      const result = await orderService.removeItemFromCart(mockOrderItemId);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should return false when item not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Order item not found
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await orderService.removeItemFromCart(mockOrderItemId);

      expect(result).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('updateCartItemQuantity', () => {
    const mockOrderItemId = 'order-item-123';

    it('should update item quantity successfully', async () => {
      const mockUpdatedItem = {
        id: 'order-item-123',
        orderId: 'order-123',
        menuItemId: 'item-123',
        quantity: 3,
        unitPrice: 12.99,
        totalPrice: 38.97,
        notes: 'Extra cheese',
        createdAt: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ unit_price: 12.99, order_id: 'order-123' }] }) // Get current item
        .mockResolvedValueOnce({ rows: [mockUpdatedItem] }) // Update quantity
        .mockResolvedValueOnce({ rows: [{ total_price: 38.97 }] }) // Get items for recalculation
        .mockResolvedValueOnce({}) // Update order totals
        .mockResolvedValueOnce({}); // COMMIT

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Get customizations

      const result = await orderService.updateCartItemQuantity(mockOrderItemId, 3);

      expect(result?.quantity).toBe(3);
      expect(result?.totalPrice).toBe(38.97);
    });

    it('should remove item when quantity is 0', async () => {
      // Mock the removeItemFromCart method
      orderService.removeItemFromCart = jest.fn().mockResolvedValue(true);

      const result = await orderService.updateCartItemQuantity(mockOrderItemId, 0);

      expect(result).toBeNull();
      expect(orderService.removeItemFromCart).toHaveBeenCalledWith(mockOrderItemId);
    });
  });

  describe('cancelOrder', () => {
    const mockOrderId = 'order-123';

    it('should cancel order successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
      });

      const result = await orderService.cancelOrder(mockOrderId);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'cancelled'"),
        [mockOrderId]
      );
    });

    it('should return false when order cannot be cancelled', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 0,
      });

      const result = await orderService.cancelOrder(mockOrderId);

      expect(result).toBe(false);
    });
  });
});