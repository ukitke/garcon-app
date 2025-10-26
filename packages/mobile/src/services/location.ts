import Geolocation from 'react-native-geolocation-service';
import { PERMISSIONS, request, check, RESULTS } from 'react-native-permissions';
import { Platform, Alert, Linking } from 'react-native';
import { Coordinates, LocationPermission, GeolocationPosition } from '../types';

class LocationService {
  private watchId: number | null = null;

  async requestLocationPermission(): Promise<LocationPermission> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const result = await request(permission);

      switch (result) {
        case RESULTS.GRANTED:
          return { granted: true, accuracy: 'high' };
        case RESULTS.DENIED:
          return { granted: false, accuracy: 'none' };
        case RESULTS.BLOCKED:
          this.showPermissionBlockedAlert();
          return { granted: false, accuracy: 'none' };
        case RESULTS.UNAVAILABLE:
          Alert.alert(
            'Location Unavailable',
            'Location services are not available on this device.'
          );
          return { granted: false, accuracy: 'none' };
        default:
          return { granted: false, accuracy: 'none' };
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return { granted: false, accuracy: 'none' };
    }
  }

  async checkLocationPermission(): Promise<LocationPermission> {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE 
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const result = await check(permission);

      switch (result) {
        case RESULTS.GRANTED:
          return { granted: true, accuracy: 'high' };
        case RESULTS.DENIED:
        case RESULTS.BLOCKED:
        case RESULTS.UNAVAILABLE:
          return { granted: false, accuracy: 'none' };
        default:
          return { granted: false, accuracy: 'none' };
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      return { granted: false, accuracy: 'none' };
    }
  }

  async getCurrentPosition(timeout: number = 15000): Promise<GeolocationPosition | null> {
    const permission = await this.checkLocationPermission();
    
    if (!permission.granted) {
      const requestResult = await this.requestLocationPermission();
      if (!requestResult.granted) {
        return null;
      }
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          });
        },
        (error) => {
          console.error('Error getting current position:', error);
          this.handleLocationError(error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout,
          maximumAge: 10000,
          showLocationDialog: true,
          forceRequestLocation: true,
        }
      );
    });
  }

  async watchPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError?: (error: any) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
      distanceFilter?: number;
    }
  ): Promise<boolean> {
    const permission = await this.checkLocationPermission();
    
    if (!permission.granted) {
      const requestResult = await this.requestLocationPermission();
      if (!requestResult.granted) {
        return false;
      }
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        onSuccess({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error('Error watching position:', error);
        this.handleLocationError(error);
        if (onError) {
          onError(error);
        }
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 15000,
        maximumAge: options?.maximumAge ?? 10000,
        distanceFilter: options?.distanceFilter ?? 10,
        showLocationDialog: true,
        forceRequestLocation: true,
      }
    );

    return true;
  }

  stopWatchingPosition(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
    const dLon = this.deg2rad(coord2.longitude - coord1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(coord1.latitude)) *
        Math.cos(this.deg2rad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance * 1000; // Convert to meters
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private handleLocationError(error: any): void {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        Alert.alert(
          'Location Permission Denied',
          'Please enable location permissions in your device settings to find nearby restaurants.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]
        );
        break;
      case 2: // POSITION_UNAVAILABLE
        Alert.alert(
          'Location Unavailable',
          'Unable to determine your location. Please check your GPS settings.'
        );
        break;
      case 3: // TIMEOUT
        Alert.alert(
          'Location Timeout',
          'Location request timed out. Please try again.'
        );
        break;
      default:
        Alert.alert(
          'Location Error',
          'An error occurred while trying to get your location.'
        );
        break;
    }
  }

  private showPermissionBlockedAlert(): void {
    Alert.alert(
      'Location Permission Required',
      'Location access has been blocked. Please enable it in your device settings to find nearby restaurants.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }

  // Utility methods for location-based features
  isWithinRadius(
    userLocation: Coordinates,
    targetLocation: Coordinates,
    radiusInMeters: number
  ): boolean {
    const distance = this.calculateDistance(userLocation, targetLocation);
    return distance <= radiusInMeters;
  }

  formatDistance(distanceInMeters: number): string {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km`;
    }
  }

  getBearing(
    start: Coordinates,
    end: Coordinates
  ): number {
    const startLat = this.deg2rad(start.latitude);
    const startLng = this.deg2rad(start.longitude);
    const endLat = this.deg2rad(end.latitude);
    const endLng = this.deg2rad(end.longitude);

    const dLng = endLng - startLng;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    let bearing = Math.atan2(y, x);
    bearing = (bearing * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  getCompassDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  // Mock location for testing (only in development)
  getMockLocation(): GeolocationPosition {
    if (!__DEV__) {
      throw new Error('Mock location is only available in development mode');
    }

    return {
      coords: {
        latitude: 37.7749, // San Francisco coordinates
        longitude: -122.4194,
        accuracy: 10,
        altitude: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };
  }

  // Check if location services are enabled
  async isLocationEnabled(): Promise<boolean> {
    try {
      // This is a simplified check - in a real app, you might want to use
      // a more sophisticated method to check if location services are enabled
      const position = await this.getCurrentPosition(5000);
      return position !== null;
    } catch (error) {
      return false;
    }
  }

  // Get address from coordinates (reverse geocoding)
  // Note: This would typically use a geocoding service like Google Maps
  async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      // This is a placeholder - in a real app, you would integrate with
      // a geocoding service like Google Maps Geocoding API
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return null;
    }
  }

  // Get coordinates from address (forward geocoding)
  async getCoordinatesFromAddress(address: string): Promise<Coordinates | null> {
    try {
      // This is a placeholder - in a real app, you would integrate with
      // a geocoding service like Google Maps Geocoding API
      console.log('Getting coordinates for address:', address);
      return null;
    } catch (error) {
      console.error('Error getting coordinates from address:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();
export default locationService;