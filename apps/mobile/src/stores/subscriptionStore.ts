import { create } from 'zustand';
import type { Product } from 'react-native-iap';
import { billingService } from '../services/billingService';

interface SubscriptionState {
  isSubscribed: boolean;
  isChecking: boolean;
  isPurchasing: boolean;
  availableProducts: Product[];
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
      const result = await billingService.restorePurchases();
      if (result.isValid) {
        set({ isSubscribed: true });
      } else {
        // Fallback: check Firestore in case validation happened elsewhere
        const subscription = await billingService.getSubscriptionStatus(uid);
        const now = Date.now() / 1000;
        const isActive = !!(
          subscription?.isActive &&
          subscription.expiresAt &&
          subscription.expiresAt.seconds > now
        );
        set({ isSubscribed: isActive });
        if (!isActive) {
          set({ error: 'Nenhuma assinatura ativa encontrada.' });
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
