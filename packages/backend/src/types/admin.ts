export interface DashboardStats {
  locationId: string;
  period: {
    start: Date;
    end: Date;
  };
  revenue: RevenueStats;
  orders: OrderStats;
  customers: CustomerStats;
  tables: TableStats;
  waiters: WaiterStats;
  reviews: ReviewStats;
}

export interface RevenueStats {
  total: number;
  change: number; // percentage change from previous period
  daily: DailyRevenue[];
  byPaymentMethod: { [method: string]: number };
  averageOrderValue: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrderStats {
  total: number;
  completed: number;
  cancelled: number;
  averagePreparationTime: number; // in minutes
  peakHours: { [hour: string]: number };
  popularItems: PopularItem[];
}

export interface PopularItem {
  itemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averagePartySize: number;
  customerSatisfaction: number;
}

export interface TableStats {
  totalTables: number;
  averageOccupancy: number;
  turnoverRate: number;
  mostPopularTables: string[];
}

export interface WaiterStats {
  totalWaiters: number;
  activeWaiters: number;
  averageResponseTime: number;
  topPerformers: WaiterPerformance[];
}

export interface WaiterPerformance {
  waiterId: string;
  name: string;
  callsHandled: number;
  averageResponseTime: number;
  customerSatisfaction: number;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingTrend: number;
  categoryBreakdown: {
    food: number;
    service: number;
    atmosphere: number;
    value: number;
  };
}

export interface MenuManagement {
  categories: MenuCategoryManagement[];
  items: MenuItemManagement[];
  analytics: MenuAnalytics;
}

export interface MenuCategoryManagement {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemManagement {
  id: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  allergens: string[];
  isAvailable: boolean;
  displayOrder: number;
  popularity: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuAnalytics {
  totalItems: number;
  activeItems: number;
  topSellingItems: PopularItem[];
  leastPopularItems: PopularItem[];
  profitMargins: { [itemId: string]: number };
  seasonalTrends: SeasonalTrend[];
}

export interface SeasonalTrend {
  itemId: string;
  itemName: string;
  monthlyData: { [month: string]: number };
}

export interface LocationSettings {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  subscriptionTier: 'free' | 'premium';
  isActive: boolean;
  settings: LocationConfiguration;
  operatingHours: OperatingHours;
  features: LocationFeatures;
}

export interface LocationConfiguration {
  coverageRadius: number;
  autoAcceptOrders: boolean;
  maxTableCapacity: number;
  defaultReservationDuration: number;
  taxRate: number;
  currency: string;
  timezone: string;
}

export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    isOpen: boolean;
    breaks?: { start: string; end: string }[];
  };
}

export interface LocationFeatures {
  reservations: boolean;
  onlineOrdering: boolean;
  groupOrdering: boolean;
  splitPayments: boolean;
  waiterCalls: boolean;
  reviews: boolean;
  analytics: boolean;
}

export interface StaffManagement {
  waiters: WaiterInfo[];
  shifts: ShiftInfo[];
  performance: StaffPerformance[];
}

export interface WaiterInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'waiter' | 'manager';
  isActive: boolean;
  hireDate: Date;
  currentShift?: ShiftInfo;
  stats: WaiterPerformance;
}

export interface ShiftInfo {
  id: string;
  waiterId: string;
  waiterName: string;
  startTime: Date;
  endTime?: Date;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  tables: string[];
}

export interface StaffPerformance {
  waiterId: string;
  name: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    hoursWorked: number;
    tablesServed: number;
    ordersProcessed: number;
    averageResponseTime: number;
    customerSatisfaction: number;
    tips: number;
  };
}

export interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  locationId?: string;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface BulkMenuUpdate {
  action: 'update_prices' | 'toggle_availability' | 'update_category' | 'delete_items';
  itemIds: string[];
  data: any;
}

export interface MenuImportExport {
  format: 'json' | 'csv' | 'xlsx';
  data: any;
  metadata: {
    totalItems: number;
    categories: number;
    lastUpdated: Date;
  };
}