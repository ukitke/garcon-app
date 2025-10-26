import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = __DEV__ 
      ? 'http://localhost:3000/api' 
      : 'https://api.garcon-app.com/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle common errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('refresh_token');
          // Navigate to login screen
          // This would be handled by the navigation service
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error || 'Server error',
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'Network error. Please check your connection.',
        };
      } else {
        return {
          success: false,
          error: 'An unexpected error occurred.',
        };
      }
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; token: string; refreshToken: string }>> {
    return this.request({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<ApiResponse<{ user: any; token: string; refreshToken: string }>> {
    return this.request({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    });
  }

  async refreshToken(): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    return this.request({
      method: 'POST',
      url: '/auth/refresh',
      data: { refreshToken },
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: '/auth/logout',
    });
  }

  // Location endpoints
  async getNearbyLocations(latitude: number, longitude: number, radius: number = 5000): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/locations/nearby',
      params: { latitude, longitude, radius },
    });
  }

  async getLocation(locationId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/locations/${locationId}`,
    });
  }

  async getLocationMenu(locationId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/locations/${locationId}/menu`,
    });
  }

  // Table endpoints
  async getLocationTables(locationId: string): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: `/locations/${locationId}/tables`,
    });
  }

  async getTable(tableId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/tables/${tableId}`,
    });
  }

  async joinTableSession(tableId: string, fantasyName?: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/tables/${tableId}/join`,
      data: { fantasyName },
    });
  }

  async leaveTableSession(sessionId: string): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: `/sessions/${sessionId}/leave`,
    });
  }

  async getTableSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/sessions/${sessionId}`,
    });
  }

  // Order endpoints
  async placeOrder(orderData: {
    sessionId: string;
    items: any[];
    specialInstructions?: string;
  }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/orders',
      data: orderData,
    });
  }

  async getOrder(orderId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/orders/${orderId}`,
    });
  }

  async getUserOrders(limit: number = 20, offset: number = 0): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/orders/user',
      params: { limit, offset },
    });
  }

  async cancelOrder(orderId: string, reason?: string): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: `/orders/${orderId}/cancel`,
      data: { reason },
    });
  }

  // Payment endpoints
  async getPaymentMethods(): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/payments/methods',
    });
  }

  async addPaymentMethod(paymentMethodData: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/payments/methods',
      data: paymentMethodData,
    });
  }

  async createPaymentIntent(paymentData: {
    orderId: string;
    paymentMethodId: string;
    amount: number;
  }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/payments/intents',
      data: paymentData,
    });
  }

  async confirmPayment(paymentIntentId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/payments/intents/${paymentIntentId}/confirm`,
    });
  }

  // Waiter call endpoints
  async callWaiter(callData: {
    sessionId: string;
    callType: string;
    message?: string;
    priority?: string;
  }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/waiter-calls',
      data: callData,
    });
  }

  async getWaiterCall(callId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/waiter-calls/${callId}`,
    });
  }

  async cancelWaiterCall(callId: string): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: `/waiter-calls/${callId}/cancel`,
    });
  }

  // Reservation endpoints
  async createReservation(reservationData: {
    locationId: string;
    dateTime: string;
    partySize: number;
    specialRequests?: string;
    contactInfo: {
      name: string;
      phone: string;
      email: string;
    };
  }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/reservations',
      data: reservationData,
    });
  }

  async getUserReservations(): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/reservations/user',
    });
  }

  async getReservation(reservationId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/reservations/${reservationId}`,
    });
  }

  async cancelReservation(reservationId: string, reason?: string): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: `/reservations/${reservationId}/cancel`,
      data: { reason },
    });
  }

  async getAvailableSlots(locationId: string, date: string, partySize: number): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: `/reservations/availability`,
      params: { locationId, date, partySize },
    });
  }

  // Review endpoints
  async createReview(reviewData: {
    locationId: string;
    orderId?: string;
    rating: number;
    title?: string;
    comment?: string;
    categories: any[];
    isAnonymous?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/reviews',
      data: reviewData,
    });
  }

  async getLocationReviews(locationId: string, limit: number = 20, offset: number = 0): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: `/reviews/location/${locationId}`,
      params: { limit, offset },
    });
  }

  async getUserReviews(): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/reviews/user',
    });
  }

  async updateReview(reviewId: string, updateData: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      url: `/reviews/${reviewId}`,
      data: updateData,
    });
  }

  async deleteReview(reviewId: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/reviews/${reviewId}`,
    });
  }

  // User profile endpoints
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/users/profile',
    });
  }

  async updateUserProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      url: '/users/profile',
      data: profileData,
    });
  }

  async updateUserPreferences(preferences: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      url: '/users/preferences',
      data: preferences,
    });
  }

  async uploadAvatar(imageData: FormData): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/users/avatar',
      data: imageData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Notification endpoints
  async getNotifications(limit: number = 20, offset: number = 0): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/notifications',
      params: { limit, offset },
    });
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: `/notifications/${notificationId}/read`,
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: '/notifications/read-all',
    });
  }

  async registerPushToken(token: string, platform: 'ios' | 'android'): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: '/notifications/push-token',
      data: { token, platform },
    });
  }

  // Search endpoints
  async searchLocations(query: string, filters?: any): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/search/locations',
      params: { q: query, ...filters },
    });
  }

  async searchMenuItems(locationId: string, query: string): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: `/search/menu/${locationId}`,
      params: { q: query },
    });
  }

  // Analytics endpoints (for user behavior tracking)
  async trackEvent(eventData: {
    name: string;
    properties?: Record<string, any>;
  }): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: '/analytics/events',
      data: eventData,
    });
  }

  // Utility methods
  async checkHealth(): Promise<ApiResponse> {
    return this.request({
      method: 'GET',
      url: '/health',
    });
  }

  async getAppConfig(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/config',
    });
  }

  // QR Code validation
  async validateQRCode(qrData: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/qr/validate',
      data: { qrData },
    });
  }

  // Split payment endpoints
  async getSplitPaymentOptions(sessionId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/sessions/${sessionId}/split-payment`,
    });
  }

  async requestSplitPayment(sessionId: string, splitData: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/sessions/${sessionId}/split-payment`,
      data: splitData,
    });
  }

  // Loyalty program endpoints
  async getLoyaltyPoints(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/loyalty/points',
    });
  }

  async redeemLoyaltyPoints(pointsData: {
    points: number;
    rewardId: string;
  }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/loyalty/redeem',
      data: pointsData,
    });
  }

  async getLoyaltyRewards(): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/loyalty/rewards',
    });
  }

  // Additional methods for new screens
  async getOrderHistory(limit: number = 20, offset: number = 0): Promise<ApiResponse<any[]>> {
    return this.getUserOrders(limit, offset);
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/notifications/${notificationId}`,
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: '/auth/forgot-password',
      data: { email },
    });
  }
}

export const apiService = new ApiService();
export default apiService;