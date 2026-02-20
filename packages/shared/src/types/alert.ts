import { FirebaseTimestamp } from './user';

export type AlertType = 'health' | 'security' | 'custom';

export interface Alert {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoURL: string | null;
  type: AlertType;
  lat: number;
  lng: number;
  address: string | null;
  radiusKm: number;
  customMessage: string | null;
  createdAt: FirebaseTimestamp;
}

export type RecipientSource = 'contact' | 'proximity';

export interface AlertRecipient {
  uid: string;
  receivedAt: FirebaseTimestamp;
  source: RecipientSource;
}
