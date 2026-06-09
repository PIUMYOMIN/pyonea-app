import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type SocialPendingPayload = {
  temp_token: string;
  provider: string;
  social_user?: {
    name?: string;
    email?: string;
  };
  missing_fields?: string[];
};

const storageKey = 'social_pending';
let memoryPending: SocialPendingPayload | null = null;

async function writeNativePending(payload: SocialPendingPayload | null) {
  if (Platform.OS === 'web') return;

  try {
    if (payload) {
      await SecureStore.setItemAsync(storageKey, JSON.stringify(payload));
    } else {
      await SecureStore.deleteItemAsync(storageKey);
    }
  } catch {
    // In-memory fallback remains available.
  }
}

async function readNativePending(): Promise<SocialPendingPayload | null> {
  if (Platform.OS === 'web') return null;

  try {
    const raw = await SecureStore.getItemAsync(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as SocialPendingPayload;
  } catch {
    return null;
  }
}

export function setSocialPending(payload: SocialPendingPayload) {
  memoryPending = payload;

  if (Platform.OS === 'web' && typeof globalThis.sessionStorage !== 'undefined') {
    try {
      globalThis.sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore storage failures; in-memory fallback remains.
    }
    return;
  }

  void writeNativePending(payload);
}

export function getSocialPending(): SocialPendingPayload | null {
  if (memoryPending) return memoryPending;

  if (Platform.OS === 'web' && typeof globalThis.sessionStorage !== 'undefined') {
    try {
      const raw = globalThis.sessionStorage.getItem(storageKey);
      if (!raw) return null;
      memoryPending = JSON.parse(raw) as SocialPendingPayload;
      return memoryPending;
    } catch {
      return null;
    }
  }

  return null;
}

export async function hydrateSocialPending(): Promise<SocialPendingPayload | null> {
  const cached = getSocialPending();
  if (cached) return cached;

  const nativePending = await readNativePending();
  if (nativePending) {
    memoryPending = nativePending;
  }

  return nativePending;
}

export function clearSocialPending() {
  memoryPending = null;

  if (Platform.OS === 'web' && typeof globalThis.sessionStorage !== 'undefined') {
    try {
      globalThis.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures.
    }
    return;
  }

  void writeNativePending(null);
}
