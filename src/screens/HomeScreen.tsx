// src/screens/HomeScreen.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Animated,
  StatusBar,
  Modal,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { assistantS } from '../data/assistantData';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import NotificationService from '../services/NotificationService';

const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { width, height } = Dimensions.get('window');

const QuickActionCard = React.memo(
  ({ title, subtitle, icon, color, onPress, wide = false }: any) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.quickActionCard, wide && styles.wideCard, { backgroundColor: color }]}
        onPress={onPress}
      >
        <View style={styles.quickActionIcon}>
          <MaterialIcons name={icon} size={28} color="#fff" />
        </View>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
        <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" style={styles.quickActionArrow} />
      </TouchableOpacity>
    );
  },
);
type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;

interface HistoryItem {
  specialty: string;
  role: string;
  message: string;
  created_at: string;
}

interface HealthTip {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const healthTips: HealthTip[] = [
  {
    id: '1',
    title: 'Günde 8 bardak su için',
    description: 'Vücudunuzun hidrate kalması için yeterli su tüketin',
    icon: 'local-drink',
    color: '#42A5F5',
  },
  {
    id: '2',
    title: 'Düzenli egzersiz yapın',
    description: 'Haftada en az 150 dakika orta yoğunlukta aktivite',
    icon: 'fitness-center',
    color: '#66BB6A',
  },
  {
    id: '3',
    title: 'Kaliteli uyku',
    description: 'Günde 7-9 saat uyumaya özen gösterin',
    icon: 'bedtime',
    color: '#AB47BC',
  },
];

export default function HomeScreen({ route, navigation }: HomeScreenProps) {
  const { userId, userName } = route.params;
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
const [currentTip, setCurrentTip] = useState(0);
const carouselRef = useRef<ScrollView>(null);  const { t, language } = useLanguage();
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const { isPremium } = useSubscription();
  useEffect(() => {
    const id = setInterval(() => {
      const next = (currentTip + 1) % healthTips.length;
      carouselRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrentTip(next);
    }, 5000);
    return () => clearInterval(id);
  }, [currentTip]);

  
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    fetchData();
    animateIn();
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % healthTips.length);
    }, 5000);
    requestNotificationPermission();
    return () => clearInterval(tipInterval);
  }, [userId]);

  const requestNotificationPermission = async () => {
    NotificationService.scheduleDailyHealthTips(userId);
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, historyRes] = await Promise.all([
        axios.get(`${SERVER_URL}?action=getProfile&user_id=${userId}`),
        axios.get(`${SERVER_URL}?action=getHistory&user_id=${userId}`),
      ]);
      if (profileRes.data.success && profileRes.data.profile) {
        setProfilePhoto(profileRes.data.profile.profile_photo || '');
      }
      if (historyRes.data.success) {
        setHistoryData(historyRes.data.history);
      }
    } catch {
      /* istatistiksel hatalar loglanabilir */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning');
    if (hour < 18) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  const getHealthScore = () => {
    const score = Math.min(100, 60 + historyData.length * 2);
    return score;
  };

  const lastUserMessages = useMemo(() => {
    const grouped: Record<string, HistoryItem[]> = {};
    historyData.forEach((item) => {
      if (!grouped[item.specialty]) grouped[item.specialty] = [];
      grouped[item.specialty].push(item);
    });
    const results: { specialty: string; lastMessage: HistoryItem }[] = [];
    for (const specialty in grouped) {
      const userMsgs = grouped[specialty].filter((m) => m.role === 'user');
      if (userMsgs.length) {
        userMsgs.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        results.push({ specialty, lastMessage: userMsgs[0] });
      }
    }
    results.sort(
      (a, b) =>
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime(),
    );
    return results;
  }, [historyData]);

  const getMessagePreview = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.caption) return parsed.caption;
      if (parsed?.text) return parsed.text;
      return '(Görsel)';
    } catch {
      return raw.length > 50 ? raw.slice(0, 50) + '…' : raw;
    }
  };

  const getAssistantInfo = (spec?: string) => {
    const sp = (spec ?? '').toLowerCase();
    const doc = assistantS.find((d) => (d.name ?? '').toLowerCase() === sp);
    return (
      doc ?? {
        icon: 'help-outline',
        color: '#667eea',
        library: 'MaterialIcons' as const,
      }
    );
  };

  const renderIcon = (
    library: 'MaterialIcons' | 'MaterialCommunityIcons',
    iconName: string,
    size: number,
    color: string,
  ) =>
    library === 'MaterialIcons' ? (
      <MaterialIcons name={iconName} size={size} color={color} />
    ) : (
      <MaterialCommunityIcons name={iconName} size={size} color={color} />
    );



  /* -------------------------  UI  -------------------------- */
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6B75D6','#46B168']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}>
        {loading && (
          <ActivityIndicator
            style={{ position: 'absolute', top: height / 2 - 20, alignSelf: 'center', zIndex: 10 }}
            size="large"
            color="#fff"
          />
        )}

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
<Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
  {/* SOL BLOK */}
  <View style={{ flex: 1 }}>
    <Text style={styles.greeting}>
      {getGreeting()}, {userName} 👋
    </Text>

    {/* TARİH + ROZET satırı */}
    <View style={styles.dateRow}>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
        <MaterialIcons name="calendar-today" size={16} color="#fff" />
        <Text style={styles.dateText}>
          {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </TouchableOpacity>

      {!isPremium && (
        <TouchableOpacity
          style={styles.upgradeBadge}
          onPress={() => navigation.navigate('Subscription', { userId, userName })}
        >
          <MaterialIcons name="workspace-premium" size={14} color="#FFD700" />
          <Text style={styles.upgradeBadgeText}>{t('home.freePlan')}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>

  {/* PROFİL FOTO – sabit sağ üst */}
  <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId })}>
    <Image
      source={{ uri: profilePhoto || 'https://via.placeholder.com/80/eee/667eea?text=👤' }}
      style={styles.profileImage}
    />
  </TouchableOpacity>
</Animated.View>

{/* ----- Tip Carousel ----- */}
<View style={styles.tipWrapper}>
  <ScrollView
    horizontal
    pagingEnabled
    ref={carouselRef}
    showsHorizontalScrollIndicator={false}
    onMomentumScrollEnd={(e) =>
      setCurrentTip(Math.round(e.nativeEvent.contentOffset.x / width))
    }
  >
    {healthTips.map((tip) => (
      <View key={tip.id} style={styles.tipCard}>
        <MaterialIcons name={tip.icon} size={24} color={tip.color} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>{tip.title}</Text>
          <Text style={styles.tipDescription}>{tip.description}</Text>
        </View>
      </View>
    ))}
  </ScrollView>
</View>

          {/* Quick Actions */}
          <Animated.Text style={[styles.sectionTitle, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {t('home.quickActions')}
          </Animated.Text>

          <View style={styles.quickActionsContainer}>
<QuickActionCard
  wide
  title={t('home.healthAssistant')}
  subtitle={t('home.healthAssistantDesc')}
  icon="family-restroom"
  color="#4F46E5"
  onPress={() => navigation.navigate('Chat', { userId, assistantName: 'Aile Asistanı' })}
/>

            {/* Grid Buttons */}
            <View style={styles.quickActionsGrid}>
              <QuickActionCard
                title={t('home.selectSpecialist')}
                subtitle={t('home.selectSpecialistDesc')}
                icon="medical-services"
                color="#EC4899"
                onPress={() => navigation.navigate('AssistantSelection', { userId })}
                delay={200}
              />
              <QuickActionCard
                title={t('home.labAnalysis')}
                subtitle={t('home.labAnalysisDesc')}
                icon="biotech"
                color="#10B981"
                onPress={() => navigation.navigate('Tahlil', { userId })}
                delay={300}
              />
              <QuickActionCard
                title={t('home.imageAnalysis')}
                subtitle={t('home.imageAnalysisDesc')}
                icon="image-search"
                color="#F59E0B"
                onPress={() => navigation.navigate('CekimSonucu', { userId })}
                delay={400}
              />
              <QuickActionCard
                title={t('home.nearbyPharmacy')}
                subtitle={t('home.nearbyPharmacyDesc')}
                icon="local-pharmacy"
                color="#EF4444"
                onPress={() => navigation.navigate('NobetciEczaneler')}
                delay={500}
              />
            </View>
          </View>

          {/* Recent Chats */}
          {lastUserMessages.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('home.recentChats')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('History', { userId })}>
                  <Text style={styles.viewAllText}>{t('home.all')} →</Text>
                </TouchableOpacity>
              </View>

              {lastUserMessages.slice(0, 3).map(({ specialty, lastMessage }) => {
                const { icon, color, library } = getAssistantInfo(specialty);
                return (
                  <Animated.View
                    key={specialty}
                    style={{
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateX: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 0],
                          }),
                        },
                      ],
                    }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.recentChatCard}
                      onPress={() => navigation.navigate('Chat', { userId, assistantName: specialty })}>
                      <View style={[styles.recentChatIcon, { backgroundColor: color }]}>
                        {renderIcon(library, icon, 24, '#fff')}
                      </View>
                      <View style={styles.recentChatContent}>
                        <Text style={styles.recentChatTitle}>{specialty}</Text>
                        <Text style={styles.recentChatMessage} numberOfLines={1}>
                          {getMessagePreview(lastMessage.message)}
                        </Text>
                        <Text style={styles.recentChatTime}>
                          {new Date(lastMessage.created_at).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color="#667eea" />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Date Picker modal burada (renderDatePicker fonksiyonuyla) */}
        {showDatePicker && (
          <Modal transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>{t('home.chooseDate')}</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <MaterialIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                {/* Buraya istediğiniz datepicker bileşenini ekleyin */}
                <TouchableOpacity style={styles.dateConfirmButton} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.dateConfirmText}>{t('common.ok')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </LinearGradient>
    </View>
  );
}

/* --------------------------- Styles --------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBackground: { flex: 1 },

  /* Header */
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  greeting: { fontSize: 28, color: '#fff', fontWeight: '700', marginBottom: 4 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 14, color: '#fff' },
  profileImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff' },



  /* Health Score */
  healthScoreCard: { marginHorizontal: 20, marginBottom: 20 },
  healthScoreGradient: { borderRadius: 20, padding: 20 },
  healthScoreContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  healthScoreTitle: { fontSize: 16, color: '#000', marginBottom: 4 },
  healthScoreValue: { fontSize: 48, color: '#000', fontWeight: '700' },
  healthScoreSubtitle: { fontSize: 14, color: '#333', marginTop: 4 },

  /* Daily tip */
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  tipDescription: { fontSize: 14, color: '#555' },

  /* Section titles */
  sectionTitle: { fontSize: 22, color: '#fff', fontWeight: '600', marginHorizontal: 20, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 24, marginBottom: 16 },
  viewAllText: { fontSize: 14, color: '#fff' },
/* -- EKLE veya GÜNCELLE -- */
dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

upgradeBadge: {      /* position ABSOLUTE satırını sil */
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255,215,0,0.25)',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 14,
  gap: 4,
},
upgradeBadgeText: { fontSize: 12, color: '#FFD700', fontWeight: '600' },

/* Sağlık Asistanım geniş kart */
wideCard: { width: width - 56 },   /* 56 = 2*padding + gap  */


  /* Quick Actions */
  quickActionsContainer: { paddingHorizontal: 16, marginBottom: 8 },

  healthAssistantTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 12, marginBottom: 8 },
  healthAssistantSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, gap: 12 },

  quickActionCard: { width: (width - 56) / 2, borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickActionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  quickActionSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  quickActionArrow: { position: 'absolute', top: 16, right: 16 },

  /* Recent Chats */
  recentChatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 16 },
  recentChatIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  recentChatContent: { flex: 1, marginLeft: 12 },
  recentChatTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  recentChatMessage: { fontSize: 14, color: '#555', marginBottom: 2 },
  recentChatTime: { fontSize: 12, color: '#777' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  datePickerContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  datePickerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  dateConfirmButton: { backgroundColor: '#667eea', marginHorizontal: 16, marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  dateConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  tipWrapper: { height: 70 },            // yeni
tipCard: {
  width,                                // her sayfa tam ekran
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingHorizontal: 20,
  backgroundColor: 'rgrgba(255, 255, 255, 0.42)',
  borderRadius: 16,
},
});