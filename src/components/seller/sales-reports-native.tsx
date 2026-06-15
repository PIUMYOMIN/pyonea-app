import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type DimensionValue,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  fetchSellerSalesReports,
  type SellerSalesReportsData,
  type SellerSalesTrendPoint,
  type SellerTopProductSale,

  formatApiErrorMessage,
} from '@/utils/native-api';

type TimeRange = 'week' | 'month';
type ExportKind = 'full' | 'trend' | 'products';

const emptySalesData: SellerSalesReportsData = {
  monthlyData: [],
  weeklyData: [],
  topProducts: [],
  summary: {
    totalSalesValue: 0,
    totalSales: '0 MMK',
    totalOrders: 0,
    newCustomers: 0,
  },
};

const compactNumber = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return value.toLocaleString();
};

const compactMMK = (value: number) => `${compactNumber(value)} MMK`;

const csvCell = (value: string | number) => {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
};

const openCsv = async (rows: (string | number)[][], filename: string) => {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
  return filename;
};

function SummaryCard({
  icon,
  title,
  value,
  tint,
  accent,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value: string | number;
  tint: string;
  accent: string;
}) {
  const hasValue = Number(String(value).replace(/[^0-9.]/g, '')) > 0;

  return (
    <View className={`rounded-xl border p-6 ${tint}`}>
      <View className="flex-row items-center">
        <View className={`h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
          <Feather name={icon} color="#ffffff" size={24} />
        </View>
        <View className="ml-4 min-w-0 flex-1">
          <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">{title}</Text>
          <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center gap-1">
        <Feather name="arrow-up" color="#16a34a" size={16} />
        <Text className="font-sans text-sm text-green-600 dark:text-green-400">
          {hasValue ? '+0%' : '0%'} increase
        </Text>
      </View>
    </View>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <View className="h-72 items-center justify-center">
      <Feather name="bar-chart-2" color="#94a3b8" size={48} />
      <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function SalesOverviewChart({ data }: { data: SellerSalesTrendPoint[] }) {
  const maxSales = Math.max(...data.map((item) => item.salesValue), 1);
  const maxOrders = Math.max(...data.map((item) => item.orders), 1);

  if (!data.length) return <EmptyChart label="No sales data" />;

  return (
    <View className="h-72 justify-end gap-4">
      <View className="flex-1 flex-row items-end gap-2">
        {data.map((item, index) => {
          const salesHeight = Math.max(8, Math.round((item.salesValue / maxSales) * 180));
          const orderHeight = Math.max(8, Math.round((item.orders / maxOrders) * 120));
          return (
            <View key={`${item.date}-${index}`} className="min-w-0 flex-1 items-center justify-end gap-1">
              <View className="h-48 flex-row items-end gap-1">
                <View className="w-3 rounded-t bg-green-500" style={{ height: salesHeight }} />
                <View className="w-3 rounded-t bg-blue-500" style={{ height: orderHeight }} />
              </View>
              <Text className="font-sans text-[10px] text-gray-500 dark:text-slate-400" numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
      <View className="flex-row items-center justify-center gap-5">
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Sales amount</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Order count</Text>
        </View>
      </View>
    </View>
  );
}

function RevenueByProductChart({ products }: { products: SellerTopProductSale[] }) {
  const topProducts = products.slice(0, 5);
  const maxRevenue = Math.max(...topProducts.map((product) => product.revenueValue), 1);

  if (!topProducts.length) return <EmptyChart label="No product data" />;

  return (
    <View className="h-72 justify-center gap-4">
      {topProducts.map((product) => {
        const width = `${Math.max(8, Math.round((product.revenueValue / maxRevenue) * 100))}%` as DimensionValue;
        return (
          <View key={String(product.id)} className="gap-2">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="min-w-0 flex-1 font-sans text-xs font-medium text-gray-600 dark:text-slate-300" numberOfLines={1}>
                {product.name}
              </Text>
              <Text className="font-sans text-xs font-semibold text-gray-900 dark:text-slate-100">{compactMMK(product.revenueValue)}</Text>
            </View>
            <View className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
              <View className="h-full rounded-full bg-purple-500" style={{ width }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PerformanceBadge({ sales }: { sales: number }) {
  const high = sales > 80;
  const medium = sales > 50;
  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${
        high
          ? 'bg-green-100 dark:bg-green-900/30'
          : medium
            ? 'bg-yellow-100 dark:bg-yellow-900/30'
            : 'bg-gray-100 dark:bg-slate-700'
      }`}
    >
      <Text
        className={`font-sans text-xs font-medium ${
          high
            ? 'text-green-800 dark:text-green-300'
            : medium
              ? 'text-yellow-800 dark:text-yellow-300'
              : 'text-gray-800 dark:text-slate-300'
        }`}
      >
        {high ? 'High' : medium ? 'Medium' : 'Low'}
      </Text>
    </View>
  );
}

function ProductSaleRow({ product }: { product: SellerTopProductSale }) {
  return (
    <View className="gap-3 px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 md:grid md:grid-cols-12 md:items-center md:gap-4">
      <View className="min-w-0 flex-row items-center gap-4 md:col-span-4">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-gray-300 dark:bg-slate-600">
          <Feather name="bar-chart-2" color="#ffffff" size={20} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {product.name}
          </Text>
          <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">Product ID: {product.id}</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-4 md:hidden">
        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
          <Text className="font-medium text-gray-900 dark:text-slate-100">{product.sales}</Text> units
        </Text>
        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">{product.revenue}</Text>
        <PerformanceBadge sales={product.sales} />
      </View>
      <View className="hidden md:col-span-2 md:flex">
        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">{product.sales}</Text>
        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">units</Text>
      </View>
      <View className="hidden md:col-span-2 md:flex">
        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">{product.revenue}</Text>
        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">Revenue</Text>
      </View>
      <View className="hidden md:col-span-2 md:flex">
        <PerformanceBadge sales={product.sales} />
      </View>
      <View className="hidden flex-row items-center justify-end gap-4 md:col-span-2 md:flex">
        <Link href={`/products/${product.id}`} asChild>
          <Pressable>
            <Text className="font-sans text-sm font-medium text-green-600 dark:text-green-400">View</Text>
          </Pressable>
        </Link>
        <Link href={`/seller/dashboard?tab=products`} asChild>
          <Pressable>
            <Text className="font-sans text-sm font-medium text-blue-600 dark:text-blue-400">Edit</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

export function SalesReportsNative() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [salesData, setSalesData] = useState<SellerSalesReportsData>(emptySalesData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [message, setMessage] = useState('');

  const trendData = timeRange === 'month' ? salesData.monthlyData : salesData.weeklyData;

  const loadReports = useCallback(async () => {
    try {
      const result = await fetchSellerSalesReports();
      setSalesData(result);
      setError('');
    } catch (requestError) {
      setSalesData(emptySalesData);
      setError(formatApiErrorMessage(requestError, 'Failed to load sales data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadReports();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadReports]);

  const exportRows = useMemo(
    () => ({
      trend: [
        ['Date', 'Revenue (MMK)', 'Orders'],
        ...trendData.map((item) => [item.label, item.salesValue, item.orders]),
      ],
      products: [
        ['Product Name', 'Units Sold', 'Revenue (MMK)'],
        ...salesData.topProducts.map((product) => [product.name, product.sales, product.revenueValue]),
      ],
      full: [
        ['Pyonea Sales Report', `Exported: ${new Date().toLocaleString()}`],
        [],
        ['Summary'],
        ['Total Sales (MMK)', salesData.summary.totalSalesValue],
        ['Total Orders', salesData.summary.totalOrders],
        ['New Customers', salesData.summary.newCustomers],
        [],
        ['Sales Trend'],
        ['Date', 'Revenue (MMK)', 'Orders'],
        ...trendData.map((item) => [item.label, item.salesValue, item.orders]),
        [],
        ['Top Products'],
        ['Product Name', 'Units Sold', 'Revenue (MMK)'],
        ...salesData.topProducts.map((product) => [product.name, product.sales, product.revenueValue]),
      ],
    }),
    [salesData, trendData]
  );

  const handleExport = async (kind: ExportKind) => {
    setExportMenuOpen(false);
    setExporting(true);
    setMessage('');
    try {
      const filename =
        kind === 'full'
          ? 'pyonea-full-report.csv'
          : kind === 'trend'
            ? 'pyonea-sales-trend.csv'
            : 'pyonea-top-products.csv';
      await openCsv(exportRows[kind], filename);
      setMessage(`${filename} prepared.`);
    } catch (exportError) {
      setError(formatApiErrorMessage(exportError, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <View className="h-64 items-center justify-center">
          <ActivityIndicator color="#22c55e" size="large" />
        </View>
      </View>
    );
  }

  if (error && !salesData.monthlyData.length && !salesData.topProducts.length) {
    return (
      <View className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <View className="items-center py-12">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Feather name="alert-circle" color="#dc2626" size={32} />
          </View>
          <Text className="mb-2 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">Error loading data</Text>
          <Text className="mb-4 text-center font-sans text-gray-600 dark:text-slate-400">{error}</Text>
          <Pressable onPress={() => void loadReports()} className="rounded-lg bg-green-600 px-4 py-2">
            <Text className="font-sans text-sm font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="gap-4 md:flex-row md:items-center md:justify-between">
        <View>
          <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">Sales Reports</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">Sales analytics and insights</Text>
        </View>
        <View className="gap-3 sm:flex-row sm:items-center">
          <View className="flex-row rounded-lg border border-gray-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-700">
            {(['week', 'month'] as TimeRange[]).map((range) => {
              const active = timeRange === range;
              return (
                <Pressable
                  key={range}
                  onPress={() => setTimeRange(range)}
                  className={`rounded-md px-4 py-2 ${active ? 'bg-green-600' : 'bg-transparent'}`}
                >
                  <Text className={`font-sans text-sm font-semibold ${active ? 'text-white' : 'text-gray-700 dark:text-slate-200'}`}>
                    {range === 'week' ? 'This Week' : 'This Month'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="relative">
            <Pressable
              onPress={() => setExportMenuOpen((current) => !current)}
              disabled={exporting}
              className="flex-row items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 disabled:opacity-60"
            >
              {exporting ? <ActivityIndicator color="#ffffff" /> : <Feather name="download" color="#ffffff" size={16} />}
              <Text className="font-sans text-sm font-semibold text-white">{exporting ? 'Exporting' : 'Export'}</Text>
              <Feather name="chevron-down" color="#ffffff" size={14} />
            </Pressable>
            {exportMenuOpen ? (
              <View className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-700">
                <Pressable onPress={() => void handleExport('full')} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-600">
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-200">Full report CSV</Text>
                </Pressable>
                <Pressable onPress={() => void handleExport('trend')} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-600">
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-200">Sales trend only</Text>
                </Pressable>
                <Pressable onPress={() => void handleExport('products')} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-600">
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-200">Top products only</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {message ? (
        <Pressable onPress={() => setMessage('')} className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" color="#16a34a" size={16} />
          <Text className="font-sans text-sm text-green-700 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      {error ? (
        <Pressable onPress={() => setError('')} className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" color="#dc2626" size={16} />
          <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
        </Pressable>
      ) : null}

      <View className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard
          icon="dollar-sign"
          title="Total Sales"
          value={compactMMK(salesData.summary.totalSalesValue)}
          tint="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
          accent="bg-blue-500"
        />
        <SummaryCard
          icon="shopping-bag"
          title="Total Orders"
          value={salesData.summary.totalOrders}
          tint="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20"
          accent="bg-purple-500"
        />
        <SummaryCard
          icon="users"
          title="New Customers"
          value={salesData.summary.newCustomers}
          tint="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
          accent="bg-yellow-500"
        />
      </View>

      <View className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <View className="rounded-xl bg-white p-6 shadow dark:bg-slate-800">
          <Text className="mb-4 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">Sales Overview</Text>
          <SalesOverviewChart data={trendData} />
        </View>
        <View className="rounded-xl bg-white p-6 shadow dark:bg-slate-800">
          <Text className="mb-4 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">Revenue by Product</Text>
          <RevenueByProductChart products={salesData.topProducts} />
        </View>
      </View>

      <View className="overflow-hidden rounded-xl bg-white shadow dark:bg-slate-800">
        <View className="border-b border-gray-200 p-6 dark:border-slate-700">
          <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">Top Selling Products</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">Best performing products</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="min-w-full">
            <View className="hidden border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-slate-700 dark:bg-slate-900/50 md:grid md:grid-cols-12 md:gap-4">
              <Text className="col-span-4 font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Product</Text>
              <Text className="col-span-2 font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Sold</Text>
              <Text className="col-span-2 font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Revenue</Text>
              <Text className="col-span-2 font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Performance</Text>
              <Text className="col-span-2 font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Actions</Text>
            </View>

            {salesData.topProducts.length > 0 ? (
              <View className="divide-y divide-gray-200 dark:divide-slate-700">
                {salesData.topProducts.slice(0, 5).map((product) => (
                  <ProductSaleRow key={String(product.id)} product={product} />
                ))}
              </View>
            ) : (
              <View className="items-center py-12">
                <Feather name="bar-chart-2" color="#94a3b8" size={48} />
                <Text className="mt-3 font-sans text-gray-500 dark:text-slate-400">No products found</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
