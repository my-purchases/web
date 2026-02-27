import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvitationStore, usePurchaseStore, useSettingsStore } from '@/stores';
import { TagGroupManager } from '@/components/tags';
import { ExportDialog, ImportDialog } from '@/components/data';
import { LanguageSwitcher, ThemeSwitcher } from '@/components/layout';
import { CurrencySetupDialog, CurrencyConversionProgress } from '@/components/currency';
import { Button } from '@/components/common';
import { tracker, AnalyticsEvents } from '@/analytics';
import { COMMON_CURRENCIES } from '@/services/currencyService';
import type { ConversionProgress } from '@/services/currencyService';
import {
  Download,
  Upload,
  Trash2,
  LogOut,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { db } from '@/db';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { invitation, clearInvitation } = useInvitationStore();
  const { clearAllPurchases, rebuildConvertedPrices } = usePurchaseStore();
  const { preferredCurrency, setPreferredCurrency } = useSettingsStore();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    tracker.trackPageView('settings');
  }, []);

  const handleClearAll = async () => {
    await db.purchases.clear();
    await db.purchaseGroups.clear();
    await db.tagGroups.clear();
    await db.tagAssignments.clear();
    await db.syncState.clear();
    await db.currencyRates.clear();
    clearAllPurchases();
    setShowClearConfirm(false);
    tracker.trackEvent(AnalyticsEvents.DATA_CLEARED);
  };

  const handleLogout = () => {
    clearInvitation();
    tracker.trackEvent(AnalyticsEvents.INVITATION_REMOVED);
    window.location.reload();
  };

  const handleCurrencyChange = async (currency: string) => {
    setShowCurrencyPicker(false);
    setPreferredCurrency(currency);
    setIsConverting(true);
    setConversionProgress({ total: 0, fetched: 0, cached: 0 });

    try {
      await rebuildConvertedPrices(currency, (progress) => {
        setConversionProgress({ ...progress });
      });
    } catch (error) {
      console.error('[Settings] Currency conversion failed:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const currentCurrencyInfo = preferredCurrency
    ? COMMON_CURRENCIES.find((c) => c.code === preferredCurrency)
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        {t('settings.title')}
      </h2>

      {/* Appearance */}
      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('settings.appearance')}
        </h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings.theme')}
            </p>
            <ThemeSwitcher />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings.language')}
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </section>

      {/* Currency */}
      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('currency.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('currency.settingsDescription')}
        </p>
        <div className="flex items-center gap-3">
          {preferredCurrency ? (
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-50 px-3 py-2 dark:bg-primary-900/20">
                <span className="font-bold text-primary-700 dark:text-primary-300">
                  {preferredCurrency}
                </span>
                {currentCurrencyInfo && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    {currentCurrencyInfo.symbol} — {currentCurrencyInfo.name}
                  </span>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCurrencyPicker(true)}
                disabled={isConverting}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('currency.changeCurrency')}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowCurrencyPicker(true)}>
              {t('currency.setCurrency')}
            </Button>
          )}
        </div>
      </section>

      {/* Tags */}
      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('settings.tagManagement')}
        </h3>
        <TagGroupManager />
      </section>

      {/* Data Management */}
      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('settings.dataManagement')}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowExport(true)}>
            <Download className="h-4 w-4" />
            {t('exportImport.exportTitle')}
          </Button>
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            {t('exportImport.importTitle')}
          </Button>
        </div>

        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          {showClearConfirm ? (
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">
                {t('settings.clearConfirm')}
              </span>
              <Button variant="danger" size="sm" onClick={handleClearAll}>
                {t('common.confirm')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setShowClearConfirm(true)}>
              <Trash2 className="h-4 w-4" />
              {t('settings.clearAllData')}
            </Button>
          )}
        </div>
      </section>

      {/* Account */}
      {invitation && (
        <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('settings.account')}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {invitation.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('invitation.code')}: {invitation.code}
              </p>
            </div>
            <Button variant="danger" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              {t('settings.logout')}
            </Button>
          </div>
        </section>
      )}

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
      <CurrencySetupDialog
        open={showCurrencyPicker}
        onSelect={handleCurrencyChange}
        onClose={() => setShowCurrencyPicker(false)}
        dismissable
      />
      <CurrencyConversionProgress
        progress={conversionProgress}
        targetCurrency={preferredCurrency ?? ''}
        onClose={() => setConversionProgress(null)}
      />
    </div>
  );
}
