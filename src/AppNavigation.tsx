// src/AppNavigation.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import AuthLoadingScreen from './screens/AuthLoadingScreen';
import FirstScreen from './screens/FirstScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import AssistantSelectionScreen from './screens/AssistantSelectionScreen';
import ChatScreen from './screens/ChatScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import NobetciEczanelerScreen from './screens/NobetciEczanelerScreen';
import CekimSonucuScreen from './screens/CekimSonucuScreen';
import TahlilScreen from './screens/TahlilScreen';
import PasswordResetScreen from './screens/PasswordResetScreen';
import EmergencySOSScreen from './screens/EmergencySOSScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';

export type RootStackParamList = {
  AuthLoading: undefined;
  First: undefined;
  EmergencySOS:{ userId: string };
  Login: undefined;
  Signup: undefined;
  PasswordReset: undefined;
  CekimSonucu: { userId: string };
  Tahlil: { userId: string };
  Home: { userId: string; userName: string };
  AssistantSelection: { userId: string };
  Chat: { userId: string; assistantName?: string };
  History: { userId: string };
  NobetciEczaneler: undefined;
  Profile: { userId: string };
  Onboarding: { userId: string; userName: string };
  Subscription: { userId: string; userName: string };
  HealthTracking: { userId: string; userName: string };
  MedicationReminder: { userId: string; userName: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AuthLoading">
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
        <Stack.Screen name="First" component={FirstScreen} />
        <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EmergencySOS" component={EmergencySOSScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AssistantSelection" component={AssistantSelectionScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="CekimSonucu" component={CekimSonucuScreen} />
        <Stack.Screen name="Tahlil" component={TahlilScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="NobetciEczaneler" component={NobetciEczanelerScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}