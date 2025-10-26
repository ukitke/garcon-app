import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PaymentMethod, PaymentIntent, Order } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import Button from '../components/common/Button';

interface PaymentScreenProps {
  route: {
    params: {
      locationId: string;
      sessionId: string;
      orderId: string;
    };
  };
}

const PaymentScreen: React.FC<PaymentScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { locationId, sessionId, orderId } = route.params as any;

  const [order, setOrder] = useState<Order | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [splitPaymentOptions, setSplitPaymentOptions] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<'full' | 'split' | 'traditional'>('full');

  useEffect(() => {
    loadInitialData();
    
    // Listen for payment status updates
    socketService.on('payment:status_updated', handlePaymentStatusUpdate);
    
    return () => {
      socketService.off('payment:status_updated', handlePaymentStatusUpdate);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const [orderResponse, paymentMethodsResponse, splitOptionsResponse] = await Promise.all([
        apiService.getOrder(orderId),
        apiService.getPaymentMethods(),
        apiService.getSplitPaymentOptions(sessionId),
      ]);

      if (orderResponse.success && orderResponse.data) {
        setOrder(orderResponse.data);
      }

      if (paymentMethodsResponse.success && paymentMethodsResponse.data) {
        setPaymentMethods(paymentMethodsResponse.data);
        
        // Select default payment method
        const defaultMethod = paymentMethodsResponse.data.find((method: PaymentMethod) => method.isDefault);
        if (defaultMethod) {
          setSelectedPaymentMethod(defaultMethod);
        }
      }

      if (splitOptionsResponse.success && splitOptionsResponse.data) {
        setSplitPaymentOptions(splitOptionsResponse.data);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      Alert.alert('Error', 'Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStatusUpdate = (data: {
    paymentIntentId: string;
    status: string;
    orderId: string;
  }) => {
    if (data.orderId === orderId) {
      if (data.status === 'succeeded') {
        Alert.alert(
          'Payment Successful!',
          'Your payment has been processed successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('OrderTracking', { orderId }),
            },
          ]
        );
      } else if (data.status === 'failed') {
        Alert.alert('Payment Failed', 'Your payment could not be processed. Please try again.');
        setProcessing(false);
      }
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod || !order) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setProcessing(true);

      // Create payment intent
      const paymentIntentResponse = await apiService.createPaymentIntent({
        orderId: order.id,
        paymentMethodId: selectedPaymentMethod.id,
        amount: order.totalAmount,
      });

      if (!paymentIntentResponse.success || !paymentIntentResponse.data) {
        throw new Error(paymentIntentResponse.error || 'Failed to create payment intent');
      }

      const paymentIntent = paymentIntentResponse.data;

      // Handle different payment methods
      switch (selectedPaymentMethod.provider) {
        case 'stripe':
          await handleStripePayment(paymentIntent);
          break;
        case 'paypal':
          await handlePayPalPayment(paymentIntent);
          break;
        case 'apple_pay':
          await handleApplePayPayment(paymentIntent);
          break;
        case 'google_pay':
          await handleGooglePayPayment(paymentIntent);
          break;
        case 'satispay':
          await handleSatispayPayment(paymentIntent);
          break;
        default:
          throw new Error('Unsupported payment method');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Payment Error', error.message || 'Failed to process payment');
      setProcessing(false);
    }
  };

  const handleStripePayment = async (paymentIntent: PaymentIntent) => {
    try {
      // In a real app, you would use Stripe's React Native SDK
      // For now, we'll simulate the payment confirmation
      const confirmResponse = await apiService.confirmPayment(paymentIntent.id);
      
      if (confirmResponse.success) {
        // Payment will be handled by the socket event
      } else {
        throw new Error(confirmResponse.error || 'Payment confirmation failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const handlePayPalPayment = async (paymentIntent: PaymentIntent) => {
    // PayPal payment implementation
    Alert.alert('PayPal Payment', 'PayPal payment flow would be implemented here');
    setProcessing(false);
  };

  const handleApplePayPayment = async (paymentIntent: PaymentIntent) => {
    // Apple Pay implementation
    Alert.alert('Apple Pay', 'Apple Pay flow would be implemented here');
    setProcessing(false);
  };

  const handleGooglePayPayment = async (paymentIntent: PaymentIntent) => {
    // Google Pay implementation
    Alert.alert('Google Pay', 'Google Pay flow would be implemented here');
    setProcessing(false);
  };

  const handleSatispayPayment = async (paymentIntent: PaymentIntent) => {
    // Satispay implementation
    Alert.alert('Satispay', 'Satispay payment flow would be implemented here');
    setProcessing(false);
  };

  const handleSplitPayment = () => {
    if (!splitPaymentOptions) {
      Alert.alert('Error', 'Split payment options not available');
      return;
    }

    // Navigate to split payment screen or show modal
    Alert.alert(
      'Split Payment',
      'Choose how you want to split the bill:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Split Equally', onPress: () => handleEqualSplit() },
        { text: 'Split by Items', onPress: () => handleItemSplit() },
        { text: 'Custom Split', onPress: () => handleCustomSplit() },
      ]
    );
  };

  const handleEqualSplit = async () => {
    try {
      const participantCount = splitPaymentOptions.participants.length;
      const amountPerPerson = order!.totalAmount / participantCount;

      const splitData = {
        type: 'equal',
        participants: splitPaymentOptions.participants.map((p: any) => ({
          participantId: p.id,
          amount: amountPerPerson,
        })),
      };

      const response = await apiService.requestSplitPayment(sessionId, splitData);
      
      if (response.success) {
        Alert.alert(
          'Split Payment Requested',
          `Each person will pay $${amountPerPerson.toFixed(2)}. Other participants will be notified.`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request split payment');
    }
  };

  const handleItemSplit = () => {
    // Navigate to item-based split screen
    Alert.alert('Item Split', 'Item-based split would be implemented here');
  };

  const handleCustomSplit = () => {
    // Navigate to custom split screen
    Alert.alert('Custom Split', 'Custom split would be implemented here');
  };

  const handleTraditionalPayment = () => {
    Alert.alert(
      'Request Bill at Table',
      'A waiter will bring the bill to your table for traditional payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Bill',
          onPress: async () => {
            try {
              // Call waiter for bill
              const callResponse = await apiService.callWaiter({
                sessionId,
                callType: 'bill',
                message: 'Please bring the bill to our table',
                priority: 'medium',
              });

              if (callResponse.success) {
                Alert.alert(
                  'Bill Requested',
                  'A waiter will bring your bill shortly.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to request bill');
            }
          },
        },
      ]
    );
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedPaymentMethod?.id === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.paymentMethodItem, isSelected && styles.paymentMethodSelected]}
        onPress={() => setSelectedPaymentMethod(method)}
      >
        <View style={styles.paymentMethodInfo}>
          <View style={styles.paymentMethodIcon}>
            {method.provider === 'stripe' && <Icon name="credit-card" size={24} color="#635BFF" />}
            {method.provider === 'paypal' && <Icon name="account-balance-wallet" size={24} color="#0070BA" />}
            {method.provider === 'apple_pay' && <Icon name="phone-iphone" size={24} color="#000000" />}
            {method.provider === 'google_pay' && <Icon name="android" size={24} color="#4285F4" />}
            {method.provider === 'satispay' && <Icon name="payment" size={24} color="#FF6B35" />}
          </View>
          <View style={styles.paymentMethodDetails}>
            <Text style={styles.paymentMethodName}>{method.displayName}</Text>
            {method.details?.last4 && (
              <Text style={styles.paymentMethodSubtext}>
                •••• {method.details.last4}
              </Text>
            )}
            {method.details?.email && (
              <Text style={styles.paymentMethodSubtext}>
                {method.details.email}
              </Text>
            )}
          </View>
        </View>
        {isSelected && <Icon name="check-circle" size={24} color="#34C759" />}
      </TouchableOpacity>
    );
  };

  const renderOrderSummary = () => {
    if (!order) return null;

    return (
      <View style={styles.orderSummary}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        
        {order.items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.orderItemInfo}>
              <Text style={styles.orderItemName}>{item.menuItem.name}</Text>
              <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payment options...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Payment</Text>
        <View style={styles.placeholder} />
      </View>

      {renderOrderSummary()}

      <View style={styles.paymentModeSelector}>
        <Text style={styles.sectionTitle}>Payment Options</Text>
        
        <View style={styles.paymentModeButtons}>
          <TouchableOpacity
            style={[
              styles.paymentModeButton,
              paymentMode === 'full' && styles.paymentModeButtonActive,
            ]}
            onPress={() => setPaymentMode('full')}
          >
            <Icon name="payment" size={20} color={paymentMode === 'full' ? '#FFFFFF' : '#007AFF'} />
            <Text
              style={[
                styles.paymentModeText,
                paymentMode === 'full' && styles.paymentModeTextActive,
              ]}
            >
              Pay Full Amount
            </Text>
          </TouchableOpacity>

          {splitPaymentOptions && (
            <TouchableOpacity
              style={[
                styles.paymentModeButton,
                paymentMode === 'split' && styles.paymentModeButtonActive,
              ]}
              onPress={() => setPaymentMode('split')}
            >
              <Icon name="group" size={20} color={paymentMode === 'split' ? '#FFFFFF' : '#007AFF'} />
              <Text
                style={[
                  styles.paymentModeText,
                  paymentMode === 'split' && styles.paymentModeTextActive,
                ]}
              >
                Split Bill
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.paymentModeButton,
              paymentMode === 'traditional' && styles.paymentModeButtonActive,
            ]}
            onPress={() => setPaymentMode('traditional')}
          >
            <Icon name="receipt" size={20} color={paymentMode === 'traditional' ? '#FFFFFF' : '#007AFF'} />
            <Text
              style={[
                styles.paymentModeText,
                paymentMode === 'traditional' && styles.paymentModeTextActive,
              ]}
            >
              Pay at Table
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {paymentMode === 'full' && (
        <View style={styles.paymentMethodsContainer}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          
          {paymentMethods.map(renderPaymentMethod)}
          
          <TouchableOpacity style={styles.addPaymentMethod}>
            <Icon name="add" size={24} color="#007AFF" />
            <Text style={styles.addPaymentMethodText}>Add New Payment Method</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        {paymentMode === 'full' && (
          <Button
            title={processing ? 'Processing...' : `Pay $${order?.totalAmount.toFixed(2)}`}
            onPress={handlePayment}
            loading={processing}
            disabled={!selectedPaymentMethod || processing}
            fullWidth
          />
        )}

        {paymentMode === 'split' && (
          <Button
            title="Split Payment"
            onPress={handleSplitPayment}
            fullWidth
          />
        )}

        {paymentMode === 'traditional' && (
          <Button
            title="Request Bill at Table"
            onPress={handleTraditionalPayment}
            variant="outline"
            fullWidth
          />
        )}
      </View>

      <View style={styles.securityInfo}>
        <Icon name="security" size={16} color="#8E8E93" />
        <Text style={styles.securityText}>
          Your payment information is secure and encrypted
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
  orderSummary: {
    backgroundColor: '#FFFFFF',
    margin: 16,
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
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 2,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#8E8E93',
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: '500',
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
  paymentModeSelector: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  paymentModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentModeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentModeText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    textAlign: 'center',
  },
  paymentModeTextActive: {
    color: '#FFFFFF',
  },
  paymentMethodsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    marginBottom: 8,
  },
  paymentMethodSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  paymentMethodSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  addPaymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addPaymentMethodText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
  actions: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  securityText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
});

export default PaymentScreen;