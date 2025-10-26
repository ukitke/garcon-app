import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Location, GeolocationPosition } from '../types';
import { locationService } from '../services/location';
import { apiService } from '../services/api';
import Button from '../components/common/Button';

const LocationSelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');

  useEffect(() => {
    initializeLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyLocations();
    }
  }, [userLocation, sortBy]);

  const initializeLocation = async () => {
    try {
      const permission = await locationService.checkLocationPermission();
      setLocationPermission(permission.granted);

      if (permission.granted) {
        const position = await locationService.getCurrentPosition();
        if (position) {
          setUserLocation(position);
        } else {
          // Fallback to loading all locations without distance
          loadAllLocations();
        }
      } else {
        // Show permission request
        showLocationPermissionDialog();
      }
    } catch (error) {
      console.error('Error initializing location:', error);
      loadAllLocations();
    }
  };

  const showLocationPermissionDialog = () => {
    Alert.alert(
      'Location Access',
      'Allow Garçon to access your location to find nearby restaurants?',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => loadAllLocations(),
        },
        {
          text: 'Allow',
          onPress: async () => {
            const permission = await locationService.requestLocationPermission();
            if (permission.granted) {
              const position = await locationService.getCurrentPosition();
              if (position) {
                setUserLocation(position);
                setLocationPermission(true);
              }
            } else {
              loadAllLocations();
            }
          },
        },
      ]
    );
  };

  const loadNearbyLocations = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      const response = await apiService.getNearbyLocations(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        5000 // 5km radius
      );

      if (response.success && response.data) {
        const locationsWithDistance = response.data.map((location: Location) => ({
          ...location,
          distance: locationService.calculateDistance(
            userLocation.coords,
            location.coordinates
          ),
        }));

        setLocations(sortLocations(locationsWithDistance));
      } else {
        Alert.alert('Error', response.error || 'Failed to load nearby locations');
      }
    } catch (error) {
      console.error('Error loading nearby locations:', error);
      Alert.alert('Error', 'Failed to load nearby locations');
    } finally {
      setLoading(false);
    }
  };

  const loadAllLocations = async () => {
    try {
      setLoading(true);
      // This would be a different API endpoint for all locations
      const response = await apiService.searchLocations('', {
        limit: 50,
        sortBy: 'rating',
      });

      if (response.success && response.data) {
        setLocations(sortLocations(response.data));
      } else {
        Alert.alert('Error', response.error || 'Failed to load locations');
      }
    } catch (error) {
      console.error('Error loading all locations:', error);
      Alert.alert('Error', 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const sortLocations = (locationList: Location[]): Location[] => {
    return [...locationList].sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userLocation) {
      await loadNearbyLocations();
    } else {
      await loadAllLocations();
    }
    setRefreshing(false);
  }, [userLocation]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      if (userLocation) {
        loadNearbyLocations();
      } else {
        loadAllLocations();
      }
      return;
    }

    try {
      const response = await apiService.searchLocations(query, {
        latitude: userLocation?.coords.latitude,
        longitude: userLocation?.coords.longitude,
      });

      if (response.success && response.data) {
        const searchResults = response.data.map((location: Location) => ({
          ...location,
          distance: userLocation
            ? locationService.calculateDistance(userLocation.coords, location.coordinates)
            : undefined,
        }));

        setLocations(sortLocations(searchResults));
      }
    } catch (error) {
      console.error('Error searching locations:', error);
    }
  };

  const handleLocationSelect = (location: Location) => {
    // Check if location is open
    if (!location.isOpen) {
      Alert.alert(
        'Restaurant Closed',
        `${location.name} is currently closed. Would you like to view their menu anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Menu',
            onPress: () => navigateToTableSelection(location),
          },
        ]
      );
      return;
    }

    navigateToTableSelection(location);
  };

  const navigateToTableSelection = (location: Location) => {
    navigation.navigate('TableSelection', { locationId: location.id });
  };

  const renderLocationItem = ({ item }: { item: Location }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => handleLocationSelect(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.images[0] || 'https://via.placeholder.com/100' }}
        style={styles.locationImage}
      />
      <View style={styles.locationInfo}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationName}>{item.name}</Text>
          {!item.isOpen && (
            <View style={styles.closedBadge}>
              <Text style={styles.closedText}>Closed</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.locationDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.locationDetails}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount})</Text>
          </View>
          
          <Text style={styles.priceRange}>{item.priceRange}</Text>
          
          {item.distance && (
            <View style={styles.distanceContainer}>
              <Icon name="location-on" size={16} color="#8E8E93" />
              <Text style={styles.distance}>
                {locationService.formatDistance(item.distance)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.cuisineContainer}>
          {item.cuisine.slice(0, 3).map((cuisine, index) => (
            <View key={index} style={styles.cuisineTag}>
              <Text style={styles.cuisineText}>{cuisine}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <Icon name="chevron-right" size={24} color="#C7C7CC" />
    </TouchableOpacity>
  );

  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      <View style={styles.sortButtons}>
        {(['distance', 'rating', 'name'] as const).map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.sortButton,
              sortBy === option && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy(option)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === option && styles.sortButtonTextActive,
              ]}
            >
              {option === 'distance' ? 'Distance' : 
               option === 'rating' ? 'Rating' : 'Name'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="location-off" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>No restaurants found</Text>
      <Text style={styles.emptyStateMessage}>
        {searchQuery
          ? 'Try adjusting your search terms'
          : 'No restaurants available in your area'}
      </Text>
      {!locationPermission && (
        <Button
          title="Enable Location"
          onPress={showLocationPermissionDialog}
          style={styles.enableLocationButton}
        />
      )}
    </View>
  );

  if (loading && locations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding restaurants near you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a Restaurant</Text>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {userLocation && renderSortOptions()}

      <FlatList
        data={locations}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sortLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F2F2F7',
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  locationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  closedBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  closedText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  locationDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 2,
  },
  priceRange: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
    marginRight: 16,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  cuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cuisineTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  cuisineText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  enableLocationButton: {
    marginTop: 16,
  },
});

export default LocationSelectionScreen;