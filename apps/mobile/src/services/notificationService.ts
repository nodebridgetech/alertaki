import messaging from '@react-native-firebase/messaging';
import firestore, { FieldValue } from '@react-native-firebase/firestore';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  EventType,
} from '@notifee/react-native';
import { Alert, Linking, NativeModules, Platform, Vibration } from 'react-native';
import { stopAlertSound, stopStrobe } from './nativeModules';

let vibrationInterval: ReturnType<typeof setInterval> | null = null;

const VIBRATION_PATTERN = [1, 1000, 500, 1000, 500, 1000];

async function isNotificationPermissionGranted(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return (
    settings.authorizationStatus === 1 || // AUTHORIZED
    settings.authorizationStatus === 2    // PROVISIONAL
  );
}

async function isOverlayPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return await NativeModules.AlertLauncher.canDrawOverlays();
  } catch {
    return false;
  }
}

async function requestPermission(): Promise<boolean> {
  // Use Notifee for Android 13+ (handles POST_NOTIFICATIONS properly)
  const settings = await notifee.requestPermission();
  const authorized =
    settings.authorizationStatus === 1 || // AUTHORIZED
    settings.authorizationStatus === 2;   // PROVISIONAL

  if (!authorized && Platform.OS === 'android') {
    Alert.alert(
      'Notificações desativadas',
      'O Alertaki precisa de notificações para enviar alertas de segurança. Sem elas, você não receberá avisos de emergência dos seus contatos.',
      [
        { text: 'Agora não', style: 'cancel' },
        {
          text: 'Ativar nas Configurações',
          onPress: () => Linking.openSettings(),
        },
      ],
    );
  }

  // Also request Firebase messaging permission for iOS
  if (Platform.OS === 'ios') {
    await messaging().requestPermission();
  }

  return authorized;
}

async function createChannels(): Promise<void> {
  // Legacy channel (kept for existing installs, no longer used for new alerts)
  await notifee.createChannel({
    id: 'alert_channel',
    name: 'Alertas de Emergência (Legado)',
    description: 'Canal legado - alertas agora usam alert_channel_v2',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    vibration: true,
    vibrationPattern: VIBRATION_PATTERN,
    lights: true,
    badge: true,
  });

  // New channel: sound handled by AlertAudioModule (bypasses silent mode)
  await notifee.createChannel({
    id: 'alert_channel_v2',
    name: 'Alertas de Emergência',
    description: 'Notificações de alertas de saúde, segurança e emergência',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'none',
    vibration: true,
    vibrationPattern: VIBRATION_PATTERN,
    lights: true,
    badge: true,
  });

  // Silent channel: no sound, no vibration (both handled manually)
  await notifee.createChannel({
    id: 'alert_channel_silent',
    name: 'Alertas de Emergência (Silencioso)',
    description: 'Canal para alertas sem vibração do sistema',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'none',
    vibration: false,
    lights: true,
    badge: true,
  });

  await notifee.createChannel({
    id: 'invite_channel',
    name: 'Convites',
    description: 'Notificações de convites de contatos de segurança',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

async function saveFcmToken(uid: string, retries = 3): Promise<void> {
  const token = await messaging().getToken();
  for (let i = 0; i < retries; i++) {
    try {
      const userDoc = await firestore().collection('users').doc(uid).get({ source: 'server' });
      if (userDoc.exists) {
        await firestore()
          .collection('users')
          .doc(uid)
          .update({
            tokens: FieldValue.arrayUnion(token),
            tokenUpdatedAt: new Date(),
          });
        return;
      }
      // Doc ainda não existe — espera e tenta novamente
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    } catch {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
}

async function removeFcmToken(uid: string): Promise<void> {
  try {
    const token = await messaging().getToken();
    await firestore()
      .collection('users')
      .doc(uid)
      .update({
        tokens: FieldValue.arrayRemove(token),
      });
  } catch {
    // Token removal may fail if user is being deleted
  }
}

function onTokenRefresh(uid: string): () => void {
  return messaging().onTokenRefresh(async () => {
    await saveFcmToken(uid);
  });
}

interface AlertNotificationData {
  alertId: string;
  type: string;
  lat: string;
  lng: string;
  userName: string;
  userPhotoURL?: string;
  address: string;
  customMessage?: string;
  userId: string;
}

interface AlertPrefs {
  sound?: boolean;
  vibration?: boolean;
}

async function showAlertNotification(data: AlertNotificationData, prefs?: AlertPrefs): Promise<void> {
  const titleMap: Record<string, string> = {
    health: '🏥 Alerta de Saúde!',
    security: '🛡️ Alerta de Segurança!',
    custom: '⚠️ Alerta de Emergência!',
  };

  const bodyMap: Record<string, string> = {
    health: `${data.userName} precisa de ajuda médica!`,
    security: `${data.userName} está em perigo!`,
    custom: data.customMessage
      ? `${data.userName}: ${data.customMessage.substring(0, 100)}`
      : `${data.userName} enviou um alerta de emergência!`,
  };

  // Select channel based on vibration preference
  // Sound is handled by AlertAudioModule (bypasses silent mode), not the channel
  const useVibration = prefs?.vibration !== false;
  const channelId = useVibration ? 'alert_channel_v2' : 'alert_channel_silent';

  await notifee.displayNotification({
    title: titleMap[data.type] || '🚨 Alerta!',
    body: bodyMap[data.type] || `${data.userName} enviou um alerta!`,
    data: {
      alertId: data.alertId,
      type: data.type,
      lat: data.lat,
      lng: data.lng,
      userName: data.userName,
      userPhotoURL: data.userPhotoURL || '',
      address: data.address,
      customMessage: data.customMessage || '',
      userId: data.userId,
      fullscreen: '1',
    },
    android: {
      channelId,
      smallIcon: 'ic_launcher',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      category: AndroidCategory.ALARM,
      fullScreenAction: {
        id: 'default',
        mainComponent: 'full-screen-alert',
      },
      ongoing: true,
      autoCancel: false,
      sound: 'none',
      pressAction: { id: 'default', launchActivity: 'default' },
    },
    ios: {
      sound: 'default',
      critical: true,
      criticalVolume: 1.0,
      interruptionLevel: 'critical',
    },
  });
}

async function showInviteNotification(fromName: string, fromEmail: string): Promise<void> {
  await notifee.displayNotification({
    title: 'Novo convite!',
    body: `${fromName || fromEmail} quer ser seu contato de segurança`,
    data: { screen: 'invites' },
    android: {
      channelId: 'invite_channel',
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
    ios: {
      sound: 'default',
      interruptionLevel: 'timeSensitive',
    },
  });
}

async function dismissAlertNotification(): Promise<void> {
  stopVibration();
  stopAlertSound();
  stopStrobe();
  await notifee.cancelAllNotifications();
}

function startContinuousVibration(): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(VIBRATION_PATTERN, true);
  } else {
    vibrationInterval = setInterval(() => {
      Vibration.vibrate(1000);
    }, 1500);
  }
}

function stopVibration(): void {
  Vibration.cancel();
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
}

function setupForegroundEvent(
  onAlertPress: (data: Record<string, string>) => void,
  onInvitePress?: () => void,
): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      const data = detail.notification.data as Record<string, string>;
      if (data.fullscreen === '1') {
        onAlertPress(data);
      } else if (data.screen === 'invites' && onInvitePress) {
        onInvitePress();
      }
      notifee.cancelAllNotifications();
      stopVibration();
      stopAlertSound();
      stopStrobe();
    }
  });
}

function requestOverlayPermission(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();

  return new Promise<void>((resolve) => {
    Alert.alert(
      'Permissão importante',
      'Para que alertas de emergência apareçam imediatamente por cima de qualquer app, ative "Exibir sobre outros apps" para o Alertaki.',
      [
        { text: 'Agora não', style: 'cancel', onPress: () => resolve() },
        {
          text: 'Ativar',
          onPress: () => {
            Linking.sendIntent(
              'android.settings.action.MANAGE_OVERLAY_PERMISSION',
              [{ key: 'package', value: 'com.alertaki' }],
            ).catch(() => Linking.openSettings());
            resolve();
          },
        },
      ],
    );
  });
}

export const notificationService = {
  isNotificationPermissionGranted,
  isOverlayPermissionGranted,
  requestPermission,
  requestOverlayPermission,
  createChannels,
  saveFcmToken,
  removeFcmToken,
  onTokenRefresh,
  showAlertNotification,
  showInviteNotification,
  dismissAlertNotification,
  startContinuousVibration,
  stopVibration,
  setupForegroundEvent,
};
