import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../config/constants';

export function SplashScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertaki</Text>
      <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primaryText,
  },
  loader: {
    marginTop: 24,
  },
});
