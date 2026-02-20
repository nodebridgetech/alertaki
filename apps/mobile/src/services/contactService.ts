import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type { Contact, ContactOf, Invite, BlockedUser } from '@alertaki/shared';
import { userService } from './userService';

async function sendInvite(emailOrPhone: string): Promise<void> {
  const currentUser = auth().currentUser;
  if (!currentUser) throw new Error('Usuário não autenticado.');

  const isEmail = emailOrPhone.includes('@');
  const targetUser = isEmail
    ? await userService.findUserByEmail(emailOrPhone)
    : await userService.findUserByPhone(emailOrPhone);

  if (!targetUser) {
    throw new Error('Nenhum usuário encontrado com este email/telefone.');
  }

  if (targetUser.uid === currentUser.uid) {
    throw new Error('Você não pode convidar a si mesmo.');
  }

  // Check if already a contact
  const contactDoc = await firestore()
    .collection('users')
    .doc(currentUser.uid)
    .collection('contacts')
    .doc(targetUser.uid)
    .get();

  if (contactDoc.exists) {
    throw new Error('Este usuário já é seu contato.');
  }

  // Check for pending invite
  const pendingSnap = await firestore()
    .collection('invites')
    .where('fromUid', '==', currentUser.uid)
    .where('toUid', '==', targetUser.uid)
    .where('status', '==', 'pending')
    .get();

  if (!pendingSnap.empty) {
    throw new Error('Já existe um convite pendente para este usuário.');
  }

  // Check if target blocked the sender
  const blockedDoc = await firestore()
    .collection('users')
    .doc(targetUser.uid)
    .collection('blockedUsers')
    .doc(currentUser.uid)
    .get();

  if (blockedDoc.exists) {
    throw new Error('Não foi possível enviar o convite.');
  }

  const senderData = await userService.getUser(currentUser.uid);

  await firestore()
    .collection('invites')
    .add({
      fromUid: currentUser.uid,
      fromEmail: currentUser.email || '',
      fromDisplayName: senderData?.displayName || currentUser.displayName || '',
      fromPhotoURL: senderData?.photoURL || currentUser.photoURL || null,
      toUid: targetUser.uid,
      toEmail: targetUser.email,
      status: 'pending',
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

async function acceptInvite(inviteId: string): Promise<void> {
  await firestore().collection('invites').doc(inviteId).update({
    status: 'accepted',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

async function rejectInvite(inviteId: string): Promise<void> {
  await firestore().collection('invites').doc(inviteId).update({
    status: 'rejected',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

function onPendingInvites(
  uid: string,
  callback: (invites: (Invite & { id: string })[]) => void,
): () => void {
  return firestore()
    .collection('invites')
    .where('toUid', '==', uid)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snap) => {
      const invites = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (Invite & { id: string })[];
      callback(invites);
    });
}

function onContacts(uid: string, callback: (contacts: Contact[]) => void): () => void {
  return firestore()
    .collection('users')
    .doc(uid)
    .collection('contacts')
    .orderBy('addedAt', 'desc')
    .onSnapshot((snap) => {
      const contacts = snap.docs.map((doc) => ({
        ...doc.data(),
      })) as Contact[];
      callback(contacts);
    });
}

function onContactOf(uid: string, callback: (contactOf: ContactOf[]) => void): () => void {
  return firestore()
    .collection('users')
    .doc(uid)
    .collection('contactOf')
    .orderBy('addedAt', 'desc')
    .onSnapshot((snap) => {
      const contactOf = snap.docs.map((doc) => ({
        ...doc.data(),
      })) as ContactOf[];
      callback(contactOf);
    });
}

async function removeContact(currentUid: string, contactUid: string): Promise<void> {
  await firestore()
    .collection('users')
    .doc(currentUid)
    .collection('contacts')
    .doc(contactUid)
    .delete();

  await firestore()
    .collection('users')
    .doc(contactUid)
    .collection('contactOf')
    .doc(currentUid)
    .delete();
}

async function blockUser(
  currentUid: string,
  blockedUser: { uid: string; displayName: string; email: string; photoURL: string | null },
): Promise<void> {
  await firestore()
    .collection('users')
    .doc(currentUid)
    .collection('blockedUsers')
    .doc(blockedUser.uid)
    .set({
      uid: blockedUser.uid,
      displayName: blockedUser.displayName,
      email: blockedUser.email,
      photoURL: blockedUser.photoURL,
      blockedAt: firestore.FieldValue.serverTimestamp(),
    });
}

async function unblockUser(currentUid: string, blockedUid: string): Promise<void> {
  await firestore()
    .collection('users')
    .doc(currentUid)
    .collection('blockedUsers')
    .doc(blockedUid)
    .delete();
}

function onBlockedUsers(uid: string, callback: (blocked: BlockedUser[]) => void): () => void {
  return firestore()
    .collection('users')
    .doc(uid)
    .collection('blockedUsers')
    .orderBy('blockedAt', 'desc')
    .onSnapshot((snap) => {
      const blocked = snap.docs.map((doc) => ({
        ...doc.data(),
      })) as BlockedUser[];
      callback(blocked);
    });
}

export const contactService = {
  sendInvite,
  acceptInvite,
  rejectInvite,
  onPendingInvites,
  onContacts,
  onContactOf,
  removeContact,
  blockUser,
  unblockUser,
  onBlockedUsers,
};
