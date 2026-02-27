import React from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { PaywallScreen } from '../screens/subscription/PaywallScreen';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isChecking = useSubscriptionStore((s) => s.isChecking);
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed);

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  if (isChecking) {
    return <SplashScreen />;
  }

  if (!isSubscribed) {
    return <PaywallScreen />;
  }

  return <MainStack />;
}
