import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../context/LanguageContext';
import { assistantS, getAssistantName } from '../data/assistantData';

const BG_COLOR = '#09408B';
const SERVER_URL = 'https://www.prokoc2.com/api2.php';

type HistoryProps = StackScreenProps<RootStackParamList, 'History'>;

interface ChatItem {
  id: number;
  specialty: string;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}

export default function HistoryScreen({ route, navigation }: HistoryProps) {
  const userId = route.params?.userId;
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<ChatItem[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}?action=getHistory&user_id=${userId}`);
      if (response.data.success) {
        setHistory(response.data.history);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const groupedSpecialties = useMemo(() => {
    const grouped: Record<string, ChatItem[]> = {};
    history.forEach((item) => {
      if (!grouped[item.specialty]) {
        grouped[item.specialty] = [];
      }
      grouped[item.specialty].push(item);
    });
    return grouped;
  }, [history]);

  const specialtyCards = useMemo(() => {
    return Object.keys(groupedSpecialties).map((specialty) => {
      const messages = groupedSpecialties[specialty];
      messages.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastMsg = messages[0];
      return {
        specialty,
        lastMessage: lastMsg?.message || '',
        totalCount: messages.length,
        lastDate: lastMsg?.created_at,
      };
    });
  }, [groupedSpecialties]);

  const handlePressSpecialty = (specialty: string) => {
    navigation.navigate('Chat', {
      userId,
      assistantName: specialty,
    });
  };

  const getAssistantInfo = (specialty: string) => {
    const assistant = assistantS.find(a => 
      a.name === specialty || getAssistantName(a.nameKey, t) === specialty
    );
    return assistant || {
      icon: 'help-outline',
      color: '#667eea',
      library: 'MaterialIcons' as const,
    };
  };

  const renderSpecialtyCard = ({ item }: { item: typeof specialtyCards[0] }) => {
    const assistant = getAssistantInfo(item.specialty);
    
    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => handlePressSpecialty(item.specialty)}
      >
        <View style={[styles.iconContainer, { backgroundColor: assistant.color }]}>
          {assistant.library === 'MaterialIcons' ? (
            <MaterialIcons name={assistant.icon} size={24} color="#fff" />
          ) : (
            <MaterialCommunityIcons name={assistant.icon} size={24} color="#fff" />
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.specialtyTitle}>{item.specialty}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          <Text style={styles.metaText}>
            {item.totalCount} {t('common.messages')} • {new Date(item.lastDate).toLocaleDateString()}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#999" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('common.history')}</Text>
        </View>

        {specialtyCards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={64} color="#fff" />
            <Text style={styles.emptyText}>{t('home.noRecentChats')}</Text>
            <Text style={styles.emptySubtext}>{t('home.startChatting')}</Text>
          </View>
        ) : (
          <FlatList
            data={specialtyCards}
            renderItem={renderSpecialtyCard}
            keyExtractor={(item) => item.specialty}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#fff"
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  specialtyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
});