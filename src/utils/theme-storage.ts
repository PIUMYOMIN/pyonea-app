import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pyonea-theme';

export function readStoredThemeSync(): Theme | null {
  try {
    const saved = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
}

export async function readStoredThemeAsync(): Promise<Theme | null> {
  if (Platform.OS === 'web') {
    return readStoredThemeSync();
  }

  try {
    const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
}

export function resolveSystemTheme(): Theme {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'matchMedia' in window) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export function getInitialTheme(): Theme {
  return readStoredThemeSync() ?? resolveSystemTheme();
}

export async function persistTheme(theme: Theme): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore web storage failures.
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore native storage failures; in-memory session still updates.
  }
}

export function applyWebThemeClass(isDark: boolean) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';

  const background = isDark ? '#020617' : '#f9fafb';
  root.style.backgroundColor = background;
  if (document.body) {
    document.body.style.backgroundColor = background;
  }
}
