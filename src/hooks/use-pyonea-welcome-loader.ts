import { useEffect } from 'react';
import { Platform } from 'react-native';

import {
  hidePyoneaWelcomeLoader,
  PYONEA_WELCOME_COMPLETE_DELAY_MS,
  setPyoneaWelcomeProgress,
} from '@/utils/pyonea-welcome-loader';
import { hasSeenWelcomeLoader } from '@/utils/welcome-loader-storage';

export function usePyoneaWelcomeLoader(dataProgress: number, enabled = Platform.OS === 'web') {
  useEffect(() => {
    if (!enabled) return;

    if (hasSeenWelcomeLoader()) {
      hidePyoneaWelcomeLoader();
      return;
    }

    setPyoneaWelcomeProgress(dataProgress);

    if (dataProgress < 100) return;

    const timeout = window.setTimeout(() => {
      hidePyoneaWelcomeLoader(true);
    }, PYONEA_WELCOME_COMPLETE_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dataProgress, enabled]);
}
