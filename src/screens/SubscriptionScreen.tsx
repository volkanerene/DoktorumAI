import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  NativeModules,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SubscriptionScreenProps = StackScreenProps<RootStackParamList, 'Subscription'>;

const { width } = Dimensions.get('window');

export default function SubscriptionScreen({ route, navigation }: SubscriptionScreenProps) {
  const { userId, userName } = route.params;
  const { t, language } = useLanguage();
  const { activateTrial } = useSubscription();
  const [loading, setLoading] = useState(false);
  // Fiyat belirleme için locale kontrolü ekle

    const getPrice = () => {
      // Türkiye için kontrol
      const locale = NativeModules.I18nManager?.localeIdentifier || 'en';
      const isTurkey = locale.toLowerCase().includes('tr');
      
      return {
        currency: isTurkey ? '₺' : '$',
        amount: isTurkey ? '99' : '5',
        text: isTurkey ? t('subscription.pricePerMonth') : t('subscription.pricePerMonthGlobal')
      };
    };
    const priceInfo = getPrice();
  const features = [
    { icon: 'all-inclusive', text: t('subscription.features.unlimited') },
    { icon: 'image', text: t('subscription.features.imageAnalysis') },
    { icon: 'mic', text: t('subscription.features.voiceMessages') },
    { icon: 'medical-services', text: t('subscription.features.allDoctors') },
    { icon: 'star', text: t('subscription.features.priority') },
    { icon: 'notifications-active', text: t('subscription.features.notifications') },
  ];

  const price = language === 'tr' ? '₺99' : '$5';

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      // Here you would integrate with RevenueCat or your payment provider
      // For now, we'll just activate the trial locally
      await activateTrial();
      
      Alert.alert(
        t('common.success'),
        t('subscription.trialInfo'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigateToHome(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleContinueFree = async () => {
      await AsyncStorage.setItem(`subscription_shown_${userId}`, 'true');
  Alert.alert(
    t('subscription.freeVersion'),
    t('subscription.limitedFeatures'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        onPress: () => navigateToHome(),
      },
    ]
  );
};

  const navigateToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home', params: { userId, userName } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleContinueFree}
          >
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animatable.View
            animation="fadeInDown"
            duration={800}
            style={styles.header}
          >
            <View style={styles.crownContainer}>
              <MaterialIcons name="workspace-premium" size={80} color="#FFD700" />
            </View>
            <Text style={styles.title}>{t('subscription.title')}</Text>
            <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>
          </Animatable.View>

          {/* Price Card */}
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            delay={200}
            style={styles.priceCard}
          >
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>{t('subscription.trialInfo')}</Text>
            </View>
            
            <Text style={styles.planTitle}>{t('subscription.monthlyPlan')}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{priceInfo.currency}{priceInfo.amount}</Text>
            <Text style={styles.priceUnit}>/{t('subscription.monthlyPlan').toLowerCase()}</Text>
          </View>
            
            <Text style={styles.trialNote}>{t('subscription.trialEnds')}</Text>
            <Text style={styles.cancelNote}>{t('subscription.cancelAnytime')}</Text>
          </Animatable.View>

          {/* Features */}
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            delay={400}
            style={styles.featuresContainer}
          >
            <Text style={styles.featuresTitle}>{t('subscription.features.title')}</Text>
            {features.map((feature, index) => (
              <Animatable.View
                key={index}
                animation="fadeInLeft"
                duration={600}
                delay={600 + index * 100}
                style={styles.featureItem}
              >
                <View style={styles.featureIcon}>
                  <MaterialIcons name={feature.icon} size={24} color="#667eea" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </Animatable.View>
            ))}
          </Animatable.View>

          {/* Buttons */}
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            delay={1000}
            style={styles.buttonContainer}
          >
            <TouchableOpacity
              style={styles.trialButton}
              onPress={handleStartTrial}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.trialButtonText}>{t('subscription.startTrial')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={() => {}}
            >
              <Text style={styles.restoreButtonText}>{t('subscription.restorePurchases')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.freeButton}
              onPress={handleContinueFree}
            >
              <Text style={styles.freeButtonText}>{t('subscription.notNow')}</Text>
            </TouchableOpacity>
          </Animatable.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  crownContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  trialBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'absolute',
    top: -12,
  },
  trialBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
  },
  priceUnit: {
    fontSize: 18,
    color: '#666',
    marginLeft: 4,
  },
  trialNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cancelNote: {
    fontSize: 12,
    color: '#999',
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  trialButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  trialButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  restoreButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  freeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  freeButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});