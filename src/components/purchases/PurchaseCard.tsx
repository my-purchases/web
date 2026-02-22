import { useTranslation } from 'react-i18next';
import type { Purchase } from '@/db';
import { usePurchaseStore } from '@/stores';
import { formatDate, formatCurrency } from '@/utils';
import { ExternalLink, Check } from 'lucide-react';
import { TagAssigner } from '@/components/tags/TagAssigner';

interface PurchaseCardProps {
  purchase: Purchase;
  showTagAssigner?: boolean;
}

export function PurchaseCard({ purchase, showTagAssigner = true }: PurchaseCardProps) {
  const { t } = useTranslation();
  const { selectedPurchaseIds, toggleSelection } = usePurchaseStore();
  const isSelected = selectedPurchaseIds.has(purchase.id);

  return (
    <div
      className={`group relative rounded-xl border bg-white p-4 transition-all hover:shadow-md dark:bg-gray-900 ${
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500/20'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex gap-4">
        {/* Selection checkbox */}
        <button
          onClick={() => toggleSelection(purchase.id)}
          className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
            isSelected
              ? 'border-primary-500 bg-primary-500 text-white'
              : 'border-gray-300 hover:border-primary-400 dark:border-gray-600'
          }`}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </button>

        {/* Image */}
        {purchase.imageUrl ? (
          <img
            src={purchase.imageUrl}
            alt={purchase.title}
            className="h-20 w-20 flex-shrink-0 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
            loading="lazy"
          />
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <span className="text-2xl text-gray-400">📦</span>
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
              {purchase.title}
            </h3>
            <span className="flex-shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
              {formatCurrency(purchase.price, purchase.currency)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatDate(purchase.purchaseDate)}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium dark:bg-gray-800">
              {purchase.providerId}
            </span>
            {purchase.categoryName && (
              <span>{purchase.categoryName}</span>
            )}
          </div>

          {/* Tags */}
          {showTagAssigner && (
            <div className="mt-2">
              <TagAssigner targetId={purchase.id} targetType="purchase" />
            </div>
          )}
        </div>

        {/* External link */}
        {purchase.originalUrl && (
          <a
            href={purchase.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex-shrink-0 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-primary-500 transition-all"
            title={t('purchases.viewOriginal')}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
