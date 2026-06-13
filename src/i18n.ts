import * as Localization from 'expo-localization';
import { useGlobalSearchParams, usePathname, useRouter, type Href } from 'expo-router';
import { createInstance } from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import en from '@/locales/en.json';
import my from '@/locales/my.json';

export const supportedLanguages = ['en', 'my'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'my';

export const PYONEA_LANGUAGE_STORAGE_KEY = 'pyonea_language';
const LEGACY_LANGUAGE_STORAGE_KEY = 'i18nextLng';

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

function readLangFromUrl(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;

  const value = new URLSearchParams(window.location.search).get('lang');
  return value ? normalizeLanguage(value) : null;
}

function readStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored =
      window.localStorage.getItem(PYONEA_LANGUAGE_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);

    return stored ? normalizeLanguage(stored) : null;
  } catch {
    return null;
  }
}

export function getPreferredLanguage(): SupportedLanguage {
  if (Platform.OS === 'web') {
    return readLangFromUrl() || readStoredLanguage() || DEFAULT_LANGUAGE;
  }

  return (
    readStoredLanguage() ||
    normalizeLanguage(Localization.getLocales()[0]?.languageCode) ||
    DEFAULT_LANGUAGE
  );
}

function detectInitialLanguage(): SupportedLanguage {
  return getPreferredLanguage();
}

export function syncDocumentLanguage(language: SupportedLanguage) {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = language;
  document.documentElement.dir = 'ltr';
}

export function persistLanguage(language: SupportedLanguage) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PYONEA_LANGUAGE_STORAGE_KEY, language);
    window.localStorage.setItem(LEGACY_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures (private mode, blocked storage, etc.).
  }
}

export function mergeRouteLang(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
  language: SupportedLanguage,
): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key === 'lang' || value == null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
      return;
    }

    search.set(key, String(value));
  });

  search.set('lang', language);
  return `${pathname}?${search.toString()}`;
}

/** Shorthand for internal links that should preserve the active language. */
export function localizedHref(
  pathname: string,
  language: SupportedLanguage,
  params: Record<string, string | string[] | undefined> = {},
) {
  return mergeRouteLang(pathname, params, language);
}

export function useLocalizedHref() {
  const { language } = useAppTranslation();

  return useCallback(
    (pathname: string, params: Record<string, string | string[] | undefined> = {}) =>
      mergeRouteLang(pathname, params, language) as Href,
    [language],
  );
}

const initialLanguage = detectInitialLanguage();
const i18n = createInstance();

void i18n.init({
  resources: {
    en: { translation: en },
    my: { translation: my },
  },
  supportedLngs: supportedLanguages,
  fallbackLng: 'my',
  lng: initialLanguage,
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

syncDocumentLanguage(normalizeLanguage(i18n.resolvedLanguage || i18n.language));

i18n.on('languageChanged', (nextLanguage) => {
  const language = normalizeLanguage(nextLanguage);
  syncDocumentLanguage(language);
  persistLanguage(language);
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

/** Keeps i18n and the URL in sync with `?lang=` (default Myanmar until user switches). */
export function RouteLanguageSync() {
  const params = useGlobalSearchParams<Record<string, string | string[] | undefined>>();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { i18n } = useAppTranslation();

  const routeLangValue = Array.isArray(params.lang) ? params.lang[0] : params.lang;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const fromRoute = routeLangValue ? normalizeLanguage(routeLangValue) : null;
      if (!fromRoute) return;
      if (normalizeLanguage(i18n.resolvedLanguage || i18n.language) === fromRoute) return;
      void i18n.changeLanguage(fromRoute);
      return;
    }

    const fromUrl = readLangFromUrl();

    if (fromUrl) {
      if (normalizeLanguage(i18n.resolvedLanguage || i18n.language) === fromUrl) return;
      void i18n.changeLanguage(fromUrl);
      return;
    }

    const preferred = getPreferredLanguage();
    if (normalizeLanguage(i18n.resolvedLanguage || i18n.language) !== preferred) {
      void i18n.changeLanguage(preferred);
    }

    if (typeof window !== 'undefined') {
      const currentLang = new URLSearchParams(window.location.search).get('lang');
      if (currentLang === preferred) return;
    }

    router.replace(
      mergeRouteLang(pathname, params, preferred) as Href,
    );
  }, [i18n, params, pathname, routeLangValue, router]);

  return null;
}

export default i18n;
