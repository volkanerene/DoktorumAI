import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type HistoryProps = StackScreenProps<RootStackParamList, 'History'>;

interface ChatItem {
  specialty: string;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
}

const SERVER_URL = 'https://www.prokoc2.com/api2.php';

export default function HistoryScreen({ route, navigation }: HistoryProps) {
  const { userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ChatItem[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}?action=getHistory&user_id=${userId}`);
      if (response.data.success) {
        setHistory(response.data.history);
      } else {
        alert(response.data.error || 'Geçmiş alınamadı.');
      }
    } catch (err) {
      alert('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Group messages by specialty
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

  // Convert the grouped object into an array for easier rendering
  const specialtyCards = useMemo(() => {
    return Object.keys(groupedSpecialties).map((specialty) => {
      // We can find the last message by created_at or just display the count, etc.
      const messages = groupedSpecialties[specialty];
      // Sort descending to find the last message
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

  // On press, navigate to Chat for that specialty
  const handlePressSpecialty = (specialty: string) => {
    navigation.navigate('Chat', {
      userId,
      assistantName: specialty,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 30 }}>
          Yükleniyor...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tüm Geçmiş</Text>
      </View>

      {specialtyCards.length === 0 ? (
        <View style={{ marginTop: 30, alignItems: 'center' }}>
          <Text style={{ color: '#fff' }}>Geçmiş bulunamadı.</Text>
        </View>
      ) : (
        specialtyCards.map((card) => (
          <TouchableOpacity
            key={card.specialty}
            style={styles.historyCard}
            onPress={() => handlePressSpecialty(card.specialty)}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="history" size={24} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.specialtyTitle}>{card.specialty}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                Son Mesaj: {card.lastMessage}
              </Text>
              <Text style={styles.dateText}>Mesaj Sayısı: {card.totalCount}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#aaa" />
          </TouchableOpacity>
        ))
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    fontSize: 24,
    color: '#fff',
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    padding: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  specialtyTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  lastMessage: {
    color: '#ccc',
    marginTop: 3,
  },
  dateText: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
});
function alert(arg0: any) {
  throw new Error('Function not implemented.');
}

