import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const PYONEA_LANGUAGE_STORAGE_KEY = 'pyonea_language';
const LEGACY_LANGUAGE_STORAGE_KEY = 'i18nextLng';
export const DEFAULT_STORED_LANGUAGE = 'my' as const;

export type StoredLanguage = 'en' | 'my';

export function normalizeStoredLanguage(language?: string | null): StoredLanguage {
  const code = String(language || '').toLowerCase().replace('_', '-');

  if (code.startsWith('my') || code.startsWith('mm')) return 'my';
  if (code.startsWith('en')) return 'en';

  return DEFAULT_STORED_LANGUAGE;
}

function readWebStoredLanguage(): StoredLanguage | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored =
      window.localStorage.getItem(PYONEA_LANGUAGE_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);

    return stored ? normalizeStoredLanguage(stored) : null;
  } catch {
    return null;
  }
}

function writeWebStoredLanguage(language: StoredLanguage) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PYONEA_LANGUAGE_STORAGE_KEY, language);
    window.localStorage.setItem(LEGACY_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures (private mode, blocked storage, etc.).
  }
}

export function readStoredLanguageSync(): StoredLanguage | null {
  if (Platform.OS !== 'web') return null;
  return readWebStoredLanguage();
}

export async function readStoredLanguageAsync(): Promise<StoredLanguage | null> {
  if (Platform.OS === 'web') {
    return readWebStoredLanguage();
  }

  try {
    const stored =
      (await AsyncStorage.getItem(PYONEA_LANGUAGE_STORAGE_KEY)) ||
      (await AsyncStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY));

    return stored ? normalizeStoredLanguage(stored) : null;
  } catch {
    return null;
  }
}

export async function persistStoredLanguage(language: StoredLanguage): Promise<void> {
  const normalized = normalizeStoredLanguage(language);

  if (Platform.OS === 'web') {
    writeWebStoredLanguage(normalized);
    return;
  }

  try {
    await AsyncStorage.setItem(PYONEA_LANGUAGE_STORAGE_KEY, normalized);
    await AsyncStorage.setItem(LEGACY_LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // Ignore native storage failures; in-memory session still updates.
  }
}

export async function resolveStoredLanguage(): Promise<StoredLanguage> {
  return (await readStoredLanguageAsync()) || DEFAULT_STORED_LANGUAGE;
}
