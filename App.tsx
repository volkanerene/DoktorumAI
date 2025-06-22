// App.tsx
import React, { useEffect } from 'react';
import AppNavigation from './src/AppNavigation';
import { LanguageProvider } from './src/context/LanguageContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function App() {
  useEffect(() => {
    // Google Sign-In global konfigürasyonu
    GoogleSignin.configure({
      webClientId: '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
      iosClientId: '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <AppNavigation />
      </SubscriptionProvider>
    </LanguageProvider>
  );
}