import { locationService } from '../../src/services/location';
import { PERMISSIONS, RESULTS } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import { Alert, Linking } from 'react-native';

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    },
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
  request: jest.fn(),
  check: jest.fn(),
}));

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
}));

describe('LocationService', () => {
  const mockRequest = require('react-native-permissions').request;
  const mockCheck = require('react-native-permissions').check;
  const mockGetCurrentPosition = Geolocation.getCurrentPosition as jest.MockedFunction<typeof Geolocation.getCurrentPosition>;
  const mockWatchPosition = Geolocation.watchPosition as jest.MockedFunction<typeof Geolocation.watchPosition>;
  const mockClearWatch = Geolocation.clearWatch as jest.MockedFunction<typeof Geolocation.clearWatch>;
  const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
  const mockOpenSettings = Linking.openSettings as jest.MockedFunction<typeof Linking.openSettings>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Management', () => {
    it('should request location permission successfully', async () => {
      mockRequest.mockResolvedValueOnce(RESULTS.GRANTED);

      const result = await locationService.requestLocationPermission();

      expect(result.granted).toBe(true);
      expect(result.accuracy).toBe('high');
      expect(mockRequest).toHaveBeenCalledWith(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    });

    it('should handle denied permission', async () => {
      mockRequest.mockResolvedValueOnce(RESULTS.DENIED);

      const result = await locationService.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.accuracy).toBe('none');
    });

    it('should handle blocked permission', async () => {
      mockRequest.mockResolvedValueOnce(RESULTS.BLOCKED);

      const result = await locationService.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.accuracy).toBe('none');
      expect(mockAlert).toHaveBeenCalledWith(
        'Location Permission Required',
        expect.stringContaining('blocked'),
        expect.any(Array)
      );
    });

    it('should handle unavailable permission', async () => {
      mockRequest.mockResolvedValueOnce(RESULTS.UNAVAILABLE);

      const result = await locationService.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.accuracy).toBe('none');
      expect(mockAlert).toHaveBeenCalledWith(
        'Location Unavailable',
        expect.stringContaining('not available'),
        undefined
      );
    });

    it('should check existing permission', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);

      const result = await locationService.checkLocationPermission();

      expect(result.granted).toBe(true);
      expect(result.accuracy).toBe('high');
      expect(mockCheck).toHaveBeenCalledWith(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    });
  });

  describe('Position Retrieval', () => {
    it('should get current position successfully', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      mockGetCurrentPosition.mockImplementationOnce((success) => {
        success(mockPosition);
      });

      const result = await locationService.getCurrentPosition();

      expect(result).not.toBeNull();
      expect(result?.coords.latitude).toBe(37.7749);
      expect(result?.coords.longitude).toBe(-122.4194);
      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        })
      );
    });

    it('should handle position error', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'Permission denied',
      };

      mockGetCurrentPosition.mockImplementationOnce((success, error) => {
        error(mockError);
      });

      const result = await locationService.getCurrentPosition();

      expect(result).toBeNull();
      expect(mockAlert).toHaveBeenCalledWith(
        'Location Permission Denied',
        expect.stringContaining('enable location permissions'),
        expect.any(Array)
      );
    });

    it('should request permission if not granted', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.DENIED);
      mockRequest.mockResolvedValueOnce(RESULTS.GRANTED);
      
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      mockGetCurrentPosition.mockImplementationOnce((success) => {
        success(mockPosition);
      });

      const result = await locationService.getCurrentPosition();

      expect(result).not.toBeNull();
      expect(mockCheck).toHaveBeenCalled();
      expect(mockRequest).toHaveBeenCalled();
    });
  });

  describe('Position Watching', () => {
    it('should start watching position successfully', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      mockWatchPosition.mockReturnValueOnce(123);

      const onSuccess = jest.fn();
      const onError = jest.fn();

      const result = await locationService.watchPosition(onSuccess, onError);

      expect(result).toBe(true);
      expect(mockWatchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          distanceFilter: 10,
        })
      );
    });

    it('should stop watching position', () => {
      // First start watching
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      mockWatchPosition.mockReturnValueOnce(123);
      
      locationService.watchPosition(jest.fn());
      locationService.stopWatchingPosition();

      expect(mockClearWatch).toHaveBeenCalledWith(123);
    });

    it('should handle watch position error', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
      };

      mockWatchPosition.mockImplementationOnce((success, error) => {
        error(mockError);
        return 123;
      });

      const onSuccess = jest.fn();
      const onError = jest.fn();

      await locationService.watchPosition(onSuccess, onError);

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(mockAlert).toHaveBeenCalledWith(
        'Location Unavailable',
        expect.stringContaining('check your GPS settings')
      );
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate distance between two coordinates', () => {
      const coord1 = { latitude: 37.7749, longitude: -122.4194 };
      const coord2 = { latitude: 37.7849, longitude: -122.4094 };

      const distance = locationService.calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20000); // Should be reasonable distance
    });

    it('should return 0 for same coordinates', () => {
      const coord = { latitude: 37.7749, longitude: -122.4194 };

      const distance = locationService.calculateDistance(coord, coord);

      expect(distance).toBe(0);
    });

    it('should check if location is within radius', () => {
      const userLocation = { latitude: 37.7749, longitude: -122.4194 };
      const targetLocation = { latitude: 37.7750, longitude: -122.4195 };

      const isWithin = locationService.isWithinRadius(userLocation, targetLocation, 200);

      expect(isWithin).toBe(true);
    });

    it('should check if location is outside radius', () => {
      const userLocation = { latitude: 37.7749, longitude: -122.4194 };
      const targetLocation = { latitude: 37.8749, longitude: -122.3194 };

      const isWithin = locationService.isWithinRadius(userLocation, targetLocation, 1000);

      expect(isWithin).toBe(false);
    });
  });

  describe('Distance Formatting', () => {
    it('should format distance in meters', () => {
      const formatted = locationService.formatDistance(500);
      expect(formatted).toBe('500m');
    });

    it('should format distance in kilometers', () => {
      const formatted = locationService.formatDistance(1500);
      expect(formatted).toBe('1.5km');
    });

    it('should format distance with rounding', () => {
      const formatted = locationService.formatDistance(1234);
      expect(formatted).toBe('1.2km');
    });
  });

  describe('Bearing Calculations', () => {
    it('should calculate bearing between coordinates', () => {
      const start = { latitude: 37.7749, longitude: -122.4194 };
      const end = { latitude: 37.7849, longitude: -122.4094 };

      const bearing = locationService.getBearing(start, end);

      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should get compass direction from bearing', () => {
      expect(locationService.getCompassDirection(0)).toBe('N');
      expect(locationService.getCompassDirection(45)).toBe('NE');
      expect(locationService.getCompassDirection(90)).toBe('E');
      expect(locationService.getCompassDirection(135)).toBe('SE');
      expect(locationService.getCompassDirection(180)).toBe('S');
      expect(locationService.getCompassDirection(225)).toBe('SW');
      expect(locationService.getCompassDirection(270)).toBe('W');
      expect(locationService.getCompassDirection(315)).toBe('NW');
    });
  });

  describe('Error Handling', () => {
    it('should handle permission timeout error', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      
      const mockError = {
        code: 3, // TIMEOUT
        message: 'Timeout',
      };

      mockGetCurrentPosition.mockImplementationOnce((success, error) => {
        error(mockError);
      });

      const result = await locationService.getCurrentPosition();

      expect(result).toBeNull();
      expect(mockAlert).toHaveBeenCalledWith(
        'Location Timeout',
        expect.stringContaining('timed out')
      );
    });

    it('should handle unknown error', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      
      const mockError = {
        code: 999, // Unknown error
        message: 'Unknown error',
      };

      mockGetCurrentPosition.mockImplementationOnce((success, error) => {
        error(mockError);
      });

      const result = await locationService.getCurrentPosition();

      expect(result).toBeNull();
      expect(mockAlert).toHaveBeenCalledWith(
        'Location Error',
        expect.stringContaining('error occurred')
      );
    });

    it('should handle permission request error', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Permission request failed'));

      const result = await locationService.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.accuracy).toBe('none');
    });
  });

  describe('Mock Location (Development)', () => {
    it('should provide mock location in development', () => {
      // Mock __DEV__ to be true
      (global as any).__DEV__ = true;

      const mockLocation = locationService.getMockLocation();

      expect(mockLocation.coords.latitude).toBe(37.7749);
      expect(mockLocation.coords.longitude).toBe(-122.4194);
      expect(mockLocation.coords.accuracy).toBe(10);
    });

    it('should throw error in production', () => {
      // Mock __DEV__ to be false
      (global as any).__DEV__ = false;

      expect(() => {
        locationService.getMockLocation();
      }).toThrow('Mock location is only available in development mode');
    });
  });

  describe('Location Services Check', () => {
    it('should detect if location services are enabled', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      mockGetCurrentPosition.mockImplementationOnce((success) => {
        success(mockPosition);
      });

      const isEnabled = await locationService.isLocationEnabled();

      expect(isEnabled).toBe(true);
    });

    it('should detect if location services are disabled', async () => {
      mockCheck.mockResolvedValueOnce(RESULTS.GRANTED);
      
      mockGetCurrentPosition.mockImplementationOnce((success, error) => {
        error({ code: 2, message: 'Position unavailable' });
      });

      const isEnabled = await locationService.isLocationEnabled();

      expect(isEnabled).toBe(false);
    });
  });

  describe('Geocoding Placeholders', () => {
    it('should return coordinate string for reverse geocoding', async () => {
      const address = await locationService.getAddressFromCoordinates(37.7749, -122.4194);

      expect(address).toBe('37.7749, -122.4194');
    });

    it('should return null for forward geocoding', async () => {
      const coordinates = await locationService.getCoordinatesFromAddress('123 Main St');

      expect(coordinates).toBeNull();
    });
  });
});