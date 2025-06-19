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
import assistantSelectionScreen from './screens/assistantSelectionScreen';
import ChatScreen from './screens/ChatScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import NobetciEczanelerScreen from './screens/NobetciEczanelerScreen';
import CekimSonucuScreen from './screens/CekimSonucuScreen';
import TahlilScreen from './screens/TahlilScreen';
import PasswordResetScreen from './screens/PasswordResetScreen';
import EmergencySOSScreen from './screens/EmergencySOSScreen';

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
  assistantSelection: { userId: string };
  Chat: { userId: string; assistantName?: string };
  History: { userId: string };
  NobetciEczaneler: undefined;
  Profile: { userId: string };
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
        <Stack.Screen name="assistantSelection" component={assistantSelectionScreen} />
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