import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@/components/common';
import { importData, validateExportData } from '@/utils/exportImport';
import { readFileAsText } from '@/utils';
import { tracker, AnalyticsEvents } from '@/analytics';
import { Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'merge' | 'overwrite'>('merge');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);

      const isValid = validateExportData(data);

      if (!isValid) {
        setError(t('exportImport.importError'));
        setLoading(false);
        return;
      }

      await importData(data, mode);
      tracker.trackEvent(AnalyticsEvents.IMPORT_COMPLETED, {
        mode,
        fileName: file.name,
      });

      setDone(true);
      setTimeout(() => {
        setDone(false);
        setFile(null);
        onClose();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      tracker.trackEvent(AnalyticsEvents.IMPORT_FAILED, { error: message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setDone(false);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title={t('exportImport.importTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('exportImport.importDescription')}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
              {file.name}
            </span>
            <button
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-400"
          >
            <Upload className="h-5 w-5" />
            {t('exportImport.importFile')}
          </button>
        )}

        {file && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('exportImport.importMode')}
            </span>
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('exportImport.importMerge')}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === 'overwrite'}
                  onChange={() => setMode('overwrite')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('exportImport.importOverwrite')}
                </span>
              </label>
            </div>
            {mode === 'overwrite' && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                {t('exportImport.overwriteWarning')}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        {done ? (
          <div className="flex items-center justify-center gap-2 py-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{t('exportImport.importSuccess')}</span>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleImport} isLoading={loading} disabled={!file}>
              <Upload className="h-4 w-4" />
              {t('exportImport.importConfirm')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
