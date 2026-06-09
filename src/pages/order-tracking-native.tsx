import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useAppTranslation } from '@/i18n';
import { trackOrder, type TrackedOrder } from '@/utils/native-api';

const orderSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const deliverySteps = [
  'pending',
  'awaiting_pickup',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  confirmed: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  processing: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  shipped: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  delivered: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  refunded: { bg: 'bg-gray-50 dark:bg-slate-800', text: 'text-gray-600 dark:text-slate-300', border: 'border-gray-200 dark:border-slate-700' },
  failed: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  paid: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  unpaid: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
};

const formatDate = (value: string, short = false) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(short ? {} : { hour: '2-digit', minute: '2-digit' }),
  }).format(date);
};

const titleCase = (value: string) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '-';

function StatusPill({ status, type = 'order' }: { status: string; type?: 'order' | 'payment' | 'delivery' }) {
  const { t } = useAppTranslation();
  const colors = statusColors[status] || statusColors.refunded;
  const label =
    type === 'payment'
      ? t(`order_tracking.payment_status.${status}`, { defaultValue: titleCase(status) })
      : type === 'delivery'
        ? t(`buyer_dashboard.delivery_status.${status}`, { defaultValue: titleCase(status) })
        : t(`buyer_dashboard.order_status.${status}`, { defaultValue: titleCase(status) });

  return (
    <View className={`rounded-full border px-3 py-1 ${colors.bg} ${colors.border}`}>
      <Text className={`font-sans text-xs font-semibold ${colors.text}`}>{label}</Text>
    </View>
  );
}

function StepBar({
  steps,
  current,
  type,
}: {
  steps: string[];
  current: string;
  type: 'order' | 'delivery';
}) {
  const { t } = useAppTranslation();
  const cancelled = ['cancelled', 'refunded', 'failed'].includes(current);
  const activeIndex = cancelled ? -1 : steps.indexOf(current);

  return (
    <View className="gap-3">
      <View className="flex-row items-center">
        {steps.map((step, index) => {
          const done = !cancelled && activeIndex >= 0 && index < activeIndex;
          const active = !cancelled && index === activeIndex;
          const label =
            type === 'delivery'
              ? t(
                  step === 'pending'
                    ? 'order_tracking.delivery_pending'
                    : step === 'awaiting_pickup'
                      ? 'order_tracking.delivery_awaiting_pickup'
                      : step === 'picked_up'
                        ? 'order_tracking.delivery_picked_up'
                        : step === 'in_transit'
                          ? 'order_tracking.delivery_in_transit'
                          : step === 'out_for_delivery'
                            ? 'order_tracking.out_for_delivery'
                            : 'order_tracking.delivery_delivered'
                )
              : t(`buyer_dashboard.order_status.${step}`, { defaultValue: titleCase(step) });

          return (
            <View key={step} className="min-w-0 flex-1 items-center">
              <View
                className={`h-9 w-9 items-center justify-center rounded-full border-2 ${
                  active || done
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}>
                {done ? (
                  <Feather name="check" color="#ffffff" size={17} />
                ) : (
                  <Text
                    className={`font-sans text-xs font-bold ${
                      active ? 'text-white' : 'text-gray-400 dark:text-slate-500'
                    }`}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                className={`mt-2 text-center font-sans text-[10px] font-medium leading-4 ${
                  active ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-slate-400'
                }`}
                numberOfLines={2}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SectionCard({
  title,
  accent = 'bg-green-500',
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
      <View className="mb-5 flex-row items-center gap-2">
        <View className={`h-4 w-1.5 rounded-full ${accent}`} />
        <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function OrderResults({ order, onReset }: { order: TrackedOrder; onReset: () => void }) {
  const { t } = useAppTranslation();
  const cancelled = ['cancelled', 'refunded'].includes(order.status);

  return (
    <View className="mx-auto w-full max-w-3xl gap-6 px-4 py-10">
      <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <View className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <View>
            <Text className="font-sans text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              {t('order_tracking.order_number')}
            </Text>
            <Text className="mt-1 font-mono text-xl font-bold text-gray-950 dark:text-white">
              {order.orderNumber}
            </Text>
            <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">
              {t('order_tracking.placed_on')} {formatDate(order.createdAt)}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <StatusPill status={order.status} />
            <StatusPill status={order.paymentStatus} type="payment" />
          </View>
        </View>

        {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' ? (
          <View className="mt-4 flex-row items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
            <Feather name="calendar" color="#16a34a" size={22} />
            <View>
              <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                {t('order_tracking.estimated_delivery')}
              </Text>
              <Text className="font-sans text-sm font-bold text-green-900 dark:text-green-100">
                {formatDate(order.estimatedDelivery, true)}
              </Text>
            </View>
          </View>
        ) : null}

        {order.deliveredAt ? (
          <View className="mt-4 flex-row items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
            <Feather name="package" color="#16a34a" size={22} />
            <View>
              <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                {t('order_tracking.delivered_on')}
              </Text>
              <Text className="font-sans text-sm font-bold text-green-900 dark:text-green-100">
                {formatDate(order.deliveredAt)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <SectionCard title={t('order_tracking.order_progress')}>
        {cancelled ? (
          <View className="flex-row gap-3 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <Feather name="x-circle" color="#dc2626" size={24} />
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">
                {titleCase(order.status)}
              </Text>
              <Text className="mt-1 font-sans text-xs text-red-600 dark:text-red-300">
                {t('order_tracking.order_cancelled_msg', { status: titleCase(order.status) })}
              </Text>
            </View>
          </View>
        ) : (
          <StepBar steps={orderSteps} current={order.status} type="order" />
        )}
      </SectionCard>

      {order.delivery ? (
        <SectionCard title={t('order_tracking.delivery_tracking')} accent="bg-blue-500">
          {order.delivery.trackingNumber ? (
            <View className="mb-5 flex-row items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                {t('order_tracking.tracking_number')}
              </Text>
              <Text className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                {order.delivery.trackingNumber}
              </Text>
            </View>
          ) : null}

          {['cancelled', 'failed'].includes(order.delivery.status) ? (
            <View className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <StatusPill status={order.delivery.status} type="delivery" />
              {order.delivery.failureReason ? (
                <Text className="mt-2 font-sans text-xs text-red-600 dark:text-red-300">
                  {order.delivery.failureReason}
                </Text>
              ) : null}
            </View>
          ) : (
            <StepBar steps={deliverySteps} current={order.delivery.status} type="delivery" />
          )}

          <View className="mt-6 flex-row flex-wrap gap-3">
            {order.delivery.carrierName ? (
              <MetaBox label={t('order_tracking.carrier')} value={order.delivery.carrierName} />
            ) : null}
            {order.delivery.method ? (
              <MetaBox label={t('order_tracking.method')} value={titleCase(order.delivery.method)} />
            ) : null}
            {order.delivery.estimatedDeliveryDate ? (
              <MetaBox
                label={t('order_tracking.est_delivery')}
                value={formatDate(order.delivery.estimatedDeliveryDate, true)}
              />
            ) : null}
          </View>

          {order.delivery.updates.length > 0 ? (
            <View className="mt-6">
              <Text className="mb-4 font-sans text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                {t('order_tracking.update_history')}
              </Text>
              <View className="gap-4">
                {[...order.delivery.updates].reverse().map((update, index) => (
                  <View key={`${update.status}-${index}`} className="flex-row gap-3">
                    <View className="mt-1 h-7 w-7 items-center justify-center rounded-full border-2 border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-900/30">
                      <View className="h-2 w-2 rounded-full bg-green-500" />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-white">
                        {titleCase(update.status)}
                      </Text>
                      {update.location ? (
                        <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                          {update.location}
                        </Text>
                      ) : null}
                      {update.notes ? (
                        <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                          {update.notes}
                        </Text>
                      ) : null}
                      <Text className="mt-1 font-sans text-[11px] text-gray-400 dark:text-slate-500">
                        {formatDate(update.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      {order.items.length > 0 ? (
        <SectionCard title={t('order_tracking.items_ordered', { count: order.items.length })} accent="bg-purple-500">
          <View>
            {order.items.map((item) => (
              <View key={String(item.id)} className="flex-row items-center gap-4 border-b border-gray-50 py-3 last:border-b-0 dark:border-slate-700">
                <View className="h-14 w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-slate-600 dark:bg-slate-700">
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} className="h-full w-full" contentFit="cover" />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Feather name="package" color="#94a3b8" size={20} />
                    </View>
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                    {item.productName}
                  </Text>
                  {item.productSku ? (
                    <Text className="mt-0.5 font-mono text-[11px] text-gray-400 dark:text-slate-500">
                      SKU: {item.productSku}
                    </Text>
                  ) : null}
                  <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                    {item.price} x {item.quantity}
                  </Text>
                </View>
                <Text className="font-sans text-sm font-bold text-gray-900 dark:text-white">
                  {item.subtotal}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <View className="gap-6 sm:flex-row">
        <SectionCard title={t('order_tracking.payment_summary')} accent="bg-amber-500">
          <View className="gap-2">
            <SummaryRow label={t('order_tracking.subtotal')} value={order.subtotalAmount} />
            <SummaryRow label={t('order_tracking.shipping_label')} value={order.shippingFee} />
            <SummaryRow label={t('order_tracking.tax_label')} value={order.taxAmount} />
            {order.couponDiscountAmountValue > 0 ? (
              <SummaryRow
                label={t('order_tracking.coupon_discount')}
                value={`-${order.couponDiscountAmount}`}
                danger
              />
            ) : null}
            <View className="mt-2 flex-row justify-between border-t border-gray-100 pt-3 dark:border-slate-700">
              <Text className="font-sans text-sm font-bold text-gray-900 dark:text-white">
                {t('order_tracking.total')}
              </Text>
              <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                {order.totalAmount}
              </Text>
            </View>
            {order.paymentMethod ? (
              <SummaryRow label={t('order_tracking.payment_method_label')} value={titleCase(order.paymentMethod)} />
            ) : null}
          </View>
        </SectionCard>

        <View className="min-w-0 flex-1 gap-4">
          {order.seller ? (
            <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Text className="mb-3 font-sans text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                {t('order_tracking.sold_by')}
              </Text>
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 overflow-hidden rounded-lg bg-green-100 dark:bg-green-900/30">
                  {order.seller.logoUrl ? (
                    <Image source={{ uri: order.seller.logoUrl }} className="h-full w-full" contentFit="cover" />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                        {order.seller.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-white">
                  {order.seller.name}
                </Text>
              </View>
            </View>
          ) : null}

          {order.shippingAddress ? (
            <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Text className="mb-3 font-sans text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                {t('order_tracking.shipping_to')}
              </Text>
              <View className="gap-1">
                {order.shippingAddress.name ? (
                  <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-white">
                    {order.shippingAddress.name}
                  </Text>
                ) : null}
                {order.shippingAddress.address ? (
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                    {order.shippingAddress.address}
                  </Text>
                ) : null}
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                  {[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', ')}
                </Text>
                {order.shippingAddress.phone ? (
                  <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
                    {order.shippingAddress.phone}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View className="items-center py-4">
        <Pressable onPress={onReset}>
          <Text className="font-sans text-sm font-semibold text-green-700 underline dark:text-green-300">
            {t('order_tracking.track_different')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[120px] flex-1 rounded-xl bg-gray-50 p-3 dark:bg-slate-700">
      <Text className="font-sans text-[10px] font-semibold uppercase text-gray-400 dark:text-slate-500">
        {label}
      </Text>
      <Text className="mt-1 font-sans text-sm font-semibold text-gray-900 dark:text-white">{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{label}</Text>
      <Text
        className={`font-sans text-sm font-semibold ${
          danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-200'
        }`}>
        {value}
      </Text>
    </View>
  );
}

function HelpSection() {
  const { t } = useAppTranslation();
  const cards = [
    { icon: 'clipboard' as const, title: t('order_tracking.how_step_0_title'), desc: t('order_tracking.how_step_0_desc') },
    { icon: 'search' as const, title: t('order_tracking.how_step_1_title'), desc: t('order_tracking.how_step_1_desc') },
    { icon: 'package' as const, title: t('order_tracking.how_step_2_title'), desc: t('order_tracking.how_step_2_desc') },
  ];

  return (
    <View className="mx-auto w-full max-w-3xl px-4 py-14">
      <Text className="mb-8 text-center font-sans text-base font-semibold text-gray-500 dark:text-slate-400">
        {t('order_tracking.how_it_works')}
      </Text>
      <View className="gap-5 sm:flex-row">
        {cards.map((card) => (
          <View key={card.title} className="flex-1 items-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
              <Feather name={card.icon} color="#16a34a" size={24} />
            </View>
            <Text className="mb-2 text-center font-sans text-sm font-semibold text-gray-800 dark:text-white">
              {card.title}
            </Text>
            <Text className="text-center font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
              {card.desc}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-10 items-center rounded-2xl border border-green-100 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
        <Text className="font-sans text-sm font-semibold text-green-800 dark:text-green-200">
          {t('order_tracking.need_help')}
        </Text>
        <Text className="mb-4 mt-1 text-center font-sans text-xs text-green-700 dark:text-green-300">
          {t('order_tracking.need_help_desc')}
        </Text>
        <Link href="/contact" asChild>
          <Pressable className="rounded-xl bg-green-600 px-5 py-2.5">
            <Text className="font-sans text-sm font-semibold text-white">
              {t('order_tracking.contact_support')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

export function OrderTrackingNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ order?: string; email?: string }>();
  const initialOrder = typeof params.order === 'string' ? params.order : '';
  const initialEmail = typeof params.email === 'string' ? params.email : '';
  const [input, setInput] = useState(initialOrder);
  const [email, setEmail] = useState(initialEmail);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(initialOrder));
  const [error, setError] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);

  const doSearch = async (value = input) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      setError(t('order_tracking.enter_required'));
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const result = await trackOrder(trimmed, email);
      setOrder(result);
      setInput(trimmed);
      router.setParams({ order: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order_tracking.not_found_sub'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialOrder) return;

    const controller = new AbortController();

    const loadInitialOrder = async () => {
      try {
        const result = await trackOrder(initialOrder, initialEmail, controller.signal);
        if (!controller.signal.aborted) {
          setOrder(result);
          setInput(initialOrder.toUpperCase());
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : t('order_tracking.not_found_sub'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadInitialOrder();

    return () => controller.abort();
    // Run once for the initial route query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppLayout>
      <View className="bg-gray-50 dark:bg-slate-950">
        <View className="bg-green-700">
          <View className="mx-auto w-full max-w-3xl items-center px-4 pb-20 pt-14">
            <View className="mb-5 rounded-full border border-white/20 bg-white/15 px-4 py-1.5">
              <Text className="font-sans text-xs font-semibold uppercase text-white">
                {t('order_tracking.realtime_label')}
              </Text>
            </View>
            <Text className="text-center font-sans text-3xl font-bold text-white sm:text-4xl">
              {t('order_tracking.title')}
            </Text>
            <Text className="mt-3 max-w-xl text-center font-sans text-base leading-7 text-green-100 sm:text-lg">
              {t('order_tracking.hero_desc')}
            </Text>
          </View>
        </View>

        <View className="relative z-10 mx-auto -mt-8 w-full max-w-2xl px-4">
          <View className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:p-8">
            <View className="gap-4">
              <View>
                <Text className="mb-2 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {t('order_tracking.order_number_label')}
                </Text>
                <View className="gap-3 sm:flex-row">
                  <TextInput
                    value={input}
                    onChangeText={(value) => setInput(value.toUpperCase())}
                    placeholder={t('order_tracking.order_number_placeholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 font-mono text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                  <Pressable
                    onPress={() => void doSearch()}
                    disabled={loading}
                    className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-6 disabled:opacity-60">
                    <Feather name="search" color="#ffffff" size={17} />
                    <Text className="font-sans text-sm font-semibold text-white">
                      {loading ? t('order_tracking.searching') : t('order_tracking.track')}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View>
                <Pressable onPress={() => setEmailOpen((current) => !current)} className="flex-row items-center gap-2">
                  <Feather name={emailOpen ? 'chevron-down' : 'chevron-right'} color="#64748b" size={15} />
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                    {t('order_tracking.email_verification')}
                  </Text>
                </Pressable>
                {emailOpen ? (
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('order_tracking.email_placeholder')}
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    className="mt-3 min-h-11 rounded-xl border-2 border-gray-200 bg-white px-4 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                ) : null}
              </View>

              {error ? (
                <View className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <Feather name="alert-triangle" color="#ef4444" size={18} />
                  <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">
                    {error}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-5 flex-row flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-5 dark:border-slate-700">
              <InfoTip icon="mail" text={t('order_tracking.tip_email')} />
              <InfoTip icon="lock" text={t('order_tracking.tip_privacy')} />
            </View>
          </View>
        </View>

        {order ? (
          <OrderResults
            order={order}
            onReset={() => {
              setOrder(null);
              setInput('');
              setEmail('');
              setError('');
              router.setParams({ order: undefined, email: undefined });
            }}
          />
        ) : !loading ? (
          <HelpSection />
        ) : null}
      </View>
    </AppLayout>
  );
}

function InfoTip({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Feather name={icon} color="#94a3b8" size={13} />
      <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{text}</Text>
    </View>
  );
}
