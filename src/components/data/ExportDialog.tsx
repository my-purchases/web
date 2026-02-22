import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@/components/common';
import { exportToFile, type ExportOptions } from '@/utils/exportImport';
import { tracker, AnalyticsEvents } from '@/analytics';
import { Download, CheckCircle } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ExportOptions>({
    purchases: true,
    groups: true,
    tags: true,
    settings: true,
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportToFile(options);
      tracker.trackEvent(AnalyticsEvents.EXPORT_STARTED, { options });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('exportImport.exportTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('exportImport.exportDescription')}
        </p>

        <div className="space-y-2">
          {(
            [
              ['purchases', 'exportImport.exportPurchases'],
              ['groups', 'exportImport.exportGroups'],
              ['tags', 'exportImport.exportTags'],
              ['settings', 'exportImport.exportSettings'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options[key as keyof ExportOptions]}
                onChange={() => toggleOption(key as keyof ExportOptions)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t(label)}
              </span>
            </label>
          ))}
        </div>

        {done ? (
          <div className="flex items-center justify-center gap-2 py-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{t('exportImport.exportSuccess')}</span>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleExport}
              isLoading={loading}
              disabled={!Object.values(options).some(Boolean)}
            >
              <Download className="h-4 w-4" />
              {t('common.export')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
