import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { LocalDealCard } from '@/components/marketplace-list-screen';
import { SITE_CONTAINER_CLASS } from '@/constants/layout';
import { useAppTranslation } from '@/i18n';
import { fetchLocalDealsPage, type LocalDeal } from '@/utils/native-api';

const PER_PAGE = 12;

const regionKeys = [
  'all',
  'yangon',
  'mandalay',
  'naypyidaw',
  'ayeyarwady',
  'shan',
  'other',
] as const;

type RegionKey = (typeof regionKeys)[number];

export function LocalDealsNative() {
  const { t } = useAppTranslation();
  const [activeRegion, setActiveRegion] = useState<RegionKey>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deals, setDeals] = useState<LocalDeal[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const regions = useMemo(
    () =>
      regionKeys.map((id) => ({
        id,
        label: t(`localDeals.regions.${id}`, { defaultValue: id }),
      })),
    [t],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [activeRegion, debouncedSearch]);

  const loadDeals = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');

      try {
        const result = await fetchLocalDealsPage({
          page: pageNum,
          perPage: PER_PAGE,
          region: activeRegion,
          search: debouncedSearch || undefined,
        });

        setLastPage(result.lastPage);
        setTotal(result.total);
        setPage(result.currentPage);
        setDeals((current) =>
          append
            ? [...current, ...result.deals.filter((deal) => !current.some((item) => item.id === deal.id))]
            : result.deals,
        );
      } catch {
        setError(t('localDeals.load_error', { defaultValue: 'We could not load deals. Please try again.' }));
        if (!append) setDeals([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeRegion, debouncedSearch, t],
  );

  useEffect(() => {
    void loadDeals(1, false);
  }, [loadDeals]);

  const hasMore = page < lastPage;

  return (
    <AppLayout>
      <View className={`${SITE_CONTAINER_CLASS} gap-6 px-4 py-6`}>
        <View className="gap-1">
          <Text className="font-sans text-2xl font-bold text-gray-950 dark:text-slate-50">
            {t('localDeals.title', { defaultValue: 'Local Deals' })}
          </Text>
          <Text className="font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
            {t('localDeals.subtitle', {
              defaultValue: 'Active coupon codes from verified sellers — filter by region and use at checkout.',
            })}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            {t('localDeals.search_label', { defaultValue: 'Search deals' })}
          </Text>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t('localDeals.search_placeholder', { defaultValue: 'Search by offer name or code…' })}
            placeholderTextColor="#9ca3af"
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {regions.map((region) => {
            const active = activeRegion === region.id;
            return (
              <Pressable
                key={region.id}
                onPress={() => setActiveRegion(region.id)}
                className={`rounded-full px-4 py-2 ${
                  active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-800'
                }`}>
                <Text
                  className={`font-sans text-xs font-bold ${
                    active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                  }`}>
                  {region.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#16a34a" />
            <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('localDeals.loading', { defaultValue: 'Loading…' })}
            </Text>
          </View>
        ) : error ? (
          <View className="items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-10 dark:border-red-900/40 dark:bg-red-950/20">
            <Feather name="alert-circle" color="#dc2626" size={28} />
            <Text className="mt-3 text-center font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
            <Pressable onPress={() => void loadDeals(1, false)} className="mt-4 rounded-lg bg-red-600 px-4 py-2">
              <Text className="font-sans text-sm font-bold text-white">
                {t('common.retry', { defaultValue: 'Retry' })}
              </Text>
            </Pressable>
          </View>
        ) : deals.length === 0 ? (
          <View className="items-center rounded-2xl border border-gray-200 bg-white px-4 py-12 dark:border-slate-700 dark:bg-slate-900">
            <Feather name="tag" color="#9ca3af" size={32} />
            <Text className="mt-3 text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
              {t('localDeals.empty', { defaultValue: 'No deals match your filters right now.' })}
            </Text>
            <Text className="mt-2 text-center font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
              {t('localDeals.empty_hint', {
                defaultValue:
                  'Sellers publish coupons from Seller dashboard → Coupons. Once live, they appear here automatically.',
              })}
            </Text>
          </View>
        ) : (
          <>
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {t('localDeals.showing_count', {
                defaultValue: 'Showing {{count}} of {{total}}',
                count: deals.length,
                total,
              })}
            </Text>
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {deals.map((deal) => (
                <LocalDealCard key={String(deal.id)} deal={deal} />
              ))}
            </View>
            {hasMore ? (
              <Pressable
                onPress={() => void loadDeals(page + 1, true)}
                disabled={loadingMore}
                className="items-center rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                {loadingMore ? (
                  <ActivityIndicator color="#16a34a" />
                ) : (
                  <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                    {t('localDeals.load_more', { defaultValue: 'Load more' })}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </>
        )}

        <View className="gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
            {t('localDeals.about_title', { defaultValue: 'About Local Deals' })}
          </Text>
          <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
            {t('localDeals.about_p2', {
              defaultValue:
                'Copy the code at checkout to apply the discount. Visit the seller’s store to shop eligible products.',
            })}
          </Text>
          <Link href="/products" asChild>
            <Pressable className="mt-2 self-start">
              <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                {t('localDeals.browse_products', { defaultValue: 'Browse all products' })} →
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AppLayout>
  );
}

export default LocalDealsNative;
