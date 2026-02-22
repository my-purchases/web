import { create } from 'zustand';
import i18n from '@/i18n';
import { updateDocumentDirection } from '@/i18n';
import type { SupportedLanguage } from '@/i18n';
import { tracker, AnalyticsEvents } from '@/analytics';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'my-purchases-theme';

interface SettingsState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: SupportedLanguage) => void;
  initTheme: () => void;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }

  console.debug('[Settings] Theme applied:', theme);
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: (localStorage.getItem(THEME_KEY) as Theme) ?? 'system',

  initTheme: () => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const theme = stored ?? 'system';
    applyTheme(theme);
    set({ theme });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentTheme = localStorage.getItem(THEME_KEY) as Theme | null;
      if (!currentTheme || currentTheme === 'system') {
        applyTheme('system');
      }
    });

    console.info('[Settings] Theme initialized:', theme);
  },

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
    tracker.trackEvent(AnalyticsEvents.THEME_CHANGED, { theme });
    console.info('[Settings] Theme changed:', theme);
  },

  setLanguage: (language) => {
    i18n.changeLanguage(language);
    updateDocumentDirection(language);
    tracker.trackEvent(AnalyticsEvents.LANGUAGE_CHANGED, { language });
    console.info('[Settings] Language changed:', language);
  },
}));
