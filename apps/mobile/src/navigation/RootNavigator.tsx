import React from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { useAuthStore } from '../stores/authStore';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  return <MainStack />;
}
