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
    // Data-only message: no "notification" field.
    // Notification display is handled by Notifee on the client side
    // to avoid duplicate notifications (FCM auto-display + Notifee).
    data: {
      screen: 'invites',
      inviteId: event.params.inviteId,
      fromUid: invite.fromUid,
      fromEmail: invite.fromEmail,
      fromDisplayName: invite.fromDisplayName || '',
    },
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: 'Novo convite!',
            body: `${invite.fromDisplayName || invite.fromEmail} quer adicioná-lo como contato de segurança`,
          },
          sound: 'default',
          'interruption-level': 'time-sensitive',
          'content-available': 1,
        },
      },
    },
  });
});
