/**
 * Opaque type for Firestore Timestamp.
 * Avoids importing Firebase SDK in the shared package.
 * Both mobile and functions cast to their respective Timestamp types.
 */
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  photoURL: string | null;
  tokens: string[];
  tokenUpdatedAt: FirebaseTimestamp;
  lastLocation: {
    lat: number;
    lng: number;
  } | null;
  locationUpdatedAt: FirebaseTimestamp | null;
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
