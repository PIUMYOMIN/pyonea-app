import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  fetchSellerCustomers,
  type SellerCustomer,
  type SellerCustomerStats,

  formatApiErrorMessage,
} from '@/utils/native-api';

type SortKey = 'last_order' | 'orders' | 'spent';

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'last_order', label: 'Recent Order' },
  { key: 'orders', label: 'Most Orders' },
  { key: 'spent', label: 'Highest Spend' },
];

const avatarColors = [
  { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' },
  { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300' },
];

const compactNumber = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return value.toLocaleString();
};

const compactMMK = (value: number) => `${compactNumber(value)} MMK`;

const formatCustomerDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getInitials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const getAvatarColor = (name: string) => avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

const csvCell = (value: string | number) => {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
};

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <View className="min-w-0 flex-1 flex-row items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <View className={`h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Feather name={icon} color="#ffffff" size={20} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-xs font-medium text-gray-500 dark:text-slate-400">{label}</Text>
        <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {value}
        </Text>
        <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500" numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

function LoadingRows() {
  return (
    <View className="divide-y divide-gray-50 dark:divide-slate-700">
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={`customer-skeleton-${index}`} className="flex-row items-center gap-4 px-5 py-4">
          <View className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700" />
          <View className="min-w-0 flex-1 gap-2">
            <View className="h-3.5 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
            <View className="h-3 w-1/4 rounded bg-gray-100 dark:bg-slate-700/60" />
          </View>
          <View className="hidden gap-6 md:flex-row">
            {Array.from({ length: 4 }).map((__, itemIndex) => (
              <View key={`customer-skeleton-cell-${itemIndex}`} className="h-3 w-16 rounded bg-gray-100 dark:bg-slate-700/60" />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function CustomerRow({ customer }: { customer: SellerCustomer }) {
  const avatarColor = getAvatarColor(customer.name);

  return (
    <View className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-gray-50/60 dark:hover:bg-slate-700/40 md:grid-cols-12 md:gap-4">
      <View className="col-span-4 min-w-0 flex-row items-center gap-3">
        <View className={`h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${avatarColor.bg}`}>
          <Text className={`font-sans text-sm font-semibold ${avatarColor.text}`}>{getInitials(customer.name)}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {customer.name}
          </Text>
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500" numberOfLines={1}>
            {customer.email || 'No email'}
          </Text>
          {customer.phone ? (
            <Text className="font-sans text-xs text-gray-400 dark:text-slate-500" numberOfLines={1}>
              {customer.phone}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-1 pl-14 md:hidden">
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
          <Text className="font-semibold text-gray-900 dark:text-slate-100">{customer.totalOrders}</Text> orders
        </Text>
        <Text className="font-sans text-xs font-semibold text-gray-900 dark:text-slate-100">
          {compactMMK(customer.totalSpentValue)}
        </Text>
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
          Last: {formatCustomerDate(customer.lastOrderAt)}
        </Text>
      </View>

      <View className="hidden col-span-2 items-center justify-end md:flex">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
          {customer.totalOrders}
          {customer.deliveredCount > 0 ? (
            <Text className="font-sans text-xs font-normal text-green-600 dark:text-green-400">
              {' '}
              ({customer.deliveredCount} done)
            </Text>
          ) : null}
        </Text>
      </View>
      <View className="hidden col-span-2 items-center justify-end md:flex">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">{compactMMK(customer.totalSpentValue)}</Text>
      </View>
      <View className="hidden col-span-2 items-center justify-end md:flex">
        <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">{compactMMK(customer.avgOrderValueValue)}</Text>
      </View>
      <View className="hidden col-span-2 items-center justify-end md:flex">
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{formatCustomerDate(customer.lastOrderAt)}</Text>
      </View>
    </View>
  );
}

function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number;
  lastPage: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const result: (number | 'gap')[] = [];
    for (let index = 1; index <= lastPage; index += 1) {
      const nearCurrent = Math.abs(index - page) <= 2;
      if (lastPage <= 7 || index === 1 || index === lastPage || nearCurrent) {
        result.push(index);
      } else if (result[result.length - 1] !== 'gap') {
        result.push('gap');
      }
    }
    return result;
  }, [lastPage, page]);

  if (lastPage <= 1) return null;

  return (
    <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
        {(page - 1) * 15 + 1}-{Math.min(page * 15, total)} of {total} customers
      </Text>
      <View className="flex-row flex-wrap items-center gap-1">
        <Pressable
          onPress={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 dark:border-slate-600"
        >
          <Feather name="chevron-left" color="#64748b" size={16} />
        </Pressable>
        {pages.map((item, index) =>
          item === 'gap' ? (
            <Text key={`gap-${index}`} className="px-1 font-sans text-gray-400 dark:text-slate-500">
              ...
            </Text>
          ) : (
            <Pressable
              key={item}
              onPress={() => onPage(item)}
              className={`h-8 w-8 items-center justify-center rounded-lg ${
                item === page
                  ? 'bg-green-600'
                  : 'border border-gray-200 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700'
              }`}
            >
              <Text className={`font-sans text-xs font-medium ${item === page ? 'text-white' : 'text-gray-600 dark:text-slate-400'}`}>
                {item}
              </Text>
            </Pressable>
          )
        )}
        <Pressable
          onPress={() => onPage(page + 1)}
          disabled={page >= lastPage}
          className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 dark:border-slate-600"
        >
          <Feather name="chevron-right" color="#64748b" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

export function CustomersNative() {
  const [customers, setCustomers] = useState<SellerCustomer[]>([]);
  const [stats, setStats] = useState<SellerCustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('last_order');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  const loadCustomers = useCallback(
    async (nextPage = page) => {
      try {
        const result = await fetchSellerCustomers({
          page: nextPage,
          perPage: 15,
          search: debouncedSearch,
          sort,
        });
        setCustomers(result.customers);
        setStats(result.stats);
        setPage(result.currentPage);
        setLastPage(result.lastPage);
        setTotal(result.total);
        setError('');
      } catch (requestError) {
        setError(formatApiErrorMessage(requestError, 'Failed to load customers.'));
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, page, sort]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadCustomers(page);
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadCustomers, page]);

  const updateSort = (nextSort: SortKey) => {
    setSort(nextSort);
    setPage(1);
  };

  const exportCustomers = async () => {
    setExporting(true);
    setMessage('');
    try {
      const result = await fetchSellerCustomers({
        page: 1,
        perPage: Math.max(total, 100),
        search: debouncedSearch,
        sort,
      });
      const rows = [
        ['Name', 'Email', 'Phone', 'Total Orders', 'Total Spent (MMK)', 'Avg Order (MMK)', 'Delivered Orders', 'First Order', 'Last Order'],
        ...result.customers.map((customer) => [
          customer.name,
          customer.email,
          customer.phone,
          customer.totalOrders,
          customer.totalSpentValue,
          customer.avgOrderValueValue,
          customer.deliveredCount,
          formatCustomerDate(customer.firstOrderAt),
          formatCustomerDate(customer.lastOrderAt),
        ]),
      ];
      const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
      await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
      setMessage('Customer export prepared.');
    } catch (exportError) {
      setError(formatApiErrorMessage(exportError, 'Customer export failed.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View className="gap-5">
      <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <View>
          <View className="flex-row items-center gap-2">
            <Feather name="users" color="#16a34a" size={20} />
            <Text className="font-sans text-xl font-semibold text-gray-900 dark:text-slate-100">My Customers</Text>
          </View>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            Buyers who have ordered from your store
          </Text>
        </View>
        <Pressable
          onPress={exportCustomers}
          disabled={exporting || loading}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 disabled:opacity-50"
        >
          {exporting ? <ActivityIndicator color="#ffffff" /> : <Feather name="download" color="#ffffff" size={16} />}
          <Text className="font-sans text-sm font-medium text-white">{exporting ? 'Exporting...' : 'Export Excel'}</Text>
        </Pressable>
      </View>

      {stats ? (
        <View className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="users" label="Total Customers" value={stats.totalCustomers.toLocaleString()} sub={`${stats.active30d} active (30d)`} color="bg-green-500" />
          <StatCard icon="shopping-bag" label="Total Orders" value={stats.totalOrders.toLocaleString()} sub="across all customers" color="bg-blue-500" />
          <StatCard icon="dollar-sign" label="Total Revenue" value={compactMMK(stats.totalRevenueValue)} sub="from your store" color="bg-purple-500" />
          <StatCard icon="trending-up" label="Avg Order Value" value={compactMMK(stats.avgOrderValueValue)} sub="per transaction" color="bg-amber-500" />
        </View>
      ) : null}

      <View className="gap-3 sm:flex-row">
        <View className="min-w-0 flex-1">
          <View className="relative">
            <View className="absolute left-3 top-3.5 z-10">
              <Feather name="search" color="#9ca3af" size={16} />
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, email or phone..."
              placeholderTextColor="#9ca3af"
              className="h-11 rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {sortOptions.map((option) => {
            const active = sort === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => updateSort(option.key)}
                className={`h-11 flex-row items-center gap-2 rounded-xl border px-3 ${
                  active
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                <Feather name="chevrons-down" color={active ? '#16a34a' : '#94a3b8'} size={14} />
                <Text className={`font-sans text-sm font-medium ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-300'}`}>
                  Sort: {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {message ? (
        <Pressable onPress={() => setMessage('')} className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" color="#16a34a" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-700 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      {error ? (
        <Pressable onPress={() => setError('')} className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" color="#dc2626" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
        </Pressable>
      ) : null}

      <View className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <View className="hidden grid-cols-12 gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-slate-600 dark:bg-slate-700 md:grid">
          <Text className="col-span-4 font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-300">Customer</Text>
          <Text className="col-span-2 text-right font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-300">Orders</Text>
          <Text className="col-span-2 text-right font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-300">Total Spent</Text>
          <Text className="col-span-2 text-right font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-300">Avg Order</Text>
          <Text className="col-span-2 text-right font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-300">Last Order</Text>
        </View>

        {loading ? (
          <LoadingRows />
        ) : customers.length === 0 ? (
          <View className="items-center py-16">
            <Feather name="users" color="#94a3b8" size={48} />
            <Text className="mt-3 font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
              {debouncedSearch ? 'No customers match your search.' : 'No customers yet.'}
            </Text>
            {!debouncedSearch ? (
              <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
                Customers will appear here once they place an order.
              </Text>
            ) : null}
          </View>
        ) : (
          <View className="divide-y divide-gray-50 dark:divide-slate-700">
            {customers.map((customer) => (
              <CustomerRow key={String(customer.id)} customer={customer} />
            ))}
          </View>
        )}
      </View>

      <Pagination page={page} lastPage={lastPage} total={total} onPage={setPage} />
    </View>
  );
}
