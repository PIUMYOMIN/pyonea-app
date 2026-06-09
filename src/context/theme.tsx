import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform, View } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import {
  applyWebThemeClass,
  getInitialTheme,
  persistTheme,
  readStoredThemeAsync,
  type Theme,
} from '@/utils/theme-storage';

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setLight: () => void;
  setDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyNativeAppearance(theme: Theme) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(theme);
}

function applyThemeEverywhere(theme: Theme, setColorScheme: (scheme: Theme) => void) {
  const isDark = theme === 'dark';

  setColorScheme(theme);
  applyWebThemeClass(isDark);
  applyNativeAppearance(theme);
  void SystemUI.setBackgroundColorAsync(isDark ? '#020617' : '#f9fafb');
  void persistTheme(theme);
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const { setColorScheme } = useNativeWindColorScheme();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isDark = theme === 'dark';

  useLayoutEffect(() => {
    applyThemeEverywhere(theme, setColorScheme);
  }, [setColorScheme, theme]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;

    void readStoredThemeAsync().then((saved) => {
      if (!active || !saved) return;
      setTheme((current) => (current === saved ? current : saved));
    });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
      setLight: () => setTheme('light'),
      setDark: () => setTheme('dark'),
    }),
    [isDark, theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View className={`flex-1 ${isDark ? 'dark' : ''}`}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside AppThemeProvider');

  return context;
}
