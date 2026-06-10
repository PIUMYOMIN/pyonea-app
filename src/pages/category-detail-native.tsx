import Feather from '@expo/vector-icons/Feather';
import { Link, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { PRODUCT_LIST_GRID_CLASS, SITE_CONTAINER_CLASS } from '@/constants/layout';
import {
  CardSkeleton,
  ProductListRow,
  ProductListRowSkeleton,
} from '@/components/marketplace-list-screen';
import {
  CategoryCardFromBrowser,
  getCategoryDisplayName,
} from '@/components/ui/category-card';
import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import {
  fetchCategoryDetail,
  fetchProductList,
  type CategoryDetail,
  type HomeProduct,
} from '@/utils/native-api';

type CategoryDetailNativeProps = {
  slug: string;
  initialCategory?: CategoryDetail | null;
};

export function CategoryDetailNative({ slug, initialCategory = null }: CategoryDetailNativeProps) {
  const { t, language } = useAppTranslation();
  const { isDark } = useTheme();
  const router = useRouter();
  const [category, setCategory] = useState<CategoryDetail | null>(initialCategory);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(!initialCategory);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const loadMoreLockRef = useRef(false);
  const mutedIconColor = isDark ? '#94a3b8' : '#64748b';
  const displayName = category ? getCategoryDisplayName(category, language) : '';
  const description =
    language === 'my'
      ? category?.descriptionMm || category?.descriptionEn
      : category?.descriptionEn || category?.descriptionMm;
  const productColumns = 2;
  const productRows = useMemo(() => {
    const rows: HomeProduct[][] = [];
    for (let index = 0; index < products.length; index += productColumns) {
      rows.push(products.slice(index, index + productColumns));
    }
    return rows;
  }, [products]);

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
      setLoadingCategory(false);
      return;
    }

    const controller = new AbortController();
    setLoadingCategory(true);

    void fetchCategoryDetail(slug, controller.signal)
      .then((nextCategory) => {
        if (controller.signal.aborted) return;
        setCategory(nextCategory);
        if (!nextCategory) setError(t('categories.fetch_error'));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t('categories.fetch_error'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCategory(false);
      });

    return () => controller.abort();
  }, [initialCategory, slug, t]);

  useEffect(() => {
    if (!category) return;

    const controller = new AbortController();
    setLoadingProducts(true);
    setPage(1);
    setHasMore(true);

    void fetchProductList(
      {
        category: String(category.id),
        page: 1,
        perPage: 24,
        sortBy: 'created_at',
        sortOrder: 'desc',
      },
      controller.signal
    )
      .then((nextProducts) => {
        if (controller.signal.aborted) return;
        setProducts(nextProducts);
        setHasMore(nextProducts.length >= 24);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t('products.fetch_error'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProducts(false);
      });

    return () => controller.abort();
  }, [category, t]);

  const loadMore = async () => {
    if (!category || loadMoreLockRef.current || loadingProducts || loadingMore || !hasMore) return;

    loadMoreLockRef.current = true;
    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const nextProducts = await fetchProductList({
        category: String(category.id),
        page: nextPage,
        perPage: 24,
        sortBy: 'created_at',
        sortOrder: 'desc',
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
      loadMoreLockRef.current = false;
    }
  };

  if (loadingCategory && !category) {
    return (
      <AppLayout>
        <View className="bg-gray-50 py-10 dark:bg-slate-950">
          <View className={SITE_CONTAINER_CLASS}>
            <View className={PRODUCT_LIST_GRID_CLASS}>
              {Array.from({ length: 6 }).map((_, index) => (
                <CardSkeleton key={`category-loading-${index}`} />
              ))}
            </View>
          </View>
        </View>
      </AppLayout>
    );
  }

  if (!category) {
    return (
      <AppLayout>
        <View className="items-center bg-gray-50 px-4 py-20 dark:bg-slate-950">
          <Feather name="grid" color={mutedIconColor} size={48} />
          <Text className="mt-4 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
            {error || t('categories.no_categories_available')}
          </Text>
          <Pressable onPress={() => router.push('/categories' as Href)} className="mt-4 rounded-lg bg-green-600 px-5 py-2">
            <Text className="font-sans text-sm font-medium text-white">{t('categories.browse_categories')}</Text>
          </Pressable>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout onEndReached={loadMore}>
      <View className="bg-gray-50 dark:bg-slate-950">
        <View className="bg-green-600">
          <View className={`${SITE_CONTAINER_CLASS} py-10`}>
            <Pressable onPress={() => router.push('/categories' as Href)} className="mb-4 self-start">
              <Text className="font-sans text-sm text-green-100">{t('categories.browse_categories')}</Text>
            </Pressable>
            <Text className="font-sans text-3xl font-bold text-white sm:text-4xl">{displayName}</Text>
            {description ? (
              <Text className="mt-3 max-w-3xl font-sans text-base leading-7 text-green-100">{description}</Text>
            ) : null}
            <Text className="mt-4 font-sans text-sm text-green-100">
              {t('category.products')}: {category.productCount}
            </Text>
          </View>
        </View>

        <View className={`${SITE_CONTAINER_CLASS} py-8`}>
          {category.children.length > 0 ? (
            <View className="mb-8">
              <Text className="mb-4 font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                {t('categories.browse_categories')}
              </Text>
              <View className="gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                {category.children.map((child) => (
                  <CategoryCardFromBrowser key={String(child.id)} category={child} language={language} />
                ))}
              </View>
            </View>
          ) : null}

          {error ? (
            <View className="mb-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <Text className="font-sans text-sm text-yellow-700 dark:text-yellow-400">{error}</Text>
            </View>
          ) : null}

          <Text className="mb-4 font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
            {t('products.all_products')}
          </Text>

          {loadingProducts && products.length === 0 ? (
            <View className={PRODUCT_LIST_GRID_CLASS}>
              {Array.from({ length: 4 }).map((_, index) => (
                <CardSkeleton key={`category-product-skeleton-${index}`} />
              ))}
            </View>
          ) : products.length > 0 ? (
            Platform.OS === 'web' ? (
              <View>
                {productRows.map((row, rowIndex) => (
                  <ProductListRow
                    key={`category-product-row-${rowIndex}`}
                    row={row}
                    productColumns={productColumns}
                    rowIndex={rowIndex}
                  />
                ))}
                {loadingMore ? <ProductListRowSkeleton productColumns={productColumns} /> : null}
              </View>
            ) : (
              <FlatList
                data={productRows}
                keyExtractor={(_, index) => `category-product-row-${index}`}
                scrollEnabled={false}
                renderItem={({ item: row, index: rowIndex }) => (
                  <ProductListRow
                    row={row}
                    productColumns={productColumns}
                    rowIndex={rowIndex}
                  />
                )}
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={9}
                removeClippedSubviews
                ListFooterComponent={
                  loadingMore ? (
                    <ProductListRowSkeleton productColumns={productColumns} />
                  ) : null
                }
              />
            )
          ) : (
            <View className="items-center py-12">
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                {t('products.no_products_found')}
              </Text>
              <Link href="/products" asChild>
                <Pressable className="mt-4 rounded-lg bg-green-600 px-5 py-2">
                  <Text className="font-sans text-sm font-medium text-white">{t('header.products')}</Text>
                </Pressable>
              </Link>
            </View>
          )}
        </View>
      </View>
    </AppLayout>
  );
}
