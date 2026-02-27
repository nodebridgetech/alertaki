import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { google } from 'googleapis';

const PACKAGE_NAME = 'com.alertaki';

export const validateSubscription = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const { purchaseToken, productId } = request.data as {
    purchaseToken: string;
    productId: string;
  };

  if (!purchaseToken || !productId) {
    throw new HttpsError('invalid-argument', 'purchaseToken e productId são obrigatórios.');
  }

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth,
    });

    const response = await androidPublisher.purchases.subscriptionsv2.get({
      packageName: PACKAGE_NAME,
      token: purchaseToken,
    });

    const subscriptionData = response.data;
    const db = getFirestore();
    const now = new Date();

    const activeStates = [
      'SUBSCRIPTION_STATE_ACTIVE',
      'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    ];

    const isActive = activeStates.includes(subscriptionData.subscriptionState || '');

    const lineItem = subscriptionData.lineItems?.[0];
    const expiryTimeMillis = lineItem?.expiryTime
      ? new Date(lineItem.expiryTime).getTime()
      : null;

    const autoRenewing = lineItem?.autoRenewingPlan?.autoRenewEnabled ?? false;

    await db.collection('users').doc(uid).update({
      subscription: {
        isActive,
        productId,
        purchaseToken,
        expiresAt: expiryTimeMillis
          ? { seconds: Math.floor(expiryTimeMillis / 1000), nanoseconds: 0 }
          : null,
        startedAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 },
        autoRenewing,
        lastValidatedAt: { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 },
      },
      updatedAt: now,
    });

    logger.info(`Subscription validated for user ${uid}: isActive=${isActive}`);
    return { isValid: isActive };
  } catch (error) {
    logger.error('Subscription validation error:', error);
    throw new HttpsError('internal', 'Erro ao validar assinatura.');
  }
});
