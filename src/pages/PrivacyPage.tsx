import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tracker } from '@/analytics';

export default function PrivacyPage() {
  const { t } = useTranslation();

  useEffect(() => {
    tracker.trackPageView('privacy');
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('privacy.title')}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('privacy.intro')}
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.localData')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.localDataDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.providers')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.providersDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.cookies')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.cookiesDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.analytics')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.analyticsDescription')}
        </p>
      </section>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('privacy.chromeExtension')}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionIntro')}
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionDataCollection')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionDataCollectionDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionCollectionMethod')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionCollectionMethodDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionStorage')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionStorageDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionDataTransmission')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionDataTransmissionDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionPermissions')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionPermissionsDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionExport')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionExportDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionRetention')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionRetentionDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionThirdParty')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionThirdPartyDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.chromeExtensionNoTracking')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.chromeExtensionNoTrackingDescription')}
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('privacy.contact')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('privacy.contactDescription')}
        </p>
      </section>
    </div>
  );
}
