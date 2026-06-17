import {
    useGlobalSearchParams,
    usePathname,
    useRouter,
    type Href,
} from "expo-router";
import { createInstance } from "i18next";
import { createElement, useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import en from "@/locales/en.json";
import my from "@/locales/my.json";
import {
    persistStoredLanguage,
    PYONEA_LANGUAGE_STORAGE_KEY,
    readStoredLanguageSync,
    resolveStoredLanguage,
} from "@/utils/language-storage";
import { mergeRouterAndWebParams } from "@/utils/route-params";

export { PYONEA_LANGUAGE_STORAGE_KEY };

export const supportedLanguages = ["en", "my"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "my";

export const normalizeLanguage = (
  language?: string | null,
): SupportedLanguage => {
  const code = String(language || "")
    .toLowerCase()
    .replace("_", "-");

  if (code.startsWith("my") || code.startsWith("mm")) return "my";
  if (code.startsWith("en")) return "en";

  return "my";
};

export const localizeBilingualName = (
  language: SupportedLanguage,
  nameEn?: string,
  nameMm?: string,
  fallback = "",
) =>
  language === "my"
    ? nameMm || nameEn || fallback
    : nameEn || nameMm || fallback;

function readLangFromUrl(): SupportedLanguage | null {
  if (typeof window === "undefined") return null;

  const value = new URLSearchParams(window.location.search).get("lang");
  return value ? normalizeLanguage(value) : null;
}

/** Re-export for callers that already import from `@/i18n`. */
export { readWebQueryParams } from "@/utils/route-params";

export function mergeRouteLangFromLocation(
  pathname: string,
  routerParams: Record<string, string | string[] | undefined>,
  language: SupportedLanguage,
): string {
  return mergeRouteLang(
    pathname,
    mergeRouterAndWebParams(routerParams),
    language,
  );
}

export function getPreferredLanguage(): SupportedLanguage {
  if (Platform.OS === "web") {
    return readLangFromUrl() || readStoredLanguageSync() || DEFAULT_LANGUAGE;
  }

  return readStoredLanguageSync() || DEFAULT_LANGUAGE;
}

function detectInitialLanguage(): SupportedLanguage {
  return getPreferredLanguage();
}

export function syncDocumentLanguage(language: SupportedLanguage) {
  if (typeof document === "undefined") return;

  document.documentElement.lang = language;
  document.documentElement.dir = "ltr";
}

export function persistLanguage(language: SupportedLanguage) {
  void persistStoredLanguage(language);
}

export function mergeRouteLang(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
  language: SupportedLanguage,
): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key === "lang" || value == null || value === "") return;

    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
      return;
    }

    search.set(key, String(value));
  });

  // Web uses ?lang= for SEO/sharing; native keeps language in i18n + storage only.
  if (Platform.OS === "web") {
    search.set("lang", language);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
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
    (
      pathname: string,
      params: Record<string, string | string[] | undefined> = {},
    ) => mergeRouteLang(pathname, params, language) as Href,
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
  fallbackLng: "my",
  lng: initialLanguage,
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

syncDocumentLanguage(normalizeLanguage(i18n.resolvedLanguage || i18n.language));

i18n.on("languageChanged", (nextLanguage) => {
  const language = normalizeLanguage(nextLanguage);
  syncDocumentLanguage(language);
  persistLanguage(language);
});

export function useAppTranslation() {
  const [language, setLanguage] = useState(
    i18n.resolvedLanguage || i18n.language,
  );

  useEffect(() => {
    const handleLanguageChanged = (nextLanguage: string) => {
      setLanguage(nextLanguage);
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  // Re-create when language changes so useMemo(..., [t]) blocks refresh translations.
  const t = useCallback(
    (...args: Parameters<typeof i18n.t>) => i18n.t(...args),
    [language],
  );

  return {
    i18n,
    language: normalizeLanguage(language),
    t,
  };
}

/** Load saved language on native before first paint (no-op on web). */
export async function hydrateLanguageFromStorage(): Promise<void> {
  if (Platform.OS === "web") return;

  const preferred = await resolveStoredLanguage();
  const current = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  if (current !== preferred) {
    await i18n.changeLanguage(preferred);
  }
}

/** Instant toggle everywhere; web URL sync is handled by RouteLanguageSync. */
export function useChangeLanguage() {
  const { i18n } = useAppTranslation();

  return useCallback(
    (nextLanguage: SupportedLanguage) => {
      void i18n.changeLanguage(nextLanguage);
    },
    [i18n],
  );
}

function RouteLanguageSyncWeb() {
  const params = useGlobalSearchParams();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { i18n } = useAppTranslation();

  useEffect(() => {
    const fromUrl = readLangFromUrl();

    if (fromUrl) {
      if (normalizeLanguage(i18n.resolvedLanguage || i18n.language) === fromUrl)
        return;
      void i18n.changeLanguage(fromUrl);
      return;
    }

    const preferred = getPreferredLanguage();
    if (
      normalizeLanguage(i18n.resolvedLanguage || i18n.language) !== preferred
    ) {
      void i18n.changeLanguage(preferred);
    }

    if (typeof window !== "undefined") {
      const currentLang = new URLSearchParams(window.location.search).get(
        "lang",
      );
      if (currentLang === preferred) return;
    }

    router.replace(
      mergeRouteLangFromLocation(
        pathname,
        params as Record<string, string | string[] | undefined>,
        preferred,
      ) as Href,
    );
  }, [i18n, params, pathname, router]);

  useEffect(() => {
    const syncUrlToLanguage = (nextLanguage: string) => {
      const language = normalizeLanguage(nextLanguage);
      if (readLangFromUrl() === language) return;

      router.replace(
        mergeRouteLangFromLocation(
          pathname,
          params as Record<string, string | string[] | undefined>,
          language,
        ) as Href,
      );
    };

    i18n.on("languageChanged", syncUrlToLanguage);
    return () => {
      i18n.off("languageChanged", syncUrlToLanguage);
    };
  }, [i18n, params, pathname, router]);

  return null;
}

/** Keeps i18n and the URL in sync with `?lang=` on web only. */
export function RouteLanguageSync() {
  if (Platform.OS !== "web") {
    return null;
  }

  return createElement(RouteLanguageSyncWeb);
}

export default i18n;
