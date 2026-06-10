import Feather from '@expo/vector-icons/Feather';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_CLASS, PRODUCT_LIST_GRID_CLASS } from '@/constants/layout';
import {
  CardSkeleton,
  ProductListCard,
  PRODUCT_CARD_ROW_CLASS,
} from '@/components/marketplace-list-screen';
import { LazyMountWhenVisible } from '@/components/ui/lazy-mount-when-visible';
import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import {
  fetchProductFilterCategories,
  fetchProductList,
  type BrowserCategory,
  type HomeProduct,
} from '@/utils/native-api';
import { getScreenCache, setScreenCache } from '@/utils/screen-cache';

import { SearchFiltersNative } from '@/components/marketplace/search-filters-native';

const PRODUCT_LIST_CACHE_TTL_MS = 2 * 60 * 1000;

function ProductSearchBar({
  initialValue,
  onSubmit,
  onDebouncedChange,
}: {
  initialValue: string;
  onSubmit: (value: string) => void;
  onDebouncedChange: (value: string) => void;
}) {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const [draft, setDraft] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconColor = isDark ? '#94a3b8' : '#9ca3af';
  const placeholderColor = isDark ? '#64748b' : '#9ca3af';

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const updateDraft = (value: string) => {
    setDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onDebouncedChange(value), 500);
  };

  return (
    <View className="mx-auto w-full max-w-2xl flex-row overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-800">
      <View className="items-center justify-center pl-3.5">
        <Feather name="search" color={iconColor} size={20} />
      </View>
      <TextInput
        value={draft}
        onChangeText={updateDraft}
        onSubmitEditing={() => onSubmit(draft)}
        placeholder={t('products.search_placeholder')}
        placeholderTextColor={placeholderColor}
        className="min-w-0 flex-1 py-3 pl-3 pr-3 font-sans text-sm text-gray-900 dark:text-slate-100"
        returnKeyType="search"
      />
      <Pressable
        onPress={() => onSubmit(draft)}
        className="flex-shrink-0 justify-center bg-green-600 px-4 py-3 active:bg-green-700 sm:px-5"
      >
        <Text className="font-sans text-sm font-medium text-white">{t('products.search')}</Text>
      </Pressable>
    </View>
  );
}

function CategorySelector({
  categories,
  selectedCategory,
  activeLanguage,
  onSelect,
}: {
  categories: BrowserCategory[];
  selectedCategory: string;
  activeLanguage: 'en' | 'my';
  onSelect: (id: string) => void;
}) {
  const { t } = useAppTranslation();

  const displayName = (category: BrowserCategory) =>
    activeLanguage === 'my'
      ? category.nameMm || category.nameEn || category.name
      : category.nameEn || category.nameMm || category.name;

  const renderCategory = (category: BrowserCategory, depth = 0) => {
    const isSelected = selectedCategory === String(category.id);
    const hasChildren = category.children.length > 0;

    return (
      <View key={String(category.id)} className="gap-0.5">
        <Pressable
          onPress={() => onSelect(String(category.id))}
          className={`min-h-10 flex-row items-center justify-between rounded-lg px-2.5 py-2 active:bg-gray-100 dark:active:bg-slate-700/60 ${
            isSelected ? 'bg-green-100 dark:bg-green-900/40' : ''
          }`}
          style={depth > 0 ? { marginLeft: 16 } : undefined}>
          <Text
            className={`min-w-0 flex-1 pr-2 font-sans text-sm ${
              isSelected
                ? 'font-medium text-green-800 dark:text-green-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}
            numberOfLines={1}>
            {displayName(category)}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {category.productCount > 0 ? (
              <Text className="font-sans text-[11px] text-gray-400 dark:text-gray-500">
                ({category.productCount})
              </Text>
            ) : null}
            {hasChildren ? (
              <Feather name="chevron-right" color={isSelected ? '#16a34a' : '#9ca3af'} size={14} />
            ) : null}
          </View>
        </Pressable>
        {hasChildren ? category.children.map((child) => renderCategory(child, depth + 1)) : null}
      </View>
    );
  };

  const allSelected = !selectedCategory;

  return (
    <View className="gap-0.5">
      <Pressable
        onPress={() => onSelect('')}
        className={`min-h-10 justify-center rounded-lg px-2.5 py-2 active:bg-gray-100 dark:active:bg-slate-700/60 ${
          allSelected ? 'bg-green-100 dark:bg-green-900/40' : ''
        }`}
      >
        <Text
          className={`font-sans text-sm ${
            allSelected
              ? 'font-medium text-green-800 dark:text-green-300'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
          {t('categories.all_categories')}
        </Text>
      </Pressable>
      {categories.map((category) => renderCategory(category))}
    </View>
  );
}

function FilterPanel({
  categories,
  selectedCategory,
  activeLanguage,
  minPrice,
  maxPrice,
  sortBy,
  sortOrder,
  hasActiveFilters,
  showHeader = true,
  scrollCategories = false,
  onCategory,
  onPrice,
  onSort,
  onClear,
}: {
  categories: BrowserCategory[];
  selectedCategory: string;
  activeLanguage: 'en' | 'my';
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  sortOrder: string;
  hasActiveFilters: boolean;
  showHeader?: boolean;
  scrollCategories?: boolean;
  onCategory: (id: string) => void;
  onPrice: (min: string, max: string) => void;
  onSort: (sortBy: string, sortOrder: string) => void;
  onClear: () => void;
}) {
  const { t } = useAppTranslation();

  const categoryList = (
    <CategorySelector
      categories={categories}
      selectedCategory={selectedCategory}
      activeLanguage={activeLanguage}
      onSelect={onCategory}
    />
  );

  return (
    <View className="gap-4 sm:gap-6">
      <View className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        {showHeader ? (
          <View className="mb-4 flex-row items-center justify-between gap-2">
            <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
              {t('products.filters')}
            </Text>
            {hasActiveFilters ? (
              <Pressable onPress={onClear} className="rounded-lg px-2 py-1 active:bg-gray-100 dark:active:bg-slate-700">
                <Text className="font-sans text-xs font-semibold text-green-600 dark:text-green-400">
                  {t('products.clear_all')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View className="gap-5">
          <SearchFiltersNative
            mobile={scrollCategories}
            filters={{ minPrice, maxPrice, sortBy, sortOrder }}
            onFilterChange={(updates) => {
              if ('minPrice' in updates || 'maxPrice' in updates) {
                onPrice(updates.minPrice ?? minPrice, updates.maxPrice ?? maxPrice);
              }
              if ('sortBy' in updates && updates.sortBy && 'sortOrder' in updates && updates.sortOrder) {
                onSort(updates.sortBy, updates.sortOrder);
              }
            }}
          />
        </View>
      </View>

      <View className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <Text className="mb-3 font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
          {t('products.categories')}
        </Text>
        {scrollCategories ? (
          <ScrollView
            style={{ maxHeight: 320 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {categoryList}
          </ScrollView>
        ) : (
          categoryList
        )}
      </View>
    </View>
  );
}

const DESKTOP_FILTER_BREAKPOINT = 768;

export function ProductListNative() {
  const { t, language } = useAppTranslation();
  const { isDark } = useTheme();
  const router = useRouter();
  const params = useGlobalSearchParams<{
    search?: string;
    category?: string;
    min_price?: string;
    max_price?: string;
    sort_by?: string;
    sort_order?: string;
  }>();
  const searchQuery = typeof params.search === 'string' ? params.search : '';
  const selectedCategory = typeof params.category === 'string' ? params.category : '';
  const minPrice = typeof params.min_price === 'string' ? params.min_price : '';
  const maxPrice = typeof params.max_price === 'string' ? params.max_price : '';
  const sortBy = typeof params.sort_by === 'string' ? params.sort_by : 'created_at';
  const sortOrder = typeof params.sort_order === 'string' ? params.sort_order : 'desc';
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [categories, setCategories] = useState<BrowserCategory[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_FILTER_BREAKPOINT;
  const currencyLabel = t('common.currency.mmk', 'MMK');
  const activeLanguage = language;
  const hasActiveFilters = Boolean(searchQuery || selectedCategory || minPrice || maxPrice);
  const activeFilterCount = [
    searchQuery,
    selectedCategory,
    minPrice || maxPrice,
  ].filter(Boolean).length;
  const mutedIconColor = isDark ? '#94a3b8' : '#64748b';
  const queryKey = `${searchQuery}|${selectedCategory}|${minPrice}|${maxPrice}|${sortBy}|${sortOrder}`;
  const productColumns = width >= 1280 ? 4 : width >= 640 ? 3 : 2;
  const productRows = useMemo(() => {
    const rows: HomeProduct[][] = [];
    for (let index = 0; index < products.length; index += productColumns) {
      rows.push(products.slice(index, index + productColumns));
    }
    return rows;
  }, [productColumns, products]);

  const pushParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    if (searchQuery) next.set('search', searchQuery);
    if (selectedCategory) next.set('category', selectedCategory);
    if (minPrice) next.set('min_price', minPrice);
    if (maxPrice) next.set('max_price', maxPrice);
    if (sortBy) next.set('sort_by', sortBy);
    if (sortOrder) next.set('sort_order', sortOrder);

    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

    const search = next.toString();
    router.push(search ? `/products?${search}` : '/products');
  };

  const clearFilters = () => router.push('/products');

  useEffect(() => {
    if (isDesktop && sidebarOpen) setSidebarOpen(false);
  }, [isDesktop, sidebarOpen]);

  useEffect(() => {
    const controller = new AbortController();

    const loadCategories = async () => {
      const nextCategories = await fetchProductFilterCategories(controller.signal).catch(() => []);
      if (!controller.signal.aborted) setCategories(nextCategories);
    };

    void loadCategories();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const cacheKey = `products:${queryKey}`;
    const cachedProducts = getScreenCache<HomeProduct[]>(cacheKey, PRODUCT_LIST_CACHE_TTL_MS);

    if (cachedProducts) {
      setProducts(cachedProducts);
      setPage(1);
      setHasMore(cachedProducts.length >= 24);
      setLoading(false);
    }

    const loadProducts = async () => {
      if (!cachedProducts) {
        setLoading(true);
      }
      setError('');
      setPage(1);
      setHasMore(true);

      try {
        const nextProducts = await fetchProductList(
          {
            search: searchQuery,
            category: selectedCategory,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder,
            page: 1,
          },
          controller.signal
        );
        if (controller.signal.aborted) return;
        setProducts(nextProducts);
        setHasMore(nextProducts.length >= 24);
        setScreenCache(cacheKey, nextProducts);
      } catch {
        if (!controller.signal.aborted) {
          if (!cachedProducts) {
            setError(t('products.fetch_error'));
            setProducts([]);
          }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadProducts();

    return () => controller.abort();
  }, [maxPrice, minPrice, queryKey, searchQuery, selectedCategory, sortBy, sortOrder, t]);

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError('');

    try {
      const nextProducts = await fetchProductList({
        search: searchQuery,
        category: selectedCategory,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
        page: nextPage,
      });
      setProducts((current) => {
        const ids = new Set(current.map((product) => String(product.id)));
        return [...current, ...nextProducts.filter((product) => !ids.has(String(product.id)))];
      });
      setPage(nextPage);
      setHasMore(nextProducts.length >= 24);
    } catch {
      setError(t('products.fetch_error'));
    } finally {
      setLoadingMore(false);
    }
  };

  const findCategoryName = (id: string) => {
    const find = (items: BrowserCategory[]): string | undefined => {
      for (const category of items) {
        if (String(category.id) === id) {
          return activeLanguage === 'my'
            ? category.nameMm || category.nameEn || category.name
            : category.nameEn || category.nameMm || category.name;
        }
        const child = find(category.children);
        if (child) return child;
      }
      return undefined;
    };

    return find(categories) || t('products.category_id', { id });
  };

  const title = selectedCategory
    ? t('products.category_products', { category: findCategoryName(selectedCategory) })
    : searchQuery
      ? t('products.search_results', { query: searchQuery })
      : t('products.all_products');

  return (
    <AppLayout onEndReached={loadMore}>
      <View className="bg-gray-50 py-6 dark:bg-slate-950 sm:py-8">
        <View className={SITE_CONTAINER_CLASS}>
          <View className="mb-6">
            <ProductSearchBar
              key={searchQuery}
              initialValue={searchQuery}
              onSubmit={(value) => pushParams({ search: value.trim() })}
              onDebouncedChange={(value) => pushParams({ search: value.trim() })}
            />
          </View>

          {hasActiveFilters ? (
            <View className="mb-5 flex-row flex-wrap items-center gap-2">
              <Text className="w-full font-sans text-xs font-medium text-gray-500 dark:text-slate-400 sm:w-auto">
                {t('products.active_filters')}:
              </Text>
              {searchQuery ? (
                <FilterChip
                  label={t('products.search_filter', { query: searchQuery })}
                  tone="blue"
                  onClear={() => pushParams({ search: undefined })}
                />
              ) : null}
              {selectedCategory ? (
                <FilterChip
                  label={t('products.category_filter', {
                    category: findCategoryName(selectedCategory),
                  })}
                  tone="green"
                  onClear={() => pushParams({ category: undefined })}
                />
              ) : null}
              {minPrice || maxPrice ? (
                <FilterChip
                  label={
                    minPrice && maxPrice
                      ? `${minPrice} - ${maxPrice} ${currencyLabel}`
                      : minPrice
                        ? `>= ${minPrice} ${currencyLabel}`
                        : `<= ${maxPrice} ${currencyLabel}`
                  }
                  tone="purple"
                  onClear={() => pushParams({ min_price: undefined, max_price: undefined })}
                />
              ) : null}
              <Pressable onPress={clearFilters} className="w-full sm:ml-auto sm:w-auto">
                <Text className="font-sans text-xs text-gray-500 underline dark:text-slate-400">
                  {t('products.clear_all')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Modal
            visible={!isDesktop && sidebarOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setSidebarOpen(false)}
          >
            <View className="flex-1">
              <Pressable
                className="absolute inset-0 bg-black/50"
                onPress={() => setSidebarOpen(false)}
              />
              <SafeAreaView
                edges={['top', 'bottom', 'left']}
                className="absolute bottom-0 left-0 top-0 w-72 max-w-[85%] bg-gray-50 shadow-2xl dark:bg-slate-900"
              >
                <View className="border-b border-gray-200 px-4 py-3 dark:border-slate-700">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100">
                      {t('products.filters')}
                    </Text>
                    <Pressable
                      onPress={() => setSidebarOpen(false)}
                      className="h-9 w-9 items-center justify-center rounded-lg active:bg-gray-200 dark:active:bg-slate-800"
                    >
                      <Feather name="x" color={mutedIconColor} size={20} />
                    </Pressable>
                  </View>
                </View>
                <ScrollView
                  className="flex-1 px-4 py-4"
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <FilterPanel
                    categories={categories}
                    selectedCategory={selectedCategory}
                    activeLanguage={activeLanguage}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    hasActiveFilters={hasActiveFilters}
                    showHeader={false}
                    scrollCategories
                    onCategory={(id) => {
                      pushParams({ category: id || undefined });
                      setSidebarOpen(false);
                    }}
                    onPrice={(min, max) => pushParams({ min_price: min, max_price: max })}
                    onSort={(nextSortBy, nextSortOrder) =>
                      pushParams({ sort_by: nextSortBy, sort_order: nextSortOrder })
                    }
                    onClear={() => {
                      clearFilters();
                      setSidebarOpen(false);
                    }}
                  />
                </ScrollView>
              </SafeAreaView>
            </View>
          </Modal>

          <View className={`gap-6 ${isDesktop ? 'flex-row lg:gap-8' : ''}`}>
            {isDesktop ? (
              <View className="w-56 shrink-0 lg:w-64">
                <FilterPanel
                  categories={categories}
                  selectedCategory={selectedCategory}
                  activeLanguage={activeLanguage}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  hasActiveFilters={hasActiveFilters}
                  onCategory={(id) => pushParams({ category: id || undefined })}
                  onPrice={(min, max) => pushParams({ min_price: min, max_price: max })}
                  onSort={(nextSortBy, nextSortOrder) =>
                    pushParams({ sort_by: nextSortBy, sort_order: nextSortOrder })
                  }
                  onClear={clearFilters}
                />
              </View>
            ) : null}

            <View className="min-w-0 flex-1">
              <View className="mb-4 flex-row items-center justify-between gap-3">
                <Text className="min-w-0 flex-1 font-sans text-xl font-bold text-gray-900 dark:text-white sm:text-2xl" numberOfLines={1}>
                  {title}
                </Text>
                <View className="shrink-0 flex-row items-center gap-2">
                  {products.length > 0 ? (
                    <Text className="hidden font-sans text-xs text-gray-500 dark:text-slate-400 sm:block">
                      {t('products.showing_count', { count: products.length })}
                      {hasMore ? '+' : ''}
                    </Text>
                  ) : null}
                  {!isDesktop ? (
                    <Pressable
                      onPress={() => setSidebarOpen(true)}
                      className={`min-h-10 flex-row items-center gap-1.5 rounded-lg border px-3 py-2 ${
                        hasActiveFilters
                          ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                          : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      <Feather
                        name="sliders"
                        color={hasActiveFilters ? '#16a34a' : mutedIconColor}
                        size={16}
                      />
                      <Text
                        className={`font-sans text-sm font-medium ${
                          hasActiveFilters
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        {t('products.filters')}
                      </Text>
                      {activeFilterCount > 0 ? (
                        <View className="min-h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5">
                          <Text className="font-sans text-[10px] font-bold text-white">
                            {activeFilterCount}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {error ? (
                <View className="mb-5 flex-row items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <Feather name="alert-triangle" color="#f59e0b" size={20} />
                  <Text className="min-w-0 flex-1 font-sans text-sm text-yellow-700 dark:text-yellow-400">
                    {error}
                  </Text>
                </View>
              ) : null}

              {loading && products.length === 0 ? (
                <View className={PRODUCT_LIST_GRID_CLASS}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <CardSkeleton key={`product-skeleton-${index}`} />
                  ))}
                </View>
              ) : products.length > 0 ? (
                <FlatList
                  data={productRows}
                  keyExtractor={(_, index) => `product-row-${index}`}
                  renderItem={({ item: row, index: rowIndex }) => {
                    const emptySlots = Math.max(0, productColumns - row.length);
                    const eagerRow = rowIndex < 2;
                    const rowContent = (
                      <View className="product-list-row mb-3 flex-row items-stretch gap-3 sm:mb-4 sm:gap-4">
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
                    const rowPlaceholder = (
                      <View className="product-list-row mb-3 flex-row items-stretch gap-3 sm:mb-4 sm:gap-4">
                        {Array.from({ length: productColumns }).map((_, index) => (
                          <CardSkeleton
                            key={`product-row-placeholder-${index}`}
                            className={PRODUCT_CARD_ROW_CLASS}
                          />
                        ))}
                      </View>
                    );

                    if (Platform.OS === 'web' && !eagerRow) {
                      return (
                        <LazyMountWhenVisible placeholder={rowPlaceholder}>
                          {rowContent}
                        </LazyMountWhenVisible>
                      );
                    }

                    return rowContent;
                  }}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  initialNumToRender={Platform.OS === 'web' ? 3 : 4}
                  maxToRenderPerBatch={Platform.OS === 'web' ? 1 : 2}
                  windowSize={Platform.OS === 'web' ? 3 : 5}
                  removeClippedSubviews={Platform.OS !== 'web'}
                  ListFooterComponent={
                    loadingMore ? (
                      <View className="mb-3 flex-row items-stretch gap-3 sm:mb-4 sm:gap-4">
                        {Array.from({ length: productColumns }).map((_, index) => (
                          <CardSkeleton
                            key={`more-product-skeleton-${index}`}
                            className={PRODUCT_CARD_ROW_CLASS}
                          />
                        ))}
                      </View>
                    ) : null
                  }
                />
              ) : !loading ? (
                <View className="w-full items-center py-16">
                  <Feather name="search" color={isDark ? '#475569' : '#cbd5e1'} size={48} />
                  <Text className="mt-3 font-sans text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('products.no_products_found')}
                  </Text>
                  <Text className="mt-1 text-center font-sans text-sm text-gray-500 dark:text-gray-400">
                    {t('products.try_adjusting_search')}
                  </Text>
                  <Pressable onPress={clearFilters} className="mt-4 rounded-lg bg-green-600 px-5 py-2">
                    <Text className="font-sans text-sm font-medium text-white">
                      {t('products.clear_filters')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {!hasMore && products.length > 0 ? (
                <Text className="py-8 text-center font-sans text-sm text-gray-400 dark:text-gray-500">
                  {t('products.no_more_products')}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}

function FilterChip({
  label,
  tone,
  onClear,
}: {
  label: string;
  tone: 'blue' | 'green' | 'purple';
  onClear: () => void;
}) {
  const { isDark } = useTheme();
  const classes = {
    blue: 'bg-blue-100 dark:bg-blue-900/40',
    green: 'bg-green-100 dark:bg-green-900/40',
    purple: 'bg-purple-100 dark:bg-purple-900/40',
  };
  const textClasses = {
    blue: 'text-blue-800 dark:text-blue-300',
    green: 'text-green-800 dark:text-green-300',
    purple: 'text-purple-800 dark:text-purple-300',
  };
  const iconColors = {
    blue: isDark ? '#93c5fd' : '#1d4ed8',
    green: isDark ? '#86efac' : '#15803d',
    purple: isDark ? '#d8b4fe' : '#7e22ce',
  };

  return (
    <View className={`max-w-full flex-row items-center gap-1 rounded-full px-2.5 py-1 ${classes[tone]}`}>
      <Text className={`min-w-0 flex-1 font-sans text-xs font-medium ${textClasses[tone]}`} numberOfLines={1}>
        {label}
      </Text>
      <Pressable onPress={onClear} className="h-5 w-5 items-center justify-center rounded-full">
        <Feather name="x" color={iconColors[tone]} size={12} />
      </Pressable>
    </View>
  );
}
