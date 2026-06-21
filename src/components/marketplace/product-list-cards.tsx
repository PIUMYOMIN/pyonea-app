import {
  ProductImage,
  productGridImageTransition,
} from '@/components/ui/product-image';
import Feather from '@expo/vector-icons/Feather';
import { Link, useRouter, type Href } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useIsProductInCompare } from '@/utils/compare-store';
import { useNativeAuth } from '@/context/native-auth';
import { useWishlistProductState } from '@/context/wishlist-context';
import { localizeBilingualName, mergeRouteLang, useAppTranslation } from '@/i18n';
import { hasUserRole } from '@/utils/auth-routing';
import { toggleCompareProduct } from '@/utils/compare-native';
import { getThumbUrl } from '@/utils/image-thumbs';
import { addProductToCart, getProductApiId, type HomeProduct } from '@/utils/native-api';
import { emitCartCountChanged } from '@/utils/native-cart-events';

const placeholderProduct = require('@/assets/images/placeholder-product.webp');

/** Full width inside PRODUCT_LIST_GRID_CLASS — height grows with content. */
export const PRODUCT_CARD_GRID_CLASS = 'w-full min-w-0';

export const PRODUCT_CARD_ROW_CLASS = 'min-w-0 flex-1 self-stretch';

export const EAGER_PRODUCT_ROWS = 3;

export const PRODUCT_CARD_CAROUSEL_CLASS = 'w-44 flex-shrink-0 sm:w-48 lg:w-52';

export function ProductListRow({
  row,
  productColumns,
  rowIndex,
}: {
  row: HomeProduct[];
  productColumns: number;
  rowIndex: number;
}) {
  const emptySlots = Math.max(0, productColumns - row.length);
  const eagerRow = rowIndex < EAGER_PRODUCT_ROWS;

  return (
    <View className="product-list-row flex-row items-stretch gap-3 sm:gap-4">
      {row.map((product) => (
        <ProductListCard
          key={String(product.id)}
          product={product}
          className={PRODUCT_CARD_ROW_CLASS}
          imagePriority={eagerRow}
        />
      ))}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <View
          key={`product-row-filler-${index}`}
          className={`${PRODUCT_CARD_ROW_CLASS} opacity-0`}
          pointerEvents="none"
        />
      ))}
    </View>
  );
}

export function ProductListRowSkeleton({
  productColumns,
}: {
  productColumns: number;
}) {
  return (
    <View className="product-list-row flex-row items-stretch gap-3 sm:gap-4">
      {Array.from({ length: productColumns }).map((_, index) => (
        <CardSkeleton
          key={`product-row-skeleton-${index}`}
          className={PRODUCT_CARD_ROW_CLASS}
        />
      ))}
    </View>
  );
}

function Stars({ rating, count }: { rating: string; count?: number }) {
  const numericRating = Number(rating) || 0;
  const filled = Math.round(numericRating);

  return (
    <View className="flex-row items-center gap-1">
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Feather
            key={star}
            name="star"
            color={star <= filled ? '#f59e0b' : '#e5e7eb'}
            size={12}
          />
        ))}
      </View>
      {numericRating > 0 || Number(count) > 0 ? (
        <Text className="font-sans text-[10px] leading-none text-gray-400 dark:text-slate-500">
          {numericRating > 0 ? numericRating.toFixed(1) : ''}
          {Number(count) > 0 ? ` (${count})` : ''}
        </Text>
      ) : null}
    </View>
  );
}

export function CardSkeleton({
  className = PRODUCT_CARD_GRID_CLASS,
}: {
  className?: string;
}) {
  return (
    <View
      className={`${className} min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800`}>
      <View className="aspect-square w-full bg-gray-200 dark:bg-slate-800" />
      <View className="gap-1.5 px-2.5 py-2.5 sm:px-3">
        <View className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-800" />
        <View className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
        <View className="mt-1 h-3 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
        <View className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700">
          <View className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
        </View>
        <View className="mt-2 flex-row gap-1.5">
          <View className="h-8 flex-1 rounded-lg bg-gray-200 dark:bg-slate-800" />
          <View className="h-8 flex-1 rounded-lg bg-gray-200 dark:bg-slate-800" />
        </View>
      </View>
    </View>
  );
}

function ProductListCardComponent({
  product,
  className = PRODUCT_CARD_GRID_CLASS,
  imagePriority = false,
}: {
  product: HomeProduct;
  className?: string;
  imagePriority?: boolean;
}) {
  const { t, language } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useNativeAuth();
  const { saved, toggleWishlist } = useWishlistProductState(product);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const productHref = mergeRouteLang(`/products/${product.slug || product.id}`, {}, language) as Href;
  const compared = useIsProductInCompare(product);
  const productName = localizeBilingualName(
    language,
    product.nameEn,
    product.nameMm,
    product.name,
  );
  const categoryLabel = localizeBilingualName(
    language,
    product.categoryNameEn,
    product.categoryNameMm,
    product.categoryName,
  );
  const resolvedImageSource = useMemo(() => {
    const uri = getThumbUrl(product.imageUrl, 480);
    if (uri) return { uri };
    return placeholderProduct;
  }, [product.imageUrl]);

  const nameLineHeight = Platform.OS === 'android' ? 20 : 18;

  const handleWishlistPress = async () => {
    if (wishlistBusy) return;

    if (!isAuthenticated) {
      router.push(
        `/login?returnTo=${encodeURIComponent(String(productHref))}` as Href,
      );
      return;
    }

    if (!hasUserRole(user, 'buyer')) return;

    setWishlistBusy(true);
    try {
      await toggleWishlist();
    } catch {
      // Wishlist errors are surfaced on detail pages; cards stay silent.
    } finally {
      setWishlistBusy(false);
    }
  };

  const handleAddToCart = async () => {
    if (product.hasVariants) {
      router.push(productHref);
      return;
    }

    if (!isAuthenticated) {
      router.push(
        `/login?returnTo=${encodeURIComponent(String(productHref))}` as Href,
      );
      return;
    }

    if (!hasUserRole(user, 'buyer') || cartBusy) return;

    setCartBusy(true);
    try {
      const quantity = Math.max(product.moq ?? 1, 1);
      const result = await addProductToCart(getProductApiId(product), quantity);
      emitCartCountChanged({ cart: result.cart });
    } catch {
      // Keep cards quiet; users can retry from product detail.
    } finally {
      setCartBusy(false);
    }
  };

  return (
    <View
      className={`${className} flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm shadow-gray-200/70 dark:border-gray-700 dark:bg-gray-800 dark:shadow-slate-950/40`}>
      <View className="relative w-full flex-shrink-0">
        <Link href={productHref} asChild>
          <Pressable className="aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
            <ProductImage
              source={resolvedImageSource ?? undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              brandSize="sm"
              loading={imagePriority ? 'eager' : 'lazy'}
              priority={imagePriority ? 'high' : 'normal'}
              recyclingKey={String(product.productId ?? product.id)}
              transition={productGridImageTransition(imagePriority)}
            />
            <View className="absolute left-2 top-2 z-10 gap-1">
              {product.discountPct && product.discountPct > 0 ? (
                <View className="self-start rounded-full bg-red-500 px-2 py-0.5 shadow-sm">
                  <Text className="text-[10px] font-black text-white">
                    -{product.discountPct}%
                  </Text>
                </View>
              ) : null}
              {product.isNew ? (
                <View className="self-start rounded-full bg-green-500 px-2 py-0.5 shadow-sm">
                  <Text className="text-[10px] font-black text-white">
                    {t('productCard.new_badge')}
                  </Text>
                </View>
              ) : null}
            </View>
            {categoryLabel ? (
              <View className="absolute bottom-2 left-2 z-10 max-w-[82%] rounded-full bg-white/80 px-2 py-0.5 dark:bg-gray-900/75">
                <Text
                  className="font-sans text-[10px] font-medium text-gray-700 dark:text-gray-200"
                  numberOfLines={1}>
                  {categoryLabel}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
        <Pressable
          onPress={() => void handleWishlistPress()}
          disabled={wishlistBusy}
          accessibilityLabel={
            saved
              ? t('productDetail.remove_from_wishlist')
              : t('productDetail.add_to_wishlist')
          }
          className="absolute right-2 top-2 z-20 h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-gray-900/85">
          <Feather
            name="heart"
            color={saved ? '#ef4444' : '#9ca3af'}
            size={16}
          />
        </Pressable>
      </View>
      <View className="mt-1.5 flex-1 flex-col px-2.5 pb-2.5 pt-1.5 sm:px-3">
        <Link href={productHref} asChild>
          <Pressable className="shrink-0">
            <Text
              className="font-sans text-[12px] font-semibold text-gray-900 dark:text-gray-100 sm:text-[13px]"
              numberOfLines={2}
              style={{
                lineHeight: nameLineHeight,
                minHeight: nameLineHeight * 2,
                ...(Platform.OS === 'android'
                  ? { includeFontPadding: false }
                  : null),
              }}>
              {productName}
            </Text>
          </Pressable>
        </Link>
        <View className="mt-0.5 h-3.5 justify-center">
          <Stars rating={product.rating} count={product.reviewCount} />
        </View>
        {product.seller ? (
          <View className="mt-0.5 min-h-[14px] justify-center">
            <Text
              className="font-sans text-[11px] font-medium leading-4 text-gray-600 dark:text-slate-300"
              numberOfLines={1}>
              {t('productCard.by_seller', { name: product.seller })}
            </Text>
          </View>
        ) : (
          <View className="min-h-[14px]" />
        )}
        <View className="mt-auto border-t border-gray-100 pt-1.5 dark:border-gray-700">
          <View className="flex-row items-center justify-between gap-1.5">
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <Text
                className={`font-sans text-[12px] font-bold leading-tight sm:text-[13px] ${
                  product.discountPct && product.discountPct > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-700 dark:text-green-400'
                }`}
                numberOfLines={1}>
                {product.price}
              </Text>
              {product.originalPrice ? (
                <Text
                  className="font-sans text-[10px] leading-tight text-gray-400 line-through dark:text-slate-500 sm:text-[11px]"
                  numberOfLines={1}>
                  {product.originalPrice}
                </Text>
              ) : null}
            </View>
            {product.moq && product.moq > 1 ? (
              <View className="max-w-[44%] flex-shrink-0 rounded-md border border-gray-200 bg-gray-100 px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-700">
                <Text
                  className="font-sans text-[10px] font-medium text-gray-600 dark:text-slate-300"
                  numberOfLines={1}>
                  {t('productCard.moq', { count: product.moq })}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="mt-1.5 flex-row gap-1.5">
            <Pressable
              onPress={() => {
                toggleCompareProduct(product);
              }}
              className={`h-8 min-w-0 flex-1 items-center justify-center rounded-lg border px-1 ${
                compared
                  ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30'
                  : 'border-gray-200 dark:border-gray-700'
              }`}>
              <Text
                numberOfLines={1}
                className={`text-center font-sans text-[10px] font-semibold sm:text-[11px] ${
                  compared
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-slate-300'
                }`}>
                {compared
                  ? t('productCard.added_to_compare')
                  : t('productCard.add_to_compare')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handleAddToCart()}
              disabled={cartBusy}
              className={`h-8 min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-lg px-1.5 ${
                product.hasVariants
                  ? 'border border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30'
                  : 'bg-green-600'
              } ${cartBusy ? 'opacity-70' : ''}`}>
              <Feather
                name={product.hasVariants ? 'sliders' : 'shopping-cart'}
                color={product.hasVariants ? '#2563eb' : '#ffffff'}
                size={12}
              />
              <Text
                className={`min-w-0 flex-1 text-center font-sans text-[10px] font-semibold sm:text-[11px] ${
                  product.hasVariants
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-white'
                }`}
                numberOfLines={1}>
                {cartBusy
                  ? t('productCard.adding_to_cart', {
                      defaultValue: 'Adding...',
                    })
                  : product.hasVariants
                    ? t('productCard.select_options')
                    : t('productCard.add_to_cart')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export const ProductListCard = memo(ProductListCardComponent);
