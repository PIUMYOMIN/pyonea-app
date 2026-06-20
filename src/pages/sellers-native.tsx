import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import {
  chunkMarketplaceItems,
  isMarketplaceWeb,
  MarketplaceGridRow,
  useSellerDirectoryColumns,
} from '@/components/marketplace/marketplace-grid';
import { SELLER_DIRECTORY_GRID_CLASS, SITE_CONTAINER_CLASS } from '@/constants/layout';
import { useAppTranslation, useLocalizedHref } from '@/i18n';
import { fetchSellers, type HomeSeller } from '@/utils/native-api';
import { getThumbUrl } from '@/utils/image-thumbs';

function SellerStarRow({ rating, reviews }: { rating: number; reviews: number }) {
  const { t } = useAppTranslation();
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <View className="mt-1 flex-row items-center sm:mt-2">
      <View className="flex-row items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <FontAwesome
            key={star}
            name="star"
            color={star <= fullStars || (star === fullStars + 1 && hasHalfStar) ? '#facc15' : '#d1d5db'}
            size={13}
          />
        ))}
        {rating > 0 ? (
          <Text className="ml-1 font-sans text-xs font-medium text-gray-900 dark:text-slate-100 sm:text-sm">
            {rating.toFixed(1)}
          </Text>
        ) : (
          <Text className="ml-1 font-sans text-xs text-gray-500 dark:text-slate-400 sm:text-sm">
            {t('sellers.no_ratings')}
          </Text>
        )}
      </View>
      {reviews > 0 ? (
        <>
          <Text className="mx-1 font-sans text-gray-300 dark:text-slate-600 sm:mx-2">•</Text>
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400 sm:text-sm">
            {reviews}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function SellerStatusBadge({ seller }: { seller: HomeSeller }) {
  if (seller.verified) {
    return (
      <View className="self-start rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/30">
        <Text className="font-sans text-[11px] font-bold text-green-700 dark:text-green-300">
          Approved
        </Text>
      </View>
    );
  }

  return (
    <View className="self-start rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/30">
      <Text className="font-sans text-[11px] font-bold text-amber-700 dark:text-amber-300">
        Pending review
      </Text>
    </View>
  );
}

function SellerDirectoryCard({ seller }: { seller: HomeSeller }) {
  const { t } = useAppTranslation();
  const href = useLocalizedHref();
  const rating = Number(seller.rating) || 0;
  const storeHref = href(`/sellers/${seller.slug || seller.id}`);

  return (
    <View className="w-full min-w-0 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md shadow-gray-200/70 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
      <View className="p-3 sm:p-4">
        <View className="flex-row items-start gap-2 sm:gap-3">
          <View className="relative flex-shrink-0">
            {seller.imageUrl ? (
              <Image
                source={{ uri: getThumbUrl(seller.imageUrl, 160) }}
                style={{ width: 64, height: 64, borderRadius: 32 }}
                contentFit="cover"
                className="border-2 border-gray-200 dark:border-slate-600"
              />
            ) : (
              <View className="relative h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-100 dark:border-slate-500 dark:bg-slate-700 sm:h-16 sm:w-16">
                <Text className="font-sans text-base font-semibold text-gray-500 dark:text-slate-400 sm:text-lg">
                  {seller.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {seller.verified ? (
              <View className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 dark:bg-slate-900">
                <Feather name="check-circle" color="#22c55e" size={15} />
              </View>
            ) : null}
          </View>

          <View className="min-w-0 flex-1">
            <Link href={storeHref} asChild>
              <Pressable>
                <Text
                  className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100 sm:text-lg"
                  numberOfLines={1}>
                  {seller.name}
                </Text>
              </Pressable>
            </Link>

            <View className="mt-1">
              <SellerStatusBadge seller={seller} />
            </View>

            <View className="mt-1 gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
              <View className="max-w-[120px] self-start rounded bg-blue-100 px-1.5 py-0.5 dark:bg-blue-900/30 sm:max-w-none sm:px-2">
                <Text className="font-sans text-xs font-medium text-blue-800 dark:text-blue-400" numberOfLines={1}>
                  {seller.type || t('sellers.uncategorized')}
                </Text>
              </View>
              {seller.city ? (
                <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
                  {seller.city}
                </Text>
              ) : null}
            </View>

            <SellerStarRow rating={rating} reviews={seller.reviews} />
          </View>
        </View>

        <View className="mt-3 flex-row gap-2 sm:mt-4">
          <View className="flex-1 rounded-lg border border-green-100 bg-green-50 p-1.5 dark:border-green-800 dark:bg-green-900/30 sm:p-2">
            <Text className="text-center font-sans text-base font-semibold text-green-700 dark:text-green-400 sm:text-lg">
              {seller.products}
            </Text>
            <Text className="text-center font-sans text-xs text-green-600 dark:text-green-400">
              {t('sellers.products_label')}
            </Text>
          </View>
          <View className="flex-1 rounded-lg border border-blue-100 bg-blue-50 p-1.5 dark:border-blue-800 dark:bg-blue-900/30 sm:p-2">
            <Text className="text-center font-sans text-base font-semibold text-blue-700 dark:text-blue-400 sm:text-lg">
              {seller.reviews}
            </Text>
            <Text className="text-center font-sans text-xs text-blue-600 dark:text-blue-400">
              {t('sellers.reviews_label')}
            </Text>
          </View>
        </View>

        <Link href={storeHref} asChild>
          <Pressable className="mt-3 rounded-lg bg-green-600 px-3 py-2 shadow-sm sm:mt-4 sm:px-4">
            <Text className="text-center font-sans text-sm font-medium text-white sm:text-base">
              {t('sellers.view_store')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value) || options[0];

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        className="min-h-10 min-w-40 flex-row items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
        <Text className="font-sans text-sm text-gray-700 dark:text-slate-200" numberOfLines={1}>
          {selected?.name}
        </Text>
        <Feather name="chevron-down" color="#64748b" size={16} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/45 px-4" onPress={() => setOpen(false)}>
          <Pressable className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-white dark:bg-slate-800">
            {options.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`flex-row items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700 ${
                  option.id === value ? 'bg-green-50 dark:bg-green-900/20' : ''
                }`}>
                <Text
                  className={`font-sans text-sm ${
                    option.id === value
                      ? 'font-semibold text-green-700 dark:text-green-300'
                      : 'text-gray-700 dark:text-slate-200'
                  }`}>
                  {option.name}
                </Text>
                {option.id === value ? <Feather name="check" color="#16a34a" size={17} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SellerSkeleton() {
  return (
    <View className="w-full min-w-0 rounded-lg border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <View className="flex-row gap-3">
        <View className="h-16 w-16 rounded-full bg-gray-200 dark:bg-slate-700" />
        <View className="min-w-0 flex-1 gap-2">
          <View className="h-5 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
          <View className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
          <View className="h-4 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
        </View>
      </View>
      <View className="mt-4 flex-row gap-2">
        <View className="h-14 flex-1 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <View className="h-14 flex-1 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </View>
      <View className="mt-4 h-10 rounded-lg bg-gray-200 dark:bg-slate-700" />
    </View>
  );
}

const SELLERS_PER_PAGE = 12;

function SellerDirectoryGrid({
  sellers,
  loading,
}: {
  sellers: HomeSeller[];
  loading: boolean;
}) {
  const columns = useSellerDirectoryColumns();
  const rows = useMemo(() => chunkMarketplaceItems(sellers, columns), [columns, sellers]);

  if (isMarketplaceWeb) {
    return (
      <View className={SELLER_DIRECTORY_GRID_CLASS}>
        {loading
          ? Array.from({ length: 8 }).map((_, index) => <SellerSkeleton key={index} />)
          : sellers.map((seller) => <SellerDirectoryCard key={String(seller.id)} seller={seller} />)}
      </View>
    );
  }

  if (loading) {
    return (
      <View className="gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <SellerSkeleton key={index} />
        ))}
      </View>
    );
  }

  return (
    <View>
      {rows.map((row, rowIndex) => (
        <MarketplaceGridRow key={`seller-directory-row-${rowIndex}`} columns={columns}>
          {row.map((seller) => (
            <SellerDirectoryCard key={String(seller.id)} seller={seller} />
          ))}
        </MarketplaceGridRow>
      ))}
    </View>
  );
}

export function SellersNative() {
  const { t } = useAppTranslation();
  const href = useLocalizedHref();
  const [sellers, setSellers] = useState<HomeSeller[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOption, setSortOption] = useState('rating');
  const [visibleCount, setVisibleCount] = useState(SELLERS_PER_PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isNative = Platform.OS !== 'web';

  const categories = useMemo(
    () => [
      { id: 'all', name: t('sellers.all_categories') },
      { id: 'individual', name: t('sellers.individual') },
      { id: 'company', name: t('sellers.company') },
      { id: 'retail', name: t('sellers.retail') },
      { id: 'wholesale', name: t('sellers.wholesale') },
      { id: 'manufacturer', name: t('sellers.manufacturer') },
      { id: 'Uncategorized', name: t('sellers.uncategorized') },
    ],
    [t]
  );

  const sortOptions = useMemo(
    () => [
      { id: 'rating', name: t('sellers.highest_rating') },
      { id: 'reviewCount', name: t('sellers.most_reviews') },
      { id: 'joined', name: t('sellers.newest') },
      { id: 'name', name: t('sellers.alphabetical') },
    ],
    [t]
  );

  const loadSellers = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(false);

    return fetchSellers(signal)
      .then((nextSellers) => {
        if (signal?.aborted) return;
        setSellers(nextSellers);
        setError(false);
      })
      .catch(() => {
        if (signal?.aborted) return;
        setSellers([]);
        setError(true);
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSellers(controller.signal);
    return () => controller.abort();
  }, [loadSellers]);

  const filteredSellers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return [...sellers]
      .filter((seller) => {
        const matchesSearch =
          !search ||
          seller.name.toLowerCase().includes(search) ||
          seller.type.toLowerCase().includes(search);
        const matchesCategory = selectedCategory === 'all' || seller.type === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortOption === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (sortOption === 'reviewCount') return b.reviews - a.reviews;
        if (sortOption === 'joined') {
          return new Date(b.joined || 0).getTime() - new Date(a.joined || 0).getTime();
        }
        if (sortOption === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [searchTerm, selectedCategory, sellers, sortOption]);

  const visibleSellers = filteredSellers.slice(0, visibleCount);
  const hasMoreSellers = visibleCount < filteredSellers.length;

  const loadMoreSellers = () => {
    if (loading || hasMoreSellers === false) return;
    setVisibleCount((current) => Math.min(current + SELLERS_PER_PAGE, filteredSellers.length));
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setVisibleCount(SELLERS_PER_PAGE);
  };

  const updateSearch = (value: string) => {
    setSearchTerm(value);
    setVisibleCount(SELLERS_PER_PAGE);
  };

  const updateCategory = (value: string) => {
    setSelectedCategory(value);
    setVisibleCount(SELLERS_PER_PAGE);
  };

  const updateSort = (value: string) => {
    setSortOption(value);
    setVisibleCount(SELLERS_PER_PAGE);
  };

  if (error) {
    return (
      <AppLayout>
        <View className="min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900">
          <View className="items-center">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Feather name="alert-triangle" color="#dc2626" size={24} />
            </View>
            <Text className="mt-2 font-sans text-lg font-medium text-gray-900 dark:text-slate-100">
              {t('sellers.error_title')}
            </Text>
            <Text className="mt-1 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('sellers.fetch_error')}
            </Text>
            <Pressable
              onPress={() => {
                void loadSellers();
              }}
              className="mt-6 rounded-md bg-green-600 px-4 py-2">
              <Text className="font-sans text-sm font-medium text-white">{t('sellers.try_again')}</Text>
            </Pressable>
          </View>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout onEndReached={loadMoreSellers}>
      <View className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <View className="relative bg-green-700">
          <View className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60" />
          <View className={`relative ${SITE_CONTAINER_CLASS} items-center py-16 sm:py-20`}>
            <Text
              className={`text-center font-sans font-extrabold text-white ${
                isNative ? 'text-2xl' : 'text-3xl sm:text-5xl lg:text-6xl'
              }`}>
              {t('sellers.title')}
            </Text>
            <Text
              className={`mt-4 max-w-3xl text-center font-sans text-green-100 sm:mt-6 ${
                isNative ? 'text-base leading-6' : 'text-xl'
              }`}>
              {t('sellers.subtitle')}
            </Text>
          </View>
        </View>

        <View className={`${SITE_CONTAINER_CLASS} py-8`}>
          <View className="rounded-lg bg-white p-6 shadow shadow-gray-200/80 dark:bg-slate-800 dark:shadow-slate-900/50">
            <View className="gap-6 md:flex-row md:items-center md:justify-between">
              <View className="min-w-0 flex-1">
                <View className="min-h-10 flex-row items-center rounded-md border border-gray-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-800">
                  <Feather name="search" color="#9ca3af" size={18} />
                  <TextInput
                    value={searchTerm}
                    onChangeText={updateSearch}
                    placeholder={t('sellers.search_placeholder')}
                    placeholderTextColor="#94a3b8"
                    className="min-w-0 flex-1 px-3 py-2 font-sans text-sm text-gray-900 dark:text-slate-100"
                  />
                </View>
              </View>

              <Pressable
                onPress={() => setShowFilters((current) => !current)}
                className="min-h-10 flex-row items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-800 md:hidden">
                <Feather name="filter" color="#374151" size={18} />
                <Text className="ml-2 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('sellers.filters')}
                </Text>
              </Pressable>

              <View className="hidden gap-4 md:flex-row">
                <FilterSelect value={selectedCategory} options={categories} onChange={updateCategory} />
                <FilterSelect value={sortOption} options={sortOptions} onChange={updateSort} />
              </View>
            </View>

            {showFilters ? (
              <View className="mt-4 gap-4 md:hidden">
                <View className="gap-1">
                  <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                    {t('sellers.category')}
                  </Text>
                  <FilterSelect value={selectedCategory} options={categories} onChange={updateCategory} />
                </View>
                <View className="gap-1">
                  <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                    {t('sellers.sort_by')}
                  </Text>
                  <FilterSelect value={sortOption} options={sortOptions} onChange={updateSort} />
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View className={`${SITE_CONTAINER_CLASS} pb-12`}>
          <View className="mb-6 gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
              {t('sellers.all_sellers')}{' '}
              <Text className="text-green-600 dark:text-green-400">({filteredSellers.length})</Text>
            </Text>
            {filteredSellers.length > 0 ? (
              <Text className="hidden font-sans text-sm text-gray-500 dark:text-slate-400 md:flex">
                {t('sellers.showing_results', {
                  start: filteredSellers.length > 0 ? 1 : 0,
                  end: Math.min(visibleCount, filteredSellers.length),
                  total: filteredSellers.length,
                })}
              </Text>
            ) : null}
          </View>

          {loading || visibleSellers.length === 0 ? null : (
            <Text className="mb-3 font-sans text-sm text-gray-500 dark:text-slate-400 md:hidden">
              {t('sellers.showing_results', {
                start: 1,
                end: Math.min(visibleCount, filteredSellers.length),
                total: filteredSellers.length,
              })}
            </Text>
          )}

          {loading ? (
            <SellerDirectoryGrid sellers={[]} loading />
          ) : visibleSellers.length === 0 ? (
            <View className="items-center rounded-lg bg-white p-12 shadow shadow-gray-200/80 dark:bg-slate-800 dark:shadow-slate-900/50">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="search" color="#94a3b8" size={24} />
              </View>
              <Text className="mt-2 font-sans text-lg font-medium text-gray-900 dark:text-slate-100">
                {t('sellers.no_sellers_found')}
              </Text>
              <Text className="mt-1 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                {sellers.length === 0 ? t('sellers.no_sellers_available') : t('sellers.no_matching_sellers')}
              </Text>
              {sellers.length > 0 ? (
                <Pressable onPress={resetFilters} className="mt-6 rounded-md bg-green-600 px-4 py-2">
                  <Text className="font-sans text-sm font-medium text-white">{t('sellers.reset_filters')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <SellerDirectoryGrid sellers={visibleSellers} loading={false} />

              {hasMoreSellers ? (
                <View className="items-center py-4">
                  {isNative ? (
                    <Pressable
                      onPress={loadMoreSellers}
                      className="min-w-[180px] items-center rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                      <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                        {t('sellers.load_more', { defaultValue: 'Load more sellers' })}
                      </Text>
                    </Pressable>
                  ) : (
                    <ActivityIndicator color="#16a34a" />
                  )}
                </View>
              ) : null}
            </>
          )}
        </View>

        <View className="bg-green-700">
          <View className={`${SITE_CONTAINER_CLASS} gap-8 py-12 lg:flex-row lg:items-center lg:justify-between lg:py-16`}>
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-3xl font-extrabold text-white sm:text-4xl">
                {t('sellers.become_seller_title')}
              </Text>
              <Text className="mt-3 max-w-3xl font-sans text-lg text-green-100">
                {t('sellers.become_seller_description')}
              </Text>
            </View>
            <Link href={href('/register')} asChild>
              <Pressable className="self-start rounded-md bg-white px-5 py-3 shadow">
                <Text className="font-sans text-base font-medium text-green-700">
                  {t('sellers.join_now')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
