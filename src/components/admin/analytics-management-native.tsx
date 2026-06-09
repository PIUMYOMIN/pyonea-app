import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/context/theme';
import {
  fetchAdminAnalyticsStats,
  fetchAdminRevenueBreakdown,
  type AdminAnalyticsStats,
  type AdminRevenueBreakdownRow,
} from '@/utils/native-api';

const fmtK = (value: number) => {
  const amount = Number(value) || 0;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return amount.toLocaleString();
};

const fmtMMK = (value: number) => `${fmtK(value)} MMK`;

const fullMMK = (value: number) =>
  new Intl.NumberFormat('my-MM', { style: 'currency', currency: 'MMK', minimumFractionDigits: 0 }).format(
    Number(value) || 0
  );

const csvCell = (value: string | number) => `"${String(value ?? '').replaceAll('"', '""')}"`;

function KpiCard({
  label,
  value,
  sub,
  valueClass,
  bgClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass: string;
  bgClass: string;
}) {
  return (
    <View className={`w-[48%] rounded-xl p-4 lg:w-[23%] ${bgClass}`}>
      <Text className="font-sans text-xs font-medium text-gray-500 dark:text-slate-400">{label}</Text>
      <Text className={`mt-1 font-sans text-xl font-bold ${valueClass}`} numberOfLines={2}>
        {value}
      </Text>
      {sub ? <Text className="mt-0.5 font-sans text-[11px] text-gray-400 dark:text-slate-500">{sub}</Text> : null}
    </View>
  );
}

function ExportButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 ${disabled ? 'opacity-60' : ''}`}>
      {disabled ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Feather name="download" size={14} color="#ffffff" />
      )}
      <Text className="font-sans text-xs font-medium text-white">{disabled ? 'Exporting…' : label}</Text>
    </Pressable>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View className="mt-3 flex-row flex-wrap gap-4">
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function StackedBarChart({ data }: { data: AdminRevenueBreakdownRow[] }) {
  const maxValue = useMemo(
    () => Math.max(...data.map((row) => row.commission + row.deliveryFee), 1),
    [data]
  );
  const barHeight = 220;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="px-1">
        <View className="flex-row items-end gap-3 pb-1" style={{ minHeight: barHeight + 36 }}>
          {data.map((row) => {
            const commissionHeight = (row.commission / maxValue) * barHeight;
            const deliveryHeight = (row.deliveryFee / maxValue) * barHeight;
            return (
              <View key={row.month} className="items-center" style={{ width: 40 }}>
                <View style={{ height: barHeight }} className="w-7 justify-end overflow-hidden rounded-t-md bg-gray-100 dark:bg-slate-700/50">
                  <View style={{ height: deliveryHeight }} className="bg-blue-500" />
                  <View style={{ height: commissionHeight }} className="bg-emerald-500" />
                </View>
                <Text className="mt-1 font-sans text-[9px] text-gray-500 dark:text-slate-400" numberOfLines={1}>
                  {row.month}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <ChartLegend
        items={[
          { color: '#10b981', label: 'Commission' },
          { color: '#3b82f6', label: 'Delivery Fees' },
        ]}
      />
    </View>
  );
}

function DualLineChart({ data, isDark }: { data: AdminRevenueBreakdownRow[]; isDark: boolean }) {
  const width = Math.max(data.length * 56, 320);
  const height = 220;
  const padding = { top: 12, right: 16, bottom: 28, left: 8 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = useMemo(() => Math.max(...data.map((row) => Math.max(row.gmv, row.platform)), 1), [data]);

  const toPoint = (index: number, value: number) => {
    const x = padding.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - (value / maxValue) * plotHeight;
    return `${x},${y}`;
  };

  const gmvPoints = data.map((row, index) => toPoint(index, row.gmv)).join(' ');
  const platformPoints = data.map((row, index) => toPoint(index, row.platform)).join(' ');

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ width, height: height + 24 }}>
          <Svg width={width} height={height}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + plotHeight * (1 - ratio);
              return (
                <Polyline
                  key={ratio}
                  points={`${padding.left},${y} ${width - padding.right},${y}`}
                  fill="none"
                  stroke={isDark ? '#334155' : '#f0f0f0'}
                  strokeWidth={1}
                />
              );
            })}
            <Polyline points={gmvPoints} fill="none" stroke="#94a3b8" strokeWidth={2} />
            <Polyline points={platformPoints} fill="none" stroke="#10b981" strokeWidth={2} />
            {data.map((row, index) => {
              const [gx, gy] = toPoint(index, row.gmv).split(',').map(Number);
              return <Circle key={`${row.month}-gmv`} cx={gx} cy={gy} r={2.5} fill="#94a3b8" />;
            })}
            {data.map((row, index) => {
              const [px, py] = toPoint(index, row.platform).split(',').map(Number);
              return <Circle key={`${row.month}-platform`} cx={px} cy={py} r={2.5} fill="#10b981" />;
            })}
          </Svg>
          <View className="flex-row justify-between px-2">
            {data.map((row) => (
              <Text key={row.month} className="font-sans text-[9px] text-gray-500 dark:text-slate-400">
                {row.month}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
      <ChartLegend
        items={[
          { color: '#94a3b8', label: 'GMV' },
          { color: '#10b981', label: 'Platform Revenue' },
        ]}
      />
    </View>
  );
}

export function AnalyticsManagementNative() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState<AdminAnalyticsStats | null>(null);
  const [breakdown, setBreakdown] = useState<AdminRevenueBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState('');

  const totals = useMemo(
    () =>
      breakdown.reduce(
        (acc, row) => ({
          commission: acc.commission + row.commission,
          deliveryFee: acc.deliveryFee + row.deliveryFee,
          platform: acc.platform + row.platform,
          gmv: acc.gmv + row.gmv,
        }),
        { commission: 0, deliveryFee: 0, platform: 0, gmv: 0 }
      ),
    [breakdown]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResult, breakdownResult] = await Promise.allSettled([
        fetchAdminAnalyticsStats(),
        fetchAdminRevenueBreakdown(),
      ]);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (breakdownResult.status === 'fulfilled') setBreakdown(breakdownResult.value);
      if (statsResult.status === 'rejected' && breakdownResult.status === 'rejected') {
        setError('Failed to load analytics.');
      }
    } catch {
      setError('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const exportCsv = async (filename: string, headers: string[], rows: (string | number)[][]) => {
    const lines = [headers.join(','), ...rows.map((row) => row.map(csvCell).join(','))];
    const csv = lines.join('\n');
    await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
  };

  const runExport = async (key: string, fn: () => Promise<void>) => {
    setExporting(key);
    setExportError('');
    try {
      await fn();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting('');
    }
  };

  const exportBreakdown = () =>
    runExport('breakdown', () =>
      exportCsv(
        `pyonea-platform-revenue-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Month', 'Commission (MMK)', 'Delivery Fees (MMK)', 'Total Platform Revenue (MMK)', 'GMV (MMK)'],
        breakdown.map((row) => [row.month, row.commission, row.deliveryFee, row.platform, row.gmv])
      )
    );

  const exportSummary = () =>
    runExport('summary', () =>
      exportCsv(
        `pyonea-summary-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Metric', 'Value (MMK)'],
        [
          ['Total GMV', stats?.totalRevenue ?? 0],
          ['Platform Revenue', stats?.platformRevenue ?? 0],
          ['Commission Revenue', stats?.commissionRevenue ?? 0],
          ['Delivery Fee Revenue', stats?.deliveryFeeRevenue ?? 0],
          ['Pending Commissions', stats?.pendingCommissions ?? 0],
          ['Paid Commissions', stats?.paidCommissions ?? 0],
          ['Total Orders', stats?.totalOrders ?? 0],
          ['Completed Orders', stats?.completedOrders ?? 0],
        ]
      )
    );

  if (loading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-row flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
        <Pressable onPress={() => void fetchAll()}>
          <Text className="font-sans text-sm font-medium text-red-700 underline dark:text-red-300">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <View className="flex-row items-center gap-2">
            <Feather name="pie-chart" size={20} color="#16a34a" />
            <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">Revenue Analytics</Text>
          </View>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            Platform revenue = seller commissions + platform delivery fees
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <ExportButton label="Export Summary" disabled={!!exporting} onPress={() => void exportSummary()} />
          <ExportButton label="Export Breakdown" disabled={!!exporting} onPress={() => void exportBreakdown()} />
        </View>
      </View>

      {exportError ? (
        <View className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Text className="font-sans text-sm text-red-700 dark:text-red-300">{exportError}</Text>
        </View>
      ) : null}

      <View>
        <Text className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
          Platform Revenue (What Pyonea Earns)
        </Text>
        <View className="flex-row flex-wrap gap-3">
          <KpiCard
            label="Total Platform Revenue"
            value={fmtMMK(stats?.platformRevenue ?? 0)}
            sub="Commission + Delivery Fees"
            valueClass="text-emerald-700 dark:text-emerald-400"
            bgClass="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <KpiCard
            label="Commission Revenue"
            value={fmtMMK(stats?.commissionRevenue ?? 0)}
            sub="From delivered orders"
            valueClass="text-teal-700 dark:text-teal-400"
            bgClass="bg-teal-50 dark:bg-teal-900/20"
          />
          <KpiCard
            label="Delivery Fee Revenue"
            value={fmtMMK(stats?.deliveryFeeRevenue ?? 0)}
            sub="Platform deliveries"
            valueClass="text-blue-700 dark:text-blue-400"
            bgClass="bg-blue-50 dark:bg-blue-900/20"
          />
          <KpiCard
            label="Pending Commissions"
            value={fmtMMK(stats?.pendingCommissions ?? 0)}
            sub="Awaiting collection"
            valueClass="text-amber-700 dark:text-amber-400"
            bgClass="bg-amber-50 dark:bg-amber-900/20"
          />
        </View>
      </View>

      <View>
        <Text className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
          Marketplace Volume (GMV)
        </Text>
        <View className="flex-row flex-wrap gap-3">
          <KpiCard
            label="Total GMV"
            value={fmtMMK(stats?.totalRevenue ?? 0)}
            sub="All time order value"
            valueClass="text-gray-700 dark:text-slate-300"
            bgClass="bg-gray-50 dark:bg-slate-700/50"
          />
          <KpiCard
            label="Total Orders"
            value={(stats?.totalOrders ?? 0).toLocaleString()}
            valueClass="text-gray-700 dark:text-slate-300"
            bgClass="bg-gray-50 dark:bg-slate-700/50"
          />
          <KpiCard
            label="Completed Orders"
            value={(stats?.completedOrders ?? 0).toLocaleString()}
            sub="Delivered"
            valueClass="text-green-700 dark:text-green-400"
            bgClass="bg-green-50 dark:bg-green-900/20"
          />
          <KpiCard
            label="Paid Commissions"
            value={fmtMMK(stats?.paidCommissions ?? 0)}
            sub="Collected"
            valueClass="text-gray-700 dark:text-slate-300"
            bgClass="bg-gray-50 dark:bg-slate-700/50"
          />
        </View>
      </View>

      {breakdown.length > 0 ? (
        <>
          <View className="rounded-xl border border-gray-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <View className="mb-4 flex-row flex-wrap items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Monthly Platform Revenue (Last 12 months)
                </Text>
                <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                  Commission fees + Platform delivery fees
                </Text>
              </View>
              <ExportButton label="Export" disabled={!!exporting} onPress={() => void exportBreakdown()} />
            </View>
            <StackedBarChart data={breakdown} />
          </View>

          <View className="rounded-xl border border-gray-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <Text className="mb-4 font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
              GMV vs Platform Revenue (Last 12 months)
            </Text>
            <DualLineChart data={breakdown} isDark={isDark} />
          </View>

          <View className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
            <View className="flex-row flex-wrap items-center justify-between gap-3 border-b border-gray-50 px-5 py-3 dark:border-slate-700">
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">Monthly Breakdown</Text>
              <ExportButton label="Export CSV" disabled={!!exporting} onPress={() => void exportBreakdown()} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
              <View className="w-full min-w-[860px]">
                <View className="flex-row bg-gray-50 px-5 py-3 dark:bg-slate-900/50">
                  {[
                    { key: 'month', label: 'Month', width: 'w-[120px]' },
                    { key: 'commission', label: 'Commission', width: 'w-[150px]' },
                    { key: 'delivery', label: 'Delivery Fees', width: 'w-[150px]' },
                    { key: 'platform', label: 'Total Platform', width: 'w-[150px]' },
                    { key: 'gmv', label: 'GMV', width: 'w-[150px]' },
                    { key: 'take', label: 'Take Rate', width: 'w-[100px]' },
                  ].map((column) => (
                    <View key={column.key} className={`${column.width} px-2`}>
                      <Text className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        {column.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {breakdown.map((row) => {
                  const takeRate = row.gmv > 0 ? ((row.platform / row.gmv) * 100).toFixed(1) : '0.0';
                  return (
                    <View key={row.month} className="flex-row border-t border-gray-50 px-5 py-2.5 dark:border-slate-700/50">
                      <View className="w-[120px] justify-center px-2">
                        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">{row.month}</Text>
                      </View>
                      <View className="w-[150px] justify-center px-2">
                        <Text className="font-sans text-sm text-teal-700 dark:text-teal-400">{fullMMK(row.commission)}</Text>
                      </View>
                      <View className="w-[150px] justify-center px-2">
                        <Text className="font-sans text-sm text-blue-700 dark:text-blue-400">{fullMMK(row.deliveryFee)}</Text>
                      </View>
                      <View className="w-[150px] justify-center px-2">
                        <Text className="font-sans text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {fullMMK(row.platform)}
                        </Text>
                      </View>
                      <View className="w-[150px] justify-center px-2">
                        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{fullMMK(row.gmv)}</Text>
                      </View>
                      <View className="w-[100px] justify-center px-2">
                        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{takeRate}%</Text>
                      </View>
                    </View>
                  );
                })}

                <View className="flex-row border-t-2 border-gray-200 bg-gray-50 px-5 py-2.5 dark:border-slate-600 dark:bg-slate-900/50">
                  <View className="w-[120px] justify-center px-2">
                    <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">Total</Text>
                  </View>
                  <View className="w-[150px] justify-center px-2">
                    <Text className="font-sans text-sm font-semibold text-teal-700 dark:text-teal-400">
                      {fullMMK(totals.commission)}
                    </Text>
                  </View>
                  <View className="w-[150px] justify-center px-2">
                    <Text className="font-sans text-sm font-semibold text-blue-700 dark:text-blue-400">
                      {fullMMK(totals.deliveryFee)}
                    </Text>
                  </View>
                  <View className="w-[150px] justify-center px-2">
                    <Text className="font-sans text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {fullMMK(totals.platform)}
                    </Text>
                  </View>
                  <View className="w-[150px] justify-center px-2">
                    <Text className="font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">
                      {fullMMK(totals.gmv)}
                    </Text>
                  </View>
                  <View className="w-[100px] justify-center px-2">
                    <Text className="font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">
                      {totals.gmv > 0 ? ((totals.platform / totals.gmv) * 100).toFixed(1) : '0.0'}%
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </>
      ) : (
        <View className="rounded-xl border border-gray-100 bg-white p-10 dark:border-slate-700 dark:bg-slate-800">
          <Text className="text-center font-sans text-sm text-gray-400 dark:text-slate-500">
            No revenue data yet. Revenue will appear here once orders are delivered and commissions recorded.
          </Text>
        </View>
      )}
    </View>
  );
}
