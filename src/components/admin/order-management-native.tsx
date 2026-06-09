import Feather from '@expo/vector-icons/Feather';
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

import { useAppTranslation } from '@/i18n';
import {
  fetchAdminOrder,
  fetchAdminOrders,
  updateAdminOrderStatus,
  type AdminManagedOrder,
} from '@/utils/native-api';

type OrderStatusFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

const statusTone: Record<string, { wrap: string; text: string }> = {
  pending: {
    wrap: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
  },
  confirmed: {
    wrap: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
  },
  processing: {
    wrap: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-800 dark:text-indigo-300',
  },
  shipped: {
    wrap: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-300',
  },
  delivered: {
    wrap: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
  },
  cancelled: {
    wrap: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
  },
};

const paymentTone: Record<string, { wrap: string; text: string }> = {
  paid: {
    wrap: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
  },
  pending: {
    wrap: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
  },
  failed: {
    wrap: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
  },
  refunded: {
    wrap: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
  },
};

const formatDate = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-MM', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const tone = statusTone[status] || statusTone.pending;
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${tone.text}`}>
        {t(`admin.orderManagement.status.${status}`, status.replaceAll('_', ' '))}
      </Text>
    </View>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const tone = paymentTone[status] || paymentTone.pending;
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${tone.text}`}>
        {t(`admin.orderManagement.paymentStatus.${status}`, status)}
      </Text>
    </View>
  );
}

function DeliverySummary({ order }: { order: AdminManagedOrder }) {
  const { t } = useAppTranslation();
  const delivery = order.delivery;
  if (!delivery) {
    return <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">—</Text>;
  }

  const needsMethod = order.status === 'confirmed' && (!delivery.deliveryMethod || delivery.deliveryMethod === 'pending');

  return (
    <View className="gap-1">
      {needsMethod ? (
        <Text className="font-sans text-xs font-medium text-amber-700 dark:text-amber-300">
          {t('admin.orderManagement.awaitingSellerMethod', 'Awaiting seller method')}
        </Text>
      ) : delivery.deliveryMethod ? (
        <Text className="font-sans text-xs font-medium text-gray-700 dark:text-slate-300">
          {delivery.deliveryMethod === 'platform'
            ? t('admin.orderManagement.delivery.platform', 'Platform')
            : t('admin.orderManagement.delivery.self', 'Self')}
        </Text>
      ) : null}
      {delivery.status ? (
        <Text className="font-sans text-[11px] capitalize text-gray-500 dark:text-slate-400">
          {delivery.status.replaceAll('_', ' ')}
        </Text>
      ) : null}
      {delivery.trackingNumber ? (
        <Text className="font-sans text-[11px] text-gray-400 dark:text-slate-500">
          #{delivery.trackingNumber}
        </Text>
      ) : null}
    </View>
  );
}

function StatusPickerModal({
  order,
  loading,
  onClose,
  onSelect,
}: {
  order: AdminManagedOrder | null;
  loading: boolean;
  onClose: () => void;
  onSelect: (status: string) => void;
}) {
  const { t } = useAppTranslation();
  if (!order) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 p-4" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="mx-auto mt-auto w-full max-w-md rounded-2xl bg-white p-5 dark:bg-slate-900">
          <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">
            {t('admin.orderManagement.changeStatus', 'Change order status')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            #{order.orderNumber}
          </Text>
          <View className="mt-4 gap-2">
            {ORDER_STATUSES.map((status) => {
              const active = order.status === status;
              return (
                <Pressable
                  key={status}
                  disabled={loading || active}
                  onPress={() => onSelect(status)}
                  className={`rounded-xl border px-4 py-3 ${
                    active
                      ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  } ${loading ? 'opacity-50' : ''}`}>
                  <Text
                    className={`font-sans text-sm font-semibold capitalize ${
                      active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-200'
                    }`}>
                    {t(`admin.orderManagement.status.${status}`, status)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={onClose} className="mt-4 items-center py-2">
            <Text className="font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">
              {t('admin.orderManagement.cancel', 'Cancel')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onChangeStatus,
}: {
  order: AdminManagedOrder | null;
  onClose: () => void;
  onChangeStatus: (order: AdminManagedOrder) => void;
}) {
  const { t } = useAppTranslation();
  if (!order) return null;

  const address = order.shippingAddress;
  const addressLine = [address.address, address.city, address.state].filter(Boolean).join(', ');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 p-4">
        <View className="mx-auto my-6 max-h-[92%] w-full max-w-3xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
          <View className="flex-row items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
                {t('admin.orderManagement.orderNumber', { number: order.orderNumber, defaultValue: `Order #${order.orderNumber}` })}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <StatusBadge status={order.status} />
                <PaymentBadge status={order.paymentStatus} />
              </View>
            </View>
            <Pressable onPress={onClose}>
              <Feather name="x" color="#64748b" size={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-5 p-5">
            <View className="flex-row flex-wrap gap-4">
              <View className="min-w-[140px] flex-1">
                <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                  {t('admin.orderManagement.date', 'Date')}
                </Text>
                <Text className="mt-1 font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                  {formatDate(order.createdAt)}
                </Text>
              </View>
              <View className="min-w-[140px] flex-1">
                <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                  {t('admin.orderManagement.buyer', 'Buyer')}
                </Text>
                <Text className="mt-1 font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                  {order.buyerName}
                </Text>
              </View>
              <View className="min-w-[140px] flex-1">
                <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                  {t('admin.orderManagement.paymentMethod', 'Payment method')}
                </Text>
                <Text className="mt-1 font-sans text-sm font-medium uppercase text-gray-900 dark:text-slate-100">
                  {order.paymentMethod || '—'}
                </Text>
              </View>
            </View>

            {order.items.length > 0 ? (
              <View>
                <Text className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t('admin.orderManagement.items', 'Items')}
                </Text>
                <View className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                  {order.items.map((item) => (
                    <View
                      key={String(item.id)}
                      className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-slate-700">
                      <Text className="min-w-0 flex-1 font-sans text-sm text-gray-700 dark:text-slate-300">
                        {item.productName} × {item.quantity}
                      </Text>
                      <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {item.subtotal}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800">
              {[
                [t('admin.orderManagement.subtotal', 'Subtotal'), order.subtotalAmount],
                [t('admin.orderManagement.shipping', 'Shipping'), order.shippingFee],
                [t('admin.orderManagement.tax', 'Tax'), order.taxAmount],
              ].map(([label, value]) => (
                <View key={String(label)} className="flex-row justify-between py-1">
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{label}</Text>
                  <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{value}</Text>
                </View>
              ))}
              {order.couponDiscountAmountValue > 0 ? (
                <View className="flex-row justify-between py-1">
                  <Text className="font-sans text-sm text-green-700 dark:text-green-300">
                    {t('admin.orderManagement.coupon', 'Coupon')}
                  </Text>
                  <Text className="font-sans text-sm text-green-700 dark:text-green-300">
                    - {order.couponDiscountAmount}
                  </Text>
                </View>
              ) : null}
              <View className="mt-2 flex-row justify-between border-t border-gray-200 pt-3 dark:border-slate-600">
                <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                  {t('admin.orderManagement.collected', 'Collected')}
                </Text>
                <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                  {order.totalAmount}
                </Text>
              </View>
              <View className="mt-2 flex-row justify-between py-1">
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('admin.orderManagement.sellerPayout', 'Seller payout')}
                </Text>
                <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{order.sellerPayout}</Text>
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('admin.orderManagement.commission', 'Commission')}
                </Text>
                <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{order.commissionAmount}</Text>
              </View>
              <View className="mt-2 flex-row items-center justify-between border-t border-gray-200 pt-3 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('admin.orderManagement.escrow', 'Escrow')}
                </Text>
                <Text className="font-sans text-xs font-semibold capitalize text-gray-700 dark:text-slate-300">
                  {order.escrowStatus.replaceAll('_', ' ')}
                </Text>
              </View>
            </View>

            {address.fullName || addressLine ? (
              <View>
                <Text className="mb-1 font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t('admin.orderManagement.shipTo', 'Ship to')}
                </Text>
                <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
                  {[address.fullName || order.buyerName, address.phone, addressLine].filter(Boolean).join('\n')}
                </Text>
              </View>
            ) : null}

            {order.delivery ? (
              <View className="rounded-xl border border-gray-100 p-4 dark:border-slate-700">
                <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {t('admin.orderManagement.delivery.title', 'Delivery')}
                </Text>
                <View className="mt-2">
                  <DeliverySummary order={order} />
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() => onChangeStatus(order)}
              className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3">
              <Feather name="edit-3" color="#ffffff" size={16} />
              <Text className="font-sans text-sm font-bold text-white">
                {t('admin.orderManagement.changeStatus', 'Change order status')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function OrderRow({
  order,
  statusUpdating,
  onView,
  onChangeStatus,
}: {
  order: AdminManagedOrder;
  statusUpdating: boolean;
  onView: (order: AdminManagedOrder) => void;
  onChangeStatus: (order: AdminManagedOrder) => void;
}) {
  const { t } = useAppTranslation();

  return (
    <View className="min-h-[88px] w-full flex-row items-center border-b border-gray-200 bg-white px-4 py-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-800">
      <View className="w-32 pr-4">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          #{order.orderNumber}
        </Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{formatDate(order.createdAt)}</Text>
      </View>

      <View className="w-40 pr-4">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {order.buyerName}
        </Text>
      </View>

      <View className="w-44 pr-4">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {order.totalAmount}
        </Text>
        <Text className="mt-1 font-sans text-[11px] text-gray-500 dark:text-slate-400" numberOfLines={1}>
          {t('admin.orderManagement.sellerPayoutShort', 'Seller')}: {order.sellerPayout}
        </Text>
        <Text className="font-sans text-[11px] text-gray-500 dark:text-slate-400" numberOfLines={1}>
          {t('admin.orderManagement.commission', 'Commission')}: {order.commissionAmount}
        </Text>
      </View>

      <View className="w-36 pr-4">
        <PaymentBadge status={order.paymentStatus} />
        <Text className="mt-1 font-sans text-[11px] uppercase text-gray-500 dark:text-slate-400" numberOfLines={1}>
          {order.paymentMethod || '—'}
        </Text>
      </View>

      <View className="w-36 pr-4">
        <StatusBadge status={order.status} />
      </View>

      <View className="w-40 pr-4">
        <DeliverySummary order={order} />
      </View>

      <View className="w-32 flex-row items-center gap-2">
        <Pressable
          onPress={() => onView(order)}
          className="h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
          <Feather name="eye" color="#16a34a" size={18} />
        </Pressable>
        <Pressable
          onPress={() => onChangeStatus(order)}
          disabled={statusUpdating}
          className="h-9 w-9 items-center justify-center rounded-lg bg-gray-100 disabled:opacity-50 dark:bg-slate-700">
          <Feather name="edit-3" color="#64748b" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

export function OrderManagementNative() {
  const { t } = useAppTranslation();
  const [orders, setOrders] = useState<AdminManagedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<AdminManagedOrder | null>(null);
  const [statusPickerOrder, setStatusPickerOrder] = useState<AdminManagedOrder | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | number | null>(null);

  const loadOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      setOrders(await fetchAdminOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.orderManagement.errors.load', 'Failed to load orders.'));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadOrders(true), 0);
    return () => clearTimeout(timeout);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.buyerName.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const replaceOrder = (next: AdminManagedOrder) => {
    setOrders((current) =>
      current.map((order) => (String(order.id) === String(next.id) ? next : order)),
    );
    setSelectedOrder((current) =>
      current && String(current.id) === String(next.id) ? next : current,
    );
    setStatusPickerOrder((current) =>
      current && String(current.id) === String(next.id) ? next : current,
    );
  };

  const openOrderDetail = async (row: AdminManagedOrder) => {
    setSelectedOrder(row);
    try {
      const full = await fetchAdminOrder(row.id);
      setSelectedOrder(full);
      replaceOrder(full);
    } catch {
      setError(
        t(
          'admin.orderManagement.errors.detail',
          'Could not load full order details; showing list row only.',
        ),
      );
    }
  };

  const handleStatusChange = async (order: AdminManagedOrder, nextStatus: string) => {
    if (order.status === nextStatus) {
      setStatusPickerOrder(null);
      return;
    }

    setStatusUpdatingId(order.id);
    setError('');
    try {
      const updated = await updateAdminOrderStatus(order.id, order.status, nextStatus);
      replaceOrder(updated);
      setMessage(t('admin.orderManagement.messages.updated', 'Order status updated.'));
      setStatusPickerOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.orderManagement.errors.update', 'Failed to update status.'));
      try {
        const refreshed = await fetchAdminOrder(order.id);
        replaceOrder(refreshed);
      } catch {
        await loadOrders(false);
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const statusFilters = useMemo(
    () =>
      (['all', ...ORDER_STATUSES] as OrderStatusFilter[]).map((id) => ({
        id,
        label:
          id === 'all'
            ? t('admin.orderManagement.filters.all', 'All status')
            : t(`admin.orderManagement.status.${id}`, id),
      })),
    [t],
  );

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  return (
    <View className="gap-5">
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onChangeStatus={setStatusPickerOrder}
      />
      <StatusPickerModal
        order={statusPickerOrder}
        loading={Boolean(statusPickerOrder && statusUpdatingId === statusPickerOrder.id)}
        onClose={() => setStatusPickerOrder(null)}
        onSelect={(status) => {
          if (statusPickerOrder) void handleStatusChange(statusPickerOrder, status);
        }}
      />

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t('admin.orderManagement.title', 'Order Management')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('admin.orderManagement.count', {
              count: filteredOrders.length,
              defaultValue: `${filteredOrders.length} orders`,
            })}
          </Text>
        </View>
        <Pressable
          onPress={() => void loadOrders(false)}
          className="flex-row items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={15} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {t('admin.orderManagement.refresh', 'Refresh')}
          </Text>
        </Pressable>
      </View>

      {message ? (
        <Pressable
          onPress={() => setMessage('')}
          className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" color="#15803d" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-800 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      {error ? (
        <Pressable
          onPress={() => setError('')}
          className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" color="#dc2626" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Pressable onPress={() => void loadOrders(false)}>
            <Text className="font-sans text-xs font-semibold text-red-700 underline dark:text-red-300">
              {t('admin.orderManagement.retry', 'Retry')}
            </Text>
          </Pressable>
        </Pressable>
      ) : null}

      <View className="gap-3 sm:flex-row sm:items-center">
        <View className="min-w-0 flex-1 flex-row items-center rounded-xl border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
          <Feather name="search" color="#94a3b8" size={16} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('admin.orderManagement.searchPlaceholder', 'Search order # or buyer…')}
            placeholderTextColor="#94a3b8"
            className="min-w-0 flex-1 py-2.5 pl-2 font-sans text-sm text-gray-900 dark:text-slate-100"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {statusFilters.map((filter) => {
            const active = statusFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => setStatusFilter(filter.id)}
                className={`rounded-full px-4 py-2 ${active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-800'}`}>
                <Text
                  className={`font-sans text-sm font-semibold capitalize ${
                    active ? 'text-white' : 'text-gray-700 dark:text-slate-300'
                  }`}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {filteredOrders.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-gray-200 py-14 dark:border-slate-700">
          <Feather name="shopping-bag" color="#cbd5e1" size={48} />
          <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
            {search || statusFilter !== 'all'
              ? t('admin.orderManagement.emptyFiltered', 'No orders match your filters.')
              : t('admin.orderManagement.empty', 'No orders yet.')}
          </Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-xl bg-white shadow dark:bg-slate-800">
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[1180px]">
              <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                {[
                  { label: t('admin.orderManagement.columns.order', 'Order #'), width: 'w-32' },
                  { label: t('admin.orderManagement.buyer', 'Buyer'), width: 'w-40' },
                  { label: t('admin.orderManagement.columns.fund', 'Fund'), width: 'w-44' },
                  { label: t('admin.orderManagement.payment', 'Payment'), width: 'w-36' },
                  { label: t('admin.orderManagement.statusLabel', 'Status'), width: 'w-36' },
                  { label: t('admin.orderManagement.delivery.title', 'Delivery'), width: 'w-40' },
                  { label: t('admin.orderManagement.columns.actions', 'Actions'), width: 'w-32' },
                ].map((heading) => (
                  <Text
                    key={heading.label}
                    className={`${heading.width} pr-4 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400`}>
                    {heading.label}
                  </Text>
                ))}
              </View>
              {filteredOrders.map((order) => (
                <OrderRow
                  key={String(order.id)}
                  order={order}
                  statusUpdating={statusUpdatingId === order.id}
                  onView={(item) => void openOrderDetail(item)}
                  onChangeStatus={setStatusPickerOrder}
                />
              ))}
            </View>
          </ScrollView>
          <View className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('admin.orderManagement.showing', {
                shown: filteredOrders.length,
                total: orders.length,
                defaultValue: `Showing ${filteredOrders.length} of ${orders.length} orders`,
              })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
