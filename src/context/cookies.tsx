import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { readStoredCookieConsent, writeStoredCookieConsent } from '@/utils/consent-storage';
import { disableGA, initGA, trackPageView } from '@/utils/analytics';

export type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

type CookieConsent = 'accepted' | 'declined' | 'custom' | null;

type CookieContextValue = {
  consent: CookieConsent;
  prefs: CookiePreferences;
  showBanner: boolean;
  acceptAll: () => void;
  declineAll: () => void;
  saveCustom: (prefs: Partial<CookiePreferences>) => void;
  openBanner: () => void;
  closeBanner: () => void;
};

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  functional: false,
};

const CookieContext = createContext<CookieContextValue | null>(null);

export function CookieProvider({ children }: PropsWithChildren) {
  const [consent, setConsent] = useState<CookieConsent>(null);
  const [prefs, setPrefs] = useState<CookiePreferences>(defaultPreferences);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let mounted = true;
    let bannerTimer: ReturnType<typeof setTimeout> | undefined;

    void readStoredCookieConsent().then((stored) => {
      if (!mounted) return;

      if (stored) {
        setConsent(stored.consent ?? null);
        setPrefs(stored.prefs);
        setShowBanner(false);
        return;
      }

      bannerTimer = setTimeout(() => {
        if (mounted) setShowBanner(true);
      }, 800);
    });

    return () => {
      mounted = false;
      if (bannerTimer) clearTimeout(bannerTimer);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (prefs.analytics) {
      initGA();
      if (typeof window !== 'undefined') {
        trackPageView(window.location.pathname + window.location.search, document.title);
      }
    } else {
      disableGA();
    }
  }, [prefs.analytics]);

  const save = useCallback((nextConsent: CookieConsent, nextPrefs: CookiePreferences) => {
    const normalized = { ...defaultPreferences, ...nextPrefs, necessary: true };
    void writeStoredCookieConsent(nextConsent, normalized);
    setConsent(nextConsent);
    setPrefs(normalized);
    setShowBanner(false);
  }, []);

  const value = useMemo<CookieContextValue>(
    () => ({
      consent,
      prefs,
      showBanner,
      acceptAll: () =>
        save('accepted', {
          necessary: true,
          analytics: true,
          marketing: true,
          functional: true,
        }),
      declineAll: () => save('declined', defaultPreferences),
      saveCustom: (customPrefs) => save('custom', { ...defaultPreferences, ...customPrefs }),
      openBanner: () => setShowBanner(true),
      closeBanner: () => setShowBanner(false),
    }),
    [consent, prefs, save, showBanner]
  );

  return <CookieContext.Provider value={value}>{children}</CookieContext.Provider>;
}

export function useCookies() {
  const context = useContext(CookieContext);
  if (!context) throw new Error('useCookies must be used inside CookieProvider');
  return context;
}
