import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

type MedicationReminderProps = StackScreenProps<RootStackParamList, 'MedicationReminder'>;

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'twice' | 'thrice' | 'custom';
  times: string[];
  startDate: Date;
  endDate?: Date;
  notes?: string;
  isActive: boolean;
  pillsCount?: number;
  pillsRemaining?: number;
  color: string;
  icon: string;
}

interface Reminder {
  medicationId: string;
  time: string;
  taken: boolean;
  takenAt?: Date;
  skipped?: boolean;
  skippedReason?: string;
}

const MEDICATION_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#DDA0DD', '#98D8C8', '#F7DC6F'
];

const MEDICATION_ICONS = [
  'medication', 'pill', 'healing', 'favorite', 'local-hospital', 'vaccines'
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Günde 1 kez', times: 1 },
  { value: 'twice', label: 'Günde 2 kez', times: 2 },
  { value: 'thrice', label: 'Günde 3 kez', times: 3 },
  { value: 'custom', label: 'Özel', times: 0 },
];

export default function MedicationReminderScreen({ route, navigation }: MedicationReminderProps) {
  const { userId } = route.params;
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [adherenceRate, setAdherenceRate] = useState(0);
  
  // Form states
  const [formData, setFormData] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['09:00'],
    startDate: new Date(),
    isActive: true,
    color: MEDICATION_COLORS[0],
    icon: MEDICATION_ICONS[0],
  });

  useEffect(() => {
    loadMedications();
    setupNotifications();
    calculateAdherence();
  }, []);

  const setupNotifications = () => {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'medication-reminder',
          channelName: 'İlaç Hatırlatıcıları',
          channelDescription: 'İlaç alma zamanı bildirimleri',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`createChannel returned '${created}'`)
      );
    }
  };

  const loadMedications = async () => {
    try {
      const stored = await AsyncStorage.getItem(`medications_${userId}`);
      if (stored) {
        const meds: Medication[] = JSON.parse(stored);
        setMedications(meds);
        generateTodayReminders(meds);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const saveMedications = async (meds: Medication[]) => {
    try {
      await AsyncStorage.setItem(`medications_${userId}`, JSON.stringify(meds));
      setMedications(meds);
      generateTodayReminders(meds);
    } catch (error) {
      console.error('Error saving medications:', error);
    }
  };

  const generateTodayReminders = (meds: Medication[]) => {
    const today = new Date();
    const reminders: Reminder[] = [];

    meds.forEach(med => {
      if (med.isActive) {
        med.times.forEach(time => {
          reminders.push({
            medicationId: med.id,
            time,
            taken: false,
          });
        });
      }
    });

    // Sort by time
    reminders.sort((a, b) => a.time.localeCompare(b.time));
    setTodayReminders(reminders);
  };

  const scheduleNotifications = (medication: Medication) => {
    medication.times.forEach((time, index) => {
      const [hours, minutes] = time.split(':').map(Number);
      const notificationTime = new Date();
      notificationTime.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (notificationTime < new Date()) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }

      PushNotification.localNotificationSchedule({
        channelId: 'medication-reminder',
        title: '💊 İlaç Zamanı!',
        message: `${medication.name} (${medication.dosage}) almanız gerekiyor`,
        date: notificationTime,
        repeatType: 'day',
        id: `${medication.id}_${index}`,
        userInfo: { medicationId: medication.id, time },
      });
    });
  };

  const cancelNotifications = (medicationId: string) => {
    // Cancel all notifications for this medication
    for (let i = 0; i < 10; i++) {
      PushNotification.cancelLocalNotification(`${medicationId}_${i}`);
    }
  };

  const addMedication = () => {
    if (!formData.name || !formData.dosage) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilaç adı ve dozajını girin');
      return;
    }

    const newMedication: Medication = {
      id: Date.now().toString(),
      name: formData.name,
      dosage: formData.dosage,
      frequency: formData.frequency || 'daily',
      times: formData.times || ['09:00'],
      startDate: formData.startDate || new Date(),
      endDate: formData.endDate,
      notes: formData.notes,
      isActive: true,
      color: formData.color || MEDICATION_COLORS[0],
      icon: formData.icon || MEDICATION_ICONS[0],
    };

    const updated = [...medications, newMedication];
    saveMedications(updated);
    scheduleNotifications(newMedication);
    
    setShowAddModal(false);
    resetForm();
    
    Alert.alert(
      'Başarılı',
      'İlaç hatırlatıcısı eklendi',
      [{ text: 'Tamam' }]
    );
  };

  const toggleMedication = (id: string) => {
    const updated = medications.map(med => {
      if (med.id === id) {
        const newStatus = !med.isActive;
        if (newStatus) {
          scheduleNotifications(med);
        } else {
          cancelNotifications(med.id);
        }
        return { ...med, isActive: newStatus };
      }
      return med;
    });
    saveMedications(updated);
  };

  const deleteMedication = (id: string) => {
    Alert.alert(
      'İlaç Sil',
      'Bu ilacı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            cancelNotifications(id);
            const updated = medications.filter(med => med.id !== id);
            saveMedications(updated);
          },
        },
      ]
    );
  };

  const markTaken = (medicationId: string, time: string) => {
    const updated = todayReminders.map(reminder => {
      if (reminder.medicationId === medicationId && reminder.time === time) {
        return { ...reminder, taken: true, takenAt: new Date() };
      }
      return reminder;
    });
    setTodayReminders(updated);
    saveTodayProgress(updated);
    
    // Update adherence
    calculateAdherence();
  };

  const markSkipped = (medicationId: string, time: string, reason?: string) => {
    const updated = todayReminders.map(reminder => {
      if (reminder.medicationId === medicationId && reminder.time === time) {
        return { ...reminder, skipped: true, skippedReason: reason };
      }
      return reminder;
    });
    setTodayReminders(updated);
    saveTodayProgress(updated);
  };

  const saveTodayProgress = async (reminders: Reminder[]) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await AsyncStorage.setItem(
        `reminders_${userId}_${today}`,
        JSON.stringify(reminders)
      );
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const calculateAdherence = async () => {
    // Calculate adherence rate for last 7 days
    let totalReminders = 0;
    let takenReminders = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const stored = await AsyncStorage.getItem(`reminders_${userId}_${dateStr}`);
        if (stored) {
          const reminders: Reminder[] = JSON.parse(stored);
          totalReminders += reminders.length;
          takenReminders += reminders.filter(r => r.taken).length;
        }
      } catch (error) {
        console.error('Error calculating adherence:', error);
      }
    }

    const rate = totalReminders > 0 ? (takenReminders / totalReminders) * 100 : 0;
    setAdherenceRate(Math.round(rate));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: 'daily',
      times: ['09:00'],
      startDate: new Date(),
      isActive: true,
      color: MEDICATION_COLORS[0],
      icon: MEDICATION_ICONS[0],
    });
  };

  const renderMedication = ({ item }: { item: Medication }) => {
    const nextDose = getNextDose(item);
    
    return (
      <TouchableOpacity
        style={[styles.medicationCard, { borderLeftColor: item.color }]}
        onPress={() => navigation.navigate('MedicationDetail', { medication: item })}
      >
        <View style={styles.medicationHeader}>
          <View style={[styles.medicationIcon, { backgroundColor: item.color }]}>
            <MaterialIcons name={item.icon as any} size={24} color="#fff" />
          </View>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{item.name}</Text>
            <Text style={styles.medicationDosage}>{item.dosage}</Text>
          </View>
          <Switch
            value={item.isActive}
            onValueChange={() => toggleMedication(item.id)}
            trackColor={{ false: '#767577', true: item.color }}
            thumbColor={item.isActive ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.medicationFooter}>
          <Text style={styles.nextDoseText}>
            Sonraki doz: {nextDose || 'Bugün tamamlandı'}
          </Text>
          <TouchableOpacity onPress={() => deleteMedication(item.id)}>
            <MaterialIcons name="delete-outline" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReminder = ({ item }: { item: Reminder }) => {
    const medication = medications.find(m => m.id === item.medicationId);
    if (!medication) return null;

    const isPast = isPastTime(item.time);
    const isUpcoming = !isPast && !item.taken && !item.skipped;

    return (
      <View style={[
        styles.reminderCard,
        item.taken && styles.reminderTaken,
        item.skipped && styles.reminderSkipped,
        isUpcoming && styles.reminderUpcoming,
      ]}>
        <View style={styles.reminderTime}>
          <Text style={styles.timeText}>{item.time}</Text>
          {item.taken && <MaterialIcons name="check-circle" size={16} color="#4CAF50" />}
          {item.skipped && <MaterialIcons name="cancel" size={16} color="#FF5252" />}
        </View>
        
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderMedName}>{medication.name}</Text>
          <Text style={styles.reminderDosage}>{medication.dosage}</Text>
        </View>
        
        {!item.taken && !item.skipped && isPast && (
          <View style={styles.reminderActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.takeButton]}
              onPress={() => markTaken(item.medicationId, item.time)}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => markSkipped(item.medicationId, item.time)}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getNextDose = (medication: Medication): string | null => {
    if (!medication.isActive) return null;
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    for (const time of medication.times) {
      if (time > currentTime) {
        return time;
      }
    }
    
    return null;
  };

  const isPastTime = (time: string): boolean => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours, minutes, 0, 0);
    return timeDate <= now;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İlaç Hatırlatıcı</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Adherence Card */}
        <View style={styles.adherenceCard}>
          <Text style={styles.adherenceTitle}>Haftalık Uyum</Text>
          <View style={styles.adherenceCircle}>
            <Text style={styles.adherencePercent}>{adherenceRate}%</Text>
          </View>
          <Text style={styles.adherenceSubtitle}>
            Son 7 günde ilaçlarınızı alma oranınız
          </Text>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bugünün Programı</Text>
          {todayReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-check" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Bugün için hatırlatıcı yok</Text>
            </View>
          ) : (
            <FlatList
              data={todayReminders}
              renderItem={renderReminder}
              keyExtractor={(item) => `${item.medicationId}_${item.time}`}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* My Medications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İlaçlarım</Text>
          {medications.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyMedication}
              onPress={() => setShowAddModal(true)}
            >
              <MaterialIcons name="add-circle-outline" size={48} color="#667eea" />
              <Text style={styles.emptyMedText}>İlk ilacınızı ekleyin</Text>
            </TouchableOpacity>
          ) : (
            <FlatList
              data={medications}
              renderItem={renderMedication}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>İlaç Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>İlaç Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Aspirin"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Dozaj</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 100mg"
                value={formData.dosage}
                onChangeText={(text) => setFormData({ ...formData, dosage: text })}
              />

              <Text style={styles.inputLabel}>Kullanım Sıklığı</Text>
              <View style={styles.frequencyOptions}>
                {FREQUENCY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyOption,
                      formData.frequency === option.value && styles.frequencySelected,
                    ]}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        frequency: option.value as any,
                        times: generateDefaultTimes(option.times),
                      });
                    }}
                  >
                    <Text style={[
                      styles.frequencyText,
                      formData.frequency === option.value && styles.frequencyTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Hatırlatma Zamanları</Text>
              {formData.times?.map((time, index) => (
                <View key={index} style={styles.timeRow}>
                  <TouchableOpacity
                    style={styles.timeInput}
                    onPress={() => {
                      // Show time picker
                      setShowDatePicker(true);
                    }}
                  >
                    <MaterialIcons name="access-time" size={20} color="#667eea" />
                    <Text style={styles.timeText}>{time}</Text>
                  </TouchableOpacity>
                  {formData.times!.length > 1 && (
                    <TouchableOpacity
                      onPress={() => {
                        const newTimes = [...formData.times!];
                        newTimes.splice(index, 1);
                        setFormData({ ...formData, times: newTimes });
                      }}
                    >
                      <MaterialIcons name="remove-circle" size={24} color="#FF5252" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <Text style={styles.inputLabel}>Renk</Text>
              <View style={styles.colorOptions}>
                {MEDICATION_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.color === color && styles.colorSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, color })}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>İkon</Text>
              <View style={styles.iconOptions}>
                {MEDICATION_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      formData.icon === icon && styles.iconSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, icon })}
                  >
                    <MaterialIcons name={icon as any} size={24} color="#333" />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Notlar (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Aç karnına, yemekten sonra vb."
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.addMedButton} onPress={addMedication}>
                <Text style={styles.addMedButtonText}>İlaç Ekle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
              // Update the selected time
              // This is simplified - you'd need to track which time slot is being edited
              setFormData({
                ...formData,
                times: [timeStr],
              });
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const generateDefaultTimes = (count: number): string[] => {
  switch (count) {
    case 1:
      return ['09:00'];
    case 2:
      return ['09:00', '21:00'];
    case 3:
      return ['08:00', '14:00', '20:00'];
    default:
      return ['09:00'];
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  adherenceCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  adherenceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  adherenceCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  adherencePercent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  adherenceSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  reminderTaken: {
    backgroundColor: '#E8F5E9',
  },
  reminderSkipped: {
    backgroundColor: '#FFEBEE',
  },
  reminderUpcoming: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  reminderTime: {
    alignItems: 'center',
    marginRight: 16,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderMedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reminderDosage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeButton: {
    backgroundColor: '#4CAF50',
  },
  skipButton: {
    backgroundColor: '#FF5252',
  },
  medicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  medicationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  nextDoseText: {
    fontSize: 14,
    color: '#667eea',
  },
  emptyMedication: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
  },
  emptyMedText: {
    fontSize: 16,
    color: '#667eea',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  frequencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencySelected: {
    borderColor: '#667eea',
    backgroundColor: '#667eea',
  },
  frequencyText: {
    color: '#666',
  },
  frequencyTextSelected: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },
  colorOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#333',
  },
  iconOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconSelected: {
    borderColor: '#667eea',
    backgroundColor: '#667eea20',
  },
  addMedButton: {
    backgroundColor: '#667eea',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addMedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});