import { Platform } from 'react-native';

import { GOOGLE_CLIENT_ID, SITE_PUBLIC_URL } from '@/config/native';

/** Web OAuth client used by Expo web (GIS token client). Must match backend GOOGLE_CLIENT_ID. */
export const GOOGLE_OAUTH_WEB_CLIENT_ID = GOOGLE_CLIENT_ID;

/**
 * Origins that must be listed under Google Cloud Console → Credentials → OAuth 2.0 Client
 * → Authorized JavaScript origins (Web client).
 *
 * Expo web uses Google Identity Services initTokenClient — this flow uses origins, not redirect URIs.
 */
export const GOOGLE_OAUTH_AUTHORIZED_ORIGINS = [
  'https://pyonea.com',
  'https://www.pyonea.com',
  'http://localhost:8082',
  'http://localhost:19006',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:19006',
] as const;

/**
 * Legacy redirect-based web login (old React SPA). Keep if that flow is still used anywhere.
 * Expo app does NOT use these — listed for the same OAuth client if shared.
 */
export const GOOGLE_OAUTH_LEGACY_REDIRECT_URIS = [
  'https://www.pyonea.com/auth/google/callback',
  'https://pyonea.com/auth/google/callback',
] as const;

/** Native deep link redirect used by expo-auth-session on iOS/Android builds. */
export const GOOGLE_OAUTH_NATIVE_REDIRECT_URI = 'pyoneaapp://auth/google';

export function getCurrentWebOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.origin;
}

export function isAuthorizedGoogleOAuthOrigin(origin = getCurrentWebOrigin()): boolean {
  if (!origin) return true;
  return (GOOGLE_OAUTH_AUTHORIZED_ORIGINS as readonly string[]).includes(origin);
}

export function getGoogleOAuthOriginHelp(origin = getCurrentWebOrigin()): string | null {
  if (Platform.OS !== 'web' || !origin || isAuthorizedGoogleOAuthOrigin(origin)) {
    return null;
  }

  return [
    `Google sign-in is not authorized for origin "${origin}".`,
    `Add it in Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs →`,
    `Client ID ending in …${GOOGLE_OAUTH_WEB_CLIENT_ID.slice(-12)} → Authorized JavaScript origins.`,
    `Production origins required: https://pyonea.com and https://www.pyonea.com`,
    `(Current site URL setting: ${SITE_PUBLIC_URL})`,
  ].join(' ');
}

export function assertGoogleWebOrigin(): void {
  const help = getGoogleOAuthOriginHelp();
  if (help) {
    throw new Error(help);
  }
}

export function formatGoogleAuthError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Google sign-in failed.';

  if (/origin_mismatch|not authorized|invalid origin/i.test(message)) {
    return getGoogleOAuthOriginHelp() || message;
  }

  if (/popup_closed|cancel/i.test(message)) {
    return 'Google sign-in was cancelled.';
  }

  return message;
}
