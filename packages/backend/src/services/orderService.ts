import { Pool } from 'pg';
import { 
  Order, 
  OrderItem,
  OrderItemCustomization,
  CreateOrderRequest,
  CreateOrderItemRequest,
  CreateOrderItemCustomizationRequest,
  UpdateOrderRequest
} from '../types/menu';
import { getPool } from '../config/database';

export class OrderService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Calculate order totals
      const { subtotal, taxAmount, totalAmount } = await this.calculateOrderTotals(orderData.items);

      // Create the order
      const orderQuery = `
        INSERT INTO orders (session_id, participant_id, notes, subtotal, tax_amount, total_amount)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, session_id as "sessionId", participant_id as "participantId", 
                  status, notes, subtotal, tax_amount as "taxAmount", total_amount as "totalAmount",
                  created_at as "createdAt", updated_at as "updatedAt"
      `;

      const orderValues = [
        orderData.sessionId,
        orderData.participantId,
        orderData.notes || null,
        subtotal,
        taxAmount,
        totalAmount
      ];

      const orderResult = await client.query(orderQuery, orderValues);
      const order = orderResult.rows[0];

      // Create order items
      const orderItems: OrderItem[] = [];
      for (const itemData of orderData.items) {
        const orderItem = await this.createOrderItem(client, order.id, itemData);
        orderItems.push(orderItem);
      }

      await client.query('COMMIT');

      order.items = orderItems;
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const query = `
      SELECT o.id, o.session_id as "sessionId", o.participant_id as "participantId",
             o.status, o.notes, o.subtotal, o.tax_amount as "taxAmount", 
             o.total_amount as "totalAmount", o.created_at as "createdAt", o.updated_at as "updatedAt"
      FROM orders o
      WHERE o.id = $1
    `;

    const result = await this.pool.query(query, [orderId]);
    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];
    order.items = await this.getOrderItems(orderId);
    
    return order;
  }

  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    const query = `
      SELECT o.id, o.session_id as "sessionId", o.participant_id as "participantId",
             o.status, o.notes, o.subtotal, o.tax_amount as "taxAmount", 
             o.total_amount as "totalAmount", o.created_at as "createdAt", o.updated_at as "updatedAt"
      FROM orders o
      WHERE o.session_id = $1
      ORDER BY o.created_at DESC
    `;

    const result = await this.pool.query(query, [sessionId]);
    const orders = result.rows;

    // Get items for all orders
    for (const order of orders) {
      order.items = await this.getOrderItems(order.id);
    }

    return orders;
  }

  async getOrdersByParticipant(participantId: string): Promise<Order[]> {
    const query = `
      SELECT o.id, o.session_id as "sessionId", o.participant_id as "participantId",
             o.status, o.notes, o.subtotal, o.tax_amount as "taxAmount", 
             o.total_amount as "totalAmount", o.created_at as "createdAt", o.updated_at as "updatedAt"
      FROM orders o
      WHERE o.participant_id = $1
      ORDER BY o.created_at DESC
    `;

    const result = await this.pool.query(query, [participantId]);
    const orders = result.rows;

    // Get items for all orders
    for (const order of orders) {
      order.items = await this.getOrderItems(order.id);
    }

    return orders;
  }

  async updateOrderStatus(orderId: string, updateData: UpdateOrderRequest): Promise<Order | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updateData.status !== undefined) {
      setClauses.push(`status = $${paramCount++}`);
      values.push(updateData.status);
    }
    if (updateData.notes !== undefined) {
      setClauses.push(`notes = $${paramCount++}`);
      values.push(updateData.notes);
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(orderId);

    const query = `
      UPDATE orders 
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount++}
      RETURNING id, session_id as "sessionId", participant_id as "participantId",
                status, notes, subtotal, tax_amount as "taxAmount", 
                total_amount as "totalAmount", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];
    order.items = await this.getOrderItems(orderId);
    
    return order;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const query = `
      UPDATE orders 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND status IN ('pending', 'confirmed')
    `;

    const result = await this.pool.query(query, [orderId]);
    return result.rowCount > 0;
  }

  // Shopping cart functionality
  async addItemToCart(sessionId: string, participantId: string, itemData: CreateOrderItemRequest): Promise<OrderItem> {
    // Check if there's a pending order for this participant
    let orderId = await this.getOrCreatePendingOrder(sessionId, participantId);
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const orderItem = await this.createOrderItem(client, orderId, itemData);
      
      // Recalculate order totals
      await this.recalculateOrderTotals(client, orderId);

      await client.query('COMMIT');
      return orderItem;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeItemFromCart(orderItemId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get the order ID before deleting the item
      const orderQuery = `SELECT order_id FROM order_items WHERE id = $1`;
      const orderResult = await client.query(orderQuery, [orderItemId]);
      
      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const orderId = orderResult.rows[0].order_id;

      // Delete the order item and its customizations
      const deleteQuery = `DELETE FROM order_items WHERE id = $1`;
      const result = await client.query(deleteQuery, [orderItemId]);

      if (result.rowCount > 0) {
        // Recalculate order totals
        await this.recalculateOrderTotals(client, orderId);
      }

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateCartItemQuantity(orderItemId: string, quantity: number): Promise<OrderItem | null> {
    if (quantity <= 0) {
      const removed = await this.removeItemFromCart(orderItemId);
      return removed ? null : null;
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get menu item price for recalculation
      const priceQuery = `
        SELECT oi.unit_price, oi.order_id
        FROM order_items oi
        WHERE oi.id = $1
      `;
      const priceResult = await client.query(priceQuery, [orderItemId]);
      
      if (priceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const { unit_price: unitPrice, order_id: orderId } = priceResult.rows[0];
      const totalPrice = unitPrice * quantity;

      // Update quantity and total price
      const updateQuery = `
        UPDATE order_items 
        SET quantity = $1, total_price = $2
        WHERE id = $3
        RETURNING id, order_id as "orderId", menu_item_id as "menuItemId", 
                  quantity, unit_price as "unitPrice", total_price as "totalPrice", 
                  notes, created_at as "createdAt"
      `;

      const result = await client.query(updateQuery, [quantity, totalPrice, orderItemId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Recalculate order totals
      await this.recalculateOrderTotals(client, orderId);

      await client.query('COMMIT');
      
      const orderItem = result.rows[0];
      orderItem.customizations = await this.getOrderItemCustomizations(orderItemId);
      
      return orderItem;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Private helper methods
  private async createOrderItem(client: any, orderId: string, itemData: CreateOrderItemRequest): Promise<OrderItem> {
    // Get menu item details and price
    const menuItemQuery = `
      SELECT price FROM menu_items WHERE id = $1 AND is_available = true
    `;
    const menuItemResult = await client.query(menuItemQuery, [itemData.menuItemId]);
    
    if (menuItemResult.rows.length === 0) {
      throw new Error('Menu item not found or not available');
    }

    const basePrice = menuItemResult.rows[0].price;
    
    // Calculate customization price modifiers
    let customizationTotal = 0;
    if (itemData.customizations) {
      for (const customization of itemData.customizations) {
        if (customization.optionId) {
          const optionQuery = `
            SELECT price_modifier FROM customization_options WHERE id = $1
          `;
          const optionResult = await client.query(optionQuery, [customization.optionId]);
          if (optionResult.rows.length > 0) {
            customizationTotal += optionResult.rows[0].price_modifier;
          }
        }
      }
    }

    const unitPrice = basePrice + customizationTotal;
    const totalPrice = unitPrice * itemData.quantity;

    // Create order item
    const itemQuery = `
      INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, order_id as "orderId", menu_item_id as "menuItemId", 
                quantity, unit_price as "unitPrice", total_price as "totalPrice", 
                notes, created_at as "createdAt"
    `;

    const itemValues = [
      orderId,
      itemData.menuItemId,
      itemData.quantity,
      unitPrice,
      totalPrice,
      itemData.notes || null
    ];

    const itemResult = await client.query(itemQuery, itemValues);
    const orderItem = itemResult.rows[0];

    // Create customizations
    if (itemData.customizations) {
      for (const customization of itemData.customizations) {
        await this.createOrderItemCustomization(client, orderItem.id, customization);
      }
    }

    orderItem.customizations = await this.getOrderItemCustomizations(orderItem.id);
    return orderItem;
  }

  private async createOrderItemCustomization(client: any, orderItemId: string, customizationData: CreateOrderItemCustomizationRequest): Promise<void> {
    let priceModifier = 0;
    
    if (customizationData.optionId) {
      const optionQuery = `
        SELECT price_modifier FROM customization_options WHERE id = $1
      `;
      const optionResult = await client.query(optionQuery, [customizationData.optionId]);
      if (optionResult.rows.length > 0) {
        priceModifier = optionResult.rows[0].price_modifier;
      }
    }

    const query = `
      INSERT INTO order_item_customizations (order_item_id, customization_id, option_id, custom_value, price_modifier)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [
      orderItemId,
      customizationData.customizationId,
      customizationData.optionId || null,
      customizationData.customValue || null,
      priceModifier
    ];

    await client.query(query, values);
  }

  private async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const query = `
      SELECT oi.id, oi.order_id as "orderId", oi.menu_item_id as "menuItemId",
             oi.quantity, oi.unit_price as "unitPrice", oi.total_price as "totalPrice",
             oi.notes, oi.created_at as "createdAt",
             mi.name as "menuItemName", mi.description as "menuItemDescription"
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `;

    const result = await this.pool.query(query, [orderId]);
    const items = result.rows;

    // Get customizations for each item
    for (const item of items) {
      item.customizations = await this.getOrderItemCustomizations(item.id);
    }

    return items;
  }

  private async getOrderItemCustomizations(orderItemId: string): Promise<OrderItemCustomization[]> {
    const query = `
      SELECT oic.id, oic.order_item_id as "orderItemId", oic.customization_id as "customizationId",
             oic.option_id as "optionId", oic.custom_value as "customValue", 
             oic.price_modifier as "priceModifier", oic.created_at as "createdAt",
             mc.name as "customizationName", mc.type as "customizationType",
             co.name as "optionName"
      FROM order_item_customizations oic
      LEFT JOIN menu_customizations mc ON oic.customization_id = mc.id
      LEFT JOIN customization_options co ON oic.option_id = co.id
      WHERE oic.order_item_id = $1
      ORDER BY oic.created_at ASC
    `;

    const result = await this.pool.query(query, [orderItemId]);
    return result.rows;
  }

  private async calculateOrderTotals(items: CreateOrderItemRequest[]): Promise<{ subtotal: number; taxAmount: number; totalAmount: number }> {
    let subtotal = 0;

    for (const item of items) {
      // Get menu item price
      const menuItemQuery = `SELECT price FROM menu_items WHERE id = $1`;
      const menuItemResult = await this.pool.query(menuItemQuery, [item.menuItemId]);
      
      if (menuItemResult.rows.length === 0) {
        throw new Error(`Menu item ${item.menuItemId} not found`);
      }

      let itemPrice = menuItemResult.rows[0].price;

      // Add customization costs
      if (item.customizations) {
        for (const customization of item.customizations) {
          if (customization.optionId) {
            const optionQuery = `SELECT price_modifier FROM customization_options WHERE id = $1`;
            const optionResult = await this.pool.query(optionQuery, [customization.optionId]);
            if (optionResult.rows.length > 0) {
              itemPrice += optionResult.rows[0].price_modifier;
            }
          }
        }
      }

      subtotal += itemPrice * item.quantity;
    }

    // Calculate tax (assuming 10% tax rate - this should be configurable)
    const taxRate = 0.10;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  }

  private async recalculateOrderTotals(client: any, orderId: string): Promise<void> {
    // Get all order items
    const itemsQuery = `
      SELECT total_price FROM order_items WHERE order_id = $1
    `;
    const itemsResult = await client.query(itemsQuery, [orderId]);
    
    const subtotal = itemsResult.rows.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const taxRate = 0.10; // 10% tax rate
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Update order totals
    const updateQuery = `
      UPDATE orders 
      SET subtotal = $1, tax_amount = $2, total_amount = $3, updated_at = NOW()
      WHERE id = $4
    `;

    await client.query(updateQuery, [
      Math.round(subtotal * 100) / 100,
      Math.round(taxAmount * 100) / 100,
      Math.round(totalAmount * 100) / 100,
      orderId
    ]);
  }

  private async getOrCreatePendingOrder(sessionId: string, participantId: string): Promise<string> {
    // Check for existing pending order
    const existingQuery = `
      SELECT id FROM orders 
      WHERE session_id = $1 AND participant_id = $2 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const existingResult = await this.pool.query(existingQuery, [sessionId, participantId]);
    
    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].id;
    }

    // Create new pending order
    const createQuery = `
      INSERT INTO orders (session_id, participant_id, subtotal, tax_amount, total_amount)
      VALUES ($1, $2, 0, 0, 0)
      RETURNING id
    `;

    const createResult = await this.pool.query(createQuery, [sessionId, participantId]);
    return createResult.rows[0].id;
  }
}

export const orderService = new OrderService();