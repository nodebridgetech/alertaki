import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const PACKAGE_NAME = 'com.alertaki';

function loadServiceAccountCredentials() {
  // Try multiple possible paths for the key file
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'alertaki-907d7aca1a5f.json'),
    path.join(__dirname, '..', 'alertaki-907d7aca1a5f.json'),
    path.join(process.cwd(), 'alertaki-907d7aca1a5f.json'),
    '/workspace/alertaki-907d7aca1a5f.json',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      logger.info(`Found service account key at: ${p}`);
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }

  logger.error('Service account key file not found. Tried paths:', possiblePaths);
  logger.error('__dirname:', __dirname);
  logger.error('cwd:', process.cwd());

  // List files in potential directories to debug
  try {
    const parentDir = path.join(__dirname, '..');
    logger.info('Files in parent dir:', fs.readdirSync(parentDir));
  } catch (e) { /* ignore */ }
  try {
    const grandparentDir = path.join(__dirname, '..', '..');
    logger.info('Files in grandparent dir:', fs.readdirSync(grandparentDir));
  } catch (e) { /* ignore */ }
  try {
    logger.info('Files in cwd:', fs.readdirSync(process.cwd()));
  } catch (e) { /* ignore */ }

  return null;
}

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
    const credentials = loadServiceAccountCredentials();

    if (!credentials) {
      throw new Error('Service account key file not found in any expected location');
    }

    logger.info(`Using service account: ${credentials.client_email}`);

    const auth = new google.auth.GoogleAuth({
      credentials,
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
