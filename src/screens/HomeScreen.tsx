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
  FlatList,
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


const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { width, height } = Dimensions.get('window');

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
  const { t, language } = useLanguage();
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    fetchData();
    animateIn();
    
    // Rotate health tips
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % healthTips.length);
    }, 5000);
    
    return () => clearInterval(tipInterval);
  }, [userId]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, historyRes] = await Promise.all([
        axios.get(`${SERVER_URL}?action=getProfile&user_id=${userId}`),
        axios.get(`${SERVER_URL}?action=getHistory&user_id=${userId}`)
      ]);

      if (profileRes.data.success && profileRes.data.profile) {
        setProfilePhoto(profileRes.data.profile.profile_photo || '');
      }

      if (historyRes.data.success) {
        setHistoryData(historyRes.data.history);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const getHealthScore = () => {
    // Mock health score calculation
    const activities = historyData.length;
    const score = Math.min(100, 60 + (activities * 2));
    return score;
  };

  const lastUserMessages = useMemo(() => {
    const grouped: Record<string, HistoryItem[]> = {};

    historyData.forEach((item) => {
      if (!grouped[item.specialty]) {
        grouped[item.specialty] = [];
      }
      grouped[item.specialty].push(item);
    });

    const results: { specialty: string; lastMessage: HistoryItem }[] = [];
    for (const specialty in grouped) {
      const userMsgs = grouped[specialty].filter(m => m.role === 'user');
      if (userMsgs.length > 0) {
        userMsgs.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        results.push({ specialty, lastMessage: userMsgs[0] });
      }
    }

    results.sort((a, b) => {
      return (
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
      );
    });

    return results;
  }, [historyData]);

  const getMessagePreview = (raw: string): string => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.caption) return parsed.caption;
        if (parsed.text) return parsed.text;
        return '(Görsel)';
      }
    } catch {}
    return raw.length > 50 ? raw.substring(0, 50) + '...' : raw;
  };

const getAssistantInfo = (rawSpecialty: string | undefined) => {
  const specialty = (rawSpecialty ?? '').toLowerCase();   // ① boşsa '' yap
  const doc = assistantS.find(
    (d) => (d.name ?? '').toLowerCase() === specialty      // ② d.name yoksa ''
  );

  if (doc) return doc;

  // ③ fallback
  return {
    icon: 'help-outline',
    color: '#666',
    library: 'MaterialIcons' as const,
  };
};

  const renderIcon = (
    library: 'MaterialIcons' | 'MaterialCommunityIcons',
    iconName: string,
    size: number,
    color: string
  ) => {
    if (library === 'MaterialIcons') {
      return <MaterialIcons name={iconName} size={size} color={color} />;
    }
    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
  };

  const QuickActionCard = ({ 
    title, 
    subtitle, 
    icon, 
    color, 
    onPress, 
    delay = 0 
  }: any) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            {
              scale: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: color }]}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <View style={styles.quickActionIcon}>
            <MaterialIcons name={icon} size={28} color="#fff" />
          </View>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
          <MaterialIcons
            name="arrow-forward"
            size={20}
            color="rgba(255,255,255,0.8)"
            style={styles.quickActionArrow}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderDatePicker = () => (
    <Modal
      visible={showDatePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerContainer}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>Tarih Seçin</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {/* Date picker implementation here */}
          <TouchableOpacity
            style={styles.dateConfirmButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.dateConfirmText}>Tamam</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#0a0a0a']}
        style={styles.gradientBackground}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
        >
          {/* Header */}
          <Animated.View 
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View>
              <Text style={styles.greeting}>
                {getGreeting()}, {userName} 👋
              </Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="calendar-today" size={16} color="#999" />
                <Text style={styles.dateText}>
                  {selectedDate.toLocaleDateString('tr-TR', { 
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>
            </View>
            {!isPremium && (
              <TouchableOpacity 
                style={styles.upgradeBadge}
                onPress={() => navigation.navigate('Subscription', { userId, userName })}
              >
                <MaterialIcons name="workspace-premium" size={16} color="#FFD700" />
                <Text style={styles.upgradeBadgeText}>Ücretsiz Plan</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId })}>
              <Image
                style={styles.profileImage}
                source={{
                  uri: profilePhoto || 'https://via.placeholder.com/80/333/fff?text=Avatar',
                }}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Health Score Card */}
          <Animated.View
            style={[
              styles.healthScoreCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.healthScoreGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.healthScoreContent}>
                <View>
                  <Text style={styles.healthScoreTitle}>Sağlık Puanınız</Text>
                  <Text style={styles.healthScoreValue}>{getHealthScore()}</Text>
                  <Text style={styles.healthScoreSubtitle}>İyi durumdasınız</Text>
                </View>
                <View style={styles.healthScoreChart}>
                  {/* Mini chart or icon here */}
                  <MaterialCommunityIcons name="heart-pulse" size={64} color="rgba(255,255,255,0.3)" />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Health Tip */}
          <Animated.View
            style={[
              styles.tipCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <MaterialIcons 
              name={healthTips[currentTip].icon} 
              size={24} 
              color={healthTips[currentTip].color} 
            />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{healthTips[currentTip].title}</Text>
              <Text style={styles.tipDescription}>{healthTips[currentTip].description}</Text>
            </View>
          </Animated.View>

          {/* Section Title */}
          <Animated.Text 
            style={[
              styles.sectionTitle,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            Hızlı İşlemler
          </Animated.Text>
          <View style={styles.quickActionsContainer}>
  <TouchableOpacity
    style={styles.healthAssistantCard}
    onPress={() => navigation.navigate('Chat', { userId, assistantName: 'Aile Asistanı' })}
    activeOpacity={0.9}
  >
    <LinearGradient
      colors={['#6366F1', '#4F46E5']}
      style={styles.healthAssistantGradient}
    >
      <MaterialIcons name="family-restroom" size={48} color="#fff" />
      <Text style={styles.healthAssistantTitle}>
        {language === 'tr' ? 'Sağlık Asistanım' : 'My Health Assistant'}
      </Text>
      <Text style={styles.healthAssistantSubtitle}>
        {t('home.healthAssistantDesc')}
      </Text>
    </LinearGradient>
  </TouchableOpacity>
  {/* Diğer butonlar */}
  <View style={styles.quickActionsGrid}>
    <QuickActionCard
      title={t('home.selectSpecialist')}
      subtitle={t('home.selectSpecialistDesc')}
      icon="medical-services"
      color="#EC4899"
      onPress={() => navigation.navigate('assistantSelection', { userId })}
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
                <Text style={styles.sectionTitle}>Son Görüşmeler</Text>
                <TouchableOpacity onPress={() => navigation.navigate('History', { userId })}>
                  <Text style={styles.viewAllText}>Tümü →</Text>
                </TouchableOpacity>
              </View>

              {lastUserMessages.slice(0, 3).map(({ specialty, lastMessage }, index) => {
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
                    }}
                  >
                    <TouchableOpacity
                      style={styles.recentChatCard}
                      onPress={() => navigation.navigate('Chat', { userId, assistantName: specialty })}
                      activeOpacity={0.7}
                    >
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
                      <MaterialIcons name="chevron-right" size={24} color="#666" />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </>
          )}

          {/* Bottom Spacing */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </LinearGradient>

      {/* Date Picker Modal */}
      {renderDatePicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: '#999',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#333',
  },
  healthScoreCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  healthScoreGradient: {
    borderRadius: 20,
    padding: 20,
  },
  healthScoreContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthScoreTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  healthScoreValue: {
    fontSize: 48,
    color: '#fff',
    fontWeight: '700',
  },
  healthScoreSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  healthScoreChart: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: '#999',
  },
  sectionTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#666',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  quickActionCard: {
    width: (width - 44) / 2,
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  quickActionArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  recentChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  recentChatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentChatContent: {
    flex: 1,
    marginLeft: 12,
  },
  recentChatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  recentChatMessage: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  recentChatTime: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dateConfirmButton: {
    backgroundColor: '#007BFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dateConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeBadge: {
  position: 'absolute',
  top: 60,
  left: 20,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 215, 0, 0.2)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  gap: 4,
},
upgradeBadgeText: {
  color: '#FFD700',
  fontSize: 12,
  fontWeight: '600',
},
quickActionsContainer: {
  paddingHorizontal: 16,
  marginBottom: 8,
},
healthAssistantCard: {
  marginBottom: 16,
  borderRadius: 20,
  overflow: 'hidden',
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
healthAssistantGradient: {
  padding: 24,
  alignItems: 'center',
},
healthAssistantTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#fff',
  marginTop: 12,
  marginBottom: 8,
},
healthAssistantSubtitle: {
  fontSize: 16,
  color: 'rgba(255,255,255,0.9)',
  textAlign: 'center',
},
});