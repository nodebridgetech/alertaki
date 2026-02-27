/**
 * Opaque type for Firestore Timestamp.
 * Avoids importing Firebase SDK in the shared package.
 * Both mobile and functions cast to their respective Timestamp types.
 */
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface UserAddress {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface UserSubscription {
  isActive: boolean;
  productId: string | null;
  purchaseToken: string | null;
  expiresAt: FirebaseTimestamp | null;
  startedAt: FirebaseTimestamp | null;
  autoRenewing: boolean;
  lastValidatedAt: FirebaseTimestamp | null;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  photoURL: string | null;
  cpf: string | null;
  address: UserAddress | null;
  tokens: string[];
  tokenUpdatedAt: FirebaseTimestamp;
  lastLocation: {
    lat: number;
    lng: number;
  } | null;
  locationUpdatedAt: FirebaseTimestamp | null;
  subscription: UserSubscription | null;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface Contact {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  addedAt: FirebaseTimestamp;
}

export interface ContactOf {
  ownerUid: string;
  ownerDisplayName: string;
  ownerEmail: string;
  ownerPhotoURL: string | null;
  addedAt: FirebaseTimestamp;
}

export interface BlockedUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  blockedAt: FirebaseTimestamp;
}
