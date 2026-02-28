import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ShoppingCart, Settings, Info, Shield, Package, Chrome } from 'lucide-react';

const navItems = [
  { path: '/', icon: ShoppingCart, labelKey: 'nav.purchases' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { path: '/extension', icon: Chrome, labelKey: 'nav.extension' },
  { path: '/about', icon: Info, labelKey: 'nav.about' },
  { path: '/privacy', icon: Shield, labelKey: 'nav.privacy' },
];

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <Package className="h-6 w-6 text-primary-600" />
          <span className="hidden sm:inline">{t('common.appName')}</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ path, icon: Icon, labelKey }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{t(labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
