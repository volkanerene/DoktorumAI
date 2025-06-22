// src/AppNavigation.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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
import MedicationReminderScreen from './screens/MedicationReminderScreen';
import { TouchableOpacity } from 'react-native';

export type RootStackParamList = {
  AuthLoading: undefined;
  First: undefined;
  EmergencySOS: { userId: string };
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
  MedicationReminder: { userId: string; userName: string };
  MedicationDetail: { medication: any };
  MainTabs: { userId: string; userName: string };
};
const iconMap: Record<string, string> = {
  Home:               'home',
  Profile:            'person',
  Chat:               'chat',
  NobetciEczaneler:   'local-pharmacy',
  MedicationReminder: 'medication',         // veya 'medical-services'
};
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator Component
function BottomTabNavigator({ route }: any) {
  const { userId, userName } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
        const icon = iconMap[route.name] || 'help-outline';
         return <MaterialIcons name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
        paddingBottom: 22,   // biraz yukarı taşı
        paddingTop:     6,
        height:         74,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 5,
        },
      })}
    >
  <Tab.Screen
    name="Home"
    component={HomeScreen as React.ComponentType<any>}
    initialParams={{ userId, userName }}
    options={{ tabBarLabel: 'Ana Sayfa' }}
  />
  <Tab.Screen
    name="Profile"
    component={ProfileScreen as React.ComponentType<any>}
    initialParams={{ userId }}
    options={{ tabBarLabel: 'Profil' }}
  />
  <Tab.Screen
    name="Chat"
    component={ChatScreen as React.ComponentType<any>}
    initialParams={{ userId, assistantName: 'Aile Asistanı' }}
    options={{
      tabBarLabel: 'Asistan',
      tabBarButton: (props) => (
        <TouchableOpacity
          {...props}
          style={{
            top: -12,                      // bar’ın üzerine taşı
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: '#007AFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcons name="chat" size={32} color="#fff" />
        </TouchableOpacity>
      ),
    }}
  />
  <Tab.Screen
    name="NobetciEczaneler"
    component={NobetciEczanelerScreen as React.ComponentType<any>}
    options={{ tabBarLabel: 'Eczane' }}
  />

  <Tab.Screen
    name="MedicationReminder"
    component={MedicationReminderScreen as React.ComponentType<any>}
    initialParams={{ userId, userName }}
    options={{ tabBarLabel: 'İlaçlar' }}
  />
    </Tab.Navigator>
  );
}

export default function AppNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AuthLoading">
        {/* Auth Screens */}
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
        <Stack.Screen name="First" component={FirstScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
        
        {/* Main App with Bottom Tabs */}
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        
        {/* Other Screens */}
        <Stack.Screen name="EmergencySOS" component={EmergencySOSScreen} />
        <Stack.Screen name="AssistantSelection" component={AssistantSelectionScreen} />
        <Stack.Screen name="CekimSonucu" component={CekimSonucuScreen} />
        <Stack.Screen name="Tahlil" component={TahlilScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        

      </Stack.Navigator>
    </NavigationContainer>
  );
}