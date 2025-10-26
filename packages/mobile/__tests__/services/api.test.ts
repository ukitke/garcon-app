import { apiService } from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    request: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  })),
}));

describe('ApiService', () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      // Mock the axios client request
      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.login('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('test@example.com');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/auth/login',
        data: { email: 'test@example.com', password: 'password' },
      });
    });

    it('should handle login failure', async () => {
      const mockClient = require('axios').create();
      mockClient.request.mockRejectedValueOnce({
        response: {
          data: { error: 'Invalid credentials' },
        },
      });

      const result = await apiService.login('test@example.com', 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should register successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'new@example.com', name: 'New User' },
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        phone: '+1234567890',
      };

      const result = await apiService.register(userData);

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('new@example.com');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/auth/register',
        data: userData,
      });
    });

    it('should refresh token', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('mock-refresh-token');

      const mockResponse = {
        success: true,
        data: {
          token: 'new-token',
          refreshToken: 'new-refresh-token',
        },
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.refreshToken();

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('new-token');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/auth/refresh',
        data: { refreshToken: 'mock-refresh-token' },
      });
    });
  });

  describe('Location Services', () => {
    it('should get nearby locations', async () => {
      const mockLocations = [
        {
          id: 'loc-1',
          name: 'Restaurant A',
          coordinates: { latitude: 37.7749, longitude: -122.4194 },
          distance: 500,
        },
        {
          id: 'loc-2',
          name: 'Restaurant B',
          coordinates: { latitude: 37.7849, longitude: -122.4094 },
          distance: 1000,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockLocations,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.getNearbyLocations(37.7749, -122.4194, 5000);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].name).toBe('Restaurant A');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/locations/nearby',
        params: { latitude: 37.7749, longitude: -122.4194, radius: 5000 },
      });
    });

    it('should get location details', async () => {
      const mockLocation = {
        id: 'loc-1',
        name: 'Restaurant A',
        description: 'Great Italian food',
        address: '123 Main St',
        rating: 4.5,
        reviewCount: 100,
      };

      const mockResponse = {
        success: true,
        data: mockLocation,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.getLocation('loc-1');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Restaurant A');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/locations/loc-1',
      });
    });

    it('should get location menu', async () => {
      const mockMenu = {
        categories: [
          {
            id: 'cat-1',
            name: 'Appetizers',
            items: [
              { id: 'item-1', name: 'Bruschetta', price: 8.99 },
              { id: 'item-2', name: 'Calamari', price: 12.99 },
            ],
          },
        ],
      };

      const mockResponse = {
        success: true,
        data: mockMenu,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.getLocationMenu('loc-1');

      expect(result.success).toBe(true);
      expect(result.data?.categories).toHaveLength(1);
      expect(result.data?.categories[0].items).toHaveLength(2);
    });
  });

  describe('Table Services', () => {
    it('should join table session', async () => {
      const mockSession = {
        id: 'session-1',
        tableId: 'table-1',
        participants: [
          { id: 'participant-1', fantasyName: 'Dragon Slayer', isHost: true },
        ],
      };

      const mockResponse = {
        success: true,
        data: mockSession,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.joinTableSession('table-1', 'Dragon Slayer');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('session-1');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/tables/table-1/join',
        data: { fantasyName: 'Dragon Slayer' },
      });
    });

    it('should leave table session', async () => {
      const mockResponse = {
        success: true,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.leaveTableSession('session-1');

      expect(result.success).toBe(true);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/sessions/session-1/leave',
      });
    });
  });

  describe('Order Services', () => {
    it('should place order', async () => {
      const orderData = {
        sessionId: 'session-1',
        items: [
          {
            menuItemId: 'item-1',
            quantity: 2,
            customizations: [],
            specialInstructions: 'No onions',
          },
        ],
        specialInstructions: 'Table by the window',
      };

      const mockOrder = {
        id: 'order-1',
        ...orderData,
        status: 'pending',
        totalAmount: 25.98,
        createdAt: new Date().toISOString(),
      };

      const mockResponse = {
        success: true,
        data: mockOrder,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.placeOrder(orderData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('order-1');
      expect(result.data?.status).toBe('pending');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/orders',
        data: orderData,
      });
    });

    it('should get order details', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'preparing',
        totalAmount: 25.98,
        items: [
          {
            id: 'item-1',
            menuItem: { name: 'Margherita Pizza' },
            quantity: 1,
            totalPrice: 15.99,
          },
        ],
      };

      const mockResponse = {
        success: true,
        data: mockOrder,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.getOrder('order-1');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('preparing');
      expect(result.data?.items).toHaveLength(1);
    });

    it('should cancel order', async () => {
      const mockResponse = {
        success: true,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.cancelOrder('order-1', 'Changed mind');

      expect(result.success).toBe(true);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/orders/order-1/cancel',
        data: { reason: 'Changed mind' },
      });
    });
  });

  describe('Payment Services', () => {
    it('should get payment methods', async () => {
      const mockPaymentMethods = [
        {
          id: 'pm-1',
          type: 'card',
          provider: 'stripe',
          displayName: 'Visa •••• 4242',
          isDefault: true,
        },
        {
          id: 'pm-2',
          type: 'digital_wallet',
          provider: 'paypal',
          displayName: 'PayPal',
          isDefault: false,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockPaymentMethods,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.getPaymentMethods();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].isDefault).toBe(true);
    });

    it('should create payment intent', async () => {
      const paymentData = {
        orderId: 'order-1',
        paymentMethodId: 'pm-1',
        amount: 25.98,
      };

      const mockPaymentIntent = {
        id: 'pi-1',
        status: 'requires_confirmation',
        amount: 25.98,
        currency: 'usd',
      };

      const mockResponse = {
        success: true,
        data: mockPaymentIntent,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.createPaymentIntent(paymentData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('pi-1');
      expect(result.data?.amount).toBe(25.98);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/payments/intents',
        data: paymentData,
      });
    });

    it('should confirm payment', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'pi-1',
          status: 'succeeded',
        },
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.confirmPayment('pi-1');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('succeeded');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/payments/intents/pi-1/confirm',
      });
    });
  });

  describe('Waiter Call Services', () => {
    it('should call waiter', async () => {
      const callData = {
        sessionId: 'session-1',
        callType: 'assistance',
        message: 'Need help with menu',
        priority: 'medium',
      };

      const mockCall = {
        id: 'call-1',
        ...callData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const mockResponse = {
        success: true,
        data: mockCall,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.callWaiter(callData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('call-1');
      expect(result.data?.status).toBe('pending');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter-calls',
        data: callData,
      });
    });

    it('should cancel waiter call', async () => {
      const mockResponse = {
        success: true,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.cancelWaiterCall('call-1');

      expect(result.success).toBe(true);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter-calls/call-1/cancel',
      });
    });
  });

  describe('Reservation Services', () => {
    it('should create reservation', async () => {
      const reservationData = {
        locationId: 'loc-1',
        dateTime: '2023-12-25T19:00:00Z',
        partySize: 4,
        specialRequests: 'Window table please',
        contactInfo: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
        },
      };

      const mockReservation = {
        id: 'res-1',
        ...reservationData,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      const mockResponse = {
        success: true,
        data: mockReservation,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.createReservation(reservationData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('res-1');
      expect(result.data?.status).toBe('confirmed');
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/reservations',
        data: reservationData,
      });
    });

    it('should get available slots', async () => {
      const mockSlots = [
        { id: 'slot-1', dateTime: '2023-12-25T18:00:00Z', available: true },
        { id: 'slot-2', dateTime: '2023-12-25T19:00:00Z', available: true },
        { id: 'slot-3', dateTime: '2023-12-25T20:00:00Z', available: false },
      ];

      const mockResponse = {
        success: true,
        data: mockSlots,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.getAvailableSlots('loc-1', '2023-12-25', 4);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].available).toBe(true);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/reservations/availability',
        params: { locationId: 'loc-1', date: '2023-12-25', partySize: 4 },
      });
    });
  });

  describe('Review Services', () => {
    it('should create review', async () => {
      const reviewData = {
        locationId: 'loc-1',
        orderId: 'order-1',
        rating: 5,
        title: 'Excellent experience!',
        comment: 'Great food and service',
        categories: [
          { category: 'food', rating: 5 },
          { category: 'service', rating: 4 },
        ],
        isAnonymous: false,
      };

      const mockReview = {
        id: 'review-1',
        ...reviewData,
        createdAt: new Date().toISOString(),
      };

      const mockResponse = {
        success: true,
        data: mockReview,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.createReview(reviewData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('review-1');
      expect(result.data?.rating).toBe(5);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/reviews',
        data: reviewData,
      });
    });

    it('should get location reviews', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          title: 'Great place!',
          comment: 'Loved the food',
          createdAt: '2023-12-20T10:00:00Z',
        },
        {
          id: 'review-2',
          rating: 4,
          title: 'Good experience',
          comment: 'Nice atmosphere',
          createdAt: '2023-12-19T15:30:00Z',
        },
      ];

      const mockResponse = {
        success: true,
        data: mockReviews,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.getLocationReviews('loc-1', 20, 0);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].rating).toBe(5);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/reviews/location/loc-1',
        params: { limit: 20, offset: 0 },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const mockClient = require('axios').create();
      mockClient.request.mockRejectedValueOnce({
        request: {},
      });

      const result = await apiService.login('test@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error. Please check your connection.');
    });

    it('should handle unexpected errors', async () => {
      const mockClient = require('axios').create();
      mockClient.request.mockRejectedValueOnce(new Error('Unexpected error'));

      const result = await apiService.login('test@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred.');
    });
  });

  describe('Search Services', () => {
    it('should search locations', async () => {
      const mockResults = [
        { id: 'loc-1', name: 'Pizza Palace', cuisine: ['Italian'] },
        { id: 'loc-2', name: 'Burger Barn', cuisine: ['American'] },
      ];

      const mockResponse = {
        success: true,
        data: mockResults,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.searchLocations('pizza', { cuisine: 'Italian' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/search/locations',
        params: { q: 'pizza', cuisine: 'Italian' },
      });
    });

    it('should search menu items', async () => {
      const mockResults = [
        { id: 'item-1', name: 'Margherita Pizza', price: 15.99 },
        { id: 'item-2', name: 'Pepperoni Pizza', price: 17.99 },
      ];

      const mockResponse = {
        success: true,
        data: mockResults,
      };

      const mockClient = require('axios').create();
      mockClient.request.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiService.searchMenuItems('loc-1', 'pizza');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/search/menu/loc-1',
        params: { q: 'pizza' },
      });
    });
  });
});(
'loc-1');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Restaurant A');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/locations/loc-1',
      });
    });
  });

  describe('Session Management', () => {
    it('should create session successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'session-1',
            tableId: 'table-1',
            tableNumber: '5',
            participantCount: 2,
            status: 'active',
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await apiService.createSession('table-1', 2, 'John Doe');

      expect(result.success).toBe(true);
      expect(result.data?.tableNumber).toBe('5');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/sessions',
        data: { tableId: 'table-1', participantCount: 2, hostName: 'John Doe' },
      });
    });

    it('should join session successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            participant: {
              id: 'participant-1',
              fantasyName: 'Alice',
              isHost: false,
            },
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await apiService.joinSession('session-1', 'Alice');

      expect(result.success).toBe(true);
      expect(result.data?.participant.fantasyName).toBe('Alice');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/sessions/session-1/join',
        data: { fantasyName: 'Alice' },
      });
    });
  });

  describe('Menu and Orders', () => {
    it('should get menu successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            categories: [
              {
                id: 'cat-1',
                name: 'Appetizers',
                items: [
                  {
                    id: 'item-1',
                    name: 'Bruschetta',
                    price: 8.50,
                    description: 'Fresh tomatoes and basil',
                  },
                ],
              },
            ],
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await apiService.getMenu('loc-1');

      expect(result.success).toBe(true);
      expect(result.data?.categories).toHaveLength(1);
      expect(result.data?.categories[0].items[0].name).toBe('Bruschetta');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/locations/loc-1/menu',
      });
    });

    it('should place order successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'order-1',
            status: 'pending',
            totalAmount: 25.50,
            items: [
              {
                id: 'item-1',
                menuItemId: 'menu-item-1',
                quantity: 2,
                price: 12.75,
              },
            ],
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const orderData = {
        sessionId: 'session-1',
        items: [
          {
            menuItemId: 'menu-item-1',
            quantity: 2,
            customizations: [],
            specialInstructions: 'No onions',
          },
        ],
      };

      const result = await apiService.placeOrder(orderData);

      expect(result.success).toBe(true);
      expect(result.data?.totalAmount).toBe(25.50);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/orders',
        data: orderData,
      });
    });
  });

  describe('Waiter Calls', () => {
    it('should call waiter successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'call-1',
            sessionId: 'session-1',
            callType: 'assistance',
            status: 'pending',
            estimatedResponseTime: 5,
          },
        },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await apiService.callWaiter('session-1', 'assistance', 'Need help with menu');

      expect(result.success).toBe(true);
      expect(result.data?.callType).toBe('assistance');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/waiter-calls',
        data: {
          sessionId: 'session-1',
          callType: 'assistance',
          message: 'Need help with menu',
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.request.mockRejectedValueOnce(networkError);

      const result = await apiService.login('test@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });

    it('should handle server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            success: false,
            error: 'Internal server error',
          },
        },
      };

      mockAxiosInstance.request.mockRejectedValueOnce(serverError);

      const result = await apiService.getNearbyLocations(0, 0, 1000);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });
});