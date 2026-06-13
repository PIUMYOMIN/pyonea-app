import Feather from '@expo/vector-icons/Feather';
import { Link, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useAppTranslation, useLocalizedHref } from '@/i18n';
import { fetchLocalDealsPage, type LocalDeal } from '@/utils/native-api';

const PER_PAGE = 12;

const regions = [
  { id: 'all', labelKey: 'localDeals.regions.all' },
  { id: 'yangon', labelKey: 'localDeals.regions.yangon' },
  { id: 'mandalay', labelKey: 'localDeals.regions.mandalay' },
  { id: 'naypyidaw', labelKey: 'localDeals.regions.naypyidaw' },
  { id: 'ayeyarwady', labelKey: 'localDeals.regions.ayeyarwady' },
  { id: 'shan', labelKey: 'localDeals.regions.shan' },
  { id: 'other', labelKey: 'localDeals.regions.other' },
] as const;

function DealSkeleton() {
  return (
    <View className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600 md:w-[48%]">
      <View className="h-24 bg-gray-200 dark:bg-slate-600" />
      <View className="gap-3 p-4">
        <View className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-600" />
        <View className="h-3 rounded bg-gray-200 dark:bg-slate-600" />
        <View className="h-10 rounded bg-gray-200 dark:bg-slate-600" />
      </View>
    </View>
  );
}

function regionBadgeLabel(deal: LocalDeal, t: (key: string) => string) {
  if (deal.regionKey && deal.regionKey !== 'other') return t(`localDeals.regions.${deal.regionKey}`);
  return deal.location || t('localDeals.regions.other');
}

function LocalDealCard({ deal, onOpen }: { deal: LocalDeal; onOpen: (deal: LocalDeal) => void }) {
  const { t } = useAppTranslation();

  return (
    <View className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800/80 md:w-[48%]">
      <View className="bg-green-700 p-4">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="min-w-0 flex-1 font-sans text-lg font-bold leading-6 text-white" numberOfLines={2}>
            {deal.name}
          </Text>
          <View className="flex-shrink-0 rounded-full bg-white/95 px-2.5 py-1">
            <Text className="font-sans text-xs font-bold text-green-700">{deal.discount}</Text>
          </View>
        </View>
        <Text className="mt-1 font-sans text-sm text-green-100" numberOfLines={1}>
          {deal.seller}
        </Text>
      </View>

      <View className="p-4">
        <View className="mb-4 flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-slate-700">
            <Feather name="map-pin" color="#475569" size={13} />
            <Text className="font-sans text-xs font-semibold text-gray-800 dark:text-slate-200">
              {regionBadgeLabel(deal, t)}
            </Text>
          </View>
          <Text className="font-sans text-xs text-gray-600 dark:text-slate-400">
            {t('localDeals.expires')}: {deal.expiresAt}
          </Text>
        </View>

        {deal.minimumOrderValue > 0 ? (
          <Text className="mb-3 font-sans text-xs text-gray-500 dark:text-slate-500">
            {t('localDeals.min_order', { amount: deal.minimumOrder })}
          </Text>
        ) : null}

        <Pressable onPress={() => onOpen(deal)} className="rounded-lg bg-green-600 py-2.5">
          <Text className="text-center font-sans text-sm font-semibold text-white">
            {t('localDeals.view_deal')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function DealModal({
  deal,
  visible,
  copied,
  onClose,
  onCopy,
}: {
  deal: LocalDeal | null;
  visible: boolean;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
}) {
  const { t } = useAppTranslation();
  const href = useLocalizedHref();
  const sellerHref = deal?.sellerSlug ? href(`/sellers/${deal.sellerSlug}`) : undefined;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/50 p-4">
        <Pressable className="max-h-[90%] w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
          <View className="flex-row items-start justify-between gap-2 border-b border-gray-100 p-4 dark:border-slate-700">
            <Text className="min-w-0 flex-1 pr-2 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {deal?.name}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityLabel={t('localDeals.close')}
              className="h-8 w-8 items-center justify-center rounded-lg">
              <Feather name="x" color="#64748b" size={22} />
            </Pressable>
          </View>

          <View className="gap-4 p-4">
            <View>
              <Text className="mb-1 font-sans text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                {t('localDeals.coupon_code')}
              </Text>
              <View className="flex-row gap-2">
                <View className="min-w-0 flex-1 rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-700">
                  <Text className="font-mono text-sm text-gray-900 dark:text-slate-100" selectable>
                    {deal?.code}
                  </Text>
                </View>
                <Pressable
                  onPress={onCopy}
                  className="h-10 w-12 items-center justify-center rounded-lg bg-green-600">
                  <Feather name={copied ? 'check' : 'clipboard'} color="#ffffff" size={20} />
                </Pressable>
              </View>
              {copied ? (
                <Text className="mt-1 font-sans text-xs text-green-600 dark:text-green-400">
                  {t('localDeals.copied')}
                </Text>
              ) : null}
            </View>

            <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
              {t('localDeals.modal_hint')}
            </Text>

            {sellerHref ? (
              <Link href={sellerHref} asChild>
                <Pressable onPress={onClose} className="rounded-lg bg-gray-100 py-2.5 dark:bg-slate-700">
                  <Text className="text-center font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {t('localDeals.visit_store')}
                  </Text>
                </Pressable>
              </Link>
            ) : null}

            <Link href={href('/products')} asChild>
              <Pressable
                onPress={onClose}
                className="rounded-lg border border-green-600 py-2.5 dark:border-green-500">
                <Text className="text-center font-sans text-sm font-semibold text-green-700 dark:text-green-400">
                  {t('localDeals.browse_products')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function LocalDealsNative() {
  const { t } = useAppTranslation();
  const [activeRegion, setActiveRegion] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deals, setDeals] = useState<LocalDeal[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<LocalDeal | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    const loadDeals = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await fetchLocalDealsPage(
          {
            page: 1,
            perPage: PER_PAGE,
            region: activeRegion,
            search: debouncedSearch,
          },
          controller.signal
        );

        if (!controller.signal.aborted) {
          setDeals(result.deals);
          setPage(result.currentPage);
          setLastPage(result.lastPage);
          setTotal(result.total);
        }
      } catch {
        if (!controller.signal.aborted) {
          setDeals([]);
          setError(t('localDeals.load_error'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadDeals();

    return () => controller.abort();
  }, [activeRegion, debouncedSearch, t]);

  const showingLabel = useMemo(
    () => t('localDeals.showing_count', { count: deals.length, total }),
    [deals.length, t, total]
  );

  const loadMore = async () => {
    if (loading || loadingMore || page >= lastPage) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const result = await fetchLocalDealsPage({
        page: nextPage,
        perPage: PER_PAGE,
        region: activeRegion,
        search: debouncedSearch,
      });
      setDeals((current) => [...current, ...result.deals]);
      setPage(result.currentPage);
      setLastPage(result.lastPage);
      setTotal(result.total);
    } catch {
      setError(t('localDeals.load_error'));
    } finally {
      setLoadingMore(false);
    }
  };

  const openDeal = (deal: LocalDeal) => {
    setSelectedDeal(deal);
    setCopied(false);
  };

  const copyCode = () => {
    const code = selectedDeal?.code;
    if (!code) return;

    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard?.writeText) {
      void clipboard.writeText(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <View className="bg-gray-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
        <View className="mx-auto w-full max-w-6xl">
          <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl">
            {t('localDeals.title')}
          </Text>
          <Text className="mb-8 mt-2 font-sans text-base leading-7 text-gray-600 dark:text-slate-400">
            {t('localDeals.subtitle')}
          </Text>

          {error ? (
            <View className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/40">
              <Text className="font-sans text-sm text-red-800 dark:text-red-200">{error}</Text>
            </View>
          ) : null}

          <View className="mb-8 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
            <View className="mb-6 gap-4 lg:flex-row lg:justify-between">
              <TextInput
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder={t('localDeals.search_placeholder')}
                placeholderTextColor="#94a3b8"
                accessibilityLabel={t('localDeals.search_label')}
                className="min-h-12 flex-1 rounded-lg border border-gray-300 bg-white px-3 font-sans text-base text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <View className="flex-row flex-wrap gap-2">
                {regions.map((region) => {
                  const selected = activeRegion === region.id;
                  return (
                    <Pressable
                      key={region.id}
                      onPress={() => setActiveRegion(region.id)}
                      className={`rounded-lg px-3 py-2 ${
                        selected ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-700'
                      }`}>
                      <Text
                        className={`font-sans text-sm font-semibold ${
                          selected ? 'text-white' : 'text-gray-800 dark:text-slate-200'
                        }`}>
                        {t(region.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {loading ? (
              <View className="flex-row flex-wrap gap-4">
                {[1, 2, 3, 4].map((item) => (
                  <DealSkeleton key={item} />
                ))}
              </View>
            ) : deals.length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-center font-sans text-base text-gray-600 dark:text-slate-400">
                  {t('localDeals.empty')}
                </Text>
                <Text className="mx-auto mt-2 max-w-md text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-500">
                  {t('localDeals.empty_hint')}
                </Text>
              </View>
            ) : (
              <View>
                <Text className="mb-4 font-sans text-sm text-gray-500 dark:text-slate-400">
                  {showingLabel}
                </Text>
                <View className="flex-row flex-wrap gap-4">
                  {deals.map((deal) => (
                    <LocalDealCard key={String(deal.id)} deal={deal} onOpen={openDeal} />
                  ))}
                </View>
                {page < lastPage ? (
                  <View className="mt-8 items-center">
                    <Pressable
                      onPress={loadMore}
                      disabled={loadingMore}
                      className="rounded-lg border border-green-600 px-6 py-2.5 opacity-100 disabled:opacity-50 dark:border-green-500">
                      <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-400">
                        {loadingMore ? t('localDeals.loading') : t('localDeals.load_more')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          <View className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Text className="mb-3 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('localDeals.about_title')}
            </Text>
            <Text className="mb-3 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
              {t('localDeals.about_p1')}
            </Text>
            <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
              {t('localDeals.about_p2')}
            </Text>
          </View>
        </View>
      </View>

      <DealModal
        deal={selectedDeal}
        visible={Boolean(selectedDeal)}
        copied={copied}
        onClose={() => setSelectedDeal(null)}
        onCopy={copyCode}
      />
    </AppLayout>
  );
}
