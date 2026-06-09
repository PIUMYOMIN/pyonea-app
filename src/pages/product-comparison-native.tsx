import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useAppTranslation } from '@/i18n';
import {
  clearCompareItems,
  loadCompareItems,
  removeCompareItem,
  type NativeCompareItem,
} from '@/utils/compare-native';

const getRows = (
  t: ReturnType<typeof useAppTranslation>['t']
): {
  label: string;
  render: (item: NativeCompareItem) => string;
}[] => [
  { label: t('compare.features.price'), render: (item) => item.price },
  {
    label: t('compare.features.rating'),
    render: (item) => `${Number(item.rating || 0).toFixed(1)} (${item.reviewCount || 0})`,
  },
  { label: t('compare.features.moq'), render: (item) => String(item.moq || 1) },
  {
    label: t('compare.features.stock'),
    render: (item) => (item.inStock ? t('compare.in_stock') : t('compare.out_of_stock')),
  },
  {
    label: t('compare.features.seller'),
    render: (item) => item.seller || t('compare.not_available'),
  },
  {
    label: t('compare.features.category_id'),
    render: (item) => item.category || t('compare.not_available'),
  },
];

export function ProductComparisonNative() {
  const { t } = useAppTranslation();
  const [items, setItems] = useState<NativeCompareItem[]>(() => loadCompareItems());

  const removeItem = (id: string | number) => {
    setItems(removeCompareItem(id));
  };

  const clearItems = () => {
    setItems(clearCompareItems());
  };

  if (!items.length) {
    return (
      <AppLayout>
        <View className="bg-gray-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
          <View className="mx-auto w-full max-w-6xl">
            <Text className="font-sans text-3xl font-bold text-gray-900 dark:text-slate-100">
              {t('compare.title')}
            </Text>
            <Text className="mt-3 max-w-2xl font-sans text-base leading-7 text-gray-600 dark:text-slate-400">
              {t('compare.empty_message')}
            </Text>
            <Link href="/products" asChild>
              <Pressable className="mt-5 self-start rounded-lg bg-green-600 px-4 py-2">
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

  return (
    <AppLayout>
      <View className="bg-gray-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
        <View className="mx-auto w-full max-w-7xl">
          <View className="mb-5 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 font-sans text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl">
              {t('compare.title')} ({items.length})
            </Text>
            <Pressable
              onPress={clearItems}
              className="rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-200">
                {t('compare.clear_all')}
              </Text>
            </Pressable>
          </View>

          <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View className="flex-row border-b border-gray-200 dark:border-slate-700">
                  <View className="w-40 px-4 py-3">
                    <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                      {t('compare.feature')}
                    </Text>
                  </View>
                  {items.map((item) => (
                    <View key={String(item.id)} className="w-56 px-4 py-3">
                      <Link href={`/products/${item.slug}`} asChild>
                        <Pressable>
                          <Text
                            className="font-sans text-sm font-semibold text-green-700 dark:text-green-400"
                            numberOfLines={2}>
                            {item.name}
                          </Text>
                        </Pressable>
                      </Link>
                      <Pressable
                        onPress={() => removeItem(item.id)}
                        className="mt-2 self-start rounded-md border border-red-200 px-2 py-1">
                        <Text className="font-sans text-xs font-medium text-red-600">
                          {t('compare.remove')}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>

                {getRows(t).map((row) => (
                  <View
                    key={row.label}
                    className="flex-row border-b border-gray-100 dark:border-slate-800">
                    <View className="w-40 px-4 py-3">
                      <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-200">
                        {row.label}
                      </Text>
                    </View>
                    {items.map((item) => (
                      <View key={`${item.id}-${row.label}`} className="w-56 px-4 py-3">
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
        </View>
      </View>
    </AppLayout>
  );
}
