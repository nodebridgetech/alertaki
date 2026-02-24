import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const removeContactOf = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const { contactUid, ownerUid } = request.data as {
    contactUid: string;
    ownerUid: string;
  };

  // Only the owner who removed the contact can trigger this
  if (ownerUid !== uid) {
    throw new HttpsError('permission-denied', 'Sem permissão.');
  }

  const db = getFirestore();
  await db
    .collection('users')
    .doc(contactUid)
    .collection('contactOf')
    .doc(ownerUid)
    .delete();

  return { success: true };
});
