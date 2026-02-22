import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import pl from './locales/pl.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import ptBR from './locales/pt-BR.json';
import ru from './locales/ru.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import tr from './locales/tr.json';

export const SUPPORTED_LANGUAGES = [
  'en', 'pl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR',
  'ru', 'ja', 'ko', 'zh-CN', 'zh-TW', 'ar', 'hi', 'bn', 'tr',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

const resources = {
  en: { translation: en },
  pl: { translation: pl },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  it: { translation: it },
  nl: { translation: nl },
  'pt-BR': { translation: ptBR },
  ru: { translation: ru },
  ja: { translation: ja },
  ko: { translation: ko },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  ar: { translation: ar },
  hi: { translation: hi },
  bn: { translation: bn },
  tr: { translation: tr },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'my-resources-language',
      caches: ['localStorage'],
    },
  });

// Update document direction for RTL languages
export function updateDocumentDirection(language: string): void {
  const isRTL = RTL_LANGUAGES.includes(language as SupportedLanguage);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}

// Set initial direction
updateDocumentDirection(i18n.language);

// Update direction on language change
i18n.on('languageChanged', updateDocumentDirection);

export default i18n;
