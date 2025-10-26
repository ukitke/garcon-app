import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocketEvents, Notification, OrderStatus, SessionParticipant } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private listeners: Map<string, Function[]> = new Map();

  async connect(): Promise<void> {
    if (this.socket && this.isConnected) {
      return;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const serverUrl = __DEV__ 
        ? 'http://localhost:3000' 
        : 'https://api.garcon-app.com';

      this.socket = io(serverUrl, {
        auth: {
          token,
        },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Error connecting to socket:', error);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection:established');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection:lost', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('connection:failed', error);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection:restored', attemptNumber);
    });

    // Order status updates
    this.socket.on('order:status_updated', (data: { 
      orderId: string; 
      status: OrderStatus; 
      estimatedReadyTime?: Date 
    }) => {
      console.log('Order status updated:', data);
      this.emit('order:status_updated', data);
    });

    // Waiter call responses
    this.socket.on('waiter:call_acknowledged', (data: { 
      callId: string; 
      waiterId: string; 
      estimatedResponseTime: number 
    }) => {
      console.log('Waiter call acknowledged:', data);
      this.emit('waiter:call_acknowledged', data);
    });

    this.socket.on('waiter:call_resolved', (data: { 
      callId: string; 
      resolution: string 
    }) => {
      console.log('Waiter call resolved:', data);
      this.emit('waiter:call_resolved', data);
    });

    // Session participant updates
    this.socket.on('session:participant_joined', (data: { 
      participant: SessionParticipant 
    }) => {
      console.log('Participant joined session:', data);
      this.emit('session:participant_joined', data);
    });

    this.socket.on('session:participant_left', (data: { 
      participantId: string 
    }) => {
      console.log('Participant left session:', data);
      this.emit('session:participant_left', data);
    });

    // Menu updates
    this.socket.on('menu:item_updated', (data: { 
      itemId: string; 
      isAvailable: boolean; 
      price?: number 
    }) => {
      console.log('Menu item updated:', data);
      this.emit('menu:item_updated', data);
    });

    // Notifications
    this.socket.on('notification:new', (data: Notification) => {
      console.log('New notification:', data);
      this.emit('notification:new', data);
    });

    // Payment updates
    this.socket.on('payment:status_updated', (data: {
      paymentIntentId: string;
      status: string;
      orderId: string;
    }) => {
      console.log('Payment status updated:', data);
      this.emit('payment:status_updated', data);
    });

    // Table session updates
    this.socket.on('session:updated', (data: {
      sessionId: string;
      updates: any;
    }) => {
      console.log('Session updated:', data);
      this.emit('session:updated', data);
    });

    // Kitchen updates
    this.socket.on('kitchen:order_ready', (data: {
      orderId: string;
      tableNumber: string;
      items: string[];
    }) => {
      console.log('Kitchen order ready:', data);
      this.emit('kitchen:order_ready', data);
    });

    // System messages
    this.socket.on('system:message', (data: {
      type: 'info' | 'warning' | 'error';
      message: string;
      data?: any;
    }) => {
      console.log('System message:', data);
      this.emit('system:message', data);
    });
  }

  // Event emission methods
  joinSession(sessionId: string, userId?: string, fantasyName?: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('session:join', {
        sessionId,
        userId,
        fantasyName,
      });
    }
  }

  leaveSession(sessionId: string, participantId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('session:leave', {
        sessionId,
        participantId,
      });
    }
  }

  callWaiter(callData: {
    sessionId: string;
    tableId: string;
    locationId: string;
    callType: 'assistance' | 'bill' | 'complaint' | 'other';
    message?: string;
    priority?: 'low' | 'medium' | 'high';
  }): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('waiter:call', callData);
    }
  }

  placeOrder(orderData: {
    sessionId: string;
    participantId: string;
    items: any[];
    specialInstructions?: string;
  }): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('order:place', orderData);
    }
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('order:status_update', {
        orderId,
        status,
      });
    }
  }

  sendTypingIndicator(sessionId: string, isTyping: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('session:typing', {
        sessionId,
        isTyping,
      });
    }
  }

  // Event listener management
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket event callback:', error);
        }
      });
    }
  }

  // Connection status
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getConnectionState(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (!this.socket) return 'disconnected';
    
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return 'error';
    
    return 'disconnected';
  }

  // Utility methods
  async waitForConnection(timeout: number = 5000): Promise<boolean> {
    if (this.isConnected) return true;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.off('connection:established', onConnect);
        resolve(false);
      }, timeout);

      const onConnect = () => {
        clearTimeout(timeoutId);
        this.off('connection:established', onConnect);
        resolve(true);
      };

      this.on('connection:established', onConnect);
    });
  }

  // Room management (for table sessions)
  joinRoom(roomId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('room:join', { roomId });
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('room:leave', { roomId });
    }
  }

  // Heartbeat to keep connection alive
  private startHeartbeat(): void {
    if (this.socket) {
      setInterval(() => {
        if (this.socket && this.isConnected) {
          this.socket.emit('ping');
        }
      }, 30000); // Send ping every 30 seconds
    }
  }

  // Error handling
  private handleSocketError(error: any): void {
    console.error('Socket error:', error);
    
    // Emit error event for UI to handle
    this.emit('socket:error', {
      message: 'Connection error occurred',
      error,
    });
  }

  // Cleanup method
  cleanup(): void {
    this.listeners.clear();
    this.disconnect();
  }
}

export const socketService = new SocketService();
export default socketService;