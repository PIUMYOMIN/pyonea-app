import { useMemo } from 'react';
import { Platform } from 'react-native';

/** Read live browser query params (email links, OAuth, one-time tokens). */
export function readWebQueryParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const params: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function normalizeRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return typeof value === 'string' ? value.trim() : '';
}

/** Prefer Expo Router params, then fall back to the browser URL on web static export. */
export function resolveRouteParam(
  routerParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const fromRouter = normalizeRouteParam(routerParams[key]);
  if (fromRouter) return fromRouter;

  if (Platform.OS === 'web') {
    return readWebQueryParams()[key]?.trim() ?? '';
  }

  return '';
}

export function resolveRouteParams(
  routerParams: Record<string, string | string[] | undefined>,
  keys: string[],
): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, resolveRouteParam(routerParams, key)]));
}

/** Merge browser + router params so language sync and parsers keep email-link tokens. */
export function mergeRouterAndWebParams(
  routerParams: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  return { ...readWebQueryParams(), ...routerParams };
}

export function useMergedRouteParams(
  routerParams: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const search =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : '';

  return useMemo(() => mergeRouterAndWebParams(routerParams), [routerParams, search]);
}

export function useResolvedRouteParam(
  routerParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const merged = useMergedRouteParams(routerParams);
  return useMemo(() => resolveRouteParam(merged, key), [merged, key]);
}

/** Static web export may miss dynamic path segments; read verify-email id/hash from the URL path. */
export function resolveVerifyEmailPathParams(
  routerParams: Record<string, string | string[] | undefined>,
): { id: string; hash: string } {
  const id = resolveRouteParam(routerParams, 'id');
  const hash = resolveRouteParam(routerParams, 'hash');
  if (id && hash) return { id, hash };

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const verifyIndex = segments.indexOf('verify-email');
    if (verifyIndex >= 0) {
      return {
        id: segments[verifyIndex + 1]?.trim() ?? id,
        hash: segments[verifyIndex + 2]?.trim() ?? hash,
      };
    }
  }

  return { id, hash };
}
