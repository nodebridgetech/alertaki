import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
  type ProductPurchase,
  type SubscriptionPurchase,
  type Subscription,
  type PurchaseError,
} from 'react-native-iap';
import functions from '@react-native-firebase/functions';
import firestore from '@react-native-firebase/firestore';
import type { UserSubscription } from '@alertaki/shared';

const SUBSCRIPTION_SKU = 'alertaki_monthly_sub';

async function initialize(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await initConnection();
}

async function close(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await endConnection();
}

async function getAvailableSubscriptions(): Promise<Subscription[]> {
  return getSubscriptions({ skus: [SUBSCRIPTION_SKU] });
}

async function purchaseSubscription(): Promise<void> {
  const subscriptions = await getSubscriptions({ skus: [SUBSCRIPTION_SKU] });
  if (subscriptions.length === 0) {
    throw new Error('Assinatura não encontrada na Play Store.');
  }

  const sub = subscriptions[0];
  const offerToken =
    sub.subscriptionOfferDetails?.[0]?.offerToken ?? undefined;

  await requestSubscription({
    sku: SUBSCRIPTION_SKU,
    ...(offerToken ? { subscriptionOffers: [{ sku: SUBSCRIPTION_SKU, offerToken }] } : {}),
  });
}

async function validatePurchase(
  purchaseToken: string,
  productId: string,
): Promise<{ isValid: boolean }> {
  const validateFn = functions().httpsCallable('validateSubscription');
  const result = await validateFn({ purchaseToken, productId });
  return result.data as { isValid: boolean };
}

async function getSubscriptionStatus(uid: string): Promise<UserSubscription | null> {
  const doc = await firestore().collection('users').doc(uid).get();
  return doc.data()?.subscription || null;
}

async function restorePurchases(): Promise<(ProductPurchase | SubscriptionPurchase)[]> {
  return getAvailablePurchases();
}

function setupPurchaseListeners(
  onPurchaseUpdate: (purchase: ProductPurchase | SubscriptionPurchase) => void,
  onPurchaseError: (error: PurchaseError) => void,
): { removePurchaseListener: () => void; removeErrorListener: () => void } {
  const purchaseListener = purchaseUpdatedListener(onPurchaseUpdate);
  const errorListener = purchaseErrorListener(onPurchaseError);
  return {
    removePurchaseListener: () => purchaseListener.remove(),
    removeErrorListener: () => errorListener.remove(),
  };
}

export const billingService = {
  initialize,
  close,
  getAvailableSubscriptions,
  purchaseSubscription,
  validatePurchase,
  getSubscriptionStatus,
  restorePurchases,
  setupPurchaseListeners,
  finishTransaction,
  SUBSCRIPTION_SKU,
};
