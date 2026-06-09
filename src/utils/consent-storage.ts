import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { CookiePreferences } from '@/context/cookies';

const storageKey = 'pyonea_cookie_consent';

type StoredConsent = {
  consent?: 'accepted' | 'declined' | 'custom' | null;
  prefs?: Partial<CookiePreferences>;
};

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  functional: false,
};

function readWebConsent(): StoredConsent | null {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey);
    if (!saved) return null;
    return JSON.parse(saved) as StoredConsent;
  } catch {
    return null;
  }
}

function writeWebConsent(consent: StoredConsent['consent'], prefs: CookiePreferences) {
  try {
    globalThis.localStorage?.setItem(
      storageKey,
      JSON.stringify({
        consent,
        prefs,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore web storage failures.
  }
}

async function readNativeConsent(): Promise<StoredConsent | null> {
  try {
    const saved = await SecureStore.getItemAsync(storageKey);
    if (!saved) return null;
    return JSON.parse(saved) as StoredConsent;
  } catch {
    return null;
  }
}

async function writeNativeConsent(consent: StoredConsent['consent'], prefs: CookiePreferences) {
  try {
    await SecureStore.setItemAsync(
      storageKey,
      JSON.stringify({
        consent,
        prefs,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore native storage failures; in-memory session still updates.
  }
}

export async function readStoredCookieConsent(): Promise<{
  consent: StoredConsent['consent'];
  prefs: CookiePreferences;
} | null> {
  const stored = Platform.OS === 'web' ? readWebConsent() : await readNativeConsent();
  if (!stored) return null;

  return {
    consent: stored.consent || null,
    prefs: { ...defaultPreferences, ...stored.prefs, necessary: true },
  };
}

export async function writeStoredCookieConsent(
  consent: StoredConsent['consent'],
  prefs: CookiePreferences
) {
  const normalized = { ...defaultPreferences, ...prefs, necessary: true };

  if (Platform.OS === 'web') {
    writeWebConsent(consent, normalized);
    return;
  }

  await writeNativeConsent(consent, normalized);
}
