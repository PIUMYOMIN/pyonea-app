import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from '@/config/native';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleWindow = Window &
  typeof globalThis & {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  };

let scriptPromise: Promise<void> | null = null;

WebBrowser.maybeCompleteAuthSession();

const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

const getNativeGoogleClientId = () => {
  if (Platform.OS === 'android') {
    return GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID;
  }

  if (Platform.OS === 'ios') {
    return GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID;
  }

  return GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID;
};

const getNativeRedirectUri = () =>
  AuthSession.makeRedirectUri({
    scheme: 'pyoneaapp',
    path: 'auth/google',
  });

export const preloadGoogleIdentityServices = () => {
  if (Platform.OS !== 'web') {
    return Promise.resolve();
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google login is missing EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
  }

  const win = globalThis as GoogleWindow;
  if (win.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-pyonea-google-identity="true"]'
    );
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => {
        scriptPromise = null;
        reject(new Error('Google login failed to load'));
      }, {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.pyoneaGoogleIdentity = 'true';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Google login failed to load'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export async function requestGoogleAccessToken() {
  if (Platform.OS !== 'web') {
    return requestNativeGoogleAccessToken();
  }

  await preloadGoogleIdentityServices();

  const oauth2 = (globalThis as GoogleWindow).google?.accounts?.oauth2;
  if (!oauth2) throw new Error('Google login is not ready.');

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'email profile',
      callback: (response) => {
        if (response.access_token) {
          resolve(response.access_token);
          return;
        }

        reject(
          new Error(response.error_description || response.error || 'Google login was cancelled.')
        );
      },
      error_callback: (error) => {
        reject(new Error(error.message || error.type || 'Google login failed.'));
      },
    });

    client.requestAccessToken({ prompt: 'select_account' });
  });
}

async function requestNativeGoogleAccessToken() {
  const clientId = getNativeGoogleClientId();
  if (!clientId) {
    throw new Error(
      Platform.OS === 'android'
        ? 'Google login is missing EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.'
        : 'Google login is missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.'
    );
  }

  const redirectUri = getNativeRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
    scopes: ['openid', 'profile', 'email'],
    prompt: AuthSession.Prompt.SelectAccount,
  });

  const result = await request.promptAsync(googleDiscovery);

  if (result.type !== 'success') {
    throw new Error(
      result.type === 'cancel' || result.type === 'dismiss'
        ? 'Google login was cancelled.'
        : 'Google login failed.'
    );
  }

  const accessToken = result.authentication?.accessToken || result.params.access_token;
  if (!accessToken) {
    throw new Error('Google login did not return an access token.');
  }

  return accessToken;
}
