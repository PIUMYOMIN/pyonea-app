import { useSyncExternalStore } from 'react';

import { useTheme as useAppTheme } from '@/context/theme';

/**
 * Returns the app theme preference (not the OS color scheme).
 * Keeps a hydration-safe fallback for web static rendering.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { theme } = useAppTheme();

  if (hasHydrated) {
    return theme;
  }

  return 'light';
}
