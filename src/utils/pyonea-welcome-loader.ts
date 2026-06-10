import { Platform } from 'react-native';

import { markWelcomeLoaderSeen } from '@/utils/welcome-loader-storage';

/** Brief pause at 100% so the filled logo is visible before dismiss. */
export const PYONEA_WELCOME_COMPLETE_DELAY_MS = 500;

declare global {
  interface Window {
    __pyoneaWelcome?: {
      setProgress: (progress: number) => void;
      hide: () => void;
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
