import { Platform } from 'react-native';

import { IS_LOCAL_API, RECAPTCHA_SITE_KEY } from '@/config/native';

type RecaptchaWindow = Window &
  typeof globalThis & {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  };

let scriptPromise: Promise<void> | null = null;

const loadWebRecaptcha = () => {
  if (Platform.OS !== 'web') return Promise.resolve();
  if (IS_LOCAL_API) return Promise.resolve();

  if (!RECAPTCHA_SITE_KEY) {
    throw new Error('reCAPTCHA is missing EXPO_PUBLIC_RECAPTCHA_SITE_KEY.');
  }

  const win = globalThis as RecaptchaWindow;
  if (win.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-pyonea-recaptcha="${RECAPTCHA_SITE_KEY}"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
      RECAPTCHA_SITE_KEY
    )}`;
    script.async = true;
    script.defer = true;
    script.dataset.pyoneaRecaptcha = RECAPTCHA_SITE_KEY;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('reCAPTCHA failed to load'));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export async function executeRecaptcha(action: string) {
  if (Platform.OS !== 'web' || IS_LOCAL_API) {
    return `native-${action}-recaptcha`;
  }

  await loadWebRecaptcha();

  const grecaptcha = (globalThis as RecaptchaWindow).grecaptcha;
  if (!grecaptcha) throw new Error('reCAPTCHA is not ready');

  await new Promise<void>((resolve) => grecaptcha.ready(resolve));
  return grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
}
