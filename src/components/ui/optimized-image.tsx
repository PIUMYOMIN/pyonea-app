import { Image as ExpoImage, type ImageProps } from 'expo-image';

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
  transition = 120,
  ...props
}: ImageProps) {
  const sourceUri = getSourceUri(source);
  const remote = isRemoteUri(sourceUri);
  const resolvedContentFit =
    contentFit ?? (resizeMode === 'contain' || resizeMode === 'center' ? 'contain' : 'cover');

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
      recyclingKey={recyclingKey ?? sourceUri}
      transition={transition}
    />
  );
}
