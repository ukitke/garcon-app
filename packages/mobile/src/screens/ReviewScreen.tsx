import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Review, ReviewCategory, Order, Location } from '../types';
import { apiService } from '../services/api';
import Button from '../components/common/Button';

interface ReviewScreenProps {
  route: {
    params: {
      orderId?: string;
      locationId?: string;
    };
  };
}

const ReviewScreen: React.FC<ReviewScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId, locationId } = route.params as any;

  const [order, setOrder] = useState<Order | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<ReviewCategory[]>([
    { category: 'food', rating: 0 },
    { category: 'service', rating: 0 },
    { category: 'ambiance', rating: 0 },
    { category: 'value', rating: 0 },
  ]);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      if (orderId) {
        const orderResponse = await apiService.getOrder(orderId);
        if (orderResponse.success && orderResponse.data) {
          setOrder(orderResponse.data);
          
          // Load location from order
          const locationResponse = await apiService.getLocation(orderResponse.data.locationId);
          if (locationResponse.success && locationResponse.data) {
            setLocation(locationResponse.data);
          }
        }
      } else if (locationId) {
        const locationResponse = await apiService.getLocation(locationId);
        if (locationResponse.success && locationResponse.data) {
          setLocation(locationResponse.data);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleOverallRatingChange = (rating: number) => {
    setOverallRating(rating);
    
    // Auto-fill category ratings based on overall rating
    setCategoryRatings(prev => prev.map(cat => ({
      ...cat,
      rating: rating,
    })));
  };

  const handleCategoryRatingChange = (category: string, rating: number) => {
    setCategoryRatings(prev => prev.map(cat => 
      cat.category === category ? { ...cat, rating } : cat
    ));
    
    // Update overall rating as average of category ratings
    const newCategoryRatings = categoryRatings.map(cat => 
      cat.category === category ? { ...cat, rating } : cat
    );
    const averageRating = newCategoryRatings.reduce((sum, cat) => sum + cat.rating, 0) / newCategoryRatings.length;
    setOverallRating(Math.round(averageRating));
  };

  const handleSubmitReview = async () => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide an overall rating');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location information not available');
      return;
    }

    try {
      setLoading(true);

      const reviewData = {
        locationId: location.id,
        orderId: orderId || undefined,
        rating: overallRating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        categories: categoryRatings.filter(cat => cat.rating > 0),
        isAnonymous,
      };

      const response = await apiService.createReview(reviewData);

      if (response.success) {
        Alert.alert(
          'Review Submitted!',
          'Thank you for your feedback. Your review helps other customers and the restaurant improve.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (
    rating: number,
    onRatingChange: (rating: number) => void,
    size: number = 32
  ) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={styles.starButton}
          >
            <Icon
              name={star <= rating ? 'star' : 'star-border'}
              size={size}
              color={star <= rating ? '#FFD700' : '#C7C7CC'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'food': return 'Food Quality';
      case 'service': return 'Service';
      case 'ambiance': return 'Ambiance';
      case 'value': return 'Value for Money';
      case 'cleanliness': return 'Cleanliness';
      default: return category;
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'food': return 'restaurant';
      case 'service': return 'room-service';
      case 'ambiance': return 'mood';
      case 'value': return 'attach-money';
      case 'cleanliness': return 'cleaning-services';
      default: return 'star';
    }
  };

  const renderOverallRating = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Overall Rating</Text>
      <View style={styles.overallRatingContainer}>
        {renderStarRating(overallRating, handleOverallRatingChange, 40)}
        <Text style={styles.ratingText}>
          {overallRating === 0 ? 'Tap to rate' : 
           overallRating === 1 ? 'Poor' :
           overallRating === 2 ? 'Fair' :
           overallRating === 3 ? 'Good' :
           overallRating === 4 ? 'Very Good' : 'Excellent'}
        </Text>
      </View>
    </View>
  );

  const renderCategoryRatings = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Rate Your Experience</Text>
      
      {categoryRatings.map((category) => (
        <View key={category.category} style={styles.categoryRatingContainer}>
          <View style={styles.categoryHeader}>
            <Icon 
              name={getCategoryIcon(category.category)} 
              size={20} 
              color="#007AFF" 
            />
            <Text style={styles.categoryLabel}>
              {getCategoryLabel(category.category)}
            </Text>
          </View>
          {renderStarRating(
            category.rating,
            (rating) => handleCategoryRatingChange(category.category, rating),
            24
          )}
        </View>
      ))}
    </View>
  );

  const renderReviewText = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Write a Review (Optional)</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Review Title</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Summarize your experience..."
          maxLength={100}
        />
        <Text style={styles.characterCount}>{title.length}/100</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Your Review</Text>
        <TextInput
          style={styles.textArea}
          value={comment}
          onChangeText={setComment}
          placeholder="Tell others about your experience. What did you like? What could be improved?"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.characterCount}>{comment.length}/500</Text>
      </View>
    </View>
  );

  const renderOrderSummary = () => {
    if (!order) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Your Order</Text>
        
        <View style={styles.orderSummary}>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString()} at{' '}
            {new Date(order.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
          
          {order.items.slice(0, 3).map((item, index) => (
            <Text key={index} style={styles.orderItem}>
              {item.quantity}x {item.menuItem.name}
            </Text>
          ))}
          
          {order.items.length > 3 && (
            <Text style={styles.orderItem}>
              +{order.items.length - 3} more items
            </Text>
          )}
          
          <Text style={styles.orderTotal}>
            Total: ${order.totalAmount.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  const renderPrivacyOptions = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Privacy</Text>
      
      <TouchableOpacity
        style={styles.privacyOption}
        onPress={() => setIsAnonymous(!isAnonymous)}
      >
        <View style={styles.privacyOptionContent}>
          <Icon name="visibility-off" size={20} color="#007AFF" />
          <View style={styles.privacyOptionText}>
            <Text style={styles.privacyOptionTitle}>Post Anonymously</Text>
            <Text style={styles.privacyOptionDescription}>
              Your name won't be shown with this review
            </Text>
          </View>
        </View>
        <Icon 
          name={isAnonymous ? 'check-box' : 'check-box-outline-blank'} 
          size={24} 
          color="#007AFF" 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Write Review</Text>
        <View style={styles.placeholder} />
      </View>

      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{location.name}</Text>
          <Text style={styles.locationAddress}>{location.address}</Text>
          <View style={styles.locationRating}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{location.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({location.reviewCount} reviews)</Text>
          </View>
        </View>
      )}

      {renderOrderSummary()}
      {renderOverallRating()}
      {renderCategoryRatings()}
      {renderReviewText()}
      {renderPrivacyOptions()}

      <View style={styles.actions}>
        <Button
          title="Submit Review"
          onPress={handleSubmitReview}
          loading={loading}
          disabled={overallRating === 0 || loading}
          fullWidth
        />
      </View>

      <View style={styles.guidelinesContainer}>
        <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
        <Text style={styles.guidelinesText}>
          • Be honest and constructive in your feedback{'\n'}
          • Focus on your personal experience{'\n'}
          • Avoid offensive language or personal attacks{'\n'}
          • Reviews are moderated and may take time to appear
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  locationInfo: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  locationName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  locationRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  overallRatingContainer: {
    alignItems: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  categoryRatingContainer: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 8,
    flex: 1,
  },
  orderSummary: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
  },
  orderDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  orderItem: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  privacyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  guidelinesContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});

export default ReviewScreen;