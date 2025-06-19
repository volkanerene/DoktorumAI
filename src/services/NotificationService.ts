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

  /* …  diğer reminder fonksiyonlarını (exercise, diet, sleep, medication)  
        sadece schedule(...) çağıracak şekilde aynı kalıpla yeniden yaz  … */

  cancelAll() {
    if (Platform.OS === 'android' && PushNotificationAndroid) {
      PushNotificationAndroid.cancelAllLocalNotifications();
    } else {
      PushNotificationIOS.removeAllPendingNotificationRequests();
    }
  }
}

export default new NotificationService();