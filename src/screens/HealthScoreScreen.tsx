import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert
} from 'react-native';

const QUESTIONS = [
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
  "Cilt bakım rutini uyguluyor musunuz?"
];

export default function HealthScoreScreen() {
  const [answers, setAnswers] = useState<number[]>(Array(20).fill(3));

  const setAnswer = (index: number, value: number) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const calculateScore = () => {
    const total = answers.reduce((sum, val) => sum + val, 0);
    Alert.alert("Sağlık Skoru", `Toplam puanınız: ${total}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Sağlık Skoru Anketi</Text>
        {QUESTIONS.map((q, idx) => (
          <View key={idx} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {idx + 1}. {q}
            </Text>
            <View style={styles.answersRow}>
              {[1,2,3,4,5].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.answerBtn,
                    answers[idx] === num && styles.answerBtnSelected
                  ]}
                  onPress={() => setAnswer(idx, num)}
                >
                  <Text style={[
                    styles.answerText,
                    answers[idx] === num && styles.answerTextSelected
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.submitBtn} onPress={calculateScore}>
          <Text style={styles.submitBtnText}>Skoru Hesapla</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scrollContainer: { padding: 16, alignItems: 'flex-start' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, alignSelf: 'center' },
  questionContainer: { marginBottom: 15 },
  questionText: { fontSize: 16, marginBottom: 5, color: '#333' },
  answersRow: { flexDirection: 'row' },
  answerBtn: { marginRight: 10, padding: 10, backgroundColor: '#eee', borderRadius: 6 },
  answerBtnSelected: { backgroundColor: '#007bff' },
  answerText: { color: '#333', fontSize: 16 },
  answerTextSelected: { color: '#fff' },
  submitBtn: {
    backgroundColor: '#28a745', borderRadius: 8,
    padding: 15, alignSelf: 'center', marginTop: 20
  },
  submitBtnText: { color: '#fff', fontSize: 16 }
});
