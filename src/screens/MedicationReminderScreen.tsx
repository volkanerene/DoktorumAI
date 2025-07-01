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
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import NotificationService from '../services/NotificationService';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const BG_COLOR = '#09408B';      // yumuşak mavi

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

  const setupNotifications = async () => {
    // Bildirimler için izin kontrolü
    if (Platform.OS === 'ios') {
      // iOS için bildirim izni gerekli
    }
  };

  const scheduleNotifications = (medication: Medication) => {
    // Bildirim planlama - NotificationService kullanarak
    console.log('Scheduling notifications for:', medication.name);
  };

  const cancelNotifications = (medicationId: string) => {
    // Bildirim iptal etme
    console.log('Canceling notifications for:', medicationId);
  };
  
const MEDICATION_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#DDA0DD', '#98D8C8', '#F7DC6F'
];


const MEDICATION_DOSAGES: Record<string, { defaultDosage: string; frequency: string; times: string[] }> = {
  // Diyabet İlaçları
  metformin: { defaultDosage: '500mg', frequency: 'twice', times: ['08:00', '20:00'] },
  glifor: { defaultDosage: '850mg', frequency: 'twice', times: ['08:00', '20:00'] },
  glucophage: { defaultDosage: '500mg', frequency: 'twice', times: ['08:00', '20:00'] },
  insulin: { defaultDosage: '10 ünite', frequency: 'custom', times: ['07:00', '12:00', '18:00', '22:00'] },
  
  // Tansiyon İlaçları
  beloc: { defaultDosage: '50mg', frequency: 'daily', times: ['08:00'] },
  micardis: { defaultDosage: '80mg', frequency: 'daily', times: ['08:00'] },
  coversyl: { defaultDosage: '5mg', frequency: 'daily', times: ['08:00'] },
  norvasc: { defaultDosage: '5mg', frequency: 'daily', times: ['08:00'] },
  
  // Kalp İlaçları
  aspirin: { defaultDosage: '100mg', frequency: 'daily', times: ['09:00'] },
  plavix: { defaultDosage: '75mg', frequency: 'daily', times: ['09:00'] },
  coraspin: { defaultDosage: '100mg', frequency: 'daily', times: ['09:00'] },
  
  // Kolesterol İlaçları
  crestor: { defaultDosage: '10mg', frequency: 'daily', times: ['21:00'] },
  lipitor: { defaultDosage: '20mg', frequency: 'daily', times: ['21:00'] },
  atorvastatin: { defaultDosage: '20mg', frequency: 'daily', times: ['21:00'] },
  
  // Psikiyatri İlaçları
  prozac: { defaultDosage: '20mg', frequency: 'daily', times: ['08:00'] },
  cipralex: { defaultDosage: '10mg', frequency: 'daily', times: ['08:00'] },
  lustral: { defaultDosage: '50mg', frequency: 'daily', times: ['08:00'] },
  xanax: { defaultDosage: '0.5mg', frequency: 'custom', times: ['08:00', '14:00', '20:00'] },
  
  // Mide İlaçları
  nexium: { defaultDosage: '40mg', frequency: 'daily', times: ['07:00'] },
  lansor: { defaultDosage: '30mg', frequency: 'daily', times: ['07:00'] },
  omeprol: { defaultDosage: '20mg', frequency: 'daily', times: ['07:00'] },
  
  // Diğer ilaçlar için varsayılan
  default: { defaultDosage: '1 tablet', frequency: 'daily', times: ['09:00'] }
};
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
    const { t, language } = useLanguage();
  
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
const SERVER_URL = 'https://www.prokoc2.com/api2.php';
  useEffect(() => {
    loadMedications();
    loadProfileMedications(); 
    setupNotifications();
    calculateAdherence();
  }, []);

const loadProfileMedications = async () => {
  try {
    // Profil bilgilerini al
    const profileRes = await axios.get(`${SERVER_URL}?action=getProfile&user_id=${userId}`);
    
    if (profileRes.data.success && profileRes.data.profile?.answers) {
      const answers = profileRes.data.profile.answers;
      
      // medications string'ini parse et
      if (answers.medications) {
        const medicationsList = answers.medications.split(',').map((m: string) => m.trim());
        
        // Mevcut ilaçları kontrol et
        const existingMeds = await AsyncStorage.getItem(`medications_${userId}`);
        const existing = existingMeds ? JSON.parse(existingMeds) : [];
        
        // Her ilaç için kontrol et ve ekle
        medicationsList.forEach((medKey: string) => {
          // "other:" prefix'li olanları atla
          if (medKey.startsWith('other:')) return;
          
          // Zaten eklenmişse atla
          if (existing.some((e: Medication) => e.name.toLowerCase() === medKey.toLowerCase())) return;
          
          // İlaç bilgilerini al
          const medInfo = MEDICATION_DOSAGES[medKey] || MEDICATION_DOSAGES.default;
          const medName = t(`onboarding.medicationsDict.${medKey}`) || medKey;
          
          // Yeni ilaç oluştur
          const newMedication: Medication = {
            id: Date.now().toString() + '_' + medKey,
            name: medName,
            dosage: medInfo.defaultDosage,
            frequency: medInfo.frequency as any,
            times: medInfo.times,
            startDate: new Date(),
            isActive: true,
            color: MEDICATION_COLORS[existing.length % MEDICATION_COLORS.length],
            icon: MEDICATION_ICONS[existing.length % MEDICATION_ICONS.length],
            notes: 'Profil bilgilerinizden eklendi',
          };
          
          existing.push(newMedication);
        });
        
        // Güncel listeyi kaydet
        if (existing.length > 0) {
          await saveMedications(existing);
        }
      }
    }
  } catch (error) {
    console.error('Error loading profile medications:', error);
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
    
Alert.alert(t('common.success'), t('medication.medicationSaved'));

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
   <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
    <SafeAreaView style={styles.container}>
      {/* ---------- Header ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('medication.title')}</Text>

        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ---------- İçerik ---------- */}
      <ScrollView style={styles.content} >
        {/* Haftalık uyum kartı */}
        <View style={styles.adherenceCard}>
          <Text style={styles.adherenceTitle}>{t('medication.weeklyAdherence')}</Text>

          <View style={styles.adherenceCircle}>
            <Text style={styles.adherencePercent}>{adherenceRate}%</Text>
          </View>

          <Text style={styles.adherenceSubtitle}>
            {t('medication.adherenceHint')}
          </Text>
        </View>

        {/* Bugünün programı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('medication.todaySchedule')}</Text>

          {todayReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-check" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('medication.noReminder')}</Text>
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

        {/* İlaç listesi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('medication.myMeds')}</Text>

          {medications.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyMedication}
              onPress={() => setShowAddModal(true)}>
              <MaterialIcons name="add-circle-outline" size={48} color="#667eea" />
              <Text style={styles.emptyMedText}>{t('medication.addFirst')}</Text>
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

<Text style={styles.inputLabel}>Önerilen İlaçlar</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedMeds}>
  {Object.keys(MEDICATION_DOSAGES).filter(key => key !== 'default').map((medKey) => {
    const medName = t(`onboarding.medicationsDict.${medKey}`);
    return (
      <TouchableOpacity
        key={medKey}
        style={styles.suggestedMedChip}
        onPress={() => {
          const info = MEDICATION_DOSAGES[medKey];
          setFormData({
            ...formData,
            name: medName,
            dosage: info.defaultDosage,
            frequency: info.frequency as any,
            times: info.times,
          });
        }}
      >
        <Text style={styles.suggestedMedText}>{medName}</Text>
      </TouchableOpacity>
    );
  })}
</ScrollView>
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


      {/* ---------- Saat seçici ---------- */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          is24Hour
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(
                date.getMinutes(),
              ).padStart(2, '0')}`;
              setFormData({ ...formData, times: [timeStr] });
            }
          }}
        />
      )}
    </SafeAreaView>
  </View>
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
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  addBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  backButton: {
    padding: 4,
  },

  addButton: {
    padding: 4,
  },

  adherenceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  // styles içinde güncelleyin:
adherenceCard: {
  backgroundColor: 'rgba(255,255,255,0.95)',
  margin: 16,
  padding: 24,
  borderRadius: 20,
  alignItems: 'center',
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
},

adherenceCircle: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: '#46B168', // Tema rengi
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
},

medicationCard: {
  backgroundColor: 'rgba(255,255,255,0.95)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  borderLeftWidth: 4,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},

emptyMedication: {
  backgroundColor: 'rgba(255,255,255,0.95)',
  borderRadius: 16,
  padding: 32,
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#46B168',
  borderStyle: 'dashed',
},

reminderCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.95)',
  padding: 16,
  borderRadius: 16,
  marginBottom: 8,
},

section: {
  marginHorizontal: 16,
  marginBottom: 24,
  backgroundColor: 'transparent',
},

sectionTitle: {
  fontSize: 20,
  fontWeight: '600',
  color: '#fff',
  marginBottom: 16,
},
// styles'a ekleyin:
suggestedMeds: {
  maxHeight: 50,
  marginBottom: 16,
},

suggestedMedChip: {
  backgroundColor: '#6B75D6',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  marginRight: 8,
},

suggestedMedText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '500',
},

emptyState: {
  alignItems: 'center',
  paddingVertical: 32,
  backgroundColor: 'rgba(255,255,255,0.95)',
  borderRadius: 16,
},

emptyText: {
  fontSize: 16,
  color: '#666',
  marginTop: 8,
},
});