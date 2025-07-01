// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageResizer from 'react-native-image-resizer';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
const BG_COLOR = '#09408B';     
const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { width } = Dimensions.get('window');
type Gender = 'male' | 'female' | 'other';

const DEFAULT_AVATAR: Record<Gender, string> = {
  male:   'https://www.prokoc2.com/assets/avatars/male.png',
  female: 'https://www.prokoc2.com/assets/avatars/female.png',
  other:  'https://www.prokoc2.com/assets/avatars/male.png',
};
// Sağlık anketi soruları
const QUESTIONS = [
  /* ... aynı liste ... */
  "Günde kaç saat uyuyorsunuz?",
  "Günde ne kadar su içiyorsunuz?",
  "Haftada kaç saat egzersiz yapıyorsunuz?",
  "Günde kaç porsiyon sebze/meyve tüketiyorsunuz?",
  "Sigara içiyor musunuz?",
  "Alkol tüketiminiz nedir?",
  "Stres seviyenizi nasıl değerlendirirsiniz?",
  "Kan basıncınız normal mi?",
  "Kolesterol seviyeniz normal mi?",
  "Düzenli sağlık kontrollerine gidiyor musunuz?",
  "Kilonuz sağlıklı aralıkta mı?",
  "Günlük yeme alışkanlığınız düzenli mi?",
  "Haftada kaç kez fast-food tüketirsiniz?",
  "Rafine şeker tüketiminiz ne düzeyde?",
  "Düzenli olarak vitamin alıyor musunuz?",
  "Alerjileriniz veya kronik hastalıklarınız var mı?",
  "Çoğunlukla enerjik hissediyor musunuz?",
  "Günde kaç saat masa başında çalışıyorsunuz?",
  "Ruh sağlığınızla ilgili sorunlar yaşıyor musunuz?",
  "Cilt bakım rutini uyguluyor musunuz?",
];

type Props = StackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { t, language, setLanguage } = useLanguage();

  const [profilePhoto, setProfilePhoto] = useState('');
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(''));
  const [loading, setLoading] = useState(false);

  // basit fade animasyonu
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    fetchProfile();
  }, []);

  /* -------- API -------- */
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${SERVER_URL}?action=getProfile&user_id=${userId}`);
      if (res.data?.success) {
/* fetchProfile içinde ----------------------------------------- */
const genderRaw = res.data.profile?.gender ?? 'other';
const g: Gender = res.data.profile?.gender ?? 'other';
const url = res.data.profile?.profile_photo || DEFAULT_AVATAR[g];
setProfilePhoto(url);
        if (Array.isArray(res.data.profile?.answers)) setAnswers(res.data.profile.answers);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const payload = { user_id: userId, profile_photo: profilePhoto, answers };
      const res = await axios.post(`${SERVER_URL}?action=saveProfile`, payload);
      res.data?.success
        ? Alert.alert(t('common.success'), t('profile.saved'))
        : Alert.alert(t('common.error'), res.data.error || 'Error');
    } catch {
      Alert.alert(t('common.error'), t('profile.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo' });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.uri) return;

    try {
      const resized = await ImageResizer.createResizedImage(asset.uri, 800, 800, 'JPEG', 70);
      const formData = new FormData();
      formData.append('photo', {
        uri: resized.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      });
      formData.append('user_id', String(userId));
      setLoading(true);
      const res = await axios.post(`${SERVER_URL}?action=uploadProfilePhoto`, formData);
      if (res.data.success) {
        setProfilePhoto(res.data.url);
        Alert.alert(t('common.success'), t('profile.photoUploaded'));
      } else {
Alert.alert(t('common.error'), t('profile.photoUploadError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('profile.photoError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (lang: 'tr' | 'en') => {
    await setLanguage(lang);
    Alert.alert(t('common.success'), t('profile.languageChanged'));
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userData');
    navigation.reset({ index: 0, routes: [{ name: 'First' }] });
  };

  const handleDeleteAccount = async () => {
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const res = await axios.post(`${SERVER_URL}?action=deleteAccount`, { user_id: userId });
            if (res.data.success) {
              await AsyncStorage.removeItem('userData');
              Alert.alert(t('common.success'), t('profile.deleted'));
              navigation.reset({ index: 0, routes: [{ name: 'First' }] });
            } else Alert.alert(t('common.error'), res.data.error || 'Err');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  /* -------- Render Helpers -------- */
  const renderQuestion = (q: string, idx: number) => (
    <View key={idx} style={styles.qItem}>
      <Text style={styles.qText}>{q}</Text>
      <TextInput
        style={styles.qInput}
        placeholder={t('profile.answerPlaceholder')}
        placeholderTextColor="#888"
        value={answers[idx]}
        onChangeText={(txt) => {
          const arr = [...answers];
          arr[idx] = txt;
          setAnswers(arr);
        }}
      />
    </View>
  );



  /* -------------------- UI -------------------- */
  return (
<View style={[styles.container, { backgroundColor: BG_COLOR }]}>
    {loading && (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  )}
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.myProfile')}</Text>
          <View style={{ width: 32 }} />
        </View>

        <Animated.ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          {/* Card */}
          <View style={styles.card}>
            {/* Photo */}
            <TouchableOpacity onPress={handleChangePhoto} style={styles.photoWrapper}>
              <Image
                source={{
                  uri: profilePhoto || 'https://via.placeholder.com/200/eee/667eea?text=👤',
                }}
                style={styles.photo}
              />
              <View style={styles.cameraBadge}>
                <MaterialIcons name="photo-camera" size={18} color="#000" />
              </View>
            </TouchableOpacity>

            {/* Dil seçimi */}
            <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
            <View style={styles.langRow}>
              <TouchableOpacity
                style={[styles.langBtn, language === 'tr' && styles.langActive]}
                onPress={() => handleLanguageChange('tr')}
              >
                <Text style={[styles.langTxt, language === 'tr' && styles.langTxtActive]}>
                  {t('profile.turkish')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, language === 'en' && styles.langActive]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={[styles.langTxt, language === 'en' && styles.langTxtActive]}>
                  {t('profile.english')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sorular */}
            <Text style={styles.sectionTitle}>{t('profile.healthSurvey')}</Text>
            {QUESTIONS.map(renderQuestion)}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveTxt}>{t('common.save')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutTxt}>{t('profile.logout')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
              <MaterialIcons name="delete-forever" size={20} color="#FF3B30" />
              <Text style={styles.deleteTxt}>{t('profile.deleteAccount')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* -------------------- STYLES -------------------- */
const CARD_PADDING = 24;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, color: '#fff', fontWeight: 'bold' },

  /* Scroll */
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  /* Card */
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 30,
    padding: CARD_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  photoWrapper: { alignSelf: 'center', marginBottom: 20 },
  photo: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ddd' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C8FF00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },

  /* Language */
  langRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  langActive: { backgroundColor: '#C8FF00', borderColor: '#C8FF00' },
  langTxt: { fontSize: 15, color: '#333', fontWeight: '500' },
  langTxtActive: { color: '#000' },

  /* Q&A */
  qItem: { marginBottom: 16 },
  qText: { fontSize: 15, color: '#333', marginBottom: 4 },
  qInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 15,
    color: '#000',
  },

  /* Buttons */
  saveBtn: { backgroundColor: '#27ae60', borderRadius: 25, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },

  logoutBtn: { backgroundColor: '#E53935', borderRadius: 25, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  logoutTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 25,
    paddingVertical: 14,
    marginTop: 16,
  },
  deleteTxt: { color: '#FF3B30', fontSize: 16, fontWeight: '600', marginLeft: 6 },
  loadingOverlay: {
  ...StyleSheet.absoluteFillObject,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.35)',
  zIndex: 100,
},
});