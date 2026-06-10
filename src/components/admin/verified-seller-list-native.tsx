import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  BADGE_CFG,
  NRC_STATUS_CFG,
  VERIFICATION_LEVEL_CFG,
  formatAdminDateTime,
} from '@/components/admin/admin-seller-shared';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import {
  fetchAdminVerifiedSellers,
  fetchAdminVerifiedSellersExportCsv,
  type AdminVerifiedSeller,
  type AdminVerifiedSellerSummary,
} from '@/utils/native-api';

function ChipBadge({
  value,
  config,
}: {
  value: string;
  config: Record<string, { label: string; wrap: string; text: string }>;
}) {
  const meta = config[value] || {
    label: value || '—',
    wrap: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-500 dark:text-slate-400',
  };
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${meta.wrap}`}>
      <Text className={`font-sans text-xs font-semibold ${meta.text}`}>{meta.label}</Text>
    </View>
  );
}

function FilterPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="min-w-[140px] flex-1 gap-1">
      <Text className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50">
        <Text className="font-sans text-sm text-gray-800 dark:text-slate-100">{selected?.label || label}</Text>
        <Feather name="chevron-down" size={14} color={isDark ? '#cbd5e1' : '#6b7280'} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[420px] md:rounded-2xl">
            <Text className="mb-4 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{label}</Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value || 'all'}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-2 rounded-xl border px-4 py-3 ${
                    value === option.value
                      ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}>
                  <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function VerifiedSellerListNative() {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const [sellers, setSellers] = useState<AdminVerifiedSeller[]>([]);
  const [summary, setSummary] = useState<AdminVerifiedSellerSummary>({
    total: 0,
    basic: 0,
    verified: 0,
    premium: 0,
    nrcVerified: 0,
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [badgeFilter, setBadgeFilter] = useState('');
  const [nrcFilter, setNrcFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'verified_at' | 'store_name' | 'contact_email' | 'verification_level'>(
    'verified_at',
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(
    () => ({
      page: currentPage,
      perPage: 20,
      search: debouncedSearch,
      verificationLevel: levelFilter,
      badgeType: badgeFilter,
      nrcStatus: nrcFilter,
      sortBy,
      sortDir,
    }),
    [badgeFilter, currentPage, debouncedSearch, levelFilter, nrcFilter, sortBy, sortDir],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAdminVerifiedSellers(filters);
      setSellers(result.sellers);
      setSummary(result.summary);
      setTotal(result.pagination.total);
      setLastPage(result.pagination.lastPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.verifiedSellers.errors.load', 'Failed to load verified sellers.'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActiveFilters = Boolean(debouncedSearch || levelFilter || badgeFilter || nrcFilter);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setLevelFilter('');
    setBadgeFilter('');
    setNrcFilter('');
    setCurrentPage(1);
  };

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await fetchAdminVerifiedSellersExportCsv({
        search: debouncedSearch,
        verificationLevel: levelFilter,
        badgeType: badgeFilter,
        nrcStatus: nrcFilter,
        sortBy,
        sortDir,
      });
      await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.verifiedSellers.errors.export', 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
            {t('admin.verifiedSellers.title', 'Verified seller directory')}
          </Text>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('admin.verifiedSellers.subtitle', '{{count}} verified sellers', { count: total })}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => void load()} className="rounded-lg border border-gray-200 p-2 dark:border-slate-700">
            <Feather name="refresh-cw" size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
          </Pressable>
          <Pressable
            disabled={exporting || loading}
            onPress={() => void exportCsv()}
            className="flex-row items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 disabled:opacity-50">
            {exporting ? <ActivityIndicator color="#ffffff" size="small" /> : <Feather name="download" size={16} color="#ffffff" />}
            <Text className="font-sans text-sm font-semibold text-white">
              {exporting ? t('admin.verifiedSellers.exporting', 'Exporting…') : t('admin.verifiedSellers.export', 'Export CSV')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {[
          { label: t('admin.verifiedSellers.summary.total', 'Total Verified'), value: summary.total, color: 'text-green-600' },
          { label: t('admin.verifiedSellers.summary.basic', 'Basic'), value: summary.basic, color: 'text-sky-600' },
          { label: t('admin.verifiedSellers.summary.verified', 'Verified Level'), value: summary.verified, color: 'text-indigo-600' },
          { label: t('admin.verifiedSellers.summary.premium', 'Premium'), value: summary.premium, color: 'text-purple-600' },
          { label: t('admin.verifiedSellers.summary.nrc', 'NRC Verified'), value: summary.nrcVerified, color: 'text-amber-600' },
        ].map((item) => (
          <View key={item.label} className="min-w-[46%] flex-1 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 lg:min-w-[18%]">
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{item.label}</Text>
            <Text className={`mt-1 font-sans text-2xl font-bold ${item.color}`}>{item.value.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      <View className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <View className="gap-3">
          <View className="relative">
            <Feather name="search" size={16} color="#9ca3af" style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('admin.verifiedSellers.search', 'Search store name, email, owner, NRC…')}
              placeholderTextColor="#9ca3af"
              className="h-12 rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100"
            />
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Pressable
              onPress={() => setShowFilters((current) => !current)}
              className={`flex-row items-center gap-2 rounded-xl border px-4 py-2.5 ${
                showFilters || hasActiveFilters
                  ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-slate-600'
              }`}>
              <Feather name="filter" size={16} color={hasActiveFilters ? '#16a34a' : '#64748b'} />
              <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('admin.verifiedSellers.filters', 'Filters')}
              </Text>
            </Pressable>
            {hasActiveFilters ? (
              <Pressable onPress={clearFilters} className="rounded-xl border border-red-200 px-3 py-2.5 dark:border-red-800">
                <Text className="font-sans text-sm text-red-500">{t('admin.verifiedSellers.clearFilters', 'Clear')}</Text>
              </Pressable>
            ) : null}
          </View>
          {showFilters ? (
            <View className="flex-row flex-wrap gap-3 border-t border-gray-100 pt-3 dark:border-slate-700">
              <FilterPicker
                label={t('admin.verifiedSellers.levelFilter', 'Verification Level')}
                value={levelFilter}
                onChange={(value) => {
                  setLevelFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: t('admin.verifiedSellers.allLevels', 'All Levels') },
                  { value: 'basic', label: 'Basic' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'premium', label: 'Premium' },
                ]}
              />
              <FilterPicker
                label={t('admin.verifiedSellers.badgeFilter', 'Badge Type')}
                value={badgeFilter}
                onChange={(value) => {
                  setBadgeFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: t('admin.verifiedSellers.allBadges', 'All Badges') },
                  { value: 'verified', label: 'Verified' },
                  { value: 'premium', label: 'Premium' },
                  { value: 'featured', label: 'Featured' },
                  { value: 'top_rated', label: 'Top Rated' },
                ]}
              />
              <FilterPicker
                label={t('admin.verifiedSellers.nrcFilter', 'NRC Status')}
                value={nrcFilter}
                onChange={(value) => {
                  setNrcFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: t('admin.verifiedSellers.allNrc', 'All NRC') },
                  { value: 'verified', label: 'Verified' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'mismatch', label: 'Mismatch' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'unverified', label: 'Unverified' },
                ]}
              />
            </View>
          ) : null}
        </View>
      </View>

      <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {error ? (
          <View className="items-center px-6 py-12">
            <Text className="font-sans text-sm font-semibold text-red-500">{error}</Text>
            <Pressable onPress={() => void load()} className="mt-4 rounded-lg bg-red-50 px-4 py-2 dark:bg-red-900/20">
              <Text className="font-sans text-sm text-red-600 dark:text-red-400">{t('admin.verifiedSellers.retry', 'Retry')}</Text>
            </Pressable>
          </View>
        ) : loading && sellers.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#16a34a" size="large" />
          </View>
        ) : sellers.length === 0 ? (
          <View className="items-center px-6 py-12">
            <Feather name="shield" size={36} color="#94a3b8" />
            <Text className="mt-3 font-sans text-sm text-gray-400 dark:text-slate-500">
              {t('admin.verifiedSellers.empty', 'No verified sellers found')}
            </Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View className="min-w-full">
                <View className="min-w-[1180px] flex-row border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  {[
                    { label: '#', sort: null },
                    { label: t('admin.verifiedSellers.columns.store', 'Store'), sort: 'store_name' as const },
                    { label: t('admin.verifiedSellers.columns.owner', 'Owner'), sort: null },
                    { label: t('admin.verifiedSellers.columns.contact', 'Contact'), sort: 'contact_email' as const },
                    { label: t('admin.verifiedSellers.columns.level', 'Level'), sort: 'verification_level' as const },
                    { label: t('admin.verifiedSellers.columns.badge', 'Badge'), sort: null },
                    { label: t('admin.verifiedSellers.columns.nrc', 'NRC'), sort: null },
                    { label: t('admin.verifiedSellers.columns.verifiedAt', 'Verified At'), sort: 'verified_at' as const },
                    { label: t('admin.verifiedSellers.columns.verifiedBy', 'Verified By'), sort: null },
                  ].map((heading) => (
                    <Pressable
                      key={heading.label}
                      disabled={!heading.sort}
                      onPress={() => heading.sort && toggleSort(heading.sort)}
                      className="w-36 pr-4">
                      <View className="flex-row items-center gap-1">
                        <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                          {heading.label}
                        </Text>
                        {heading.sort && sortBy === heading.sort ? (
                          <Feather name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color="#6366f1" />
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </View>

                {sellers.map((seller, index) => (
                  <View key={seller.id} className="min-w-[1180px] flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-slate-700">
                    <Text className="w-36 pr-4 font-sans text-xs text-gray-400">{(currentPage - 1) * 20 + index + 1}</Text>
                    <View className="w-36 flex-row items-center gap-2 pr-4">
                      {seller.storeLogoUrl ? (
                        <Image source={{ uri: seller.storeLogoUrl }} className="h-8 w-8 rounded-lg" contentFit="cover" />
                      ) : (
                        <View className="h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                          <Feather name="shopping-bag" size={14} color="#16a34a" />
                        </View>
                      )}
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
                          {seller.storeName}
                        </Text>
                        <Text className="font-sans text-xs text-gray-400">{seller.storeId || seller.storeSlug}</Text>
                      </View>
                    </View>
                    <Text className="w-36 pr-4 font-sans text-sm text-gray-700 dark:text-slate-300" numberOfLines={1}>
                      {seller.ownerName}
                    </Text>
                    <View className="w-36 pr-4">
                      <Text className="font-sans text-xs text-gray-700 dark:text-slate-300" numberOfLines={1}>
                        {seller.contactEmail}
                      </Text>
                      <Text className="font-sans text-xs text-gray-400" numberOfLines={1}>
                        {seller.contactPhone}
                      </Text>
                    </View>
                    <View className="w-36 pr-4">
                      <ChipBadge value={seller.verificationLevel} config={VERIFICATION_LEVEL_CFG} />
                    </View>
                    <View className="w-36 pr-4">
                      <ChipBadge value={seller.badgeType} config={BADGE_CFG} />
                    </View>
                    <View className="w-36 pr-4">
                      <ChipBadge value={seller.nrcVerificationStatus} config={NRC_STATUS_CFG} />
                    </View>
                    <Text className="w-36 pr-4 font-sans text-xs text-gray-500 dark:text-slate-400">
                      {formatAdminDateTime(seller.verifiedAt)}
                    </Text>
                    <Text className="w-36 pr-4 font-sans text-xs text-gray-600 dark:text-slate-400" numberOfLines={1}>
                      {seller.verifiedBy || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {lastPage > 1 ? (
              <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-4 dark:border-slate-700">
                <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                  {t('admin.verifiedSellers.pagination.page', 'Page {{current}} of {{last}}', {
                    current: currentPage,
                    last: lastPage,
                  })}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    disabled={currentPage <= 1 || loading}
                    onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                    <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                      {t('admin.verifiedSellers.pagination.previous', 'Previous')}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={currentPage >= lastPage || loading}
                    onPress={() => setCurrentPage((page) => page + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                    <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                      {t('admin.verifiedSellers.pagination.next', 'Next')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
