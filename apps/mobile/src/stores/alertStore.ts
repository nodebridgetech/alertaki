import { create } from 'zustand';
import type { Alert } from '@alertaki/shared';
import { alertService, ReceivedAlertItem } from '../services/alertService';

interface AlertState {
  sentAlerts: Alert[];
  receivedAlerts: ReceivedAlertItem[];
  isLoading: boolean;

  loadSentAlerts: (userId: string) => Promise<void>;
  loadReceivedAlerts: (uid: string) => Promise<void>;
  setLoading: (loading: boolean) => void;

  reset: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  sentAlerts: [],
  receivedAlerts: [],
  isLoading: false,

  loadSentAlerts: async (userId) => {
    set({ isLoading: true });
    try {
      const alerts = await alertService.getSentAlerts(userId);
      set({ sentAlerts: alerts });
    } finally {
      set({ isLoading: false });
    }
  },

  loadReceivedAlerts: async (uid) => {
    set({ isLoading: true });
    try {
      const alerts = await alertService.getReceivedAlerts(uid);
      set({ receivedAlerts: alerts });
    } finally {
      set({ isLoading: false });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set({ sentAlerts: [], receivedAlerts: [], isLoading: false }),
}));
