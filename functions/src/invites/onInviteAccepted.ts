import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const onInviteAccepted = onDocumentUpdated('invites/{inviteId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  // Only trigger when status changes to 'accepted'
  if (before.status === 'accepted' || after.status !== 'accepted') return;

  const db = getFirestore();

  const [fromUserDoc, toUserDoc] = await Promise.all([
    db.collection('users').doc(after.fromUid).get(),
    db.collection('users').doc(after.toUid).get(),
  ]);

  const fromUser = fromUserDoc.data();
  const toUser = toUserDoc.data();
  if (!fromUser || !toUser) return;

  const batch = db.batch();

  // The accepter (toUid) becomes the inviter's (fromUid) security contact
  batch.set(db.collection('users').doc(after.fromUid).collection('contacts').doc(after.toUid), {
    uid: after.toUid,
    displayName: toUser.displayName,
    email: toUser.email,
    photoURL: toUser.photoURL || null,
    addedAt: FieldValue.serverTimestamp(),
  });

  // Record in accepter's contactOf subcollection
  batch.set(db.collection('users').doc(after.toUid).collection('contactOf').doc(after.fromUid), {
    ownerUid: after.fromUid,
    ownerDisplayName: fromUser.displayName,
    ownerEmail: fromUser.email,
    ownerPhotoURL: fromUser.photoURL || null,
    addedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
});
