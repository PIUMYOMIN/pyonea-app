import { getScreenCache, setScreenCache } from '@/utils/screen-cache';

export const DATA_CACHE_TTL = {
  categories: 5 * 60 * 1000,
  products: 3 * 60 * 1000,
  productDetail: 2 * 60 * 1000,
  checkoutStatic: 10 * 60 * 1000,
} as const;

const inFlight = new Map<string, Promise<unknown>>();

export async function withDataCache<T>(
  key: string,
  ttlMs: number,
  fetcher: (signal?: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const cached = getScreenCache<T>(key, ttlMs);
  if (cached !== null) return cached;

  // The in-flight promise is shared between callers, so it must not be tied to
  // one caller's abort signal — an unmounting screen would kill the request for
  // everyone else. Let it complete and fill the cache; aborted callers ignore
  // the result via their own signal check below.
  const data = await withInFlightRequest(key, () => fetcher(undefined));
  setScreenCache(key, data);

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  return data;
}

export async function withInFlightRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetcher().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
