import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { getAllProviders, getProvider } from '@/providers';
import { useInvitationStore, usePurchaseStore } from '@/stores';
import type { ImportProgress, ImportResult } from '@/stores/purchaseStore';
import { syncProvider } from '@/db/sync';
import { buildAuthorizationUrl as buildAllegroAuthUrl } from '@/providers/allegro/api';
import { generatePkce, generateState as generateAllegroState, saveCodeVerifier, saveState as saveAllegroState } from '@/providers/allegro/pkce';
import { buildAuthorizationUrl as buildOlxAuthUrl } from '@/providers/olx/api';
import { generateState as generateOlxState, saveState as saveOlxState } from '@/providers/olx/state';
import { Button } from '@/components/common';
import { tracker, AnalyticsEvents } from '@/analytics';
import {
  RefreshCw,
  Upload,
  CheckCircle,
  AlertCircle,
  Wifi,
  HardDrive,
  LogIn,
  X,
  FileText,
  SkipForward,
  PlusCircle,
  RefreshCcw,
} from 'lucide-react';

export function ProviderPanel() {
  const { t } = useTranslation();
  const { invitation } = useInvitationStore();
  const { addPurchases } = usePurchaseStore();
  const providers = getAllProviders();
  const syncStates = useLiveQuery(() => db.syncState.toArray(), []);

  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessages, setSuccessMessages] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [importProviderId, setImportProviderId] = useState<string | null>(null);

  // Import progress & summary
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importingProviderId, setImportingProviderId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importResultProvider, setImportResultProvider] = useState<string | null>(null);

  const handleSync = async (providerId: string) => {
    setSyncingIds((prev) => new Set(prev).add(providerId));
    setErrors((prev) => ({ ...prev, [providerId]: '' }));
    setSuccessMessages((prev) => ({ ...prev, [providerId]: '' }));

    try {
      const count = await syncProvider(providerId);
      setSuccessMessages((prev) => ({
        ...prev,
        [providerId]: `Synced ${count} new purchases`,
      }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [providerId]: err instanceof Error ? err.message : 'Sync failed',
      }));
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(providerId);
        return next;
      });
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importProviderId) return;

    const provider = getProvider(importProviderId);
    if (!provider?.parseImportFile) return;

    tracker.trackEvent(AnalyticsEvents.FILE_IMPORT_STARTED, {
      providerId: importProviderId,
      fileName: file.name,
    });

    const currentProviderId = importProviderId;

    try {
      // Validate first
      if (provider.validateImportFile) {
        const validationErrors = await provider.validateImportFile(file);
        if (validationErrors.length > 0) {
          setErrors((prev) => ({
            ...prev,
            [currentProviderId]: validationErrors.join(', '),
          }));
          tracker.trackEvent(AnalyticsEvents.FILE_IMPORT_FAILED, {
            providerId: currentProviderId,
            errors: validationErrors,
          });
          return;
        }
      }

      // Start progress tracking
      setImportingProviderId(currentProviderId);
      setImportProgress({ total: 0, processed: 0, added: 0, skipped: 0, updated: 0 });
      setErrors((prev) => ({ ...prev, [currentProviderId]: '' }));
      setSuccessMessages((prev) => ({ ...prev, [currentProviderId]: '' }));

      const purchases = await provider.parseImportFile(file);

      // Update progress with total from parsed file
      setImportProgress({ total: purchases.length, processed: 0, added: 0, skipped: 0, updated: 0 });

      // Add purchases with progress callback
      const result = await addPurchases(purchases, (progress) => {
        setImportProgress({ ...progress });
      });

      // Clear progress, show summary
      setImportProgress(null);
      setImportingProviderId(null);
      setImportResult(result);
      setImportResultProvider(currentProviderId);

      tracker.trackEvent(AnalyticsEvents.FILE_IMPORT_COMPLETED, {
        providerId: currentProviderId,
        added: result.added,
        skipped: result.skipped,
        updated: result.updated,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setErrors((prev) => ({ ...prev, [currentProviderId]: message }));
      setImportProgress(null);
      setImportingProviderId(null);
      tracker.trackEvent(AnalyticsEvents.FILE_IMPORT_FAILED, {
        providerId: currentProviderId,
        error: message,
      });
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
    setImportProviderId(null);
  };

  const startImport = (providerId: string) => {
    setImportProviderId(providerId);
    fileRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t('providers.title')}
      </h3>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv"
        onChange={handleFileImport}
        className="hidden"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => {
          const isApi = provider.meta.type === 'api' || provider.meta.type === 'hybrid';
          const isImport = provider.meta.type === 'import' || provider.meta.type === 'hybrid';
          const hasCredentials = !!invitation?.providers[provider.meta.id];
          const creds = invitation?.providers[provider.meta.id];
          const hasToken = !!creds?.accessToken;
          const canConnect = hasCredentials && isApi && !!creds?.clientId && !!creds?.redirectUri && !hasToken;
          const isSyncing = syncingIds.has(provider.meta.id);
          const syncState = syncStates?.find((s) => s.providerId === provider.meta.id);
          const error = errors[provider.meta.id];
          const success = successMessages[provider.meta.id];

          return (
            <div
              key={provider.meta.id}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isApi ? (
                    <Wifi className="h-4 w-4 text-blue-500" />
                  ) : (
                    <HardDrive className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {provider.meta.name}
                  </span>
                </div>
                {hasToken && isApi && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    {t('providers.connected')}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {provider.meta.description}
              </p>

              {syncState?.lastSyncAt && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t('providers.lastSync')}: {new Date(syncState.lastSyncAt).toLocaleString()}
                </p>
              )}

              {error && (
                <p className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </p>
              )}

              {success && (
                <p className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  {success}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {canConnect && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (provider.meta.id === 'allegro') {
                        // Allegro: PKCE Authorization Code flow
                        const { codeVerifier, codeChallenge } = await generatePkce();
                        const state = generateAllegroState();
                        saveCodeVerifier(codeVerifier);
                        saveAllegroState(state);
                        const url = buildAllegroAuthUrl(creds!, { codeChallenge, state });
                        console.info('[ProviderPanel] Redirecting to Allegro OAuth (PKCE):', url);
                        window.location.href = url;
                      } else if (provider.meta.id === 'olx') {
                        // OLX: Authorization Code flow (no PKCE, uses client_secret)
                        const state = generateOlxState();
                        saveOlxState(state);
                        const url = buildOlxAuthUrl(creds!, { state });
                        console.info('[ProviderPanel] Redirecting to OLX OAuth:', url);
                        window.location.href = url;
                      }
                    }}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    {t('providers.connect')}
                  </Button>
                )}
                {isApi && hasToken && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSync(provider.meta.id)}
                    disabled={isSyncing}
                    isLoading={isSyncing}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('providers.sync')}
                  </Button>
                )}
                {isImport && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startImport(provider.meta.id)}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {t('providers.importData')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Import Progress Overlay */}
      {importProgress && importingProviderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('providers.import.importing')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getProvider(importingProviderId)?.meta.name}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {/* Progress bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-200"
                  style={{
                    width: importProgress.total > 0
                      ? `${Math.round((importProgress.processed / importProgress.total) * 100)}%`
                      : '0%',
                  }}
                />
              </div>

              {/* Counter & percentage */}
              <div className="mt-2 flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>
                  {importProgress.processed} / {importProgress.total}
                </span>
                <span>
                  {importProgress.total > 0
                    ? `${Math.round((importProgress.processed / importProgress.total) * 100)}%`
                    : '0%'}
                </span>
              </div>

              {/* Live stats */}
              <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <PlusCircle className="h-3 w-3 text-green-500" />
                  {t('providers.import.added')}: {importProgress.added}
                </span>
                <span className="flex items-center gap-1">
                  <SkipForward className="h-3 w-3 text-yellow-500" />
                  {t('providers.import.skipped')}: {importProgress.skipped}
                </span>
                <span className="flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3 text-blue-500" />
                  {t('providers.import.updated')}: {importProgress.updated}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Summary Modal */}
      {importResult && importResultProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('providers.import.complete')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getProvider(importResultProvider)?.meta.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setImportResult(null);
                  setImportResultProvider(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary stats */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <FileText className="h-4 w-4" />
                  {t('providers.import.totalProcessed')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {importResult.total}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/20">
                <span className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                  <PlusCircle className="h-4 w-4" />
                  {t('providers.import.newlyAdded')}
                </span>
                <span className="font-semibold text-green-700 dark:text-green-300">
                  {importResult.added}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-yellow-50 px-4 py-3 dark:bg-yellow-900/20">
                <span className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <SkipForward className="h-4 w-4" />
                  {t('providers.import.alreadyExisted')}
                </span>
                <span className="font-semibold text-yellow-700 dark:text-yellow-300">
                  {importResult.skipped}
                </span>
              </div>

              {importResult.updated > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
                  <span className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <RefreshCcw className="h-4 w-4" />
                    {t('providers.import.updatedItems')}
                  </span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {importResult.updated}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5">
              <Button
                className="w-full"
                onClick={() => {
                  setImportResult(null);
                  setImportResultProvider(null);
                }}
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
