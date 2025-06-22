import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../context/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');

export default function FirstScreen({ navigation }: any) {
  const { t } = useLanguage();
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Floating icons için animasyonlar
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;
  const float4 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }
    
    // Ana animasyonlar
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Dönen logo animasyonu
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animasyonu
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animasyonları
    startFloatingAnimations();
  }, []);

  const startFloatingAnimations = () => {
    // Her ikon için farklı floating animasyonları
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, {
          toValue: -20,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(float1, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, {
          toValue: 20,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(float2, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float3, {
          toValue: -15,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(float3, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float4, {
          toValue: 15,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(float4, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
        <>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
    <LinearGradient
      colors={['#6B75D6','#46B168']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Floating Background Icons */}
        <Animated.View
        pointerEvents="none"
          style={[
            styles.floatingIcon,
            styles.floatingIcon1,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float1 }],
            },
          ]}
        >
          <MaterialIcons name="favorite" size={40} color="rgba(255,255,255,0.1)" />
        </Animated.View>

        <Animated.View
        pointerEvents="none"
          style={[
            
            styles.floatingIcon,
            styles.floatingIcon2,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float2 }],
            },
          ]}
        >
          <MaterialCommunityIcons name="pill" size={50} color="rgba(255,255,255,0.1)" />
        </Animated.View>

        <Animated.View
        pointerEvents="none"
          style={[
            styles.floatingIcon,
            styles.floatingIcon3,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float3 }],
            },
          ]}
        >
          <MaterialCommunityIcons name="dna" size={60} color="rgba(255,255,255,0.1)" />
        </Animated.View>

        <Animated.View
        pointerEvents="none"
          style={[
            styles.floatingIcon,
            styles.floatingIcon4,
            {
              opacity: fadeAnim,
              transform: [{ translateY: float4 }],
            },
          ]}
        >
          <MaterialCommunityIcons name="stethoscope" size={45} color="rgba(255,255,255,0.1)" />
        </Animated.View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Logo Container */}
          <Animated.View
          pointerEvents="none"
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { rotate: spin },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#fff', '#f0f0f0']}
              style={styles.logoGradient}
            >
              <MaterialCommunityIcons name="medical-bag" size={60} color="#667eea" />
            </LinearGradient>
          </Animated.View>

          {/* Pulse Circle */}
          <Animated.View
          pointerEvents="none"
            style={[
              styles.pulseCircle,
              {
                transform: [{ scale: pulseAnim }],
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3],
                }),
              },
            ]}
          />

          {/* Title */}
          <Animated.View
          pointerEvents="none"
            style={[
              styles.titleContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.appName}>Sağlık Asistanım AI</Text>
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>Yapay Zeka Destekli</Text>
            </View>
            <Text style={styles.title}>Sağlığınız Güvende</Text>
            <Text style={styles.subtitle}>
              7/24 yapay zeka destekli sağlık asistanınız
            </Text>
          </Animated.View>

          {/* Features */}
          <Animated.View
          pointerEvents="none"
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.featureRow}>
              <View style={styles.feature}>
                <MaterialIcons name="chat" size={24} color="#fff" />
                <Text style={styles.featureText}>Anlık Danışma</Text>
              </View>
              <View style={styles.feature}>
                <MaterialIcons name="image-search" size={24} color="#fff" />
                <Text style={styles.featureText}>Görüntü Analizi</Text>
              </View>
              <View style={styles.feature}>
                <MaterialIcons name="analytics" size={24} color="#fff" />
                <Text style={styles.featureText}>Tahlil Yorumlama</Text>
              </View>
            </View>
          </Animated.View>

          {/* Start Button */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#C8FF00', '#A8E000']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.startButtonText}>Başla</Text>
                <MaterialIcons name="arrow-forward" size={24} color="#000" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>Zaten hesabım var</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Bottom Wave */}
          <View style={styles.bottomWave} pointerEvents="none">
            <MaterialCommunityIcons name="pulse" size={W} color="rgba(255,255,255,0.1)" />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  pulseCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#fff',
    top: H * 0.2 - 75,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  titleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 15,
  },
  titleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featuresContainer: {
    marginBottom: 50,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: W - 60,
  },
  feature: {
    alignItems: 'center',
    padding: 15,
  },
  featureText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  startButton: {
    width: W * 0.7,
    maxWidth: 500, 
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#C8FF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 10,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  loginLink: {
    paddingVertical: 10,
  },
  loginLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  floatingIcon: {
    position: 'absolute',
  },
  floatingIcon1: {
    top: H * 0.1,
    left: W * 0.1,
  },
  floatingIcon2: {
    top: H * 0.2,
    right: W * 0.1,
  },
  floatingIcon3: {
    top: H * 0.7,
    left: W * 0.15,
  },
  floatingIcon4: {
    top: H * 0.8,
    right: W * 0.2,
  },
  bottomWave: {
    position: 'absolute',
    bottom: -50,
    left: -W * 0.2,
    opacity: 0.1,
  },
});