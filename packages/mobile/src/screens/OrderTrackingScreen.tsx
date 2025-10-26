import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Order, OrderStatus, OrderItem } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import Button from '../components/common/Button';

interface OrderTrackingScreenProps {
  route: {
    params: {
      orderId: string;
    };
  };
}

const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as any;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadOrder();
    
    // Listen for order status updates
    socketService.on('order:status_updated', handleOrderStatusUpdate);
    socketService.on('kitchen:order_ready', handleOrderReady);
    
    return () => {
      socketService.off('order:status_updated', handleOrderStatusUpdate);
      socketService.off('kitchen:order_ready', handleOrderReady);
    };
  }, []);

  useEffect(() => {
    if (order) {
      animateProgress();
    }
  }, [order?.status]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOrder(orderId);
      
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to load order');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderStatusUpdate = (data: { 
    orderId: string; 
    status: OrderStatus; 
    estimatedReadyTime?: Date 
  }) => {
    if (data.orderId === orderId) {
      setOrder(prev => prev ? {
        ...prev,
        status: data.status,
        estimatedReadyTime: data.estimatedReadyTime,
        updatedAt: new Date(),
      } : null);
    }
  };

  const handleOrderReady = (data: {
    orderId: string;
    tableNumber: string;
    items: string[];
  }) => {
    if (data.orderId === orderId) {
      Alert.alert(
        'Order Ready! 🍽️',
        `Your order is ready for pickup at table ${data.tableNumber}!`,
        [{ text: 'Great!', onPress: () => {} }]
      );
    }
  };

  const animateProgress = () => {
    if (!order) return;

    const progressValue = getProgressValue(order.status);
    
    Animated.timing(progressAnim, {
      toValue: progressValue,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const getProgressValue = (status: OrderStatus): number => {
    switch (status) {
      case 'pending': return 0.2;
      case 'confirmed': return 0.4;
      case 'preparing': return 0.6;
      case 'ready': return 0.8;
      case 'delivered': return 1.0;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          title: 'Order Received',
          description: 'Your order has been received and is being reviewed',
          icon: 'receipt',
          color: '#FF9500',
        };
      case 'confirmed':
        return {
          title: 'Order Confirmed',
          description: 'Your order has been confirmed and sent to the kitchen',
          icon: 'check-circle',
          color: '#007AFF',
        };
      case 'preparing':
        return {
          title: 'Preparing Your Order',
          description: 'The kitchen is preparing your delicious meal',
          icon: 'restaurant',
          color: '#FF9500',
        };
      case 'ready':
        return {
          title: 'Order Ready!',
          description: 'Your order is ready for pickup',
          icon: 'notifications',
          color: '#34C759',
        };
      case 'delivered':
        return {
          title: 'Order Delivered',
          description: 'Enjoy your meal!',
          icon: 'check-circle',
          color: '#34C759',
        };
      case 'cancelled':
        return {
          title: 'Order Cancelled',
          description: 'Your order has been cancelled',
          icon: 'cancel',
          color: '#FF3B30',
        };
      default:
        return {
          title: 'Processing',
          description: 'Processing your order',
          icon: 'hourglass-empty',
          color: '#8E8E93',
        };
    }
  };

  const getEstimatedTime = (): string => {
    if (!order) return '';

    if (order.estimatedReadyTime) {
      const now = new Date();
      const readyTime = new Date(order.estimatedReadyTime);
      const diffMinutes = Math.max(0, Math.ceil((readyTime.getTime() - now.getTime()) / (1000 * 60)));
      
      if (diffMinutes === 0) {
        return 'Ready now!';
      } else if (diffMinutes === 1) {
        return '1 minute';
      } else {
        return `${diffMinutes} minutes`;
      }
    }

    // Default estimates based on status
    switch (order.status) {
      case 'pending': return '2-3 minutes';
      case 'confirmed': return '15-20 minutes';
      case 'preparing': return '10-15 minutes';
      case 'ready': return 'Ready now!';
      case 'delivered': return 'Completed';
      default: return '';
    }
  };

  const handleCancelOrder = () => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled') {
      return;
    }

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.cancelOrder(orderId, 'Customer requested cancellation');
              
              if (response.success) {
                Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
                setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel order');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: order?.status === 'cancelled' ? '#FF3B30' : '#34C759',
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderOrderItems = () => {
    if (!order) return null;

    return (
      <View style={styles.orderItemsContainer}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        
        {order.items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.orderItemInfo}>
              <Text style={styles.orderItemName}>{item.menuItem.name}</Text>
              <Text style={styles.orderItemQuantity}>Quantity: {item.quantity}</Text>
              {item.customizations.length > 0 && (
                <Text style={styles.orderItemCustomizations}>
                  {item.customizations.map(c => c.name).join(', ')}
                </Text>
              )}
              {item.specialInstructions && (
                <Text style={styles.orderItemInstructions}>
                  Note: {item.specialInstructions}
                </Text>
              )}
            </View>
            <Text style={styles.orderItemPrice}>${item.totalPrice.toFixed(2)}</Text>
          </View>
        ))}
        
        <View style={styles.orderTotal}>
          <Text style={styles.orderTotalLabel}>Total</Text>
          <Text style={styles.orderTotalAmount}>${order.totalAmount.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  const renderTimeline = () => {
    if (!order) return null;

    const steps = [
      { status: 'pending', label: 'Received', time: order.createdAt },
      { status: 'confirmed', label: 'Confirmed', time: order.status !== 'pending' ? order.updatedAt : null },
      { status: 'preparing', label: 'Preparing', time: ['preparing', 'ready', 'delivered'].includes(order.status) ? order.updatedAt : null },
      { status: 'ready', label: 'Ready', time: ['ready', 'delivered'].includes(order.status) ? order.estimatedReadyTime || order.updatedAt : null },
      { status: 'delivered', label: 'Delivered', time: order.status === 'delivered' ? order.updatedAt : null },
    ];

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Order Timeline</Text>
        
        {steps.map((step, index) => {
          const isCompleted = getProgressValue(order.status) > getProgressValue(step.status as OrderStatus);
          const isCurrent = order.status === step.status;
          const isActive = isCompleted || isCurrent;

          return (
            <View key={step.status} style={styles.timelineStep}>
              <View style={styles.timelineIndicator}>
                <View
                  style={[
                    styles.timelineCircle,
                    isActive && styles.timelineCircleActive,
                    isCurrent && styles.timelineCircleCurrent,
                  ]}
                >
                  {isCompleted && <Icon name="check" size={12} color="#FFFFFF" />}
                </View>
                {index < steps.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      isCompleted && styles.timelineLineActive,
                    ]}
                  />
                )}
              </View>
              
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineLabel,
                    isActive && styles.timelineLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
                {step.time && (
                  <Text style={styles.timelineTime}>
                    {new Date(step.time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorMessage}>
          We couldn't find your order. Please check your order ID.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        />
      </View>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const estimatedTime = getEstimatedTime();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Order #{order.id.slice(-6)}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusIcon, { backgroundColor: statusInfo.color }]}>
          <Icon name={statusInfo.icon} size={32} color="#FFFFFF" />
        </View>
        
        <Text style={styles.statusTitle}>{statusInfo.title}</Text>
        <Text style={styles.statusDescription}>{statusInfo.description}</Text>
        
        {estimatedTime && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <View style={styles.estimatedTimeContainer}>
            <Icon name="schedule" size={16} color="#8E8E93" />
            <Text style={styles.estimatedTime}>Estimated time: {estimatedTime}</Text>
          </View>
        )}

        {renderProgressBar()}
      </View>

      {renderOrderItems()}
      {renderTimeline()}

      <View style={styles.actions}>
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <Button
            title="Cancel Order"
            variant="outline"
            onPress={handleCancelOrder}
            style={styles.cancelButton}
          />
        )}
        
        {order.status === 'delivered' && (
          <Button
            title="Rate Your Experience"
            onPress={() => navigation.navigate('Reviews', { orderId: order.id })}
            style={styles.rateButton}
          />
        )}
      </View>

      <View style={styles.supportContainer}>
        <Text style={styles.supportText}>Need help with your order?</Text>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => {
            // Navigate to support or call waiter
            Alert.alert(
              'Get Help',
              'How can we assist you?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call Waiter', onPress: () => {} },
                { text: 'Contact Support', onPress: () => {} },
              ]
            );
          }}
        >
          <Icon name="help-outline" size={20} color="#007AFF" />
          <Text style={styles.supportButtonText}>Get Help</Text>
        </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorButton: {
    minWidth: 120,
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  estimatedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  estimatedTime: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  orderItemsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  orderItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  orderItemCustomizations: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  orderItemInstructions: {
    fontSize: 14,
    color: '#FF9500',
    fontStyle: 'italic',
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E5E5EA',
  },
  orderTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  orderTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleActive: {
    backgroundColor: '#34C759',
  },
  timelineCircleCurrent: {
    backgroundColor: '#007AFF',
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: '#E5E5EA',
    marginTop: 4,
  },
  timelineLineActive: {
    backgroundColor: '#34C759',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 2,
  },
  timelineLabelActive: {
    color: '#000000',
    fontWeight: '500',
  },
  timelineTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  actions: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cancelButton: {
    marginBottom: 12,
  },
  rateButton: {
    backgroundColor: '#34C759',
  },
  supportContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  supportText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 12,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  supportButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
});

export default OrderTrackingScreen;