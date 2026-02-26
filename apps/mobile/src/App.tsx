import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { RootNavigator, navigationRef } from './navigation/RootNavigator';
import { useAuthStore } from './stores/authStore';
import { useContactStore } from './stores/contactStore';
import { notificationService } from './services/notificationService';
import { userService } from './services/userService';
import { contactService } from './services/contactService';
import { useBackgroundLocation } from './hooks/useBackgroundLocation';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';

try {
  GoogleSignin.configure({
    webClientId: '807554654482-nrm3bduds7k8vgbf24s3thd996lu9kgh.apps.googleusercontent.com',
  });
} catch (error) {
  console.warn('GoogleSignin.configure failed:', error);
}

// Background message handler — must be registered outside component
try {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    const data = remoteMessage.data;
    if (data?.fullscreen === '1') {
      await notificationService.showAlertNotification({
        alertId: (data.alertId as string) || '',
        type: (data.type as string) || '',
        lat: (data.lat as string) || '',
        lng: (data.lng as string) || '',
        userName: (data.userName as string) || '',
        userPhotoURL: (data.userPhotoURL as string) || '',
        address: (data.address as string) || '',
        customMessage: (data.customMessage as string) || '',
        userId: (data.userId as string) || '',
      });
    }
  });
} catch (error) {
  console.warn('setBackgroundMessageHandler failed:', error);
}

function App(): React.JSX.Element {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setContacts = useContactStore((s) => s.setContacts);
  const setContactOf = useContactStore((s) => s.setContactOf);
  const setPendingInvites = useContactStore((s) => s.setPendingInvites);
  const setBlockedUsers = useContactStore((s) => s.setBlockedUsers);
  const pendingInitialNotification = useRef<FirebaseMessagingTypes.RemoteMessage | null>(null);

  useEffect(() => {
    // Create notification channels on startup
    notificationService.createChannels().catch(() => {});
    notificationService.requestPermission().catch(() => {});

    // Safety timeout: if auth state never resolves, force show auth screen
    const authTimeout = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        console.warn('Auth state listener timeout — forcing isLoading to false');
        setLoading(false);
      }
    }, 10000);

    // Auth state listener
    const unsubAuth = auth().onAuthStateChanged(async (firebaseUser) => {
      try {
        clearTimeout(authTimeout);
        if (firebaseUser) {
          let userData = await userService.getUser(firebaseUser.uid);
          if (!userData) {
            // Wait for signIn flow to create the user doc (avoids race condition
            // where onAuthStateChanged fires before displayName is available)
            for (let i = 0; i < 5 && !userData; i++) {
              await new Promise((r) => setTimeout(r, 600));
              userData = await userService.getUser(firebaseUser.uid);
            }
            if (!userData) {
              // Fallback: create doc if signIn flow didn't (e.g. app restart edge case)
              await userService.upsertUser(firebaseUser);
              userData = await userService.getUser(firebaseUser.uid);
            }
          }
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.warn('Auth state handler error:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(authTimeout);
      unsubAuth();
    };
  }, [setUser, setLoading]);

  // Background location updates
  useBackgroundLocation();

  // Network status monitoring
  const isConnected = useNetworkStatus();

  // Set up Firestore listeners when authenticated
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.uid) return;

    const uid = user.uid;
    const unsubContacts = contactService.onContacts(uid, setContacts);
    const unsubContactOf = contactService.onContactOf(uid, setContactOf);
    const unsubInvites = contactService.onPendingInvites(uid, setPendingInvites);
    const unsubBlocked = contactService.onBlockedUsers(uid, setBlockedUsers);
    const unsubTokenRefresh = notificationService.onTokenRefresh(uid);

    return () => {
      unsubContacts();
      unsubContactOf();
      unsubInvites();
      unsubBlocked();
      unsubTokenRefresh();
    };
  }, [user, setContacts, setContactOf, setPendingInvites, setBlockedUsers]);

  // FCM foreground message handler
  useEffect(() => {
    const unsubMessage = messaging().onMessage(async (remoteMessage) => {
      const data = remoteMessage.data;
      if (!data) return;

      if (data.fullscreen === '1') {
        await notificationService.showAlertNotification({
          alertId: (data.alertId as string) || '',
          type: (data.type as string) || '',
          lat: (data.lat as string) || '',
          lng: (data.lng as string) || '',
          userName: (data.userName as string) || '',
          userPhotoURL: (data.userPhotoURL as string) || '',
          address: (data.address as string) || '',
          customMessage: (data.customMessage as string) || '',
          userId: (data.userId as string) || '',
        });

        if (navigationRef.isReady()) {
          navigationRef.navigate('AlertOverlay', {
            alertData: {
              alertId: (data.alertId as string) || '',
              type: (data.type as string) || '',
              userId: (data.userId as string) || '',
              userName: (data.userName as string) || '',
              userPhotoURL: (data.userPhotoURL as string) || '',
              lat: (data.lat as string) || '',
              lng: (data.lng as string) || '',
              address: (data.address as string) || '',
              customMessage: (data.customMessage as string) || '',
            },
          });
        }
      } else if (data.screen === 'invites') {
        await notificationService.showInviteNotification(
          (data.fromDisplayName as string) || '',
          (data.fromEmail as string) || '',
        );
      }
    });

    // Handle notification tap when app is in background
    const unsubNotifOpen = messaging().onNotificationOpenedApp((remoteMessage) => {
      const data = remoteMessage.data;
      if (data?.fullscreen === '1' && navigationRef.isReady()) {
        navigationRef.navigate('AlertOverlay', {
          alertData: {
            alertId: (data.alertId as string) || '',
            type: (data.type as string) || '',
            userId: (data.userId as string) || '',
            userName: (data.userName as string) || '',
            userPhotoURL: (data.userPhotoURL as string) || '',
            lat: (data.lat as string) || '',
            lng: (data.lng as string) || '',
            address: (data.address as string) || '',
            customMessage: (data.customMessage as string) || '',
          },
        });
      } else if (data?.screen === 'invites' && navigationRef.isReady()) {
        navigationRef.navigate('Invites');
      }
    });

    // Handle notification tap when app was terminated — store for later
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data) {
          pendingInitialNotification.current = remoteMessage;
        }
      });

    // Notifee foreground event handler
    const unsubNotifee = notificationService.setupForegroundEvent((data) => {
      if (data.fullscreen === '1' && navigationRef.isReady()) {
        navigationRef.navigate('AlertOverlay', {
          alertData: {
            alertId: data.alertId || '',
            type: data.type || '',
            userId: data.userId || '',
            userName: data.userName || '',
            userPhotoURL: data.userPhotoURL || '',
            lat: data.lat || '',
            lng: data.lng || '',
            address: data.address || '',
            customMessage: data.customMessage || '',
          },
        });
      }
    });

    return () => {
      unsubMessage();
      unsubNotifOpen();
      unsubNotifee();
    };
  }, []);

  // Process pending initial notification after auth is ready
  useEffect(() => {
    if (!user || !pendingInitialNotification.current) return;

    const data = pendingInitialNotification.current.data;
    pendingInitialNotification.current = null;

    if (!data) return;

    // Wait for navigation to be ready, then navigate
    const interval = setInterval(() => {
      if (navigationRef.isReady()) {
        clearInterval(interval);
        if (data.fullscreen === '1') {
          navigationRef.navigate('AlertOverlay', {
            alertData: {
              alertId: (data.alertId as string) || '',
              type: (data.type as string) || '',
              userId: (data.userId as string) || '',
              userName: (data.userName as string) || '',
              userPhotoURL: (data.userPhotoURL as string) || '',
              lat: (data.lat as string) || '',
              lng: (data.lng as string) || '',
              address: (data.address as string) || '',
              customMessage: (data.customMessage as string) || '',
            },
          });
        } else if (data.screen === 'invites') {
          navigationRef.navigate('Invites');
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {!isConnected && <OfflineBanner />}
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
