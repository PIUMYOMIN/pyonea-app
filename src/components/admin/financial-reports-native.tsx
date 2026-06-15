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

import { useTheme } from '@/context/theme';
import {
  fetchAdminFinancialReport,
  type AdminFinancialOrder,
  type AdminFinancialReportData,

  formatApiErrorMessage,
} from '@/utils/native-api';

type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'last_week'
  | 'month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'custom';
type GroupKey = 'day' | 'week' | 'month';

const PERIODS: { key: PeriodKey; label: string }[] = [
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

const GROUP_BY: { key: GroupKey; label: string }[] = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
];

const ORDER_STATUSES = [
  'all',
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtK = (value: number) => {
  const amount = Number(value) || 0;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return amount.toLocaleString();
};

const fmtMMK = (value: number) => `${fmtK(value)} MMK`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const csvCell = (value: string | number) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const readableLabel = (value?: string) => (value ? value.replaceAll('_', ' ') : '—');

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: 'emerald' | 'teal' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';
}) {
  const accents: Record<string, string> = {
    emerald: 'border-l-4 border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    teal: 'border-l-4 border-teal-400 bg-teal-50 dark:bg-teal-900/20',
    blue: 'border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    amber: 'border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20',
    purple: 'border-l-4 border-purple-400 bg-purple-50 dark:bg-purple-900/20',
    red: 'border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20',
    gray: 'border-l-4 border-gray-300 bg-gray-50 dark:border-slate-600 dark:bg-slate-700/50',
  };

  return (
    <View className={`rounded-xl p-4 shadow-sm ${accents[accent]}`}>
      <Text className="font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </Text>
      <Text className="mt-1 font-sans text-xl font-bold text-gray-900 dark:text-slate-100" numberOfLines={2}>
        {value}
      </Text>
      {sub ? (
        <Text className="mt-0.5 font-sans text-[11px] text-gray-400 dark:text-slate-500">{sub}</Text>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    delivered: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400' },
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400' },
    confirmed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400' },
    processing: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-800 dark:text-indigo-400' },
    shipped: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-400' },
    cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    refunded: { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-300' },
  };
  const style = cfg[status] || { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-300' };

  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${style.bg}`}>
      <Text className={`font-sans text-[10px] font-semibold capitalize ${style.text}`}>{status}</Text>
    </View>
  );
}

function CommissionStatusBadge({ status }: { status: string }) {
  const cfg =
    status === 'collected'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : status === 'waived'
        ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
        : status === 'due'
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';

  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${cfg}`}>
      <Text className="font-sans text-[10px] font-semibold">{status}</Text>
    </View>
  );
}

function FeeStatusBadge({ status }: { status: string }) {
  const cfg =
    status === 'collected'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : status === 'outstanding'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400';

  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${cfg}`}>
      <Text className="font-sans text-[10px] font-semibold">{status}</Text>
    </View>
  );
}

function TrendPanel({ data, groupLabel }: { data: AdminFinancialReportData; groupLabel: string }) {
  if (!data.trend.length) return null;

  const maxValue = Math.max(
    ...data.trend.map((item) => Math.max(item.gmvValue, item.commissionValue + item.deliveryFeeValue)),
    1,
  );

  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <Text className="mb-4 font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
        Revenue Trend ({groupLabel})
      </Text>
      <View className="h-72 justify-end gap-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="min-w-full gap-2 px-1">
          <View className="min-w-full flex-row items-end gap-2">
            {data.trend.map((item, index) => {
              const gmvHeight = Math.max(8, Math.round((item.gmvValue / maxValue) * 180));
              const commissionHeight = Math.max(
                4,
                Math.round((item.commissionValue / maxValue) * 180),
              );
              const deliveryHeight = Math.max(
                4,
                Math.round((item.deliveryFeeValue / maxValue) * 180),
              );

              return (
                <View key={`${item.period}-${index}`} className="min-w-[52px] flex-1 items-center justify-end gap-2">
                  <View className="h-48 w-full flex-row items-end justify-center gap-1">
                    <View className="w-3 rounded-t bg-slate-200 dark:bg-slate-600" style={{ height: gmvHeight }} />
                    <View className="w-3 rounded-t bg-emerald-500" style={{ height: commissionHeight }} />
                    <View className="w-3 rounded-t bg-blue-500" style={{ height: deliveryHeight }} />
                  </View>
                  <Text
                    className="font-sans text-[10px] text-gray-500 dark:text-slate-400"
                    numberOfLines={1}>
                    {item.period}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View className="flex-row flex-wrap justify-center gap-4">
          <Text className="font-sans text-xs text-slate-400">GMV</Text>
          <Text className="font-sans text-xs text-emerald-500">Commission</Text>
          <Text className="font-sans text-xs text-blue-500">Delivery Fees</Text>
        </View>
      </View>
    </View>
  );
}

function FilterSelect({
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
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="min-w-[140px] flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300" numberOfLines={1}>
          {selected?.label || label}
        </Text>
        <Feather name="chevron-down" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/45 px-4" onPress={() => setOpen(false)}>
          <Pressable className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-white dark:bg-slate-800">
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`border-b border-gray-100 px-4 py-3 dark:border-slate-700 ${
                  option.value === value ? 'bg-green-50 dark:bg-green-900/20' : ''
                }`}>
                <Text
                  className={`font-sans text-sm ${
                    option.value === value
                      ? 'font-semibold text-green-700 dark:text-green-300'
                      : 'text-gray-700 dark:text-slate-300'
                  }`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function OrderTableRow({
  order,
  expanded,
  onToggle,
}: {
  order: AdminFinancialOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="border-b border-gray-50 dark:border-slate-700">
      <View className="min-w-[1280px] flex-row items-start px-3 py-3">
        <View className="w-28 pr-3">
          <Text className="font-mono text-xs font-semibold text-gray-900 dark:text-slate-100">
            {order.orderNumber}
          </Text>
        </View>
        <View className="w-24 pr-3">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
            {order.orderDate?.slice(0, 10) || '—'}
          </Text>
        </View>
        <View className="w-36 pr-3">
          <Text className="font-sans text-xs font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {order.buyerName}
          </Text>
          <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500" numberOfLines={1}>
            {order.buyerEmail || '—'}
          </Text>
        </View>
        <View className="w-32 pr-3">
          <Text className="font-sans text-xs font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {order.sellerName}
          </Text>
        </View>
        <View className="w-40 pr-3">
          <Text className="font-sans text-xs text-gray-600 dark:text-slate-300" numberOfLines={1}>
            {order.itemsSummary}
          </Text>
          <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500">
            {order.itemsCount} item{order.itemsCount === 1 ? '' : 's'}
          </Text>
        </View>
        <View className="w-24 pr-3">
          <Text className="text-right font-sans text-xs font-medium text-gray-900 dark:text-slate-100">
            {order.subtotal}
          </Text>
        </View>
        <View className="w-24 pr-3">
          <Text className="text-right font-sans text-xs text-gray-500 dark:text-slate-400">
            {order.shippingFee}
          </Text>
        </View>
        <View className="w-24 pr-3">
          <Text className="text-right font-sans text-xs text-gray-500 dark:text-slate-400">
            {order.taxAmount}
          </Text>
        </View>
        <View className="w-28 pr-3">
          <Text className="text-right font-sans text-xs font-medium text-teal-700 dark:text-teal-400">
            {order.commissionAmount}
          </Text>
          <Text className="text-right font-sans text-[10px] text-gray-400 dark:text-slate-500">
            {(order.commissionRate * 100).toFixed(1)}%
          </Text>
        </View>
        <View className="w-24 pr-3">
          <Text className="text-right font-sans text-xs font-bold text-gray-900 dark:text-slate-100">
            {order.totalAmount}
          </Text>
        </View>
        <View className="w-28 pr-3">
          <CommissionStatusBadge status={order.commissionStatus} />
        </View>
        <View className="w-24 pr-3">
          <Text className="text-right font-sans text-xs text-blue-700 dark:text-blue-400">
            {order.deliveryFeeValue > 0 ? order.deliveryFee : '—'}
          </Text>
        </View>
        <View className="w-28 pr-3">
          {order.deliveryFeeValue > 0 ? (
            <FeeStatusBadge status={order.deliveryFeeStatus} />
          ) : (
            <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">—</Text>
          )}
        </View>
        <View className="w-28 pr-3">
          <StatusBadge status={order.orderStatus} />
        </View>
        <View className="w-16">
          <Pressable onPress={onToggle}>
            <Text className="font-sans text-[10px] font-medium text-green-600 dark:text-green-400">
              {expanded ? '▲ Hide' : '▼ Items'}
            </Text>
          </Pressable>
        </View>
      </View>

      {expanded ? (
        <View className="bg-green-50 px-6 py-3 dark:bg-green-900/10">
          <Text className="mb-2 font-sans text-xs font-semibold text-gray-600 dark:text-slate-300">
            Product Items
          </Text>
          {order.items.length > 0 ? (
            <View className="gap-1">
              {order.items.map((item) => (
                <View
                  key={String(item.id)}
                  className="flex-row items-center justify-between border-t border-green-100 py-1 dark:border-green-900/30">
                  <Text className="min-w-0 flex-1 font-sans text-xs text-gray-700 dark:text-slate-300">
                    {item.name}
                  </Text>
                  <Text className="w-12 text-right font-sans text-xs text-gray-600 dark:text-slate-400">
                    {item.qty}
                  </Text>
                  <Text className="w-24 text-right font-sans text-xs text-gray-600 dark:text-slate-400">
                    {item.price}
                  </Text>
                  <Text className="w-24 text-right font-sans text-xs font-medium text-gray-900 dark:text-slate-100">
                    {item.subtotal}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">No line items returned.</Text>
          )}
          <View className="mt-2 flex-row flex-wrap gap-4">
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              Payment:{' '}
              <Text className="font-semibold text-gray-700 dark:text-slate-300">
                {readableLabel(order.paymentMethod)}
              </Text>
            </Text>
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              Escrow:{' '}
              <Text className="font-semibold text-gray-700 dark:text-slate-300">
                {readableLabel(order.escrowStatus)}
              </Text>
            </Text>
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              Delivered:{' '}
              <Text className="font-semibold text-gray-700 dark:text-slate-300">
                {order.deliveredAt?.slice(0, 10) || '—'}
              </Text>
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function AdminFinancialReportsNative() {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [groupBy, setGroupBy] = useState<GroupKey>('day');
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [data, setData] = useState<AdminFinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | number | null>(null);

  const loadReport = useCallback(
    async (nextPeriod = period, nextGroupBy = groupBy) => {
      if (nextPeriod === 'custom' && (!fromDate || !toDate)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const result = await fetchAdminFinancialReport({
          period: nextPeriod,
          groupBy: nextGroupBy,
          from: fromDate,
          to: toDate,
        });
        setData(result);
      } catch (requestError) {
        setError(formatApiErrorMessage(requestError, 'Failed to load report.'));
      } finally {
        setLoading(false);
      }
    },
    [fromDate, groupBy, period, toDate],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadReport('month', 'day');
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadReport]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return (data?.orders || [])
      .filter((order) => {
        const matchSearch =
          !q ||
          order.orderNumber.toLowerCase().includes(q) ||
          order.buyerName.toLowerCase().includes(q) ||
          order.sellerName.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || order.orderStatus === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.orderDate || 0).getTime() || 0;
        const dateB = new Date(b.orderDate || 0).getTime() || 0;
        if (dateA !== dateB) return dateB - dateA;
        return Number(b.orderId || 0) - Number(a.orderId || 0);
      });
  }, [data?.orders, search, statusFilter]);

  const exportReport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const summary = data.summary;
      const rows: (string | number)[][] = [
        ['PYONEA FINANCIAL REPORT'],
        [`Period: ${summary.from} to ${summary.to} | Generated: ${new Date().toLocaleString()}`],
        [],
        ['ORDERS'],
        ['Total Orders', summary.totalOrders],
        ['Delivered Orders', summary.deliveredOrders],
        ['Pending Orders', summary.pendingOrders],
        ['Cancelled Orders', summary.cancelledOrders],
        [],
        ['GMV (GROSS MERCHANDISE VALUE)'],
        ['Total GMV (MMK)', summary.totalGmvValue],
        ['Total Subtotal (MMK)', summary.totalSubtotalValue],
        ['Total Shipping (MMK)', summary.totalShippingValue],
        ['Total Tax (MMK)', summary.totalTaxValue],
        ['Total Coupon Discounts (MMK)', summary.totalCouponDiscountValue],
        [],
        ['COMMISSION'],
        ['Total Commission (MMK)', summary.totalCommissionValue],
        ['Commission Confirmed (MMK)', summary.totalCommissionConfirmedValue],
        ['Commission Pending (MMK)', summary.totalCommissionPendingValue],
        ['Total Seller Payout (MMK)', summary.totalSellerPayoutValue],
        [],
        ['DELIVERY FEES (PLATFORM)'],
        ['Total Delivery Fees (MMK)', summary.totalDeliveryFeesValue],
        ['Delivery Fees Confirmed (MMK)', summary.totalDeliveryFeesConfirmedValue],
        ['Delivery Fees Pending (MMK)', summary.totalDeliveryFeesPendingValue],
        [],
        ['PLATFORM REVENUE'],
        ['Total Platform Revenue (MMK)', summary.platformRevenueValue],
        ['Platform Revenue Pending (MMK)', summary.platformRevenuePendingValue],
        [],
        ['ORDERS DETAIL'],
        [
          'Order #',
          'Order Date',
          'Buyer',
          'Seller',
          'Subtotal',
          'Shipping',
          'Tax',
          'Commission',
          'Total',
          'Commission Status',
          'Delivery Fee',
          'Delivery Status',
          'Order Status',
        ],
        ...data.orders.map((order) => [
          order.orderNumber,
          formatDate(order.orderDate),
          order.buyerName,
          order.sellerName,
          order.subtotalValue,
          order.shippingFeeValue,
          order.taxAmountValue,
          order.commissionAmountValue,
          order.totalAmountValue,
          order.commissionStatus,
          order.deliveryFeeValue,
          order.deliveryFeeStatus,
          order.orderStatus,
        ]),
        [],
        ['TREND'],
        ['Period', 'Orders', 'GMV', 'Tax', 'Commission', 'Delivery Fees', 'Platform Revenue'],
        ...data.trend.map((item) => [
          item.period,
          item.orders,
          item.gmvValue,
          item.taxValue,
          item.commissionValue,
          item.deliveryFeeValue,
          item.platformValue,
        ]),
      ];

      const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
      await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    } catch (exportError) {
      setError(formatApiErrorMessage(exportError, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.summary;
  const groupLabel = GROUP_BY.find((item) => item.key === groupBy)?.label || 'Daily';

  return (
    <View className="gap-6">
      <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
            Financial Reports
          </Text>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            Orders · Tax · Commission · Delivery Fees · Platform Revenue
          </Text>
        </View>
        <Pressable
          onPress={() => void exportReport()}
          disabled={!data || exporting}
          className="flex-row items-center gap-2 self-start rounded-xl bg-green-600 px-4 py-2 disabled:opacity-50">
          {exporting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Feather name="download" color="#ffffff" size={16} />
          )}
          <Text className="font-sans text-sm font-semibold text-white">
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Text>
        </Pressable>
      </View>

      <View className="gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {PERIODS.map((item) => {
            const active = period === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setPeriod(item.key)}
                className={`rounded-lg border px-3 py-1.5 ${
                  active
                    ? 'border-green-600 bg-green-600'
                    : 'border-gray-300 dark:border-slate-600'
                }`}>
                <Text
                  className={`font-sans text-xs font-medium ${
                    active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                  }`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {period === 'custom' ? (
          <View className="gap-3 sm:flex-row sm:items-end">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">From</Text>
              <TextInput
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">To</Text>
              <TextInput
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </View>
          </View>
        ) : null}

        <View className="flex-row flex-wrap items-center gap-3">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Trend view:</Text>
          {GROUP_BY.map((item) => {
            const active = groupBy === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setGroupBy(item.key)}
                className={`rounded-lg border px-2.5 py-1 ${
                  active
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-300 dark:border-slate-600'
                }`}>
                <Text
                  className={`font-sans text-xs font-medium ${
                    active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                  }`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => void loadReport(period, groupBy)}
            className="ml-auto rounded-lg bg-gray-900 px-4 py-1.5 dark:bg-slate-600">
            <Text className="font-sans text-xs font-semibold text-white">Load Report</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Pressable
          onPress={() => void loadReport(period, groupBy)}
          className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Text className="font-sans text-sm text-red-700 dark:text-red-400">
            {error} <Text className="underline">Retry</Text>
          </Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#22c55e" size="large" />
        </View>
      ) : summary ? (
        <>
          <Text className="font-sans text-xs font-medium text-gray-400 dark:text-slate-500">
            Report period:{' '}
            <Text className="font-semibold text-gray-700 dark:text-slate-300">
              {summary.from} → {summary.to}
            </Text>
          </Text>

          <View className="gap-2">
            <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Orders
            </Text>
            <View className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard label="Total Orders" value={summary.totalOrders.toLocaleString()} accent="gray" />
              <SummaryCard label="Delivered" value={summary.deliveredOrders.toLocaleString()} sub="Completed" accent="emerald" />
              <SummaryCard label="Pending" value={summary.pendingOrders.toLocaleString()} sub="Awaiting" accent="amber" />
              <SummaryCard label="Cancelled" value={summary.cancelledOrders.toLocaleString()} accent="red" />
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Gross Merchandise Value
            </Text>
            <View className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard label="Total GMV" value={fmtMMK(summary.totalGmvValue)} sub="All orders" accent="blue" />
              <SummaryCard label="Shipping Fees" value={fmtMMK(summary.totalShippingValue)} sub="Paid by buyers" accent="gray" />
              <SummaryCard label="Tax Collected" value={fmtMMK(summary.totalTaxValue)} sub="5% VAT" accent="purple" />
              <SummaryCard label="Coupon Discounts" value={fmtMMK(summary.totalCouponDiscountValue)} sub="Deducted" accent="red" />
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Commission
            </Text>
            <View className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard label="Total Commission" value={fmtMMK(summary.totalCommissionValue)} sub="All orders" accent="teal" />
              <SummaryCard label="Commission Confirmed" value={fmtMMK(summary.totalCommissionConfirmedValue)} sub="Collected ✓" accent="emerald" />
              <SummaryCard label="Commission Pending" value={fmtMMK(summary.totalCommissionPendingValue)} sub="Awaiting delivery" accent="amber" />
              <SummaryCard label="Total Seller Payout" value={fmtMMK(summary.totalSellerPayoutValue)} sub="After commission" accent="blue" />
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Platform Delivery Fees
            </Text>
            <View className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryCard label="Total Delivery Fees" value={fmtMMK(summary.totalDeliveryFeesValue)} sub="Platform deliveries" accent="blue" />
              <SummaryCard label="Delivery Fees Confirmed" value={fmtMMK(summary.totalDeliveryFeesConfirmedValue)} sub="Collected ✓" accent="emerald" />
              <SummaryCard label="Delivery Fees Pending" value={fmtMMK(summary.totalDeliveryFeesPendingValue)} sub="Awaiting collection" accent="amber" />
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Platform Revenue (Pyonea Earns)
            </Text>
            <View className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SummaryCard
                label="Confirmed Platform Revenue"
                value={fmtMMK(summary.platformRevenueValue)}
                sub="Commission confirmed + Delivery confirmed"
                accent="emerald"
              />
              <SummaryCard
                label="Pending Platform Revenue"
                value={fmtMMK(summary.platformRevenuePendingValue)}
                sub="Commission pending + Delivery pending"
                accent="amber"
              />
            </View>
          </View>

          {data ? <TrendPanel data={data} groupLabel={groupLabel} /> : null}

          <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <View className="gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center">
              <Text className="flex-1 font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                Order Details ({filteredOrders.length} orders)
              </Text>
              <View className="gap-2 sm:flex-row">
                <View className="relative min-w-[200px] flex-1">
                  <View className="absolute left-3 top-2.5 z-10">
                    <Feather name="search" color="#9ca3af" size={14} />
                  </View>
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search order, buyer, seller…"
                    placeholderTextColor="#9ca3af"
                    className="rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 font-sans text-xs text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </View>
                <FilterSelect
                  label="All Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={ORDER_STATUSES.map((status) => ({
                    value: status,
                    label: status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1),
                  }))}
                />
              </View>
            </View>

            {filteredOrders.length === 0 ? (
              <View className="items-center py-10">
                <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">No orders found.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View className="min-w-full">
                  <View className="min-w-[1280px] flex-row bg-gray-50 px-3 py-3 dark:bg-slate-700/50">
                    {[
                      { label: 'Order #', width: 'w-28' },
                      { label: 'Date', width: 'w-24' },
                      { label: 'Buyer', width: 'w-36' },
                      { label: 'Seller', width: 'w-32' },
                      { label: 'Items', width: 'w-40' },
                      { label: 'Subtotal', width: 'w-24' },
                      { label: 'Shipping', width: 'w-24' },
                      { label: 'Tax', width: 'w-24' },
                      { label: 'Commission', width: 'w-28' },
                      { label: 'Total', width: 'w-24' },
                      { label: 'Comm. Status', width: 'w-28' },
                      { label: 'Delivery Fee', width: 'w-24' },
                      { label: 'Fee Status', width: 'w-28' },
                      { label: 'Status', width: 'w-28' },
                      { label: '', width: 'w-16' },
                    ].map((heading) => (
                      <Text
                        key={heading.label || 'actions'}
                        className={`${heading.width} pr-3 font-sans text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400`}>
                        {heading.label}
                      </Text>
                    ))}
                  </View>
                  {filteredOrders.map((order) => (
                    <OrderTableRow
                      key={String(order.orderId)}
                      order={order}
                      expanded={expandedOrderId === order.orderId}
                      onToggle={() =>
                        setExpandedOrderId((current) =>
                          current === order.orderId ? null : order.orderId,
                        )
                      }
                    />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </>
      ) : null}
    </View>
  );
}
