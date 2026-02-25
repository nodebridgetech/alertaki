import React from 'react';
import { Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../config/constants';

const bellIcon = require('../../assets/bell.png');

export function SplashScreen(): React.JSX.Element {
  return (
    <LinearGradient
      colors={['#FF4444', '#FF8800']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Image source={bellIcon} style={styles.icon} resizeMode="contain" />
      <Text style={styles.title}>Alertaki</Text>
      <Text style={styles.subtitle}>Sua segurança em primeiro lugar</Text>
      <ActivityIndicator size="large" color={COLORS.white} style={styles.loader} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
  },
  loader: {
    marginTop: 40,
  },
});
