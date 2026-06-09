import * as Localization from 'expo-localization';
import { createInstance } from 'i18next';
import { useEffect, useState } from 'react';

import en from '@/locales/en.json';
import my from '@/locales/my.json';

export const supportedLanguages = ['en', 'my'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const normalizeLanguage = (language?: string | null): SupportedLanguage => {
  const code = String(language || '').toLowerCase().replace('_', '-');

  if (code.startsWith('my') || code.startsWith('mm')) return 'my';
  if (code.startsWith('en')) return 'en';

  return 'my';
};

export const localizeBilingualName = (
  language: SupportedLanguage,
  nameEn?: string,
  nameMm?: string,
  fallback = '',
) => (language === 'my' ? nameMm || nameEn || fallback : nameEn || nameMm || fallback);

const deviceLanguage = normalizeLanguage(Localization.getLocales()[0]?.languageCode);
const i18n = createInstance();

void i18n.init({
  resources: {
    en: { translation: en },
    my: { translation: my },
  },
  supportedLngs: supportedLanguages,
  fallbackLng: 'my',
  lng: deviceLanguage,
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

const translate = i18n.t.bind(i18n);

export function useAppTranslation() {
  const [language, setLanguage] = useState(i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    const handleLanguageChanged = (nextLanguage: string) => {
      setLanguage(nextLanguage);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  return {
    i18n,
    language: normalizeLanguage(language),
    t: translate,
  };
}

export default i18n;
