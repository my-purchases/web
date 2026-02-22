import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tracker } from '@/analytics';

export default function PrivacyPage() {
  const { t } = useTranslation();

  useEffect(() => {
    tracker.trackPageView('privacy');
  }, []);

  return (
    <div className="prose mx-auto max-w-2xl dark:prose-invert">
      <h2>{t('privacy.title')}</h2>
      <p>{t('privacy.intro')}</p>

      <h3>{t('privacy.localData')}</h3>
      <p>{t('privacy.localDataDescription')}</p>

      <h3>{t('privacy.providers')}</h3>
      <p>{t('privacy.providersDescription')}</p>

      <h3>{t('privacy.cookies')}</h3>
      <p>{t('privacy.cookiesDescription')}</p>

      <h3>{t('privacy.analytics')}</h3>
      <p>{t('privacy.analyticsDescription')}</p>

      <h3>{t('privacy.contact')}</h3>
      <p>{t('privacy.contactDescription')}</p>
    </div>
  );
}
