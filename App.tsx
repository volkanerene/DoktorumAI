// App.tsx
import React, { useEffect } from 'react';
import AppNavigation from './src/AppNavigation';
import { LanguageProvider } from './src/context/LanguageContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import 'react-native-gesture-handler';
import { Platform } from 'react-native';

export default function App() {
 [];

  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <AppNavigation />
      </SubscriptionProvider>
    </LanguageProvider>
  );
}