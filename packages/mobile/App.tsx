import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Platform, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FlashMessage from 'react-native-flash-message';

// Screens
import LocationSelectionScreen from './src/screens/LocationSelectionScreen';
import TableSelectionScreen from './src/screens/TableSelectionScreen';
import MenuScreen from './src/screens/MenuScreen';
import CartScreen from './src/screens/CartScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import ReservationScreen from './src/screens/ReservationScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Services
import { socketService } from './src/services/socket';
import { apiService } from './src/services/api';

// Types
import { User } from './src/types';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: string;

        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'Orders':
            iconName = 'receipt';
            break;
          case 'Reservations':
            iconName = 'event';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'home';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#8E8E93',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E5E5EA',
        paddingBottom: Platform.OS === 'ios' ? 20 : 5,
        height: Platform.OS === 'ios' ? 85 : 60,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name="Home" 
      component={LocationSelectionScreen}
      options={{ title: 'Restaurants' }}
    />
    <Tab.Screen 
      name="Orders" 
      component={OrderHistoryScreen}
      options={{ title: 'My Orders' }}
    />
    <Tab.Screen 
      name="Reservations" 
      component={ReservationScreen}
      options={{ title: 'Reservations' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Tab.Navigator>
);

// Main App Stack
const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="TableSelection" component={TableSelectionScreen} />
    <Stack.Screen name="Menu" component={MenuScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    <Stack.Screen name="Reviews" component={ReviewScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if user is authenticated
      const token = await AsyncStorage.getItem('auth_token');
      
      if (token) {
        // Validate token and get user info
        const response = await apiService.getUserProfile();
        
        if (response.success && response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
          
          // Connect to socket
          await socketService.connect();
          
          // Setup socket event listeners
          setupSocketListeners();
        } else {
          // Token is invalid, clear storage
          await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Connection status
    socketService.on('connection:established', () => {
      console.log('Socket connected successfully');
    });

    socketService.on('connection:lost', (reason) => {
      console.log('Socket connection lost:', reason);
      // Show user-friendly message
      FlashMessage.show({
        message: 'Connection Lost',
        description: 'Trying to reconnect...',
        type: 'warning',
        duration: 3000,
      });
    });

    socketService.on('connection:restored', () => {
      FlashMessage.show({
        message: 'Connected',
        description: 'Connection restored successfully',
        type: 'success',
        duration: 2000,
      });
    });

    socketService.on('connection:failed', () => {
      Alert.alert(
        'Connection Failed',
        'Unable to connect to the server. Some features may not work properly.',
        [{ text: 'OK' }]
      );
    });

    // Order notifications
    socketService.on('order:status_updated', (data) => {
      const statusMessages = {
        confirmed: 'Your order has been confirmed!',
        preparing: 'Your order is being prepared',
        ready: 'Your order is ready for pickup!',
        delivered: 'Your order has been delivered',
        cancelled: 'Your order has been cancelled',
      };

      const message = statusMessages[data.status as keyof typeof statusMessages];
      if (message) {
        FlashMessage.show({
          message: 'Order Update',
          description: message,
          type: data.status === 'ready' ? 'success' : 'info',
          duration: 4000,
        });
      }
    });

    // Waiter call responses
    socketService.on('waiter:call_acknowledged', (data) => {
      FlashMessage.show({
        message: 'Waiter Notified',
        description: `A waiter will be with you shortly`,
        type: 'success',
        duration: 3000,
      });
    });

    // New notifications
    socketService.on('notification:new', (notification) => {
      FlashMessage.show({
        message: notification.title,
        description: notification.message,
        type: 'info',
        duration: 4000,
      });
    });

    // System messages
    socketService.on('system:message', (data) => {
      if (data.type === 'error') {
        Alert.alert('System Message', data.message);
      } else {
        FlashMessage.show({
          message: 'System Message',
          description: data.message,
          type: data.type,
          duration: 3000,
        });
      }
    });
  };

  const handleLogin = async (userData: User, token: string, refreshToken: string) => {
    try {
      // Store tokens
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      
      // Update state
      setUser(userData);
      setIsAuthenticated(true);
      
      // Connect to socket
      await socketService.connect();
      setupSocketListeners();
      
      FlashMessage.show({
        message: 'Welcome!',
        description: `Hello ${userData.name}`,
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error handling login:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API
      await apiService.logout();
      
      // Clear storage
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
      
      // Disconnect socket
      socketService.disconnect();
      
      // Update state
      setUser(null);
      setIsAuthenticated(false);
      
      FlashMessage.show({
        message: 'Logged Out',
        description: 'You have been logged out successfully',
        type: 'info',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error handling logout:', error);
    }
  };

  if (isLoading) {
    // You could show a splash screen here
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="#FFFFFF"
      />
      
      {isAuthenticated ? <AppStack /> : <AuthStack />}
      
      <FlashMessage position="top" />
    </NavigationContainer>
  );
};

export default App;