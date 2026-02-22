import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvitationStore } from '@/stores';
import { Button } from '@/components/common';
import { KeyRound, Upload, Sparkles } from 'lucide-react';

export function InvitationEntry() {
  const { t } = useTranslation();
  const { loadFromCode, importFromFile, isLoading, error } = useInvitationStore();
  const [code, setCode] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      loadFromCode(code.trim());
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importFromFile(file);
    }
  };

  const handleDemo = () => {
    loadFromCode('demo');
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <KeyRound className="h-10 w-10 text-primary-600 dark:text-primary-400" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('invitation.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('invitation.subtitle')}
          </p>
        </div>

        {/* Code input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('invitation.codePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg font-mono focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={!code.trim()}
          >
            <KeyRound className="h-5 w-5" />
            {t('invitation.enterCode')}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-50 px-4 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
              {t('common.or', 'or')}
            </span>
          </div>
        </div>

        {/* Alternative actions */}
        <div className="space-y-3">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
            {t('invitation.importFile')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />

          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={handleDemo}
            isLoading={isLoading}
          >
            <Sparkles className="h-5 w-5" />
            {t('invitation.demoCode')}
          </Button>
        </div>
      </div>
    </div>
  );
}
