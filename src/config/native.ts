const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const SITE_PUBLIC_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_APP_URL || 'https://pyonea.com'
);

export const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL || 'https://api.pyonea.com/api/v1'
);

export const IMAGE_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_IMAGE_BASE_URL || 'https://api.pyonea.com/storage'
);

export const IMAGE_PROXY_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_IMAGE_PROXY_URL ||
    process.env.VITE_IMAGE_PROXY_URL ||
    ''
);

export const DEFAULT_PRODUCT_IMAGE =
  process.env.EXPO_PUBLIC_DEFAULT_PRODUCT_IMAGE || '/placeholder-product.png';

const DEFAULT_RECAPTCHA_SITE_KEY = '6Lf0iqgsAAAAAFLBjORhgqIsZTxy3msbo5k6totX';
const DEFAULT_GOOGLE_CLIENT_ID =
  '538453685845-chtpoo3e5mas6kbpp9nj1fjeq9e5slk1.apps.googleusercontent.com';

export const RECAPTCHA_SITE_KEY =
  process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ||
  process.env.VITE_RECAPTCHA_SITE_KEY ||
  DEFAULT_RECAPTCHA_SITE_KEY;

export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  DEFAULT_GOOGLE_CLIENT_ID;

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  DEFAULT_GOOGLE_CLIENT_ID;

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

export const GOOGLE_MERCHANT_ID = Number(
  process.env.EXPO_PUBLIC_GOOGLE_MERCHANT_ID || '5795794062'
);

export const GA_MEASUREMENT_ID =
  process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.VITE_GA_MEASUREMENT_ID ||
  '';

export const GOOGLE_SITE_VERIFICATION =
  process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.VITE_GOOGLE_SITE_VERIFICATION ||
  '';

export const IS_LOCAL_API =
  API_BASE_URL.includes('localhost') ||
  API_BASE_URL.includes('127.0.0.1') ||
  API_BASE_URL.includes('10.0.2.2');
