import { Request, Response } from 'express';
import { orderService } from '../services/orderService';
import { 
  CreateOrderRequest,
  CreateOrderItemRequest,
  UpdateOrderRequest
} from '../types/menu';

export class OrderController {
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderData: CreateOrderRequest = req.body;

      const order = await orderService.createOrder(orderData);
      
      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create order'
      });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const order = await orderService.getOrder(orderId);
      
      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order'
      });
    }
  }

  async getOrdersBySession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const orders = await orderService.getOrdersBySession(sessionId);
      
      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error fetching session orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session orders'
      });
    }
  }

  async getOrdersByParticipant(req: Request, res: Response): Promise<void> {
    try {
      const { participantId } = req.params;

      const orders = await orderService.getOrdersByParticipant(participantId);
      
      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error fetching participant orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch participant orders'
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const updateData: UpdateOrderRequest = req.body;

      const order = await orderService.updateOrderStatus(orderId, updateData);
      
      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update order status'
      });
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const cancelled = await orderService.cancelOrder(orderId);
      
      if (!cancelled) {
        res.status(404).json({
          success: false,
          error: 'Order not found or cannot be cancelled'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel order'
      });
    }
  }

  // Shopping cart endpoints
  async addItemToCart(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, participantId } = req.params;
      const itemData: CreateOrderItemRequest = req.body;

      const orderItem = await orderService.addItemToCart(sessionId, participantId, itemData);
      
      res.status(201).json({
        success: true,
        data: orderItem
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add item to cart'
      });
    }
  }

  async removeItemFromCart(req: Request, res: Response): Promise<void> {
    try {
      const { orderItemId } = req.params;

      const removed = await orderService.removeItemFromCart(orderItemId);
      
      if (!removed) {
        res.status(404).json({
          success: false,
          error: 'Order item not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Item removed from cart successfully'
      });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove item from cart'
      });
    }
  }

  async updateCartItemQuantity(req: Request, res: Response): Promise<void> {
    try {
      const { orderItemId } = req.params;
      const { quantity } = req.body;

      if (typeof quantity !== 'number' || quantity < 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid quantity provided'
        });
        return;
      }

      const orderItem = await orderService.updateCartItemQuantity(orderItemId, quantity);
      
      if (quantity === 0 || orderItem === null) {
        res.json({
          success: true,
          message: 'Item removed from cart'
        });
        return;
      }

      res.json({
        success: true,
        data: orderItem
      });
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update cart item quantity'
      });
    }
  }

  async getCart(req: Request, res: Response): Promise<void> {
    try {
      const { participantId } = req.params;

      // Get the pending order for this participant (their cart)
      const orders = await orderService.getOrdersByParticipant(participantId);
      const pendingOrder = orders.find(order => order.status === 'pending');
      
      if (!pendingOrder) {
        res.json({
          success: true,
          data: {
            items: [],
            subtotal: 0,
            taxAmount: 0,
            totalAmount: 0
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          orderId: pendingOrder.id,
          items: pendingOrder.items || [],
          subtotal: pendingOrder.subtotal,
          taxAmount: pendingOrder.taxAmount,
          totalAmount: pendingOrder.totalAmount,
          notes: pendingOrder.notes
        }
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cart'
      });
    }
  }

  async confirmOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const order = await orderService.updateOrderStatus(orderId, { status: 'confirmed' });
      
      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      // TODO: Send notification to kitchen/waiters
      // This would integrate with the notification service

      res.json({
        success: true,
        data: order,
        message: 'Order confirmed and sent to kitchen'
      });
    } catch (error) {
      console.error('Error confirming order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm order'
      });
    }
  }
}

export const orderController = new OrderController();