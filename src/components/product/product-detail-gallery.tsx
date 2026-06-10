import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { getThumbUrl } from '@/utils/image-thumbs';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

const placeholderProduct = require('@/../assets/images/placeholder-product.png');

type ProductDetailGalleryProps = {
  images: string[];
  activeImage: number;
  onIndexChange: (index: number) => void;
  alt: string;
  discountPct?: number;
  discountLabel?: string;
};

function NativeGallery({
  images,
  activeImage,
  onIndexChange,
  alt,
  discountPct = 0,
  discountLabel,
}: ProductDetailGalleryProps) {
  const currentImage = images[activeImage];

  const goToPrevious = () => {
    if (images.length <= 1) return;
    onIndexChange(activeImage === 0 ? images.length - 1 : activeImage - 1);
  };

  const goToNext = () => {
    if (images.length <= 1) return;
    onIndexChange((activeImage + 1) % images.length);
  };

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      onIndexChange((activeImage + 1) % images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [activeImage, images.length, onIndexChange]);

  return (
    <View className="gap-4">
      <View className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800">
        <Image
          source={currentImage ? { uri: getThumbUrl(currentImage, 800) } : placeholderProduct}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          loading="eager"
          priority="high"
          accessibilityLabel={alt}
        />
        {discountPct > 0 && discountLabel ? (
          <View className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1">
            <Text className="font-sans text-xs font-black text-white">{discountLabel}</Text>
          </View>
        ) : null}
        {images.length > 1 ? (
          <>
            <Pressable
              onPress={goToPrevious}
              className="absolute left-3 top-1/2 h-10 w-10 -translate-y-5 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-slate-950/85"
            >
              <Feather name="chevron-left" color="#16a34a" size={22} />
            </Pressable>
            <Pressable
              onPress={goToNext}
              className="absolute right-3 top-1/2 h-10 w-10 -translate-y-5 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-slate-950/85"
            >
              <Feather name="chevron-right" color="#16a34a" size={22} />
            </Pressable>
            <View className="absolute bottom-4 left-0 right-0 items-center">
              <View className="flex-row gap-1.5 rounded-full bg-slate-950/55 px-3 py-1.5">
                {images.map((image, index) => (
                  <Pressable
                    key={`dot-${image}-${index}`}
                    onPress={() => onIndexChange(index)}
                    className={`h-2 rounded-full ${
                      activeImage === index ? 'w-5 bg-white' : 'w-2 bg-white/50'
                    }`}
                  />
                ))}
              </View>
            </View>
            <View className="absolute right-4 top-4 rounded-full bg-slate-950/60 px-3 py-1">
              <Text className="font-sans text-xs font-bold text-white">
                {activeImage + 1}/{images.length}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3 pr-2">
            {images.map((image, index) => (
              <Pressable
                key={`${image}-${index}`}
                onPress={() => onIndexChange(index)}
                className={`h-20 w-20 overflow-hidden rounded-xl border-2 ${
                  activeImage === index
                    ? 'border-green-500'
                    : 'border-gray-200 dark:border-slate-700'
                }`}
              >
                <Image
                  source={{ uri: getThumbUrl(image, 160) }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  priority={index === activeImage ? 'high' : 'low'}
                />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

export function ProductDetailGallery(props: ProductDetailGalleryProps) {
  if (Platform.OS === 'web') {
    const ProductImageGallery = require('@/components/ui/ProductImageGallery').default;
    return (
      <ProductImageGallery
        images={props.images.map((url) => ({ url, is_primary: false }))}
        getImageUrl={(img: string | { url?: string }) =>
          typeof img === 'string' ? img : img?.url || ''
        }
        alt={props.alt}
        initialIndex={props.activeImage}
        onIndexChange={props.onIndexChange}
        priority
        autoplay
        autoplayDelayMs={2500}
        className="w-full"
      />
    );
  }

  return <NativeGallery {...props} />;
}
