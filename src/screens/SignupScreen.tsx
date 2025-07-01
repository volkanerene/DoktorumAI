import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Modal,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import SHA256 from 'crypto-js/sha256';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
const BG_COLOR = '#09408B';     

type SignupScreenProps = StackScreenProps<RootStackParamList, 'Signup'>;

const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { width: W, height: H } = Dimensions.get('window');
const Logo = require('../assets/logo-icon.png');

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    GoogleSignin.configure({
      webClientId:
        '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
      iosClientId:
        '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
    });

    startAnimations();
  }, []);

  const startAnimations = () => {
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, {
          toValue: -20,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(float1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, {
          toValue: 20,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(float2, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  /* ------------------------------------------------------------------ */
  /* -------------------------   API HANDLERS  ------------------------ */
  /* ------------------------------------------------------------------ */



const handleGuestLogin = async () => {
  setLoading(true);
  try {
    const res = await axios.post(`${SERVER_URL}?action=guestLogin`, {
      language,
    });

    if (!res.data.success) {
      Alert.alert(t('common.error'), res.data.error || t('auth.guestError'));
      return;
    }

    await AsyncStorage.setItem(
      'userData',
      JSON.stringify({
        userId:   String(res.data.user_id),
        userName: res.data.name,
        userType: 'guest',
      }),
    );

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs',
        params: { userId: String(res.data.user_id), userName: res.data.name } }],
    });
  } catch (e: any) {
    Alert.alert(t('common.error'), e.message || t('auth.guestError'));
  } finally {
    setLoading(false);
  }
};

  const handleGoogleSignup = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();

      if (!isSuccessResponse(res)) return;

      let { idToken, user } = res.data;
      if (!idToken) idToken = (await GoogleSignin.getTokens()).idToken;

      if (!idToken) {
        Alert.alert(t('common.error'), 'Google ID token error');
        return;
      }

      const payload = {
        provider: 'google',
        token: idToken,
        name: user.name || '',
        email: user.email || '',
        language,
      };

      const apiRes = await axios.post(`${SERVER_URL}?action=loginSocial`, payload);

      if (apiRes.data.success) {
        await AsyncStorage.setItem(
          'userData',
          JSON.stringify({
            userId: apiRes.data.user_id,
            userName: apiRes.data.name,
            userType: 'social',
          }),
        );
        Alert.alert(t('common.success'), `${t('common.welcome')}, ${apiRes.data.name}`);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { userId: apiRes.data.user_id, userName: apiRes.data.name } }],
        });
      } else {
        Alert.alert(t('common.error'), apiRes.data.error || t('auth.signupError'));
      }
    } catch (err: any) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED)
        Alert.alert(t('common.error'), t('auth.signupError'));
    }
  };
const handleSignup = async () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // --- form kontrolleri
  if (!name.trim())          { Alert.alert(t('common.error'), t('auth.nameRequired'));  return; }
  if (!emailRegex.test(email)){ Alert.alert(t('common.error'), t('auth.invalidEmail')); return; }
  if (password.length < 6)   { Alert.alert(t('common.error'), t('auth.passwordTooShort')); return; }
  if (!termsAccepted)        { Alert.alert(t('common.error'), t('auth.acceptTerms'));  return; }

  try {
    setLoading(true);

    const res = await axios.post(`${SERVER_URL}?action=signup`, {
      name,
      email,
      password,
      language,
    });

    if (!res.data.success) {
      Alert.alert(t('common.error'), res.data.error || t('auth.signupError'));
      return;
    }

    // ➜ kullanıcıyı kaydet
    await AsyncStorage.setItem(
      'userData',
      JSON.stringify({
        userId:   String(res.data.user_id),
        userName: name,
        userType: 'registered',
      }),
    );

    Alert.alert(t('common.success'), t('auth.signupSuccess'));

    navigation.reset({
      index: 0,
      routes: [{
        name: 'Onboarding',
        params: { userId: String(res.data.user_id), userName: name },
      }],
    });
  } catch (err: any) {
    Alert.alert(t('common.error'),
      err.response?.data?.error || err.message || t('auth.signupError')
    );
  } finally {
    setLoading(false);
  }
};
const handleAppleSignup = async () => {
  try {
    const rawNonce   = uuidv4();
    const state      = uuidv4();
    const hashedNonce = SHA256(rawNonce).toString();
    const isNameGeneric = (n: string) => !n || /^apple\s+user$/i.test(n.trim());

    /* 1. Apple oturumu aç */
    const appleRes = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes:    [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      nonce: hashedNonce,
      state,
    });

    /* 2. Yetkilendirme durumu kontrolü */
    const credState = await appleAuth.getCredentialStateForUser(appleRes.user);
    if (credState !== appleAuth.State.AUTHORIZED) {
      Alert.alert(t('common.error'), 'Apple auth error');
      return;
    }

    const { identityToken, user, fullName, email } = appleRes;
    if (!identityToken) {
      Alert.alert(t('common.error'), 'Apple ID error');
      return;
    }

    /* 3. Backend’e gönder */
    const payload = {
      provider: 'apple',
      token: identityToken,
      user_id: user,
      nonce: rawNonce,
      email: email ?? '',
      name:  fullName ? `${fullName.givenName ?? ''} ${fullName.familyName ?? ''}`.trim() : '',
      language,
    };

    const res = await axios.post(`${SERVER_URL}?action=loginSocial`, payload);
    if (!res.data.success) {
      Alert.alert(t('common.error'), res.data.error || t('auth.signupError'));
      return;
    }

    /* 4. Kullanıcı verisini sakla */
    await AsyncStorage.setItem(
      'userData',
      JSON.stringify({
        userId:   res.data.user_id,
        userName: res.data.name,
        userType: 'social',
      }),
    );

    /* 5. Profil & onboarding kontrolleri */
    const profileRes = await axios.get(
      `${SERVER_URL}?action=getProfile&user_id=${res.data.user_id}`,
    );

    const answers = profileRes.data?.profile?.answers ?? {};
    const hasCompletedOnboarding = !!(answers.birthDate && answers.gender);
    const needsNameFix          = isNameGeneric(res.data.name);

    if (!hasCompletedOnboarding || needsNameFix) {
      navigation.reset({
        index: 0,
        routes: [{
          name: 'Onboarding',
          params: {
            userId:        String(res.data.user_id),
            userName:      res.data.name,
            allowNameEdit: true,
          },
        }],
      });
      return;
    }

    /* 6. Abonelik ekranı gösterildi mi? */
    const shown = await AsyncStorage.getItem(
      `subscription_shown_${res.data.user_id}`,
    );
    navigation.reset({
      index: 0,
      routes: [{
        name: shown ? 'MainTabs' : 'Subscription',
        params: { userId: String(res.data.user_id), userName: res.data.name },
      }],
    });
  } catch (error: any) {
    if (error.code !== appleAuth.Error.CANCELED) {
      Alert.alert(t('common.error'), t('auth.signupError'));
    }
  }
};
  return (

    <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Floating Icons */}
            <Animated.View
              style={[
                styles.floatingIcon,
                styles.floatingIcon1,
                { opacity: fadeAnim, transform: [{ translateY: float1 }] },
              ]}>
              <MaterialCommunityIcons name="heart-pulse" size={60} color="rgba(255,255,255,0.1)" />
            </Animated.View>

            <Animated.View
              style={[
                styles.floatingIcon,
                styles.floatingIcon2,
                { opacity: fadeAnim, transform: [{ translateY: float2 }] },
              ]}>
              <MaterialCommunityIcons name="pill" size={50} color="rgba(255,255,255,0.1)" />
            </Animated.View>

            {/* Back Button */}
            <Animated.View
              style={[styles.backButton, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonInner}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            </Animated.View>

            {/* Header */}
            <Animated.View
              style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.logoContainer}>
                <LinearGradient colors={['#fff', '#f0f0f0']} style={styles.logo}>
              <Image source={Logo} style={styles.logoImage} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>{t('auth.signupTitle')}</Text>
              <Text style={styles.subtitle}>{t('auth.createAccount')}</Text>
            </Animated.View>

            {/* Form */}
            <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              {/* Name */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <MaterialIcons name="person" size={20} color="#667eea" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.name')}
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Email */}
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

              {/* Password */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <MaterialIcons name="lock" size={20} color="#667eea" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.password')}
                  placeholderTextColor="#999"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeIcon}>
                  <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Terms & Conditions */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setTermsAccepted(prev => !prev)}>
                <Animated.View style={[styles.checkbox, termsAccepted && styles.checkboxChecked, { transform: [{ scale: pulseAnim }] }]}>
                  {termsAccepted && <MaterialIcons name="check" size={18} color="#fff" />}
                </Animated.View>
                <Text style={styles.termsText}>
                  {t('auth.agreeTerms')}{' '}
                  <Text style={styles.linkText} onPress={() => setShowTermsModal(true)}>
                    {t('auth.readTerms')}
                  </Text>
                </Text>
              </TouchableOpacity>

  <TouchableOpacity
    style={styles.guestButton2}
    activeOpacity={0.85}
    onPress={handleSignup}
  >
    <Text style={styles.guestButtonText2}>{t('auth.signup')}</Text>
    <MaterialIcons name="arrow-forward-ios" size={20} color="#667eea" />
  </TouchableOpacity>

              {/* Guest */}
              <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
                <MaterialIcons name="person-outline" size={20} color="#fff" />
                <Text style={styles.guestButtonText}>{t('auth.guestLogin')}</Text>
              </TouchableOpacity>

              {/* Social Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orSignupWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons */}
              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={handleGoogleSignup}>
                  <MaterialCommunityIcons name="google" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.appleButton]}
                    onPress={handleAppleSignup}>
                    <MaterialIcons name="apple" size={20} color="#000" />
                    <Text style={[styles.socialButtonText, { color: '#000' }]}>Apple</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Login Link */}
              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
                <Text style={styles.loginText}>
                  {t('auth.haveAccount')}{' '}
                  <Text style={styles.loginTextBold}>{t('auth.login')}</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Terms Modal */}
      <Modal visible={showTermsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {/* Buraya gerçek KVKK / Terms metninizi gömebilirsiniz */}
              <Text style={styles.modalTitle}>{t('auth.termsTitle')}</Text>
              <Text style={styles.modalParagraph}>
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Magni, corporis...
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowTermsModal(false)}>
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


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
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 5 },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  termsText: { flex: 1, color: '#666', fontSize: 14 },
  linkText: { color: '#667eea', textDecorationLine: 'underline' },

  signupButton: { marginBottom: 15, elevation: 5, shadowColor: '#C8FF00', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 5 },
  signupGradient: { paddingVertical: 16, borderRadius: 25, alignItems: 'center' },
  signupButtonText: { fontSize: 18, fontWeight: 'bold', color: '#000' },

  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102,126,234,0.1)',
    borderWidth: 2,
    borderColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 20,
    gap: 8,
  },
  guestButtonText: { color: '#667eea', fontSize: 16, fontWeight: '600' },

  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { color: '#999', marginHorizontal: 10, fontSize: 12 },

  socialButtons: { flexDirection: 'row', justifyContent: 'center', gap: 15 },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 20, gap: 8 },
  googleButton: { backgroundColor: '#DB4437' },
  appleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  loginLink: { alignItems: 'center', marginTop: 10 },
  loginText: { color: '#666', fontSize: 15 },
  loginTextBold: { fontWeight: 'bold', color: '#667eea' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', margin: 20 },
  modalParagraph: { fontSize: 14, color: '#555', marginHorizontal: 20, marginBottom: 20 },
  modalClose: { padding: 15, alignItems: 'center', borderTopWidth: 1, borderColor: '#eee' },
  modalCloseText: { color: '#667eea', fontSize: 16, fontWeight: '600' },
  logoImage: { width: 70, height: 70, resizeMode: 'contain' },
      guestButton2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 2,
    borderColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 20,
    gap: 8,
  },
  guestButtonText2: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },

});