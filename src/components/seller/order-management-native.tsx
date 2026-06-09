import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
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

import { useAppTranslation } from '@/i18n';
import {
  fetchSellerOrders,
  formatMMK,
  setSellerOrderDeliveryMethod,
  updateSellerOrderStatus,
  type SellerManagedOrder,
} from '@/utils/native-api';

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type DeliveryMethod = 'supplier' | 'platform';

const placeholderProduct = require('@/assets/images/placeholder-product.png');

const statusTone: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30',
  confirmed: 'bg-blue-100 dark:bg-blue-900/30',
  processing: 'bg-blue-100 dark:bg-blue-900/30',
  shipped: 'bg-indigo-100 dark:bg-indigo-900/30',
  delivered: 'bg-green-100 dark:bg-green-900/30',
  cancelled: 'bg-red-100 dark:bg-red-900/30',
};

const statusText: Record<string, string> = {
  pending: 'text-yellow-800 dark:text-yellow-300',
  confirmed: 'text-blue-800 dark:text-blue-300',
  processing: 'text-blue-800 dark:text-blue-300',
  shipped: 'text-indigo-800 dark:text-indigo-300',
  delivered: 'text-green-800 dark:text-green-300',
  cancelled: 'text-red-800 dark:text-red-300',
};

const deliveryTone: Record<string, string> = {
  pending: 'bg-gray-100 dark:bg-slate-700',
  awaiting_pickup: 'bg-yellow-100 dark:bg-yellow-900/30',
  picked_up: 'bg-blue-100 dark:bg-blue-900/30',
  in_transit: 'bg-indigo-100 dark:bg-indigo-900/30',
  out_for_delivery: 'bg-orange-100 dark:bg-orange-900/30',
  delivered: 'bg-green-100 dark:bg-green-900/30',
  failed: 'bg-red-100 dark:bg-red-900/30',
  cancelled: 'bg-gray-100 dark:bg-slate-700',
};

const deliveryText: Record<string, string> = {
  pending: 'text-gray-700 dark:text-slate-300',
  awaiting_pickup: 'text-yellow-800 dark:text-yellow-300',
  picked_up: 'text-blue-800 dark:text-blue-300',
  in_transit: 'text-indigo-800 dark:text-indigo-300',
  out_for_delivery: 'text-orange-800 dark:text-orange-300',
  delivered: 'text-green-800 dark:text-green-300',
  failed: 'text-red-800 dark:text-red-300',
  cancelled: 'text-gray-700 dark:text-slate-300',
};

const formatDate = (value: string) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const calculatePlatformFee = (weight = 5) => 5000 + weight * 100;
const hasDeliveryMethodChoice = (order: SellerManagedOrder) => {
  const delivery = order.delivery;
  return Boolean(delivery?.trackingNumber) && delivery?.status !== 'pending';
};

function StatusBadge({ status, delivery = false }: { status: string; delivery?: boolean }) {
  const { t } = useAppTranslation();
  const bg = delivery ? deliveryTone[status] : statusTone[status];
  const text = delivery ? deliveryText[status] : statusText[status];

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg || 'bg-gray-100 dark:bg-slate-700'}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${text || 'text-gray-700 dark:text-slate-300'}`}>
        {t(`seller.order.statuses.${status}`, { defaultValue: status.replaceAll('_', ' ') })}
      </Text>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  tone: 'yellow' | 'blue' | 'green' | 'red';
}) {
  const colors = {
    yellow: ['bg-yellow-50 dark:bg-yellow-900/20', '#ca8a04'],
    blue: ['bg-blue-50 dark:bg-blue-900/20', '#2563eb'],
    green: ['bg-green-50 dark:bg-green-900/20', '#16a34a'],
    red: ['bg-red-50 dark:bg-red-900/20', '#dc2626'],
  } as const;
  const [bg, color] = colors[tone];

  return (
    <View className={`w-[48%] rounded-xl p-4 lg:w-[23%] ${bg}`}>
      <Feather name={icon} color={color} size={22} />
      <Text className="mt-3 font-sans text-2xl font-black text-gray-950 dark:text-slate-100">{value}</Text>
      <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function DeliveryMethodModal({
  order,
  loading,
  onClose,
  onConfirm,
}: {
  order: SellerManagedOrder | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (method: DeliveryMethod, pickupAddress: string) => void;
}) {
  const { t } = useAppTranslation();
  const [method, setMethod] = useState<DeliveryMethod>('supplier');
  const [pickupAddress, setPickupAddress] = useState('');
  const [addressError, setAddressError] = useState('');

  if (!order) return null;

  const platformFee = calculatePlatformFee(order.delivery?.packageWeight || 5);
  const submit = () => {
    if (method === 'platform' && !pickupAddress.trim()) {
      setAddressError(t('seller.order.delivery.pickup_required'));
      return;
    }
    onConfirm(method, pickupAddress.trim());
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
          <View className="flex-row items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-base font-semibold text-gray-900 dark:text-white">
                {t('seller.order.delivery.set_method')}
              </Text>
              <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                {t('seller.order.order_number', { number: order.orderNumber })}
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-lg p-1.5">
              <Feather name="x-circle" color="#94a3b8" size={22} />
            </Pressable>
          </View>

          <View className="gap-4 border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
            <View className="flex-row items-start gap-2">
              <Feather name="alert-circle" color="#f59e0b" size={20} />
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-sm font-semibold text-amber-900 dark:text-amber-300">
                  {t('seller.order.delivery.choose_method')}
                </Text>
                <Text className="mt-0.5 font-sans text-xs leading-5 text-amber-700 dark:text-amber-400">
                  {t('seller.order.delivery.choose_method_desc')}
                </Text>
              </View>
            </View>

            <View className="gap-3 sm:flex-row">
              {(['supplier', 'platform'] as DeliveryMethod[]).map((item) => {
                const active = method === item;
                const isPlatform = item === 'platform';
                return (
                  <Pressable
                    key={item}
                    onPress={() => setMethod(item)}
                    className={`flex-1 rounded-xl border-2 p-4 ${
                      active
                        ? isPlatform
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                    }`}>
                    <View className="mb-2 flex-row items-center gap-3">
                      <View className={`h-9 w-9 items-center justify-center rounded-full ${isPlatform ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                        <Feather name={isPlatform ? 'home' : 'truck'} color={isPlatform ? '#2563eb' : '#475569'} size={18} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-white">
                          {t(isPlatform ? 'seller.order.delivery.platform' : 'seller.order.delivery.self')}
                        </Text>
                        <Text className={`font-sans text-xs font-semibold ${isPlatform ? 'text-blue-600 dark:text-blue-400' : 'text-green-600'}`}>
                          {isPlatform
                            ? t('seller.order.delivery.fee', { amount: formatMMK(platformFee) })
                            : t('seller.order.delivery.free')}
                        </Text>
                      </View>
                    </View>
                    {[1, 2, 3].map((point) => (
                      <Text key={point} className="font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                        {t(`seller.order.delivery.${isPlatform ? 'platform' : 'self'}_point_${point}`)}
                      </Text>
                    ))}
                  </Pressable>
                );
              })}
            </View>

            <View>
              <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {method === 'platform' ? t('seller.order.delivery.pickup_address') : t('seller.order.delivery.store_address')}
              </Text>
              <View className={`flex-row items-center rounded-lg border bg-white px-3 py-2 dark:bg-slate-800 ${addressError ? 'border-red-400' : 'border-gray-300 dark:border-slate-600'}`}>
                <Feather name="map-pin" color="#94a3b8" size={16} />
                <TextInput
                  value={pickupAddress}
                  onChangeText={(value) => {
                    setPickupAddress(value);
                    setAddressError('');
                  }}
                  placeholder={method === 'platform' ? t('seller.order.delivery.pickup_placeholder') : t('seller.order.delivery.store_placeholder')}
                  placeholderTextColor="#94a3b8"
                  className="ml-2 min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
                />
              </View>
              {addressError ? <Text className="mt-1 font-sans text-xs text-red-500">{addressError}</Text> : null}
            </View>

            <Pressable
              onPress={submit}
              disabled={loading}
              className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 disabled:opacity-50">
              {loading ? <ActivityIndicator color="#ffffff" /> : <Feather name="check" color="#ffffff" size={16} />}
              <Text className="font-sans text-sm font-semibold text-white">
                {loading
                  ? t('seller.order.saving')
                  : t('seller.order.delivery.confirm_method', {
                      method: t(method === 'supplier' ? 'seller.order.delivery.self' : 'seller.order.delivery.platform'),
                    })}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OrderDetailsModal({
  order,
  actionLoading,
  onClose,
  onStatus,
  onDelivery,
}: {
  order: SellerManagedOrder | null;
  actionLoading: string;
  onClose: () => void;
  onStatus: (order: SellerManagedOrder, status: 'confirmed' | 'shipped') => void;
  onDelivery: (order: SellerManagedOrder) => void;
}) {
  const { t } = useAppTranslation();
  if (!order) return null;
  const needsMethod = order.status === 'confirmed' && !hasDeliveryMethodChoice(order);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 p-4">
        <View className="mx-auto my-6 max-h-[92%] w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="flex-row items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-xl font-semibold text-gray-900 dark:text-white">
                {t('seller.order.order_number', { number: order.orderNumber })}
              </Text>
              <View className="mt-1">
                <StatusBadge status={order.status} />
              </View>
            </View>
            <Pressable onPress={onClose}>
              <Feather name="x-circle" color="#94a3b8" size={24} />
            </Pressable>
          </View>
          <ScrollView className="max-h-[78vh]" contentContainerClassName="gap-6 p-5">
            <View className="gap-6 lg:flex-row">
              <View className="min-w-0 flex-1">
                <Text className="mb-3 font-sans text-lg font-semibold text-gray-900 dark:text-white">
                  {t('seller.order.order_items', { count: order.items.length })}
                </Text>
                <View className="gap-3">
                  {order.items.map((item) => (
                    <View key={String(item.id)} className="flex-row gap-3 rounded-lg border border-gray-100 p-3 dark:border-slate-700">
                      <Image source={item.imageUrl ? { uri: item.imageUrl } : placeholderProduct} className="h-14 w-14 rounded-lg bg-gray-100" contentFit="cover" />
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-white" numberOfLines={2}>{item.productName}</Text>
                        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
                          {t('seller.order.qty_each', { quantity: item.quantity, price: item.price })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View className="gap-4 lg:w-80">
                <View className="rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50">
                  <Text className="font-sans text-base font-semibold text-gray-900 dark:text-white">{t('seller.order.delivery_address')}</Text>
                  <Text className="mt-2 font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">{order.shippingAddress.fullName || order.customerName}</Text>
                  <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">{order.shippingAddress.address}</Text>
                  <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
                    {[order.shippingAddress.township, order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', ')}
                  </Text>
                  <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">{order.shippingAddress.phone || order.customerPhone}</Text>
                </View>

                <View className="rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50">
                  <Text className="font-sans text-base font-semibold text-gray-900 dark:text-white">{t('seller.order.order_summary')}</Text>
                  {[
                    [t('seller.order.subtotal'), order.subtotalAmount],
                    [t('seller.order.shipping'), order.shippingFee],
                    [t('seller.order.tax'), order.taxAmount],
                  ].map(([label, value]) => (
                    <View key={label} className="mt-2 flex-row justify-between">
                      <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">{label}</Text>
                      <Text className="font-sans text-sm text-gray-900 dark:text-white">{value}</Text>
                    </View>
                  ))}
                  {order.couponDiscountAmountValue > 0 ? (
                    <View className="mt-2 flex-row justify-between">
                      <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">{t('seller.order.discount')}</Text>
                      <Text className="font-sans text-sm text-red-600">-{order.couponDiscountAmount}</Text>
                    </View>
                  ) : null}
                  <View className="mt-3 flex-row justify-between border-t border-gray-200 pt-3 dark:border-slate-600">
                    <Text className="font-sans text-base font-bold text-gray-900 dark:text-white">{t('seller.order.total')}</Text>
                    <Text className="font-sans text-base font-bold text-green-600">{order.totalAmount}</Text>
                  </View>
                </View>
              </View>
            </View>

            {needsMethod ? (
              <Pressable onPress={() => onDelivery(order)} className="flex-row items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3">
                <Feather name="truck" color="#ffffff" size={17} />
                <Text className="font-sans text-sm font-bold text-white">{t('seller.order.delivery.set_delivery_action')}</Text>
              </Pressable>
            ) : order.delivery?.deliveryMethod ? (
              <View className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <Text className="font-sans text-sm font-semibold text-blue-900 dark:text-blue-300">{t('seller.order.delivery.platform_tracking')}</Text>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <StatusBadge status={order.delivery.status} delivery />
                  {order.delivery.trackingNumber ? <Text className="font-sans text-xs text-blue-700">#{order.delivery.trackingNumber}</Text> : null}
                </View>
                {order.delivery.pickupAddress ? (
                  <Text className="mt-2 font-sans text-xs text-blue-700 dark:text-blue-400">
                    {t('seller.order.delivery.pickup_from')}: {order.delivery.pickupAddress}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="gap-3 border-t border-gray-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-end">
              {order.status === 'pending' ? (
                <Pressable disabled={actionLoading === String(order.id)} onPress={() => onStatus(order, 'confirmed')} className="rounded-lg bg-blue-600 px-4 py-2.5 disabled:opacity-50">
                  <Text className="text-center font-sans text-sm font-semibold text-white">
                    {actionLoading === String(order.id) ? t('seller.order.saving') : t('seller.order.confirm_order')}
                  </Text>
                </Pressable>
              ) : null}
              {order.status === 'confirmed' && order.delivery?.deliveryMethod === 'supplier' ? (
                <Pressable disabled={actionLoading === String(order.id)} onPress={() => onStatus(order, 'shipped')} className="rounded-lg bg-green-600 px-4 py-2.5 disabled:opacity-50">
                  <Text className="text-center font-sans text-sm font-semibold text-white">{t('seller.order.mark_as_shipped')}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} className="rounded-lg bg-gray-100 px-4 py-2.5 dark:bg-slate-700">
                <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">{t('seller.order.close')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function OrderRow({
  order,
  actionLoading,
  onView,
  onConfirm,
  onDelivery,
  onSlip,
}: {
  order: SellerManagedOrder;
  actionLoading: string;
  onView: (order: SellerManagedOrder) => void;
  onConfirm: (order: SellerManagedOrder) => void;
  onDelivery: (order: SellerManagedOrder) => void;
  onSlip: (order: SellerManagedOrder) => void;
}) {
  const { t } = useAppTranslation();
  const needsMethod = order.status === 'confirmed' && !hasDeliveryMethodChoice(order);

  return (
    <View className="min-h-[82px] w-full flex-row items-center border-b border-gray-200 bg-white px-4 py-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-800">
      <View className="w-36 pr-4">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>#{order.orderNumber}</Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{formatDate(order.createdAt)}</Text>
      </View>

      <View className="w-52 pr-4">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>{order.customerName}</Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>{order.customerPhone || order.customerEmail || '-'}</Text>
      </View>

      <View className="w-48 pr-4">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>{order.totalAmount}</Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{order.items.length} {t('seller.order.items')}</Text>
      </View>

      <View className="w-36 pr-4">
        <StatusBadge status={order.status} />
      </View>

      <View className="w-44 pr-4">
        {needsMethod ? (
          <Pressable onPress={() => onDelivery(order)} className="self-start flex-row items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-900/30">
            <Feather name="alert-circle" color="#d97706" size={13} />
            <Text className="font-sans text-xs font-semibold text-amber-800 dark:text-amber-300">{t('seller.order.delivery.set_delivery')}</Text>
          </Pressable>
        ) : order.delivery?.deliveryMethod ? (
          <View className="gap-1">
            <View className={`self-start rounded-full px-2 py-0.5 ${order.delivery.deliveryMethod === 'platform' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              <Text className={`font-sans text-xs font-semibold ${order.delivery.deliveryMethod === 'platform' ? 'text-blue-800 dark:text-blue-300' : 'text-green-800 dark:text-green-300'}`}>
                {t(order.delivery.deliveryMethod === 'platform' ? 'seller.order.delivery.platform_short' : 'seller.order.delivery.self_short')}
              </Text>
            </View>
            <StatusBadge status={order.delivery.status} delivery />
          </View>
        ) : (
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{t('seller.order.no_value')}</Text>
        )}
      </View>

      <View className="w-52 flex-row flex-wrap items-center gap-2">
        <Pressable onPress={() => onView(order)} className="h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
          <Feather name="eye" color="#16a34a" size={19} />
        </Pressable>
        <Pressable onPress={() => onSlip(order)} className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <Feather name="download" color="#2563eb" size={19} />
        </Pressable>
        {order.status === 'pending' ? (
          <Pressable disabled={actionLoading === String(order.id)} onPress={() => onConfirm(order)} className="rounded-lg px-2 py-1">
            <Text className="font-sans text-xs font-bold text-blue-600 dark:text-blue-400">
              {actionLoading === String(order.id) ? '...' : t('seller.order.confirm')}
            </Text>
          </Pressable>
        ) : null}
        {needsMethod ? (
          <Pressable disabled={actionLoading === `delivery-${order.id}`} onPress={() => onDelivery(order)} className="flex-row items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 disabled:opacity-50">
            <Feather name="truck" color="#ffffff" size={14} />
            <Text className="font-sans text-xs font-bold text-white">{t('seller.order.delivery.set_delivery_action')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function OrderManagementNative() {
  const { t } = useAppTranslation();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('all');
  const [orders, setOrders] = useState<SellerManagedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SellerManagedOrder | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<SellerManagedOrder | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  const statuses = useMemo(
    () =>
      (['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((id) => ({
        id,
        name: t(id === 'all' ? 'seller.order.all_orders' : `seller.order.${id}`),
      })),
    [t]
  );

  const loadOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      setOrders(await fetchSellerOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('seller.order.errors.load_failed'));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadOrders(true), 0);
    return () => clearTimeout(timeout);
  }, [loadOrders]);

  const filteredOrders = selectedStatus === 'all' ? orders : orders.filter((order) => order.status === selectedStatus);
  const stats = {
    pending: orders.filter((order) => order.status === 'pending').length,
    processing: orders.filter((order) => ['confirmed', 'processing', 'shipped'].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === 'delivered').length,
    cancelled: orders.filter((order) => order.status === 'cancelled').length,
  };

  const replaceOrder = (next: SellerManagedOrder | null, fallback: SellerManagedOrder) => {
    const updated = next || fallback;
    setOrders((current) => current.map((order) => (String(order.id) === String(updated.id) ? updated : order)));
    setSelectedOrder((current) => (current && String(current.id) === String(updated.id) ? updated : current));
  };

  const changeStatus = async (order: SellerManagedOrder, status: 'confirmed' | 'shipped') => {
    setActionLoading(String(order.id));
    setError('');
    try {
      const next = await updateSellerOrderStatus(order.id, status);
      replaceOrder(next, { ...order, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('seller.order.errors.status_update_failed'));
    } finally {
      setActionLoading('');
    }
  };

  const confirmDeliveryMethod = async (method: DeliveryMethod, pickupAddress: string) => {
    if (!deliveryOrder) return;
    setActionLoading(`delivery-${deliveryOrder.id}`);
    setError('');
    try {
      const next = await setSellerOrderDeliveryMethod(
        deliveryOrder.id,
        method,
        pickupAddress,
        deliveryOrder.delivery?.packageWeight || 5
      );
      replaceOrder(next, deliveryOrder);
      setDeliveryOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('seller.order.errors.delivery_method_failed'));
    } finally {
      setActionLoading('');
    }
  };

  const openOrderSlip = (order: SellerManagedOrder) => {
    const text = `${t('seller.order.slip.title')} #${order.orderNumber}\n${t('seller.order.customer')}: ${order.customerName}\n${t('seller.order.total')}: ${order.totalAmount}`;
    void Linking.openURL(`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`).catch(() => {
      setError(t('seller.order.download_order_slip'));
    });
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <OrderDetailsModal
        order={selectedOrder}
        actionLoading={actionLoading}
        onClose={() => setSelectedOrder(null)}
        onStatus={changeStatus}
        onDelivery={setDeliveryOrder}
      />
      <DeliveryMethodModal
        order={deliveryOrder}
        loading={Boolean(deliveryOrder && actionLoading === `delivery-${deliveryOrder.id}`)}
        onClose={() => setDeliveryOrder(null)}
        onConfirm={confirmDeliveryMethod}
      />

      <View className="gap-1">
        <Text className="font-sans text-xl font-semibold text-gray-900 dark:text-white">{t('seller.order.order_management')}</Text>
        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{t('seller.order.manage_delivery_subtitle')}</Text>
      </View>

      {error ? (
        <Pressable onPress={() => setError('')} className="flex-row items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" color="#dc2626" size={17} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Feather name="x-circle" color="#dc2626" size={16} />
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        <SummaryCard label={t('seller.order.pending')} value={stats.pending} icon="clock" tone="yellow" />
        <SummaryCard label={t('seller.order.processing')} value={stats.processing} icon="truck" tone="blue" />
        <SummaryCard label={t('seller.order.delivered')} value={stats.delivered} icon="check-circle" tone="green" />
        <SummaryCard label={t('seller.order.cancelled')} value={stats.cancelled} icon="x-circle" tone="red" />
      </View>

      <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
          <View className="flex-row gap-2 px-1">
            {statuses.map((status) => {
              const active = selectedStatus === status.id;
              const count = status.id === 'all' ? orders.length : orders.filter((order) => order.status === status.id).length;
              return (
                <Pressable
                  key={status.id}
                  onPress={() => setSelectedStatus(status.id)}
                  className={`rounded-full px-4 py-1.5 ${active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-700'}`}>
                  <Text className={`font-sans text-sm font-semibold ${active ? 'text-white' : 'text-gray-700 dark:text-slate-300'}`}>
                    {status.name}{status.id === 'all' ? '' : ` (${count})`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <Pressable onPress={() => void loadOrders(false)} className="flex-row items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={15} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">{t('seller.order.refresh')}</Text>
        </Pressable>
      </View>

      <View className="overflow-hidden rounded-xl bg-white shadow dark:bg-slate-800">
        {filteredOrders.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[1072px]">
              <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                {[
                  { label: t('seller.order.order_id'), width: 'w-36' },
                  { label: t('seller.order.customer'), width: 'w-52' },
                  { label: t('seller.order.total'), width: 'w-48' },
                  { label: t('seller.order.status'), width: 'w-36' },
                  { label: 'Delivery', width: 'w-44' },
                  { label: t('seller.order.actions'), width: 'w-52' },
                ].map((heading) => (
                  <Text key={heading.label} className={`${heading.width} pr-4 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400`}>
                    {heading.label}
                  </Text>
                ))}
              </View>
              {filteredOrders.map((order) => (
                <OrderRow
                  key={String(order.id)}
                  order={order}
                  actionLoading={actionLoading}
                  onView={setSelectedOrder}
                  onConfirm={(item) => void changeStatus(item, 'confirmed')}
                  onDelivery={setDeliveryOrder}
                  onSlip={openOrderSlip}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className="items-center py-12">
            <Feather name="shopping-bag" color="#cbd5e1" size={56} />
            <Text className="mt-3 font-sans text-base font-semibold text-gray-900 dark:text-white">{t('seller.order.no_orders')}</Text>
            <Text className="mt-1 text-center font-sans text-sm text-gray-500 dark:text-slate-400">{t('seller.order.no_orders_filter')}</Text>
          </View>
        )}
        <View className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
          <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('seller.order.showing_count', { shown: filteredOrders.length, total: orders.length })}
          </Text>
        </View>
      </View>
    </View>
  );
}
