import { create } from 'zustand';
import type { User } from '@alertaki/shared';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;

  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (uid: string) => Promise<void>;

  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const credential = await authService.signInWithGoogle();
      const userData = await userService.getUser(credential.user.uid);
      set({ user: userData, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true });
    try {
      const credential = await authService.signInWithApple();
      const userData = await userService.getUser(credential.user.uid);
      set({ user: userData, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const credential = await authService.signInWithEmail(email, password);
      const userData = await userService.getUser(credential.user.uid);
      set({ user: userData, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  registerWithEmail: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const credential = await authService.registerWithEmail(name, email, password);
      const userData = await userService.getUser(credential.user.uid);
      set({ user: userData, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await authService.signOut();
      get().reset();
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUser: async (uid) => {
    const userData = await userService.getUser(uid);
    if (userData) {
      set({ user: userData, isAuthenticated: true });
    }
  },

  reset: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}));
