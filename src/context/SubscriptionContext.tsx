import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';

interface SubscriptionContextType {
  isPremium: boolean;
  dailyMessageCount: number;
  dailyMessageLimit: number;
  canSendMessage: boolean;
  canSendImage: boolean;
  trialEndDate: Date | null;
  checkSubscriptionStatus: () => Promise<void>;
  incrementMessageCount: () => Promise<void>;
  resetDailyLimits: () => Promise<void>;
  activateTrial: () => Promise<void>;
  activatePremium: () => Promise<void>;
}
const SERVER_URL = 'https://www.prokoc2.com/api2.php';
const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  
  const dailyMessageLimit = 3; // Free users limit

  useEffect(() => {
    initializeSubscription();
    checkAndResetDailyLimits();
  }, []);

  const initializeSubscription = async () => {
  try {
    const subscriptionData = await AsyncStorage.getItem('subscription_data');
    if (subscriptionData) {
      const data = JSON.parse(subscriptionData);
        
      // Trial kontrolü
      if (data.trialEndDate) {
        const endDate = new Date(data.trialEndDate);
        if (endDate > new Date()) {
          setTrialEndDate(endDate);
          setIsPremium(true);
        } else {
          // Trial bitmiş
          setTrialEndDate(null);
          // Eğer premium satın alınmamışsa free'ye dön
          if (!data.isPremium || data.isPremium === true && data.trialEndDate) {
            setIsPremium(false);
          }
        }
      } else {
        setIsPremium(data.isPremium || false);
      }
      }
      await checkAndResetDailyLimits(); 
    // Mesaj sayısını yükle
    const today = new Date().toDateString();
    const messageData = await AsyncStorage.getItem('daily_messages');
    if (messageData) {
      const data = JSON.parse(messageData);
      if (data.date === today) {
        setDailyMessageCount(data.count || 0);
      }
    }
  } catch (error) {
    console.error('Error initializing subscription:', error);
  }
};

  const checkAndResetDailyLimits = async () => {
    const today = new Date().toDateString();
    const lastResetDate = await AsyncStorage.getItem('last_reset_date');
    
    if (lastResetDate !== today) {
      await resetDailyLimits();
      await AsyncStorage.setItem('last_reset_date', today);
    }
  };

// checkSubscriptionStatus fonksiyonunu güncelle
const checkSubscriptionStatus = async () => {
  try {
    const response = await axios.get(
      `${SERVER_URL}?action=checkSubscription&user_id=${userId}`
    );
    
    if (response.data.success) {
      const sub = response.data.subscription;
      setIsPremium(sub.plan_type === 'premium' || sub.plan_type === 'trial');
      setDailyMessageCount(sub.daily_message_count || 0);
      
      if (sub.trial_end_date) {
        setTrialEndDate(new Date(sub.trial_end_date));
      }
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
  }
};

// activateTrial fonksiyonunu güncelle
const activateTrial = async () => {
  try {
    const response = await axios.post(`${SERVER_URL}?action=updateSubscription`, {
      user_id: userId,
      plan_type: 'trial'
    });
    
    if (response.data.success) {
      await checkSubscriptionStatus();
    }
  } catch (error) {
    console.error('Error activating trial:', error);
  }
};

  const incrementMessageCount = async () => {
    if (isPremium) return; // No limit for premium users

    const newCount = dailyMessageCount + 1;
    setDailyMessageCount(newCount);
    
    const today = new Date().toDateString();
    await AsyncStorage.setItem('daily_messages', JSON.stringify({
      date: today,
      count: newCount,
    }));
  };

  const resetDailyLimits = async () => {
    setDailyMessageCount(0);
    const today = new Date().toDateString();
    await AsyncStorage.setItem('daily_messages', JSON.stringify({
      date: today,
      count: 0,
    }));
  };



  const activatePremium = async () => {
    setIsPremium(true);
    setTrialEndDate(null);
    
    await AsyncStorage.setItem('subscription_data', JSON.stringify({
      isPremium: true,
      purchaseDate: new Date().toISOString(),
    }));
  };

  const canSendMessage = isPremium || dailyMessageCount < dailyMessageLimit;
  const canSendImage = isPremium;

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium,
        dailyMessageCount,
        dailyMessageLimit,
        canSendMessage,
        canSendImage,
        trialEndDate,
        checkSubscriptionStatus,
        incrementMessageCount,
        resetDailyLimits,
        activateTrial,
        activatePremium,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};