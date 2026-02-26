import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import auth from '@react-native-firebase/auth';
import type { Contact, ContactOf, Invite, BlockedUser } from '@alertaki/shared';
import { userService } from './userService';

async function sendInvite(emailOrPhone: string, existingContactUids?: string[]): Promise<void> {
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

  // Check if already a contact using the local contacts list (avoids stale server data)
  if (existingContactUids?.includes(targetUser.uid)) {
    throw new Error('Este usuário já é seu contato.');
  }

  // Check for pending invite (force server read to avoid stale cache)
  const pendingSnap = await firestore()
    .collection('invites')
    .where('fromUid', '==', currentUser.uid)
    .where('toUid', '==', targetUser.uid)
    .where('status', '==', 'pending')
    .get({ source: 'server' });

  if (!pendingSnap.empty) {
    throw new Error('Já existe um convite pendente para este usuário.');
  }

  // Check if target blocked the sender
  // Note: rules only allow the owner to read their blockedUsers,
  // so permission-denied means we can't check (not blocked from our perspective)
  try {
    const blockedDoc = await firestore()
      .collection('users')
      .doc(targetUser.uid)
      .collection('blockedUsers')
      .doc(currentUser.uid)
      .get({ source: 'server' });

    if (blockedDoc.exists) {
      throw new Error('Não foi possível enviar o convite.');
    }
  } catch (error) {
    if ((error as Error).message === 'Não foi possível enviar o convite.') {
      throw error;
    }
    // Permission denied — can't read other user's blockedUsers, skip check
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });
}

async function acceptInvite(inviteId: string): Promise<void> {
  await firestore().collection('invites').doc(inviteId).update({
    status: 'accepted',
    updatedAt: new Date(),
  });
}

async function rejectInvite(inviteId: string): Promise<void> {
  await firestore().collection('invites').doc(inviteId).update({
    status: 'rejected',
    updatedAt: new Date(),
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
    .onSnapshot(
      async (snap) => {
        if (!snap) return;
        const invites = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (Invite & { id: string })[];

        // Enrich invites with fresh user data (photo/name)
        const enriched = await Promise.all(
          invites.map(async (invite) => {
            if (!invite.fromDisplayName || !invite.fromPhotoURL) {
              try {
                const userDoc = await firestore().collection('users').doc(invite.fromUid).get();
                if (userDoc.exists) {
                  const userData = userDoc.data();
                  if (!invite.fromDisplayName && userData?.displayName) {
                    invite.fromDisplayName = userData.displayName;
                  }
                  if (!invite.fromPhotoURL && userData?.photoURL) {
                    invite.fromPhotoURL = userData.photoURL;
                  }
                }
              } catch {
                // Ignore enrichment errors
              }
            }
            return invite;
          }),
        );

        callback(enriched);
      },
      (error) => console.warn('Firestore listener error:', error),
    );
}

function onContacts(uid: string, callback: (contacts: Contact[]) => void): () => void {
  return firestore()
    .collection('users')
    .doc(uid)
    .collection('contacts')
    .orderBy('addedAt', 'desc')
    .onSnapshot(
      async (snap) => {
        if (!snap) return;
        const contacts = snap.docs.map((doc) => ({
          ...doc.data(),
        })) as Contact[];

        // Enrich contacts missing displayName from user documents
        const enrichPromises = contacts.map(async (contact) => {
          if (!contact.displayName && contact.uid) {
            const userDoc = await firestore().collection('users').doc(contact.uid).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              contact.displayName = userData?.displayName || '';
              if (!contact.photoURL && userData?.photoURL) {
                contact.photoURL = userData.photoURL;
              }
            }
          }
          return contact;
        });

        const enrichedContacts = await Promise.all(enrichPromises);
        callback(enrichedContacts);
      },
      (error) => console.warn('Firestore listener error:', error),
    );
}

function onContactOf(uid: string, callback: (contactOf: ContactOf[]) => void): () => void {
  return firestore()
    .collection('users')
    .doc(uid)
    .collection('contactOf')
    .orderBy('addedAt', 'desc')
    .onSnapshot(
      async (snap) => {
        if (!snap) return;
        const contactOf = snap.docs.map((doc) => ({
          ...doc.data(),
        })) as ContactOf[];

        // Enrich contactOf missing ownerDisplayName from user documents
        const enrichPromises = contactOf.map(async (item) => {
          if (!item.ownerDisplayName && item.ownerUid) {
            const userDoc = await firestore().collection('users').doc(item.ownerUid).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              item.ownerDisplayName = userData?.displayName || '';
              if (!item.ownerPhotoURL && userData?.photoURL) {
                item.ownerPhotoURL = userData.photoURL;
              }
            }
          }
          return item;
        });

        const enrichedContactOf = await Promise.all(enrichPromises);
        callback(enrichedContactOf);
      },
      (error) => console.warn('Firestore listener error:', error),
    );
}

async function removeContact(currentUid: string, contactUid: string): Promise<void> {
  // Call Cloud Function first — it handles BOTH sides of the relationship
  // using Admin SDK (bypasses rules and cache issues)
  const removeContactOfFn = functions().httpsCallable('removeContactOf');
  await removeContactOfFn({ contactUid, ownerUid: currentUid });

  // Also delete locally for immediate cache update
  try {
    await firestore()
      .collection('users')
      .doc(currentUid)
      .collection('contacts')
      .doc(contactUid)
      .delete();
  } catch {
    // Already deleted by cloud function — ignore
  }
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
      blockedAt: new Date(),
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
    .onSnapshot(
      (snap) => {
        if (!snap) return;
        const blocked = snap.docs.map((doc) => ({
          ...doc.data(),
        })) as BlockedUser[];
        callback(blocked);
      },
      (error) => console.warn('Firestore listener error:', error),
    );
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
