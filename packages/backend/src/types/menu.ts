export interface MenuCategory {
  id: string;
  locationId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  locationId: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  allergens: string[];
  isAvailable: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  customizations?: MenuCustomization[];
}

export interface MenuCustomization {
  id: string;
  menuItemId: string;
  name: string;
  type: 'single_choice' | 'multiple_choice' | 'text_input';
  isRequired: boolean;
  displayOrder: number;
  createdAt: Date;
  options?: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  customizationId: string;
  name: string;
  priceModifier: number;
  displayOrder: number;
  isAvailable: boolean;
  createdAt: Date;
}

export interface Order {
  id: string;
  sessionId: string;
  participantId: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  createdAt: Date;
  customizations?: OrderItemCustomization[];
  menuItem?: MenuItem;
}

export interface OrderItemCustomization {
  id: string;
  orderItemId: string;
  customizationId: string;
  optionId?: string;
  customValue?: string;
  priceModifier: number;
  createdAt: Date;
  customization?: MenuCustomization;
  option?: CustomizationOption;
}

// Request/Response types
export interface CreateMenuCategoryRequest {
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateMenuCategoryRequest {
  name?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuItemRequest {
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
  allergens?: string[];
  displayOrder?: number;
  customizations?: CreateMenuCustomizationRequest[];
}

export interface UpdateMenuItemRequest {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  allergens?: string[];
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface CreateMenuCustomizationRequest {
  name: string;
  type: 'single_choice' | 'multiple_choice' | 'text_input';
  isRequired?: boolean;
  displayOrder?: number;
  options?: CreateCustomizationOptionRequest[];
}

export interface CreateCustomizationOptionRequest {
  name: string;
  priceModifier?: number;
  displayOrder?: number;
}

export interface CreateOrderRequest {
  sessionId: string;
  participantId: string;
  items: CreateOrderItemRequest[];
  notes?: string;
}

export interface CreateOrderItemRequest {
  menuItemId: string;
  quantity: number;
  notes?: string;
  customizations?: CreateOrderItemCustomizationRequest[];
}

export interface CreateOrderItemCustomizationRequest {
  customizationId: string;
  optionId?: string;
  customValue?: string;
}

export interface UpdateOrderRequest {
  status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string;
}

export interface MenuResponse {
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface ImageUploadRequest {
  file: any;
}

export interface ImageUploadResponse {
  imageUrl: string;
  originalName: string;
  size: number;
}