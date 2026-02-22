import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Purchase, PurchaseGroup } from '@/db';
import { useGroupStore } from '@/stores';
import { PurchaseCard } from './PurchaseCard';
import { TagAssigner } from '@/components/tags/TagAssigner';
import { formatDate, formatCurrency } from '@/utils';
import { ChevronDown, ChevronUp, Layers, Trash2 } from 'lucide-react';

interface PurchaseGroupCardProps {
  group: PurchaseGroup;
  memberPurchases: Purchase[];
  totalPrice: number;
  latestDate: string;
  currency: string;
}

export function PurchaseGroupCard({
  group,
  memberPurchases,
  totalPrice,
  latestDate,
  currency,
}: PurchaseGroupCardProps) {
  const { t } = useTranslation();
  const { deleteGroup, removePurchaseFromGroup } = useGroupStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = () => {
    if (window.confirm(t('groups.confirmDelete', { name: group.name }))) {
      deleteGroup(group.id);
    }
  };

  return (
    <div className="rounded-xl border-2 border-accent-200 bg-accent-50/50 dark:border-accent-800 dark:bg-accent-900/10">
      {/* Group header */}
      <div className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-900/30">
          <Layers className="h-5 w-5 text-accent-600 dark:text-accent-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {group.name}
            </h3>
            <span className="flex-shrink-0 text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalPrice, currency)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatDate(latestDate)}</span>
            <span className="rounded-full bg-accent-100 px-2 py-0.5 font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              {t('groups.members', { count: memberPurchases.length })}
            </span>
          </div>
          {/* Tags for the group */}
          <div className="mt-2">
            <TagAssigner targetId={group.id} targetType="group" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
            title={isExpanded ? t('groups.collapse') : t('groups.expand')}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
            title={t('groups.deleteGroup')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded members */}
      {isExpanded && (
        <div className="border-t border-accent-200 p-4 dark:border-accent-800">
          <div className="space-y-2">
            {memberPurchases.map((purchase) => (
              <div key={purchase.id} className="relative">
                <PurchaseCard purchase={purchase} showTagAssigner={false} />
                <button
                  onClick={() => removePurchaseFromGroup(group.id, purchase.id)}
                  className="absolute right-2 top-2 rounded-lg p-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                  title={t('groups.removeItem')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
