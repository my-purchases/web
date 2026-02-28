import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useInvitationStore } from '@/stores';
import { Layout } from '@/components/layout';
import { InvitationEntry } from '@/components/invitation/InvitationEntry';
import { Loader2 } from 'lucide-react';

const PurchasesPage = lazy(() => import('@/pages/PurchasesPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const ExtensionPage = lazy(() => import('@/pages/ExtensionPage'));
const AllegroCallbackPage = lazy(() => import('@/pages/AllegroCallbackPage'));
const OlxCallbackPage = lazy(() => import('@/pages/OlxCallbackPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { invitation } = useInvitationStore();
  if (!invitation) return <InvitationEntry />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={
              <AuthGate>
                <Suspense fallback={<PageLoader />}>
                  <PurchasesPage />
                </Suspense>
              </AuthGate>
            }
          />
          <Route
            path="settings"
            element={
              <AuthGate>
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              </AuthGate>
            }
          />
          <Route
            path="about"
            element={
              <Suspense fallback={<PageLoader />}>
                <AboutPage />
              </Suspense>
            }
          />
          <Route
            path="privacy"
            element={
              <Suspense fallback={<PageLoader />}>
                <PrivacyPage />
              </Suspense>
            }
          />
          <Route
            path="extension"
            element={
              <Suspense fallback={<PageLoader />}>
                <ExtensionPage />
              </Suspense>
            }
          />
          <Route
            path="auth/allegro"
            element={
              <AuthGate>
                <Suspense fallback={<PageLoader />}>
                  <AllegroCallbackPage />
                </Suspense>
              </AuthGate>
            }
          />
          <Route
            path="auth/olx"
            element={
              <AuthGate>
                <Suspense fallback={<PageLoader />}>
                  <OlxCallbackPage />
                </Suspense>
              </AuthGate>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
