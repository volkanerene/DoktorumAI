import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Sound from 'react-native-sound';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const SERVER_URL = 'https://www.prokoc2.com/api2.php';

type EmergencySOSProps = StackScreenProps<RootStackParamList, 'EmergencySOS'>;

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface EmergencyInfo {
  bloodType?: string;
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
  emergencyNotes?: string;
}

interface NearbyHospital {
  name: string;
  address: string;
  phone: string;
  distance: number;
  emergency: boolean;
  lat?: number;
  lng?: number;
}

const EMERGENCY_NUMBERS = [
  { name: 'Ambulans', number: '112', icon: 'local-hospital', color: '#FF5252' },
  { name: 'Polis', number: '155', icon: 'local-police', color: '#2196F3' },
  { name: 'İtfaiye', number: '110', icon: 'local-fire-department', color: '#FF9800' },
  { name: 'Zehir Danışma', number: '114', icon: 'medical-services', color: '#4CAF50' },
  { name: 'AFAD', number: '122', icon: 'warning', color: '#9C27B0' },
  { name: 'Jandarma', number: '156', icon: 'security', color: '#607D8B' },
];

const FIRST_AID_GUIDES = [
  { 
    id: 'cpr',
    title: 'Kalp Masajı (CPR)',
    icon: 'favorite',
    color: '#E91E63',
    steps: [
      'Kişinin bilincini kontrol edin',
      'Solunum yolunu açın',
      'Göğüs kafesinin ortasına el üst üste koyun',
      'Dakikada 100-120 kez bası yapın',
      '30 bası, 2 solunum şeklinde devam edin'
    ]
  },
  {
    id: 'choking',
    title: 'Boğulma',
    icon: 'air',
    color: '#3F51B5',
    steps: [
      'Kişinin arkasına geçin',
      'Göbek üzerine yumruğunuzu koyun',
      'Yukarı ve içeri doğru 5 kez bastırın',
      'Sırtına 5 kez vurun',
      'Bilinç kaybı varsa CPR başlatın'
    ]
  },
  {
    id: 'bleeding',
    title: 'Kanama Kontrolü',
    icon: 'water-drop',
    color: '#F44336',
    steps: [
      'Temiz bez ile doğrudan basınç uygulayın',
      'Yaralı bölgeyi kalp seviyesinden yukarı kaldırın',
      'Basıncı sürdürün, bezi kaldırmayın',
      'Turnike sadece son çare olarak kullanın',
      '112\'yi arayın'
    ]
  },
  {
    id: 'burn',
    title: 'Yanık',
    icon: 'whatshot',
    color: '#FF5722',
    steps: [
      'Yanık bölgesini soğuk su altında tutun (10-20 dk)',
      'Takı ve sıkı giysileri çıkarın',
      'Temiz, nemli bez ile örtün',
      'Yanık üzerine buz koymayın',
      'Ciddi yanıklarda hemen 112\'yi arayın'
    ]
  },
];

export default function EmergencySOSScreen({ route, navigation }: EmergencySOSProps) {
  const { userId } = route.params;
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo>({});
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospital[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  // Form states
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    relationship: '',
  });
  
  const [infoForm, setInfoForm] = useState({
    bloodType: '',
    allergies: '',
    medications: '',
    conditions: '',
    emergencyNotes: '',
  });

  useEffect(() => {
    loadEmergencyData();
    getCurrentLocation();
    startPulseAnimation();
  }, []);

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

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadEmergencyData = async () => {
    try {
      // Load contacts
      const contactsStr = await AsyncStorage.getItem(`emergency_contacts_${userId}`);
      if (contactsStr) {
        setEmergencyContacts(JSON.parse(contactsStr));
      }
      
      // Load medical info
      const infoStr = await AsyncStorage.getItem(`emergency_info_${userId}`);
      if (infoStr) {
        setEmergencyInfo(JSON.parse(infoStr));
      }
    } catch (error) {
      console.error('Error loading emergency data:', error);
    }
  };

  const saveEmergencyContacts = async (contacts: EmergencyContact[]) => {
    try {
      await AsyncStorage.setItem(`emergency_contacts_${userId}`, JSON.stringify(contacts));
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error saving contacts:', error);
    }
  };

  const saveEmergencyInfo = async (info: EmergencyInfo) => {
    try {
      await AsyncStorage.setItem(`emergency_info_${userId}`, JSON.stringify(info));
      setEmergencyInfo(info);
    } catch (error) {
      console.error('Error saving info:', error);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        fetchNearbyHospitals(coords);
      },
      error => {
        console.error('Location error:', error);
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  const fetchNearbyHospitals = async (coords: { lat: number; lng: number }) => {
    setLoading(true);
    try {
      const response = await axios.get(`${SERVER_URL}?action=getNearbyHospitals`, {
        params: {
          lat: coords.lat,
          lng: coords.lng,
          radius: 10, // 10km radius
        },
      });
      
      if (response.data.success) {
        setNearbyHospitals(response.data.hospitals);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyCall = (number: string) => {
    Alert.alert(
      'Acil Arama',
      `${number} numarasını aramak üzeresiniz`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Ara', 
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${number}`);
            recordEmergencyCall(number);
          }
        },
      ]
    );
  };

  const recordEmergencyCall = async (number: string) => {
    try {
      await axios.post(`${SERVER_URL}?action=recordEmergencyCall`, {
        user_id: userId,
        number,
        location: userLocation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error recording call:', error);
    }
  };

  const handleSOS = () => {
    shakeAnimation();
    
    // Start countdown
    let count = 5;
    setCountdown(count);
    
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        sendSOSAlert();
      }
    }, 1000);
    
    // Allow cancellation
    Alert.alert(
      'SOS Gönderiliyor',
      'Acil durum mesajı 5 saniye içinde gönderilecek',
      [
        {
          text: 'İptal',
          style: 'cancel',
          onPress: () => {
            clearInterval(interval);
            setCountdown(null);
          },
        },
      ]
    );
  };

  const sendSOSAlert = async () => {
    if (emergencyContacts.length === 0) {
      Alert.alert('Uyarı', 'Acil durum kişisi eklenmemiş');
      return;
    }
    
    const message = `ACIL DURUM! ${userLocation ? `Konum: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}` : 'Konum bilinmiyor'}`;
    
    // Send SMS to all emergency contacts
    emergencyContacts.forEach(contact => {
      Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(message)}`);
    });
    
    // Record SOS event
    try {
      await axios.post(`${SERVER_URL}?action=recordSOS`, {
        user_id: userId,
        location: userLocation,
        contacts_notified: emergencyContacts.map(c => c.id),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error recording SOS:', error);
    }
    
    Alert.alert('SOS Gönderildi', 'Acil durum mesajı gönderildi');
  };

  const addEmergencyContact = () => {
    if (!contactForm.name || !contactForm.phone) {
      Alert.alert('Eksik Bilgi', 'İsim ve telefon numarası gerekli');
      return;
    }
    
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      ...contactForm,
    };
    
    const updated = [...emergencyContacts, newContact];
    saveEmergencyContacts(updated);
    
    setShowAddContactModal(false);
    setContactForm({ name: '', phone: '', relationship: '' });
  };

  const deleteEmergencyContact = (id: string) => {
    Alert.alert(
      'Kişiyi Sil',
      'Bu acil durum kişisini silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const updated = emergencyContacts.filter(c => c.id !== id);
            saveEmergencyContacts(updated);
          },
        },
      ]
    );
  };

  const updateEmergencyInfo = () => {
    const info: EmergencyInfo = {
      bloodType: infoForm.bloodType,
      allergies: infoForm.allergies.split(',').map(a => a.trim()).filter(a => a),
      medications: infoForm.medications.split(',').map(m => m.trim()).filter(m => m),
      conditions: infoForm.conditions.split(',').map(c => c.trim()).filter(c => c),
      emergencyNotes: infoForm.emergencyNotes,
    };
    
    saveEmergencyInfo(info);
    setShowInfoModal(false);
    Alert.alert('Başarılı', 'Acil durum bilgileri güncellendi');
  };

  const showFirstAidGuide = (guide: any) => {
    setSelectedGuide(guide);
    setShowGuideModal(true);
  };

  const callHospital = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const getDirectionsToHospital = (hospital: NearbyHospital) => {
    if (hospital.lat && hospital.lng) {
      const url = Platform.select({
        ios: `maps://maps.apple.com/?daddr=${hospital.lat},${hospital.lng}`,
        android: `geo:${hospital.lat},${hospital.lng}?q=${hospital.lat},${hospital.lng}(${hospital.name})`,
      });
      if (url) Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FF5252', '#D32F2F']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Acil Durum</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SOS Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity onPress={handleSOS} activeOpacity={0.8}>
            <Animated.View
              style={[
                styles.sosButton,
                {
                  transform: [
                    { scale: pulseAnim },
                    { translateX: shakeAnim },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#FF5252', '#F44336', '#D32F2F']}
                style={styles.sosGradient}
              >
                {countdown !== null ? (
                  <Text style={styles.countdownText}>{countdown}</Text>
                ) : (
                  <>
                    <Text style={styles.sosText}>SOS</Text>
                    <Text style={styles.sosSubtext}>Acil Durum Mesajı Gönder</Text>
                  </>
                )}
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Emergency Numbers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acil Numaralar</Text>
          <View style={styles.numbersGrid}>
            {EMERGENCY_NUMBERS.map((item) => (
              <TouchableOpacity
                key={item.number}
                style={styles.numberCard}
                onPress={() => handleEmergencyCall(item.number)}
              >
                <View style={[styles.numberIcon, { backgroundColor: item.color }]}>
                  <MaterialIcons name={item.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.numberName}>{item.name}</Text>
                <Text style={styles.numberText}>{item.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Acil Durum Kişileri</Text>
            <TouchableOpacity onPress={() => setShowAddContactModal(true)}>
              <MaterialIcons name="add-circle" size={24} color="#FF5252" />
            </TouchableOpacity>
          </View>
          
          {emergencyContacts.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyContact}
              onPress={() => setShowAddContactModal(true)}
            >
              <MaterialIcons name="person-add" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Acil durum kişisi ekleyin</Text>
            </TouchableOpacity>
          ) : (
            emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelation}>{contact.relationship}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleEmergencyCall(contact.phone)}
                  >
                    <MaterialIcons name="phone" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => deleteEmergencyContact(contact.id)}
                  >
                    <MaterialIcons name="delete" size={20} color="#FF5252" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Medical Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tıbbi Bilgiler</Text>
            <TouchableOpacity onPress={() => {
              setInfoForm({
                bloodType: emergencyInfo.bloodType || '',
                allergies: emergencyInfo.allergies?.join(', ') || '',
                medications: emergencyInfo.medications?.join(', ') || '',
                conditions: emergencyInfo.conditions?.join(', ') || '',
                emergencyNotes: emergencyInfo.emergencyNotes || '',
              });
              setShowInfoModal(true);
            }}>
              <MaterialIcons name="edit" size={24} color="#FF5252" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoCard}>
            {emergencyInfo.bloodType && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="water" size={20} color="#FF5252" />
                <Text style={styles.infoLabel}>Kan Grubu:</Text>
                <Text style={styles.infoValue}>{emergencyInfo.bloodType}</Text>
              </View>
            )}
            
            {emergencyInfo.allergies && emergencyInfo.allergies.length > 0 && (
              <View style={styles.infoRow}>
                <MaterialIcons name="warning" size={20} color="#FF9800" />
                <Text style={styles.infoLabel}>Alerjiler:</Text>
                <Text style={styles.infoValue}>{emergencyInfo.allergies.join(', ')}</Text>
              </View>
            )}
            
            {emergencyInfo.medications && emergencyInfo.medications.length > 0 && (
              <View style={styles.infoRow}>
                <MaterialIcons name="medication" size={20} color="#4CAF50" />
                <Text style={styles.infoLabel}>İlaçlar:</Text>
                <Text style={styles.infoValue}>{emergencyInfo.medications.join(', ')}</Text>
              </View>
            )}
            
            {emergencyInfo.conditions && emergencyInfo.conditions.length > 0 && (
              <View style={styles.infoRow}>
                <MaterialIcons name="healing" size={20} color="#2196F3" />
                <Text style={styles.infoLabel}>Kronik Hastalıklar:</Text>
                <Text style={styles.infoValue}>{emergencyInfo.conditions.join(', ')}</Text>
              </View>
            )}
            
            {!emergencyInfo.bloodType && !emergencyInfo.allergies?.length && (
              <TouchableOpacity
                style={styles.emptyInfo}
                onPress={() => setShowInfoModal(true)}
              >
                <MaterialIcons name="add-circle-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Tıbbi bilgilerinizi ekleyin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* First Aid Guides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İlk Yardım Rehberleri</Text>
          <View style={styles.guidesGrid}>
            {FIRST_AID_GUIDES.map((guide) => (
              <TouchableOpacity
                key={guide.id}
                style={styles.guideCard}
                onPress={() => showFirstAidGuide(guide)}
              >
                <View style={[styles.guideIcon, { backgroundColor: guide.color }]}>
                  <MaterialIcons name={guide.icon} size={32} color="#fff" />
                </View>
                <Text style={styles.guideTitle}>{guide.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nearby Hospitals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>En Yakın Hastaneler</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#FF5252" style={{ margin: 20 }} />
          ) : nearbyHospitals.length === 0 ? (
            <Text style={styles.emptyText}>Yakında hastane bulunamadı</Text>
          ) : (
            nearbyHospitals.slice(0, 5).map((hospital, index) => (
              <View key={index} style={styles.hospitalCard}>
                <View style={styles.hospitalInfo}>
                  <Text style={styles.hospitalName}>{hospital.name}</Text>
                  <Text style={styles.hospitalAddress}>{hospital.address}</Text>
                  <Text style={styles.hospitalDistance}>
                    <MaterialIcons name="location-on" size={14} color="#666" />
                    {' '}{hospital.distance.toFixed(1)} km uzaklıkta
                  </Text>
                </View>
                <View style={styles.hospitalActions}>
                  <TouchableOpacity
                    style={styles.hospitalButton}
                    onPress={() => callHospital(hospital.phone)}
                  >
                    <MaterialIcons name="phone" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.hospitalButton}
                    onPress={() => getDirectionsToHospital(hospital)}
                  >
                    <MaterialIcons name="directions" size={20} color="#2196F3" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Acil Durum Kişisi Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddContactModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="İsim"
              value={contactForm.name}
              onChangeText={(text) => setContactForm({ ...contactForm, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Telefon"
              value={contactForm.phone}
              onChangeText={(text) => setContactForm({ ...contactForm, phone: text })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Yakınlık (Örn: Eş, Anne, Kardeş)"
              value={contactForm.relationship}
              onChangeText={(text) => setContactForm({ ...contactForm, relationship: text })}
            />
            
            <TouchableOpacity style={styles.saveButton} onPress={addEmergencyContact}>
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Medical Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tıbbi Bilgiler</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Kan Grubu (Örn: A+)"
                value={infoForm.bloodType}
                onChangeText={(text) => setInfoForm({ ...infoForm, bloodType: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Alerjiler (virgülle ayırın)"
                value={infoForm.allergies}
                onChangeText={(text) => setInfoForm({ ...infoForm, allergies: text })}
                multiline
              />
              
              <TextInput
                style={styles.input}
                placeholder="Kullandığınız ilaçlar (virgülle ayırın)"
                value={infoForm.medications}
                onChangeText={(text) => setInfoForm({ ...infoForm, medications: text })}
                multiline
              />
              
              <TextInput
                style={styles.input}
                placeholder="Kronik hastalıklar (virgülle ayırın)"
                value={infoForm.conditions}
                onChangeText={(text) => setInfoForm({ ...infoForm, conditions: text })}
                multiline
              />
              
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Acil durum notları"
                value={infoForm.emergencyNotes}
                onChangeText={(text) => setInfoForm({ ...infoForm, emergencyNotes: text })}
                multiline
                numberOfLines={4}
              />
              
              <TouchableOpacity style={styles.saveButton} onPress={updateEmergencyInfo}>
                <Text style={styles.saveButtonText}>Güncelle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* First Aid Guide Modal */}
      <Modal
        visible={showGuideModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGuideModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedGuide?.title}</Text>
              <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedGuide?.steps.map((step: string, index: number) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
              
              <View style={styles.guideWarning}>
                <MaterialIcons name="warning" size={20} color="#FF9800" />
                <Text style={styles.warningText}>
                  Bu bilgiler genel ilk yardım rehberidir. Acil durumlarda mutlaka 112'yi arayın.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  content: {
    flex: 1,
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  sosSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  numberCard: {
    width: (width - 48) / 3,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  numberIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  numberName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  numberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5252',
  },
  emptyContact: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5252',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactRelation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  emptyInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  guidesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  guideCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  guideIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  hospitalCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  hospitalDistance: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  hospitalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hospitalButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
  input: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#FF5252',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepItem: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF5252',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  guideWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
  },
});