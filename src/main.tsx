import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@/i18n';
import App from './App';
import { useSettingsStore } from '@/stores';
import { useInvitationStore } from '@/stores';

// Initialize theme & restore invitation before render
useSettingsStore.getState().initTheme();
useInvitationStore.getState().restoreFromStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
