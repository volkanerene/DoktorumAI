// services/NotificationService.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { translations } from '../i18n/translations';

let PushNotificationAndroid: typeof import('react-native-push-notification') | null =
  null;
if (Platform.OS === 'android') {
  // import yerine require → iOS’ta hiç yüklenmez, crash sıfır
  PushNotificationAndroid = require('react-native-push-notification').default;
}

/* ---------- ortak tip ---------- */
interface ScheduleOpts {
  id: string;
  title: string;
  message: string;
  date: Date;
  repeatType?: 'day' | 'week' | 'month';
  userInfo?: Record<string, any>;
}

/* ---------- servis ---------- */
class NotificationService {
  private lang: 'tr' | 'en' = 'en';

  constructor() {
    this.initLang();
    if (Platform.OS === 'android') this.initAndroid();
    if (Platform.OS === 'ios') this.initIOS();
  }

  /* --------- init --------- */
  private async initLang() {
    const saved = await AsyncStorage.getItem('preferred_language');
    if (saved === 'tr' || saved === 'en') this.lang = saved;
  }

  private initAndroid() {
    PushNotificationAndroid?.createChannel(
      {
        channelId: 'health-assistant-channel',
        channelName: 'Health Assistant Notifications',
        channelDescription: 'Notifications for health reminders and tips',
        importance: 4,
        playSound: true,
        soundName: 'default',
        vibrate: true,
      },
      () => {}
    );
  }

  private initIOS() {
    PushNotificationIOS.requestPermissions({ alert: true, badge: true, sound: true });
  }

  /* --------- i18n helper --------- */
  private t(key: string) {
    return key
      .split('.')
      .reduce<any>((obj, k) => (obj ?? {})[k], translations[this.lang]) ?? key;
  }

  /* --------- ORTAK çağrı sarmalayıcıları --------- */

  private schedule(opts: ScheduleOpts) {
    if (Platform.OS === 'android' && PushNotificationAndroid) {
      PushNotificationAndroid.localNotificationSchedule({
        ...opts,
        channelId: 'health-assistant-channel',
        date: opts.date,
        repeatType: opts.repeatType,
        userInfo: opts.userInfo,
      });
    } else if (Platform.OS === 'ios') {
      PushNotificationIOS.scheduleLocalNotification({
        alertTitle: opts.title,
        alertBody: opts.message,
        fireDate: opts.date.toISOString(),
        repeatInterval: opts.repeatType, // 'day' | 'week' | 'month' zaten destekleniyor
        userInfo: { id: opts.id, ...(opts.userInfo || {}) },
      });
    }
  }

  private cancel(id: string) {
    if (Platform.OS === 'android' && PushNotificationAndroid) {
      PushNotificationAndroid.cancelLocalNotification(id);
    } else {
      PushNotificationIOS.cancelLocalNotifications({ id });
    }
  }
  // Mevcut schedule fonksiyonları eksik, ekleyelim:

async scheduleExerciseReminder(userId: string) {
  this.cancel('exercise-reminder');
  
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(14, 0, 0, 0);
  
  this.schedule({
    id: 'exercise-reminder',
    title: this.t('notifications.exerciseReminder'),
    message: this.t('notifications.stepGoal'),
    date,
    repeatType: 'day',
    userInfo: { type: 'exercise', userId },
  });
}

async scheduleMedicationReminder(userId: string, medications: any[]) {
  // İlaç hatırlatıcıları için
  medications.forEach((med, index) => {
    med.times.forEach((time: string, timeIndex: number) => {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      
      if (date < new Date()) {
        date.setDate(date.getDate() + 1);
      }
      
      this.schedule({
        id: `medication-${med.id}-${timeIndex}`,
        title: this.t('notifications.medicationReminder'),
        message: `${med.name} (${med.dosage})`,
        date,
        repeatType: 'day',
        userInfo: { type: 'medication', userId, medicationId: med.id },
      });
    });
  });
}

async schedulePersonalizedNotifications(userId: string, chatHistory: any[]) {
  // Chat geçmişine göre kişiselleştirilmiş bildirimler
  const topics = this.analyzeHealthTopics(chatHistory);
  
  if (topics.includes('sleep')) {
    const date = new Date();
    date.setHours(22, 0, 0, 0);
    if (date < new Date()) date.setDate(date.getDate() + 1);
    
    this.schedule({
      id: 'sleep-reminder',
      title: this.t('notifications.sleepReminder'),
      message: 'Kaliteli uyku için yatma vaktiniz geldi',
      date,
      repeatType: 'day',
      userInfo: { type: 'sleep', userId },
    });
  }
  
  if (topics.includes('diet')) {
    const date = new Date();
    date.setHours(12, 30, 0, 0);
    if (date < new Date()) date.setDate(date.getDate() + 1);
    
    this.schedule({
      id: 'diet-reminder',
      title: this.t('notifications.healthyEating'),
      message: 'Öğle yemeğinde sağlıklı beslenmeyi unutmayın',
      date,
      repeatType: 'day',
      userInfo: { type: 'diet', userId },
    });
  }
}

private analyzeHealthTopics(chatHistory: any[]): string[] {
  const topics: string[] = [];
  const keywords = {
    sleep: ['uyku', 'uykusuzluk', 'yorgun', 'dinlen', 'sleep', 'tired', 'rest'],
    diet: ['kilo', 'diyet', 'yemek', 'beslen', 'weight', 'diet', 'food', 'nutrition'],
    exercise: ['egzersiz', 'spor', 'hareket', 'yürü', 'exercise', 'sport', 'walk'],
    water: ['su', 'susuz', 'içecek', 'water', 'thirsty', 'drink'],
  };
  
  chatHistory.forEach(msg => {
    const text = msg.message.toLowerCase();
    Object.entries(keywords).forEach(([topic, words]) => {
      if (words.some(word => text.includes(word))) {
        topics.push(topic);
      }
    });
  });
  
  return [...new Set(topics)];
}

  /* --------- Yüksek seviye API’lerin (senin eskileri) yeniden yazımı --------- */

  async scheduleDailyHealthTips(userId: string) {
    this.cancel('daily-health-tip');

    const tips = [
      this.t('notifications.waterReminder'),
      this.t('notifications.stepGoal'),
      this.t('notifications.exerciseReminder'),
      this.t('notifications.sleepReminder'),
      this.t('notifications.healthyEating'),
      this.t('notifications.checkupReminder'),
    ];
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);

    this.schedule({
      id: 'daily-health-tip',
      title: this.t('notifications.dailyTip'),
      message: tips[Math.floor(Math.random() * tips.length)],
      date,
      repeatType: 'day',
      userInfo: { type: 'daily-tip', userId },
    });
  }

  public async schedulePersonalizedNotifications(userId: string, messages: any[]) {
    // cancel any previously‐scheduled personalized job
    this.cancel(`personalized-${userId}`);

    // pick a time for tomorrow at 9 AM (or whatever makes sense)
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);

    // you can customize the message using the last chat
    const last = messages[messages.length - 1]?.text ?? this.t('notifications.genericTip');
    this.schedule({
      id: `personalized-${userId}`,
      title: this.t('notifications.personalizedTitle'),
      message: this.t('notifications.personalizedMessage').replace('{lastMessage}', last),
      date,
      repeatType: 'day',
      userInfo: { type: 'personalized', userId },
    });
  }

  cancelAll() {
    if (Platform.OS === 'android' && PushNotificationAndroid) {
      PushNotificationAndroid.cancelAllLocalNotifications();
    } else {
      PushNotificationIOS.removeAllPendingNotificationRequests();
    }
  }
}

export default new NotificationService();