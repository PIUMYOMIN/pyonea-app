import { useEffect } from 'react';
import { Platform } from 'react-native';

import { hidePyoneaWelcomeLoader } from '@/utils/pyonea-welcome-loader';
import { hasSeenWelcomeLoader } from '@/utils/welcome-loader-storage';

/** Dismiss the HTML splash as soon as React has mounted the route shell. */
export function usePyoneaWelcomeLoader(contentReady: boolean, enabled = Platform.OS === 'web') {
  useEffect(() => {
    if (!enabled) return;

    if (hasSeenWelcomeLoader()) {
      hidePyoneaWelcomeLoader();
      return;
    }

    if (!contentReady) return;

    hidePyoneaWelcomeLoader(true);
  }, [contentReady, enabled]);
}
