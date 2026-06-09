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
  fetchSellerFinancialReport,
  type SellerFinancialOrder,
  type SellerFinancialReportData,
} from '@/utils/native-api';

type PeriodKey = 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'quarter' | 'year' | 'custom';
type GroupKey = 'day' | 'week' | 'month';

const periods: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
];

const groupOptions: { key: GroupKey; label: string }[] = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
];

const statusClasses: Record<string, { bg: string; text: string }> = {
  delivered: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  processing: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
  confirmed: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-300' },
  shipped: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const readableLabel = (value?: string) => (value ? value.replaceAll('_', ' ') : '-');

const compactNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return value.toLocaleString();
};

const compactMMK = (value: number) => `${compactNumber(value)} MMK`;

const csvCell = (value: string | number) => `"${String(value ?? '').replaceAll('"', '""')}"`;

function SummaryCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}) {
  return (
    <View className={`rounded-xl border-l-4 bg-white p-5 shadow-sm dark:bg-slate-800 ${color}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</Text>
          <Text className="mt-1 font-sans text-2xl font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>{value}</Text>
          <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-500">{sub}</Text>
        </View>
        <Feather name={icon} color="#cbd5e1" size={32} />
      </View>
    </View>
  );
}

function BreakdownCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  rows: { label: string; value: string; color: string }[];
}) {
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <View className="mb-4 flex-row items-center gap-2">
        <Feather name={icon} color="#22c55e" size={16} />
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</Text>
      </View>
      <View className="gap-3">
        {rows.map((row) => (
          <View key={row.label} className="flex-row items-center justify-between border-b border-gray-100 pb-2 last:border-b-0 last:pb-0 dark:border-slate-700">
            <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">{row.label}</Text>
            <Text className={`font-sans text-sm font-semibold ${row.color}`}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TrendPanel({ data }: { data: SellerFinancialReportData }) {
  const maxValue = Math.max(...data.trend.map((item) => item.gmvValue), 1);
  if (!data.trend.length) return null;

  return (
    <View className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <Text className="mb-4 font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">Revenue Trend</Text>
      <View className="h-64 justify-end gap-4">
        <View className="flex-1 flex-row items-end gap-2">
          {data.trend.map((item, index) => {
            const height = Math.max(8, Math.round((item.gmvValue / maxValue) * 180));
            return (
              <View key={`${item.period}-${index}`} className="min-w-0 flex-1 items-center justify-end gap-2">
                <View className="h-48 justify-end">
                  <View className="w-5 rounded-t bg-blue-500" style={{ height }} />
                </View>
                <Text className="font-sans text-[10px] text-gray-500 dark:text-slate-400" numberOfLines={1}>{item.period}</Text>
              </View>
            );
          })}
        </View>
        <View className="flex-row flex-wrap justify-center gap-4">
          <Text className="font-sans text-xs text-blue-500">GMV</Text>
          <Text className="font-sans text-xs text-orange-500">Commission</Text>
          <Text className="font-sans text-xs text-green-500">Platform Rev.</Text>
        </View>
      </View>
    </View>
  );
}

function OrderRow({ order }: { order: SellerFinancialOrder }) {
  const status = statusClasses[order.orderStatus] || { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-400' };

  return (
    <View className="min-h-[76px] w-full flex-row items-center border-b border-gray-100 bg-white px-4 py-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-800">
      <View className="w-36 pr-4">
        <Text className="font-mono text-xs font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {order.orderNumber}
        </Text>
        <Text className="mt-1 font-sans text-[11px] text-gray-500 dark:text-slate-500">{formatDate(order.orderDate)}</Text>
      </View>

      <View className="w-48 pr-4">
        <Text className="font-sans text-xs font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {order.buyerName || 'Buyer'}
        </Text>
        <Text className="mt-1 font-sans text-[11px] text-gray-500 dark:text-slate-500" numberOfLines={1}>
          {order.buyerEmail || '-'}
        </Text>
      </View>

      <View className="w-64 pr-4">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300" numberOfLines={1}>
          {order.itemsSummary || '-'}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <Text className="font-sans text-[11px] text-gray-500 dark:text-slate-500">
            {order.itemsCount} item{order.itemsCount === 1 ? '' : 's'}
          </Text>
          {order.couponDiscountValue > 0 ? (
            <Text className="font-sans text-[11px] font-semibold text-green-600 dark:text-green-400">
              -{compactMMK(order.couponDiscountValue)}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="w-32 pr-4">
        <Text className="font-sans text-xs font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {order.totalAmount}
        </Text>
        <Text className="mt-1 font-sans text-[11px] capitalize text-gray-500 dark:text-slate-500" numberOfLines={1}>
          {readableLabel(order.paymentMethod)}
        </Text>
      </View>

      <View className="w-32 pr-4">
        <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-400" numberOfLines={1}>
          {order.sellerPayout}
        </Text>
        <Text className="mt-1 font-sans text-[11px] capitalize text-gray-500 dark:text-slate-500" numberOfLines={1}>
          {readableLabel(order.paymentStatus)}
        </Text>
      </View>

      <View className="w-36 pr-4">
        <Text className="font-sans text-xs font-semibold text-red-600 dark:text-red-400" numberOfLines={1}>
          {order.commissionAmount}
        </Text>
        <Text className="mt-1 font-sans text-[11px] text-gray-500 dark:text-slate-500">
          {Math.round(order.commissionRate * 100)}% rate
        </Text>
      </View>

      <View className="w-36">
        <View className={`self-start rounded-full px-2.5 py-1 ${status.bg}`}>
          <Text className={`font-sans text-[11px] font-bold capitalize ${status.text}`}>{readableLabel(order.orderStatus)}</Text>
        </View>
        <Text className="mt-1 font-sans text-[11px] capitalize text-gray-500 dark:text-slate-500" numberOfLines={1}>
          Delivery {readableLabel(order.deliveryFeeStatus)}
        </Text>
      </View>
    </View>
  );
}

export function FinancialReportsNative({ storeName }: { storeName?: string }) {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [groupBy, setGroupBy] = useState<GroupKey>('day');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<SellerFinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadReport = useCallback(
    async (nextPeriod = period, nextGroupBy = groupBy) => {
      if (nextPeriod === 'custom' && (!fromDate || !toDate)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await fetchSellerFinancialReport({
          period: nextPeriod,
          groupBy: nextGroupBy,
          from: fromDate,
          to: toDate,
        });
        setData(result);
        setError('');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load report.');
      } finally {
        setLoading(false);
      }
    },
    [fromDate, groupBy, period, toDate]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadReport('month', 'day');
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadReport]);

  const orders = useMemo(() => {
    const q = search.toLowerCase();
    return (data?.orders || []).filter((order) => {
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.buyerName.toLowerCase().includes(q) ||
        order.itemsSummary.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || order.orderStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.orders, search, statusFilter]);

  const exportReport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const rows: (string | number)[][] = [
        [`PYONEA - ${(storeName || 'SELLER').toUpperCase()} FINANCIAL REPORT`],
        [`Period: ${data.summary.from} to ${data.summary.to} | Generated: ${new Date().toLocaleString()}`],
        [],
        ['Summary'],
        ['Total Orders', data.summary.totalOrders],
        ['Delivered Orders', data.summary.deliveredOrders],
        ['GMV (MMK)', data.summary.totalGmvValue],
        ['Commission (MMK)', data.summary.totalCommissionValue],
        ['Net Payout (MMK)', data.summary.totalSellerPayoutValue],
        [],
        ['Orders'],
        ['Order #', 'Buyer', 'Items', 'Total', 'Payout', 'Commission', 'Status', 'Date'],
        ...data.orders.map((order) => [
          order.orderNumber,
          order.buyerName,
          order.itemsSummary,
          order.totalAmountValue,
          order.sellerPayoutValue,
          order.commissionAmountValue,
          order.orderStatus,
          formatDate(order.orderDate),
        ]),
      ];
      const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
      await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
      setMessage('Financial report export prepared.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View className="gap-6">
      <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <View>
          <View className="flex-row items-center gap-2">
            <Feather name="bar-chart-2" color="#16a34a" size={20} />
            <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">Financial Reports</Text>
          </View>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            Your store&apos;s revenue, commissions, and order breakdown.
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => void loadReport()} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-700">
            <Feather name="refresh-cw" color="#64748b" size={16} />
          </Pressable>
          <Pressable onPress={() => void exportReport()} disabled={!data || exporting} className="flex-row items-center gap-2 rounded-xl bg-green-600 px-4 py-2 disabled:opacity-50">
            {exporting ? <ActivityIndicator color="#ffffff" /> : <Feather name="download" color="#ffffff" size={16} />}
            <Text className="font-sans text-sm font-medium text-white">{exporting ? 'Exporting...' : 'Export CSV'}</Text>
          </Pressable>
        </View>
      </View>

      <View className="gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {periods.map((item) => {
            const active = period === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setPeriod(item.key);
                  if (item.key !== 'custom') void loadReport(item.key, groupBy);
                }}
                className={`rounded-full border px-3 py-1.5 ${active ? 'border-green-600 bg-green-600' : 'border-gray-300 dark:border-slate-600'}`}
              >
                <Text className={`font-sans text-xs font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-slate-400'}`}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {period === 'custom' ? (
          <View className="gap-3 sm:flex-row sm:items-end">
            <View className="min-w-0 flex-1">
              <Text className="mb-1 font-sans text-xs font-medium text-gray-600 dark:text-slate-400">From</Text>
              <TextInput value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9ca3af" className="h-10 rounded-lg border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="mb-1 font-sans text-xs font-medium text-gray-600 dark:text-slate-400">To</Text>
              <TextInput value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9ca3af" className="h-10 rounded-lg border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
            </View>
            <Pressable onPress={() => void loadReport('custom', groupBy)} disabled={!fromDate || !toDate} className="rounded-lg bg-green-600 px-4 py-2 disabled:opacity-50">
              <Text className="font-sans text-sm font-medium text-white">Apply</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Group trend by:</Text>
          {groupOptions.map((item) => {
            const active = groupBy === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setGroupBy(item.key);
                  void loadReport(period, item.key);
                }}
                className={`rounded-full border px-3 py-1 ${active ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-slate-600'}`}
              >
                <Text className={`font-sans text-xs font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-slate-400'}`}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {message ? (
        <Pressable onPress={() => setMessage('')} className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-sm text-green-700 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      {error ? (
        <Pressable onPress={() => setError('')} className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#22c55e" />
        </View>
      ) : data ? (
        <>
          <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
            Period: <Text className="font-semibold text-gray-700 dark:text-slate-300">{data.summary.from} to {data.summary.to}</Text>
          </Text>

          <View className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard label="Total Orders" value={data.summary.totalOrders} sub={`${data.summary.deliveredOrders} delivered`} icon="shopping-bag" color="border-green-400" />
            <SummaryCard label="Gross Revenue (GMV)" value={compactMMK(data.summary.totalGmvValue)} sub={`Subtotal: ${data.summary.totalSubtotal}`} icon="dollar-sign" color="border-blue-400" />
            <SummaryCard label="Your Net Payout" value={compactMMK(data.summary.totalSellerPayoutValue)} sub={`Commission: ${data.summary.totalCommission}`} icon="credit-card" color="border-emerald-400" />
            <SummaryCard label="Platform Delivery Fees" value={compactMMK(data.summary.totalDeliveryFeesValue)} sub={`${data.summary.totalDeliveryFeesPending} pending`} icon="truck" color="border-orange-400" />
          </View>

          <View className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BreakdownCard
              title="Commission Breakdown"
              icon="bar-chart-2"
              rows={[
                { label: 'Total Commission Owed', value: data.summary.totalCommission, color: 'text-red-600 dark:text-red-400' },
                { label: 'Commission Pending', value: data.summary.totalCommissionPending, color: 'text-yellow-600 dark:text-yellow-400' },
                { label: 'Commission Confirmed', value: data.summary.totalCommissionConfirmed, color: 'text-green-600 dark:text-green-400' },
                { label: 'Your Net Payout', value: data.summary.totalSellerPayout, color: 'text-blue-600 dark:text-blue-400' },
              ]}
            />
            {data.summary.wallet ? (
              <BreakdownCard
                title="Wallet Snapshot"
                icon="credit-card"
                rows={[
                  { label: 'Available Balance', value: data.summary.wallet.availableBalance, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Escrow Balance', value: data.summary.wallet.escrowBalance, color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Total Earned', value: data.summary.wallet.totalEarned, color: 'text-gray-800 dark:text-slate-200' },
                  { label: 'Total Commission Paid', value: data.summary.wallet.totalCommissionPaid, color: 'text-red-600 dark:text-red-400' },
                  { label: 'COD Commission Outstanding', value: data.summary.wallet.codCommissionOutstanding, color: 'text-orange-600 dark:text-orange-400' },
                ]}
              />
            ) : null}
          </View>

          <TrendPanel data={data} />

          <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <View className="gap-4 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
              <View className="gap-3 lg:flex-row lg:items-center lg:justify-between">
                <View className="min-w-0 flex-1">
                  <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">Order Details</Text>
                  <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
                    {orders.length} orders shown in the selected report period.
                  </Text>
                </View>
                <View className="relative w-full lg:w-80">
                  <View className="absolute left-3 top-2.5 z-10">
                    <Feather name="search" color="#9ca3af" size={14} />
                  </View>
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search order, buyer, item..."
                    placeholderTextColor="#9ca3af"
                    className="h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-3 font-sans text-xs text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {['all', 'delivered', 'pending', 'confirmed', 'processing', 'shipped', 'cancelled'].map((status) => {
                  const active = statusFilter === status;
                  return (
                    <Pressable
                      key={status}
                      onPress={() => setStatusFilter(status)}
                      className={`rounded-lg border px-3 py-1.5 ${active ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-900'}`}
                    >
                      <Text className={`font-sans text-xs capitalize ${active ? 'text-white' : 'text-gray-600 dark:text-slate-400'}`}>
                        {status === 'all' ? 'All Status' : readableLabel(status)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {orders.length === 0 ? (
              <View className="items-center py-12">
                <Feather name="shopping-bag" color="#94a3b8" size={40} />
                <Text className="mt-2 font-sans text-sm text-gray-400 dark:text-slate-500">No orders found for this period.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
                <View className="w-full min-w-[1184px]">
                  <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                    {[
                      { label: 'Order', width: 'w-36' },
                      { label: 'Buyer', width: 'w-48' },
                      { label: 'Items', width: 'w-64' },
                      { label: 'Total', width: 'w-32' },
                      { label: 'Payout', width: 'w-32' },
                      { label: 'Commission', width: 'w-36' },
                      { label: 'Status', width: 'w-36' },
                    ].map((heading) => (
                      <Text
                        key={heading.label}
                        className={`${heading.width} pr-4 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400`}
                      >
                        {heading.label}
                      </Text>
                    ))}
                  </View>
                  {orders.map((order) => (
                    <OrderRow key={String(order.orderId)} order={order} />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <View className="items-end">
            <Pressable onPress={() => void exportReport()} disabled={!data || exporting} className="flex-row items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 disabled:opacity-50">
              {exporting ? <ActivityIndicator color="#ffffff" /> : <Feather name="download" color="#ffffff" size={16} />}
              <Text className="font-sans text-sm font-semibold text-white">{exporting ? 'Generating CSV...' : 'Download Full Report (.csv)'}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}
