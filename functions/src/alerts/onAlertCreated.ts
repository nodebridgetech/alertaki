import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { haversineDistance } from '../utils/haversine';
import { chunkArray, getAlertTitle, getAlertBody, reverseGeocode } from '../utils/helpers';

export const onAlertCreated = onDocumentCreated('alerts/{alertId}', async (event) => {
  const alertId = event.params.alertId;
  const alertData = event.data?.data();
  if (!alertData) return;

  const db = getFirestore();
  const messaging = getMessaging();

  // 1. Fetch sender data and update alert
  const senderDoc = await db.collection('users').doc(alertData.userId).get();
  const sender = senderDoc.data();

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
      alertData.radiusKm || 5,
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
    const blockedDoc = await db
      .collection('users')
      .doc(uid)
      .collection('blockedUsers')
      .doc(alertData.userId)
      .get();
    if (blockedDoc.exists) continue;

    validRecipients.push(uid);
    const userDoc = await db.collection('users').doc(uid).get();
    const tokens: string[] = userDoc.data()?.tokens || [];
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
      notification: { title, body },
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
        notification: {
          channelId: 'alert_channel',
          visibility: 'public',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
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
