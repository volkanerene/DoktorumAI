// src/screens/AuthLoadingScreen.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';

type AuthLoadingScreenProps = StackScreenProps<RootStackParamList, 'AuthLoading'>;

export default function AuthLoadingScreen({ navigation }: AuthLoadingScreenProps) {
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const data = JSON.parse(userData);
          
          // Check if onboarding is completed
          const onboardingCompleted = await AsyncStorage.getItem(`onboarding_completed_${data.userId}`);
          
          if (!onboardingCompleted) {
            // User is logged in but hasn't completed onboarding
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding', params: { userId: data.userId, userName: data.userName } }],
            });
          } else {
            // Check if subscription screen was shown
            const subscriptionShown = await AsyncStorage.getItem(`subscription_shown_${data.userId}`);
            
            if (!subscriptionShown) {
              // Show subscription screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Subscription', params: { userId: data.userId, userName: data.userName } }],
              });
            } else {
              // Go to home
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home', params: { userId: data.userId, userName: data.userName } }],
              });
            }
          }
        } else {
          // Navigate to the first screen if not logged in
          navigation.replace('First');
        }
      } catch (error) {
        // In case of any error, navigate to First screen
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