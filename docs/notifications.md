# Alertaki — Notificações e Alertas em Tela

## Visão Geral

O sistema de notificações é o coração do Alertaki. Quando um alerta é disparado, os destinatários devem ser notificados de forma **intrusiva e imediata**, similar a um despertador ou chamada telefônica.

### Stack de Notificações
- **Firebase Cloud Messaging (FCM)**: Entrega de push notifications remotas.
- **Notifee** (`@notifee/react-native`): Notificações locais avançadas no Android e iOS (substituição do `flutter_local_notifications`). Suporte a full-screen intent, canais, sons, vibração contínua.

---

## Configuração de Canais (Android)

### Canal: `alert_channel`
```typescript
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';

await notifee.createChannel({
  id: 'alert_channel',
  name: 'Alertas de Emergência',
  description: 'Notificações de alertas de saúde, segurança e emergência',
  importance: AndroidImportance.HIGH,
  visibility: AndroidVisibility.PUBLIC,
  sound: 'default',
  vibration: true,
  vibrationPattern: [0, 1000, 500, 1000, 500, 1000], // vibração contínua
  lights: true,
  badge: true,
});
```

### Canal: `invite_channel`
```typescript
await notifee.createChannel({
  id: 'invite_channel',
  name: 'Convites',
  description: 'Notificações de convites de contato de segurança',
  importance: AndroidImportance.DEFAULT,
  sound: 'default',
});
```

---

## Permissões Necessárias

### Android (`AndroidManifest.xml`)
```xml
<!-- Notificações (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Full-screen intent (alerta na tela de bloqueio) -->
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

<!-- Vibração -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Acordar dispositivo -->
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Foreground service para background tasks -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- Na MainActivity -->
<activity
  android:name=".MainActivity"
  android:showOnLockScreen="true"
  android:showWhenLocked="true"
  android:turnScreenOn="true"
  ...
/>
```

### iOS (`Info.plist`)
```xml
<!-- Background modes -->
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
  <string>fetch</string>
  <string>location</string>
</array>

<!-- Critical alerts (requer entitlement da Apple) -->
<!-- Sem o entitlement, usar interruption-level: time-sensitive -->
```

---

## Fluxo de Notificação — Alerta Recebido

### Android — Full Screen Intent

```
Push chega via FCM
      │
      ▼
┌──────────────────────────────────────┐
│ NotificationService.onMessage()       │
│ ou onBackgroundMessage()              │
├──────────────────────────────────────┤
│ 1. Cria notificação via Notifee      │
│    - fullScreenAction configurado    │
│    - canal: alert_channel            │
│    - ongoing: true (não dismissível) │
│    - som: padrão do dispositivo      │
│    - vibração: contínua              │
│                                      │
│ 2. SE app em foreground:             │
│    → Navega direto para              │
│      AlertOverlayScreen              │
│                                      │
│ 3. SE app em background/terminado:   │
│    → Android exibe full-screen       │
│      intent (tela cheia)             │
│    → Toque do dispositivo toca       │
│    → Vibração contínua               │
│    → Tela liga automaticamente       │
└──────────────────────────────────────┘
```

### iOS — Critical/Time-Sensitive Alert

```
Push chega via APNs (via FCM)
      │
      ▼
┌──────────────────────────────────────┐
│ 1. Notificação aparece como banner   │
│    - interruption-level: critical    │
│      (ou time-sensitive sem          │
│       entitlement)                   │
│    - Som padrão                      │
│    - Ignora modo silencioso          │
│      (se critical)                   │
│                                      │
│ 2. SE app em foreground:             │
│    → Navega direto para              │
│      AlertOverlayScreen              │
│                                      │
│ 3. Usuário toca na notificação:      │
│    → Abre AlertOverlayScreen         │
└──────────────────────────────────────┘
```

**Nota iOS**: O comportamento no iOS é mais limitado que no Android. Não é possível forçar uma sobreposição de tela cheia. O máximo é uma notificação crítica que toca mesmo com o telefone no silencioso. Para o entitlement de Critical Alerts, é necessário solicitar à Apple com justificativa (app de emergência/segurança).

---

## Código de Exibição de Notificação Local (Notifee)

### Notificação Full-Screen (Android)

```typescript
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';

async function showAlertNotification(data: AlertNotificationData) {
  await notifee.displayNotification({
    title: data.title,
    body: data.body,
    data: {
      alertId: data.alertId,
      type: data.type,
      lat: data.lat,
      lng: data.lng,
      userName: data.userName,
      address: data.address,
      customMessage: data.customMessage || '',
    },
    android: {
      channelId: 'alert_channel',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      category: AndroidCategory.ALARM,
      fullScreenAction: {
        id: 'default',
        launchActivity: 'default',
      },
      ongoing: true,            // Não pode ser dismissido com swipe
      autoCancel: false,        // Não cancela ao tocar
      sound: 'default',
      vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      loopSound: true,          // Som em loop
    },
    ios: {
      sound: 'default',
      critical: true,           // Requer entitlement
      criticalVolume: 1.0,
      interruptionLevel: 'critical',
    },
  });
}
```

### Cancelar Notificação (ao dispensar o overlay)

```typescript
// Quando o usuário toca em "Dispensar" no AlertOverlayScreen
async function dismissAlertNotification() {
  // Para a vibração
  Vibration.cancel();

  // Cancela todas as notificações de alerta ativas
  await notifee.cancelAllNotifications();
}
```

---

## Vibração Contínua

Como o React Native `Vibration` API tem limitações, implementamos vibração contínua usando um loop:

```typescript
import { Vibration, Platform } from 'react-native';

// Android: padrão de vibração em loop
const VIBRATION_PATTERN = [0, 1000, 500, 1000, 500, 1000];

function startContinuousVibration() {
  if (Platform.OS === 'android') {
    // O segundo parâmetro 'true' ativa o loop
    Vibration.vibrate(VIBRATION_PATTERN, true);
  } else {
    // iOS não suporta vibração em loop nativo,
    // então usamos um interval
    vibrationInterval = setInterval(() => {
      Vibration.vibrate(1000);
    }, 1500);
  }
}

function stopVibration() {
  Vibration.cancel();
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
}
```

---

## Gerenciamento de Tokens FCM

### Salvar Token no Login/Startup

```typescript
async function saveFcmToken(uid: string) {
  const token = await messaging().getToken();
  const userRef = firestore().collection('users').doc(uid);

  await userRef.update({
    tokens: firestore.FieldValue.arrayUnion(token),
    tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
  });
}
```

### Monitorar Refresh de Token

```typescript
messaging().onTokenRefresh(async (newToken) => {
  const uid = auth().currentUser?.uid;
  if (uid) {
    await saveFcmToken(uid);
  }
});
```

### Remover Token no Logout

```typescript
async function removeFcmToken(uid: string) {
  const token = await messaging().getToken();
  const userRef = firestore().collection('users').doc(uid);

  await userRef.update({
    tokens: firestore.FieldValue.arrayRemove(token),
  });
}
```

---

## Handlers de Notificação

### Setup Inicial (App.tsx)

```typescript
// 1. Foreground handler
messaging().onMessage(async (remoteMessage) => {
  const data = remoteMessage.data;
  if (data?.fullscreen === '1') {
    // Exibe notificação local fullscreen
    await showAlertNotification(data);
    // Se o app está em foreground, navega diretamente
    navigationRef.navigate('AlertOverlay', { alertData: data });
  }
});

// 2. Background handler (registrado fora do componente)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  const data = remoteMessage.data;
  if (data?.fullscreen === '1') {
    await showAlertNotification(data);
  }
});

// 3. Notificação tocada (app em background)
messaging().onNotificationOpenedApp((remoteMessage) => {
  const data = remoteMessage.data;
  navigationRef.navigate('AlertOverlay', { alertData: data });
});

// 4. Notificação tocada (app terminado)
messaging().getInitialNotification().then((remoteMessage) => {
  if (remoteMessage?.data) {
    // Salvar para navegar após o app carregar
    initialNotificationData = remoteMessage.data;
  }
});

// 5. Notifee foreground event (para quando toca na notificação local)
notifee.onForegroundEvent(({ type, detail }) => {
  if (type === EventType.PRESS) {
    navigationRef.navigate('AlertOverlay', { alertData: detail.notification?.data });
    notifee.cancelAllNotifications();
  }
});

// 6. Notifee background event
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    // Navegar será tratado ao abrir o app
  }
});
```

---

## Notificação de Convite

Convites usam uma notificação simples (não fullscreen):

```typescript
// Cloud Function envia com data: { screen: 'invites' }
// No cliente, ao receber:
if (data?.screen === 'invites') {
  await notifee.displayNotification({
    title: 'Novo convite de segurança',
    body: `${data.fromEmail} quer ser seu contato de segurança`,
    android: {
      channelId: 'invite_channel',
      pressAction: { id: 'default' },
    },
  });
}
```

---

## Checklist de Configuração

- [ ] Criar projeto Firebase e habilitar Cloud Messaging.
- [ ] Configurar `google-services.json` (Android) e `GoogleService-Info.plist` (iOS).
- [ ] Configurar canais de notificação no startup do app.
- [ ] Solicitar permissão `POST_NOTIFICATIONS` no Android 13+.
- [ ] Solicitar permissão de notificações no iOS.
- [ ] Configurar `AndroidManifest.xml` com permissões e flags.
- [ ] Configurar `Info.plist` com background modes.
- [ ] (Opcional) Solicitar entitlement de Critical Alerts à Apple.
- [ ] Testar em dispositivo físico (emuladores não suportam push completo).
