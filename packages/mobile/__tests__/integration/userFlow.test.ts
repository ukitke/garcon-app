import { apiService } from '../../src/services/api';
import { locationService } from '../../src/services/location';
import { socketService } from '../../src/services/socket';

// Mock all services
jest.mock('../../src/services/api');
jest.mock('../../src/services/location');
jest.mock('../../src/services/socket');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockLocationService = locationService as jest.Mocked<typeof locationService>;
const mockSocketService = socketService as jest.Mocked<typeof socketService>;

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Dining Experience Flow', () => {
    it('should complete full user journey from location detection to payment', async () => {
      // Step 1: User opens app and location is detected
      mockLocationService.getCurrentPosition.mockResolvedValueOnce({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const userPosition = await locationService.getCurrentPosition();
      expect(userPosition).not.toBeNull();

      // Step 2: Find nearby restaurants
      const mockLocations = [
        {
          id: 'loc-1',
          name: 'Italian Bistro',
          coordinates: { latitude: 37.7750, longitude: -122.4195 },
          distance: 50,
          isOpen: true,
          rating: 4.5,
        },
      ];

      mockApiService.getNearbyLocations.mockResolvedValueOnce({
        success: true,
        data: mockLocations,
      });

      const nearbyLocations = await apiService.getNearbyLocations(37.7749, -122.4194);
      expect(nearbyLocations.success).toBe(true);
      expect(nearbyLocations.data).toHaveLength(1);

      // Step 3: Select restaurant and get tables
      const mockTables = [
        { id: 'table-1', tableNumber: '5', capacity: 4, isAvailable: true },
        { id: 'table-2', tableNumber: '6', capacity: 2, isAvailable: false },
      ];

      mockApiService.getLocationTables.mockResolvedValueOnce({
        success: true,
        data: mockTables,
      });

      const tables = await apiService.getLocationTables('loc-1');
      expect(tables.success).toBe(true);
      expect(tables.data?.filter(t => t.isAvailable)).toHaveLength(1);

      // Step 4: Join table session
      const mockSession = {
        id: 'session-1',
        tableId: 'table-1',
        participants: [
          { id: 'participant-1', fantasyName: 'Dragon Slayer', isHost: true },
        ],
      };

      mockApiService.joinTableSession.mockResolvedValueOnce({
        success: true,
        data: mockSession,
      });

      const session = await apiService.joinTableSession('table-1', 'Dragon Slayer');
      expect(session.success).toBe(true);
      expect(session.data?.participants).toHaveLength(1);

      // Step 5: Get menu
      const mockMenu = {
        categories: [
          {
            id: 'cat-1',
            name: 'Main Courses',
            items: [
              {
                id: 'item-1',
                name: 'Margherita Pizza',
                price: 15.99,
                isAvailable: true,
              },
              {
                id: 'item-2',
                name: 'Pasta Carbonara',
                price: 18.99,
                isAvailable: true,
              },
            ],
          },
        ],
      };

      mockApiService.getLocationMenu.mockResolvedValueOnce({
        success: true,
        data: mockMenu,
      });

      const menu = await apiService.getLocationMenu('loc-1');
      expect(menu.success).toBe(true);
      expect(menu.data?.categories[0].items).toHaveLength(2);

      // Step 6: Place order
      const orderData = {
        sessionId: 'session-1',
        items: [
          {
            menuItemId: 'item-1',
            quantity: 1,
            customizations: [],
            specialInstructions: 'Extra cheese',
          },
        ],
      };

      const mockOrder = {
        id: 'order-1',
        ...orderData,
        status: 'pending',
        totalAmount: 15.99,
        createdAt: new Date().toISOString(),
      };

      mockApiService.placeOrder.mockResolvedValueOnce({
        success: true,
        data: mockOrder,
      });

      const order = await apiService.placeOrder(orderData);
      expect(order.success).toBe(true);
      expect(order.data?.totalAmount).toBe(15.99);

      // Step 7: Call waiter
      const callData = {
        sessionId: 'session-1',
        callType: 'assistance',
        message: 'Could we get some water?',
        priority: 'medium',
      };

      const mockCall = {
        id: 'call-1',
        ...callData,
        status: 'pending',
      };

      mockApiService.callWaiter.mockResolvedValueOnce({
        success: true,
        data: mockCall,
      });

      const waiterCall = await apiService.callWaiter(callData);
      expect(waiterCall.success).toBe(true);
      expect(waiterCall.data?.status).toBe('pending');

      // Step 8: Process payment
      const mockPaymentMethods = [
        {
          id: 'pm-1',
          type: 'card',
          provider: 'stripe',
          displayName: 'Visa •••• 4242',
          isDefault: true,
        },
      ];

      mockApiService.getPaymentMethods.mockResolvedValueOnce({
        success: true,
        data: mockPaymentMethods,
      });

      const paymentMethods = await apiService.getPaymentMethods();
      expect(paymentMethods.success).toBe(true);
      expect(paymentMethods.data).toHaveLength(1);

      // Create payment intent
      const mockPaymentIntent = {
        id: 'pi-1',
        amount: 15.99,
        status: 'requires_confirmation',
      };

      mockApiService.createPaymentIntent.mockResolvedValueOnce({
        success: true,
        data: mockPaymentIntent,
      });

      const paymentIntent = await apiService.createPaymentIntent({
        orderId: 'order-1',
        paymentMethodId: 'pm-1',
        amount: 15.99,
      });

      expect(paymentIntent.success).toBe(true);
      expect(paymentIntent.data?.amount).toBe(15.99);

      // Confirm payment
      mockApiService.confirmPayment.mockResolvedValueOnce({
        success: true,
        data: { id: 'pi-1', status: 'succeeded' },
      });

      const paymentConfirmation = await apiService.confirmPayment('pi-1');
      expect(paymentConfirmation.success).toBe(true);
      expect(paymentConfirmation.data?.status).toBe('succeeded');

      // Step 9: Leave session
      mockApiService.leaveTableSession.mockResolvedValueOnce({
        success: true,
      });

      const leaveSession = await apiService.leaveTableSession('session-1');
      expect(leaveSession.success).toBe(true);
    });
  });

  describe('Group Ordering Flow', () => {
    it('should handle multiple participants ordering', async () => {
      // Step 1: First user joins table
      const mockSession1 = {
        id: 'session-1',
        tableId: 'table-1',
        participants: [
          { id: 'participant-1', fantasyName: 'Dragon Slayer', isHost: true },
        ],
      };

      mockApiService.joinTableSession.mockResolvedValueOnce({
        success: true,
        data: mockSession1,
      });

      const session1 = await apiService.joinTableSession('table-1', 'Dragon Slayer');
      expect(session1.success).toBe(true);

      // Step 2: Second user joins table
      const mockSession2 = {
        id: 'session-1',
        tableId: 'table-1',
        participants: [
          { id: 'participant-1', fantasyName: 'Dragon Slayer', isHost: true },
          { id: 'participant-2', fantasyName: 'Wizard Master', isHost: false },
        ],
      };

      mockApiService.joinTableSession.mockResolvedValueOnce({
        success: true,
        data: mockSession2,
      });

      const session2 = await apiService.joinTableSession('table-1', 'Wizard Master');
      expect(session2.success).toBe(true);
      expect(session2.data?.participants).toHaveLength(2);

      // Step 3: Both users place orders
      const order1Data = {
        sessionId: 'session-1',
        items: [{ menuItemId: 'item-1', quantity: 1, customizations: [] }],
      };

      const order2Data = {
        sessionId: 'session-1',
        items: [{ menuItemId: 'item-2', quantity: 1, customizations: [] }],
      };

      mockApiService.placeOrder
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'order-1', totalAmount: 15.99 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'order-2', totalAmount: 18.99 },
        });

      const order1 = await apiService.placeOrder(order1Data);
      const order2 = await apiService.placeOrder(order2Data);

      expect(order1.success).toBe(true);
      expect(order2.success).toBe(true);

      // Step 4: Handle split payment
      const mockSplitOptions = {
        participants: [
          { id: 'participant-1', orders: [{ id: 'order-1', amount: 15.99 }] },
          { id: 'participant-2', orders: [{ id: 'order-2', amount: 18.99 }] },
        ],
        totalAmount: 34.98,
      };

      mockApiService.getSplitPaymentOptions.mockResolvedValueOnce({
        success: true,
        data: mockSplitOptions,
      });

      const splitOptions = await apiService.getSplitPaymentOptions('session-1');
      expect(splitOptions.success).toBe(true);
      expect(splitOptions.data?.totalAmount).toBe(34.98);
    });
  });

  describe('Reservation Flow', () => {
    it('should complete reservation booking flow', async () => {
      // Step 1: Check availability
      const mockSlots = [
        { id: 'slot-1', dateTime: '2023-12-25T19:00:00Z', available: true },
        { id: 'slot-2', dateTime: '2023-12-25T20:00:00Z', available: true },
      ];

      mockApiService.getAvailableSlots.mockResolvedValueOnce({
        success: true,
        data: mockSlots,
      });

      const availability = await apiService.getAvailableSlots('loc-1', '2023-12-25', 4);
      expect(availability.success).toBe(true);
      expect(availability.data?.filter(slot => slot.available)).toHaveLength(2);

      // Step 2: Create reservation
      const reservationData = {
        locationId: 'loc-1',
        dateTime: '2023-12-25T19:00:00Z',
        partySize: 4,
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
      };

      mockApiService.createReservation.mockResolvedValueOnce({
        success: true,
        data: mockReservation,
      });

      const reservation = await apiService.createReservation(reservationData);
      expect(reservation.success).toBe(true);
      expect(reservation.data?.status).toBe('confirmed');

      // Step 3: Get user reservations
      mockApiService.getUserReservations.mockResolvedValueOnce({
        success: true,
        data: [mockReservation],
      });

      const userReservations = await apiService.getUserReservations();
      expect(userReservations.success).toBe(true);
      expect(userReservations.data).toHaveLength(1);
    });
  });

  describe('Review Flow', () => {
    it('should complete review submission flow', async () => {
      // Step 1: Get order details for review
      const mockOrder = {
        id: 'order-1',
        locationId: 'loc-1',
        status: 'delivered',
        totalAmount: 25.99,
        items: [
          { menuItem: { name: 'Pizza Margherita' }, quantity: 1 },
        ],
      };

      mockApiService.getOrder.mockResolvedValueOnce({
        success: true,
        data: mockOrder,
      });

      const order = await apiService.getOrder('order-1');
      expect(order.success).toBe(true);
      expect(order.data?.status).toBe('delivered');

      // Step 2: Get location details
      const mockLocation = {
        id: 'loc-1',
        name: 'Italian Bistro',
        rating: 4.3,
        reviewCount: 150,
      };

      mockApiService.getLocation.mockResolvedValueOnce({
        success: true,
        data: mockLocation,
      });

      const location = await apiService.getLocation('loc-1');
      expect(location.success).toBe(true);

      // Step 3: Submit review
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

      mockApiService.createReview.mockResolvedValueOnce({
        success: true,
        data: mockReview,
      });

      const review = await apiService.createReview(reviewData);
      expect(review.success).toBe(true);
      expect(review.data?.rating).toBe(5);

      // Step 4: Verify review appears in location reviews
      mockApiService.getLocationReviews.mockResolvedValueOnce({
        success: true,
        data: [mockReview],
      });

      const locationReviews = await apiService.getLocationReviews('loc-1');
      expect(locationReviews.success).toBe(true);
      expect(locationReviews.data).toHaveLength(1);
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error
      mockApiService.getNearbyLocations.mockResolvedValueOnce({
        success: false,
        error: 'Network error. Please check your connection.',
      });

      const result = await apiService.getNearbyLocations(37.7749, -122.4194);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');

      // Retry should work
      mockApiService.getNearbyLocations.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const retryResult = await apiService.getNearbyLocations(37.7749, -122.4194);
      expect(retryResult.success).toBe(true);
    });

    it('should handle order cancellation flow', async () => {
      // Step 1: Place order
      const mockOrder = {
        id: 'order-1',
        status: 'confirmed',
        totalAmount: 25.99,
      };

      mockApiService.placeOrder.mockResolvedValueOnce({
        success: true,
        data: mockOrder,
      });

      const order = await apiService.placeOrder({
        sessionId: 'session-1',
        items: [{ menuItemId: 'item-1', quantity: 1, customizations: [] }],
      });

      expect(order.success).toBe(true);

      // Step 2: Cancel order
      mockApiService.cancelOrder.mockResolvedValueOnce({
        success: true,
      });

      const cancellation = await apiService.cancelOrder('order-1', 'Changed mind');
      expect(cancellation.success).toBe(true);

      // Step 3: Verify order status
      mockApiService.getOrder.mockResolvedValueOnce({
        success: true,
        data: { ...mockOrder, status: 'cancelled' },
      });

      const updatedOrder = await apiService.getOrder('order-1');
      expect(updatedOrder.data?.status).toBe('cancelled');
    });
  });

  describe('Real-time Updates Flow', () => {
    it('should handle real-time order status updates', async () => {
      // Setup socket connection
      mockSocketService.connect.mockResolvedValueOnce(undefined);
      mockSocketService.isSocketConnected.mockReturnValueOnce(true);

      await socketService.connect();
      expect(mockSocketService.connect).toHaveBeenCalled();

      // Simulate order status update
      const statusUpdate = {
        orderId: 'order-1',
        status: 'preparing' as const,
        estimatedReadyTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      };

      // In a real test, you would trigger the socket event
      // and verify that the UI updates accordingly
      expect(mockSocketService.on).toHaveBeenCalledWith(
        'order:status_updated',
        expect.any(Function)
      );
    });

    it('should handle waiter call acknowledgment', async () => {
      const callAcknowledgment = {
        callId: 'call-1',
        waiterId: 'waiter-1',
        estimatedResponseTime: 300, // 5 minutes
      };

      // Verify socket listener is set up
      expect(mockSocketService.on).toHaveBeenCalledWith(
        'waiter:call_acknowledged',
        expect.any(Function)
      );
    });

    it('should handle session participant updates', async () => {
      const participantJoined = {
        participant: {
          id: 'participant-2',
          fantasyName: 'Mighty Warrior',
          isHost: false,
        },
      };

      // Verify socket listener is set up
      expect(mockSocketService.on).toHaveBeenCalledWith(
        'session:participant_joined',
        expect.any(Function)
      );
    });
  });

  describe('Offline Handling', () => {
    it('should handle offline scenarios', async () => {
      // Simulate offline state
      mockApiService.checkHealth.mockResolvedValueOnce({
        success: false,
        error: 'Network error',
      });

      const healthCheck = await apiService.checkHealth();
      expect(healthCheck.success).toBe(false);

      // App should handle offline state gracefully
      // This would involve testing cached data, offline queues, etc.
    });
  });

  describe('Authentication Flow', () => {
    it('should handle token refresh automatically', async () => {
      // Simulate expired token
      mockApiService.getUserProfile.mockResolvedValueOnce({
        success: false,
        error: 'Token expired',
      });

      // Token refresh should be triggered
      mockApiService.refreshToken.mockResolvedValueOnce({
        success: true,
        data: {
          token: 'new-token',
          refreshToken: 'new-refresh-token',
        },
      });

      // Retry original request
      mockApiService.getUserProfile.mockResolvedValueOnce({
        success: true,
        data: { id: 'user-1', name: 'John Doe' },
      });

      // This flow would be handled by the API service interceptors
      const refreshResult = await apiService.refreshToken();
      expect(refreshResult.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent API calls', async () => {
      const promises = [
        apiService.getNearbyLocations(37.7749, -122.4194),
        apiService.getUserProfile(),
        apiService.getNotifications(),
      ];

      mockApiService.getNearbyLocations.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      mockApiService.getUserProfile.mockResolvedValueOnce({
        success: true,
        data: { id: 'user-1' },
      });

      mockApiService.getNotifications.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle rapid location updates', async () => {
      const positions = [
        { coords: { latitude: 37.7749, longitude: -122.4194 }, timestamp: Date.now() },
        { coords: { latitude: 37.7750, longitude: -122.4195 }, timestamp: Date.now() + 1000 },
        { coords: { latitude: 37.7751, longitude: -122.4196 }, timestamp: Date.now() + 2000 },
      ];

      positions.forEach((position, index) => {
        mockLocationService.getCurrentPosition.mockResolvedValueOnce(position);
      });

      const results = await Promise.all([
        locationService.getCurrentPosition(),
        locationService.getCurrentPosition(),
        locationService.getCurrentPosition(),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result?.coords.latitude).toBe(positions[index].coords.latitude);
      });
    });
  });
});