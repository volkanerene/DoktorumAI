import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-gesture-handler';

import AppNavigation from './src/AppNavigation';
import { LanguageProvider } from './src/context/LanguageContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import RNBootSplash from 'react-native-bootsplash';          //  🔑

export default function App() {
  /* -------- 3rd-party SDK’ler ---------- */
  useEffect(() => {
    GoogleSignin.configure({
      webClientId : '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
      iosClientId : '100126624381-4bu382pfb9p58o67b29adubjesa3ib62.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    // BootSplash’i gizle
    RNBootSplash.hide({ fade: true });   // fade süresi varsayılan 250 ms
  }, []);

  /* -------- React tree ---------- */
  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <AppNavigation />
      </SubscriptionProvider>
    </LanguageProvider>
  );
}