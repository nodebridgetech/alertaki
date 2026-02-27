import { create } from 'zustand';
import type { Subscription as IAPSubscription } from 'react-native-iap';
import { billingService } from '../services/billingService';

interface SubscriptionState {
  isSubscribed: boolean;
  isChecking: boolean;
  isPurchasing: boolean;
  availableProducts: IAPSubscription[];
  error: string | null;

  setSubscribed: (subscribed: boolean) => void;
  setChecking: (checking: boolean) => void;
  checkSubscriptionStatus: (uid: string) => Promise<void>;
  loadProducts: () => Promise<void>;
  purchase: () => Promise<void>;
  restorePurchases: (uid: string) => Promise<void>;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isSubscribed: false,
  isChecking: true,
  isPurchasing: false,
  availableProducts: [],
  error: null,

  setSubscribed: (isSubscribed) => set({ isSubscribed }),
  setChecking: (isChecking) => set({ isChecking }),

  checkSubscriptionStatus: async (uid) => {
    set({ isChecking: true, error: null });
    try {
      const subscription = await billingService.getSubscriptionStatus(uid);
      const now = Date.now() / 1000;
      const isActive = !!(
        subscription?.isActive &&
        subscription.expiresAt &&
        subscription.expiresAt.seconds > now
      );
      set({ isSubscribed: isActive });
    } catch (error) {
      console.warn('checkSubscriptionStatus error:', error);
      set({ error: 'Erro ao verificar assinatura.' });
    } finally {
      set({ isChecking: false });
    }
  },

  loadProducts: async () => {
    try {
      const products = await billingService.getAvailableSubscriptions();
      set({ availableProducts: products });
    } catch (error) {
      console.warn('loadProducts error:', error);
    }
  },

  purchase: async () => {
    set({ isPurchasing: true, error: null });
    try {
      await billingService.purchaseSubscription();
    } catch (error: any) {
      const msg = error?.message || error?.code || String(error);
      console.warn('Purchase error details:', JSON.stringify(error));
      set({ error: `Erro na compra: ${msg}` });
    } finally {
      set({ isPurchasing: false });
    }
  },

  restorePurchases: async (uid) => {
    set({ isChecking: true, error: null });
    try {
      const purchases = await billingService.restorePurchases();
      if (purchases.length > 0) {
        const latest = purchases[purchases.length - 1];
        if (latest.purchaseToken) {
          const result = await billingService.validatePurchase(
            latest.purchaseToken,
            latest.productId,
          );
          set({ isSubscribed: result.isValid });
        }
      }
    } catch (error) {
      console.warn('restorePurchases error:', error);
      set({ error: 'Erro ao restaurar compras.' });
    } finally {
      set({ isChecking: false });
    }
  },

  reset: () =>
    set({
      isSubscribed: false,
      isChecking: true,
      isPurchasing: false,
      availableProducts: [],
      error: null,
    }),
}));
