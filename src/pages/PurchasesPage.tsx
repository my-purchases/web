import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PurchaseList, PurchaseFilters, CreateGroupModal } from '@/components/purchases';
import { ProviderPanel } from '@/components/providers';
import { usePurchaseStore } from '@/stores';
import { Button } from '@/components/common';
import { TagAssignmentBar, useTagToggle } from '@/components/tags/TagAssignmentBar';
import type { TagAssignmentModeState } from '@/components/tags/TagAssignmentBar';
import { PackagePlus, Trash2 } from 'lucide-react';
import { tracker } from '@/analytics';
import { useEffect } from 'react';

export default function PurchasesPage() {
  const { t } = useTranslation();
  const { selectedPurchaseIds, deleteSelectedPurchases } = usePurchaseStore();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [tagMode, setTagMode] = useState<TagAssignmentModeState>({
    active: false,
    tagGroupId: null,
    tagValue: null,
  });
  const { assignedTargetIds, toggleTag } = useTagToggle(tagMode);

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
        <div className="flex items-center gap-2">
          <TagAssignmentBar mode={tagMode} onModeChange={setTagMode} />
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
    </div>
  );
}
