// src/screens/AuthLoadingScreen.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import axios from 'axios';

type AuthLoadingScreenProps = StackScreenProps<RootStackParamList, 'AuthLoading'>;
const SERVER_URL = 'https://www.prokoc2.com/api2.php';

export default function AuthLoadingScreen({ navigation }: AuthLoadingScreenProps) {
  useEffect(() => {
const checkLogin = async () => {
    try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
            const data = JSON.parse(userData);
            
            // Misafir kullanıcılar için
            if (data.userType === 'guest') {
                const subscriptionShown = await AsyncStorage.getItem(`subscription_shown_${data.userId}`);
                
                if (!subscriptionShown) {
                    navigation.replace('Subscription', { userId: data.userId, userName: data.userName });
                } else {
                    navigation.replace('MainTabs', { userId: data.userId, userName: data.userName });
                }
                return;
            }
            
            // Kayıtlı kullanıcılar için profil kontrolü yap
            try {
                const profileRes = await axios.get(`${SERVER_URL}?action=getProfile&user_id=${data.userId}`);
                
                let hasCompletedOnboarding = false;
                if (profileRes.data.success && profileRes.data.profile?.answers) {
                    const answers = profileRes.data.profile.answers;
                    // Zorunlu alanları kontrol et
                    if (answers.birthDate && answers.gender) {
                        hasCompletedOnboarding = true;
                    }
                }
                
                if (!hasCompletedOnboarding) {
                    navigation.replace('Onboarding', { userId: data.userId, userName: data.userName });
                } else {
                    const subscriptionShown = await AsyncStorage.getItem(`subscription_shown_${data.userId}`);
                    
                    if (!subscriptionShown) {
                        navigation.replace('Subscription', { userId: data.userId, userName: data.userName });
                    } else {
                        navigation.replace('MainTabs', { userId: data.userId, userName: data.userName });
                    }
                }
            } catch (error) {
                // Profil alınamadıysa direkt Home'a yönlendir
                navigation.replace('MainTabs', { userId: data.userId, userName: data.userName });
            }
        } else {
            navigation.replace('First');
        }
    } catch (error) {
        navigation.replace('First');
    }
};
    checkLogin();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#C8FF00" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});