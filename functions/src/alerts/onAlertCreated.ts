import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { haversineDistance } from '../utils/haversine';
import { chunkArray, getAlertTitle, getAlertBody, reverseGeocode } from '../utils/helpers';

function isSubscriptionActive(userData: FirebaseFirestore.DocumentData | undefined): boolean {
  if (!userData) return false;
  const sub = userData.subscription;
  if (!sub || !sub.isActive) return false;
  if (!sub.expiresAt) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return sub.expiresAt.seconds > nowSeconds;
}

export const onAlertCreated = onDocumentCreated('alerts/{alertId}', async (event) => {
  const alertId = event.params.alertId;
  const alertData = event.data?.data();
  if (!alertData) return;

  const db = getFirestore();
  const messaging = getMessaging();

  // 1. Fetch sender data and update alert
  const senderDoc = await db.collection('users').doc(alertData.userId).get();
  const sender = senderDoc.data();

  // Defense-in-depth: sender must have an active subscription
  if (!isSubscriptionActive(sender)) {
    console.info(`onAlertCreated: sender ${alertData.userId} has no active subscription. Alert suppressed.`);
    return;
  }

  await event.data!.ref.update({
    userName: sender?.displayName || 'Usuário',
    userPhotoURL: sender?.photoURL || null,
    userEmail: sender?.email || alertData.userEmail || '',
  });

  // 2. Determine recipients
  const recipientUids = new Set<string>();
  let contactUids = new Set<string>();

  if (alertData.type === 'custom') {
    const selectedContacts: string[] = alertData.selectedContacts || [];
    for (const uid of selectedContacts) {
      recipientUids.add(uid);
    }
  } else {
    // Fetch security contacts
    const contactsSnap = await db
      .collection('users')
      .doc(alertData.userId)
      .collection('contacts')
      .get();
    contactsSnap.forEach((doc) => {
      recipientUids.add(doc.id);
      contactUids.add(doc.id);
    });

    // Fetch nearby users
    const nearbyUsers = await findNearbyUsers(
      db,
      alertData.lat,
      alertData.lng,
      alertData.radiusKm || 2,
    );
    nearbyUsers.forEach((uid) => recipientUids.add(uid));
  }

  // Remove sender
  recipientUids.delete(alertData.userId);
  if (recipientUids.size === 0) return;

  // 3. Check blocks and collect tokens
  const validRecipients: string[] = [];
  const allTokens: string[] = [];
  const tokenToUid = new Map<string, string>();

  for (const uid of recipientUids) {
    // Check if recipient blocked the sender
    const blockedDoc = await db
      .collection('users')
      .doc(uid)
      .collection('blockedUsers')
      .doc(alertData.userId)
      .get();
    if (blockedDoc.exists) continue;

    // Fetch recipient data for subscription + preference checks
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    // Skip recipients without active subscription
    if (!isSubscriptionActive(userData)) continue;

    // Skip proximity-only recipients who opted out of proximity alerts
    const isContactRecipient = contactUids.has(uid);
    if (!isContactRecipient) {
      const receiveProximity = userData?.alertPreferences?.receiveProximityAlerts === true;
      if (!receiveProximity) continue;
    }

    validRecipients.push(uid);
    const tokens: string[] = userData?.tokens || [];
    tokens.forEach((token) => {
      allTokens.push(token);
      tokenToUid.set(token, uid);
    });
  }

  if (validRecipients.length === 0) return;

  // 4. Create recipients subcollection
  const batch = db.batch();
  for (const uid of validRecipients) {
    const recipientRef = db.collection('alerts').doc(alertId).collection('recipients').doc(uid);
    batch.set(recipientRef, {
      uid,
      receivedAt: FieldValue.serverTimestamp(),
      source: contactUids.has(uid) ? 'contact' : 'proximity',
    });
  }
  await batch.commit();

  // 5. Reverse geocoding
  const address = await reverseGeocode(alertData.lat, alertData.lng);
  if (address) {
    await event.data!.ref.update({ address });
  }

  // 6. Build and send notifications
  const title = getAlertTitle(alertData.type);
  const body = getAlertBody(alertData.type, sender?.displayName, alertData.customMessage);

  const chunks = chunkArray(allTokens, 100);
  const invalidTokens: string[] = [];

  for (const chunk of chunks) {
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      // Data-only message: NO "notification" field.
      // This ensures setBackgroundMessageHandler fires on Android and we control
      // notification display via Notifee (with fullScreenAction for overlay).
      // Having a competing FCM notification causes Android rate-limiting
      // (DISABLE_HEADS_UP) which blocks the full-screen intent.
      data: {
        alertId,
        type: alertData.type,
        userId: alertData.userId,
        userName: sender?.displayName || 'Usuário',
        userPhotoURL: sender?.photoURL || '',
        lat: String(alertData.lat),
        lng: String(alertData.lng),
        address: address || 'Endereço indisponível',
        customMessage: alertData.customMessage || '',
        fullscreen: '1',
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            'interruption-level': 'critical',
            'content-available': 1,
          },
        },
      },
    });

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(chunk[idx]);
      }
    });
  }

  // 7. Clean up invalid tokens
  for (const token of invalidTokens) {
    const uid = tokenToUid.get(token);
    if (uid) {
      await db
        .collection('users')
        .doc(uid)
        .update({ tokens: FieldValue.arrayRemove(token) });
    }
  }
});

async function findNearbyUsers(
  db: FirebaseFirestore.Firestore,
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<string[]> {
  const snapshot = await db
    .collection('users')
    .where('locationUpdatedAt', '!=', null)
    .orderBy('locationUpdatedAt', 'desc')
    .limit(500)
    .get();

  const nearbyUids: string[] = [];
  snapshot.forEach((doc) => {
    const userData = doc.data();
    if (userData.lastLocation) {
      const distance = haversineDistance(
        lat,
        lng,
        userData.lastLocation.lat,
        userData.lastLocation.lng,
      );
      if (distance <= radiusKm) {
        nearbyUids.push(doc.id);
      }
    }
  });
  return nearbyUids;
}
