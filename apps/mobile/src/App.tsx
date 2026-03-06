import React, { useEffect, useRef } from 'react';
import { AppState, KeyboardAvoidingView, NativeModules, PermissionsAndroid, Platform, Settings, StatusBar, StyleSheet } from 'react-native';
import notifee from '@notifee/react-native';
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
import { locationService } from './services/locationService';
import { useBackgroundLocation } from './hooks/useBackgroundLocation';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { useSubscriptionStore } from './stores/subscriptionStore';
import { billingService } from './services/billingService';
import { preferencesService } from './services/preferencesService';
import { finishTransaction } from 'react-native-iap';
// Note: react-native-iap v14 uses fetchProducts/requestPurchase instead of getSubscriptions/requestSubscription
import firestore from '@react-native-firebase/firestore';

try {
  GoogleSignin.configure({
    webClientId: '807554654482-nrm3bduds7k8vgbf24s3thd996lu9kgh.apps.googleusercontent.com',
  });
} catch (error) {
  console.warn('GoogleSignin.configure failed:', error);
}

// Background message handler — must be registered outside component.
// FCM sends data-only messages so this handler always fires.
// We create a Notifee notification with fullScreenAction for overlay display.
try {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    const data = remoteMessage.data;
    if (data?.fullscreen === '1' && Platform.OS === 'android') {
      const prefs = await preferencesService.getPreferences();
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
      }, prefs);

      // Launch the app activity directly using SYSTEM_ALERT_WINDOW
      // This bypasses Android's fullScreenIntent limitations
      try {
        NativeModules.AlertLauncher?.launchAlert({
          alertId: (data.alertId as string) || '',
          type: (data.type as string) || '',
          userId: (data.userId as string) || '',
          userName: (data.userName as string) || '',
          userPhotoURL: (data.userPhotoURL as string) || '',
          lat: (data.lat as string) || '',
          lng: (data.lng as string) || '',
          address: (data.address as string) || '',
          customMessage: (data.customMessage as string) || '',
        });
      } catch (e) {
        console.warn('AlertLauncher.launchAlert failed:', e);
      }
    } else if (data?.screen === 'invites') {
      await notificationService.showInviteNotification(
        (data.fromDisplayName as string) || '',
        (data.fromEmail as string) || '',
      );
    }
  });
} catch (error) {
  console.warn('setBackgroundMessageHandler failed:', error);
}

// AsyncStorage key shared with index.js onBackgroundEvent handler
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_NOTIFEE_KEY = '@pendingNotifeePress';

function App(): React.JSX.Element {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setContacts = useContactStore((s) => s.setContacts);
  const setContactOf = useContactStore((s) => s.setContactOf);
  const setPendingInvites = useContactStore((s) => s.setPendingInvites);
  const setBlockedUsers = useContactStore((s) => s.setBlockedUsers);
  const pendingNotifeeInitial = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    // Create notification channels (idempotent, always safe)
    notificationService.createChannels().catch((e: unknown) => {
      console.error('ALERTAKI: createChannels FAILED:', e);
    });

    // Sequential permission flow: check first, only request what's missing, one at a time
    (async () => {
      try {
        // Step 1: Notification permission
        const notifGranted = await notificationService.isNotificationPermissionGranted();
        if (!notifGranted) {
          await notificationService.requestPermission();
        }

        // Step 2: Overlay permission (only ask if notifications are granted)
        const overlayGranted = await notificationService.isOverlayPermissionGranted();
        if (!overlayGranted) {
          const notifNowGranted = await notificationService.isNotificationPermissionGranted();
          if (notifNowGranted) {
            await notificationService.requestOverlayPermission();
          }
        }

        // Step 3: Foreground location (required before background on Android 10+)
        const fineLocGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (!fineLocGranted) {
          await locationService.requestPermission();
        }

        // Step 4: Background location (only ask once — Android doesn't reliably
        // report the grant via PermissionsAndroid after the Settings redirect)
        const fineLocNow = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (fineLocNow) {
          const bgLocGranted = await locationService.isBackgroundLocationGranted();
          if (!bgLocGranted) {
            const alreadyAsked = Settings.get('bg_location_asked');
            if (!alreadyAsked) {
              await locationService.requestBackgroundPermission();
              Settings.set({ bg_location_asked: '1' });
            }
          }
        }
      } catch (e) {
        console.warn('ALERTAKI: Permission flow error:', e);
      }
    })();

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

    // Sync alert preferences from Firestore to local cache
    preferencesService.syncFromFirestore(uid).catch(() => {});

    return () => {
      unsubContacts();
      unsubContactOf();
      unsubInvites();
      unsubBlocked();
      unsubTokenRefresh();
    };
  }, [user, setContacts, setContactOf, setPendingInvites, setBlockedUsers]);

  // IAP: Initialize billing, check subscription, listen for changes
  const setSubscribed = useSubscriptionStore((s) => s.setSubscribed);
  const checkSubscriptionStatus = useSubscriptionStore((s) => s.checkSubscriptionStatus);

  useEffect(() => {
    if (!user?.uid) {
      useSubscriptionStore.getState().reset();
      return;
    }

    let purchaseCleanup: (() => void) | null = null;
    let errorCleanup: (() => void) | null = null;

    (async () => {
      try {
        await billingService.initialize();
        await checkSubscriptionStatus(user.uid);

        const listeners = billingService.setupPurchaseListeners(
          async (purchase) => {
            if (purchase.purchaseToken && purchase.productId) {
              try {
                const result = await billingService.validatePurchase(
                  purchase.purchaseToken,
                  purchase.productId,
                );
                if (result.isValid) {
                  setSubscribed(true);
                }
                await finishTransaction({ purchase, isConsumable: false });
              } catch (err) {
                console.warn('Purchase validation error:', err);
                useSubscriptionStore.getState().setChecking(false);
              }
            }
          },
          (error) => {
            if (error.code !== 'E_USER_CANCELLED') {
              console.warn('IAP purchase error:', error);
              useSubscriptionStore.getState().setChecking(false);
            }
          },
        );

        purchaseCleanup = listeners.removePurchaseListener;
        errorCleanup = listeners.removeErrorListener;
      } catch (err) {
        console.warn('IAP initialization error:', err);
        useSubscriptionStore.getState().setSubscribed(false);
        useSubscriptionStore.getState().setChecking(false);
      }
    })();

    // Real-time Firestore listener for subscription changes
    const unsubFirestore = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot((doc) => {
        const data = doc.data();
        const sub = data?.subscription;
        if (!sub || !sub.isActive) {
          useSubscriptionStore.getState().setSubscribed(false);
          useSubscriptionStore.getState().setChecking(false);
          return;
        }
        const now = Date.now() / 1000;
        const expirySeconds = sub.expiresAt?.seconds ?? 0;
        const isActive = expirySeconds > now;
        useSubscriptionStore.getState().setSubscribed(isActive);
        useSubscriptionStore.getState().setChecking(false);
      });

    // Re-check subscription when app comes to foreground (catches expiration while in background)
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkSubscriptionStatus(user.uid);
      }
    });

    return () => {
      purchaseCleanup?.();
      errorCleanup?.();
      unsubFirestore();
      appStateSub.remove();
      billingService.close();
    };
  }, [user?.uid, setSubscribed, checkSubscriptionStatus]);

  // Check for pending alert data from native AlertLauncher module.
  // When the app is brought to foreground by AlertLauncher (SYSTEM_ALERT_WINDOW),
  // it stores alert data that we consume here to navigate to AlertOverlay.
  // Also processes pending Notifee background press events.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    function checkPendingAlert() {
      NativeModules.AlertLauncher?.getPendingAlert()
        .then((data: Record<string, string> | null) => {
          if (!data?.fullscreen) return;

          const tryNavigate = setInterval(() => {
            if (!navigationRef.isReady()) return;
            clearInterval(tryNavigate);
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
          }, 100);

          setTimeout(() => clearInterval(tryNavigate), 5000);
        })
        .catch(() => {});
    }

    async function checkPendingNotifeePress() {
      try {
        const stored = await AsyncStorage.getItem(PENDING_NOTIFEE_KEY);
        if (!stored) return;
        await AsyncStorage.removeItem(PENDING_NOTIFEE_KEY);
        const data = JSON.parse(stored) as Record<string, string>;
        navigateFromNotificationData(data);
      } catch {}
    }

    function navigateFromNotificationData(data: Record<string, string>) {
      const tryNavigate = setInterval(() => {
        if (!navigationRef.isReady()) return;
        clearInterval(tryNavigate);

        if (data.fullscreen === '1') {
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
        } else if (data.screen === 'invites') {
          navigationRef.navigate('Invites');
        }
      }, 100);
      setTimeout(() => clearInterval(tryNavigate), 5000);
    }

    // Check immediately on mount
    checkPendingAlert();
    checkPendingNotifeePress();

    // Check whenever app comes to foreground
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        checkPendingAlert();

        // Small delay to let onBackgroundEvent finish writing to AsyncStorage
        setTimeout(() => checkPendingNotifeePress(), 500);

        // Check Notifee initial notification (captures tap that brought app to foreground)
        try {
          const initial = await notifee.getInitialNotification();
          if (initial?.notification?.data) {
            const data = initial.notification.data as Record<string, string>;
            navigateFromNotificationData(data);
          }
        } catch {}

        // If there's an active alert that hasn't been dismissed, re-navigate to it
        const active = await notificationService.getActiveAlert();
        if (active && navigationRef.isReady()) {
          navigationRef.navigate('AlertOverlay', {
            alertData: {
              alertId: active.alertId,
              type: active.type,
              userId: active.userId,
              userName: active.userName,
              userPhotoURL: active.userPhotoURL || '',
              lat: active.lat,
              lng: active.lng,
              address: active.address,
              customMessage: active.customMessage || '',
            },
          });
        }
      }
    });

    return () => sub.remove();
  }, []);

  // FCM foreground message handler
  useEffect(() => {
    const unsubMessage = messaging().onMessage(async (remoteMessage) => {
      const data = remoteMessage.data;
      if (!data) return;

      if (data.fullscreen === '1') {
        const prefs = await preferencesService.getPreferences();
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
        }, prefs);

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

    // Note: messaging().onNotificationOpenedApp() is NOT used because all
    // notifications are created via Notifee (not FCM). Notifee handles tap
    // events via onBackgroundEvent (index.js) and setupForegroundEvent.

    // Also check Notifee initial notification (for full-screen intent or Notifee press)
    notifee.getInitialNotification().then((initialNotification) => {
      if (initialNotification?.notification?.data) {
        pendingNotifeeInitial.current = initialNotification.notification.data as Record<string, string>;
      }
    });

    // Notifee foreground event handler
    const unsubNotifee = notificationService.setupForegroundEvent(
      (data) => {
        if (navigationRef.isReady()) {
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
      },
      () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('Invites');
        }
      },
    );

    return () => {
      unsubMessage();
      unsubNotifee();
    };
  }, []);

  // Process pending Notifee initial notification after auth is ready.
  // Handles notification press / full-screen intent that launched the app.
  useEffect(() => {
    if (!user) return;

    const data = pendingNotifeeInitial.current;
    pendingNotifeeInitial.current = null;

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
        <KeyboardAvoidingView
          style={appStyles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          {!isConnected && <OfflineBanner />}
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </KeyboardAvoidingView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const appStyles = StyleSheet.create({
  flex: { flex: 1 },
});

export default App;
