import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  NativeModules,
  Modal,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../AppNavigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';      // RevenueCat SDK

type Props = StackScreenProps<RootStackParamList, 'Subscription'>;
const BG_COLOR = '#09408B';     

const { width } = Dimensions.get('window');

export default function SubscriptionScreen({ route, navigation }: Props) {
  /* ------------------------------------------------------------------ */
  /*                             STATE / CTX                            */
  /* ------------------------------------------------------------------ */
  const { userId, userName } = route.params;
  const { t, language } = useLanguage();
  const { activateTrial } = useSubscription();   // activateTrial(): Promise<void>
  const [loading, setLoading]       = useState(false);
  const [freeModal, setFreeModal]   = useState(false);

  /* ------------------------------------------------------------------ */
  /*                          PRICE & FEATURES                          */
  /* ------------------------------------------------------------------ */
  const priceInfo = React.useMemo(() => {
    const locale = NativeModules.I18nManager?.localeIdentifier || 'en';
    const isTR   = locale.toLowerCase().includes('tr');
    return { currency: isTR ? '₺' : '$', amount: isTR ? '99' : '5' };
  }, []);

  const features = [
    { icon: 'all-inclusive',        text: t('subscription.features.unlimited')       },
    { icon: 'image',                text: t('subscription.features.imageAnalysis')   },
    { icon: 'mic',                  text: t('subscription.features.voiceMessages')   },
    { icon: 'medical-services',     text: t('subscription.features.allDoctors')      },
    { icon: 'star',                 text: t('subscription.features.priority')        },
    { icon: 'notifications-active', text: t('subscription.features.notifications')   },
  ];

  /* ------------------------------------------------------------------ */
  /*                       REVENUECAT 7-GÜNLÜK TRIAL                    */
  /* ------------------------------------------------------------------ */
  const handleStartTrial = async () => {
    try {
      setLoading(true);

      const offerings   = await Purchases.getOfferings();
      const trialPkg    = offerings.current?.availablePackages.find(
        p => p.identifier === 'weekly_trial',   // RevenueCat’ta tanımladığınız paket ID
      );
      if (!trialPkg) throw new Error('Package not found');

      await Purchases.purchasePackage(trialPkg); // Satın alım ekranı açılır
      await activateTrial();                     // Context içinde premium flag’i set et
      goHome();
    } catch (e: any) {
      if (!e.userCancelled) console.warn('Purchase error ➜', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      await Purchases.restorePurchases();
      await activateTrial();     // Premium durumunu yine işleyin
      goHome();
    } catch (e) {
      console.warn('Restore error', e);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*                     FREE (Şimdi Değil) AKIŞI                       */
  /* ------------------------------------------------------------------ */
  const handleContinueFree = () => setFreeModal(true);

  const confirmFreePlan = async () => {
    await AsyncStorage.setItem(`subscription_shown_${userId}`, 'true');
    setFreeModal(false);
    goHome();
  };

  /* ------------------------------------------------------------------ */
  /*                              NAVIGATION                            */
  /* ------------------------------------------------------------------ */
  const goHome = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { userId, userName } }],
    });

  /* ------------------------------------------------------------------ */
  /*                               RENDER                               */
  /* ------------------------------------------------------------------ */
  return (
      <>    
      <View style={[styles.container, { backgroundColor: BG_COLOR }]}>
      
      <SafeAreaView style={styles.container}>

        {/* ────────── KAPAT (X) ────────── */}


        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={handleContinueFree}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* ────────── HEADER ────────── */}
          <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
            <View style={styles.crownContainer}>
              <MaterialIcons name="workspace-premium" size={80} color="#FFD700" />
            </View>
            <Text style={styles.title}>{t('subscription.title')}</Text>
            <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>
          </Animatable.View>

          {/* ────────── PRICE CARD ────────── */}
          <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.priceCard}>
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

          {/* ────────── ÖZELLİKLER ────────── */}
          <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>{t('subscription.features.title')}</Text>
            {features.map((f, i) => (
              <Animatable.View key={i} animation="fadeInLeft" duration={600} delay={600 + i * 100} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name={f.icon} size={24} color="#667eea" />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </Animatable.View>
            ))}
          </Animatable.View>

          {/* ────────── BUTONLAR ────────── */}
          <Animatable.View animation="fadeInUp" duration={800} delay={1000} style={styles.buttonContainer}>
            {/* 7-gün ücretsiz deneme */}
            <TouchableOpacity style={styles.trialButton} onPress={handleStartTrial} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.trialButtonText}>{t('subscription.startTrial')}</Text>}
            </TouchableOpacity>

            {/* Satın alım geri yükle */}
            <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
              <Text style={styles.restoreButtonText}>{t('subscription.restorePurchases')}</Text>
            </TouchableOpacity>

            {/* Ücretsiz devam et */}
            <TouchableOpacity style={styles.freeButton} onPress={handleContinueFree}>
              <Text style={styles.freeButtonText}>{t('subscription.notNow')}</Text>
            </TouchableOpacity>
          </Animatable.View>
        </ScrollView>
      </SafeAreaView>
    </View><Modal visible={freeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="sentiment-satisfied-alt" size={60} color="#667eea" />
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>{t('subscription.freeVersion')}</Text>
              <Text style={styles.modalSubtitle}>{t('subscription.limitedFeatures')}</Text>

              <TouchableOpacity style={styles.modalPrimary} onPress={confirmFreePlan}>
                <Text style={styles.modalPrimaryText}>{t('common.ok')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setFreeModal(false)}>
                <Text style={styles.modalSecondaryText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal></>
    
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
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
   modalOverlay: {
   flex: 1,
   backgroundColor: 'rgba(0,0,0,0.4)',
   justifyContent: 'flex-end',
 },
 modalCard: {
  backgroundColor: '#fff',
   borderTopLeftRadius: 32,
   borderTopRightRadius: 32,
   overflow: 'hidden',
 },
 modalHeader: {
   alignItems: 'center',
   justifyContent: 'center',
   paddingVertical: 24,
 },
 modalBody: {
   paddingHorizontal: 24,
   paddingBottom: 32,
   alignItems: 'center',
 },
 modalTitle: {
   fontSize: 22,
   fontWeight: '700',
   color: '#333',
   marginBottom: 8,
   textAlign: 'center',
 },
 modalSubtitle: {
   fontSize: 15,
   color: '#666',
   textAlign: 'center',
   marginBottom: 24,

},
 modalPrimary: {
   backgroundColor: '#667eea',
   borderRadius: 24,
   width: width * 0.7,
   alignItems: 'center',
   paddingVertical: 14,
   marginBottom: 14,
 },
 modalPrimaryText: {
   color: '#fff',
   fontSize: 16,
   fontWeight: '600',
 },
 modalSecondaryText: {
   color: '#667eea',
   fontSize: 14,
   textDecorationLine: 'underline',
 },
});