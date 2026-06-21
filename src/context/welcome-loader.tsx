import { usePathname } from 'expo-router';
import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { usePyoneaWelcomeLoader } from '@/hooks/use-pyonea-welcome-loader';
import { hasSeenWelcomeLoader } from '@/utils/welcome-loader-storage';

/** Safety cap — splash should disappear on the first React paint. */
const WELCOME_MAX_WAIT_MS = 3_000;

export function WelcomeLoaderProvider({ children }: PropsWithChildren) {
  const [contentDisplayed, setContentDisplayed] = useState(false);

  const markWelcomeContentDisplayed = useCallback(() => {
    setContentDisplayed(true);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || hasSeenWelcomeLoader()) {
      setContentDisplayed(true);
      return;
    }

    let raf = 0;
    raf = requestAnimationFrame(() => {
      markWelcomeContentDisplayed();
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [markWelcomeContentDisplayed]);

  useEffect(() => {
    if (Platform.OS !== 'web' || hasSeenWelcomeLoader() || contentDisplayed) return;

    const timeout = window.setTimeout(() => {
      markWelcomeContentDisplayed();
    }, WELCOME_MAX_WAIT_MS);

    return () => window.clearTimeout(timeout);
  }, [contentDisplayed, markWelcomeContentDisplayed]);

  usePyoneaWelcomeLoader(contentDisplayed, Platform.OS === 'web');

  return children;
}
