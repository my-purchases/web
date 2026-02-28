import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tracker } from '@/analytics';
import {
  Chrome,
  Github,
  ExternalLink,
  ShoppingBag,
  Zap,
  Download,
  Shield,
  Eye,
  MousePointerClick,
  FileSpreadsheet,
  Code,
  MonitorSmartphone,
} from 'lucide-react';

const STEPS = [
  { icon: Eye, key: 'step1' },
  { icon: MousePointerClick, key: 'step2' },
  { icon: FileSpreadsheet, key: 'step3' },
];

const FEATURES = [
  { icon: Zap, key: 'featureAutoCapture' },
  { icon: MousePointerClick, key: 'featureCollectAll' },
  { icon: Download, key: 'featureExportFormats' },
  { icon: ShoppingBag, key: 'featureCompatible' },
  { icon: Shield, key: 'featurePrivacy' },
  { icon: Code, key: 'featureOpenSource' },
];

export default function ExtensionPage() {
  const { t } = useTranslation();

  useEffect(() => {
    tracker.trackPageView('extension');
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Hero */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
          <Chrome className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
          {t('extension.subtitle')}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {t('extension.title')}
        </h2>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          {t('extension.description')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Chrome className="h-4 w-4" />
            {t('extension.installButton')}
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
          <a
            href="https://github.com/my-purchases/extensions/tree/master/chrome"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <Github className="h-4 w-4" />
            {t('extension.sourceButton')}
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* How It Works */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('extension.howItWorks')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, key }, index) => (
            <div
              key={key}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {index + 1}
                </span>
                <Icon className="h-5 w-5 text-primary-500" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {t(`extension.${key}Title`)}
              </h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t(`extension.${key}Description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('extension.features')}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t(`extension.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Requirements */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('extension.requirements')}
        </h3>
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <MonitorSmartphone className="h-4 w-4 shrink-0 text-gray-400" />
              {t('extension.requirementChrome')}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <ShoppingBag className="h-4 w-4 shrink-0 text-gray-400" />
              {t('extension.requirementAliexpress')}
            </li>
          </ul>
        </div>
      </section>

      {/* Privacy */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            {t('extension.privacy')}
          </span>
        </h3>
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('extension.privacyDescription')}{' '}
            <Link
              to="/privacy"
              className="text-primary-600 underline hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {t('extension.privacyLink')}
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
