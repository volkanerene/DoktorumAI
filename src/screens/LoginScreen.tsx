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
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GoogleSignin, isSuccessResponse, statusCodes} from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import SHA256 from 'crypto-js/sha256';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
import { navigateAfterAuth } from '../utils/authNavigation';

type LoginScreenProps = StackScreenProps<RootStackParamList, 'Login'>;
const BG_COLOR = '#09408B';     

const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const { width: W, height: H } = Dimensions.get('window');
const Logo = require('../assets/logo-icon.png');

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;
  const float4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    GoogleSignin.configure({
      webClientId: '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
      iosClientId: '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
        offlineAccess: true,                       // sunucu doğrulaması yapıyoruz
        scopes: ['profile', 'email'],  
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

    // Floating animations
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
      ])
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
      ])
    ).start();
  };

// 🔄 TEK sürüm kalsın
const handleLogin = async () => {
  // 1) Form doğrulama
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email.trim()) {
    Alert.alert(t('common.error'), t('auth.emailRequired'));
    return;
  }
  if (!emailRegex.test(email)) {
Alert.alert(t('common.error'), t('auth.invalidEmail'));
    return;
  }
  if (!password || password.length < 6) {
Alert.alert(t('common.error'), t('auth.passwordTooShort'));
    return;
  }

   setLoading(true);
    try {
        const response = await axios.post(`${SERVER_URL}?action=login`, { 
            email, 
            password, 
            language 
        });
        
        if (response.data.success) {
            await AsyncStorage.setItem(
                'userData',
                JSON.stringify({ 
                    userId: String(response.data.user_id), 
                    userName: response.data.name, 
                    userType: 'registered' 
                })
            );
            
            Alert.alert(t('common.success'), t('auth.loginSuccess'));
            
            // Backend'den gelen onboarding durumunu kontrol et
            if (!response.data.has_completed_onboarding) {
                navigation.reset({
                    index: 0,
                    routes: [{ 
                        name: 'Onboarding', 
                        params: { 
                            userId: String(response.data.user_id), 
                            userName: response.data.name 
                        } 
                    }],
                });
            } else {
                // Subscription kontrolü için önce subscription shown kontrolü yap
                const subscriptionShown = await AsyncStorage.getItem(`subscription_shown_${response.data.user_id}`);
                
                if (!subscriptionShown) {
                    navigation.reset({
                        index: 0,
                        routes: [{ 
                            name: 'Subscription', 
                            params: { 
                                userId: String(response.data.user_id), 
                                userName: response.data.name 
                            } 
                        }],
                    });
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{ 
                            name: 'MainTabs', 
                            params: { 
                                userId: String(response.data.user_id), 
                                userName: response.data.name 
                            } 
                        }],
                    });
                }
            }
        } else {
            Alert.alert(t('common.error'), response.data.error || t('auth.loginError'));
        }
  } catch (error: any) {
    console.error('Login error:', error);

    if (error.code === 'ECONNABORTED') {
Alert.alert(t('common.error'), t('errors.timeout'));
    } else if (error.response) {
      Alert.alert(
        t('common.error'),
        error.response.data?.error || `Server error: ${error.response.status}`
      );
    } else if (error.request) {
Alert.alert(t('common.error'), t('auth.networkError'));

    } else {
      Alert.alert(t('common.error'), error.message || t('auth.serverError'));
    }
  } finally {
    setLoading(false);
  }
};

  const handleForgotPassword = () => navigation.navigate('PasswordReset');

const handleGuestLogin = async () => {
  setLoading(true);
  try {
    const res = await axios.post(`${SERVER_URL}?action=guestLogin`, {
      language,
    });

    if (res.data.success) {
      const { user_id, name } = res.data;
      await AsyncStorage.setItem(
        'userData',
        JSON.stringify({ userId: String(user_id), userName: name, userType: 'guest' }),
      );

      Alert.alert(t('common.success'), t('auth.guestSuccess'));

      await navigateAfterAuth(navigation, String(user_id), name);   // 👈
    } else {
      Alert.alert(t('common.error'), res.data.error || t('auth.guestError'));
    }
  } catch (e) {
    Alert.alert(t('common.error'), t('auth.guestError'));
  } finally {
    setLoading(false);
  }
};

const handleGoogleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices();

    // ① Oturum aç
    const res = await GoogleSignin.signIn();

    // ② Başarılı oturum kontrolü –> tip narrowing
    if (!isSuccessResponse(res)) {
      // Kullanıcı iptal ettiyse sessizce çık
      return;
    }

    // ③ Gerekli alanlar artık res.data içinde
    const { idToken, serverAuthCode, user } = res.data;

    // refresh-token almayı tercih ediyorsanız serverAuthCode kullanın
    const tokenToSend = idToken ?? serverAuthCode;
    if (!tokenToSend) {
      Alert.alert(t('common.error'), 'Google token alınamadı');
      return;
    }

    // ④ Sunucuya gönderilecek payload
    const payload = {
      provider: 'google',
      token: tokenToSend,
      name: user.name ?? '',
      email: user.email ?? '',
      language,
    };

       const apiRes = await axios.post(`${SERVER_URL}?action=loginSocial`, payload);
        
        if (apiRes.data.success) {
            await AsyncStorage.setItem(
                'userData',
                JSON.stringify({ 
                    userId: String(apiRes.data.user_id), 
                    userName: apiRes.data.name, 
                    userType: 'social' 
                })
            );
            
            // Profil kontrolü yap
            const profileRes = await axios.get(`${SERVER_URL}?action=getProfile&user_id=${apiRes.data.user_id}`);
            
            let hasCompletedOnboarding = false;
            if (profileRes.data.success && profileRes.data.profile?.answers) {
                const answers = profileRes.data.profile.answers;
                // Zorunlu alanları kontrol et
                if (answers.birthDate && answers.gender) {
                    hasCompletedOnboarding = true;
                }
            }
            
            Alert.alert(t('common.success'), `${t('common.welcome')}, ${apiRes.data.name}`);
            
            if (!hasCompletedOnboarding) {
                navigation.reset({
                    index: 0,
                    routes: [{ 
                        name: 'Onboarding', 
                        params: { 
                            userId: String(apiRes.data.user_id), 
                            userName: apiRes.data.name 
                        } 
                    }],
                });
            } else {
                const subscriptionShown = await AsyncStorage.getItem(`subscription_shown_${apiRes.data.user_id}`);
                
                if (!subscriptionShown) {
                    navigation.reset({
                        index: 0,
                        routes: [{ 
                            name: 'Subscription', 
                            params: { 
                                userId: String(apiRes.data.user_id), 
                                userName: apiRes.data.name 
                            } 
                        }],
                    });
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [{ 
                            name: 'MainTabs', 
                            params: { 
                                userId: String(apiRes.data.user_id), 
                                userName: apiRes.data.name 
                            } 
                        }],
                    });
                }
            }
        }
    } catch (err: any) {
    // Hata kodlarını kendi isteğinize göre ayrıştırın
    if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
      Alert.alert(t('common.error'), err.message || t('auth.loginError'));
    }
  }
};

  const handleAppleLogin = async () => {
    try {
      const rawNonce = uuidv4();
      const state = uuidv4();
      const hashedNonce = SHA256(rawNonce).toString();

      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        nonce: hashedNonce,
        state: state,
      });

      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user
      );

      if (credentialState === appleAuth.State.AUTHORIZED) {
        const { identityToken, user, fullName, email } = appleAuthRequestResponse;
        
        if (!identityToken) {
          Alert.alert(t('common.error'), 'Apple ID error');
          return;
        }

        const payload = {
          provider: 'apple',
          token: identityToken,
          user_id: user,
          nonce: rawNonce,
          email: email || '',
          name: fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : '',
          language,
        };

        const res = await axios.post(`${SERVER_URL}?action=loginSocial`, payload);
        
        if (res.data.success) {
          await AsyncStorage.setItem(
            'userData',
            JSON.stringify({ userId: res.data.user_id, userName: res.data.name, userType: 'social' })
          );
          Alert.alert(t('common.success'), `${t('common.welcome')}, ${res.data.name}`);
          navigation.reset({
            index: 0,
            routes: [
              { name: 'MainTabs', params: { userId: res.data.user_id, userName: res.data.name } },
            ],
          });
        } else {
          Alert.alert(t('common.error'), res.data.error || t('auth.loginError'));
        }
      } else {
        Alert.alert(t('common.error'), 'Apple auth error');
      }
    } catch (error: any) {
  if (error.code !== appleAuth.Error.CANCELED) {
    console.warn('Apple login error', error);
    Alert.alert(t('common.error'), error.message || t('auth.loginError'));
  }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: BG_COLOR }]}>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
        {/* Floating Background Icons */}
        <Animated.View
        pointerEvents="none"
          style={[
            styles.floatingIcon,
            styles.floatingIcon1,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float1 }],
            },
          ]}
        >
          <MaterialIcons name="favorite" size={40} color="rgba(255,255,255,0.1)" />
        </Animated.View>

        <Animated.View
        pointerEvents="none"
          style={[
            
            styles.floatingIcon,
            styles.floatingIcon2,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float2 }],
            },
          ]}
        >
          <MaterialCommunityIcons name="pill" size={50} color="rgba(255,255,255,0.1)" />
        </Animated.View>

        <Animated.View
        pointerEvents="none"
          style={[
            styles.floatingIcon,
            styles.floatingIcon3,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float3 }],
            },
          ]}
        >
          <MaterialCommunityIcons name="dna" size={60} color="rgba(255,255,255,0.1)" />
        </Animated.View>

        <Animated.View
        pointerEvents="none"
          style={[
            styles.floatingIcon,
            styles.floatingIcon4,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float4 }],
            },
          ]}
        >
          <MaterialCommunityIcons name="stethoscope" size={45} color="rgba(255,255,255,0.1)" />
        </Animated.View>

            {/* Back Button */}
            <Animated.View
              style={[
                styles.backButton,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonInner}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            </Animated.View>

            {/* Logo & Title */}
            <Animated.View
              style={[
                styles.headerContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#fff', '#f0f0f0']}
                  style={styles.logo}
                >
              <Image source={Logo} style={styles.logoImage} />
                </LinearGradient>
              </View>
              
              <Text style={styles.title}>{t('auth.loginTitle')}</Text>
              <Text style={styles.subtitle}>{t('common.welcome')} to Sağlık Asistanım AI</Text>
            </Animated.View>

            {/* Form Container */}
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Email Input */}
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

              {/* Password Input */}
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
                <TouchableOpacity
                  onPress={() => setShowPass(!showPass)}
                  style={styles.eyeIcon}
                >
                  <MaterialIcons
                    name={showPass ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
              {/* Guest Login */}

  <TouchableOpacity
    style={styles.guestButton2}
    activeOpacity={0.85}
      onPress={handleLogin}
  >
    <Text style={styles.guestButtonText2}>{t('first.start')}</Text>
    <MaterialIcons name="arrow-forward-ios" size={20} color="#667eea" />
  </TouchableOpacity>
              {/* Guest Login */}
              <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
                <MaterialIcons name="person-outline" size={20} color="#667eea" />
                <Text style={styles.guestButtonText}>{t('auth.guestLogin')}</Text>
              </TouchableOpacity>

              {/* Signup Link */}
              <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.signupLink}>
                <Text style={styles.signupText}>
                  {t('auth.noAccount')} <Text style={styles.signupTextBold}>{t('auth.signup')}</Text>
                </Text>
              </TouchableOpacity>

              {/* Social Login Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orLoginWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons */}
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={handleGoogleLogin}
                >
                  <MaterialCommunityIcons name="google" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
                
                {Platform.OS === 'ios' && (
                  <TouchableOpacity 
                    style={[styles.socialButton, styles.appleButton]}
                    onPress={handleAppleLogin}
                  >
                    <MaterialIcons name="apple" size={20} color="#000" />
                    <Text style={[styles.socialButtonText, { color: '#000' }]}>Apple</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  floatingIcon: {
    position: 'absolute',
  },
  floatingIcon1: {
    top: H * 0.1,
    left: W * 0.1,
  },
  floatingIcon2: {
    top: H * 0.2,
    right: W * 0.1,
  },
  floatingIcon3: {
    top: H * 0.7,
    left: W * 0.15,
  },
  floatingIcon4: {
    top: H * 0.8,
    right: W * 0.2,
  },
  backButton: {
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  backButtonInner: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#667eea',
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#C8FF00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  guestButton: {
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
  guestButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
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
  signupLink: {
    alignItems: 'center',
    marginBottom: 20,
  },


/* ——— Start butonu guestButton ile AYNI ——— */
startChip: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#C8FF00',   // ✅ sadece renk farkı
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 30,             // ↔️ aynı köşe
  gap: 8,
},

startChipText: {
  color: '#000',
  fontSize: 14,
  fontWeight: '600',
},
  signupText: {
    color: '#666',
    fontSize: 15,
  },
  signupTextBold: {
    fontWeight: 'bold',
    color: '#667eea',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    color: '#999',
    marginHorizontal: 10,
    fontSize: 12,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  appleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  socialButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  logoImage: { width: 70, height: 70, resizeMode: 'contain' },

startFab: {
  width: 56,          // ⟵ 72 → 56
  height: 56,         // ⟵ 72 → 56
  borderRadius: 28,   // ⟵ 36 → 28
  marginBottom: 16,   // bir tık yukarı çıksın
  elevation: 6,
  shadowColor: '#C8FF00',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},
startFabGradient: {
  flex: 1,
  borderRadius: 28,   // aynı yarıçap
  alignItems: 'center',
  justifyContent: 'center',
},
  loginLink: {
    paddingVertical: 10,
  },
  loginLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
    buttonContainer: {
    alignItems: 'center',
    width: '100%',
  },
});