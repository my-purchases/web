import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common';
import type { ConversionProgress } from '@/services/currencyService';

interface CurrencyConversionProgressProps {
  progress: ConversionProgress | null;
  targetCurrency: string;
  onClose?: () => void;
}

export function CurrencyConversionProgress({
  progress,
  targetCurrency,
  onClose,
}: CurrencyConversionProgressProps) {
  const { t } = useTranslation();

  if (!progress) return null;

  const done = progress.fetched + progress.cached;
  const percentage = progress.total > 0 ? Math.round((done / progress.total) * 100) : 0;
  const isComplete = progress.total > 0 && done >= progress.total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <span className="text-xl">{isComplete ? '✅' : '💱'}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isComplete ? t('currency.conversionComplete') : t('currency.convertingTitle')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isComplete
              ? t('currency.conversionCompleteDescription', { currency: targetCurrency })
              : t('currency.convertingDescription', { currency: targetCurrency })}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              isComplete ? 'bg-green-500' : 'bg-primary-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Counter */}
        <div className="mb-4 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {done} / {progress.total} {t('currency.ratesFetched')}
          </span>
          <span>{percentage}%</span>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {t('currency.fromApi')}: {progress.fetched}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {t('currency.fromCache')}: {progress.cached}
            </span>
          </div>
        </div>

        {/* Close button — shown only when conversion is complete */}
        {isComplete && onClose && (
          <div className="mt-5">
            <Button className="w-full" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
