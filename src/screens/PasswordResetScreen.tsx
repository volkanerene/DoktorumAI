// src/screens/PasswordResetScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../context/LanguageContext';

const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { height: H } = Dimensions.get('window');

type PasswordResetScreenProps = StackScreenProps<RootStackParamList, 'PasswordReset'>;

export default function PasswordResetScreen({ navigation }: PasswordResetScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();

  /* ------------------ Animations ------------------ */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: -20, duration: 3000, useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 20, duration: 3500, useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ]),
    ).start();
  };

  /* ------------------ Handlers ------------------ */
  const handleReset = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('auth.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${SERVER_URL}?action=forgotPassword`, { email, language });
      if (res.data.success) {
        Alert.alert(t('common.success'), t('auth.resetMailSent'));
        navigation.goBack();
      } else {
        Alert.alert(t('common.error'), res.data.error || t('auth.resetError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('auth.serverError'));
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ UI ------------------ */
  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Floating Icons */}
            <Animated.View
              style={[styles.floatingIcon, styles.floatingIcon1, { opacity: fadeAnim, transform: [{ translateY: float1 }] }]}>
              <MaterialCommunityIcons name="heart-pulse" size={60} color="rgba(255,255,255,0.1)" />
            </Animated.View>
            <Animated.View
              style={[styles.floatingIcon, styles.floatingIcon2, { opacity: fadeAnim, transform: [{ translateY: float2 }] }]}>
              <MaterialCommunityIcons name="pill" size={50} color="rgba(255,255,255,0.1)" />
            </Animated.View>

            {/* Back Button */}
            <Animated.View style={[styles.backButton, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonInner}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            </Animated.View>

            {/* Header */}
            <Animated.View
              style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.logoContainer}>
                <LinearGradient colors={['#fff', '#f0f0f0']} style={styles.logo}>
                  <MaterialCommunityIcons name="medical-bag" size={50} color="#667eea" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>{t('auth.resetTitle')}</Text>
              <Text style={styles.subtitle}>{t('auth.resetSubtitle')}</Text>
            </Animated.View>

            {/* Form */}
            <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <MaterialIcons name="email" size={20} color="#667eea" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.email')}
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity style={styles.resetButton} onPress={handleReset} disabled={loading}>
                <LinearGradient colors={['#C8FF00', '#A8E000']} style={styles.resetGradient}>
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.resetButtonText}>{t('auth.send')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ------------------ Styles ------------------ */
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingBottom: 30 },

  floatingIcon: { position: 'absolute' },
  floatingIcon1: { top: H * 0.15, right: -20 },
  floatingIcon2: { top: H * 0.7, left: -20 },

  backButton: { marginTop: 20, alignSelf: 'flex-start' },
  backButtonInner: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerContainer: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  logoContainer: { marginBottom: 20 },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },

  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 30,
    padding: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },

  resetButton: {
    marginTop: 10,
    elevation: 5,
    shadowColor: '#C8FF00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  resetGradient: { paddingVertical: 16, borderRadius: 25, alignItems: 'center' },
  resetButtonText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
});