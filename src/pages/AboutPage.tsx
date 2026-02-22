import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tracker } from '@/analytics';

export default function AboutPage() {
  const { t } = useTranslation();

  useEffect(() => {
    tracker.trackPageView('about');
  }, []);

  return (
    <div className="prose mx-auto max-w-2xl dark:prose-invert">
      <h2>{t('about.title')}</h2>
      <p>{t('about.description')}</p>

      <h3>{t('about.features')}</h3>
      <ul>
        <li>{t('about.feature1')}</li>
        <li>{t('about.feature2')}</li>
        <li>{t('about.feature3')}</li>
        <li>{t('about.feature4')}</li>
        <li>{t('about.feature5')}</li>
      </ul>

      <h3>{t('about.openSource')}</h3>
      <p>
        {t('about.openSourceDescription')}{' '}
        <a
          href="https://github.com/zenedith/my-resources"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          GitHub
        </a>
      </p>

      <h3>{t('about.technology')}</h3>
      <ul>
        <li>React + TypeScript</li>
        <li>Vite</li>
        <li>Tailwind CSS</li>
        <li>Dexie.js (IndexedDB)</li>
        <li>Zustand</li>
        <li>react-i18next</li>
      </ul>
    </div>
  );
}
