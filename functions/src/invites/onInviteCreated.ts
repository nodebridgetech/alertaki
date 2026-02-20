import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const onInviteCreated = onDocumentCreated('invites/{inviteId}', async (event) => {
  const invite = event.data?.data();
  if (!invite) return;

  const db = getFirestore();
  const messaging = getMessaging();

  const toUserDoc = await db.collection('users').doc(invite.toUid).get();
  const tokens: string[] = toUserDoc.data()?.tokens || [];
  if (tokens.length === 0) return;

  await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: 'Novo convite de segurança',
      body: `${invite.fromDisplayName || invite.fromEmail} quer adicioná-lo como contato de segurança`,
    },
    data: {
      screen: 'invites',
      inviteId: event.params.inviteId,
      fromUid: invite.fromUid,
      fromEmail: invite.fromEmail,
      fromDisplayName: invite.fromDisplayName || '',
    },
    android: {
      notification: {
        channelId: 'invite_channel',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          'interruption-level': 'time-sensitive',
        },
      },
    },
  });
});
