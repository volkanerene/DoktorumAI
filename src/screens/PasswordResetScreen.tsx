// src/screens/PasswordResetScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import axios from 'axios';
const SERVER_URL = 'https://www.prokoc2.com/api2.php';

export default function PasswordResetScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const handleReset = async () => {
    if (!email) { Alert.alert('Hata', 'Email gerekli'); return; }
    try {
      const res = await axios.post(`${SERVER_URL}?action=forgotPassword`, { email });
      if (res.data.success) {
        Alert.alert('Başarılı', 'Sıfırlama bağlantısı e-postanıza gönderildi');
        navigation.goBack();
      } else {
        Alert.alert('Hata', res.data.error || 'İşlem başarısız');
      }
    } catch { Alert.alert('Hata', 'Sunucuya ulaşılamadı'); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şifre Sıfırla</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
      <TouchableOpacity style={styles.btn} onPress={handleReset}>
        <Text style={styles.btnTxt}>Gönder</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({ /* basit stiller */ });