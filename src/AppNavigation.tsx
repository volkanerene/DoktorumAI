// src/AppNavigation.tsx
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  interpolate,
  Extrapolate 
} from 'react-native-reanimated';
import React, { useState } from 'react';
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
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
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

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
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

// Animated Tab Button Component
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
              [1, 1.1],
              Extrapolate.CLAMP
            ),
          },
          {
            translateY: interpolate(
              animatedValue.value,
              [0, 1],
              [0, -5],
              Extrapolate.CLAMP
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
      [0.6, 1],
      Extrapolate.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          animatedValue.value,
          [0, 1],
          [0.8, 1],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  if (isCenter) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.centerTabButton}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.centerButtonContainer, animatedContainerStyle]}>
          <LinearGradient
            colors={isFocused ? ['#667eea', '#764ba2'] : ['#4a5568', '#2d3748']}
            style={styles.centerButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons 
              name={iconMap[route.name] || 'help'} 
              size={28} 
              color="#fff" 
            />
            {isFocused && (
              <Animated.View 
                style={[styles.centerButtonGlow, animatedTextStyle]} 
              />
            )}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <Animated.View style={animatedContainerStyle}>
        <MaterialIcons
          name={iconMap[route.name] || 'help'}
          size={24}
          color={isFocused ? '#667eea' : '#718096'}
        />
        <Animated.Text style={[styles.tabLabel, animatedTextStyle, isFocused && styles.tabLabelFocused]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Updated BottomTabNavigator
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
        name="NobetciEczaneler"
        component={NobetciEczanelerScreen as React.ComponentType<any>}
        options={{ tabBarLabel: t('common.pharmacy') }}
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
  
  // Custom Tab Bar Styles
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 70,
    backgroundColor: 'transparent',
  },
  androidTabBackground: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#718096',
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: '#667eea',
    fontWeight: '600',
  },
  centerTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -15,
  },
  centerButtonContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  centerButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  centerButtonGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
  },
});