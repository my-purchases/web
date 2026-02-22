import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PurchaseList, PurchaseFilters, CreateGroupModal } from '@/components/purchases';
import { ProviderPanel } from '@/components/providers';
import { usePurchaseStore } from '@/stores';
import { Button } from '@/components/common';
import { PackagePlus } from 'lucide-react';
import { tracker } from '@/analytics';
import { useEffect } from 'react';

export default function PurchasesPage() {
  const { t } = useTranslation();
  const { selectedPurchaseIds } = usePurchaseStore();
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    tracker.trackPageView('purchases');
  }, []);

  return (
    <div className="space-y-6">
      <ProviderPanel />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('purchases.title')}
        </h2>
        {selectedPurchaseIds.size >= 2 && (
          <Button onClick={() => setShowGroupModal(true)}>
            <PackagePlus className="h-4 w-4" />
            {t('groups.create')} ({selectedPurchaseIds.size})
          </Button>
        )}
      </div>

      <PurchaseFilters />
      <PurchaseList />

      <CreateGroupModal
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
      />
    </div>
  );
}
