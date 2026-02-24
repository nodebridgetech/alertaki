import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  EventType,
} from '@notifee/react-native';
import { Platform, Vibration } from 'react-native';

let vibrationInterval: ReturnType<typeof setInterval> | null = null;

const VIBRATION_PATTERN = [0, 1000, 500, 1000, 500, 1000];

async function requestPermission(): Promise<boolean> {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

async function createChannels(): Promise<void> {
  await notifee.createChannel({
    id: 'alert_channel',
    name: 'Alertas de Emergência',
    description: 'Notificações de alertas de saúde, segurança e emergência',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    vibration: true,
    vibrationPattern: VIBRATION_PATTERN,
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
      const userDoc = await firestore().collection('users').doc(uid).get();
      if (userDoc.exists) {
        await firestore()
          .collection('users')
          .doc(uid)
          .update({
            tokens: firestore.FieldValue.arrayUnion(token),
            tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
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
        tokens: firestore.FieldValue.arrayRemove(token),
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

async function showAlertNotification(data: AlertNotificationData): Promise<void> {
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
      channelId: 'alert_channel',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      category: AndroidCategory.ALARM,
      fullScreenAction: { id: 'default', launchActivity: 'default' },
      ongoing: true,
      autoCancel: false,
      sound: 'default',
      vibrationPattern: VIBRATION_PATTERN,
      pressAction: { id: 'default', launchActivity: 'default' },
      loopSound: true,
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
    title: 'Novo convite de segurança',
    body: `${fromName || fromEmail} quer ser seu contato de segurança`,
    data: { screen: 'invites' },
    android: {
      channelId: 'invite_channel',
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

function setupForegroundEvent(onAlertPress: (data: Record<string, string>) => void): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      onAlertPress(detail.notification.data as Record<string, string>);
      notifee.cancelAllNotifications();
      stopVibration();
    }
  });
}

export const notificationService = {
  requestPermission,
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
