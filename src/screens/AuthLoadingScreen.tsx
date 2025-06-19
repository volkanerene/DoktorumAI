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
          // Reset navigation to Home screen if user is logged in
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home', params: { userId: data.userId, userName: data.userName } }],
          });
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
  }, []);

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
  },
});