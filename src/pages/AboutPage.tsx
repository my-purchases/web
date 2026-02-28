import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tracker } from '@/analytics';
import {
  ShoppingBag,
  Calculator,
  ArrowRightLeft,
  Tags,
  PackagePlus,
  Download,
  Shield,
  Globe,
  Moon,
  Github,
  ExternalLink,
  Heart,
  Check,
  Clock,
} from 'lucide-react';

const SUPPORT_LINKS = [
  {
    name: 'PayPal',
    url: 'https://paypal.me/zenedithPL',
    color: 'bg-[#003087] hover:bg-[#001F5C]',
    logo: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.629h6.724c2.332 0 3.978.498 4.896 1.481.857.917 1.166 2.199.919 3.815l-.008.052v.54l.42.238c.35.185.631.407.848.667.258.31.431.692.514 1.136.086.458.082.996-.012 1.6-.109.695-.304 1.3-.584 1.797a3.782 3.782 0 0 1-.97 1.177 3.848 3.848 0 0 1-1.26.702c-.474.164-1.026.28-1.638.345-.625.066-1.283.099-1.955.099H12.43a.925.925 0 0 0-.613.232.957.957 0 0 0-.311.579l-.026.148-.443 2.803-.02.106a.157.157 0 0 1-.05.092.142.142 0 0 1-.09.033H7.076zm1.817-13.77a.525.525 0 0 0-.518.444l-.828 5.252a.32.32 0 0 0 .317.371h1.283c1.548 0 2.673-.322 3.341-.955.674-.64.997-1.557.997-2.848 0-.87-.263-1.529-.784-1.958-.527-.434-1.35-.654-2.448-.654H8.893v.35-.001z" />
      </svg>
    ),
  },
  {
    name: 'Ko-fi',
    url: 'https://ko-fi.com/K3K11ABGW5',
    color: 'bg-[#FF5E5B] hover:bg-[#E54542]',
    logo: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
      </svg>
    ),
  },
  {
    name: 'Patreon',
    url: 'https://patreon.com/Zenedith',
    color: 'bg-[#FF424D] hover:bg-[#E53A45]',
    logo: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524zM.003 23.537h4.22V.524H.003z" />
      </svg>
    ),
  },
];

const PROVIDERS = [
  { name: 'Allegro', type: 'hybrid', active: true },
  { name: 'Amazon', type: 'import', active: true },
  { name: 'AliExpress', type: 'import', active: true },
  { name: 'Temu', type: 'import', active: true },
  { name: 'eBay', type: 'import', active: false },
  { name: 'OLX', type: 'import', active: false },
  { name: 'Vinted', type: 'import', active: false },
  { name: 'Allegro Lokalnie', type: 'import', active: false },
];

const TECH_STACK = [
  { name: 'React 19', description: 'TypeScript 5.9' },
  { name: 'Vite 7', description: 'Build tool' },
  { name: 'Tailwind CSS v4', description: 'Styling' },
  { name: 'Zustand 5', description: 'State management' },
  { name: 'Dexie.js 4', description: 'IndexedDB' },
  { name: 'react-i18next', description: '17 languages' },
];

export default function AboutPage() {
  const { t } = useTranslation();

  useEffect(() => {
    tracker.trackPageView('about');
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
          <ShoppingBag className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('about.title')}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('about.description')}
        </p>
      </div>

      {/* Features */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('about.features')}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: ShoppingBag, key: 'feature1' },
            { icon: Calculator, key: 'feature2' },
            { icon: ArrowRightLeft, key: 'feature3' },
            { icon: Tags, key: 'feature4' },
            { icon: PackagePlus, key: 'feature5' },
            { icon: Download, key: 'feature6' },
            { icon: Globe, key: 'feature7' },
            { icon: Moon, key: 'feature8' },
            { icon: Shield, key: 'feature9' },
          ].map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t(`about.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Providers */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('about.providers')}
        </h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                  {t('about.providerName')}
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                  {t('about.providerType')}
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                  {t('about.providerStatus')}
                </th>
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((provider) => (
                <tr
                  key={provider.name}
                  className={`border-b border-gray-100 last:border-0 dark:border-gray-800 ${
                    !provider.active ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                    {provider.name}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    {provider.type === 'hybrid'
                      ? t('about.typeHybrid')
                      : t('about.typeImport')}
                  </td>
                  <td className="px-4 py-2">
                    {provider.active ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="h-3.5 w-3.5" />
                        {t('about.statusActive')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        {t('providers.comingSoon')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Technology Stack */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('about.technology')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TECH_STACK.map((tech) => (
            <div
              key={tech.name}
              className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {tech.name}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tech.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Open Source */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('about.openSource')}
        </h3>
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('about.openSourceDescription')}
          </p>
          <a
            href="https://github.com/mobulum/my-purchases/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <Github className="h-4 w-4" />
            {t('about.viewOnGitHub')}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* Support */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {t('about.support')}
          </span>
        </h3>
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {t('about.supportDescription')}
          </p>
          <div className="flex flex-wrap gap-3">
            {SUPPORT_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${link.color}`}
              >
                {link.logo}
                {link.name}
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
