import firestore from '@react-native-firebase/firestore';
import type { Alert, AlertType } from '@alertaki/shared';

interface CreateAlertParams {
  userId: string;
  userEmail: string;
  type: AlertType;
  lat: number;
  lng: number;
  customMessage?: string;
  selectedContacts?: string[];
}

async function createAlert(params: CreateAlertParams): Promise<string> {
  const alertData = {
    userId: params.userId,
    userEmail: params.userEmail,
    type: params.type,
    lat: params.lat,
    lng: params.lng,
    radiusKm: params.type === 'custom' ? 0 : 5,
    customMessage: params.customMessage || null,
    selectedContacts: params.selectedContacts || null,
    createdAt: firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await firestore().collection('alerts').add(alertData);
  return docRef.id;
}

async function getSentAlerts(userId: string): Promise<Alert[]> {
  const snap = await firestore()
    .collection('alerts')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Alert[];
}

interface ReceivedAlertItem {
  alert: Alert;
  source: string;
  receivedAt: FirebaseFirestoreTypes.Timestamp;
}

import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

async function getReceivedAlerts(uid: string): Promise<ReceivedAlertItem[]> {
  const recipientSnap = await firestore()
    .collectionGroup('recipients')
    .where('uid', '==', uid)
    .orderBy('receivedAt', 'desc')
    .get();

  const results: ReceivedAlertItem[] = [];

  for (const recipientDoc of recipientSnap.docs) {
    const alertRef = recipientDoc.ref.parent.parent;
    if (!alertRef) continue;

    const alertDoc = await alertRef.get();
    if (!alertDoc.exists) continue;

    results.push({
      alert: { id: alertDoc.id, ...alertDoc.data() } as Alert,
      source: recipientDoc.data().source,
      receivedAt: recipientDoc.data().receivedAt,
    });
  }

  return results;
}

export const alertService = {
  createAlert,
  getSentAlerts,
  getReceivedAlerts,
};

export type { ReceivedAlertItem };
