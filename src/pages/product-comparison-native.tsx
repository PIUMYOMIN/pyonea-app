import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_6XL_CLASS, SITE_CONTAINER_CLASS } from '@/constants/layout';
import { localizeBilingualName, useAppTranslation } from '@/i18n';
import {
  clearCompareItems,
  formatComparePrice,
  loadCompareItems,
  refreshCompareItemsFromBackend,
  removeCompareItem,
  subscribeCompareChanged,
  syncCompareStorage,
  type NativeCompareItem,
} from '@/utils/compare-native';

const FEATURE_COLUMN_CLASS = 'w-40 min-w-[160px] shrink-0 px-4 py-3';
const PRODUCT_COLUMN_CLASS = 'min-w-[220px] shrink-0 px-4 py-3';

const getRows = (
  t: ReturnType<typeof useAppTranslation>['t'],
  language: string
): {
  label: string;
  render: (item: NativeCompareItem) => string;
}[] => [
  {
    label: t('compare.features.price'),
    render: (item) => formatComparePrice(item.priceValue, language),
  },
  {
    label: t('compare.features.rating'),
    render: (item) => `${Number(item.rating || 0).toFixed(1)} (${item.reviewCount || 0})`,
  },
  { label: t('compare.features.moq'), render: (item) => String(item.moq || 1) },
  {
    label: t('compare.features.stock'),
    render: (item) =>
      item.isActive && item.inStock ? t('compare.in_stock') : t('compare.out_of_stock'),
  },
  {
    label: t('compare.features.seller'),
    render: (item) => item.seller || t('compare.not_available'),
  },
  {
    label: t('compare.features.category'),
    render: (item) => {
      const name = localizeBilingualName(
        language,
        item.categoryNameEn,
        item.categoryNameMm,
        item.category
      );
      return name || t('compare.not_available');
    },
  },
];

export function ProductComparisonNative() {
  const { t, i18n } = useAppTranslation();
  const [items, setItems] = useState<NativeCompareItem[]>(() => loadCompareItems());
  const [loading, setLoading] = useState(() => loadCompareItems().length > 0);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshFromBackend = useCallback(async () => {
    const stored = loadCompareItems();
    if (!stored.length) {
      setItems([]);
      setLoading(false);
      setNotice(null);
      return;
    }

    setLoading(true);
    setNotice(null);

    const controller = new AbortController();
    const result = await refreshCompareItemsFromBackend(controller.signal);
    setItems(result.items);
    setLoading(false);

    if (result.removedCount > 0) {
      setNotice(t('compare.removed_unavailable', { count: result.removedCount }));
    } else if (result.usedCache) {
      setNotice(t('compare.refresh_failed'));
    }
  }, [t]);

  useEffect(() => {
    void refreshFromBackend();
    return subscribeCompareChanged(() => {
      setItems(loadCompareItems());
    });
  }, [refreshFromBackend]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleSync = () => {
      void refreshFromBackend();
    };
    window.addEventListener('focus', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [refreshFromBackend]);

  const removeItem = (id: string | number) => {
    setItems(removeCompareItem(id));
    setNotice(null);
  };

  const clearItems = () => {
    setItems(clearCompareItems());
    setNotice(null);
    syncCompareStorage();
  };

  if (!items.length && !loading) {
    return (
      <AppLayout>
        <View className="bg-gray-50 py-10 dark:bg-slate-950">
          <View className={SITE_CONTAINER_6XL_CLASS}>
            <Text className="font-sans text-3xl font-bold text-gray-900 dark:text-slate-100">
              {t('compare.title')}
            </Text>
            <Text className="mt-3 max-w-2xl font-sans text-base leading-7 text-gray-600 dark:text-slate-400">
              {t('compare.empty_message')}
            </Text>
            <Link href="/products" asChild>
              <Pressable className="mt-5 self-start rounded-lg bg-green-600 px-4 py-2 web:transition-colors web:hover:bg-green-700">
                <Text className="font-sans text-sm font-semibold text-white">
                  {t('compare.browse_products')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </AppLayout>
    );
  }

  const rows = getRows(t, i18n.language);

  return (
    <AppLayout>
      <View className="bg-gray-50 py-8 dark:bg-slate-950">
        <View className={SITE_CONTAINER_CLASS}>
          <View className="mb-5 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 font-sans text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl">
              {t('compare.title')} ({items.length})
            </Text>
            <Pressable
              onPress={clearItems}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-3 py-2 web:transition-colors web:hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:web:hover:bg-slate-800">
              <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-200">
                {t('compare.clear_all')}
              </Text>
            </Pressable>
          </View>

          {notice ? (
            <View className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
              <Text className="font-sans text-sm text-amber-800 dark:text-amber-200">{notice}</Text>
            </View>
          ) : null}

          {loading ? (
            <View className="items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
              <ActivityIndicator size="large" color="#16a34a" />
              <Text className="mt-3 font-sans text-sm text-gray-600 dark:text-slate-400">
                {t('compare.loading')}
              </Text>
            </View>
          ) : (
            <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <ScrollView horizontal showsHorizontalScrollIndicator className="overflow-x-auto">
                <View className="min-w-full">
                  <View className="flex-row border-b border-gray-200 dark:border-slate-700">
                    <View className={FEATURE_COLUMN_CLASS}>
                      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                        {t('compare.feature')}
                      </Text>
                    </View>
                    {items.map((item) => (
                      <View key={String(item.id)} className={PRODUCT_COLUMN_CLASS}>
                        <View className="gap-2">
                          <Link href={`/products/${item.slug}`} asChild>
                            <Pressable>
                              <Text
                                className="font-sans text-sm font-semibold text-green-700 web:underline-offset-2 web:hover:underline dark:text-green-400"
                                numberOfLines={2}>
                                {item.name}
                              </Text>
                            </Pressable>
                          </Link>
                          <Pressable
                            onPress={() => removeItem(item.id)}
                            className="self-start rounded-md border border-red-200 px-2 py-1 web:transition-colors web:hover:bg-red-50 dark:border-red-900/40 dark:web:hover:bg-red-950/40">
                            <Text className="font-sans text-xs font-medium text-red-600 dark:text-red-400">
                              {t('compare.remove')}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>

                  {rows.map((row) => (
                    <View
                      key={row.label}
                      className="flex-row border-b border-gray-100 dark:border-slate-800">
                      <View className={FEATURE_COLUMN_CLASS}>
                        <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-200">
                          {row.label}
                        </Text>
                      </View>
                      {items.map((item) => (
                        <View key={`${item.id}-${row.label}`} className={PRODUCT_COLUMN_CLASS}>
                          <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">
                            {row.render(item)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </AppLayout>
  );
}
