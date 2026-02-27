import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Purchase, PurchaseGroup } from '@/db';
import { useGroupStore, useSettingsStore } from '@/stores';
import { PurchaseCard } from './PurchaseCard';
import { TagAssigner } from '@/components/tags/TagAssigner';
import { formatDate, formatCurrency } from '@/utils';
import { ChevronDown, ChevronUp, Layers, Trash2, Tag } from 'lucide-react';
import type { TagAssignmentModeState } from '@/components/tags/TagAssignmentBar';

interface PurchaseGroupCardProps {
  group: PurchaseGroup;
  memberPurchases: Purchase[];
  totalPrice: number;
  latestDate: string;
  currency: string;
  tagMode?: TagAssignmentModeState;
  isTagged?: boolean;
  onTagToggle?: () => void;
}

export function PurchaseGroupCard({
  group,
  memberPurchases,
  totalPrice,
  latestDate,
  currency,
  tagMode,
  isTagged,
  onTagToggle,
}: PurchaseGroupCardProps) {
  const { t } = useTranslation();
  const { deleteGroup, removePurchaseFromGroup } = useGroupStore();
  const { preferredCurrency } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const isTagMode = tagMode?.active && onTagToggle;

  // Compute converted total if preferred currency is set and members have converted prices
  const hasConvertedPrices =
    preferredCurrency &&
    memberPurchases.every(
      (p) => p.convertedPrice !== undefined && p.convertedCurrency === preferredCurrency,
    );
  const convertedTotal = hasConvertedPrices
    ? Math.round(memberPurchases.reduce((sum, p) => sum + (p.convertedPrice ?? 0), 0) * 100) / 100
    : null;
  const showConverted =
    convertedTotal !== null &&
    preferredCurrency &&
    memberPurchases.some((p) => p.currency !== preferredCurrency);

  const handleDelete = () => {
    if (window.confirm(t('groups.confirmDelete', { name: group.name }))) {
      deleteGroup(group.id);
    }
  };

  const handleGroupClick = () => {
    if (isTagMode) {
      onTagToggle();
    }
  };

  return (
    <div
      onClick={handleGroupClick}
      className={`rounded-xl border-2 ${
        isTagMode
          ? isTagged
            ? 'border-primary-500 ring-2 ring-primary-500/20 cursor-pointer bg-accent-50/50 dark:bg-accent-900/10'
            : 'border-accent-200 dark:border-accent-800 bg-accent-50/50 dark:bg-accent-900/10 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700'
          : 'border-accent-200 bg-accent-50/50 dark:border-accent-800 dark:bg-accent-900/10'
      }`}
    >
      {/* Group header */}
      <div className="flex items-center gap-4 p-4">
        {/* Tag mode indicator */}
        {isTagMode ? (
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
              isTagged
                ? 'bg-primary-500 text-white'
                : 'bg-accent-100 dark:bg-accent-900/30'
            }`}
          >
            {isTagged ? (
              <Tag className="h-5 w-5" />
            ) : (
              <Layers className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            )}
          </div>
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-900/30">
            <Layers className="h-5 w-5 text-accent-600 dark:text-accent-400" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {group.name}
            </h3>
            <span className="flex-shrink-0 text-right text-sm font-bold text-gray-900 dark:text-white">
              {showConverted ? (
                <>
                  <span className="block">
                    {formatCurrency(convertedTotal!, preferredCurrency!)}
                  </span>
                  <span className="block text-xs font-normal text-gray-400 dark:text-gray-500">
                    {formatCurrency(totalPrice, currency)}
                  </span>
                </>
              ) : (
                formatCurrency(totalPrice, currency)
              )}
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
