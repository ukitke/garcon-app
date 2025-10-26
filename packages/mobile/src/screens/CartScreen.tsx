import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CartItem } from '../types';
import { apiService } from '../services/api';
import Button from '../components/common/Button';

interface CartScreenProps {
  route: {
    params: {
      cart: CartItem[];
      sessionId: string;
      participantId: string;
    };
  };
}

const CartScreen: React.FC<CartScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { cart: initialCart, sessionId, participantId } = route.params as any;

  const [cart, setCart] = useState<CartItem[]>(initialCart || []);
  const [orderInstructions, setOrderInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              totalPrice: (item.menuItem.price + 
                item.customizations.reduce((sum, c) => sum + c.price, 0)) * newQuantity,
            }
          : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const getSubtotal = (): number => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getTax = (): number => {
    return getSubtotal() * 0.08; // 8% tax
  };

  const getTotal = (): number => {
    return getSubtotal() + getTax();
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before placing an order.');
      return;
    }

    Alert.alert(
      'Place Order',
      `Place order for $${getTotal().toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Place Order',
          onPress: async () => {
            try {
              setLoading(true);

              const orderData = {
                sessionId,
                items: cart.map(item => ({
                  menuItemId: item.menuItem.id,
                  quantity: item.quantity,
                  customizations: item.customizations.map(c => c.id),
                  specialInstructions: item.specialInstructions,
                  unitPrice: item.menuItem.price,
                  totalPrice: item.totalPrice,
                })),
                specialInstructions: orderInstructions.trim() || undefined,
                subtotal: getSubtotal(),
                tax: getTax(),
                totalAmount: getTotal(),
              };

              const response = await apiService.placeOrder(orderData);

              if (response.success && response.data) {
                // Clear cart
                setCart([]);
                
                // Navigate to order tracking
                navigation.navigate('OrderTracking', {
                  orderId: response.data.id,
                });

                Alert.alert(
                  'Order Placed!',
                  'Your order has been sent to the kitchen.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', response.error || 'Failed to place order');
              }
            } catch (error) {
              console.error('Error placing order:', error);
              Alert.alert('Error', 'Failed to place order');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <Image
        source={{ uri: item.menuItem.image || 'https://via.placeholder.com/60' }}
        style={styles.itemImage}
      />
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.menuItem.name}</Text>
        
        {item.customizations.length > 0 && (
          <Text style={styles.itemCustomizations}>
            {item.customizations.map(c => c.name).join(', ')}
          </Text>
        )}
        
        {item.specialInstructions && (
          <Text style={styles.itemInstructions}>
            Note: {item.specialInstructions}
          </Text>
        )}
        
        <Text style={styles.itemPrice}>${item.totalPrice.toFixed(2)}</Text>
      </View>
      
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateItemQuantity(item.id, item.quantity - 1)}
        >
          <Icon name="remove" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
        >
          <Icon name="add" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeItem(item.id)}
      >
        <Icon name="delete" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyCart}>
      <Icon name="shopping-cart" size={64} color="#C7C7CC" />
      <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
      <Text style={styles.emptyCartMessage}>
        Add some delicious items from the menu!
      </Text>
      <Button
        title="Browse Menu"
        onPress={() => navigation.goBack()}
        style={styles.browseMenuButton}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Cart</Text>
        <View style={styles.placeholder} />
      </View>

      {cart.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartContainer}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Order Instructions (Optional)</Text>
            <TextInput
              style={styles.instructionsInput}
              placeholder="Any special requests for your entire order..."
              value={orderInstructions}
              onChangeText={setOrderInstructions}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${getSubtotal().toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${getTax().toFixed(2)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${getTotal().toFixed(2)}</Text>
            </View>

            <Button
              title="Place Order"
              onPress={handlePlaceOrder}
              loading={loading}
              style={styles.placeOrderButton}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
  cartContainer: {
    padding: 16,
  },
  cartItem: {
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
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  itemCustomizations: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  itemInstructions: {
    fontSize: 14,
    color: '#FF9500',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginHorizontal: 12,
  },
  removeButton: {
    padding: 8,
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  instructionsInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    minHeight: 80,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeOrderButton: {
    backgroundColor: '#34C759',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyCartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  browseMenuButton: {
    minWidth: 150,
  },
});

export default CartScreen;