// App.tsx
import React, { useEffect } from 'react';
import AppNavigation from './src/AppNavigation';
import { LanguageProvider } from './src/context/LanguageContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import PushNotification from 'react-native-push-notification';
import 'react-native-gesture-handler';

export default function App() {
  useEffect(() => {
    // Configure push notifications
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },

      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },

      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },

      onRegistrationError: function(err) {
        console.error(err.message, err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    });

    // Create notification channel for Android
    PushNotification.createChannel(
      {
        channelId: "health-assistant-channel",
        channelName: "Health Assistant Notifications",
        channelDescription: "Notifications for health reminders and tips",
        playSound: true,
        soundName: "default",
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`createChannel returned '${created}'`)
    );
  }, []);

  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <AppNavigation />
      </SubscriptionProvider>
    </LanguageProvider>
  );
}