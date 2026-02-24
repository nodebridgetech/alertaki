import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../config/constants';

export function OfflineBanner(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sem conexão com a internet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
