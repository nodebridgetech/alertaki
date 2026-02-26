import firestore from '@react-native-firebase/firestore';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { User } from '@alertaki/shared';

async function upsertUser(
  firebaseUser: FirebaseAuthTypes.User,
  displayNameOverride?: string,
): Promise<void> {
  const userRef = firestore().collection('users').doc(firebaseUser.uid);
  const now = new Date();

  // Always use set with merge to avoid firestore/not-found errors
  // when local cache thinks doc exists but server doc was deleted
  await userRef.set(
    {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: displayNameOverride || firebaseUser.displayName || '',
      phoneNumber: firebaseUser.phoneNumber || null,
      photoURL: firebaseUser.photoURL || null,
      updatedAt: now,
    },
    { merge: true },
  );

  // Ensure default fields exist for new documents
  const doc = await userRef.get();
  const data = doc.data();
  if (!data?.createdAt) {
    await userRef.set(
      {
        tokens: data?.tokens || [],
        tokenUpdatedAt: now,
        lastLocation: data?.lastLocation || null,
        locationUpdatedAt: data?.locationUpdatedAt || null,
        createdAt: now,
      },
      { merge: true },
    );
  }
}

async function getUser(uid: string): Promise<User | null> {
  const doc = await firestore().collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return { ...doc.data(), uid: doc.id } as User;
}

async function updateProfile(
  uid: string,
  data: Partial<Pick<User, 'displayName' | 'phoneNumber' | 'photoURL' | 'email' | 'cpf' | 'address'>>,
): Promise<void> {
  await firestore()
    .collection('users')
    .doc(uid)
    .update({
      ...data,
      updatedAt: new Date(),
    });
}

async function updateLocation(uid: string, lat: number, lng: number): Promise<void> {
  await firestore().collection('users').doc(uid).update({
    lastLocation: { lat, lng },
    locationUpdatedAt: new Date(),
  });
}

async function findUserByEmail(email: string): Promise<User | null> {
  const snap = await firestore().collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  return { ...snap.docs[0].data(), uid: snap.docs[0].id } as User;
}

async function findUserByPhone(phone: string): Promise<User | null> {
  const snap = await firestore()
    .collection('users')
    .where('phoneNumber', '==', phone)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { ...snap.docs[0].data(), uid: snap.docs[0].id } as User;
}

export const userService = {
  upsertUser,
  getUser,
  updateProfile,
  updateLocation,
  findUserByEmail,
  findUserByPhone,
};
