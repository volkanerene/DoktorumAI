import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

export default function FirstScreen({ navigation }: any) {
  const isTablet = W >= 600;
  // Telefon için %35, tablet için %50 genişlikte doktor resmi
  const imageSize = isTablet ? W * 0.5 : W * 0.35;

  return (
    <SafeAreaView style={styles.container}>
      {/* Full‐screen arkaplan */}
      <Image
        source={require('../assets/arkaplan.png')}
        style={styles.background}
      />

      <View style={styles.content}>
        {/* 1) Banner */}
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerText}>Yapay Zeka Doktorun</Text>
        </View>

        {/* 2) Doktor Görseli */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/assistant.png')}
            style={[styles.assistantImage, { width: imageSize, height: imageSize }]}
          />
        </View>

        {/* 3) Başlık */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Tüm Doktorlar Elinin Altında!</Text>
        </View>

        {/* 4) Başla Butonu */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.startButtonText}>Başla →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingVertical: H * 0.04,    // eskiden 0.05 idi
    paddingHorizontal: W * 0.04,  // eskiden 0.05 idi
  },
  bannerContainer: {
    width: '100%',
    backgroundColor: '#C8FF00',
    paddingVertical: H * 0.012,   // eskiden 0.015 idi
    alignItems: 'center',
    borderRadius: W * 0.02,
  },
  bannerText: {
    fontSize: W * 0.04,           // eskiden 0.045 idi
    fontWeight: 'bold',
    color: '#000',
  },
  imageContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  assistantImage: {
    resizeMode: 'contain',
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: H * 0.015,     // eskiden 0.02 idi
  },
  title: {
    fontSize: W * 0.07,           // eskiden 0.08 idi
    fontWeight: 'bold',
    color: '#C8FF00',
    textAlign: 'center',
    lineHeight: W * 0.09,         // eskiden 0.1 idi
  },
  startButton: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: H * 0.015,   // eskiden 0.02 idi
    paddingHorizontal: W * 0.18,  // eskiden 0.2 idi
    borderRadius: 30,
    marginBottom: H * 0.04,       // eskiden 0.05 idi
  },
  startButtonText: {
    fontSize: W * 0.045,          // eskiden 0.05 idi
    fontWeight: 'bold',
    color: '#000',
  },
});