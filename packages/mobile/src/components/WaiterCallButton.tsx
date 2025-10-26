import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WaiterCall, WaiterCallStatus } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import Button from './common/Button';

interface WaiterCallButtonProps {
  sessionId: string;
  tableId: string;
  locationId: string;
  disabled?: boolean;
  style?: any;
}

const WaiterCallButton: React.FC<WaiterCallButtonProps> = ({
  sessionId,
  tableId,
  locationId,
  disabled = false,
  style,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [callType, setCallType] = useState<'assistance' | 'bill' | 'complaint' | 'other'>('assistance');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<WaiterCall | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Listen for waiter call responses
    socketService.on('waiter:call_acknowledged', handleCallAcknowledged);
    socketService.on('waiter:call_resolved', handleCallResolved);

    return () => {
      socketService.off('waiter:call_acknowledged', handleCallAcknowledged);
      socketService.off('waiter:call_resolved', handleCallResolved);
    };
  }, []);

  useEffect(() => {
    if (activeCall && activeCall.status === 'pending') {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [activeCall]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const handleCallAcknowledged = (data: { callId: string; waiterId: string; estimatedResponseTime: number }) => {
    if (activeCall && activeCall.id === data.callId) {
      setActiveCall(prev => prev ? {
        ...prev,
        status: 'acknowledged',
        assignedWaiterId: data.waiterId,
        estimatedResponseTime: data.estimatedResponseTime,
        acknowledgedAt: new Date(),
      } : null);

      // Show success feedback
      Vibration.vibrate([0, 200, 100, 200]);
      Alert.alert(
        'Waiter Notified!',
        `A waiter will be with you in approximately ${Math.round(data.estimatedResponseTime / 60)} minutes.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleCallResolved = (data: { callId: string; resolution: string }) => {
    if (activeCall && activeCall.id === data.callId) {
      setActiveCall(prev => prev ? {
        ...prev,
        status: 'resolved',
        resolvedAt: new Date(),
      } : null);

      // Clear active call after a delay
      setTimeout(() => {
        setActiveCall(null);
      }, 3000);
    }
  };

  const handleCallWaiter = async () => {
    if (activeCall && activeCall.status !== 'resolved') {
      // Show active call status
      showActiveCallStatus();
      return;
    }

    setIsModalVisible(true);
  };

  const showActiveCallStatus = () => {
    if (!activeCall) return;

    let statusMessage = '';
    switch (activeCall.status) {
      case 'pending':
        statusMessage = 'Your call is pending. A waiter will respond shortly.';
        break;
      case 'acknowledged':
        const eta = activeCall.estimatedResponseTime ? Math.round(activeCall.estimatedResponseTime / 60) : 5;
        statusMessage = `A waiter is on the way! Estimated arrival: ${eta} minutes.`;
        break;
      case 'in_progress':
        statusMessage = 'A waiter is currently handling your request.';
        break;
    }

    Alert.alert('Call Status', statusMessage, [
      { text: 'Cancel Call', style: 'destructive', onPress: handleCancelCall },
      { text: 'OK', style: 'default' },
    ]);
  };

  const submitCall = async () => {
    try {
      setLoading(true);

      const callData = {
        sessionId,
        tableId,
        locationId,
        callType,
        message: message.trim() || undefined,
        priority: callType === 'complaint' ? 'high' as const : 'medium' as const,
      };

      const response = await apiService.callWaiter(callData);

      if (response.success && response.data) {
        setActiveCall(response.data);
        
        // Also emit via socket for real-time
        socketService.callWaiter(callData);

        // Haptic feedback
        Vibration.vibrate(200);

        setIsModalVisible(false);
        setMessage('');
        
        Alert.alert(
          'Call Sent!',
          'Your request has been sent to the waitstaff. They will be with you shortly.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to call waiter');
      }
    } catch (error) {
      console.error('Error calling waiter:', error);
      Alert.alert('Error', 'Failed to call waiter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCall = async () => {
    if (!activeCall) return;

    try {
      const response = await apiService.cancelWaiterCall(activeCall.id);
      
      if (response.success) {
        setActiveCall(null);
        Alert.alert('Call Cancelled', 'Your waiter call has been cancelled.');
      } else {
        Alert.alert('Error', response.error || 'Failed to cancel call');
      }
    } catch (error) {
      console.error('Error cancelling call:', error);
      Alert.alert('Error', 'Failed to cancel call');
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'assistance': return 'help-outline';
      case 'bill': return 'receipt';
      case 'complaint': return 'report-problem';
      case 'other': return 'chat';
      default: return 'help-outline';
    }
  };

  const getCallTypeLabel = (type: string) => {
    switch (type) {
      case 'assistance': return 'Need Assistance';
      case 'bill': return 'Request Bill';
      case 'complaint': return 'Report Issue';
      case 'other': return 'Other Request';
      default: return 'Need Assistance';
    }
  };

  const getButtonStyle = () => {
    if (disabled) return [styles.button, styles.buttonDisabled, style];
    
    if (activeCall) {
      switch (activeCall.status) {
        case 'pending':
          return [styles.button, styles.buttonPending, style];
        case 'acknowledged':
          return [styles.button, styles.buttonAcknowledged, style];
        case 'in_progress':
          return [styles.button, styles.buttonInProgress, style];
        case 'resolved':
          return [styles.button, styles.buttonResolved, style];
        default:
          return [styles.button, style];
      }
    }
    
    return [styles.button, style];
  };

  const getButtonText = () => {
    if (activeCall) {
      switch (activeCall.status) {
        case 'pending':
          return 'Call Pending...';
        case 'acknowledged':
          return 'Waiter Coming';
        case 'in_progress':
          return 'Being Helped';
        case 'resolved':
          return 'Request Complete';
        default:
          return 'Call Garçon';
      }
    }
    return 'Call Garçon';
  };

  const getButtonIcon = () => {
    if (activeCall) {
      switch (activeCall.status) {
        case 'pending':
          return 'schedule';
        case 'acknowledged':
          return 'directions-walk';
        case 'in_progress':
          return 'person';
        case 'resolved':
          return 'check-circle';
        default:
          return 'restaurant-menu';
      }
    }
    return 'restaurant-menu';
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={getButtonStyle()}
          onPress={handleCallWaiter}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Icon 
            name={getButtonIcon()} 
            size={24} 
            color="#FFFFFF" 
            style={styles.buttonIcon} 
          />
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Call Waiter</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.sectionTitle}>What do you need help with?</Text>
            
            <View style={styles.callTypeContainer}>
              {(['assistance', 'bill', 'complaint', 'other'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.callTypeButton,
                    callType === type && styles.callTypeButtonActive,
                  ]}
                  onPress={() => setCallType(type)}
                >
                  <Icon
                    name={getCallTypeIcon(type)}
                    size={24}
                    color={callType === type ? '#FFFFFF' : '#007AFF'}
                  />
                  <Text
                    style={[
                      styles.callTypeText,
                      callType === type && styles.callTypeTextActive,
                    ]}
                  >
                    {getCallTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Additional Message (Optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Describe what you need help with..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIsModalVisible(false)}
                style={styles.cancelButton}
              />
              <Button
                title="Send Call"
                onPress={submitCall}
                loading={loading}
                style={styles.sendButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPending: {
    backgroundColor: '#FF9500',
  },
  buttonAcknowledged: {
    backgroundColor: '#34C759',
  },
  buttonInProgress: {
    backgroundColor: '#5856D6',
  },
  buttonResolved: {
    backgroundColor: '#34C759',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    marginTop: 24,
  },
  callTypeContainer: {
    marginBottom: 24,
  },
  callTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  callTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  callTypeText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
    fontWeight: '500',
  },
  callTypeTextActive: {
    color: '#FFFFFF',
  },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  sendButton: {
    flex: 1,
  },
});

export default WaiterCallButton;