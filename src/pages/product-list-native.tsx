import Feather from '@expo/vector-icons/Feather';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { ProductListCard } from '@/components/marketplace-list-screen';
import { useAppTranslation } from '@/i18n';
import {
  fetchProductFilterCategories,
  fetchProductList,
  type BrowserCategory,
  type HomeProduct,
} from '@/utils/native-api';

const priceRanges = [
  { value: '0-10000', minPrice: '', maxPrice: '10000', labelKey: 'filter.under_10000' },
  {
    value: '10000-50000',
    minPrice: '10000',
    maxPrice: '50000',
    labelKey: 'filter.10000_to_50000',
  },
  {
    value: '50000-100000',
    minPrice: '50000',
    maxPrice: '100000',
    labelKey: 'filter.50000_to_100000',
  },
  { value: '100000-', minPrice: '100000', maxPrice: '', labelKey: 'filter.over_100000' },
];

const sortOptions = [
  { value: 'created_at:desc', sortBy: 'created_at', sortOrder: 'desc', labelKey: 'filter.newest' },
  { value: 'price:asc', sortBy: 'price', sortOrder: 'asc', labelKey: 'filter.price_low_to_high' },
  { value: 'price:desc', sortBy: 'price', sortOrder: 'desc', labelKey: 'filter.price_high_to_low' },
  {
    value: 'average_rating:desc',
    sortBy: 'average_rating',
    sortOrder: 'desc',
    labelKey: 'filter.top_rated',
  },
  {
    value: 'review_count:desc',
    sortBy: 'review_count',
    sortOrder: 'desc',
    labelKey: 'filter.most_reviewed',
  },
];

function CardSkeleton({
  className = 'h-[320px] w-[47%] sm:h-[354px] sm:w-[30.5%] lg:h-[376px] lg:w-[22.5%]',
}: {
  className?: string;
}) {
  return (
    <View className={`${className} min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800`}>
      <View className="aspect-square bg-gray-200 dark:bg-gray-700" />
      <View className="min-h-0 flex-1 gap-1.5 p-3">
        <View className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <View className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        <View className="flex-1" />
        <View className="h-7 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <View className="h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </View>
    </View>
  );
}

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
  const [draft, setDraft] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <View className="mx-auto w-full max-w-2xl flex-row overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
      <View className="items-center justify-center pl-3.5">
        <Feather name="search" color="#9ca3af" size={20} />
      </View>
      <TextInput
        value={draft}
        onChangeText={updateDraft}
        onSubmitEditing={() => onSubmit(draft)}
        placeholder={t('products.search_placeholder')}
        placeholderTextColor="#9ca3af"
        className="min-w-0 flex-1 py-3 pl-3 pr-3 font-sans text-sm text-gray-900 dark:text-gray-100"
        returnKeyType="search"
      />
      <Pressable onPress={() => onSubmit(draft)} className="flex-shrink-0 justify-center bg-green-600 px-5 py-3">
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
          className={`flex-row items-center justify-between rounded-lg px-2.5 py-1.5 ${
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
            {hasChildren ? <Feather name="chevron-right" color="#9ca3af" size={14} /> : null}
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
        className={`rounded-lg px-2.5 py-1.5 ${
          allSelected ? 'bg-green-100 dark:bg-green-900/40' : ''
        }`}>
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
  onCategory: (id: string) => void;
  onPrice: (min: string, max: string) => void;
  onSort: (sortBy: string, sortOrder: string) => void;
  onClear: () => void;
}) {
  const { t } = useAppTranslation();
  const selectedPrice = priceRanges.find(
    (range) => range.minPrice === minPrice && range.maxPrice === maxPrice
  )?.value;
  const selectedSort = `${sortBy}:${sortOrder}`;

  return (
    <View className="gap-6">
      <View className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('products.filters')}
          </Text>
          {hasActiveFilters ? (
            <Pressable onPress={onClear}>
              <Text className="font-sans text-xs text-green-600 dark:text-green-400">
                {t('products.clear_all')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="gap-6">
          <View>
            <Text className="mb-3 font-sans text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t('filter.price_range')}
            </Text>
            <View className="gap-2">
              {priceRanges.map((range) => {
                const active = selectedPrice === range.value;
                return (
                  <Pressable
                    key={range.value}
                    onPress={() =>
                      active ? onPrice('', '') : onPrice(range.minPrice, range.maxPrice)
                    }
                    className="flex-row items-center gap-3">
                    <View
                      className={`h-4 w-4 rounded border ${
                        active
                          ? 'border-green-600 bg-green-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                      {active ? <Feather name="check" color="#ffffff" size={12} /> : null}
                    </View>
                    <Text className="font-sans text-sm text-gray-600 dark:text-gray-400">
                      {t(range.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text className="mb-3 font-sans text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t('filter.sort_by')}
            </Text>
            <View className="gap-2">
              {sortOptions.map((option) => {
                const active = selectedSort === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => onSort(option.sortBy, option.sortOrder)}
                    className={`rounded-lg border px-3 py-2 ${
                      active
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
                    }`}>
                    <Text
                      className={`font-sans text-sm ${
                        active
                          ? 'font-semibold text-green-700 dark:text-green-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <View className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Text className="mb-3 font-sans text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('products.categories')}
        </Text>
        <CategorySelector
          categories={categories}
          selectedCategory={selectedCategory}
          activeLanguage={activeLanguage}
          onSelect={onCategory}
        />
      </View>
    </View>
  );
}

export function ProductListNative() {
  const { t, language } = useAppTranslation();
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
  const currencyLabel = t('common.currency.mmk', 'MMK');
  const activeLanguage = language;
  const hasActiveFilters = Boolean(searchQuery || selectedCategory || minPrice || maxPrice);
  const queryKey = `${searchQuery}|${selectedCategory}|${minPrice}|${maxPrice}|${sortBy}|${sortOrder}`;
  const productColumns = width >= 1024 ? 4 : width >= 640 ? 3 : 2;
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

    const loadProducts = async () => {
      setLoading(true);
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
        setProducts(nextProducts);
        setHasMore(nextProducts.length >= 24);
      } catch {
        if (!controller.signal.aborted) {
          setError(t('products.fetch_error'));
          setProducts([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadProducts();

    return () => controller.abort();
  }, [queryKey, maxPrice, minPrice, searchQuery, selectedCategory, sortBy, sortOrder, t]);

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
      <View className="bg-gray-50 px-4 py-6 dark:bg-slate-950 sm:px-6 sm:py-8 lg:px-8">
        <View className="mx-auto w-full max-w-7xl">
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
              <Text className="font-sans text-xs font-medium text-gray-500 dark:text-gray-400">
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
              <Pressable onPress={clearFilters} className="ml-auto">
                <Text className="font-sans text-xs text-gray-500 underline dark:text-gray-400">
                  {t('products.clear_all')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Modal
            visible={sidebarOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setSidebarOpen(false)}
          >
            <View className="flex-1 md:hidden">
              <Pressable className="absolute inset-0 bg-black/50" onPress={() => setSidebarOpen(false)} />
              <View className="h-full w-72 bg-gray-50 p-4 shadow-2xl dark:bg-gray-900">
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="font-sans font-semibold text-gray-900 dark:text-gray-100">
                    {t('products.filters')}
                  </Text>
                  <Pressable onPress={() => setSidebarOpen(false)}>
                    <Feather name="x" color="#9ca3af" size={20} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <FilterPanel
                    categories={categories}
                    selectedCategory={selectedCategory}
                    activeLanguage={activeLanguage}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    hasActiveFilters={hasActiveFilters}
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
              </View>
            </View>
          </Modal>

          <View className="gap-6 md:flex-row lg:gap-8">
            <View className="hidden w-56 shrink-0 md:block lg:w-64">
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

            <View className="min-w-0 flex-1">
              <View className="mb-4 flex-row items-center justify-between gap-3">
                <Text className="min-w-0 flex-1 font-sans text-xl font-bold text-gray-900 dark:text-white sm:text-2xl" numberOfLines={1}>
                  {title}
                </Text>
                <View className="shrink-0 flex-row items-center gap-2">
                  {products.length > 0 ? (
                    <Text className="hidden font-sans text-xs text-gray-500 dark:text-gray-400 sm:block">
                      {t('products.showing_count', { count: products.length })}
                      {hasMore ? '+' : ''}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => setSidebarOpen(true)}
                    className="flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-600 dark:bg-gray-800 md:hidden">
                    <Feather name="sliders" color="#64748b" size={16} />
                    <Text className="font-sans text-sm text-gray-700 dark:text-gray-300">
                      {t('products.filters')}
                    </Text>
                  </Pressable>
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
                <View className="flex-row flex-wrap gap-3 sm:gap-4">
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
                    return (
                      <View className="mb-3 flex-row gap-3 sm:mb-4 sm:gap-4">
                        {row.map((product) => (
                          <ProductListCard
                            key={String(product.id)}
                            product={product}
                            className="h-[320px] min-w-0 flex-1 sm:h-[354px] lg:h-[376px]"
                            imagePriority={rowIndex < 2}
                          />
                        ))}
                        {Array.from({ length: emptySlots }).map((_, index) => (
                          <View
                            key={`product-row-filler-${index}`}
                            className="min-w-0 flex-1 opacity-0"
                            pointerEvents="none"
                          />
                        ))}
                      </View>
                    );
                  }}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  ListFooterComponent={
                    loadingMore ? (
                      <View className="flex-row flex-wrap gap-3 pt-1 sm:gap-4">
                        {Array.from({ length: productColumns }).map((_, index) => (
                          <CardSkeleton
                            key={`more-product-skeleton-${index}`}
                            className="h-[320px] min-w-0 flex-1 sm:h-[354px] lg:h-[376px]"
                          />
                        ))}
                      </View>
                    ) : null
                  }
                />
              ) : !loading ? (
                <View className="w-full items-center py-16">
                  <Feather name="search" color="#cbd5e1" size={48} />
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
  const classes = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  };

  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${classes[tone]}`}>
      <Text className="font-sans text-xs font-medium">{label}</Text>
      <Pressable onPress={onClear}>
        <Feather name="x" color="#64748b" size={12} />
      </Pressable>
    </View>
  );
}
