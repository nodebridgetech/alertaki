import firestore from '@react-native-firebase/firestore';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { User } from '@alertaki/shared';

async function upsertUser(
  firebaseUser: FirebaseAuthTypes.User,
  displayNameOverride?: string,
): Promise<void> {
  const userRef = firestore().collection('users').doc(firebaseUser.uid);
  const doc = await userRef.get();

  if (doc.exists) {
    await userRef.update({
      displayName: displayNameOverride || firebaseUser.displayName || doc.data()?.displayName || '',
      photoURL: firebaseUser.photoURL || doc.data()?.photoURL || null,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } else {
    const userData: Omit<User, 'createdAt' | 'updatedAt' | 'tokenUpdatedAt'> & {
      createdAt: ReturnType<typeof firestore.FieldValue.serverTimestamp>;
      updatedAt: ReturnType<typeof firestore.FieldValue.serverTimestamp>;
      tokenUpdatedAt: ReturnType<typeof firestore.FieldValue.serverTimestamp>;
    } = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: displayNameOverride || firebaseUser.displayName || '',
      phoneNumber: firebaseUser.phoneNumber || null,
      photoURL: firebaseUser.photoURL || null,
      tokens: [],
      tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
      lastLocation: null,
      locationUpdatedAt: null,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(userData);
  }
}

async function getUser(uid: string): Promise<User | null> {
  const doc = await firestore().collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as User;
}

async function updateProfile(
  uid: string,
  data: Partial<Pick<User, 'displayName' | 'phoneNumber' | 'photoURL' | 'email'>>,
): Promise<void> {
  await firestore()
    .collection('users')
    .doc(uid)
    .update({
      ...data,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

async function updateLocation(uid: string, lat: number, lng: number): Promise<void> {
  await firestore().collection('users').doc(uid).update({
    lastLocation: { lat, lng },
    locationUpdatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

async function findUserByEmail(email: string): Promise<User | null> {
  const snap = await firestore().collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data() as User;
}

async function findUserByPhone(phone: string): Promise<User | null> {
  const snap = await firestore()
    .collection('users')
    .where('phoneNumber', '==', phone)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as User;
}

export const userService = {
  upsertUser,
  getUser,
  updateProfile,
  updateLocation,
  findUserByEmail,
  findUserByPhone,
};
