import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Import the shared assistantS data
import { assistantS } from '../data/assistantData';

type assistantSelectionProps = StackScreenProps<RootStackParamList, 'assistantSelection'>;

export default function assistantSelectionScreen({ route, navigation }: assistantSelectionProps) {
  const { userId } = route.params;

  const handleassistantSelect = (assistantName: string) => {
    navigation.navigate('Chat', { userId, assistantName });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doktorlar</Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {assistantS.map((assistant) => (
          <TouchableOpacity
            key={assistant.id}
            style={[styles.card, { backgroundColor: assistant.color }]}
            onPress={() => handleassistantSelect(assistant.name)}
          >
            {assistant.library === 'MaterialIcons' ? (
              <MaterialIcons
                name={assistant.icon}
                size={40}
                color="#fff"
                style={styles.cardIcon}
              />
            ) : (
              <MaterialCommunityIcons
                name={assistant.icon}
                size={40}
                color="#fff"
                style={styles.cardIcon}
              />
            )}
            <Text style={styles.cardText}>{assistant.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // black background
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
  grid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    height: 120,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  cardText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});
