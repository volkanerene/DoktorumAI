// src/components/LoadingAnimation.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const LoadingAnimation = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../../assets/loading.json')} 
        autoPlay
        loop
        style={styles.animation}
      />
    </View>
  );
};

export default LoadingAnimation;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: 150,
    height: 150,
  },
});
