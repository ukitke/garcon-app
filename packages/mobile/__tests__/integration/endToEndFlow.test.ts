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

describe('End-to-End Mobile App Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Journey: Location to Payment', () => {
    it('should handle complete user flow from location detection to payment', async () => {
      // Step 1: Location Detection
      mockLocationService.getCurrentLocation.mockResolvedValueOnce({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
      });

      const userLocation = await mockLocationService.getCurrentLocation();
      expect(userLocation.accuracy).toBeLessThan(50); // Within 50m requirement

      // Step 2: Find Nearby Restaurants
      const mockRestaurants = [
        {
          id: 'rest-1',
          name: 'Italian Bistro',
          coordinates: { latitude: 37.7750, longitude: -122.4195 },
          distance: 25,
          rating: 4.5,
          isOpen: true,
        },
        {
          id: 'rest-2',
          name: 'French Café',
          coordinates: { latitude: 37.7748, longitude: -122.4193 },
          distance: 30,
          rating: 4.2,
          isOpen: true,
        },
      ];

      mockApiService.getNearbyLocations.mockResolvedValueOnce({
        success: true,
        data: mockRestaurants,
      });

      const nearbyResult = await mockApiService.getNearbyLocations(
        userLocation.latitude,
        userLocation.longitude,
        5000
      );

      expect(nearbyResult.success).toBe(true);
      expect(nearbyResult.data).toHaveLength(2);
      expect(nearbyResult.data?.[0].distance).toBeLessThan(50);

      // Step 3: Select Restaurant and Get Details
      const selectedRestaurant = nearbyResult.data?.[0];
      
      mockApiService.getLocation.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'rest-1',
          name: 'Italian Bistro',
          description: 'Authentic Italian cuisine',
          rating: 4.5,
          reviewCount: 123,
          address: '123 Main St',
          phone: '+1234567890',
          hours: {
            monday: { open: '11:00', close: '22:00' },
            tuesday: { open: '11:00', close: '22:00' },
          },
          tables: [
            { id: 'table-1', number: '5', capacity: 4, isAvailable: true },
            { id: 'table-2', number: '8', capacity: 6, isAvailable: true },
          ],
        },
      });

      const locationDetails = await mockApiService.getLocation('rest-1');
      expect(locationDetails.success).toBe(true);
      expect(locationDetails.data?.tables.length).toBeGreaterThan(0);

      // Step 4: Create or Join Session
      const selectedTable = locationDetails.data?.tables[0];
      
      mockApiService.createSession.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'session-1',
          tableId: 'table-1',
          tableNumber: '5',
          participantCount: 1,
          status: 'active',
          hostName: 'John Doe',
          participants: [
            {
              id: 'participant-1',
              fantasyName: 'Brave Dragon',
              isHost: true,
              joinedAt: new Date(),
            },
          ],
        },
      });

      const sessionResult = await mockApiService.createSession(
        selectedTable!.id,
        2,
        'John Doe'
      );

      expect(sessionResult.success).toBe(true);
      expect(sessionResult.data?.status).toBe('active');

      // Step 5: Connect to Socket for Real-time Updates
      mockSocketService.connect.mockResolvedValueOnce(undefined);
      mockSocketService.joinSession.mockImplementation(() => {});

      await mockSocketService.connect();
      mockSocketService.joinSession(sessionResult.data!.id);

      expect(mockSocketService.connect).toHaveBeenCalled();
      expect(mockSocketService.joinSession).toHaveBeenCalledWith('session-1');

      // Step 6: Get Menu
      const mockMenu = {
        categories: [
          {
            id: 'cat-1',
            name: 'Appetizers',
            items: [
              {
                id: 'item-1',
                name: 'Bruschetta',
                description: 'Fresh tomatoes and basil',
                price: 8.50,
                image: 'bruschetta.jpg',
                allergens: ['gluten'],
                preparationTime: 10,
              },
              {
                id: 'item-2',
                name: 'Antipasto Platter',
                description: 'Selection of Italian meats and cheeses',
                price: 16.00,
                image: 'antipasto.jpg',
                allergens: ['dairy'],
                preparationTime: 5,
              },
            ],
          },
          {
            id: 'cat-2',
            name: 'Main Courses',
            items: [
              {
                id: 'item-3',
                name: 'Pasta Carbonara',
                description: 'Traditional Roman pasta with eggs and pancetta',
                price: 18.50,
                image: 'carbonara.jpg',
                allergens: ['gluten', 'dairy', 'eggs'],
                preparationTime: 15,
              },
            ],
          },
        ],
      };

      mockApiService.getMenu.mockResolvedValueOnce({
        success: true,
        data: mockMenu,
      });

      const menuResult = await mockApiService.getMenu('rest-1');
      expect(menuResult.success).toBe(true);
      expect(menuResult.data?.categories).toHaveLength(2);

      // Step 7: Add Items to Cart and Place Order
      const orderItems = [
        {
          menuItemId: 'item-1',
          quantity: 2,
          customizations: [],
          specialInstructions: 'Extra basil please',
        },
        {
          menuItemId: 'item-3',
          quantity: 1,
          customizations: [],
          specialInstructions: 'No pepper',
        },
      ];

      mockApiService.placeOrder.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'order-1',
          sessionId: 'session-1',
          participantId: 'participant-1',
          items: orderItems.map((item, index) => ({
            id: `order-item-${index + 1}`,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: index === 0 ? 17.00 : 18.50, // 2 * 8.50 and 1 * 18.50
            customizations: item.customizations,
            specialInstructions: item.specialInstructions,
            status: 'pending',
          })),
          status: 'pending',
          totalAmount: 35.50,
          createdAt: new Date(),
          estimatedReadyTime: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
        },
      });

      const orderResult = await mockApiService.placeOrder({
        sessionId: 'session-1',
        items: orderItems,
      });

      expect(orderResult.success).toBe(true);
      expect(orderResult.data?.totalAmount).toBe(35.50);
      expect(orderResult.data?.status).toBe('pending');

      // Step 8: Track Order Status
      mockApiService.getOrderStatus.mockResolvedValueOnce({
        success: true,
        data: {
          orderId: 'order-1',
          status: 'confirmed',
          estimatedReadyTime: new Date(Date.now() + 18 * 60 * 1000),
          items: [
            {
              id: 'order-item-1',
              name: 'Bruschetta',
              quantity: 2,
              status: 'confirmed',
              preparationTime: 10,
            },
            {
              id: 'order-item-2',
              name: 'Pasta Carbonara',
              quantity: 1,
              status: 'confirmed',
              preparationTime: 15,
            },
          ],
        },
      });

      const orderStatusResult = await mockApiService.getOrderStatus('order-1');
      expect(orderStatusResult.success).toBe(true);
      expect(orderStatusResult.data?.status).toBe('confirmed');

      // Step 9: Call Waiter (if needed)
      mockApiService.callWaiter.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'call-1',
          sessionId: 'session-1',
          callType: 'assistance',
          message: 'Question about allergens',
          status: 'pending',
          estimatedResponseTime: 3,
          createdAt: new Date(),
        },
      });

      const waiterCallResult = await mockApiService.callWaiter(
        'session-1',
        'assistance',
        'Question about allergens'
      );

      expect(waiterCallResult.success).toBe(true);
      expect(waiterCallResult.data?.estimatedResponseTime).toBeLessThanOrEqual(5);

      // Step 10: Process Payment
      mockApiService.processPayment.mockResolvedValueOnce({
        success: true,
        data: {
          paymentId: 'payment-1',
          orderId: 'order-1',
          amount: 35.50,
          method: 'stripe',
          status: 'completed',
          transactionId: 'txn_123456789',
          receiptUrl: 'https://receipts.example.com/payment-1',
          processedAt: new Date(),
        },
      });

      const paymentResult = await mockApiService.processPayment({
        orderId: 'order-1',
        amount: 35.50,
        method: 'stripe',
        paymentMethodId: 'pm_123456789',
      });

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.data?.status).toBe('completed');
      expect(paymentResult.data?.receiptUrl).toBeTruthy();

      // Step 11: Submit Review (optional)
      mockApiService.submitReview.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'review-1',
          locationId: 'rest-1',
          userId: 'user-1',
          rating: 5,
          comment: 'Excellent food and service!',
          createdAt: new Date(),
        },
      });

      const reviewResult = await mockApiService.submitReview({
        locationId: 'rest-1',
        orderId: 'order-1',
        rating: 5,
        comment: 'Excellent food and service!',
      });

      expect(reviewResult.success).toBe(true);
      expect(reviewResult.data?.rating).toBe(5);

      // Verify complete flow success
      expect(userLocation).toBeTruthy();
      expect(nearbyResult.success).toBe(true);
      expect(sessionResult.success).toBe(true);
      expect(orderResult.success).toBe(true);
      expect(paymentResult.success).toBe(true);
    });
  });

  describe('Group Ordering Flow', () => {
    it('should handle group ordering with multiple participants', async () => {
      // Step 1: Host creates session
      mockApiService.createSession.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'session-2',
          tableId: 'table-2',
          tableNumber: '8',
          participantCount: 1,
          status: 'active',
          hostName: 'Alice',
          participants: [
            {
              id: 'participant-1',
              fantasyName: 'Mighty Eagle',
              isHost: true,
              joinedAt: new Date(),
            },
          ],
        },
      });

      const hostSession = await mockApiService.createSession('table-2', 4, 'Alice');
      expect(hostSession.success).toBe(true);

      // Step 2: Other participants join
      mockApiService.joinSession.mockResolvedValueOnce({
        success: true,
        data: {
          participant: {
            id: 'participant-2',
            fantasyName: 'Swift Fox',
            isHost: false,
            joinedAt: new Date(),
          },
          session: {
            id: 'session-2',
            participantCount: 2,
            participants: [
              {
                id: 'participant-1',
                fantasyName: 'Mighty Eagle',
                isHost: true,
                joinedAt: new Date(),
              },
              {
                id: 'participant-2',
                fantasyName: 'Swift Fox',
                isHost: false,
                joinedAt: new Date(),
              },
            ],
          },
        },
      });

      const joinResult = await mockApiService.joinSession('session-2', 'Bob');
      expect(joinResult.success).toBe(true);
      expect(joinResult.data?.participant.fantasyName).toBe('Swift Fox');

      // Step 3: Multiple participants place orders
      mockApiService.placeOrder
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'order-2',
            sessionId: 'session-2',
            participantId: 'participant-1',
            totalAmount: 25.50,
            status: 'pending',
            items: [
              {
                id: 'order-item-3',
                menuItemId: 'item-2',
                quantity: 1,
                price: 16.00,
              },
              {
                id: 'order-item-4',
                menuItemId: 'item-1',
                quantity: 1,
                price: 8.50,
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            id: 'order-3',
            sessionId: 'session-2',
            participantId: 'participant-2',
            totalAmount: 18.50,
            status: 'pending',
            items: [
              {
                id: 'order-item-5',
                menuItemId: 'item-3',
                quantity: 1,
                price: 18.50,
              },
            ],
          },
        });

      // Host places order
      const hostOrder = await mockApiService.placeOrder({
        sessionId: 'session-2',
        items: [
          { menuItemId: 'item-2', quantity: 1, customizations: [] },
          { menuItemId: 'item-1', quantity: 1, customizations: [] },
        ],
      });

      // Second participant places order
      const guestOrder = await mockApiService.placeOrder({
        sessionId: 'session-2',
        items: [
          { menuItemId: 'item-3', quantity: 1, customizations: [] },
        ],
      });

      expect(hostOrder.success).toBe(true);
      expect(guestOrder.success).toBe(true);

      // Step 4: Get session summary for payment
      mockApiService.getSessionSummary.mockResolvedValueOnce({
        success: true,
        data: {
          sessionId: 'session-2',
          totalAmount: 44.00, // 25.50 + 18.50
          participants: [
            {
              id: 'participant-1',
              fantasyName: 'Mighty Eagle',
              orders: ['order-2'],
              totalAmount: 25.50,
              isHost: true,
            },
            {
              id: 'participant-2',
              fantasyName: 'Swift Fox',
              orders: ['order-3'],
              totalAmount: 18.50,
              isHost: false,
            },
          ],
          orders: [
            {
              id: 'order-2',
              participantId: 'participant-1',
              totalAmount: 25.50,
              status: 'confirmed',
            },
            {
              id: 'order-3',
              participantId: 'participant-2',
              totalAmount: 18.50,
              status: 'confirmed',
            },
          ],
        },
      });

      const sessionSummary = await mockApiService.getSessionSummary('session-2');
      expect(sessionSummary.success).toBe(true);
      expect(sessionSummary.data?.totalAmount).toBe(44.00);
      expect(sessionSummary.data?.participants).toHaveLength(2);

      // Step 5: Split payment processing
      mockApiService.processSplitPayment.mockResolvedValueOnce({
        success: true,
        data: {
          sessionId: 'session-2',
          payments: [
            {
              paymentId: 'payment-2',
              participantId: 'participant-1',
              amount: 25.50,
              status: 'completed',
            },
            {
              paymentId: 'payment-3',
              participantId: 'participant-2',
              amount: 18.50,
              status: 'completed',
            },
          ],
          totalAmount: 44.00,
          status: 'completed',
        },
      });

      const splitPaymentResult = await mockApiService.processSplitPayment({
        sessionId: 'session-2',
        payments: [
          {
            participantId: 'participant-1',
            amount: 25.50,
            method: 'stripe',
            paymentMethodId: 'pm_host',
          },
          {
            participantId: 'participant-2',
            amount: 18.50,
            method: 'paypal',
            paymentMethodId: 'pm_guest',
          },
        ],
      });

      expect(splitPaymentResult.success).toBe(true);
      expect(splitPaymentResult.data?.status).toBe('completed');
      expect(splitPaymentResult.data?.payments).toHaveLength(2);
    });
  });

  describe('Real-time Functionality', () => {
    it('should handle real-time updates correctly', async () => {
      // Mock socket connection
      mockSocketService.connect.mockResolvedValueOnce(undefined);
      mockSocketService.on.mockImplementation(() => {});
      mockSocketService.emit.mockImplementation(() => {});

      await mockSocketService.connect();
      expect(mockSocketService.connect).toHaveBeenCalled();

      // Test order status updates
      const orderUpdateCallback = jest.fn();
      mockSocketService.on('order:status_updated', orderUpdateCallback);

      // Simulate order status update
      const orderUpdate = {
        orderId: 'order-1',
        status: 'preparing',
        estimatedReadyTime: new Date(Date.now() + 10 * 60 * 1000),
      };

      // Verify event listener is set up
      expect(mockSocketService.on).toHaveBeenCalledWith('order:status_updated', orderUpdateCallback);

      // Test waiter call responses
      const waiterResponseCallback = jest.fn();
      mockSocketService.on('waiter:call_response', waiterResponseCallback);

      expect(mockSocketService.on).toHaveBeenCalledWith('waiter:call_response', waiterResponseCallback);

      // Test session updates
      const sessionUpdateCallback = jest.fn();
      mockSocketService.on('session:participant_joined', sessionUpdateCallback);

      expect(mockSocketService.on).toHaveBeenCalledWith('session:participant_joined', sessionUpdateCallback);
    });

    it('should handle socket disconnection and reconnection', async () => {
      // Mock initial connection
      mockSocketService.connect.mockResolvedValueOnce(undefined);
      await mockSocketService.connect();

      // Mock disconnection
      const disconnectCallback = jest.fn();
      mockSocketService.on('disconnect', disconnectCallback);

      // Mock reconnection
      mockSocketService.reconnect.mockResolvedValueOnce(undefined);
      await mockSocketService.reconnect();

      expect(mockSocketService.reconnect).toHaveBeenCalled();
    });
  });

  describe('Offline Handling', () => {
    it('should handle offline scenarios gracefully', async () => {
      // Mock network error
      const networkError = new Error('Network request failed');
      mockApiService.getNearbyLocations.mockRejectedValueOnce(networkError);

      // Test offline handling
      try {
        await mockApiService.getNearbyLocations(37.7749, -122.4194, 5000);
      } catch (error) {
        expect(error).toEqual(networkError);
      }

      // Mock cached data retrieval
      mockApiService.getCachedLocations.mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'rest-1',
            name: 'Italian Bistro',
            coordinates: { latitude: 37.7750, longitude: -122.4195 },
            distance: 25,
            rating: 4.5,
            isOpen: true,
          },
        ],
      });

      const cachedResult = await mockApiService.getCachedLocations();
      expect(cachedResult.success).toBe(true);
      expect(cachedResult.data).toHaveLength(1);
    });

    it('should queue actions when offline', async () => {
      // Mock offline order placement
      mockApiService.queueOrder.mockResolvedValueOnce({
        success: true,
        data: {
          queueId: 'queue-1',
          orderId: 'order-pending',
          status: 'queued',
          willRetryAt: new Date(Date.now() + 30 * 1000),
        },
      });

      const queueResult = await mockApiService.queueOrder({
        sessionId: 'session-1',
        items: [
          { menuItemId: 'item-1', quantity: 1, customizations: [] },
        ],
      });

      expect(queueResult.success).toBe(true);
      expect(queueResult.data?.status).toBe('queued');

      // Mock sync when back online
      mockApiService.syncQueuedActions.mockResolvedValueOnce({
        success: true,
        data: {
          synced: 1,
          failed: 0,
          results: [
            {
              queueId: 'queue-1',
              orderId: 'order-1',
              status: 'completed',
            },
          ],
        },
      });

      const syncResult = await mockApiService.syncQueuedActions();
      expect(syncResult.success).toBe(true);
      expect(syncResult.data?.synced).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock various error scenarios
      const errors = [
        {
          response: { status: 400, data: { error: 'Invalid request' } },
          expectedError: 'Invalid request',
        },
        {
          response: { status: 401, data: { error: 'Unauthorized' } },
          expectedError: 'Unauthorized',
        },
        {
          response: { status: 404, data: { error: 'Not found' } },
          expectedError: 'Not found',
        },
        {
          response: { status: 500, data: { error: 'Server error' } },
          expectedError: 'Server error',
        },
      ];

      for (const errorCase of errors) {
        mockApiService.getLocation.mockRejectedValueOnce(errorCase);

        const result = await mockApiService.getLocation('invalid-id');
        expect(result.success).toBe(false);
        expect(result.error).toBe(errorCase.expectedError);
      }
    });

    it('should handle location permission errors', async () => {
      // Mock location permission denied
      mockLocationService.getCurrentLocation.mockRejectedValueOnce(
        new Error('Location permission denied')
      );

      try {
        await mockLocationService.getCurrentLocation();
      } catch (error) {
        expect(error.message).toBe('Location permission denied');
      }

      // Mock fallback to manual location selection
      mockLocationService.requestLocationPermission.mockResolvedValueOnce(false);
      const permissionResult = await mockLocationService.requestLocationPermission();
      expect(permissionResult).toBe(false);
    });

    it('should handle payment failures', async () => {
      // Mock payment failure
      mockApiService.processPayment.mockResolvedValueOnce({
        success: false,
        error: 'Payment declined',
        data: {
          paymentId: 'payment-failed',
          status: 'failed',
          errorCode: 'card_declined',
          errorMessage: 'Your card was declined',
        },
      });

      const paymentResult = await mockApiService.processPayment({
        orderId: 'order-1',
        amount: 35.50,
        method: 'stripe',
        paymentMethodId: 'pm_declined',
      });

      expect(paymentResult.success).toBe(false);
      expect(paymentResult.error).toBe('Payment declined');
      expect(paymentResult.data?.status).toBe('failed');
    });
  });
});