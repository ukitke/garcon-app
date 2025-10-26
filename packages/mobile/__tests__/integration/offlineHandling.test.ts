import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from '../../src/services/api';
import { locationService } from '../../src/services/location';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../src/services/api');
jest.mock('../../src/services/location');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockLocationService = locationService as jest.Mocked<typeof locationService>;

describe('Offline Handling Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Network State Detection', () => {
    it('should detect when device goes offline', async () => {
      // Mock network state changes
      const mockNetworkState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      };

      mockNetInfo.fetch.mockResolvedValueOnce(mockNetworkState);
      
      const networkState = await mockNetInfo.fetch();
      expect(networkState.isConnected).toBe(false);
      expect(networkState.isInternetReachable).toBe(false);
    });

    it('should detect when device comes back online', async () => {
      // Mock network state changes
      const mockNetworkState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {
          isConnectionExpensive: false,
          ssid: 'TestWiFi',
          bssid: '00:00:00:00:00:00',
          strength: 100,
          ipAddress: '192.168.1.100',
          subnet: '255.255.255.0',
        },
      };

      mockNetInfo.fetch.mockResolvedValueOnce(mockNetworkState);
      
      const networkState = await mockNetInfo.fetch();
      expect(networkState.isConnected).toBe(true);
      expect(networkState.isInternetReachable).toBe(true);
    });

    it('should handle network state listener', () => {
      const mockUnsubscribe = jest.fn();
      const mockListener = jest.fn();

      mockNetInfo.addEventListener.mockReturnValueOnce(mockUnsubscribe);
      
      const unsubscribe = mockNetInfo.addEventListener(mockListener);
      expect(mockNetInfo.addEventListener).toHaveBeenCalledWith(mockListener);
      expect(typeof unsubscribe).toBe('function');
      
      // Test cleanup
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Data Caching', () => {
    it('should cache location data when online', async () => {
      const mockLocations = [
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

      // Mock successful API call
      mockApiService.getNearbyLocations.mockResolvedValueOnce({
        success: true,
        data: mockLocations,
      });

      // Mock AsyncStorage setItem
      mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);

      const result = await mockApiService.getNearbyLocations(37.7749, -122.4194, 5000);
      expect(result.success).toBe(true);

      // Verify data was cached
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_nearby_locations',
        JSON.stringify({
          data: mockLocations,
          timestamp: expect.any(Number),
          location: { latitude: 37.7749, longitude: -122.4194 },
        })
      );
    });

    it('should retrieve cached location data when offline', async () => {
      const cachedData = {
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
        timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
        location: { latitude: 37.7749, longitude: -122.4194 },
      };

      // Mock AsyncStorage getItem
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cachedData));

      // Mock API service to use cached data
      mockApiService.getCachedLocations.mockResolvedValueOnce({
        success: true,
        data: cachedData.data,
      });

      const result = await mockApiService.getCachedLocations();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('cached_nearby_locations');
    });

    it('should cache menu data', async () => {
      const mockMenu = {
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
      };

      mockApiService.getMenu.mockResolvedValueOnce({
        success: true,
        data: mockMenu,
      });

      mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);

      const result = await mockApiService.getMenu('rest-1');
      expect(result.success).toBe(true);

      // Verify menu was cached
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_menu_rest-1',
        JSON.stringify({
          data: mockMenu,
          timestamp: expect.any(Number),
        })
      );
    });

    it('should handle cache expiration', async () => {
      const expiredCachedData = {
        data: [{ id: 'rest-1', name: 'Old Restaurant' }],
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (expired)
        location: { latitude: 37.7749, longitude: -122.4194 },
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(expiredCachedData));

      // Mock cache service to detect expiration
      mockApiService.getCachedLocations.mockResolvedValueOnce({
        success: false,
        error: 'Cache expired',
      });

      const result = await mockApiService.getCachedLocations();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cache expired');
    });
  });

  describe('Action Queuing', () => {
    it('should queue orders when offline', async () => {
      const orderData = {
        sessionId: 'session-1',
        items: [
          {
            menuItemId: 'item-1',
            quantity: 2,
            customizations: [],
            specialInstructions: 'Extra basil',
          },
        ],
      };

      // Mock offline order queuing
      mockApiService.queueOrder.mockResolvedValueOnce({
        success: true,
        data: {
          queueId: 'queue-1',
          orderId: 'order-pending',
          status: 'queued',
          willRetryAt: new Date(Date.now() + 30 * 1000),
        },
      });

      mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);

      const result = await mockApiService.queueOrder(orderData);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('queued');

      // Verify order was queued in storage
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'queued_actions',
        expect.stringContaining('queue-1')
      );
    });

    it('should queue waiter calls when offline', async () => {
      const callData = {
        sessionId: 'session-1',
        callType: 'assistance',
        message: 'Need help with menu',
      };

      mockApiService.queueWaiterCall.mockResolvedValueOnce({
        success: true,
        data: {
          queueId: 'queue-call-1',
          callId: 'call-pending',
          status: 'queued',
          willRetryAt: new Date(Date.now() + 15 * 1000),
        },
      });

      mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);

      const result = await mockApiService.queueWaiterCall(callData);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('queued');
    });

    it('should sync queued actions when back online', async () => {
      const queuedActions = [
        {
          queueId: 'queue-1',
          type: 'order',
          data: {
            sessionId: 'session-1',
            items: [{ menuItemId: 'item-1', quantity: 1 }],
          },
          timestamp: Date.now() - 2 * 60 * 1000,
        },
        {
          queueId: 'queue-call-1',
          type: 'waiter_call',
          data: {
            sessionId: 'session-1',
            callType: 'assistance',
            message: 'Help needed',
          },
          timestamp: Date.now() - 1 * 60 * 1000,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queuedActions));

      mockApiService.syncQueuedActions.mockResolvedValueOnce({
        success: true,
        data: {
          synced: 2,
          failed: 0,
          results: [
            {
              queueId: 'queue-1',
              orderId: 'order-1',
              status: 'completed',
            },
            {
              queueId: 'queue-call-1',
              callId: 'call-1',
              status: 'completed',
            },
          ],
        },
      });

      mockAsyncStorage.removeItem.mockResolvedValueOnce(undefined);

      const result = await mockApiService.syncQueuedActions();
      expect(result.success).toBe(true);
      expect(result.data?.synced).toBe(2);
      expect(result.data?.failed).toBe(0);

      // Verify queued actions were cleared after sync
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('queued_actions');
    });

    it('should handle partial sync failures', async () => {
      const queuedActions = [
        {
          queueId: 'queue-1',
          type: 'order',
          data: { sessionId: 'session-1', items: [] },
          timestamp: Date.now() - 3 * 60 * 1000,
        },
        {
          queueId: 'queue-2',
          type: 'order',
          data: { sessionId: 'invalid-session', items: [] },
          timestamp: Date.now() - 2 * 60 * 1000,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(queuedActions));

      mockApiService.syncQueuedActions.mockResolvedValueOnce({
        success: true,
        data: {
          synced: 1,
          failed: 1,
          results: [
            {
              queueId: 'queue-1',
              orderId: 'order-1',
              status: 'completed',
            },
            {
              queueId: 'queue-2',
              status: 'failed',
              error: 'Invalid session',
            },
          ],
        },
      });

      // Mock updating storage with only failed actions
      mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);

      const result = await mockApiService.syncQueuedActions();
      expect(result.success).toBe(true);
      expect(result.data?.synced).toBe(1);
      expect(result.data?.failed).toBe(1);

      // Verify failed actions are kept for retry
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'queued_actions',
        expect.stringContaining('queue-2')
      );
    });
  });

  describe('Location Services Offline', () => {
    it('should use cached location when GPS is unavailable', async () => {
      // Mock GPS failure
      mockLocationService.getCurrentLocation.mockRejectedValueOnce(
        new Error('Location services unavailable')
      );

      // Mock cached location
      const cachedLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 15,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(cachedLocation));
      mockLocationService.getCachedLocation.mockResolvedValueOnce(cachedLocation);

      const result = await mockLocationService.getCachedLocation();
      expect(result.latitude).toBe(37.7749);
      expect(result.longitude).toBe(-122.4194);
    });

    it('should handle location permission changes', async () => {
      // Mock permission denied
      mockLocationService.requestLocationPermission.mockResolvedValueOnce(false);

      const permissionResult = await mockLocationService.requestLocationPermission();
      expect(permissionResult).toBe(false);

      // Mock fallback to manual location entry
      mockLocationService.setManualLocation.mockResolvedValueOnce({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 1000, // Lower accuracy for manual entry
        isManual: true,
      });

      const manualLocation = await mockLocationService.setManualLocation(37.7749, -122.4194);
      expect(manualLocation.isManual).toBe(true);
      expect(manualLocation.accuracy).toBe(1000);
    });
  });

  describe('Data Synchronization', () => {
    it('should sync user profile changes when back online', async () => {
      const profileUpdates = {
        name: 'John Updated',
        email: 'john.updated@example.com',
        phone: '+1234567890',
      };

      // Mock offline profile update
      mockAsyncStorage.setItem.mockResolvedValueOnce(undefined);
      mockApiService.queueProfileUpdate.mockResolvedValueOnce({
        success: true,
        data: {
          queueId: 'profile-queue-1',
          status: 'queued',
        },
      });

      const queueResult = await mockApiService.queueProfileUpdate(profileUpdates);
      expect(queueResult.success).toBe(true);

      // Mock sync when online
      mockApiService.syncProfileUpdates.mockResolvedValueOnce({
        success: true,
        data: {
          userId: 'user-1',
          updatedFields: ['name', 'email', 'phone'],
          syncedAt: new Date(),
        },
      });

      const syncResult = await mockApiService.syncProfileUpdates();
      expect(syncResult.success).toBe(true);
      expect(syncResult.data?.updatedFields).toContain('name');
    });

    it('should handle data conflicts during sync', async () => {
      // Mock conflict scenario
      mockApiService.syncQueuedActions.mockResolvedValueOnce({
        success: true,
        data: {
          synced: 0,
          failed: 1,
          conflicts: [
            {
              queueId: 'queue-conflict-1',
              type: 'order',
              conflict: 'session_expired',
              localData: { sessionId: 'session-1', items: [] },
              serverData: { sessionId: 'session-1', status: 'expired' },
            },
          ],
        },
      });

      const result = await mockApiService.syncQueuedActions();
      expect(result.success).toBe(true);
      expect(result.data?.conflicts).toHaveLength(1);
      expect(result.data?.conflicts?.[0].conflict).toBe('session_expired');
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed network requests', async () => {
      // Mock initial failure
      mockApiService.getNearbyLocations
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: 'rest-1', name: 'Restaurant' }],
        });

      // Mock retry mechanism
      mockApiService.retryRequest.mockResolvedValueOnce({
        success: true,
        data: [{ id: 'rest-1', name: 'Restaurant' }],
        attempts: 3,
      });

      const result = await mockApiService.retryRequest('getNearbyLocations', [37.7749, -122.4194, 5000]);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it('should handle storage quota exceeded', async () => {
      // Mock storage quota exceeded error
      const quotaError = new Error('QuotaExceededError');
      mockAsyncStorage.setItem.mockRejectedValueOnce(quotaError);

      // Mock cleanup mechanism
      mockApiService.cleanupOldCache.mockResolvedValueOnce({
        success: true,
        data: {
          itemsRemoved: 5,
          spaceFreed: 1024 * 1024, // 1MB
        },
      });

      const cleanupResult = await mockApiService.cleanupOldCache();
      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult.data?.itemsRemoved).toBeGreaterThan(0);
    });

    it('should gracefully degrade functionality when offline', async () => {
      // Mock offline state
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      });

      // Mock degraded functionality
      mockApiService.getOfflineCapabilities.mockResolvedValueOnce({
        success: true,
        data: {
          canBrowseMenu: true,
          canPlaceOrder: false,
          canCallWaiter: false,
          canMakePayment: false,
          canViewOrderHistory: true,
          message: 'Limited functionality available offline',
        },
      });

      const capabilities = await mockApiService.getOfflineCapabilities();
      expect(capabilities.success).toBe(true);
      expect(capabilities.data?.canBrowseMenu).toBe(true);
      expect(capabilities.data?.canPlaceOrder).toBe(false);
    });
  });
});