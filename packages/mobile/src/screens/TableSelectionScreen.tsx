import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Table, TableSession } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import Button from '../components/common/Button';

interface TableSelectionScreenProps {
  route: {
    params: {
      locationId: string;
    };
  };
}

const TableSelectionScreen: React.FC<TableSelectionScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { locationId } = route.params as any;

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [fantasyName, setFantasyName] = useState('');
  const [joiningTable, setJoiningTable] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLocationTables(locationId);
      
      if (response.success && response.data) {
        setTables(response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to load tables');
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      Alert.alert('Error', 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (table: Table) => {
    if (!table.isActive) {
      Alert.alert('Table Unavailable', 'This table is currently not available.');
      return;
    }

    setSelectedTable(table);
    
    if (table.currentSession) {
      // Table has an active session, show join modal
      setShowJoinModal(true);
    } else {
      // No active session, create new one
      joinTable(table, undefined);
    }
  };

  const joinTable = async (table: Table, fantasyName?: string) => {
    try {
      setJoiningTable(true);
      
      const response = await apiService.joinTableSession(table.id, fantasyName);
      
      if (response.success && response.data) {
        const session = response.data;
        
        // Join socket room for real-time updates
        socketService.joinSession(session.id);
        
        // Navigate to menu
        navigation.navigate('Menu', {
          locationId,
          tableId: table.id,
          sessionId: session.id,
          participantId: session.participantId,
        });
        
        setShowJoinModal(false);
        setFantasyName('');
      } else {
        Alert.alert('Error', response.error || 'Failed to join table');
      }
    } catch (error) {
      console.error('Error joining table:', error);
      Alert.alert('Error', 'Failed to join table');
    } finally {
      setJoiningTable(false);
    }
  };

  const generateFantasyName = () => {
    const adjectives = [
      'Hungry', 'Happy', 'Cheerful', 'Friendly', 'Curious', 'Brave', 'Clever',
      'Gentle', 'Kind', 'Wise', 'Swift', 'Bold', 'Bright', 'Calm', 'Cool'
    ];
    
    const nouns = [
      'Panda', 'Tiger', 'Eagle', 'Dolphin', 'Lion', 'Fox', 'Wolf', 'Bear',
      'Owl', 'Hawk', 'Deer', 'Rabbit', 'Cat', 'Dog', 'Horse'
    ];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    setFantasyName(`${adjective} ${noun}`);
  };

  const getTableStatusColor = (table: Table): string => {
    if (!table.isActive) return '#FF3B30';
    if (table.currentSession) return '#FF9500';
    return '#34C759';
  };

  const getTableStatusText = (table: Table): string => {
    if (!table.isActive) return 'Unavailable';
    if (table.currentSession) {
      const participantCount = table.currentSession.participants?.length || 0;
      return `${participantCount} ${participantCount === 1 ? 'person' : 'people'}`;
    }
    return 'Available';
  };

  const renderTable = ({ item }: { item: Table }) => (
    <TouchableOpacity
      style={[
        styles.tableItem,
        !item.isActive && styles.tableItemDisabled,
      ]}
      onPress={() => handleTableSelect(item)}
      disabled={!item.isActive}
      activeOpacity={0.7}
    >
      <View style={styles.tableHeader}>
        <Text style={styles.tableNumber}>Table {item.number}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getTableStatusColor(item) },
          ]}
        >
          <Text style={styles.statusText}>{getTableStatusText(item)}</Text>
        </View>
      </View>
      
      <View style={styles.tableDetails}>
        <View style={styles.tableInfo}>
          <Icon name="people" size={16} color="#8E8E93" />
          <Text style={styles.tableInfoText}>
            Seats {item.capacity}
          </Text>
        </View>
        
        {item.currentSession && (
          <View style={styles.tableInfo}>
            <Icon name="schedule" size={16} color="#8E8E93" />
            <Text style={styles.tableInfoText}>
              Active since {new Date(item.currentSession.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        )}
      </View>
      
      {item.currentSession && (
        <Text style={styles.joinHint}>Tap to join this table</Text>
      )}
    </TouchableOpacity>
  );

  const renderJoinModal = () => (
    <Modal
      visible={showJoinModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowJoinModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setShowJoinModal(false)}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Join Table {selectedTable?.number}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.sectionTitle}>Choose Your Display Name</Text>
          <Text style={styles.sectionDescription}>
            This name will be visible to other people at your table for group ordering.
          </Text>
          
          <View style={styles.nameInputContainer}>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter a fun name..."
              value={fantasyName}
              onChangeText={setFantasyName}
              maxLength={20}
            />
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateFantasyName}
            >
              <Icon name="shuffle" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.nameHint}>
            Or tap the shuffle button for a random name!
          </Text>

          {selectedTable?.currentSession && (
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>Current Table Members:</Text>
              {selectedTable.currentSession.participants?.map((participant, index) => (
                <View key={index} style={styles.participantItem}>
                  <Icon name="person" size={16} color="#8E8E93" />
                  <Text style={styles.participantName}>{participant.fantasyName}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowJoinModal(false)}
              style={styles.cancelButton}
            />
            <Button
              title="Join Table"
              onPress={() => selectedTable && joinTable(selectedTable, fantasyName)}
              loading={joiningTable}
              disabled={!fantasyName.trim()}
              style={styles.joinButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading tables...</Text>
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
        <Text style={styles.title}>Select a Table</Text>
        <TouchableOpacity
          onPress={loadTables}
          style={styles.refreshButton}
        >
          <Icon name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
          <Text style={styles.legendText}>Occupied (can join)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
          <Text style={styles.legendText}>Unavailable</Text>
        </View>
      </View>

      <FlatList
        data={tables}
        renderItem={renderTable}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />

      {renderJoinModal()}
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
  refreshButton: {
    padding: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  listContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  tableItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tableItemDisabled: {
    opacity: 0.6,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  tableDetails: {
    marginBottom: 8,
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tableInfoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
  },
  joinHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    textAlign: 'center',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 12,
  },
  generateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  nameHint: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 32,
  },
  sessionInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantName: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  joinButton: {
    flex: 1,
  },
});

export default TableSelectionScreen;