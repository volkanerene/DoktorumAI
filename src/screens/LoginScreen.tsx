import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { GoogleSignin, statusCodes, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import SHA256 from 'crypto-js/sha256';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

type LoginScreenProps = StackScreenProps<RootStackParamList, 'Login'>;

const SERVER_URL = 'https://www.prokoc2.com/api2.php';

interface GoogleSignInResponse {
  idToken: string;
  user: {
    email: string;
    name: string;
    // Additional properties if needed
  };
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { t, language } = useLanguage();

  // ======== Configure Google Signin once ========
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
      iosClientId:
        '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com', // Replace with your actual iOS client ID
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Email ve şifre gereklidir.');
      return;
    }
    try {
      const response = await axios.post(`${SERVER_URL}?action=login`, { email, password });
      if (response.data.success) {
        // Save login state to persist login across app restarts
        await AsyncStorage.setItem(
          'userData',
          JSON.stringify({ 
            userId: response.data.user_id, 
            userName: response.data.name, 
            userType: 'registered' 
          })
        );
        Alert.alert('Başarılı', 'Giriş yapıldı.');
        const onboardingCompleted = await AsyncStorage.getItem(`onboarding_completed_${response.data.user_id}`);
          if (!onboardingCompleted) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding', params: { userId: response.data.user_id, userName: response.data.name } }],
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', params: { userId: response.data.user_id, userName: response.data.name } }],
            });
          }

      } else {
        Alert.alert('Hata', response.data.error || 'Giriş başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    }
  };
const handleForgotPassword = () => navigation.navigate('PasswordReset');
  // ----- GUEST LOGIN -----
const handleGuestLogin = async () => {
  try {
    const guestId = 'guest_' + Date.now();
    const guestName = 'Misafir Kullanıcı';

    // mock a “success” payload instead of concatenating strings
    const payload = { success: true, user_id: guestId, name: guestName };

    if (payload.success) {
      await AsyncStorage.setItem(
        'userData',
        JSON.stringify({
          userId: payload.user_id,
          userName: payload.name,
          userType: 'guest',
        })
      );
      Alert.alert('Başarılı', 'Misafir olarak giriş yapıldı.');
      const onboardKey = `onboarding_completed_${payload.user_id}`;
      const onboardingCompleted = await AsyncStorage.getItem(onboardKey);
      const nextRoute = onboardingCompleted ? 'Home' : 'Onboarding';
      navigation.reset({
        index: 0,
        routes: [{ name: nextRoute, params: { userId: payload.user_id, userName: payload.name } }],
      });
    }
  } catch {
    Alert.alert('Hata', 'Misafir girişi başarısız.');
  }
};


  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      
      if (!isSuccessResponse(res)) return; // user cancelled
      
      let { idToken, user } = res.data;
      if (!idToken) idToken = (await GoogleSignin.getTokens()).idToken;
      
      if (!idToken) {
        Alert.alert('Hata', 'Google kimliği alınamadı.');
        return;
      }
      
      const payload = {
        provider: 'google',
        token: idToken,
        name: user.name || '',
        email: user.email || '',
      };
      
      console.log('Sending payload:', payload);
      const apiRes = await axios.post(`${SERVER_URL}?action=loginSocial`, payload);
      console.log('Response from loginSocial:', apiRes.data);
      
      if (apiRes.data.success) {
        // Save user data for persistent login
        await AsyncStorage.setItem(
          'userData',
          JSON.stringify({ userId: apiRes.data.user_id, userName: apiRes.data.name, userType: 'social' })
        );
        Alert.alert('Başarılı', `Hoş geldin, ${apiRes.data.name}`);
        navigation.reset({
          index: 0,
          routes: [
            { name: 'Home', params: { userId: apiRes.data.user_id, userName: apiRes.data.name, userType: 'social' } },
          ],
        });
      } else {
        Alert.alert('Hata', apiRes.data.error || 'Sunucu hatası');
      }
    } catch (err: any) {
      console.log('Error in Google login:', err);
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Google sign in cancelled by user.');
      } else {
        Alert.alert('Hata', 'Google login başarısız.');
      }
    }
  };

  // ----- APPLE LOGIN -----
  const handleAppleLogin = async () => {
    try {
        // rastgele nonce & state
        const rawNonce   = uuidv4();
        const state      = uuidv4();
        const hashedNonce = SHA256(rawNonce).toString(); // Apple SHA-256 ister

        const appleAuthRequestResponse = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
          nonce : hashedNonce,
          state : state,
        });

      // Get current authentication state
      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user
      );

      if (credentialState === appleAuth.State.AUTHORIZED) {
        const { identityToken, user, fullName, email } = appleAuthRequestResponse;
        
        if (!identityToken) {
          Alert.alert('Hata', 'Apple kimlik bilgisi alınamadı.');
          return;
        }

        // Prepare payload for backend
        const payload = {
          provider: 'apple',
          token: identityToken,
          user_id: user,
          nonce    : rawNonce,
          email: email || '',
          name: fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : '',
        };

        console.log('Sending Apple payload:', payload);
        const res = await axios.post(`${SERVER_URL}?action=loginSocial`, payload);
        console.log('Response from Apple loginSocial:', res.data);
        
        if (res.data.success) {
          // Save user data for persistent login
          await AsyncStorage.setItem(
            'userData',
            JSON.stringify({ userId: res.data.user_id, userName: res.data.name, userType: 'social' })
          );
          Alert.alert('Başarılı', `Hoş geldin, ${res.data.name}`);
          navigation.reset({
            index: 0,
            routes: [
              { name: 'Home', params: { userId: res.data.user_id, userName: res.data.name, userType: 'social' } },
            ],
          });
        } else {
          Alert.alert('Hata', res.data.error || 'Apple login başarısız');
        }
      } else {
        Alert.alert('Hata', 'Apple kimlik doğrulama başarısız.');
      }
    } catch (error: any) {
      console.log('Apple login error:', error);
      if (error.code === appleAuth.Error.CANCELED) {
        console.log('Apple sign in cancelled by user.');
      } else {
        Alert.alert('Hata', 'Apple login başarısız.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Back Button (top-left) */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Giriş Yap</Text>

        {/* Email Field */}
        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={20} color="#aaa" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password Field (with visibility toggle) */}
        <View style={styles.inputContainer}>
          <MaterialIcons name="lock" size={20} color="#aaa" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPass(!showPass)}
            style={styles.eyeIconContainer}
          >
            <MaterialIcons
              name={showPass ? 'visibility-off' : 'visibility'}
              size={20}
              color="#aaa"
            />
          </TouchableOpacity>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Giriş</Text>
        </TouchableOpacity>

        {/* Guest Login Button */}
        <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
          <MaterialIcons name="person-outline" size={20} color="#C8FF00" style={{ marginRight: 8 }} />
          <Text style={styles.guestButtonText}>Misafir Olarak Devam Et</Text>
        </TouchableOpacity>

        {/* Signup Link */}
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.signupText}>
            Hesabın Yok Mu? <Text style={{ fontWeight: '700' }}>Kayıt Ol</Text>
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Başka Türlü Giriş Yap</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons */}
        <View style={styles.socialButtons}>
          {/* Google */}
          <TouchableOpacity 
            style={[
              styles.googleButton,
              Platform.OS === 'ios' ? {} : { flex: 1 } // Android'de tam genişlik
            ]} 
            onPress={handleGoogleLogin}
          >
            <Text style={styles.socialButtonText}>GOOGLE</Text>
          </TouchableOpacity>
          
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.appleButton} onPress={handleAppleLogin}>
              <MaterialIcons name="apple" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.socialButtonText}>APPLE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: '#2a2a2a',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
    marginTop: 30,
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 25,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
  },
  eyeIconContainer: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#aaa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#333',
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#C8FF00',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 15,
  },
  guestButtonText: {
    color: '#C8FF00',
    fontSize: 16,
    fontWeight: '600',
  },
  signupText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 15,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#fff',
    marginHorizontal: 8,
    fontSize: 12,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  googleButton: {
    backgroundColor: '#DB4437',
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  appleButton: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});