import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { PurchaseList, PurchaseFilters, CreateGroupModal, CalculateCostsModal } from '@/components/purchases';
import { ProviderPanel } from '@/components/providers';
import { usePurchaseStore, useSettingsStore } from '@/stores';
import { Button } from '@/components/common';
import { CurrencySetupDialog, CurrencyConversionProgress } from '@/components/currency';
import { TagAssignmentBar, useTagToggle } from '@/components/tags/TagAssignmentBar';
import type { TagAssignmentModeState } from '@/components/tags/TagAssignmentBar';
import type { ConversionProgress } from '@/services/currencyService';
import { PackagePlus, Trash2, Calculator } from 'lucide-react';
import { tracker } from '@/analytics';
import { useEffect } from 'react';
import { db } from '@/db';

export default function PurchasesPage() {
  const { t } = useTranslation();
  const { selectedPurchaseIds, deleteSelectedPurchases, convertPurchases } = usePurchaseStore();
  const { preferredCurrency, setPreferredCurrency } = useSettingsStore();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCostsModal, setShowCostsModal] = useState(false);
  const [showCurrencySetup, setShowCurrencySetup] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [tagMode, setTagMode] = useState<TagAssignmentModeState>({
    active: false,
    tagGroupId: null,
    tagValue: null,
  });
  const { assignedTargetIds, toggleTag } = useTagToggle(tagMode);

  // Check if user has purchases but no preferred currency
  const purchaseCount = useLiveQuery(() => db.purchases.count(), []);

  useEffect(() => {
    tracker.trackPageView('purchases');
  }, []);

  // Show currency setup dialog when user has purchases but no preferred currency
  useEffect(() => {
    if (purchaseCount && purchaseCount > 0 && !preferredCurrency) {
      setShowCurrencySetup(true);
    }
  }, [purchaseCount, preferredCurrency]);

  const handleCurrencySelect = async (currency: string) => {
    setShowCurrencySetup(false);
    setPreferredCurrency(currency);
    setConversionProgress({ total: 0, fetched: 0, cached: 0 });

    try {
      await convertPurchases(currency, (progress) => {
        setConversionProgress({ ...progress });
      });
    } catch (error) {
      console.error('[Purchases] Currency conversion failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <ProviderPanel />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('purchases.title')}
        </h2>
        <div className="flex items-center gap-2">
          <TagAssignmentBar mode={tagMode} onModeChange={setTagMode} />
          {selectedPurchaseIds.size >= 1 && (
            <Button
              variant="secondary"
              onClick={() => setShowCostsModal(true)}
            >
              <Calculator className="h-4 w-4" />
              {t('purchases.calculateCosts')} ({selectedPurchaseIds.size})
            </Button>
          )}
          {selectedPurchaseIds.size >= 1 && (
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm(t('purchases.deleteSelectedConfirm', { count: selectedPurchaseIds.size }))) {
                  deleteSelectedPurchases();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t('purchases.deleteSelected')} ({selectedPurchaseIds.size})
            </Button>
          )}
          {selectedPurchaseIds.size >= 2 && (
            <Button onClick={() => setShowGroupModal(true)}>
              <PackagePlus className="h-4 w-4" />
              {t('groups.create')} ({selectedPurchaseIds.size})
            </Button>
          )}
        </div>
      </div>

      <PurchaseFilters />
      <PurchaseList
        tagMode={tagMode}
        assignedTargetIds={assignedTargetIds}
        onTagToggle={toggleTag}
      />

      <CreateGroupModal
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
      />

      <CalculateCostsModal
        open={showCostsModal}
        onClose={() => setShowCostsModal(false)}
        selectedIds={selectedPurchaseIds}
      />

      <CurrencySetupDialog
        open={showCurrencySetup}
        onSelect={handleCurrencySelect}
        onClose={() => setShowCurrencySetup(false)}
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
