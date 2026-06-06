// src/context/CookieContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGA, disableGA, trackPageView } from '../utils/analytics';

const STORAGE_KEY = 'pyonea_cookie_consent';

const defaultPreferences = {
  necessary: true,      // always true, cannot be disabled
  analytics: false,
  marketing: false,
  functional: false,
};

const CookieContext = createContext(null);

export const CookieProvider = ({ children }) => {
  const [consent, setConsent]     = useState(null);   // null = not decided yet
  const [prefs, setPrefs]         = useState(defaultPreferences);
  const [showBanner, setShowBanner] = useState(false);

  // Load saved consent on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConsent(parsed.consent);
        setPrefs({ ...defaultPreferences, ...parsed.prefs });
        setShowBanner(false);
      } else {
        // First visit — show banner after short delay
        const t = setTimeout(() => setShowBanner(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      setShowBanner(true);
    }
  }, []);

  // ── GA lifecycle — init when analytics consented, disable when revoked ──────
  useEffect(() => {
    if (prefs.analytics) {
      initGA();
      // Track the current page immediately after consent is granted.
      if (typeof window !== 'undefined') {
        trackPageView(window.location.pathname + window.location.search, document.title);
      }
    } else {
      disableGA();
    }
  }, [prefs.analytics]);

  const save = useCallback((newConsent, newPrefs) => {
    const data = {
      consent: newConsent,
      prefs: newPrefs,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setConsent(newConsent);
    setPrefs(newPrefs);
    setShowBanner(false);
  }, []);

  const acceptAll = useCallback(() => {
    save('accepted', { necessary: true, analytics: true, marketing: true, functional: true });
  }, [save]);

  const declineAll = useCallback(() => {
    save('declined', { ...defaultPreferences });
  }, [save]);

  const saveCustom = useCallback((customPrefs) => {
    save('custom', { ...defaultPreferences, ...customPrefs, necessary: true });
  }, [save]);

  const openBanner = useCallback(() => setShowBanner(true), []);

  return (
    <CookieContext.Provider value={{
      consent, prefs, showBanner,
      acceptAll, declineAll, saveCustom, openBanner,
    }}>
      {children}
    </CookieContext.Provider>
  );
};

export const useCookies = () => {
  const ctx = useContext(CookieContext);
  if (!ctx) throw new Error('useCookies must be used inside CookieProvider');
  return ctx;
};

export default CookieContext;