import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MenuItem, MenuCategory, CartItem } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import Button from '../components/common/Button';
import WaiterCallButton from '../components/WaiterCallButton';

interface MenuScreenProps {
  route: {
    params: {
      locationId: string;
      tableId: string;
      sessionId: string;
      participantId: string;
    };
  };
}

const MenuScreen: React.FC<MenuScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { locationId, tableId, sessionId, participantId } = route.params as any;

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<any[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    loadMenu();
    
    // Listen for menu updates
    socketService.on('menu:item_updated', handleMenuItemUpdate);
    
    return () => {
      socketService.off('menu:item_updated', handleMenuItemUpdate);
    };
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLocationMenu(locationId);
      
      if (response.success && response.data) {
        setCategories(response.data.categories || []);
        if (response.data.categories?.length > 0) {
          setSelectedCategory(response.data.categories[0].id);
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to load menu');
      }
    } catch (error) {
      console.error('Error loading menu:', error);
      Alert.alert('Error', 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuItemUpdate = (data: { itemId: string; isAvailable: boolean; price?: number }) => {
    setCategories(prevCategories =>
      prevCategories.map(category => ({
        ...category,
        items: category.items.map(item =>
          item.id === data.itemId
            ? { ...item, isAvailable: data.isAvailable, price: data.price || item.price }
            : item
        ),
      }))
    );
  };

  const handleItemPress = (item: MenuItem) => {
    if (!item.isAvailable) {
      Alert.alert('Item Unavailable', 'This item is currently not available.');
      return;
    }

    setSelectedItem(item);
    setItemQuantity(1);
    setSelectedCustomizations([]);
    setSpecialInstructions('');
    setShowItemModal(true);
  };

  const addToCart = () => {
    if (!selectedItem) return;

    const cartItem: CartItem = {
      id: `${selectedItem.id}-${Date.now()}`,
      menuItem: selectedItem,
      quantity: itemQuantity,
      customizations: selectedCustomizations,
      specialInstructions: specialInstructions.trim() || undefined,
      totalPrice: calculateItemTotal(),
    };

    setCart(prevCart => [...prevCart, cartItem]);
    setShowItemModal(false);
    
    // Show success feedback
    Alert.alert('Added to Cart', `${selectedItem.name} has been added to your cart.`);
  };

  const calculateItemTotal = (): number => {
    if (!selectedItem) return 0;

    let total = selectedItem.price * itemQuantity;
    
    selectedCustomizations.forEach(customization => {
      total += customization.price * itemQuantity;
    });

    return total;
  };

  const getCartItemCount = (): number => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartTotal = (): number => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  };

  const filteredItems = selectedCategory
    ? categories.find(cat => cat.id === selectedCategory)?.items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    : [];

  const renderCategoryTab = ({ item }: { item: MenuCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        selectedCategory === item.id && styles.categoryTabActive,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text
        style={[
          styles.categoryTabText,
          selectedCategory === item.id && styles.categoryTabTextActive,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !item.isAvailable && styles.menuItemDisabled,
      ]}
      onPress={() => handleItemPress(item)}
      disabled={!item.isAvailable}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/100' }}
        style={styles.menuItemImage}
      />
      
      <View style={styles.menuItemInfo}>
        <View style={styles.menuItemHeader}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          {!item.isAvailable && (
            <View style={styles.unavailableBadge}>
              <Text style={styles.unavailableText}>Unavailable</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.menuItemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.menuItemFooter}>
          <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
          
          {item.dietary && item.dietary.length > 0 && (
            <View style={styles.dietaryTags}>
              {item.dietary.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.dietaryTag}>
                  <Text style={styles.dietaryTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {item.spicyLevel && item.spicyLevel > 0 && (
          <View style={styles.spicyIndicator}>
            {Array.from({ length: item.spicyLevel }, (_, i) => (
              <Icon key={i} name="local-fire-department" size={12} color="#FF3B30" />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderItemModal = () => (
    <Modal
      visible={showItemModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowItemModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setShowItemModal(false)}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add to Cart</Text>
          <View style={styles.placeholder} />
        </View>

        {selectedItem && (
          <View style={styles.modalContent}>
            <Image
              source={{ uri: selectedItem.image || 'https://via.placeholder.com/200' }}
              style={styles.modalItemImage}
            />
            
            <Text style={styles.modalItemName}>{selectedItem.name}</Text>
            <Text style={styles.modalItemDescription}>{selectedItem.description}</Text>
            <Text style={styles.modalItemPrice}>${selectedItem.price.toFixed(2)}</Text>

            {selectedItem.customizations && selectedItem.customizations.length > 0 && (
              <View style={styles.customizationsSection}>
                <Text style={styles.sectionTitle}>Customizations</Text>
                {selectedItem.customizations.map((customization, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.customizationItem,
                      selectedCustomizations.includes(customization) && styles.customizationItemSelected,
                    ]}
                    onPress={() => {
                      if (selectedCustomizations.includes(customization)) {
                        setSelectedCustomizations(prev => prev.filter(c => c !== customization));
                      } else {
                        setSelectedCustomizations(prev => [...prev, customization]);
                      }
                    }}
                  >
                    <Text style={styles.customizationName}>{customization.name}</Text>
                    <Text style={styles.customizationPrice}>+${customization.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.instructionsSection}>
              <Text style={styles.sectionTitle}>Special Instructions (Optional)</Text>
              <TextInput
                style={styles.instructionsInput}
                placeholder="Any special requests..."
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.quantitySection}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                >
                  <Icon name="remove" size={20} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{itemQuantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setItemQuantity(itemQuantity + 1)}
                >
                  <Icon name="add" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title={`Add to Cart - $${calculateItemTotal().toFixed(2)}`}
                onPress={addToCart}
                style={styles.addToCartButton}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Menu</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Cart', { cart, sessionId, participantId })}
          style={styles.cartButton}
        >
          <Icon name="shopping-cart" size={24} color="#007AFF" />
          {getCartItemCount() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryTab}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      />

      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomBar}>
        <WaiterCallButton
          sessionId={sessionId}
          tableId={tableId}
          locationId={locationId}
          style={styles.waiterButton}
        />
        
        {getCartItemCount() > 0 && (
          <TouchableOpacity
            style={styles.viewCartButton}
            onPress={() => navigation.navigate('Cart', { cart, sessionId, participantId })}
          >
            <Text style={styles.viewCartText}>
              View Cart ({getCartItemCount()}) - ${getCartTotal().toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {renderItemModal()}
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
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
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
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  unavailableBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unavailableText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  dietaryTags: {
    flexDirection: 'row',
  },
  dietaryTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  dietaryTagText: {
    fontSize: 10,
    color: '#8E8E93',
  },
  spicyIndicator: {
    flexDirection: 'row',
    marginTop: 4,
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
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waiterButton: {
    flex: 1,
  },
  viewCartButton: {
    backgroundColor: '#34C759',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 2,
  },
  viewCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
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
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalItemImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalItemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  modalItemDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  modalItemPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 24,
  },
  customizationsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  customizationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  customizationItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  customizationName: {
    fontSize: 16,
    color: '#000000',
  },
  customizationPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#34C759',
  },
  instructionsSection: {
    marginBottom: 24,
  },
  instructionsInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 80,
  },
  quantitySection: {
    marginBottom: 32,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginHorizontal: 20,
  },
  modalActions: {
    paddingBottom: 32,
  },
  addToCartButton: {
    backgroundColor: '#34C759',
  },
});

export default MenuScreen;