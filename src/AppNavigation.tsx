 import Animated, {
   useSharedValue,
   useAnimatedStyle,
   withSpring,
   interpolate,

 } from 'react-native-reanimated';

 // Orb için klasik Animated:
 import {
   Platform,
   StyleSheet,
   TouchableOpacity,
   View,
   Animated as RNAnimated,   // <-- alias verdik
 } from 'react-native';

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from '@react-native-community/blur';
import { useLanguage } from './context/LanguageContext';

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
import LinearGradient from 'react-native-linear-gradient';

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
  Onboarding: { userId: string; userName: string; allowNameEdit?: boolean };
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




const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.tabBarContainer}>
      {/* Blur Background for iOS */}
      {Platform.OS === 'ios' ? (
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurType="dark"
          blurAmount={20}
          reducedTransparencyFallbackColor="#1a1a1a"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.androidTabBackground]} />
      )}
      

      
      <View style={styles.tabBarContent}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;
          const isCenter = route.name === 'Chat';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarButton
              key={route.key}
              route={route}
              label={label}
              isFocused={isFocused}
              isCenter={isCenter}
              options={options}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

const TabBarButton = ({ route, label, isFocused, isCenter, options, onPress }: any) => {
  const animatedValue = useSharedValue(isFocused ? 1 : 0);
  const iconMap: Record<string, string> = {
    Home: 'home',
    Profile: 'person',
    Chat: 'chat-bubble',
    NobetciEczaneler: 'local-pharmacy',
    MedicationReminder: 'medication',
  };

  React.useEffect(() => {
    animatedValue.value = withSpring(isFocused ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isFocused]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    if (isCenter) {
      return {
        transform: [
          {
            scale: interpolate(
              animatedValue.value,
              [0, 1],
              [1, 1.15],
             'clamp'
            ),
          },
          {
            translateY: interpolate(
              animatedValue.value,
              [0, 1],
              [0, -8],
              'clamp'
            ),
          },
        ],
      };
    }
    return {};
  });

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedValue.value,
      [0, 1],
      [0.7, 1],
      'clamp'
    ),
  }));

  if (isCenter) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.centerTabButton}
        activeOpacity={0.8}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Animated.View
          style={[
            styles.centerButtonContainer,
            animatedContainerStyle,
            { transform: [{ translateY: interpolate(animatedValue.value, [0, 1], [0, -6], 'clamp') }] }
          ]}
        ><LinearGradient
            colors={isFocused ? ['#C8FF00', '#A8E000'] : ['#667eea', '#764ba2']}
            style={styles.centerButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons 
              name={iconMap[route.name] || 'help'} 
              size={30} 
              color={isFocused ? '#000' : '#fff'} 
            />
          </LinearGradient>
        </Animated.View>
        <Animated.Text style={[styles.centerTabLabel, animatedTextStyle]}>
          {label}
        </Animated.Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={iconMap[route.name] || 'help'}
        size={24}
        color={isFocused ? '#667eea' : '#718096'}
      />
      <Animated.Text style={[styles.tabLabel, animatedTextStyle, isFocused && styles.tabLabelFocused]}>
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
};
function BottomTabNavigator({ route }: any) {
  const { userId, userName } = route.params || {};
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen as React.ComponentType<any>}
        initialParams={{ userId, userName }}
        options={{ tabBarLabel: t('common.home') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen as React.ComponentType<any>}
        initialParams={{ userId }}
        options={{ tabBarLabel: t('common.profile') }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen as React.ComponentType<any>}
        initialParams={{ userId, assistantName: 'Aile Asistanı' }}
        options={{ tabBarLabel: t('common.assistant') }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen as React.ComponentType<any>}
        options={{ tabBarLabel: t('common.history') }}
      />
      <Tab.Screen
        name="MedicationReminder"
        component={MedicationReminderScreen as React.ComponentType<any>}
        initialParams={{ userId, userName }}
        options={{ tabBarLabel: t('common.medications') }}
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
// Add these styles to your StyleSheet
const styles = StyleSheet.create({
  // ... existing styles ...
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 75,
    backgroundColor: 'transparent',
  },
  androidTabBackground: {
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 8,
    alignItems: 'center',
  },
  
  // Tab Buttons
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#718096',
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelFocused: {
    color: '#667eea',
    fontWeight: '600',
  },
  
  // Center Tab Button
  centerTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerButtonContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#C8FF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  centerButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  centerTabLabel: {
    fontSize: 11,
    marginTop: 6,
    color: '#718096',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Orb Styles
  orbContainer: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -60,
    alignSelf: 'center',
  },
  orb: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    opacity: 0.3,
  },
// Stiller
orbSmall: {
  position: 'absolute',
  width: 60,
  height: 60,
  borderRadius: 30,
  top: -20,
  left: 40,
  opacity: 0.4,
},
orbMedium: {
  position: 'absolute',
  width: 80,
  height: 80,
  borderRadius: 40,
  top: -30,
  right: 40,
  opacity: 0.3,
},
orbGradient: {
  width: '100%',
  height: '100%',
  borderRadius: 100,
},
});