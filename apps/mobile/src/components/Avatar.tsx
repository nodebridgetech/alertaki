import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../config/constants';

interface AvatarProps {
  photoURL?: string | null;
  name?: string;
  size?: number;
  backgroundColor?: string;
}

export function Avatar({
  photoURL,
  name,
  size = 44,
  backgroundColor = COLORS.accent,
}: AvatarProps): React.JSX.Element {
  const [imageError, setImageError] = useState(false);

  const borderRadius = size / 2;
  const fontSize = size * 0.4;

  if (photoURL && !imageError) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius, backgroundColor },
      ]}
    >
      <Text style={[styles.fallbackText, { fontSize }]}>
        {name?.charAt(0)?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});
