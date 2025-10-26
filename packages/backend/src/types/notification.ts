export interface WaiterCall {
  id: string;
  sessionId: string;
  tableId: string;
  participantId: string;
  locationId: string;
  callType: 'assistance' | 'bill' | 'complaint' | 'order_ready';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message?: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'cancelled';
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  assignedWaiterId?: string;
}

export interface NotificationEvent {
  id: string;
  type: 'waiter_call' | 'order_update' | 'payment_request' | 'system_alert';
  targetType: 'waiter' | 'customer' | 'kitchen' | 'admin';
  targetId?: string; // specific user/waiter ID, or null for broadcast
  locationId: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  expiresAt?: Date;
}

export interface WaiterCallRequest {
  sessionId: string;
  participantId: string;
  callType: 'assistance' | 'bill' | 'complaint';
  message?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface WaiterCallResponse {
  callId: string;
  estimatedResponseTime: number; // in minutes
  assignedWaiter?: {
    id: string;
    name: string;
  };
}

export interface AcknowledgeCallRequest {
  callId: string;
  waiterId: string;
  estimatedArrivalTime?: number; // in minutes
}

export interface ResolveCallRequest {
  callId: string;
  waiterId: string;
  resolution: string;
  customerSatisfaction?: number; // 1-5 rating
}

export interface WaiterStatus {
  waiterId: string;
  locationId: string;
  status: 'available' | 'busy' | 'break' | 'offline';
  currentCalls: string[]; // array of call IDs
  lastSeen: Date;
}

export interface NotificationPreferences {
  userId: string;
  waiterCalls: boolean;
  orderUpdates: boolean;
  paymentRequests: boolean;
  systemAlerts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// Socket.io event types
export interface ServerToClientEvents {
  waiter_call_created: (call: WaiterCall) => void;
  waiter_call_acknowledged: (callId: string, waiterId: string, eta: number) => void;
  waiter_call_resolved: (callId: string, resolution: string) => void;
  order_status_updated: (orderId: string, status: string, estimatedTime?: number) => void;
  payment_request: (sessionId: string, amount: number, splitDetails?: any) => void;
  notification: (notification: NotificationEvent) => void;
  waiter_status_changed: (waiterId: string, status: string) => void;
}

export interface ClientToServerEvents {
  join_location: (locationId: string, userType: 'customer' | 'waiter' | 'kitchen') => void;
  leave_location: (locationId: string) => void;
  create_waiter_call: (request: WaiterCallRequest) => void;
  acknowledge_call: (request: AcknowledgeCallRequest) => void;
  resolve_call: (request: ResolveCallRequest) => void;
  update_waiter_status: (status: Omit<WaiterStatus, 'lastSeen'>) => void;
  mark_notification_read: (notificationId: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string;
  locationId?: string;
  userType?: 'customer' | 'waiter' | 'kitchen' | 'admin';
  waiterId?: string;
}