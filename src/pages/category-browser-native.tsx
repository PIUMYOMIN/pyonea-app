import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import {
  CATEGORY_BROWSER_GRID_CLASS,
  SITE_CONTAINER_CLASS,
} from '@/constants/layout';
import {
  CategoryCardFromBrowser,
  CategoryCardSkeleton,
} from '@/components/ui/category-card';
import { useAppTranslation } from '@/i18n';
import { fetchCategoryBrowser, type BrowserCategory } from '@/utils/native-api';
import { getScreenCache, setScreenCache } from '@/utils/screen-cache';

const CATEGORY_BROWSER_CACHE_KEY = 'category-browser';
const CATEGORY_BROWSER_CACHE_TTL_MS = 5 * 60 * 1000;

const CATEGORIES_PER_BATCH = 24;

export function CategoryBrowserNative() {
  const { t, language } = useAppTranslation();
  const cachedCategories = getScreenCache<BrowserCategory[]>(
    CATEGORY_BROWSER_CACHE_KEY,
    CATEGORY_BROWSER_CACHE_TTL_MS,
  );
  const [categories, setCategories] = useState<BrowserCategory[]>(cachedCategories ?? []);
  const [loading, setLoading] = useState(!cachedCategories);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(CATEGORIES_PER_BATCH);

  useEffect(() => {
    const controller = new AbortController();

    const loadCategories = async () => {
      if (!cachedCategories) {
        setLoading(true);
      }
      setError('');

      try {
        const nextCategories = await fetchCategoryBrowser(controller.signal);
        if (controller.signal.aborted) return;
        setCategories(nextCategories);
        setScreenCache(CATEGORY_BROWSER_CACHE_KEY, nextCategories);
      } catch {
        if (!controller.signal.aborted && !cachedCategories) {
          setError(t('categories.fetch_error'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadCategories();

    return () => controller.abort();
  }, []);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((category) => {
      const displayName =
        language === 'my'
          ? category.nameMm || category.nameEn || category.name
          : category.nameEn || category.nameMm || category.name;
      return [category.nameEn, category.nameMm, displayName].some((name) =>
        name.toLowerCase().includes(query)
      );
    });
  }, [categories, language, searchQuery]);
  const visibleCategories = filteredCategories.slice(0, visibleCount);
  const hasMoreCategories = visibleCount < filteredCategories.length;

  const loadMoreCategories = () => {
    if (loading || !hasMoreCategories) return;
    setVisibleCount((current) =>
      Math.min(current + CATEGORIES_PER_BATCH, filteredCategories.length)
    );
  };

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setVisibleCount(CATEGORIES_PER_BATCH);
  };

  const emptyMessage = searchQuery
    ? t('categories.no_matching_categories', { query: searchQuery }).replace('{query}', searchQuery)
    : t('categories.no_categories_available');

  return (
    <AppLayout onEndReached={loadMoreCategories}>
      <View className="bg-gray-50 dark:bg-slate-950">
        <View className="bg-green-600">
          <View className={`${SITE_CONTAINER_CLASS} py-12`}>
            <View className="items-center text-center">
              <Text className="mb-4 text-center font-sans text-2xl font-bold text-white sm:text-4xl">
                {t('categories.browse_categories')}
              </Text>
              <Text className="mb-8 max-w-2xl text-center font-sans text-lg leading-7 text-green-100">
                {t('categories.discover_products')}
              </Text>

              <View className="w-full max-w-md flex-row items-center rounded-lg bg-white/10 px-4 py-3">
                <Feather name="search" color="#d1d5db" size={20} />
                <TextInput
                  value={searchQuery}
                  onChangeText={updateSearchQuery}
                  placeholder={t('categories.search_placeholder')}
                  placeholderTextColor="rgba(255,255,255,0.72)"
                  className="ml-3 min-w-0 flex-1 font-sans text-sm text-white"
                  selectionColor="#ffffff"
                />
                {searchQuery ? (
                  <Pressable onPress={() => updateSearchQuery('')} className="ml-2">
                    <Feather name="x" color="rgba(255,255,255,0.72)" size={20} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View className={`${SITE_CONTAINER_CLASS} py-12`}>
          {error ? (
            <View className="items-center py-16">
              <Text className="mb-4 text-center font-sans text-base text-red-600 dark:text-red-400">
                {error}
              </Text>
              <Pressable
                onPress={() => {
                  updateSearchQuery('');
                  setError('');
                  setLoading(true);
                  void fetchCategoryBrowser()
                    .then(setCategories)
                    .catch(() => setError(t('categories.fetch_error')))
                    .finally(() => setLoading(false));
                }}
                className="rounded-lg bg-green-600 px-6 py-2">
                <Text className="font-sans text-sm font-semibold text-white">
                  {t('categories.try_again')}
                </Text>
              </Pressable>
            </View>
          ) : loading ? (
            <View className={CATEGORY_BROWSER_GRID_CLASS}>
              {Array.from({ length: 12 }).map((_, index) => (
                <CategoryCardSkeleton key={`category-skeleton-${index}`} />
              ))}
            </View>
          ) : filteredCategories.length > 0 ? (
            <>
              <Text className="mb-4 font-sans text-sm text-gray-500 dark:text-slate-500">
                {t('categories.showing_categories', { count: filteredCategories.length })}
              </Text>
              <View className={CATEGORY_BROWSER_GRID_CLASS}>
                {visibleCategories.map((category, index) => (
                  <CategoryCardFromBrowser
                    key={String(category.id)}
                    category={category}
                    language={language}
                    priority={index < 6}
                    className="w-full min-w-0"
                  />
                ))}
              </View>
              {hasMoreCategories ? (
                <View className="items-center py-4">
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                    {t('notifications.loading')}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View className="items-center py-16">
              <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="search" color="#9ca3af" size={48} />
              </View>
              <Text className="mb-2 text-center font-sans text-xl font-semibold text-gray-900 dark:text-slate-100">
                {t('categories.no_categories_found')}
              </Text>
              <Text className="mb-6 max-w-md text-center font-sans text-base leading-6 text-gray-600 dark:text-slate-400">
                {emptyMessage}
              </Text>
              {searchQuery ? (
                <Pressable onPress={() => updateSearchQuery('')} className="rounded-lg bg-green-600 px-6 py-2">
                  <Text className="font-sans text-sm font-semibold text-white">
                    {t('categories.clear_search')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </AppLayout>
  );
}
