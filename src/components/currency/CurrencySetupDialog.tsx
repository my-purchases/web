import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@/components/common';
import { COMMON_CURRENCIES } from '@/services/currencyService';
import { Search } from 'lucide-react';

interface CurrencySetupDialogProps {
  open: boolean;
  onSelect: (currency: string) => void;
  onClose?: () => void;
  dismissable?: boolean;
}

export function CurrencySetupDialog({
  open,
  onSelect,
  onClose,
  dismissable = false,
}: CurrencySetupDialogProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filteredCurrencies = useMemo(() => {
    if (!search) return COMMON_CURRENCIES;
    const q = search.toLowerCase();
    return COMMON_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [search]);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  const handleClose = () => {
    if (dismissable && onClose) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={t('currency.setupTitle')}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('currency.setupDescription')}
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('currency.searchCurrency')}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        {/* Currency grid */}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-800">
            {filteredCurrencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => setSelected(currency.code)}
                className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selected === currency.code
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <span className="w-12 text-sm font-bold text-gray-900 dark:text-white">
                  {currency.code}
                </span>
                <span className="w-8 text-center text-gray-500 dark:text-gray-400">
                  {currency.symbol}
                </span>
                <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                  {currency.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {dismissable && onClose && (
            <Button variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
          )}
          <Button onClick={handleConfirm} disabled={!selected}>
            {t('currency.setCurrency')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
