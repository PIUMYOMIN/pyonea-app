export const WELCOME_LOADER_SEEN_KEY = 'pyonea-welcome-seen';

export function hasSeenWelcomeLoader(): boolean {
  try {
    return globalThis.localStorage?.getItem(WELCOME_LOADER_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeLoaderSeen(): void {
  try {
    globalThis.localStorage?.setItem(WELCOME_LOADER_SEEN_KEY, '1');
  } catch {
    // Ignore storage failures.
  }
}
