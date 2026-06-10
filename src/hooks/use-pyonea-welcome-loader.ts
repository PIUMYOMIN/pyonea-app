import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import {
  computeWelcomeDisplayProgress,
  getWelcomeLoaderStartedAt,
  hidePyoneaWelcomeLoader,
  isWelcomeLoaderReadyToHide,
  PYONEA_WELCOME_COMPLETE_DELAY_MS,
  setPyoneaWelcomeProgress,
} from '@/utils/pyonea-welcome-loader';
import { hasSeenWelcomeLoader } from '@/utils/welcome-loader-storage';

export function usePyoneaWelcomeLoader(dataProgress: number, enabled = Platform.OS === 'web') {
  const dataProgressRef = useRef(dataProgress);
  dataProgressRef.current = dataProgress;

  useEffect(() => {
    if (!enabled) return;

    if (hasSeenWelcomeLoader()) {
      hidePyoneaWelcomeLoader();
      return;
    }

    let raf = 0;
    let completeTimeout: ReturnType<typeof setTimeout> | null = null;
    let finished = false;
    const startedAt = getWelcomeLoaderStartedAt();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const data = dataProgressRef.current;
      const display = computeWelcomeDisplayProgress(elapsed, data);

      setPyoneaWelcomeProgress(display);

      if (isWelcomeLoaderReadyToHide(elapsed, data, display) && !finished) {
        finished = true;
        completeTimeout = window.setTimeout(() => {
          hidePyoneaWelcomeLoader(true);
        }, PYONEA_WELCOME_COMPLETE_DELAY_MS);
        return;
      }

      if (!finished) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      if (completeTimeout) {
        window.clearTimeout(completeTimeout);
      }
    };
  }, [enabled]);
}
