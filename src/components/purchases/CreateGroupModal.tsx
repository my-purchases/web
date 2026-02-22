import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore, useGroupStore } from '@/stores';
import { Modal, Button } from '@/components/common';
import { PackagePlus } from 'lucide-react';
import { tracker, AnalyticsEvents } from '@/analytics';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const { t } = useTranslation();
  const { selectedPurchaseIds, clearSelection } = usePurchaseStore();
  const { createGroup } = useGroupStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCount = selectedPurchaseIds.size;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('groups.nameRequired'));
      return;
    }
    if (selectedCount < 2) {
      setError(t('groups.minPurchases'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createGroup(name.trim(), [...selectedPurchaseIds]);
      tracker.trackEvent(AnalyticsEvents.PURCHASE_GROUP_CREATED, {
        name: name.trim(),
        count: selectedCount,
      });
      clearSelection();
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title={t('groups.create')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('groups.createDescription', { count: selectedCount })}
        </p>

        <div>
          <label
            htmlFor="group-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t('groups.name')}
          </label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={t('groups.namePlaceholder')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            isLoading={loading}
            disabled={selectedCount < 2}
          >
            <PackagePlus className="h-4 w-4" />
            {t('groups.create')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
