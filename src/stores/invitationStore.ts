import { create } from 'zustand';
import type { Invitation } from '@/types/invitation';
import { validateInvitation } from '@/types/invitation';
import type { ProviderCredentials } from '@/providers/types';
import { tracker, AnalyticsEvents } from '@/analytics';

const STORAGE_KEY = 'my-purchases-invitation';
const BASE_URL = import.meta.env.BASE_URL;

interface InvitationState {
  invitation: Invitation | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFromCode: (code: string) => Promise<void>;
  importFromFile: (file: File) => Promise<void>;
  importFromJson: (data: unknown) => void;
  clearInvitation: () => void;
  getCredentials: (providerId: string) => ProviderCredentials | undefined;
  updateCredentials: (providerId: string, credentials: Partial<ProviderCredentials>) => void;
  restoreFromStorage: () => void;
}

export const useInvitationStore = create<InvitationState>((set, get) => ({
  invitation: null,
  isLoading: false,
  error: null,

  restoreFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as unknown;
        if (validateInvitation(data)) {
          set({ invitation: data });
          tracker.trackEvent(AnalyticsEvents.INVITATION_LOADED, { code: data.code, source: 'storage' });
          console.info('[Invitation] Restored from storage:', data.code);
        }
      }
    } catch (err) {
      console.debug('[Invitation] Failed to restore from storage', err);
    }
  },

  loadFromCode: async (code: string) => {
    set({ isLoading: true, error: null });
    tracker.trackEvent(AnalyticsEvents.INVITATION_ENTERED, { code });
    console.info('[Invitation] Loading invitation from code:', code);

    try {
      const url = `${BASE_URL}invitations/${encodeURIComponent(code)}.json`;
      console.debug('[Invitation] Fetching:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load invitation: ${response.status}`);
      }

      const data = await response.json() as unknown;

      if (!validateInvitation(data)) {
        throw new Error('Invalid invitation format');
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      set({ invitation: data, isLoading: false });
      tracker.trackEvent(AnalyticsEvents.INVITATION_LOADED, { code: data.code, source: 'code' });
      console.info('[Invitation] Loaded successfully:', data.label);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      console.debug('[Invitation] Load failed:', message);
    }
  },

  importFromFile: async (file: File) => {
    set({ isLoading: true, error: null });
    tracker.trackEvent(AnalyticsEvents.INVITATION_IMPORT, { fileName: file.name });
    console.info('[Invitation] Importing from file:', file.name);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;

      if (!validateInvitation(data)) {
        throw new Error('Invalid invitation file format');
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      set({ invitation: data, isLoading: false });
      tracker.trackEvent(AnalyticsEvents.INVITATION_LOADED, { code: data.code, source: 'file' });
      console.info('[Invitation] Imported successfully:', data.label);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
      console.debug('[Invitation] Import failed:', message);
    }
  },

  importFromJson: (data: unknown) => {
    if (!validateInvitation(data)) {
      set({ error: 'Invalid invitation data' });
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    set({ invitation: data, error: null });
    tracker.trackEvent(AnalyticsEvents.INVITATION_LOADED, { code: data.code, source: 'json' });
    console.info('[Invitation] Loaded from JSON:', data.label);
  },

  clearInvitation: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ invitation: null, error: null });
    tracker.trackEvent(AnalyticsEvents.INVITATION_CLEARED);
    console.info('[Invitation] Cleared');
  },

  getCredentials: (providerId: string) => {
    const { invitation } = get();
    return invitation?.providers[providerId];
  },

  updateCredentials: (providerId: string, credentials: Partial<ProviderCredentials>) => {
    const { invitation } = get();
    if (!invitation) return;

    const updated: Invitation = {
      ...invitation,
      providers: {
        ...invitation.providers,
        [providerId]: {
          ...invitation.providers[providerId],
          ...credentials,
        },
      },
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ invitation: updated });
    console.debug('[Invitation] Updated credentials for provider:', providerId);
  },
}));
