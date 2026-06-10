import { Platform } from 'react-native';

import { markWelcomeLoaderSeen } from '@/utils/welcome-loader-storage';

/** Animate fill to at least 50% before real data can push higher. */
export const PYONEA_WELCOME_HALF_MS = 1200;

/** Brief pause at 100% so the filled logo is visible before dismiss. */
export const PYONEA_WELCOME_COMPLETE_DELAY_MS = 500;

declare global {
  interface Window {
    __pyoneaWelcome?: {
      setProgress: (progress: number) => void;
      hide: () => void;
      startedAt?: number;
    };
  }
}

export function setPyoneaWelcomeProgress(progress: number) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.__pyoneaWelcome?.setProgress(progress);
}

export function hidePyoneaWelcomeLoader(markSeen = false) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (markSeen) {
    markWelcomeLoaderSeen();
  }
  window.__pyoneaWelcome?.hide();
}

export function getWelcomeLoaderStartedAt() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return Date.now();
  return window.__pyoneaWelcome?.startedAt ?? Date.now();
}

export function computeWelcomeDisplayProgress(
  elapsedMs: number,
  dataProgress: number,
  halfMs = PYONEA_WELCOME_HALF_MS,
) {
  const halfProgress = Math.min(50, (elapsedMs / halfMs) * 50);

  if (halfProgress < 50) {
    return halfProgress;
  }

  return Math.min(100, Math.max(50, dataProgress));
}

export function isWelcomeLoaderReadyToHide(
  elapsedMs: number,
  dataProgress: number,
  displayProgress: number,
  halfMs = PYONEA_WELCOME_HALF_MS,
) {
  const halfProgress = Math.min(50, (elapsedMs / halfMs) * 50);
  return halfProgress >= 50 && dataProgress >= 100 && displayProgress >= 100;
}
