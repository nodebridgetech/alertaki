import { create } from 'zustand';
import type { Contact, ContactOf, Invite, BlockedUser } from '@alertaki/shared';
import { contactService } from '../services/contactService';

interface ContactState {
  contacts: Contact[];
  contactOf: ContactOf[];
  pendingInvites: (Invite & { id: string })[];
  blockedUsers: BlockedUser[];
  isLoading: boolean;

  setContacts: (contacts: Contact[]) => void;
  setContactOf: (contactOf: ContactOf[]) => void;
  setPendingInvites: (invites: (Invite & { id: string })[]) => void;
  setBlockedUsers: (blocked: BlockedUser[]) => void;
  setLoading: (loading: boolean) => void;

  sendInvite: (emailOrPhone: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  rejectInvite: (inviteId: string) => Promise<void>;
  removeContact: (currentUid: string, contactUid: string) => Promise<void>;
  blockUser: (
    currentUid: string,
    user: { uid: string; displayName: string; email: string; photoURL: string | null },
  ) => Promise<void>;
  unblockUser: (currentUid: string, blockedUid: string) => Promise<void>;

  reset: () => void;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  contactOf: [],
  pendingInvites: [],
  blockedUsers: [],
  isLoading: false,

  setContacts: (contacts) => set({ contacts }),
  setContactOf: (contactOf) => set({ contactOf }),
  setPendingInvites: (pendingInvites) => set({ pendingInvites }),
  setBlockedUsers: (blockedUsers) => set({ blockedUsers }),
  setLoading: (isLoading) => set({ isLoading }),

  sendInvite: async (emailOrPhone) => {
    const { contacts } = get();
    const existingUids = contacts.map((c) => c.uid);
    set({ isLoading: true });
    try {
      await contactService.sendInvite(emailOrPhone, existingUids);
    } finally {
      set({ isLoading: false });
    }
  },

  acceptInvite: async (inviteId) => {
    await contactService.acceptInvite(inviteId);
  },

  rejectInvite: async (inviteId) => {
    await contactService.rejectInvite(inviteId);
  },

  removeContact: async (currentUid, contactUid) => {
    await contactService.removeContact(currentUid, contactUid);
  },

  blockUser: async (currentUid, user) => {
    await contactService.blockUser(currentUid, user);
  },

  unblockUser: async (currentUid, blockedUid) => {
    await contactService.unblockUser(currentUid, blockedUid);
  },

  reset: () =>
    set({
      contacts: [],
      contactOf: [],
      pendingInvites: [],
      blockedUsers: [],
      isLoading: false,
    }),
}));
