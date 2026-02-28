import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useSettingsStore } from '@/stores';
import { Modal, Button } from '@/components/common';
import { Calculator, ShoppingBag, Coins } from 'lucide-react';

interface CalculateCostsModalProps {
  open: boolean;
  onClose: () => void;
  selectedIds: Set<string>;
}

export function CalculateCostsModal({ open, onClose, selectedIds }: CalculateCostsModalProps) {
  const { t } = useTranslation();
  const { preferredCurrency } = useSettingsStore();

  const idArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const purchases = useLiveQuery(
    () => db.purchases.where('id').anyOf(idArray).toArray(),
    [idArray],
  );

  const summary = useMemo(() => {
    if (!purchases) return null;

    // Group by currency (original)
    const byCurrency: Record<string, { total: number; count: number }> = {};
    let convertedTotal: number | null = null;
    let allConverted = true;

    for (const p of purchases) {
      if (!byCurrency[p.currency]) {
        byCurrency[p.currency] = { total: 0, count: 0 };
      }
      byCurrency[p.currency].total += p.price;
      byCurrency[p.currency].count += 1;

      if (
        preferredCurrency &&
        p.convertedPrice !== undefined &&
        p.convertedCurrency === preferredCurrency
      ) {
        convertedTotal = (convertedTotal ?? 0) + p.convertedPrice;
      } else if (preferredCurrency && p.currency === preferredCurrency) {
        convertedTotal = (convertedTotal ?? 0) + p.price;
      } else {
        allConverted = false;
      }
    }

    return {
      count: purchases.length,
      byCurrency,
      convertedTotal: allConverted ? convertedTotal : null,
      convertedCurrency: allConverted ? preferredCurrency : null,
    };
  }, [purchases, preferredCurrency]);

  const formatPrice = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('purchases.calculateCosts')} size="sm">
      {summary && (
        <div className="space-y-4">
          {/* Purchase count */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
            <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <ShoppingBag className="h-4 w-4" />
              {t('purchases.costsSummary.selectedItems')}
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {summary.count}
            </span>
          </div>

          {/* Per-currency breakdown */}
          {Object.entries(summary.byCurrency).map(([currency, data]) => (
            <div
              key={currency}
              className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-900/20"
            >
              <span className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Coins className="h-4 w-4" />
                {currency} ({data.count})
              </span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                {formatPrice(data.total, currency)}
              </span>
            </div>
          ))}

          {/* Converted total */}
          {summary.convertedTotal !== null && summary.convertedCurrency && Object.keys(summary.byCurrency).length > 1 && (
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/20">
              <span className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <Calculator className="h-4 w-4" />
                {t('purchases.costsSummary.totalConverted')}
              </span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {formatPrice(summary.convertedTotal, summary.convertedCurrency)}
              </span>
            </div>
          )}

          {/* Single-currency total (show also when all purchases share one currency but converted is available) */}
          {summary.convertedTotal !== null && summary.convertedCurrency && Object.keys(summary.byCurrency).length === 1 && Object.keys(summary.byCurrency)[0] !== summary.convertedCurrency && (
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/20">
              <span className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <Calculator className="h-4 w-4" />
                {t('purchases.costsSummary.totalConverted')}
              </span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {formatPrice(summary.convertedTotal, summary.convertedCurrency)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-5">
        <Button className="w-full" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  );
}
