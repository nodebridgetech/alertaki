import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Alert, AlertType } from '@alertaki/shared';

const PAGE_SIZE = 20;

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

interface PaginatedResult<T> {
  items: T[];
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  hasMore: boolean;
}

async function getSentAlerts(
  userId: string,
  lastDoc?: FirebaseFirestoreTypes.QueryDocumentSnapshot | null,
): Promise<PaginatedResult<Alert>> {
  let query = firestore()
    .collection('alerts')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(PAGE_SIZE);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snap = await query.get();

  const items = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Alert[];

  return {
    items,
    lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

interface ReceivedAlertItem {
  alert: Alert;
  source: string;
  receivedAt: FirebaseFirestoreTypes.Timestamp;
}

async function getReceivedAlerts(
  uid: string,
  lastDoc?: FirebaseFirestoreTypes.QueryDocumentSnapshot | null,
): Promise<PaginatedResult<ReceivedAlertItem>> {
  let query = firestore()
    .collectionGroup('recipients')
    .where('uid', '==', uid)
    .orderBy('receivedAt', 'desc')
    .limit(PAGE_SIZE);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const recipientSnap = await query.get();

  const items: ReceivedAlertItem[] = [];

  for (const recipientDoc of recipientSnap.docs) {
    const alertRef = recipientDoc.ref.parent.parent;
    if (!alertRef) continue;

    const alertDoc = await alertRef.get();
    if (!alertDoc.exists) continue;

    items.push({
      alert: { id: alertDoc.id, ...alertDoc.data() } as Alert,
      source: recipientDoc.data().source,
      receivedAt: recipientDoc.data().receivedAt,
    });
  }

  return {
    items,
    lastDoc: recipientSnap.docs.length > 0 ? recipientSnap.docs[recipientSnap.docs.length - 1] : null,
    hasMore: recipientSnap.docs.length === PAGE_SIZE,
  };
}

export const alertService = {
  createAlert,
  getSentAlerts,
  getReceivedAlerts,
};

export type { ReceivedAlertItem, PaginatedResult };
