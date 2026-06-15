import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BUYER_DASHBOARD_PATH,
  buyerTabDefinitions,
  normalizeBuyerTab,
  type BuyerTab,
} from '@/dashboards/buyer/config';
import {
  DashboardLoading,
  DashboardShell,
  useDashboardGuard,
  useDashboardTabs,
} from '@/dashboards/shared';
import { useWishlist } from '@/context/wishlist-context';
import { useAppTranslation } from '@/i18n';
import { BuyerRfqNative } from '@/components/buyer/buyer-rfq-native';
import { CheckoutPaymentModal } from '@/components/checkout/checkout-payment-modal';
import {
  cancelBuyerOrder,
  clearCartItems,
  confirmBuyerOrderDelivery,
  fetchBuyerOrders,
  fetchBuyerProfile,
  fetchCart,
  formatMMK,
  getProductApiId,
  removeCartItem,
  removeWishlistItem,
  resendBuyerVerificationEmail,
  updateBuyerPassword,
  updateBuyerProfile,
  updateCartItemQuantity,
  ApiError,
  type BuyerProfile,
  type BuyerProfilePayload,
  type CartItem,
  type CartResult,
  type CheckoutOrderResult,
  type HomeProduct,
  type TrackedOrder,

  formatApiErrorMessage,
} from '@/utils/native-api';
import { getThumbUrl } from '@/utils/image-thumbs';

const placeholderProduct = require('@/assets/images/placeholder-product.png');

const orderStatuses = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const titleCase = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';

  return new Intl.DateTimeFormat('en-MM', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const statusTone = (status: string) => {
  switch (status) {
    case 'delivered':
      return {
        wrap: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
      };
    case 'shipped':
      return {
        wrap: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-300',
      };
    case 'confirmed':
      return {
        wrap: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
      };
    case 'processing':
      return {
        wrap: 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30',
        text: 'text-indigo-700 dark:text-indigo-300',
      };
    case 'cancelled':
      return {
        wrap: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-300',
      };
    default:
      return {
        wrap: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-300',
      };
  }
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const tone = statusTone(status);
  return (
    <View className={`self-start rounded-full border px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-xs font-semibold ${tone.text}`}>
        {t(`buyer_dashboard.order_status.${status}`, { defaultValue: titleCase(status) })}
      </Text>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-6">
      {children}
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  tone: 'blue' | 'green' | 'indigo' | 'purple';
}) {
  const colors = {
    blue: ['bg-blue-50 dark:bg-blue-900/30', '#2563eb', 'text-blue-700 dark:text-blue-300'],
    green: ['bg-green-50 dark:bg-green-900/30', '#16a34a', 'text-green-700 dark:text-green-300'],
    indigo: ['bg-indigo-50 dark:bg-indigo-900/30', '#4f46e5', 'text-indigo-700 dark:text-indigo-300'],
    purple: ['bg-purple-50 dark:bg-purple-900/30', '#9333ea', 'text-purple-700 dark:text-purple-300'],
  }[tone];

  return (
    <View className="w-[48%] rounded-xl border border-gray-100 bg-white p-4 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:w-[23%]">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-500">{label}</Text>
          <Text className={`mt-1 font-sans text-xl font-bold ${colors[2]}`} numberOfLines={1}>
            {value}
          </Text>
        </View>
        <View className={`h-10 w-10 items-center justify-center rounded-lg ${colors[0]}`}>
          <Feather name={icon} color={colors[1]} size={20} />
        </View>
      </View>
    </View>
  );
}

function trackedOrderToCheckoutOrder(order: TrackedOrder): CheckoutOrderResult {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.totalAmount,
    totalValue: order.totalAmountValue,
    paymentMethod: order.paymentMethod,
  };
}

function OrderCard({
  order,
  onDetails,
  onCancel,
  onConfirmDelivery,
  onPayNow,
  busy,
}: {
  order: TrackedOrder;
  onDetails: (order: TrackedOrder) => void;
  onCancel: (order: TrackedOrder) => void;
  onConfirmDelivery: (order: TrackedOrder) => void;
  onPayNow?: (order: TrackedOrder) => void;
  busy?: boolean;
}) {
  const { t } = useAppTranslation();
  const paid = String(order.paymentStatus).toLowerCase() === 'paid';
  const isCod = order.paymentMethod === 'cash_on_delivery';
  const canCancel = order.status === 'pending' && !paid;
  const canConfirm = order.status === 'shipped';
  const canPayNow =
    order.status === 'pending' &&
    !paid &&
    !isCod &&
    Boolean(onPayNow);
  const canViewPaySlip = paid || isCod;
  const orderLabel = `#${order.orderNumber || order.id}`;

  return (
    <View className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <View className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">{orderLabel}</Text>
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-500">
            {formatDate(order.createdAt)} {order.seller?.name ? `- ${order.seller.name}` : ''}
          </Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <View className="mt-4 flex-row flex-wrap gap-3">
        <View className="flex-1 rounded-lg bg-gray-50 p-3 dark:bg-slate-800">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{t('buyer_dashboard.total')}</Text>
          <Text className="mt-1 font-sans text-base font-bold text-green-700 dark:text-green-300">
            {order.totalAmount}
          </Text>
        </View>
        <View className="flex-1 rounded-lg bg-gray-50 p-3 dark:bg-slate-800">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{t('buyer_dashboard.items')}</Text>
          <Text className="mt-1 font-sans text-base font-bold text-gray-950 dark:text-slate-100">
            {order.items.length}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Pressable onPress={() => onDetails(order)} className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-800">
          <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-200">
            {t('buyer_dashboard.details')}
          </Text>
        </Pressable>
        {canPayNow ? (
          <Pressable
            onPress={() => onPayNow?.(order)}
            className="rounded-lg bg-green-600 px-3 py-2">
            <Text className="font-sans text-xs font-semibold text-white">
              {t('buyer_dashboard.pay_now', { defaultValue: 'Pay now' })}
            </Text>
          </Pressable>
        ) : null}
        {canViewPaySlip ? (
          <Link href={`/payment-success?order_id=${encodeURIComponent(String(order.id))}` as Href} asChild>
            <Pressable className="rounded-lg bg-purple-50 px-3 py-2 dark:bg-purple-900/30">
              <Text className="font-sans text-xs font-semibold text-purple-700 dark:text-purple-300">
                {t('buyer_dashboard.pay_slip')}
              </Text>
            </Pressable>
          </Link>
        ) : null}
        {canConfirm ? (
          <Pressable
            onPress={() => onConfirmDelivery(order)}
            disabled={busy}
            className="rounded-lg bg-green-600 px-3 py-2 disabled:opacity-50">
            <Text className="font-sans text-xs font-semibold text-white">
              {busy ? t('buyer_dashboard.saving') : t('buyer_dashboard.confirm_delivery')}
            </Text>
          </Pressable>
        ) : null}
        {canCancel ? (
          <Pressable onPress={() => onCancel(order)} className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/30">
            <Text className="font-sans text-xs font-semibold text-red-700 dark:text-red-300">
              {t('buyer_dashboard.cancel')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function DashboardOverview({
  user,
  orders,
  onTab,
  onOrderDetails,
  onCancel,
  onConfirmDelivery,
  onPayNow,
  confirmingId,
  onResendEmail,
  resendingEmail,
  message,
}: {
  user: BuyerProfile | null;
  orders: TrackedOrder[];
  onTab: (tab: BuyerTab) => void;
  onOrderDetails: (order: TrackedOrder) => void;
  onCancel: (order: TrackedOrder) => void;
  onConfirmDelivery: (order: TrackedOrder) => void;
  onPayNow: (order: TrackedOrder) => void;
  confirmingId: string | number | null;
  onResendEmail: () => void;
  resendingEmail: boolean;
  message: string;
}) {
  const { t } = useAppTranslation();
  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmountValue, 0);
  const delivered = orders.filter((order) => order.status === 'delivered').length;
  const inProgress = orders.filter((order) =>
    ['pending', 'confirmed', 'processing'].includes(order.status)
  ).length;
  const recentOrders = orders.slice(0, 4);
  const firstName = user?.name?.split(' ')[0] || t('buyer_dashboard.buyer');

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 sm:px-6 lg:px-8">
      <View className="mx-auto w-full max-w-7xl gap-6">
        <View className="rounded-2xl bg-green-700 p-6">
          <Text className="font-sans text-2xl font-bold text-white">
            {t('buyer_dashboard.welcome_back', { name: firstName })}
          </Text>
          <Text className="mt-1 font-sans text-sm leading-6 text-green-100">
            {t('buyer_dashboard.overview_subtitle')}
          </Text>
        </View>

        {user?.email && !user.emailVerifiedAt ? (
          <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <View className="min-w-0 flex-1 flex-row items-start gap-3">
                <Feather name="mail" color="#d97706" size={22} />
                <View className="min-w-0 flex-1">
                  <Text className="font-sans text-sm font-bold text-amber-900 dark:text-amber-100">
                    {t('buyer_dashboard.verify_email_title')}
                  </Text>
                  <Text className="mt-1 font-sans text-sm leading-6 text-amber-800 dark:text-amber-200">
                    {t('buyer_dashboard.verify_email_desc')}
                  </Text>
                  {message ? (
                    <Text className="mt-1 font-sans text-xs text-amber-700 dark:text-amber-200">{message}</Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={onResendEmail}
                disabled={resendingEmail}
                className="rounded-xl bg-amber-600 px-4 py-2.5 disabled:opacity-50">
                <Text className="text-center font-sans text-sm font-semibold text-white">
                  {resendingEmail ? t('buyer_dashboard.sending') : t('buyer_dashboard.resend_verification_email')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-3 sm:gap-4">
          <StatCard label={t('buyer_dashboard.total_orders')} value={orders.length} icon="shopping-bag" tone="blue" />
          <StatCard label={t('buyer_dashboard.delivered')} value={delivered} icon="check-circle" tone="green" />
          <StatCard label={t('buyer_dashboard.in_progress')} value={inProgress} icon="clock" tone="indigo" />
          <StatCard label={t('buyer_dashboard.total_spent')} value={formatMMK(totalSpent)} icon="credit-card" tone="purple" />
        </View>

        <View className="flex-row flex-wrap gap-3">
          {[
            { label: t('buyer_dashboard.my_orders'), icon: 'shopping-bag' as const, tab: 'orders' as const },
            { label: t('buyer_dashboard.my_cart'), icon: 'shopping-cart' as const, tab: 'cart' as const },
            { label: t('buyer_dashboard.my_wishlist'), icon: 'heart' as const, tab: 'wishlist' as const },
            { label: t('buyer_dashboard.settings'), icon: 'settings' as const, tab: 'settings' as const },
          ].map((action) => (
            <Pressable
              key={action.tab}
              onPress={() => onTab(action.tab)}
              className="flex-1 min-w-[140px] flex-row items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <Feather name={action.icon} color="#15803d" size={18} />
              <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionCard>
          <View className="mb-5 flex-row items-center justify-between gap-3">
            <View>
              <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
                {t('buyer_dashboard.recent_orders')}
              </Text>
              <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-500">
                {t('buyer_dashboard.recent_orders_subtitle')}
              </Text>
            </View>
            <Pressable onPress={() => onTab('orders')}>
              <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                {t('buyer_dashboard.view')}
              </Text>
            </Pressable>
          </View>

          {recentOrders.length > 0 ? (
            <View className="gap-4 sm:flex-row sm:flex-wrap">
              {recentOrders.map((order) => (
                <View key={String(order.id)} className="w-full sm:w-[48%]">
                  <OrderCard
                    order={order}
                    onDetails={onOrderDetails}
                    onCancel={onCancel}
                    onConfirmDelivery={onConfirmDelivery}
                    onPayNow={onPayNow}
                    busy={String(confirmingId) === String(order.id)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="shopping-bag"
              title={t('buyer_dashboard.no_orders')}
              message={t('buyer_dashboard.no_orders_sub')}
              actionLabel={t('buyer_dashboard.start_shopping')}
              href="/products"
            />
          )}
        </SectionCard>
      </View>
    </ScrollView>
  );
}

function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  href,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  href?: Href;
}) {
  return (
    <View className="items-center py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
        <Feather name={icon} color="#cbd5e1" size={34} />
      </View>
      <Text className="mt-4 text-center font-sans text-lg font-bold text-gray-950 dark:text-slate-100">{title}</Text>
      <Text className="mt-2 max-w-md text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
        {message}
      </Text>
      {actionLabel && href ? (
        <Link href={href} asChild>
          <Pressable className="mt-6 rounded-lg bg-green-600 px-5 py-2.5">
            <Text className="font-sans text-sm font-semibold text-white">{actionLabel}</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

function OrdersPanel({
  orders,
  onDetails,
  onCancel,
  onConfirmDelivery,
  onPayNow,
  confirmingId,
}: {
  orders: TrackedOrder[];
  onDetails: (order: TrackedOrder) => void;
  onCancel: (order: TrackedOrder) => void;
  onConfirmDelivery: (order: TrackedOrder) => void;
  onPayNow: (order: TrackedOrder) => void;
  confirmingId: string | number | null;
}) {
  const { t } = useAppTranslation();
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? orders : orders.filter((order) => order.status === filter);

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 sm:px-6 lg:px-8">
      <View className="mx-auto w-full max-w-7xl">
        <SectionCard>
          <View className="mb-5 gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
              {t('buyer_dashboard.my_orders')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {orderStatuses.map((status) => {
                  const active = filter === status;
                  return (
                    <Pressable
                      key={status}
                      onPress={() => setFilter(status)}
                      className={`rounded-full px-3 py-1.5 ${
                        active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-800'
                      }`}>
                      <Text
                        className={`font-sans text-xs font-semibold ${
                          active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                        }`}>
                        {status === 'all'
                          ? t('buyer_dashboard.all_orders')
                          : t(`buyer_dashboard.order_status.${status}`, { defaultValue: titleCase(status) })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {filtered.length > 0 ? (
            <View className="gap-4">
              {filtered.map((order) => (
                <OrderCard
                  key={String(order.id)}
                  order={order}
                  onDetails={onDetails}
                  onCancel={onCancel}
                  onConfirmDelivery={onConfirmDelivery}
                  onPayNow={onPayNow}
                  busy={String(confirmingId) === String(order.id)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="shopping-bag"
              title={t('buyer_dashboard.no_orders')}
              message={t('buyer_dashboard.no_orders_match_filter')}
            />
          )}
        </SectionCard>
      </View>
    </ScrollView>
  );
}

function HistoryPanel({ orders }: { orders: TrackedOrder[] }) {
  const { t } = useAppTranslation();
  const [search, setSearch] = useState('');
  const history = orders.filter((order) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      order.orderNumber.toLowerCase().includes(query) ||
      (order.seller?.name || '').toLowerCase().includes(query) ||
      order.items.some((item) => item.productName.toLowerCase().includes(query))
    );
  });
  const totalSpent = history.reduce((sum, order) => sum + order.totalAmountValue, 0);

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 sm:px-6 lg:px-8">
      <View className="mx-auto w-full max-w-7xl gap-5">
        <SectionCard>
          <View className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
                {t('buyer_dashboard.purchase_history')}
              </Text>
              <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
                {t('buyer_dashboard.purchase_history_subtitle')}
              </Text>
            </View>
            <View className="flex-row gap-5">
              <View>
                <Text className="text-right font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t('buyer_dashboard.total_records')}
                </Text>
                <Text className="text-right font-sans text-xl font-bold text-blue-600">{history.length}</Text>
              </View>
              <View>
                <Text className="text-right font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t('buyer_dashboard.total_spent')}
                </Text>
                <Text className="text-right font-sans text-xl font-bold text-green-700 dark:text-green-300">
                  {formatMMK(totalSpent)}
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-4 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800">
            <Feather name="search" color="#94a3b8" size={17} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('buyer_dashboard.history_search_placeholder')}
              placeholderTextColor="#94a3b8"
              className="min-h-11 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
            />
          </View>
        </SectionCard>

        {history.length > 0 ? (
          <View className="gap-3">
            {history.map((order) => (
              <View
                key={String(order.id)}
                className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100">
                      #{order.orderNumber}
                    </Text>
                    <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-500">
                      {formatDate(order.createdAt)} {order.seller?.name ? `- ${order.seller.name}` : ''}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                      {order.totalAmount}
                    </Text>
                    <StatusBadge status={order.status} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <SectionCard>
            <EmptyState
              icon="file-text"
              title={t('buyer_dashboard.no_purchase_records')}
              message={t('buyer_dashboard.purchase_history_subtitle')}
            />
          </SectionCard>
        )}
      </View>
    </ScrollView>
  );
}

function CompactCartItem({
  item,
  onQty,
  onRemove,
  busy,
}: {
  item: CartItem;
  onQty: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
  busy: boolean;
}) {
  const productHref = `/products/${item.slug || item.productId}` as Href;

  return (
    <View className="flex-row gap-3 border-b border-gray-100 py-4 dark:border-slate-800">
      <Link href={productHref} asChild>
        <Pressable className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
          <Image
            source={item.imageUrl ? { uri: getThumbUrl(item.imageUrl, 160) } : placeholderProduct}
            className="h-full w-full"
            contentFit="contain"
          />
        </Pressable>
      </Link>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-500">{item.sellingPrice}</Text>
        <View className="mt-3 flex-row items-center gap-2">
          <Pressable
            onPress={() => onQty(item, item.quantity - item.quantityStep)}
            disabled={busy || item.quantity <= item.minOrder}
            className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <Feather name="minus" color="#64748b" size={14} />
          </Pressable>
          <Text className="w-10 text-center font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
            {item.quantity}
          </Text>
          <Pressable
            onPress={() => onQty(item, item.quantity + item.quantityStep)}
            disabled={busy}
            className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <Feather name="plus" color="#64748b" size={14} />
          </Pressable>
          <Pressable onPress={() => onRemove(item)} disabled={busy} className="ml-auto">
            <Feather name="trash-2" color="#dc2626" size={17} />
          </Pressable>
        </View>
      </View>
      <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100">{item.subtotal}</Text>
    </View>
  );
}

function CartPanel() {
  const { t } = useAppTranslation();
  const [cart, setCart] = useState<CartResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [message, setMessage] = useState('');

  const reload = async () => {
    const result = await fetchCart();
    setCart(result);
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchCart(controller.signal);
        if (!controller.signal.aborted) setCart(result);
      } catch (error) {
        if (!controller.signal.aborted) setMessage(formatApiErrorMessage(error, t('cart.fetch_error')));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [t]);

  const handleQty = async (item: CartItem, quantity: number) => {
    if (quantity < item.minOrder) return;
    setBusyId(item.id);
    setMessage('');
    try {
      const result = await updateCartItemQuantity(item.id, quantity);
      setCart(result);
    } catch (error) {
      setMessage(formatApiErrorMessage(error, t('cart.update_failed')));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (item: CartItem) => {
    setBusyId(item.id);
    setMessage('');
    try {
      await removeCartItem(item.id);
      await reload();
    } catch (error) {
      setMessage(formatApiErrorMessage(error, t('cart.remove_failed')));
    } finally {
      setBusyId(null);
    }
  };

  const handleClear = async () => {
    setBusyId('clear');
    setMessage('');
    try {
      await clearCartItems();
      await reload();
    } catch (error) {
      setMessage(formatApiErrorMessage(error, t('cart.clear_failed')));
    } finally {
      setBusyId(null);
    }
  };

  const items = cart?.items || [];
  const canCheckout = items.length > 0 && items.every((item) => item.isAvailable && item.isQuantityValid);

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 sm:px-6 lg:px-8">
      <View className="mx-auto w-full max-w-7xl">
        <SectionCard>
          <View className="mb-5 flex-row items-center justify-between gap-3">
            <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
              {t('buyer_dashboard.my_cart')} {cart?.totalItems ? `(${cart.totalItems})` : ''}
            </Text>
            {items.length > 0 ? (
              <Pressable onPress={handleClear} disabled={busyId === 'clear'} className="flex-row items-center gap-1">
                <Feather name="trash-2" color="#dc2626" size={16} />
                <Text className="font-sans text-sm font-semibold text-red-600">{t('buyer_dashboard.clear')}</Text>
              </Pressable>
            ) : null}
          </View>

          {message ? (
            <Text className="mb-4 rounded-lg bg-red-50 p-3 font-sans text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {message}
            </Text>
          ) : null}

          {loading ? (
            <ActivityIndicator color="#16a34a" />
          ) : items.length > 0 && cart ? (
            <View className="gap-6 lg:flex-row lg:items-start">
              <View className="min-w-0 flex-1">
                {items.map((item) => (
                  <CompactCartItem
                    key={String(item.id)}
                    item={item}
                    onQty={handleQty}
                    onRemove={handleRemove}
                    busy={String(busyId) === String(item.id)}
                  />
                ))}
              </View>
              <View className="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800 lg:w-[34%]">
                <Text className="mb-4 font-sans text-base font-bold text-gray-950 dark:text-slate-100">
                  {t('buyer_dashboard.order_summary')}
                </Text>
                <SummaryLine label={t('buyer_dashboard.subtotal')} value={cart.summary.subtotal} />
                <SummaryLine label={t('buyer_dashboard.shipping')} value={cart.summary.shippingFee} />
                <SummaryLine label={t('buyer_dashboard.tax')} value={cart.summary.tax} />
                <View className="mt-4 border-t border-gray-200 pt-4 dark:border-slate-700">
                  <SummaryLine label={t('buyer_dashboard.total')} value={cart.summary.total} strong />
                </View>
                <Link href="/checkout" asChild>
                  <Pressable
                    disabled={!canCheckout}
                    className="mt-5 rounded-lg bg-green-600 px-4 py-3 disabled:opacity-50">
                    <Text className="text-center font-sans text-sm font-semibold text-white">
                      {t('buyer_dashboard.proceed_to_checkout')}
                    </Text>
                  </Pressable>
                </Link>
                <Link href="/products" asChild>
                  <Pressable className="mt-2 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                      {t('buyer_dashboard.continue_shopping')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ) : (
            <EmptyState
              icon="shopping-cart"
              title={t('buyer_dashboard.empty_cart')}
              message={t('cart.empty_message')}
              actionLabel={t('buyer_dashboard.browse_products')}
              href="/products"
            />
          )}
        </SectionCard>
      </View>
    </ScrollView>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="mb-2 flex-row items-center justify-between gap-3">
      <Text className={`font-sans ${strong ? 'font-bold text-gray-950 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}>
        {label}
      </Text>
      <Text className={`font-sans ${strong ? 'font-bold text-green-700 dark:text-green-300' : 'font-semibold text-gray-950 dark:text-slate-100'}`}>
        {value}
      </Text>
    </View>
  );
}

function WishlistPanel() {
  const { t } = useAppTranslation();
  const { items, loading, refreshWishlist } = useWishlist();
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [message, setMessage] = useState('');

  const handleRemove = async (product: HomeProduct) => {
    const productId = getProductApiId(product);
    setBusyId(productId);
    setMessage('');
    try {
      await removeWishlistItem(productId);
      await refreshWishlist();
    } catch {
      setMessage(t('buyer_dashboard.failed_remove_item'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 sm:px-6 lg:px-8">
      <View className="mx-auto w-full max-w-7xl">
        <SectionCard>
          <Text className="mb-5 font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t('buyer_dashboard.my_wishlist')}
          </Text>
          {message ? (
            <Text className="mb-4 rounded-lg bg-red-50 p-3 font-sans text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {message}
            </Text>
          ) : null}
          {loading ? (
            <ActivityIndicator color="#16a34a" />
          ) : items.length > 0 ? (
            <View className="flex-row flex-wrap gap-4">
              {items.map((product) => (
                <View key={String(product.id)} className="w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:w-[48%] lg:w-[31%]">
                  <View className="flex-row gap-3">
                    <Link href={`/products/${product.id}` as Href} asChild>
                      <Pressable className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">
                        <Image
                          source={product.imageUrl ? { uri: getThumbUrl(product.imageUrl, 160) } : placeholderProduct}
                          className="h-full w-full"
                          contentFit="cover"
                        />
                      </Pressable>
                    </Link>
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100" numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text className="mt-1 font-sans text-sm font-bold text-green-700 dark:text-green-300">
                        {product.price}
                      </Text>
                      <View className="mt-2 flex-row gap-2">
                        <Link href={`/products/${product.id}` as Href} asChild>
                          <Pressable className="rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-slate-800">
                            <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-200">
                              {t('buyer_dashboard.view')}
                            </Text>
                          </Pressable>
                        </Link>
                        <Pressable
                          onPress={() => handleRemove(product)}
                          disabled={String(busyId) === String(getProductApiId(product))}
                          className="rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-900/30">
                          <Text className="font-sans text-xs font-semibold text-red-700 dark:text-red-300">
                            {String(busyId) === String(getProductApiId(product))
                              ? t('buyer_dashboard.removing')
                              : t('buyer_dashboard.remove')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="heart"
              title={t('buyer_dashboard.empty_wishlist')}
              message={t('buyer_dashboard.empty_wishlist_sub')}
              actionLabel={t('buyer_dashboard.browse_products')}
              href="/products"
            />
          )}
        </SectionCard>
      </View>
    </ScrollView>
  );
}

function SettingsPanel({ user, onUpdateUser }: { user: BuyerProfile | null; onUpdateUser: (user: BuyerProfile) => void }) {
  const { t } = useAppTranslation();
  const [section, setSection] = useState<'profile' | 'password' | 'account'>('profile');
  const [profileDraft, setProfileDraft] = useState<BuyerProfilePayload>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    township: user?.township || '',
    country: user?.country || 'Myanmar',
    postal_code: user?.postalCode || '',
  });
  const [passwordDraft, setPasswordDraft] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const updateProfileDraft = (key: keyof BuyerProfilePayload, value: string) => {
    setProfileDraft((current) => ({ ...current, [key]: value }));
  };

  const handleProfileSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateBuyerProfile(profileDraft);
      onUpdateUser(updated);
      setMessage(t('buyer_dashboard.profile_updated'));
    } catch (error) {
      setMessage(formatApiErrorMessage(error, t('buyer_dashboard.update_failed')));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (passwordDraft.next !== passwordDraft.confirm) {
      setMessage(t('buyer_dashboard.passwords_no_match'));
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await updateBuyerPassword(passwordDraft.current, passwordDraft.next, passwordDraft.confirm);
      setPasswordDraft({ current: '', next: '', confirm: '' });
      setMessage(t('buyer_dashboard.password_changed'));
    } catch (error) {
      setMessage(formatApiErrorMessage(error, t('buyer_dashboard.failed_change_password')));
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'profile' as const, label: t('buyer_dashboard.profile') },
    { id: 'password' as const, label: t('buyer_dashboard.password') },
    { id: 'account' as const, label: t('buyer_dashboard.account') },
  ];

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-4 py-6 sm:px-6 lg:px-8">
      <View className="mx-auto w-full max-w-4xl gap-5">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {sections.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSection(item.id);
                  setMessage('');
                }}
                className={`rounded-full px-4 py-2 ${
                  section === item.id ? 'bg-green-600' : 'bg-white dark:bg-slate-900'
                }`}>
                <Text
                  className={`font-sans text-sm font-semibold ${
                    section === item.id ? 'text-white' : 'text-gray-700 dark:text-slate-200'
                  }`}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <SectionCard>
          {message ? (
            <Text className="mb-4 rounded-lg bg-green-50 p-3 font-sans text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
              {message}
            </Text>
          ) : null}

          {section === 'profile' ? (
            <View className="gap-4">
              <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
                {t('buyer_dashboard.personal_information')}
              </Text>
              <Field label={t('buyer_dashboard.full_name')} value={profileDraft.name} onChangeText={(value) => updateProfileDraft('name', value)} />
              <Field label={t('buyer_dashboard.email')} value={profileDraft.email} onChangeText={(value) => updateProfileDraft('email', value)} keyboardType="email-address" />
              <Field label={t('buyer_dashboard.phone')} value={profileDraft.phone} onChangeText={(value) => updateProfileDraft('phone', value)} keyboardType="phone-pad" />
              <Field label={t('buyer_dashboard.address')} value={profileDraft.address} onChangeText={(value) => updateProfileDraft('address', value)} />
              <View className="gap-4 sm:flex-row">
                <View className="flex-1">
                  <Field label={t('checkout.state_region')} value={profileDraft.state} onChangeText={(value) => updateProfileDraft('state', value)} />
                </View>
                <View className="flex-1">
                  <Field label={t('checkout.city')} value={profileDraft.city} onChangeText={(value) => updateProfileDraft('city', value)} />
                </View>
              </View>
              <View className="gap-4 sm:flex-row">
                <View className="flex-1">
                  <Field label={t('checkout.township')} value={profileDraft.township} onChangeText={(value) => updateProfileDraft('township', value)} />
                </View>
                <View className="flex-1">
                  <Field label={t('checkout.postal_code')} value={profileDraft.postal_code} onChangeText={(value) => updateProfileDraft('postal_code', value)} />
                </View>
              </View>
              <Pressable onPress={handleProfileSave} disabled={saving} className="rounded-lg bg-green-600 px-5 py-3 disabled:opacity-50">
                <Text className="text-center font-sans text-sm font-semibold text-white">
                  {saving ? t('buyer_dashboard.saving') : t('buyer_dashboard.save_changes')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {section === 'password' ? (
            <View className="gap-4">
              <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
                {t('buyer_dashboard.change_password')}
              </Text>
              <Field label={t('buyer_dashboard.current_password')} value={passwordDraft.current} secureTextEntry onChangeText={(value) => setPasswordDraft((current) => ({ ...current, current: value }))} />
              <Field label={t('buyer_dashboard.new_password')} value={passwordDraft.next} secureTextEntry onChangeText={(value) => setPasswordDraft((current) => ({ ...current, next: value }))} />
              <Field label={t('buyer_dashboard.confirm_new_password')} value={passwordDraft.confirm} secureTextEntry onChangeText={(value) => setPasswordDraft((current) => ({ ...current, confirm: value }))} />
              <Pressable onPress={handlePasswordSave} disabled={saving} className="rounded-lg bg-green-600 px-5 py-3 disabled:opacity-50">
                <Text className="text-center font-sans text-sm font-semibold text-white">
                  {saving ? t('buyer_dashboard.updating') : t('buyer_dashboard.update_password')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {section === 'account' ? (
            <View className="gap-4">
              <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
                {t('buyer_dashboard.account')}
              </Text>
              <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
                {t('buyer_dashboard.account_deactivation_note')}
              </Text>
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                {user?.createdAt ? t('buyer_dashboard.member_since', { year: new Date(user.createdAt).getFullYear() }) : ''}
              </Text>
              <Pressable className="self-start rounded-lg border border-red-200 px-4 py-2.5 dark:border-red-800">
                <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">
                  {t('buyer_dashboard.request_account_deactivation')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </SectionCard>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        placeholderTextColor="#94a3b8"
        className="min-h-12 rounded-lg border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
    </View>
  );
}

function OrderDetailsModal({
  order,
  onClose,
}: {
  order: TrackedOrder | null;
  onClose: () => void;
}) {
  const { t } = useAppTranslation();

  return (
    <Modal visible={Boolean(order)} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="max-h-[88%] w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900">
          <View className="flex-row items-center justify-between border-b border-gray-100 p-5 dark:border-slate-800">
            <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
              {t('buyer_dashboard.order_details')}
            </Text>
            <Pressable onPress={onClose}>
              <Feather name="x" color="#64748b" size={22} />
            </Pressable>
          </View>
          {order ? (
            <ScrollView className="p-5">
              <View className="gap-5">
                <View className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <View>
                    <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
                      #{order.orderNumber}
                    </Text>
                    <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
                      {formatDate(order.createdAt)}
                    </Text>
                  </View>
                  <StatusBadge status={order.status} />
                </View>

                <View className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800">
                  <Text className="mb-3 font-sans text-sm font-bold text-gray-950 dark:text-slate-100">
                    {t('buyer_dashboard.shipping_address')}
                  </Text>
                  <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
                    {[
                      order.shippingAddress?.name,
                      order.shippingAddress?.phone,
                      order.shippingAddress?.address,
                      order.shippingAddress?.city,
                      order.shippingAddress?.state,
                    ]
                      .filter(Boolean)
                      .join('\n') || '-'}
                  </Text>
                </View>

                <View>
                  <Text className="mb-2 font-sans text-sm font-bold text-gray-950 dark:text-slate-100">
                    {t('buyer_dashboard.items_with_count', { count: order.items.length })}
                  </Text>
                  {order.items.map((item) => (
                    <View key={String(item.id)} className="flex-row justify-between gap-3 border-b border-gray-100 py-3 dark:border-slate-800">
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100" numberOfLines={2}>
                          {item.productName}
                        </Text>
                        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
                          {t('buyer_dashboard.quantity_price_each', { quantity: item.quantity, price: item.price })}
                        </Text>
                      </View>
                      <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100">
                        {item.subtotal}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800">
                  <SummaryLine label={t('buyer_dashboard.subtotal')} value={order.subtotalAmount} />
                  <SummaryLine label={t('buyer_dashboard.shipping')} value={order.shippingFee} />
                  <SummaryLine label={t('buyer_dashboard.tax')} value={order.taxAmount} />
                  {order.couponDiscountAmountValue > 0 ? (
                    <SummaryLine label={t('buyer_dashboard.coupon')} value={`-${order.couponDiscountAmount}`} />
                  ) : null}
                  <View className="mt-3 border-t border-gray-200 pt-3 dark:border-slate-700">
                    <SummaryLine label={t('buyer_dashboard.total')} value={order.totalAmount} strong />
                  </View>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function CancelOrderModal({
  order,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  order: TrackedOrder | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useAppTranslation();

  return (
    <Modal visible={Boolean(order)} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-900">
          <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
            {t('buyer_dashboard.cancel_order')}
          </Text>
          <Text className="mt-2 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
            {t('buyer_dashboard.cancel_order_question', { order: order?.orderNumber || '' })}
          </Text>
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-500">
            {t('buyer_dashboard.cancel_order_warning')}
          </Text>
          {error ? <Text className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</Text> : null}
          <View className="mt-5 gap-3 sm:flex-row sm:justify-end">
            <Pressable onPress={onClose} disabled={loading} className="rounded-lg border border-gray-200 px-4 py-2.5 dark:border-slate-700">
              <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                {t('buyer_dashboard.keep_order')}
              </Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2.5 disabled:opacity-50">
              <Text className="text-center font-sans text-sm font-semibold text-white">
                {loading ? t('buyer_dashboard.cancelling') : t('buyer_dashboard.cancel_order')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function BuyerDashboardNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { user: authUser, isReady, handleUnauthorized } = useDashboardGuard({
    role: 'buyer',
    returnTo: BUYER_DASHBOARD_PATH,
    requireEmailVerification: false,
  });
  const { activeTab, selectTab } = useDashboardTabs<BuyerTab>({
    basePath: BUYER_DASHBOARD_PATH,
    defaultTab: 'dashboard',
    normalizeTab: normalizeBuyerTab,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<BuyerProfile | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<TrackedOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<TrackedOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | number | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [paymentOrder, setPaymentOrder] = useState<CheckoutOrderResult | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);

  const navItems = useMemo(
    () =>
      buyerTabDefinitions.map((tab) => ({
        id: tab.id,
        icon: tab.icon,
        label: t(tab.labelKey),
      })),
    [t],
  );
  const activeTabConfig =
    buyerTabDefinitions.find((tab) => tab.id === activeTab) || buyerTabDefinitions[0];

  const loadOrders = async () => {
    const nextOrders = await fetchBuyerOrders();
    setOrders(nextOrders);
  };

  useEffect(() => {
    if (!isReady) return;

    const controller = new AbortController();
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [profileResult, ordersResult] = await Promise.all([
          fetchBuyerProfile(controller.signal),
          fetchBuyerOrders(controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setUser(profileResult);
          setOrders(ordersResult);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          if (err instanceof ApiError && err.status === 401) {
            await handleUnauthorized();
            return;
          }
          setError(formatApiErrorMessage(err, t('buyer_dashboard.loading_dashboard')));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadDashboard();
    return () => controller.abort();
  }, [handleUnauthorized, isReady, t]);

  const handleSelectTab = useCallback(
    (tab: string) => {
      selectTab(tab as BuyerTab);
      setSidebarOpen(false);
    },
    [selectTab],
  );

  const handleCancelConfirm = async () => {
    if (!cancelOrder) return;
    setCancelling(true);
    setCancelError('');
    try {
      await cancelBuyerOrder(cancelOrder.id);
      setCancelOrder(null);
      await loadOrders();
    } catch (err) {
      setCancelError(formatApiErrorMessage(err, t('buyer_dashboard.cancel_order')));
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmDelivery = async (order: TrackedOrder) => {
    setConfirmingId(order.id);
    try {
      await confirmBuyerOrderDelivery(order.id);
      await loadOrders();
    } catch {
      setError(t('buyer_dashboard.confirm_delivery_failed'));
    } finally {
      setConfirmingId(null);
    }
  };

  const handlePayNow = (order: TrackedOrder) => {
    setPaymentOrder(trackedOrderToCheckoutOrder(order));
    setPaymentVisible(true);
  };

  const handlePaymentSuccess = async (order: CheckoutOrderResult) => {
    setPaymentVisible(false);
    setPaymentOrder(null);
    await loadOrders();
    router.replace({
      pathname: '/payment-success',
      params: { order_id: String(order.id) },
    } as Href);
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    setVerificationMessage('');
    try {
      await resendBuyerVerificationEmail();
      setVerificationMessage(t('buyer_dashboard.email_verification_sent'));
    } catch (err) {
      setVerificationMessage(formatApiErrorMessage(err, t('buyer_dashboard.email_verification_failed')));
    } finally {
      setResendingEmail(false);
    }
  };

  if (!isReady || loading) {
    return (
      <DashboardLoading
        message={t('buyer_dashboard.loading_dashboard')}
        className="flex-1 items-center justify-center bg-green-50 dark:bg-slate-950"
      />
    );
  }

  if (error && !user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-green-50 p-4 dark:bg-slate-950">
        <View className="w-full max-w-md items-center rounded-2xl bg-white p-8 dark:bg-slate-900">
          <Feather name="alert-circle" color="#dc2626" size={38} />
          <Text className="mt-4 text-center font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
            {t('buyer_dashboard.loading_dashboard')}
          </Text>
          <Text className="mt-2 text-center font-sans text-sm text-gray-500 dark:text-slate-400">{error}</Text>
          <Pressable onPress={() => router.push('/login')} className="mt-6 rounded-lg bg-green-600 px-5 py-2.5">
            <Text className="font-sans text-sm font-semibold text-white">{t('auth.login.title')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <DashboardShell
      navItems={navItems}
      navVariant="pill"
      activeTab={activeTab}
      onTab={handleSelectTab}
      title={t(activeTabConfig.labelKey)}
      subtitle={t('buyer_dashboard.buyer_account')}
      dashboardHref={BUYER_DASHBOARD_PATH as Href}
      sidebarOpen={sidebarOpen}
      onSidebarOpen={setSidebarOpen}
      mobileTabBar
      brandSubtitle={t('buyer_dashboard.buyer_account')}
      sidebarHeader={
        <View className="mb-4 flex-row items-center gap-3 px-2">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-green-600">
            <Text className="font-sans text-lg font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'B'}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100" numberOfLines={1}>
              {user?.name || t('buyer_dashboard.buyer')}
            </Text>
            <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
              {t('buyer_dashboard.buyer_account')}
            </Text>
          </View>
        </View>
      }>
      <View className="flex-1">
      {error ? (
        <View className="absolute left-4 right-4 top-4 z-10 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <Pressable onPress={() => setError('')} className="flex-row items-center gap-2">
            <Feather name="alert-circle" color="#dc2626" size={18} />
            <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
            <Feather name="x" color="#dc2626" size={16} />
          </Pressable>
        </View>
      ) : null}

      {activeTab === 'dashboard' ? (
        <DashboardOverview
          user={user}
          orders={orders}
          onTab={(tab) => selectTab(tab)}
          onOrderDetails={setSelectedOrder}
          onCancel={setCancelOrder}
          onConfirmDelivery={handleConfirmDelivery}
          onPayNow={handlePayNow}
          confirmingId={confirmingId}
          onResendEmail={handleResendEmail}
          resendingEmail={resendingEmail}
          message={verificationMessage}
        />
      ) : null}
      {activeTab === 'orders' ? (
        <OrdersPanel
          orders={orders}
          onDetails={setSelectedOrder}
          onCancel={setCancelOrder}
          onConfirmDelivery={handleConfirmDelivery}
          onPayNow={handlePayNow}
          confirmingId={confirmingId}
        />
      ) : null}
      {activeTab === 'history' ? <HistoryPanel orders={orders} /> : null}
      {activeTab === 'cart' ? <CartPanel /> : null}
      {activeTab === 'wishlist' ? <WishlistPanel /> : null}
      {activeTab === 'rfq' ? <BuyerRfqNative /> : null}
      {activeTab === 'settings' ? (
        <SettingsPanel
          key={user?.id || 'buyer'}
          user={user}
          onUpdateUser={(updated) => setUser(updated)}
        />
      ) : null}

      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <CancelOrderModal
        order={cancelOrder}
        loading={cancelling}
        error={cancelError}
        onClose={() => {
          setCancelOrder(null);
          setCancelError('');
        }}
        onConfirm={handleCancelConfirm}
      />
      <CheckoutPaymentModal
        key={String(paymentOrder?.id ?? 'buyer-payment')}
        visible={paymentVisible}
        order={paymentOrder}
        paymentMethod={paymentOrder?.paymentMethod || 'mmqr'}
        onSuccess={(order) => {
          void handlePaymentSuccess(order);
        }}
        onCancel={() => {
          setPaymentVisible(false);
          setPaymentOrder(null);
        }}
      />
      </View>
    </DashboardShell>
  );
}
