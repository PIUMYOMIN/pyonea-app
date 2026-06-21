import { type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { ProductImageBrandPlaceholder } from '@/components/ui/product-image-brand-placeholder';
import {
  OptimizedImage,
  productGridImageTransition,
} from '@/components/ui/optimized-image';
import { getThumbUrl } from '@/utils/image-thumbs';

const placeholderProduct = require('@/assets/images/placeholder-product.webp');

const getSourceUri = (source: ImageProps['source']): string | null => {
  if (!source) return null;
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) {
    for (const item of source) {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'uri' in item && typeof item.uri === 'string') {
        return item.uri;
      }
    }
    return null;
  }
  if (typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
    return source.uri;
  }
  return null;
};

type ProductImageProps = ImageProps & {
  containerStyle?: StyleProp<ViewStyle>;
  brandSize?: 'sm' | 'md' | 'lg';
};

/** Product photo with a web-only Pyonea wordmark fallback while loading or unavailable. */
export function ProductImage({
  source,
  style,
  containerStyle,
  brandSize = 'sm',
  onLoad,
  onError,
  transition,
  placeholder,
  ...props
}: ProductImageProps) {
  const sourceUri = getSourceUri(source);
  const hasImageSource = Boolean(source);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [sourceUri]);

  if (Platform.OS !== 'web') {
    return (
      <OptimizedImage
        source={source}
        style={style}
        onLoad={onLoad}
        onError={onError}
        transition={transition}
        placeholder={placeholder}
        {...props}
      />
    );
  }

  const showBrand = !hasImageSource || !loaded || failed;

  return (
    <View className="relative h-full w-full overflow-hidden" style={containerStyle}>
      {showBrand ? <ProductImageBrandPlaceholder size={brandSize} /> : null}
      {hasImageSource ? (
        <OptimizedImage
          source={source}
          style={[style, !loaded || failed ? { opacity: 0 } : { opacity: 1 }]}
          onLoad={(event) => {
            setLoaded(true);
            setFailed(false);
            onLoad?.(event);
          }}
          onError={(event) => {
            setLoaded(false);
            setFailed(true);
            onError?.(event);
          }}
          transition={loaded ? (transition ?? 120) : 0}
          placeholder={undefined}
          {...props}
        />
      ) : null}
    </View>
  );
}

/** Fixed-size product thumbnail for dense lists (dashboard tables, etc.). */
export function ProductThumb({ imageUrl, size = 56 }: { imageUrl?: string; size?: number }) {
  const thumbUri = imageUrl ? getThumbUrl(imageUrl, 160) : undefined;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [thumbUri]);

  const source = !thumbUri || failed ? placeholderProduct : { uri: thumbUri };

  return (
    <View
      className="overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700"
      style={{ width: size, height: size }}>
      <OptimizedImage
        source={source}
        style={{ width: size, height: size }}
        contentFit="cover"
        recyclingKey={thumbUri ?? 'product-thumb-placeholder'}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

export { productGridImageTransition };
