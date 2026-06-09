import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import { SITE_CONTAINER_CLASS } from '@/constants/layout';
import { AppLayout } from '@/components/layout/app-layout';
import { useNativeAuth } from '@/context/native-auth';
import { useWishlist } from '@/context/wishlist-context';
import { localizeBilingualName, useAppTranslation } from '@/i18n';
import { getRoleDestination, hasUserRole } from '@/utils/auth-routing';
import {
  getProductApiId,
  removeWishlistItem,
  type HomeProduct,
} from '@/utils/native-api';

const placeholderProduct = require('@/assets/images/placeholder-product.png');

function WishlistSkeleton() {
  return (
    <View className="w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:w-[48%] lg:w-[31%]">
      <View className="flex-row gap-3">
        <View className="h-20 w-20 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <View className="min-w-0 flex-1 gap-2">
          <View className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
          <View className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
          <View className="mt-2 h-8 w-36 rounded bg-gray-200 dark:bg-slate-700" />
        </View>
      </View>
    </View>
  );
}

function WishlistCard({
  product,
  onRemove,
}: {
  product: HomeProduct;
  onRemove: (product: HomeProduct) => void;
}) {
  const { t, language } = useAppTranslation();
  const href = `/products/${product.id}` as Href;
  const productName = localizeBilingualName(
    language,
    product.nameEn,
    product.nameMm,
    product.name,
  );

  return (
    <View className="w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:w-[48%] lg:w-[31%]">
      <View className="flex-row gap-3">
        <Link href={href} asChild>
          <Pressable className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
            <Image
              source={product.imageUrl ? { uri: product.imageUrl } : placeholderProduct}
              className="h-full w-full"
              contentFit="cover"
            />
          </Pressable>
        </Link>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-start gap-2">
            <Link href={href} asChild>
              <Pressable className="min-w-0 flex-1">
                <Text
                  className="font-sans text-sm font-semibold leading-5 text-gray-900 dark:text-slate-100"
                  numberOfLines={2}>
                  {productName}
                </Text>
              </Pressable>
            </Link>
            <Pressable
              onPress={() => onRemove(product)}
              className="h-8 w-8 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <Feather name="heart" color="#ef4444" size={16} />
            </Pressable>
          </View>

          <Text className="mt-1 font-sans text-sm font-bold text-green-700 dark:text-green-300">
            {product.price}
          </Text>
          <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
            {t('productCard.by_seller', { name: product.seller })}
          </Text>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <Link href={href} asChild>
              <Pressable className="rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-slate-700">
                <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-200">
                  {t('buyer_dashboard.view')}
                </Text>
              </Pressable>
            </Link>
            <Pressable
              onPress={() => onRemove(product)}
              className="rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-900/30">
              <Text className="font-sans text-xs font-semibold text-red-700 dark:text-red-300">
                {t('buyer_dashboard.remove')}
              </Text>
            </Pressable>
            {product.moq && product.moq > 1 ? (
              <View className="rounded-lg border border-gray-200 px-3 py-1.5 dark:border-slate-700">
                <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t('productCard.moq', { count: product.moq })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function RemoveConfirmModal({
  product,
  removing,
  onCancel,
  onConfirm,
}: {
  product: HomeProduct | null;
  removing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useAppTranslation();

  return (
    <Modal visible={Boolean(product)} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-xs rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <Feather name="heart" color="#ef4444" size={20} />
            </View>
            <Text className="min-w-0 flex-1 font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
              {t('buyer_dashboard.remove_wishlist_confirm')}
            </Text>
          </View>
          {product ? (
            <Text className="mb-5 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400" numberOfLines={2}>
              {product.name}
            </Text>
          ) : null}
          <View className="gap-3 sm:flex-row sm:justify-end">
            <Pressable
              onPress={onCancel}
              disabled={removing}
              className="rounded-lg border border-gray-300 px-4 py-2.5 dark:border-slate-600">
              <Text className="text-center font-sans text-sm text-gray-700 dark:text-slate-200">
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={removing}
              className="rounded-lg bg-red-600 px-4 py-2.5 disabled:opacity-50">
              <Text className="text-center font-sans text-sm font-semibold text-white">
                {removing ? t('buyer_dashboard.removing') : t('buyer_dashboard.remove')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function WishlistNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useNativeAuth();
  const { items, loading, refreshWishlist } = useWishlist();
  const [error, setError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<HomeProduct | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/login?returnTo=/wishlist' as Href);
      return;
    }

    if (!hasUserRole(user, 'buyer') && user) {
      router.replace(getRoleDestination(user));
    }
  }, [authLoading, isAuthenticated, router, user]);

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setError('');

    try {
      const productId = getProductApiId(removeTarget);
      await removeWishlistItem(productId);
      setRemoveTarget(null);
      await refreshWishlist();
    } catch {
      setError(t('buyer_dashboard.failed_remove_item'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AppLayout>
      <View className="bg-gray-50 py-8 dark:bg-slate-950">
        <View className={SITE_CONTAINER_CLASS}>
          <View className="mb-8 rounded-2xl bg-green-700 p-6 sm:p-8">
            <View className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <View className="min-w-0 flex-1">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-white/15">
                  <Feather name="heart" color="#ffffff" size={24} />
                </View>
                <Text className="font-sans text-3xl font-bold text-white sm:text-4xl">
                  {t('buyer_dashboard.my_wishlist')}
                </Text>
                <Text className="mt-2 max-w-2xl font-sans text-sm leading-6 text-green-100 sm:text-base">
                  {t('buyer_dashboard.empty_wishlist_sub')}
                </Text>
              </View>
              <Link href="/products" asChild>
                <Pressable className="self-start rounded-lg bg-white px-5 py-2.5">
                  <Text className="font-sans text-sm font-semibold text-green-700">
                    {t('buyer_dashboard.browse_products')}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {error ? (
            <View className="mb-5 flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <Feather name="alert-circle" color="#dc2626" size={20} />
              <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <View className="mb-5 flex-row items-center justify-between gap-3">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
                {t('buyer_dashboard.wishlist')}
              </Text>
              {!loading ? (
                <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t('products.showing_count', { count: items.length })}
                </Text>
              ) : null}
            </View>

            {loading ? (
              <View className="flex-row flex-wrap gap-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <WishlistSkeleton key={`wishlist-skeleton-${index}`} />
                ))}
              </View>
            ) : items.length > 0 ? (
              <View className="flex-row flex-wrap gap-4">
                {items.map((item) => (
                  <WishlistCard key={String(item.id)} product={item} onRemove={setRemoveTarget} />
                ))}
              </View>
            ) : (
              <View className="items-center py-14">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                  <Feather name="heart" color="#cbd5e1" size={34} />
                </View>
                <Text className="mt-4 text-center font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                  {t('buyer_dashboard.empty_wishlist')}
                </Text>
                <Text className="mt-2 max-w-md text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                  {t('buyer_dashboard.empty_wishlist_sub')}
                </Text>
                <Link href="/products" asChild>
                  <Pressable className="mt-6 flex-row items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5">
                    <Text className="font-sans text-sm font-semibold text-white">
                      {t('buyer_dashboard.browse_products')}
                    </Text>
                    <Feather name="arrow-right" color="#ffffff" size={16} />
                  </Pressable>
                </Link>
              </View>
            )}
          </View>
        </View>
      </View>

      {removing ? (
        <View className="absolute inset-0 hidden items-center justify-center bg-black/10">
          <ActivityIndicator color="#16a34a" />
        </View>
      ) : null}
      <RemoveConfirmModal
        product={removeTarget}
        removing={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemove}
      />
    </AppLayout>
  );
}
