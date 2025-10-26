// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  LocationSelection: undefined;
  TableSelection: { locationId: string };
  Menu: { locationId: string; tableId: string; sessionId: string };
  Cart: { locationId: string; tableId: string; sessionId: string };
  Payment: { locationId: string; sessionId: string; orderId: string };
  OrderTracking: { orderId: string };
  Profile: undefined;
  Settings: undefined;
  Reservations: undefined;
  Reviews: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Reservations: undefined;
  Profile: undefined;
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Location types
export interface Location {
  id: string;
  name: string;
  description: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  rating: number;
  reviewCount: number;
  cuisine: string[];
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  isOpen: boolean;
  openingHours: OpeningHours[];
  images: string[];
  amenities: string[];
}

export interface OpeningHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
  isClosed: boolean;
}

// Table types
export interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  isAvailable: boolean;
  isOccupied: boolean;
  qrCode?: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface TableSession {
  id: string;
  tableId: string;
  locationId: string;
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
  participants: SessionParticipant[];
  orders: Order[];
}

export interface SessionParticipant {
  id: string;
  userId?: string;
  fantasyName: string;
  isHost: boolean;
  joinedAt: Date;
  orders: Order[];
}

// Menu types
export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  isAvailable: boolean;
  allergens: string[];
  dietaryInfo: string[];
  preparationTime: number;
  rating: number;
  reviewCount: number;
  customizations: MenuCustomization[];
  nutritionalInfo?: NutritionalInfo;
}

export interface MenuCustomization {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  options: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  isDefault: boolean;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

// Cart and Order types
export interface CartItem {
  id: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  customizations: SelectedCustomization[];
  specialInstructions?: string;
  unitPrice: number;
  totalPrice: number;
}

export interface SelectedCustomization {
  customizationId: string;
  optionId: string;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  sessionId: string;
  participantId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedReadyTime?: Date;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  customizations: SelectedCustomization[];
  specialInstructions?: string;
  unitPrice: number;
  totalPrice: number;
  status: OrderItemStatus;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type OrderItemStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered';

// Payment types
export interface PaymentMethod {
  id: string;
  type: 'card' | 'digital_wallet' | 'cash';
  provider: 'stripe' | 'paypal' | 'apple_pay' | 'google_pay' | 'satispay';
  displayName: string;
  isDefault: boolean;
  details?: PaymentMethodDetails;
}

export interface PaymentMethodDetails {
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  email?: string; // For PayPal
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethodId: string;
  orderId: string;
  sessionId: string;
  participantId: string;
  createdAt: Date;
  paidAt?: Date;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

// Waiter call types
export interface WaiterCall {
  id: string;
  sessionId: string;
  tableId: string;
  locationId: string;
  callType: 'assistance' | 'bill' | 'complaint' | 'other';
  message?: string;
  status: WaiterCallStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  assignedWaiterId?: string;
  estimatedResponseTime?: number;
}

export type WaiterCallStatus = 
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'cancelled';

// Reservation types
export interface Reservation {
  id: string;
  locationId: string;
  userId: string;
  partySize: number;
  dateTime: Date;
  duration: number; // in minutes
  status: ReservationStatus;
  specialRequests?: string;
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
  tableId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReservationStatus = 
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// Review types
export interface Review {
  id: string;
  locationId: string;
  userId: string;
  orderId?: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  images?: string[];
  categories: ReviewCategory[];
  isAnonymous: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  response?: ReviewResponse;
}

export interface ReviewCategory {
  category: 'food' | 'service' | 'ambiance' | 'value' | 'cleanliness';
  rating: number;
}

export interface ReviewResponse {
  message: string;
  respondedAt: Date;
  respondedBy: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  preferences: UserPreferences;
  loyaltyPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  dietaryRestrictions: string[];
  allergens: string[];
  favoriteLocations: string[];
  defaultPaymentMethod?: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  reservationReminders: boolean;
  waiterResponses: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

// Notification types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

export type NotificationType = 
  | 'order_confirmed'
  | 'order_ready'
  | 'order_delivered'
  | 'waiter_response'
  | 'payment_success'
  | 'payment_failed'
  | 'reservation_confirmed'
  | 'reservation_reminder'
  | 'promotion'
  | 'system';

// App state types
export interface AppState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  currentLocation: Location | null;
  currentSession: TableSession | null;
  cart: CartItem[];
  notifications: Notification[];
  networkStatus: 'online' | 'offline';
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Location permission types
export interface LocationPermission {
  granted: boolean;
  accuracy: 'high' | 'low' | 'none';
}

// Camera permission types
export interface CameraPermission {
  granted: boolean;
}

// Push notification types
export interface PushNotificationPermission {
  granted: boolean;
  token?: string;
}

// Geolocation types
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface GeolocationPosition {
  coords: Coordinates;
  timestamp: number;
}

// QR Code types
export interface QRCodeData {
  locationId: string;
  tableId: string;
  tableNumber: string;
}

// Socket events
export interface SocketEvents {
  // Incoming events
  'order:status_updated': (data: { orderId: string; status: OrderStatus; estimatedReadyTime?: Date }) => void;
  'waiter:call_acknowledged': (data: { callId: string; waiterId: string; estimatedResponseTime: number }) => void;
  'waiter:call_resolved': (data: { callId: string; resolution: string }) => void;
  'session:participant_joined': (data: { participant: SessionParticipant }) => void;
  'session:participant_left': (data: { participantId: string }) => void;
  'menu:item_updated': (data: { itemId: string; isAvailable: boolean; price?: number }) => void;
  'notification:new': (data: Notification) => void;
  
  // Outgoing events
  'session:join': (data: { sessionId: string; userId?: string; fantasyName: string }) => void;
  'session:leave': (data: { sessionId: string; participantId: string }) => void;
  'waiter:call': (data: Omit<WaiterCall, 'id' | 'createdAt' | 'status'>) => void;
  'order:place': (data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
}

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface FormField {
  name: string;
  value: any;
  error?: string;
  rules?: ValidationRule[];
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  fonts: {
    regular: string;
    medium: string;
    bold: string;
    light: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

// Feature flags
export interface FeatureFlags {
  enableReservations: boolean;
  enableReviews: boolean;
  enableLoyaltyProgram: boolean;
  enableSplitPayments: boolean;
  enableVoiceOrdering: boolean;
  enableAR: boolean;
}