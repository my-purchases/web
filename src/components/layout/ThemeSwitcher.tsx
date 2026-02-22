import { useTranslation } from 'react-i18next';
import { useSettingsStore, type Theme } from '@/stores';
import { Sun, Moon, Monitor } from 'lucide-react';

const themes: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'settings.themeLight' },
  { value: 'dark', icon: Moon, labelKey: 'settings.themeDark' },
  { value: 'system', icon: Monitor, labelKey: 'settings.themeSystem' },
];

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useSettingsStore();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
      {themes.map(({ value, icon: Icon, labelKey }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`rounded-md p-1.5 transition-colors ${
            theme === value
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
          title={t(labelKey)}
          aria-label={t(labelKey)}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
