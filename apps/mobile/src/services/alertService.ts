import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Alert, AlertType } from '@alertaki/shared';

const PAGE_SIZE = 20;

interface CreateAlertParams {
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoURL: string | null;
  type: AlertType;
  lat: number;
  lng: number;
  customMessage?: string;
  selectedContacts?: string[];
}

const BR_STATE_ABBR: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
  'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
  'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', 'Rondônia': 'RO',
  'Roraima': 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
  'Sergipe': 'SE', 'Tocantins': 'TO',
};

function formatAddress(data: Record<string, unknown>): string | null {
  const addr = data.address as Record<string, string> | undefined;
  if (!addr) return data.display_name as string || null;

  const road = addr.road || addr.pedestrian || addr.street || '';
  const number = addr.house_number || '';
  const suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
  const city = addr.city || addr.town || addr.village || addr.municipality || '';
  const state = addr.state || '';
  const postcode = addr.postcode || '';

  const stateAbbr = BR_STATE_ABBR[state] || state;

  const parts: string[] = [];
  if (road) {
    parts.push(number ? `${road}, ${number}` : road);
  }
  if (suburb) {
    parts.push(suburb);
  }
  const cityState = city && stateAbbr ? `${city} - ${stateAbbr}` : city || stateAbbr;
  if (cityState) {
    parts.push(cityState);
  }
  if (postcode) {
    parts.push(postcode);
  }

  if (parts.length === 0) return data.display_name as string || null;

  // Join with " - " between road/number and suburb, then ", " for city/postcode
  if (parts.length >= 2 && road && suburb) {
    return `${parts[0]} - ${parts.slice(1).join(', ')}`;
  }
  return parts.join(', ');
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'Alertaki/1.0' } },
    );
    const data = await res.json();
    return formatAddress(data);
  } catch {
    return null;
  }
}

async function createAlert(params: CreateAlertParams): Promise<string> {
  const address = await reverseGeocode(params.lat, params.lng);

  const alertData = {
    userId: params.userId,
    userName: params.userName || '',
    userEmail: params.userEmail || '',
    userPhotoURL: params.userPhotoURL || null,
    type: params.type,
    lat: params.lat,
    lng: params.lng,
    address,
    radiusKm: params.type === 'custom' ? 0 : 5,
    customMessage: params.customMessage || null,
    selectedContacts: params.selectedContacts || null,
    createdAt: new Date(),
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
