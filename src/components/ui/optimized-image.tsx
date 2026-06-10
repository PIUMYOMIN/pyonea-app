import { Image as ExpoImage, type ImageProps } from 'expo-image';
import { Platform } from 'react-native';

const REMOTE_PLACEHOLDER =
  '|rF?hV%2WCj[ayj[a|j[ayfQayfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQ';

const getSourceUri = (source: ImageProps['source']): string | null => {
  if (!source) return null;
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) {
    for (const item of source) {
      const uri = getSourceUri(item);
      if (uri) return uri;
    }
    return null;
  }
  if (typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
    return source.uri;
  }
  return null;
};

const isRemoteUri = (uri: string | null) => Boolean(uri && /^https?:\/\//i.test(uri));

export function OptimizedImage({
  source,
  cachePolicy = 'disk',
  contentFit,
  loading = 'lazy',
  placeholder,
  placeholderContentFit,
  priority = 'normal',
  recyclingKey,
  resizeMode,
  responsivePolicy,
  sizes,
  transition = 120,
  ...props
}: ImageProps & { sizes?: string }) {
  const sourceUri = getSourceUri(source);
  const remote = isRemoteUri(sourceUri);
  const resolvedContentFit =
    contentFit ?? (resizeMode === 'contain' || resizeMode === 'center' ? 'contain' : 'cover');
  const hasResponsiveSources = Array.isArray(source) && source.length > 1;
  const resolvedResponsivePolicy =
    responsivePolicy ??
    (Platform.OS === 'web' && hasResponsiveSources ? 'static' : undefined);

  return (
    <ExpoImage
      {...props}
      source={source}
      cachePolicy={cachePolicy}
      contentFit={resolvedContentFit}
      loading={loading}
      placeholder={placeholder ?? (remote ? REMOTE_PLACEHOLDER : undefined)}
      placeholderContentFit={placeholderContentFit ?? resolvedContentFit}
      priority={priority}
      recyclingKey={recyclingKey ?? sourceUri ?? undefined}
      responsivePolicy={resolvedResponsivePolicy}
      sizes={sizes}
      transition={transition}
    />
  );
}

/** Faster fade for dense product grids; skips transition when not prioritized. */
export function productGridImageTransition(priority: boolean) {
  return priority ? 90 : Platform.OS === 'web' ? 0 : 60;
}
