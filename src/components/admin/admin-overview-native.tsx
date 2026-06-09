import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/context/theme';
import { formatMMK, type AdminStats } from '@/utils/native-api';

function CompactNumber({ value }: { value: number }) {
  const formatted =
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
        : new Intl.NumberFormat('en-MM').format(value);

  return <>{formatted}</>;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  money,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  tone: 'green' | 'blue' | 'purple' | 'amber' | 'teal' | 'orange' | 'red' | 'indigo' | 'pink' | 'gray';
  money?: boolean;
}) {
  const { isDark } = useTheme();
  const tones = {
    green: { lightBg: '#f0fdf4', darkBg: '#052e1a', lightText: '#15803d', darkText: '#86efac' },
    blue: { lightBg: '#eff6ff', darkBg: '#172554', lightText: '#1d4ed8', darkText: '#93c5fd' },
    purple: { lightBg: '#faf5ff', darkBg: '#3b0764', lightText: '#7e22ce', darkText: '#d8b4fe' },
    amber: { lightBg: '#fffbeb', darkBg: '#451a03', lightText: '#b45309', darkText: '#fcd34d' },
    teal: { lightBg: '#f0fdfa', darkBg: '#042f2e', lightText: '#0f766e', darkText: '#5eead4' },
    orange: { lightBg: '#fff7ed', darkBg: '#431407', lightText: '#c2410c', darkText: '#fdba74' },
    red: { lightBg: '#fef2f2', darkBg: '#450a0a', lightText: '#dc2626', darkText: '#fca5a5' },
    indigo: { lightBg: '#eef2ff', darkBg: '#1e1b4b', lightText: '#4338ca', darkText: '#a5b4fc' },
    pink: { lightBg: '#fdf2f8', darkBg: '#500724', lightText: '#be185d', darkText: '#f9a8d4' },
    gray: { lightBg: '#f8fafc', darkBg: '#1e293b', lightText: '#475569', darkText: '#cbd5e1' },
  }[tone];
  const toneText = isDark ? tones.darkText : tones.lightText;
  const cardBackground = isDark ? tones.darkBg : tones.lightBg;
  const cardBorder = isDark ? '#334155' : '#ffffff';
  const iconBackground = isDark ? '#0f172a' : '#ffffff';

  return (
    <View
      className="w-full rounded-2xl border p-4 shadow-sm shadow-slate-200/50 dark:shadow-none sm:w-[48%] lg:w-[23%]"
      style={{ backgroundColor: cardBackground, borderColor: cardBorder }}>
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-xl border shadow-sm dark:shadow-none"
          style={{ backgroundColor: iconBackground, borderColor: cardBorder }}>
          <Feather name={icon} color={toneText} size={20} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xs font-semibold uppercase text-gray-600 dark:text-slate-300" numberOfLines={1}>
            {title}
          </Text>
          <Text className="mt-1 font-sans text-xl font-bold" style={{ color: toneText }} numberOfLines={1}>
            {money ? formatMMK(value) : <CompactNumber value={value} />}
          </Text>
          {subtitle ? (
            <Text className="mt-1 font-sans text-[11px] text-gray-500 dark:text-slate-400" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function OverviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-3 font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-3">{children}</View>
    </View>
  );
}

export function AdminOverviewNative({
  stats,
  loading,
  error,
  onRetry,
}: {
  stats: AdminStats | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <View className="items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 dark:border-slate-800 dark:bg-slate-900">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950">
        <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">{error}</Text>
        <Pressable onPress={onRetry} className="mt-4 self-start rounded-lg bg-red-600 px-4 py-2">
          <Text className="font-sans text-sm font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!stats) {
    return (
      <View className="rounded-2xl border border-gray-100 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <Text className="text-center font-sans text-sm text-gray-500 dark:text-slate-400">No data available.</Text>
      </View>
    );
  }

  return (
    <View className="gap-6">
      <OverviewSection title="Platform Overview">
        <KpiCard title="Total Users" value={stats.totalUsers} subtitle={`${stats.activeUsers} active - ${stats.totalSellers} sellers`} icon="users" tone="green" />
        <KpiCard title="Total Products" value={stats.totalProducts} subtitle={`${stats.activeProducts} active`} icon="box" tone="blue" />
        <KpiCard title="Total Orders" value={stats.totalOrders} subtitle={`${stats.pendingOrders} pending - ${stats.completedOrders} done`} icon="shopping-bag" tone="purple" />
        <KpiCard title="Total Revenue" value={stats.totalRevenue} subtitle={`${formatMMK(stats.confirmedRevenue)} confirmed`} icon="dollar-sign" tone="amber" money />
      </OverviewSection>

      <OverviewSection title="Commission Fees">
        <KpiCard title="Total Commission" value={stats.commissionRevenue} subtitle="From delivered orders" icon="dollar-sign" tone="green" money />
        <KpiCard title="Collected" value={stats.collectedCommissions} subtitle="Paid to platform" icon="check-circle" tone="teal" money />
        <KpiCard title="Pending Commission" value={stats.pendingCommissions} subtitle="Awaiting collection" icon="clock" tone="orange" money />
      </OverviewSection>

      <OverviewSection title="Delivery Fees">
        <KpiCard title="Total Delivery Fees" value={stats.totalDeliveryFees} subtitle="All platform deliveries" icon="truck" tone="blue" money />
        <KpiCard title="Confirmed Fees" value={stats.confirmedDeliveryFees} subtitle="Admin confirmed received" icon="check-circle" tone="green" money />
        <KpiCard title="Submitted Awaiting" value={stats.submittedDeliveryFees} subtitle="Seller sent, not confirmed yet" icon="alert-circle" tone="amber" money />
        <KpiCard title="Pending Not Submitted" value={stats.pendingDeliveryFees} subtitle="Unsubmitted delivery fees" icon="clock" tone="red" money />
      </OverviewSection>

      <OverviewSection title="Sellers & Business">
        <KpiCard title="Total Sellers" value={stats.totalSellers} subtitle={`${stats.totalSellersApproved} approved`} icon="briefcase" tone="indigo" />
        <KpiCard title="Sellers Pending" value={stats.sellersPending} subtitle="Awaiting approval" icon="clock" tone="amber" />
        <KpiCard title="Business Types" value={stats.totalBusinessTypes} subtitle={`${stats.activeBusinessTypes} active`} icon="archive" tone="pink" />
        <KpiCard title="Cancelled Orders" value={stats.cancelledOrders} subtitle="All time" icon="alert-circle" tone="gray" />
      </OverviewSection>
    </View>
  );
}
