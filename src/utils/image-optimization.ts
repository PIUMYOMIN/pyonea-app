import type { ImageSource } from 'expo-image';

import { IMAGE_BASE_URL, IMAGE_PROXY_URL, SITE_PUBLIC_URL } from '@/config/native';

const PRODUCT_CARD_WIDTHS = [240, 360, 480, 640] as const;
const DEFAULT_LIST_WIDTH = 480;
const DEFAULT_QUALITY = 78;

const isPublicHttpUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return (
      /^https?:$/i.test(parsed.protocol) &&
      !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
};

const isStorageImageUrl = (url: string) => {
  try {
    return new URL(url).pathname.includes('/storage/');
  } catch {
    return false;
  }
};

const toStorageUrl = (path: string) => {
  const cleanPath = path.replace('public/', '').replace(/^\/?storage\//, '');
  return `${IMAGE_BASE_URL}/${cleanPath}`;
};

const resolveSourceUrl = (url: string) => (url.startsWith('http') ? url : toStorageUrl(url));

export const getWebPUrl = (
  url: string | undefined,
  { width, quality = DEFAULT_QUALITY }: { width?: number; quality?: number } = {}
): string | undefined => {
  if (!url || url.startsWith('data:')) return url;

  try {
    const source = resolveSourceUrl(url);

    if (!IMAGE_PROXY_URL || !isPublicHttpUrl(source) || !isStorageImageUrl(source)) {
      return source;
    }

    const params = new URLSearchParams({
      url: source.replace(/^https?:\/\//i, ''),
      output: 'webp',
      q: String(quality),
    });

    if (width) params.set('w', String(width));

    return `${IMAGE_PROXY_URL}/?${params.toString()}`;
  } catch {
    return url;
  }
};

export const getSrcSet = (url: string | undefined, widths: readonly number[] = PRODUCT_CARD_WIDTHS) => {
  if (!url || url.startsWith('data:')) return '';

  return widths
    .map((width) => {
      const optimized = getWebPUrl(url, { width });
      return optimized ? `${optimized} ${width}w` : '';
    })
    .filter(Boolean)
    .join(', ');
};

export const getProductListImageSources = (
  url: string | undefined,
  widths: readonly number[] = PRODUCT_CARD_WIDTHS
): ImageSource[] => {
  if (!url) return [];

  const primary = getWebPUrl(url, { width: DEFAULT_LIST_WIDTH });
  if (!primary) return [];

  // Without a resize proxy every width resolves to the same URL — use one source.
  if (!IMAGE_PROXY_URL) {
    return [{ uri: primary, width: DEFAULT_LIST_WIDTH }];
  }

  const sources: ImageSource[] = [];

  for (const width of widths) {
    const uri = getWebPUrl(url, { width });
    if (uri) {
      sources.push({ uri, width });
    }
  }

  return sources.length > 0 ? sources : [{ uri: primary, width: DEFAULT_LIST_WIDTH }];
};

export const getProductListImageSource = (url: string | undefined): ImageSource | null => {
  const uri = getWebPUrl(url, { width: DEFAULT_LIST_WIDTH });
  return uri ? { uri } : null;
};

export const PRODUCT_LIST_IMAGE_SIZES =
  '(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw';

export const getPreconnectOrigins = (): string[] => {
  const origins = new Set<string>();

  for (const value of [SITE_PUBLIC_URL, IMAGE_BASE_URL, IMAGE_PROXY_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore malformed URLs.
    }
  }

  return [...origins];
};
