import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { GoogleSignin, statusCodes, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { appleAuth, AppleButton } from '@invertase/react-native-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';

type SignupScreenProps = StackScreenProps<RootStackParamList, 'Signup'>;

const SERVER_URL = 'https://www.prokoc2.com/api2.php';

interface GoogleSignInResponse {
  idToken: string;
  user: {
    email: string;
    name: string;
    // Diğer gerekli alanlar eklenebilir
  };
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
        iosClientId: '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com', // Replace with your actual iOS client ID
      });
  }, []);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Email ve şifre gereklidir.');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Hata', 'Kayıt olabilmek için şartları kabul etmelisiniz.');
      return;
    }
    try {
      const response = await axios.post(`${SERVER_URL}?action=signup`, {
        name,
        email,
        password,
      });
      if (response.data.success) {
        Alert.alert('Başarılı', 'Kayıt oldunuz, şimdi giriş yapabilirsiniz.');
        navigation.goBack();
      } else {
        Alert.alert('Hata', response.data.error || 'Kayıt başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    }
  };

  // ----- GUEST LOGIN -----
  const handleGuestLogin = async () => {
    try {
      const guestId = 'guest_' + Date.now();
      const guestName = 'Misafir Kullanıcı';
      
      // Save guest data to AsyncStorage
      await AsyncStorage.setItem(
        'userData',
        JSON.stringify({ userId: guestId, userName: guestName, userType: 'guest' })
      );
      
      Alert.alert('Başarılı', 'Misafir olarak giriş yapıldı.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home', params: { userId: guestId, userName: guestName, userType: 'guest' } }],
      });
    } catch (error) {
      Alert.alert('Hata', 'Misafir girişi başarısız.');
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
  
      if (!isSuccessResponse(res)) return;      // user cancelled
  
      let { idToken, user } = res.data;
      if (!idToken) idToken = (await GoogleSignin.getTokens()).idToken;
  
      if (!idToken) {
        Alert.alert('Hata', 'Google kimliği alınamadı.');
        return;
      }
      const payload = {
        provider: 'google',
        token: idToken,
        name: user.name ?? '',
        email: user.email ?? '',
      };
      const apiRes = await axios.post(`${SERVER_URL}?action=loginSocial`, payload);
      if (apiRes.data.success) {
        // Save user data for persistent login
        await AsyncStorage.setItem(
          'userData',
          JSON.stringify({ userId: apiRes.data.user_id, userName: apiRes.data.name, userType: 'social' })
        );
        if (res.data.success) {
          await AsyncStorage.setItem(
            'userData',
            JSON.stringify({ userId: res.data.user_id, userName: res.data.name, userType: 'social' })
          );
          
          Alert.alert('Başarılı', `Hoş geldin, ${res.data.name}`);
          
          // Direkt Onboarding'e yönlendir
          navigation.reset({
            index: 0,
            routes: [
              { name: 'Onboarding', params: { userId: res.data.user_id, userName: res.data.name } },
            ],
          });
        }
      } else {
        Alert.alert('Hata', apiRes.data.error || 'Sunucu hatası');
      }
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Google Kayıt Hatası', `${error.code ?? ''}\n${error.message ?? ''}`);
      }
    }
  };

  // ----- APPLE SIGNUP -----
  const handleAppleSignup = async () => {
    try {
      // Perform the Apple authentication request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
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
          Alert.alert('Hata', res.data.error || 'Apple kayıt başarısız');
        }
      } else {
        Alert.alert('Hata', 'Apple kimlik doğrulama başarısız.');
      }
    } catch (error: any) {
      console.log('Apple signup error:', error);
      if (error.code === appleAuth.Error.CANCELED) {
        console.log('Apple sign in cancelled by user.');
      } else {
        Alert.alert('Hata', 'Apple kayıt başarısız.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Geri Dön Butonu */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Hesabını Oluştur</Text>

        {/* İsim Alanı */}
        <View style={styles.inputContainer}>
          <MaterialIcons name="person-outline" size={20} color="#aaa" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="İsim Soyisim"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email Alanı */}
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

        {/* Şifre Alanı */}
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
          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeIconContainer}>
            <MaterialIcons
              name={showPass ? 'visibility-off' : 'visibility'}
              size={20}
              color="#aaa"
            />
          </TouchableOpacity>
        </View>
        
        {/* "Okudum, anladım ve kabul ediyorum" Bölümü */}
        <View style={styles.termsContainer}>
          <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
            <MaterialIcons
              name={termsAccepted ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.termsText}>
            Okudum, anladım ve{' '}
            <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>
              Hizmet Şartlarını
            </Text>{' '}
            kabul ediyorum.
          </Text>
        </View>
        
        <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
          <Text style={styles.signupButtonText}>Kayıt Ol</Text>
        </TouchableOpacity>

        {/* Guest Login Button */}
        <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
          <MaterialIcons name="person-outline" size={20} color="#C8FF00" style={{ marginRight: 8 }} />
          <Text style={styles.guestButtonText}>Misafir Olarak Devam Et</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginText}>
            Hesabın Var Mı? <Text style={{ fontWeight: '700' }}>Giriş Yap</Text>
          </Text>
        </TouchableOpacity>

        {/* Sosyal Giriş Bölümü */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Başka Türlü Giriş Yap</Text>
          <View style={styles.dividerLine} />
        </View>
        
        <View style={styles.socialButtons}>
          <TouchableOpacity 
            style={[
              styles.googleButton,
              Platform.OS === 'ios' ? {} : { flex: 1 } // Android'de tam genişlik
            ]} 
            onPress={handleGoogleSignup}
          >
            <Text style={styles.socialButtonText}>GOOGLE</Text>
          </TouchableOpacity>
          
          {/* Apple Sign In */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.appleButton} onPress={handleAppleSignup}>
              <MaterialIcons name="apple" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.socialButtonText}>APPLE</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* Hizmet Şartları Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>DoktorumAI Hizmet Şartları</Text>
            <Text style={styles.modalText}>
              {`Güncellendi: Mart 2025

Hoş geldiniz ve DoktorumAI'ye gösterdiğiniz ilgi için teşekkür ederiz. DoktorumAI, DoktorumAI A.Ş. tarafından işletilen bir hizmettir. "Biz", "bize" ve "bizim" terimleri, DoktorumAI A.Ş.'yi ifade eder.

1. Giriş
Bu Hizmet Şartları ("Şartlar" veya "Sözleşme"), https://www.DoktorumAI.com adresindeki web sitemiz, mobil uygulamalarımız ve diğer dijital hizmetlerimiz (topluca "Hizmet") için uygulanacak kuralları belirler. Bu Sözleşme, sizin ("Kullanıcı" veya "Siz") ile DoktorumAI arasında yasal bağlayıcılığı olan bir sözleşmedir. Lütfen dikkatlice okuyunuz. Hizmetimizi kullanarak, bu Şartları okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.

2. Onay
Hizmetimizi kullanarak, bu Şartlar ve Gizlilik Politikamız kapsamında bilgilerinizin toplanması ve kullanılması hususunda onay vermiş olursunuz.

3. Doktor ile İletişim
DoktorumAI, sağlık profesyonelleriyle iletişim kurmanıza yardımcı bir hizmettir. Sağlık bilgileri ve öneriler, mutlaka doktorunuzla tartışılmalıdır.

4. Bilginin Doğruluğu
DoktorumAI tarafından sağlanan bilgiler zaman zaman hatalı olabilir. Verilen bilgilerin doğruluğu garanti edilmez; her zaman gerçek doktorunuzla teyit edilmelidir.

5. Tıbbi Tavsiye Değildir
DoktorumAI, tıbbi tavsiye vermemekte, teşhis veya tedavi sağlamamaktadır. Hizmetimiz yalnızca doktorunuzla iletişim kurmanıza yardımcı olmak içindir.

6. Acil Durumlar
DoktorumAI, acil tıbbi durumlar için kullanılmamalıdır. Acil bir durumda lütfen yerel acil servislerle iletişime geçiniz.

7. Kullanım Sınırlamaları
Hizmetimiz belirli kullanım kısıtlamalarına tabidir ve yasalarla uyumlu olarak kullanılmalıdır. Hizmetin uygunsuz kullanımı durumunda hesabınız askıya alınabilir veya iptal edilebilir.

8. Veri ve Bilgi
Hizmetimizi kullanırken sağladığınız veriler, DoktorumAI Gizlilik Politikası kapsamında işlenecektir.

9. Yasal Sorumluluk
DoktorumAI, sağlanan bilgilerin doğruluğu ve güvenilirliği konusunda garanti vermez; dolaylı zararlar dahil hiçbir sorumluluk kabul etmez.

10. Değişiklikler
DoktorumAI, bu Şartları herhangi bir zamanda değiştirme hakkını saklı tutar. Yapılan değişiklikler sonrasında hizmeti kullanmaya devam etmeniz, yeni şartları kabul ettiğiniz anlamına gelir.

Lütfen bu şartları dikkatlice okuyunuz. Hizmetimizi kullanmadan önce lütfen tam olarak onaylayınız.`}
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalButton} onPress={() => setShowTermsModal(false)}>
            <Text style={styles.modalButtonText}>Kabul Et</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 20,
    backgroundColor: '#000',
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
    marginBottom: 20,
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
    paddingVertical: 12,
  },
  eyeIconContainer: {
    padding: 4,
  },
  signupButton: {
    backgroundColor: '#333',
    paddingVertical: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginText: {
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
  justifyContent: Platform.OS === 'ios' ? 'space-between' : 'center',
  gap: Platform.OS === 'ios' ? 10 : 0,
},

// googleButton style'ını güncelle:
googleButton: {
  backgroundColor: '#DB4437',
  borderRadius: 8,
  paddingVertical: 12,
  flex: Platform.OS === 'ios' ? 1 : 0,
  minWidth: Platform.OS === 'ios' ? 0 : '80%',
  alignItems: 'center',
  marginRight: Platform.OS === 'ios' ? 10 : 0,
},
  socialButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
  termsText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: '#C8FF00',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  modalContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C8FF00',
    marginBottom: 10,
  },
  modalText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#C8FF00',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});