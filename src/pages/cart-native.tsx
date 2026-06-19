import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import Feather from '@expo/vector-icons/Feather';
import { Link, usePathname, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { CategoryListCard } from '@/components/marketplace-list-screen';
import { CategoryMarketplaceGrid, ProductMarketplaceGrid } from '@/components/marketplace/marketplace-grid';
import { SITE_CONTAINER_CLASS } from '@/constants/layout';
import { useCartCount } from '@/context/cart-count-context';
import { useAppTranslation } from '@/i18n';
import { getThumbUrl } from '@/utils/image-thumbs';
import {
    ApiError,
    clearCartItems,
    fetchCart,
    fetchFeaturedProducts,
    fetchHomeCategories,
    formatApiErrorMessage,
    removeCartItem,
    updateCartItemQuantity,
    type CartItem,
    type CartResult,
    type CartSummary,
    type HomeCategory,
    type HomeProduct,
} from '@/utils/native-api';
import { emitCartCountChanged } from '@/utils/native-cart-events';
import { getScreenCache, setScreenCache } from '@/utils/screen-cache';

const HOME_PRODUCTS_CACHE_KEY = 'home-feed:products';
const HOME_CATEGORIES_CACHE_KEY = 'home-feed:categories';
const HOME_CACHE_TTL_MS = 2 * 60 * 1000;

const placeholderProduct = require('@/assets/images/placeholder-product.png');

const emptySummary: CartSummary = {
  subtotalValue: 0,
  shippingFeeValue: 0,
  taxRate: 0.05,
  taxValue: 0,
  totalValue: 0,
  subtotal: '0 MMK',
  shippingFee: '0 MMK',
  tax: '0 MMK',
  total: '0 MMK',
};

const emptyCart: CartResult = {
  items: [],
  subtotalValue: 0,
  subtotal: '0 MMK',
  totalItems: 0,
  summary: emptySummary,
};

function CartItemSkeleton() {
  return (
    <View className="flex-row gap-4 border-b border-gray-200 py-6 dark:border-slate-700">
      <View className="h-24 w-24 flex-shrink-0 rounded-md bg-gray-200 dark:bg-slate-700" />
      <View className="min-w-0 flex-1 gap-3">
        <View className="h-5 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
        <View className="h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
        <View className="h-4 w-1/4 rounded bg-gray-200 dark:bg-slate-700" />
        <View className="mt-2 h-8 w-28 rounded bg-gray-200 dark:bg-slate-700" />
      </View>
    </View>
  );
}

function SummarySkeleton() {
  return (
    <View className="rounded-lg bg-gray-50 px-6 py-6 dark:bg-slate-900">
      <View className="h-5 w-32 rounded bg-gray-200 dark:bg-slate-700" />
      <View className="mt-6 gap-4">
        {[1, 2, 3].map((item) => (
          <View key={item} className="flex-row justify-between">
            <View className="h-4 w-24 rounded bg-gray-200 dark:bg-slate-700" />
            <View className="h-4 w-20 rounded bg-gray-200 dark:bg-slate-700" />
          </View>
        ))}
      </View>
      <View className="mt-5 h-px bg-gray-200 dark:bg-slate-700" />
      <View className="mt-5 h-11 rounded-md bg-gray-200 dark:bg-slate-700" />
    </View>
  );
}

function RemoveButton({
  confirming,
  loading,
  onStartConfirm,
  onCancel,
  onConfirm,
}: {
  confirming: boolean;
  loading: boolean;
  onStartConfirm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useAppTranslation();

  if (loading) {
    return (
      <View className="flex-row items-center gap-1">
        <Feather name="loader" color="#dc2626" size={14} />
        <Text className="font-sans text-sm text-red-600">{t('cart.removing')}</Text>
      </View>
    );
  }

  if (confirming) {
    return (
      <View className="flex-row items-center gap-2">
        <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
          {t('cart.remove_confirm')}
        </Text>
        <Pressable onPress={onConfirm}>
          <Text className="font-sans text-sm font-semibold text-red-600">{t('cart.yes')}</Text>
        </Pressable>
        <Pressable onPress={onCancel}>
          <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{t('cart.no')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable onPress={onStartConfirm} className="flex-row items-center gap-1">
      <Feather name="trash-2" color="#dc2626" size={15} />
      <Text className="font-sans text-sm text-red-600">{t('cart.remove')}</Text>
    </Pressable>
  );
}

function CartItemRow({
  item,
  isUpdating,
  isRemoving,
  confirmingRemove,
  onUpdateQuantity,
  onRemove,
  onStartRemove,
  onCancelRemove,
}: {
  item: CartItem;
  isUpdating: boolean;
  isRemoving: boolean;
  confirmingRemove: boolean;
  onUpdateQuantity: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
  onStartRemove: (item: CartItem) => void;
  onCancelRemove: () => void;
}) {
  const { t } = useAppTranslation();
  const productHref = `/products/${item.slug || item.productId}` as Href;
  const stockLimit = item.stock ?? Number.POSITIVE_INFINITY;
  const activeTier =
    item.wholesaleTiers
      .slice()
      .sort((a, b) => b.minQty - a.minQty)
      .find((tier) => item.quantity >= tier.minQty) || null;
  const nextTier =
    item.wholesaleTiers
      .slice()
      .sort((a, b) => a.minQty - b.minQty)
      .find((tier) => tier.minQty > item.quantity) || null;
  const selectedOptions = Object.entries(item.selectedOptions);
  const canDecrement = item.quantity > item.minOrder && !isUpdating && item.isAvailable;
  const canIncrement = item.quantity + item.quantityStep <= stockLimit && !isUpdating && item.isAvailable;

  return (
    <View className={`border-b border-gray-200 py-6 dark:border-slate-700 ${isRemoving ? 'opacity-40' : ''}`}>
      <View className="flex-row gap-4">
        <Link href={productHref} asChild>
          <Pressable className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
            <Image
              source={item.imageUrl ? { uri: getThumbUrl(item.imageUrl, 160) } : placeholderProduct}
              className="h-full w-full"
              contentFit="contain"
            />
          </Pressable>
        </Link>

        <View className="min-w-0 flex-1">
          <View className="gap-3 sm:flex-row sm:justify-between">
            <View className="min-w-0 flex-1">
              <Link href={productHref} asChild>
                <Pressable>
                  <Text
                    className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100"
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              </Link>
              {item.category ? (
                <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-500">
                  {item.category}
                </Text>
              ) : null}
              {selectedOptions.length > 0 ? (
                <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                  {selectedOptions.map(([key, value]) => `${key}: ${value}`).join(' · ')}
                </Text>
              ) : null}
              {item.stock != null && item.isAvailable ? (
                <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500">
                  {t('cart.stock_available', { stock: item.stock, unit: item.quantityUnit })}
                </Text>
              ) : null}
              {!item.isAvailable ? (
                <Text className="mt-1 font-sans text-sm font-medium text-red-500">
                  {t('cart.product_unavailable')}
                </Text>
              ) : null}
              {item.isAvailable && !item.isQuantityValid ? (
                <Text className="mt-1 font-sans text-sm font-medium text-amber-600 dark:text-amber-400">
                  {t('cart.only_stock_available', { stock: item.stock, unit: item.quantityUnit })}
                </Text>
              ) : null}
            </View>

            <View className="items-start sm:items-end">
              {item.sellingPriceValue < item.priceValue ? (
                <>
                  <Text className="font-sans text-base font-bold text-red-600">{item.sellingPrice}</Text>
                  <Text className="font-sans text-xs text-gray-400 line-through dark:text-slate-600">
                    {item.price}
                  </Text>
                </>
              ) : (
                <Text className="font-sans text-base font-bold text-green-700 dark:text-green-400">
                  {item.price}
                </Text>
              )}
              <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
                = {item.subtotal}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-row items-center rounded border border-gray-300 dark:border-slate-600">
              <Pressable
                onPress={() => onUpdateQuantity(item, Math.max(item.quantity - item.quantityStep, item.minOrder))}
                disabled={!canDecrement}
                className={`px-3 py-1 ${canDecrement ? '' : 'opacity-40'}`}>
                <Text className="font-sans text-lg text-gray-600 dark:text-slate-400">-</Text>
              </Pressable>

              <View className="min-w-12 items-center px-2 py-1">
                <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {isUpdating ? '...' : item.quantity}
                </Text>
              </View>

              <Pressable
                onPress={() => onUpdateQuantity(item, item.quantity + item.quantityStep)}
                disabled={!canIncrement}
                className={`px-3 py-1 ${canIncrement ? '' : 'opacity-40'}`}>
                <Text className="font-sans text-lg text-gray-600 dark:text-slate-400">+</Text>
              </Pressable>
            </View>

            <RemoveButton
              confirming={confirmingRemove}
              loading={isRemoving}
              onStartConfirm={() => onStartRemove(item)}
              onCancel={onCancelRemove}
              onConfirm={() => onRemove(item)}
            />
          </View>

          {(item.minOrder > 1 || item.quantityStep > 1) ? (
            <Text className="mt-2 font-sans text-xs text-amber-600 dark:text-amber-400">
              {item.minOrder > 1
                ? t('cart.min_order_with_unit', {
                    quantity: item.minOrder,
                    unit: item.quantityUnit,
                  })
                : ''}
              {item.minOrder > 1 && item.quantityStep > 1 && item.quantityStep !== item.minOrder
                ? ' · '
                : ''}
              {item.quantityStep > 1 && item.quantityStep !== item.minOrder
                ? t('cart.order_steps', { quantity: item.quantityStep })
                : ''}
            </Text>
          ) : null}

          {activeTier ? (
            <Text className="mt-1 font-sans text-xs font-medium text-green-700 dark:text-green-400">
              {t('cart.volume_tier_active', {
                discount: activeTier.discountPct > 0 ? `-${activeTier.discountPct}%` : '',
                quantity: activeTier.minQty,
                unit: item.quantityUnit,
              })}
              {activeTier.label ? ` (${activeTier.label})` : ''}
            </Text>
          ) : null}
          {nextTier ? (
            <Text className="mt-1 font-sans text-xs text-amber-600 dark:text-amber-400">
              {t(activeTier ? 'cart.unlock_better_tier' : 'cart.unlock_volume_pricing', {
                quantity: nextTier.minQty - item.quantity,
                discount:
                  nextTier.discountPct > 0
                    ? `-${nextTier.discountPct}%`
                    : t(activeTier ? 'cart.better' : 'cart.volume'),
              })}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function OrderSummary({
  cart,
  canCheckout,
  onCheckout,
}: {
  cart: CartResult;
  canCheckout: boolean;
  onCheckout: () => void;
}) {
  const { t } = useAppTranslation();
  const itemLabel = cart.totalItems === 1 ? t('cart.item_count_one') : t('cart.item_count_other');

  return (
    <View className="rounded-lg bg-gray-50 px-6 py-6 dark:bg-slate-900 lg:mt-0 lg:w-[38%]">
      <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
        {t('cart.order_summary')}
      </Text>
      <View className="mt-6 gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
            {t('cart.subtotal')} ({cart.totalItems} {itemLabel})
          </Text>
          <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
            {cart.subtotal}
          </Text>
        </View>

        <View className="border-t border-gray-200 pt-4 dark:border-slate-700">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
              {t('cart.shipping')} ({t('cart.estimated_short')})
            </Text>
            <Text className="text-right font-sans text-sm italic text-gray-500 dark:text-slate-500">
              {t('cart.calculated_at_checkout')}
            </Text>
          </View>
        </View>

        <View className="border-t border-gray-200 pt-4 dark:border-slate-700">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
              {t('cart.tax')} ({Math.round(cart.summary.taxRate * 100)}%)
            </Text>
            <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
              {cart.summary.tax}
            </Text>
          </View>
        </View>

        <View className="border-t border-gray-200 pt-4 dark:border-slate-700">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {t('cart.estimated_total')}
            </Text>
            <Text className="font-sans text-lg font-bold text-green-700 dark:text-green-400">
              {cart.summary.total}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-6 gap-3">
        <Pressable
          onPress={onCheckout}
          disabled={!canCheckout}
          className={`rounded-md px-4 py-3 ${canCheckout ? 'bg-green-600' : 'bg-gray-400'}`}>
          <Text className="text-center font-sans text-base font-semibold text-white">
            {t('cart.checkout')}
          </Text>
        </Pressable>
        <Link href="/products" asChild>
          <Pressable className="rounded-md border border-gray-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
            <Text className="text-center font-sans text-base font-semibold text-gray-700 dark:text-slate-300">
              {t('cart.continue_shopping')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function EmptyCartRecommendations({
  products,
  categories,
  loading,
}: {
  products: HomeProduct[];
  categories: HomeCategory[];
  loading: boolean;
}) {
  const { t } = useAppTranslation();

  if (loading) {
    return (
      <View className="mt-10 w-full gap-6">
        <View className="h-6 w-48 self-center rounded bg-gray-200 dark:bg-slate-700" />
        <ProductMarketplaceGrid products={[]} loading skeletonCount={4} skeletonRows={2} />
      </View>
    );
  }

  if (!products.length && !categories.length) {
    return null;
  }

  return (
    <View className="mt-12 w-full gap-10">
      {products.length > 0 ? (
        <View>
          <View className="mb-4 gap-2 sm:flex-row sm:items-end sm:justify-between">
            <View>
              <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                {t('cart.recommended_products', { defaultValue: 'Recommended products' })}
              </Text>
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-500">
                {t('cart.recommended_products_subtitle', {
                  defaultValue: 'Popular marketplace picks to start your order.',
                })}
              </Text>
            </View>
            <Link href="/products" asChild>
              <Pressable>
                <Text className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">
                  {t('cart.browse_all_products', { defaultValue: 'Browse all products' })}
                </Text>
              </Pressable>
            </Link>
          </View>
          <ProductMarketplaceGrid
            products={products.slice(0, 8)}
            imagePriorityCount={2}
          />
        </View>
      ) : null}

      {categories.length > 0 ? (
        <View>
          <View className="mb-4 gap-2 sm:flex-row sm:items-end sm:justify-between">
            <View>
              <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                {t('cart.shop_by_category', { defaultValue: 'Shop by category' })}
              </Text>
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-500">
                {t('cart.shop_by_category_subtitle', {
                  defaultValue: 'Find products faster from these categories.',
                })}
              </Text>
            </View>
            <Link href="/categories" asChild>
              <Pressable>
                <Text className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">
                  {t('cart.view_categories', { defaultValue: 'View categories' })}
                </Text>
              </Pressable>
            </Link>
          </View>
          <CategoryMarketplaceGrid
            items={categories.slice(0, 6)}
            keyExtractor={(category) => String(category.id)}
            renderItem={(category) => <CategoryListCard category={category} />}
          />
        </View>
      ) : null}
    </View>
  );
}

export function CartNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { cartSnapshot } = useCartCount();
  const [cart, setCart] = useState<CartResult>(() => cartSnapshot ?? emptyCart);
  const [loading, setLoading] = useState(() => !cartSnapshot);
  const [error, setError] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState<string | number | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | number | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearingCart, setClearingCart] = useState(false);
  const cachedFeed = getScreenCache<{ categories: HomeCategory[]; products: HomeProduct[] }>(
    'home-feed',
    HOME_CACHE_TTL_MS,
  );
  const cachedProducts = getScreenCache<HomeProduct[]>(
    HOME_PRODUCTS_CACHE_KEY,
    HOME_CACHE_TTL_MS,
  );
  const cachedCategories = getScreenCache<HomeCategory[]>(
    HOME_CATEGORIES_CACHE_KEY,
    HOME_CACHE_TTL_MS,
  );
  const [recommendedProducts, setRecommendedProducts] = useState<HomeProduct[]>(
    () => cachedProducts ?? cachedFeed?.products ?? [],
  );
  const [recommendedCategories, setRecommendedCategories] = useState<HomeCategory[]>(
    () => cachedCategories ?? cachedFeed?.categories ?? [],
  );
  const [recommendationsLoading, setRecommendationsLoading] = useState(
    () => !(cachedProducts ?? cachedFeed?.products) && !(cachedCategories ?? cachedFeed?.categories),
  );

  const loadCart = useCallback(async (signal?: AbortSignal) => {
    setError('');

    try {
      const result = await fetchCart(signal);
      if (signal?.aborted) return;
      setCart(result);
      emitCartCountChanged({ cart: result });
    } catch (err) {
      if (signal?.aborted) return;
      setCart(emptyCart);
      emitCartCountChanged({ cart: emptyCart });
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(formatApiErrorMessage(err, 'Failed to fetch cart'));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cartSnapshot) {
      setCart(cartSnapshot);
    }
  }, [cartSnapshot]);

  useEffect(() => {
    if (pathname !== '/cart') return;

    const controller = new AbortController();
    // No cartSnapshot dependency: loadCart emits a fresh snapshot object,
    // which would re-trigger this effect and refetch the cart in a loop.
    // The initial loading state already accounts for a missing snapshot.
    void loadCart(controller.signal);
    return () => controller.abort();
  }, [loadCart, pathname]);

  useEffect(() => {
    const controller = new AbortController();

    const loadRecommendations = async () => {
      if (!(cachedProducts ?? cachedFeed?.products) && !(cachedCategories ?? cachedFeed?.categories)) {
        setRecommendationsLoading(true);
      }
      try {
        const [products, categories] = await Promise.all([
          fetchFeaturedProducts(controller.signal).catch(() => []),
          fetchHomeCategories(controller.signal).catch(() => []),
        ]);
        if (!controller.signal.aborted) {
          setRecommendedProducts(products);
          setRecommendedCategories(categories);
          setScreenCache(HOME_PRODUCTS_CACHE_KEY, products);
          setScreenCache(HOME_CATEGORIES_CACHE_KEY, categories);
        }
      } finally {
        if (!controller.signal.aborted) setRecommendationsLoading(false);
      }
    };

    void loadRecommendations();

    return () => controller.abort();
  }, []);

  const replaceCart = (nextCart: CartResult) => {
    setCart(nextCart);
    emitCartCountChanged({ cart: nextCart });
  };

  const handleUpdateQuantity = async (item: CartItem, nextQuantity: number) => {
    if (nextQuantity < item.minOrder || updatingItemId === item.id) return;
    setError('');
    setUpdatingItemId(item.id);

    try {
      const result = await updateCartItemQuantity(item.id, nextQuantity);
      replaceCart(result);
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to update quantity'));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    if (removingItemId === item.id) return;
    setError('');
    setRemovingItemId(item.id);
    setConfirmingRemoveId(null);

    try {
      await removeCartItem(item.id);
      const result = await fetchCart();
      replaceCart(result);
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to remove item'));
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleClearCart = async () => {
    setError('');
    setClearingCart(true);
    setConfirmClear(false);

    try {
      await clearCartItems();
      setCart(emptyCart);
      emitCartCountChanged({ cart: emptyCart });
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to clear cart'));
    } finally {
      setClearingCart(false);
    }
  };

  const hasUnavailableItems = cart.items.some((item) => !item.isAvailable);
  const hasQuantityIssues = cart.items.some((item) => !item.isQuantityValid);
  const canCheckout = cart.items.length > 0 && !hasUnavailableItems && !hasQuantityIssues;
  const itemLabel = cart.totalItems === 1 ? t('cart.item_count_one') : t('cart.item_count_other');

  if (loading && cart.items.length === 0) {
    return (
      <AppLayout>
        <View className={`${SITE_CONTAINER_CLASS} py-12`}>
            <View className="mb-8 h-8 w-48 rounded bg-gray-200 dark:bg-slate-700" />
            <View className="gap-12 lg:flex-row">
              <View className="min-w-0 flex-1">
                {[1, 2, 3].map((item) => (
                  <CartItemSkeleton key={item} />
                ))}
              </View>
              <View className="lg:w-[38%]">
                <SummarySkeleton />
              </View>
            </View>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View className={`${SITE_CONTAINER_CLASS} py-12`}>
          <Text className="font-sans text-2xl font-extrabold text-gray-900 dark:text-slate-100 sm:text-3xl">
            {t('cart.title')} ({cart.totalItems} {itemLabel})
          </Text>

          {error ? (
            <View className="mt-4 flex-row items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-900/30">
              <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">
                {error}
              </Text>
              <Pressable onPress={() => setError('')}>
                <Feather name="x" color="#b91c1c" size={16} />
              </Pressable>
            </View>
          ) : null}

          {cart.items.length === 0 ? (
            <View className={Platform.OS === 'web' ? 'mt-8' : 'mt-6'}>
              <View className="items-center rounded-2xl border border-gray-100 bg-gray-50 px-5 py-10 dark:border-slate-800 dark:bg-slate-900">
                <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800">
                  <Feather name="shopping-cart" color="#9ca3af" size={42} />
                </View>
                <Text className="mt-6 text-center font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {t('cart.empty_title')}
                </Text>
                <Text className="mt-2 max-w-xl text-center font-sans text-base leading-6 text-gray-500 dark:text-slate-500">
                  {t('cart.empty_message')}
                </Text>
                <View className="mt-7 flex-row flex-wrap justify-center gap-3">
                  <Link href="/products" asChild>
                    <Pressable className="rounded-md bg-green-600 px-5 py-3">
                      <Text className="font-sans text-sm font-semibold text-white">
                        {t('cart.continue_shopping')}
                      </Text>
                    </Pressable>
                  </Link>
                  <Link href="/categories" asChild>
                    <Pressable className="rounded-md border border-gray-300 bg-white px-5 py-3 dark:border-slate-600 dark:bg-slate-800">
                      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                        {t('cart.browse_categories', { defaultValue: 'Browse categories' })}
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </View>

              <EmptyCartRecommendations
                products={recommendedProducts}
                categories={recommendedCategories}
                loading={recommendationsLoading}
              />
            </View>
          ) : (
            <>
              {hasUnavailableItems || hasQuantityIssues ? (
                <View className="mt-6 rounded-r-lg border-l-4 border-yellow-400 bg-yellow-50 p-4 dark:bg-yellow-900/20">
                  <Text className="font-sans text-sm leading-6 text-yellow-700 dark:text-yellow-300">
                    {hasUnavailableItems ? `${t('cart.unavailable_warning')} ` : ''}
                    {hasQuantityIssues ? `${t('cart.quantity_warning')} ` : ''}
                    {t('cart.review_before_checkout')}
                  </Text>
                </View>
              ) : null}

              <View className={Platform.OS === 'web' ? 'mt-8 gap-12 lg:flex-row' : 'mt-6 gap-12 lg:flex-row'}>
                <View className="min-w-0 flex-1">
                  {cart.items.map((item) => (
                    <CartItemRow
                      key={String(item.id)}
                      item={item}
                      isUpdating={updatingItemId === item.id}
                      isRemoving={removingItemId === item.id}
                      confirmingRemove={confirmingRemoveId === item.id}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveItem}
                      onStartRemove={(nextItem) => setConfirmingRemoveId(nextItem.id)}
                      onCancelRemove={() => setConfirmingRemoveId(null)}
                    />
                  ))}

                  <View className="mt-6">
                    {confirmClear ? (
                      <View className="flex-row flex-wrap items-center gap-3">
                        <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                          {t('cart.clear_cart_confirm')}
                        </Text>
                        <Pressable onPress={handleClearCart} disabled={clearingCart}>
                          <Text className="font-sans text-sm font-semibold text-red-600">
                            {clearingCart ? t('cart.clearing') : t('cart.yes_clear')}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => setConfirmClear(false)}>
                          <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                            {t('cart.cancel')}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable onPress={() => setConfirmClear(true)} className="flex-row items-center gap-1">
                        <Feather name="trash-2" color="#dc2626" size={15} />
                        <Text className="font-sans text-sm font-semibold text-red-600">
                          {t('cart.clear_cart')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                <OrderSummary
                  cart={cart}
                  canCheckout={canCheckout}
                  onCheckout={() => router.push('/checkout' as Href)}
                />
              </View>
            </>
          )}
      </View>
    </AppLayout>
  );
}
