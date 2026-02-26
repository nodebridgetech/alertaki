import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

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

  // Delete both sides of the contact relationship using Admin SDK
  // (bypasses security rules and client-side cache issues)
  await Promise.all([
    // Delete contactOf record from the other user
    db.collection('users').doc(contactUid).collection('contactOf').doc(ownerUid).delete(),
    // Also delete the contact record from the owner (ensures server-side deletion)
    db.collection('users').doc(ownerUid).collection('contacts').doc(contactUid).delete(),
  ]);

  // Clean up old accepted invites between these two users
  try {
    const [sentInvites, receivedInvites] = await Promise.all([
      db.collection('invites')
        .where('fromUid', '==', ownerUid)
        .where('toUid', '==', contactUid)
        .where('status', '==', 'accepted')
        .get(),
      db.collection('invites')
        .where('fromUid', '==', contactUid)
        .where('toUid', '==', ownerUid)
        .where('status', '==', 'accepted')
        .get(),
    ]);

    const batch = db.batch();
    sentInvites.docs.forEach((doc) => batch.delete(doc.ref));
    receivedInvites.docs.forEach((doc) => batch.delete(doc.ref));
    if (sentInvites.size + receivedInvites.size > 0) {
      await batch.commit();
      logger.info(`Cleaned up ${sentInvites.size + receivedInvites.size} old invites between ${ownerUid} and ${contactUid}`);
    }
  } catch (error) {
    logger.warn('Failed to clean up old invites:', error);
  }

  return { success: true };
});
