import React, { createContext, useContext, useState, useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // First check if user has set a preferred language
      const savedLanguage = await AsyncStorage.getItem('preferred_language');
      if (savedLanguage && (savedLanguage === 'tr' || savedLanguage === 'en')) {
        setLanguageState(savedLanguage as Language);
        return;
      }

      // If not, check device language
      const deviceLanguage = getDeviceLanguage();
      const lang: Language = deviceLanguage.startsWith('tr') ? 'tr' : 'en';
      setLanguageState(lang);
    } catch (error) {
      console.error('Error initializing language:', error);
      setLanguageState('en');
    }
  };

  const getDeviceLanguage = (): string => {
    if (Platform.OS === 'ios') {
      return (
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages[0] ||
        'en'
      );
    } else {
      return NativeModules.I18nManager?.localeIdentifier || 'en';
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('preferred_language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};