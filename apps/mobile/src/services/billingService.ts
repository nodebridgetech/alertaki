import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
  type Product,
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

async function getAvailableSubscriptions(): Promise<Product[]> {
  return fetchProducts({ skus: [SUBSCRIPTION_SKU], type: 'subs' });
}

async function purchaseSubscription(): Promise<void> {
  const products = await fetchProducts({ skus: [SUBSCRIPTION_SKU], type: 'subs' });
  if (products.length === 0) {
    throw new Error('Assinatura não encontrada na Play Store.');
  }

  const sub = products[0] as any;
  // v14 uses subscriptionOfferDetailsAndroid for Android
  const offerDetails = sub.subscriptionOfferDetailsAndroid || sub.subscriptionOfferDetails || sub.subscriptionOffers;
  const offerToken = offerDetails?.[0]?.offerToken;

  if (!offerToken) {
    console.warn('Product details:', JSON.stringify(sub));
    throw new Error('Oferta de assinatura não encontrada.');
  }

  await requestPurchase({
    type: 'subs',
    request: {
      google: {
        skus: [SUBSCRIPTION_SKU],
        offerToken,
      },
    },
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

async function doRestorePurchases(): Promise<{ isValid: boolean }> {
  const purchases = await getAvailablePurchases();
  for (const purchase of purchases) {
    if (purchase.purchaseToken && purchase.productId) {
      const result = await validatePurchase(purchase.purchaseToken, purchase.productId);
      if (result.isValid) {
        return { isValid: true };
      }
    }
  }
  return { isValid: false };
}

function setupPurchaseListeners(
  onPurchaseUpdate: (purchase: any) => void,
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
  restorePurchases: doRestorePurchases,
  setupPurchaseListeners,
  SUBSCRIPTION_SKU,
};
