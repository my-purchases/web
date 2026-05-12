import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore, useSettingsStore } from '@/stores';
import { Button } from '@/components/common';
import { CurrencyConversionProgress } from '@/components/currency';
import { tracker, AnalyticsEvents } from '@/analytics';
import type { Purchase } from '@/db';
import type { ImportProgress, ImportResult } from '@/stores/purchaseStore';
import type { ConversionProgress } from '@/services/currencyService';
import {
  Upload,
  X,
  CheckCircle,
  FileText,
  PlusCircle,
  SkipForward,
  RefreshCcw,
  ImagePlus,
  AlertCircle,
} from 'lucide-react';

// ─── Collector JSON types ──────────────────────────────────

interface CollectorItem {
  id: string;
  providerId: string;
  title: string;
  price: string;
  priceInfo: string; // "38.99 PLN|38|99"
  currency: string;
  orderDate: string;
  orderDateIso: string;
  orderId: string;
  orderLineId: string;
  productId: string;
  productUrl: string;
  imageUrl: string;
  skuId: string;
  storeName: string;
  storePageUrl: string;
  status: string;
  quantity: number;
  tags: string[];
  timestamp: number;
  ignoreExport: boolean;
  attributes: string;
}

// ─── Provider ID mapping ───────────────────────────────────

const PROVIDER_ID_MAP: Record<string, string> = {
  'allegro-pl': 'allegro',
};

function mapProviderId(collectorProviderId: string): string {
  return PROVIDER_ID_MAP[collectorProviderId] ?? collectorProviderId;
}

// ─── Price parsing ─────────────────────────────────────────

function parsePrice(priceInfo: string): number {
  // Format: "38.99 PLN|38|99" or "5,33 zł|5|33" or "US $17.36|17|36"
  const parts = priceInfo.split('|');
  if (parts.length >= 3) {
    const integer = parseInt(parts[1], 10);
    const decimal = parseInt(parts[2], 10);
    if (!isNaN(integer) && !isNaN(decimal)) {
      return integer + decimal / 100;
    }
  }
  // Fallback: extract number from price string
  const match = priceInfo.replace(/,/g, '.').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// ─── Convert collector items to Purchase[] ─────────────────

function parseCollectorExport(items: CollectorItem[]): Purchase[] {
  const now = new Date().toISOString();

  return items
    .filter((item) => !item.ignoreExport)
    .map((item): Purchase => {
      const providerId = mapProviderId(item.providerId);
      // Use skuId (offer/product listing ID) as providerItemId for dedup consistency
      // with existing providers (Allegro uses offer.id, Amazon uses ASIN, AliExpress uses productId)
      const providerItemId = item.skuId || item.productId || item.orderLineId || item.orderId;

      return {
        id: `${providerId}-collector-${item.orderId}-${providerItemId}`,
        providerId,
        providerItemId,
        title: item.title,
        price: parsePrice(item.priceInfo) * (item.quantity || 1),
        currency: item.currency,
        purchaseDate: item.orderDateIso,
        imageUrl: item.imageUrl || undefined,
        originalUrl: item.productUrl || undefined,
        rawData: item as unknown as Record<string, unknown>,
        importedAt: now,
      };
    });
}

// ─── Component ─────────────────────────────────────────────

export function CollectorImportButton() {
  const { t } = useTranslation();
  const { addPurchases, convertPurchases } = usePurchaseStore();
  const { preferredCurrency } = useSettingsStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [providerSummary, setProviderSummary] = useState<Record<string, number> | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    tracker.trackEvent(AnalyticsEvents.FILE_IMPORT_STARTED, {
      providerId: 'collector',
      fileName: file.name,
    });

    try {
      const text = await file.text();
      let data: CollectorItem[];

      try {
        data = JSON.parse(text);
      } catch {
        setError(t('collector.invalidJson'));
        return;
      }

      if (!Array.isArray(data) || data.length === 0) {
        setError(t('collector.emptyFile'));
        return;
      }

      // Validate structure
      const first = data[0];
      if (!first.providerId || !first.title || !first.priceInfo) {
        setError(t('collector.invalidFormat'));
        return;
      }

      const purchases = parseCollectorExport(data);

      // Compute per-provider summary
      const summary: Record<string, number> = {};
      for (const p of purchases) {
        summary[p.providerId] = (summary[p.providerId] || 0) + 1;
      }
      setProviderSummary(summary);

      // Start import
      setImportProgress({ total: purchases.length, processed: 0, added: 0, skipped: 0, updated: 0, enriched: 0 });

      const result = await addPurchases(purchases, (progress) => {
        setImportProgress({ ...progress });
      });

      // Currency conversion
      if (preferredCurrency && (result.added > 0 || result.updated > 0)) {
        setImportProgress(null);
        setConversionProgress({ total: 0, fetched: 0, cached: 0 });

        let finalProgress: ConversionProgress = { total: 0, fetched: 0, cached: 0 };
        try {
          await convertPurchases(preferredCurrency, (progress) => {
            finalProgress = { ...progress };
            setConversionProgress(finalProgress);
          });
        } catch (err) {
          console.error('[CollectorImport] Post-import conversion failed:', err);
        }

        if (finalProgress.total === 0) {
          setConversionProgress(null);
        }
      } else {
        setImportProgress(null);
      }

      setImportResult(result);

      tracker.trackEvent(AnalyticsEvents.FILE_IMPORT_COMPLETED, {
        providerId: 'collector',
        added: result.added,
        skipped: result.skipped,
        updated: result.updated,
        enriched: result.enriched,
        providers: Object.keys(summary),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      setImportProgress(null);
      tracker.trackEvent(AnalyticsEvents.FILE_IMPORT_FAILED, {
        providerId: 'collector',
        error: message,
      });
    }

    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {t('collector.importButton')}
          </Button>
          {error && (
            <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('collector.description')}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Import Progress Overlay */}
      {importProgress && (
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
                  My Purchases Collector
                </p>
              </div>
            </div>

            <div className="mt-4">
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

              <div className="mt-2 flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>{importProgress.processed} / {importProgress.total}</span>
                <span>
                  {importProgress.total > 0
                    ? `${Math.round((importProgress.processed / importProgress.total) * 100)}%`
                    : '0%'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
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
                <span className="flex items-center gap-1">
                  <ImagePlus className="h-3 w-3 text-purple-500" />
                  {t('providers.import.enriched')}: {importProgress.enriched}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Summary Modal */}
      {importResult && (
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
                    My Purchases Collector
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setImportResult(null);
                  setProviderSummary(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Provider breakdown */}
            {providerSummary && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  {t('collector.providerBreakdown')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(providerSummary).map(([pid, count]) => (
                    <span
                      key={pid}
                      className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {pid}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary stats */}
            <div className="mt-4 space-y-3">
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

              {importResult.enriched > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-purple-50 px-4 py-3 dark:bg-purple-900/20">
                  <span className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                    <ImagePlus className="h-4 w-4" />
                    {t('providers.import.enrichedItems')}
                  </span>
                  <span className="font-semibold text-purple-700 dark:text-purple-300">
                    {importResult.enriched}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5">
              <Button
                className="w-full"
                onClick={() => {
                  setImportResult(null);
                  setProviderSummary(null);
                }}
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Conversion Progress */}
      <CurrencyConversionProgress
        progress={conversionProgress}
        targetCurrency={preferredCurrency ?? ''}
        onClose={() => setConversionProgress(null)}
      />
    </>
  );
}
