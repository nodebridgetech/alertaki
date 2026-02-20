import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

async function deleteSubcollection(db: FirebaseFirestore.Firestore, path: string): Promise<void> {
  const snap = await db.collection(path).get();
  if (snap.empty) return;

  const batch = db.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export const deleteUserAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const db = getFirestore();
  const authAdmin = getAuth();
  const storage = getStorage();

  // 1. Anonymize sent alerts
  const alertsSnap = await db.collection('alerts').where('userId', '==', uid).get();
  if (!alertsSnap.empty) {
    const alertBatch = db.batch();
    alertsSnap.forEach((doc) => {
      alertBatch.update(doc.ref, {
        userName: 'Usuário removido',
        userEmail: null,
        userPhotoURL: null,
      });
    });
    await alertBatch.commit();
  }

  // 2. Remove from others' contact lists
  const contactOfSnap = await db.collection('users').doc(uid).collection('contactOf').get();
  for (const doc of contactOfSnap.docs) {
    const ownerUid = doc.data().ownerUid;
    try {
      await db.collection('users').doc(ownerUid).collection('contacts').doc(uid).delete();
    } catch {
      // Contact may already be removed
    }
  }

  const contactsSnap = await db.collection('users').doc(uid).collection('contacts').get();
  for (const doc of contactsSnap.docs) {
    try {
      await db.collection('users').doc(doc.id).collection('contactOf').doc(uid).delete();
    } catch {
      // ContactOf may already be removed
    }
  }

  // 3. Delete user's subcollections
  await deleteSubcollection(db, `users/${uid}/contacts`);
  await deleteSubcollection(db, `users/${uid}/contactOf`);
  await deleteSubcollection(db, `users/${uid}/blockedUsers`);

  // 4. Delete recipients referencing this user
  const recipientsSnap = await db.collectionGroup('recipients').where('uid', '==', uid).get();
  if (!recipientsSnap.empty) {
    const recipientBatch = db.batch();
    recipientsSnap.forEach((doc) => recipientBatch.delete(doc.ref));
    await recipientBatch.commit();
  }

  // 5. Delete invites
  const invitesFromSnap = await db.collection('invites').where('fromUid', '==', uid).get();
  const invitesToSnap = await db.collection('invites').where('toUid', '==', uid).get();

  if (!invitesFromSnap.empty || !invitesToSnap.empty) {
    const inviteBatch = db.batch();
    invitesFromSnap.forEach((doc) => inviteBatch.delete(doc.ref));
    invitesToSnap.forEach((doc) => inviteBatch.delete(doc.ref));
    await inviteBatch.commit();
  }

  // 6. Delete profile photo from Storage
  try {
    await storage.bucket().file(`users/${uid}/profile/photo.jpg`).delete();
  } catch {
    // Photo may not exist
  }

  // 7. Delete user document
  await db.collection('users').doc(uid).delete();

  // 8. Delete Firebase Auth account
  await authAdmin.deleteUser(uid);

  return { success: true };
});
