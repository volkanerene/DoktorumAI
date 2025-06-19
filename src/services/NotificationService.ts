import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  date: Date;
  repeatType?: 'day' | 'week' | 'month';
}

class NotificationService {
  private language: 'tr' | 'en' = 'en';

  constructor() {
    this.initializeLanguage();
  }

  private async initializeLanguage() {
    const savedLanguage = await AsyncStorage.getItem('preferred_language');
    if (savedLanguage && (savedLanguage === 'tr' || savedLanguage === 'en')) {
      this.language = savedLanguage as 'tr' | 'en';
    }
  }

  private t(key: string): string {
    const keys = key.split('.');
    let value: any = translations[this.language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        return key;
      }
    }
    
    return value;
  }

  // Schedule daily health tips
  async scheduleDailyHealthTips(userId: string) {
    // Cancel existing daily tips
    this.cancelDailyHealthTips();

    const tips = [
      this.t('notifications.waterReminder'),
      this.t('notifications.stepGoal'),
      this.t('notifications.exerciseReminder'),
      this.t('notifications.sleepReminder'),
      this.t('notifications.healthyEating'),
      this.t('notifications.checkupReminder'),
    ];

    // Schedule a random tip for tomorrow at 10 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    PushNotification.localNotificationSchedule({
      channelId: 'health-assistant-channel',
      title: this.t('notifications.dailyTip'),
      message: randomTip,
      date: tomorrow,
      repeatType: 'day',
      id: 'daily-health-tip',
      userInfo: { type: 'daily-tip', userId },
    });
  }

  // Schedule personalized notifications based on chat history
  async schedulePersonalizedNotifications(userId: string, chatHistory: any[]) {
    try {
      // Analyze chat history for health concerns
      const concerns = this.analyzeChatHistory(chatHistory);
      
      // Schedule relevant notifications
      if (concerns.includes('medication')) {
        this.scheduleMedicationReminder(userId);
      }
      
      if (concerns.includes('exercise')) {
        this.scheduleExerciseReminder(userId);
      }
      
      if (concerns.includes('diet')) {
        this.scheduleDietReminder(userId);
      }
      
      if (concerns.includes('sleep')) {
        this.scheduleSleepReminder(userId);
      }
    } catch (error) {
      console.error('Error scheduling personalized notifications:', error);
    }
  }

  private analyzeChatHistory(chatHistory: any[]): string[] {
    const concerns: string[] = [];
    const keywords = {
      medication: ['ilaç', 'medicine', 'drug', 'pill', 'tablet'],
      exercise: ['egzersiz', 'exercise', 'spor', 'sport', 'yürüyüş', 'walk'],
      diet: ['diyet', 'diet', 'beslenme', 'nutrition', 'yemek', 'food'],
      sleep: ['uyku', 'sleep', 'uykusuzluk', 'insomnia'],
    };

    chatHistory.forEach(message => {
      const text = message.message.toLowerCase();
      
      Object.entries(keywords).forEach(([concern, words]) => {
        if (words.some(word => text.includes(word))) {
          if (!concerns.includes(concern)) {
            concerns.push(concern);
          }
        }
      });
    });

    return concerns;
  }

  private scheduleMedicationReminder(userId: string) {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      channelId: 'health-assistant-channel',
      title: this.t('notifications.medicationReminder'),
      message: this.t('notifications.medicationReminder'),
      date,
      repeatType: 'day',
      id: `medication-reminder-${userId}`,
      userInfo: { type: 'medication', userId },
    });
  }

  private scheduleExerciseReminder(userId: string) {
    const date = new Date();
    date.setHours(18, 0, 0, 0);
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      channelId: 'health-assistant-channel',
      title: this.t('notifications.exerciseReminder'),
      message: this.t('notifications.exerciseReminder'),
      date,
      repeatType: 'day',
      id: `exercise-reminder-${userId}`,
      userInfo: { type: 'exercise', userId },
    });
  }

  private scheduleDietReminder(userId: string) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      channelId: 'health-assistant-channel',
      title: this.t('notifications.healthyEating'),
      message: this.t('notifications.healthyEating'),
      date,
      repeatType: 'day',
      id: `diet-reminder-${userId}`,
      userInfo: { type: 'diet', userId },
    });
  }

  private scheduleSleepReminder(userId: string) {
    const date = new Date();
    date.setHours(22, 0, 0, 0);
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      channelId: 'health-assistant-channel',
      title: this.t('notifications.sleepReminder'),
      message: this.t('notifications.sleepReminder'),
      date,
      repeatType: 'day',
      id: `sleep-reminder-${userId}`,
      userInfo: { type: 'sleep', userId },
    });
  }

  // Cancel all notifications
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  // Cancel daily health tips
  cancelDailyHealthTips() {
    PushNotification.cancelLocalNotification('daily-health-tip');
  }

  // Cancel specific notification
  cancelNotification(notificationId: string) {
    PushNotification.cancelLocalNotification(notificationId);
  }

  // Show immediate notification
  showNotification(title: string, message: string) {
    PushNotification.localNotification({
      channelId: 'health-assistant-channel',
      title,
      message,
      playSound: true,
      soundName: 'default',
    });
  }
}

export default new NotificationService();