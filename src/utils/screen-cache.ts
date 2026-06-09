type CacheEntry<T> = {
  data: T;
  at: number;
};

const caches = new Map<string, CacheEntry<unknown>>();

export function getScreenCache<T>(key: string, ttlMs: number): T | null {
  const entry = caches.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    caches.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setScreenCache<T>(key: string, data: T) {
  caches.set(key, { data, at: Date.now() });
}

export function invalidateScreenCache(key?: string) {
  if (key) {
    caches.delete(key);
    return;
  }
  caches.clear();
}
