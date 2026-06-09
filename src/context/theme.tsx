import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setLight: () => void;
  setDark: () => void;
};

const storageKey = 'pyonea-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredTheme(): Theme | null {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
}

function saveTheme(theme: Theme) {
  try {
    globalThis.localStorage?.setItem(storageKey, theme);
  } catch {
    // Native platforms can run without localStorage; the active session still updates immediately.
  }
}

function getInitialTheme(): Theme {
  const saved = getStoredTheme();
  if (saved) return saved;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'matchMedia' in window) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function applyWebThemeClass(isDark: boolean) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const nativeWind = useNativeWindColorScheme();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isDark = theme === 'dark';

  useEffect(() => {
    nativeWind.setColorScheme(theme);
    applyWebThemeClass(isDark);
    saveTheme(theme);
    void SystemUI.setBackgroundColorAsync(isDark ? '#020617' : '#f9fafb');
  }, [isDark, nativeWind, theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
      setLight: () => setTheme('light'),
      setDark: () => setTheme('dark'),
    }),
    [isDark, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside AppThemeProvider');

  return context;
}
