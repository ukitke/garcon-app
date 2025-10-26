import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Reservation, Location } from '../types';
import { apiService } from '../services/api';
import Button from '../components/common/Button';

interface ReservationScreenProps {
  route?: {
    params?: {
      locationId?: string;
    };
  };
}

const ReservationScreen: React.FC<ReservationScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { locationId } = (route.params as any) || {};

  const [location, setLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [partySize, setPartySize] = useState(2);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [contactInfo, setContactInfo] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (locationId) {
      loadLocation();
    }
    loadUserProfile();
  }, [locationId]);

  useEffect(() => {
    if (location) {
      checkAvailability();
    }
  }, [selectedDate, partySize, location]);

  const loadLocation = async () => {
    try {
      const response = await apiService.getLocation(locationId);
      if (response.success && response.data) {
        setLocation(response.data);
      }
    } catch (error) {
      console.error('Error loading location:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await apiService.getUserProfile();
      if (response.success && response.data) {
        setContactInfo({
          name: response.data.name || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const checkAvailability = async () => {
    if (!location) return;

    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const response = await apiService.getAvailableSlots(
        location.id,
        dateString,
        partySize
      );

      if (response.success && response.data) {
        setAvailableSlots(response.data);
        setSelectedSlot(null);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      setSelectedTime(time);
    }
  };

  const handleCreateReservation = async () => {
    if (!location || !selectedSlot) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    if (!contactInfo.name || !contactInfo.phone || !contactInfo.email) {
      Alert.alert('Error', 'Please fill in all contact information');
      return;
    }

    try {
      setLoading(true);

      const reservationData = {
        locationId: location.id,
        dateTime: selectedSlot.dateTime,
        partySize,
        specialRequests: specialRequests.trim() || undefined,
        contactInfo,
      };

      const response = await apiService.createReservation(reservationData);

      if (response.success && response.data) {
        Alert.alert(
          'Reservation Confirmed!',
          `Your table has been reserved for ${partySize} people on ${new Date(selectedSlot.dateTime).toLocaleDateString()} at ${new Date(selectedSlot.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Reservations'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to create reservation');
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('Error', 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  const renderPartySizeSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Party Size</Text>
      <View style={styles.partySizeContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
          <TouchableOpacity
            key={size}
            style={[
              styles.partySizeButton,
              partySize === size && styles.partySizeButtonActive,
            ]}
            onPress={() => setPartySize(size)}
          >
            <Text
              style={[
                styles.partySizeText,
                partySize === size && styles.partySizeTextActive,
              ]}
            >
              {size}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.partySizeButton,
            partySize > 8 && styles.partySizeButtonActive,
          ]}
          onPress={() => {
            Alert.prompt(
              'Party Size',
              'Enter the number of people:',
              (text) => {
                const size = parseInt(text);
                if (size > 0 && size <= 20) {
                  setPartySize(size);
                } else {
                  Alert.alert('Error', 'Please enter a valid party size (1-20)');
                }
              },
              'plain-text',
              partySize > 8 ? partySize.toString() : '9'
            );
          }}
        >
          <Text
            style={[
              styles.partySizeText,
              partySize > 8 && styles.partySizeTextActive,
            ]}
          >
            {partySize > 8 ? partySize : '9+'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDateTimeSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Date & Time</Text>
      
      <TouchableOpacity
        style={styles.dateTimeButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Icon name="calendar-today" size={20} color="#007AFF" />
        <Text style={styles.dateTimeText}>
          {selectedDate.toLocaleDateString()}
        </Text>
        <Icon name="chevron-right" size={20} color="#C7C7CC" />
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
          maximumDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 30 days from now
        />
      )}
    </View>
  );

  const renderAvailableSlots = () => {
    if (availableSlots.length === 0) {
      return (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Available Times</Text>
          <View style={styles.noSlotsContainer}>
            <Icon name="schedule" size={48} color="#C7C7CC" />
            <Text style={styles.noSlotsText}>No available times</Text>
            <Text style={styles.noSlotsSubtext}>
              Try selecting a different date or party size
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Available Times</Text>
        <View style={styles.slotsContainer}>
          {availableSlots.map((slot, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.slotButton,
                selectedSlot?.id === slot.id && styles.slotButtonActive,
              ]}
              onPress={() => setSelectedSlot(slot)}
            >
              <Text
                style={[
                  styles.slotText,
                  selectedSlot?.id === slot.id && styles.slotTextActive,
                ]}
              >
                {new Date(slot.dateTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderContactInfo = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Name *</Text>
        <TextInput
          style={styles.textInput}
          value={contactInfo.name}
          onChangeText={(text) => setContactInfo(prev => ({ ...prev, name: text }))}
          placeholder="Your full name"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone *</Text>
        <TextInput
          style={styles.textInput}
          value={contactInfo.phone}
          onChangeText={(text) => setContactInfo(prev => ({ ...prev, phone: text }))}
          placeholder="Your phone number"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email *</Text>
        <TextInput
          style={styles.textInput}
          value={contactInfo.email}
          onChangeText={(text) => setContactInfo(prev => ({ ...prev, email: text }))}
          placeholder="Your email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderSpecialRequests = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Special Requests (Optional)</Text>
      <TextInput
        style={styles.textArea}
        value={specialRequests}
        onChangeText={setSpecialRequests}
        placeholder="Any special requests or dietary requirements..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
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
        <Text style={styles.title}>Make Reservation</Text>
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

      {renderPartySizeSelector()}
      {renderDateTimeSelector()}
      {renderAvailableSlots()}
      {renderContactInfo()}
      {renderSpecialRequests()}

      <View style={styles.actions}>
        <Button
          title="Confirm Reservation"
          onPress={handleCreateReservation}
          loading={loading}
          disabled={!selectedSlot || loading}
          fullWidth
        />
      </View>

      <View style={styles.policyContainer}>
        <Text style={styles.policyText}>
          By making a reservation, you agree to our cancellation policy. 
          Please arrive within 15 minutes of your reservation time.
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
  partySizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partySizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  partySizeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  partySizeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  partySizeTextActive: {
    color: '#FFFFFF',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 16,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  slotTextActive: {
    color: '#FFFFFF',
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noSlotsText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
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
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  policyContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ReservationScreen;