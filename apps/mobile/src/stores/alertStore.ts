import { create } from 'zustand';
import type { Alert } from '@alertaki/shared';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { alertService, ReceivedAlertItem } from '../services/alertService';

interface AlertState {
  sentAlerts: Alert[];
  receivedAlerts: ReceivedAlertItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  sentLastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  receivedLastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
  sentHasMore: boolean;
  receivedHasMore: boolean;

  loadSentAlerts: (userId: string) => Promise<void>;
  loadMoreSentAlerts: (userId: string) => Promise<void>;
  loadReceivedAlerts: (uid: string) => Promise<void>;
  loadMoreReceivedAlerts: (uid: string) => Promise<void>;
  setLoading: (loading: boolean) => void;

  reset: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  sentAlerts: [],
  receivedAlerts: [],
  isLoading: false,
  isLoadingMore: false,
  sentLastDoc: null,
  receivedLastDoc: null,
  sentHasMore: true,
  receivedHasMore: true,

  loadSentAlerts: async (userId) => {
    set({ isLoading: true });
    try {
      const result = await alertService.getSentAlerts(userId);
      set({
        sentAlerts: result.items,
        sentLastDoc: result.lastDoc,
        sentHasMore: result.hasMore,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  loadMoreSentAlerts: async (userId) => {
    const { sentLastDoc, sentHasMore, isLoadingMore } = get();
    if (!sentHasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const result = await alertService.getSentAlerts(userId, sentLastDoc);
      set((state) => ({
        sentAlerts: [...state.sentAlerts, ...result.items],
        sentLastDoc: result.lastDoc,
        sentHasMore: result.hasMore,
      }));
    } finally {
      set({ isLoadingMore: false });
    }
  },

  loadReceivedAlerts: async (uid) => {
    set({ isLoading: true });
    try {
      const result = await alertService.getReceivedAlerts(uid);
      set({
        receivedAlerts: result.items,
        receivedLastDoc: result.lastDoc,
        receivedHasMore: result.hasMore,
      });
    } catch (error) {
      console.error('loadReceivedAlerts error:', (error as Error).message);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMoreReceivedAlerts: async (uid) => {
    const { receivedLastDoc, receivedHasMore, isLoadingMore } = get();
    if (!receivedHasMore || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const result = await alertService.getReceivedAlerts(uid, receivedLastDoc);
      set((state) => ({
        receivedAlerts: [...state.receivedAlerts, ...result.items],
        receivedLastDoc: result.lastDoc,
        receivedHasMore: result.hasMore,
      }));
    } finally {
      set({ isLoadingMore: false });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      sentAlerts: [],
      receivedAlerts: [],
      isLoading: false,
      isLoadingMore: false,
      sentLastDoc: null,
      receivedLastDoc: null,
      sentHasMore: true,
      receivedHasMore: true,
    }),
}));
