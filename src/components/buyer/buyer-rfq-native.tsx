import Feather from '@expo/vector-icons/Feather';
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

import { useAppTranslation } from '@/i18n';
import {
  acceptRfqQuote,
  cancelRfq,
  closeRfq,
  fetchSellerRfqDetail,
  fetchSentRfqs,
  rejectRfqQuote,
  type SellerRfq,
  type SellerRfqQuote,

  formatApiErrorMessage,
} from '@/utils/native-api';

type RfqStatusFilter = 'all' | 'open' | 'quoted' | 'accepted' | 'closed' | 'cancelled';
type Message = { type: 'success' | 'error'; text: string } | null;

const statusFilters: RfqStatusFilter[] = ['all', 'open', 'quoted', 'accepted', 'closed', 'cancelled'];

const statusTone: Record<string, { bg: string; text: string }> = {
  open: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  quoted: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  accepted: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  closed: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

const formatDate = (value: string, compact = false) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: compact ? 'short' : 'long',
    year: compact ? undefined : 'numeric',
  });
};

function StatusBadge({ status, quote = false }: { status: string; quote?: boolean }) {
  const { t } = useAppTranslation();
  const tone = statusTone[status] || statusTone.open;
  const key = quote ? `rfq.status.quote.${status}.label` : `rfq.status.rfq.${status}.label`;
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tone.bg}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${tone.text}`}>
        {t(key, { defaultValue: status.replaceAll('_', ' ') })}
      </Text>
    </View>
  );
}

function QuoteCard({
  quote,
  rfqId,
  canRespond,
  onUpdated,
}: {
  quote: SellerRfqQuote;
  rfqId: string | number;
  canRespond: boolean;
  onUpdated: (rfq: SellerRfq) => void;
}) {
  const { t } = useAppTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const act = async (action: 'accept' | 'reject') => {
    setLoading(true);
    setError('');
    try {
      const next =
        action === 'accept'
          ? await acceptRfqQuote(rfqId, quote.id)
          : await rejectRfqQuote(rfqId, quote.id);
      onUpdated(next);
    } catch (err) {
      setError(formatApiErrorMessage(err, t('rfq.errors.submit_failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <Text className="min-w-0 flex-1 font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
          {quote.sellerName}
        </Text>
        <StatusBadge status={quote.status} quote />
      </View>
      <View className="mb-3 flex-row flex-wrap gap-3">
        <Text className="font-sans text-xs text-gray-600 dark:text-slate-300">
          {t('rfq.quote.unit_price')}: {quote.unitPrice}
        </Text>
        <Text className="font-sans text-xs text-gray-600 dark:text-slate-300">
          {t('rfq.quote.total')}: {quote.totalPrice}
        </Text>
        <Text className="font-sans text-xs text-gray-600 dark:text-slate-300">
          {t('rfq.quote.delivery')}: {quote.deliveryDays} {t('rfq.quote.days')}
        </Text>
      </View>
      {quote.notes ? (
        <Text className="mb-3 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">{quote.notes}</Text>
      ) : null}
      {error ? <Text className="mb-2 font-sans text-xs text-red-600 dark:text-red-400">{error}</Text> : null}
      {quote.status === 'pending' && canRespond ? (
        <View className="flex-row gap-2">
          <Pressable
            disabled={loading}
            onPress={() => void act('reject')}
            className="flex-1 items-center rounded-xl border border-gray-300 px-3 py-2 dark:border-slate-600">
            <Text className="font-sans text-xs font-bold text-gray-600 dark:text-slate-300">
              {t('rfq.actions.decline')}
            </Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={() => void act('accept')}
            className="flex-1 items-center rounded-xl bg-green-600 px-3 py-2">
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="font-sans text-xs font-bold text-white">{t('rfq.actions.accept_quote')}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function DetailModal({
  rfq,
  onClose,
  onUpdated,
}: {
  rfq: SellerRfq | null;
  onClose: () => void;
  onUpdated: (rfq: SellerRfq) => void;
}) {
  const { t } = useAppTranslation();
  const router = useRouter();
  const [data, setData] = useState<SellerRfq | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!rfq) return;
    setLoading(true);
    try {
      const next = await fetchSellerRfqDetail(rfq.id);
      setData(next);
      onUpdated(next);
    } finally {
      setLoading(false);
    }
  }, [onUpdated, rfq]);

  useEffect(() => {
    if (rfq) void refresh();
  }, [rfq, refresh]);

  const current = data && rfq && String(data.id) === String(rfq.id) ? data : rfq;
  if (!current) return null;

  const canRespondToQuotes =
    current.status !== 'cancelled' && current.status !== 'closed' && current.status !== 'accepted';

  return (
    <Modal visible={Boolean(rfq)} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 px-3 py-6">
        <View className="mx-auto max-h-full w-full max-w-3xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900">
          <View className="bg-indigo-600 px-5 py-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-xs font-semibold text-indigo-100">{current.rfqNumber}</Text>
                <Text className="mt-1 font-sans text-xl font-extrabold text-white" numberOfLines={2}>
                  {current.productName}
                </Text>
              </View>
              <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Feather name="x" color="#ffffff" size={18} />
              </Pressable>
            </View>
            <View className="mt-3">
              <StatusBadge status={current.status} />
            </View>
          </View>

          <ScrollView contentContainerClassName="gap-4 p-5">
            {error ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
              </View>
            ) : null}

            <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">
              {current.quantity} {current.unit} · {t('rfq.card.deadline')}: {formatDate(current.deadline) || '-'}
            </Text>

            {current.specifications ? (
              <View className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-900/60">
                <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
                  {t('rfq.form.specifications')}
                </Text>
                <Text className="mt-2 font-sans text-sm leading-6 text-gray-700 dark:text-slate-200">
                  {current.specifications}
                </Text>
              </View>
            ) : null}

            {current.order ? (
              <View className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <Text className="font-sans text-sm font-bold text-green-800 dark:text-green-300">
                  {t('rfq.messages.order_created', { defaultValue: 'Order created from accepted quote' })}
                </Text>
                <Text className="mt-1 font-sans text-xs text-green-700 dark:text-green-400">
                  #{current.order.orderNumber}
                </Text>
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push(
                      `/track-order?order=${encodeURIComponent(current.order!.orderNumber)}` as Href
                    );
                  }}
                  className="mt-3 self-start rounded-lg bg-green-600 px-4 py-2">
                  <Text className="font-sans text-xs font-bold text-white">
                    {t('rfq.actions.track_order', { defaultValue: 'Track order' })}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {current.quotes.length > 0 ? (
              <View className="gap-3">
                <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                  {t('rfq.messages.received_quotations', { count: current.quotes.length })}
                </Text>
                {current.quotes.map((quote) => (
                  <QuoteCard
                    key={String(quote.id)}
                    quote={quote}
                    rfqId={current.id}
                    canRespond={canRespondToQuotes}
                    onUpdated={(next) => {
                      setData(next);
                      onUpdated(next);
                    }}
                  />
                ))}
              </View>
            ) : current.status === 'open' ? (
              <View className="items-center rounded-2xl bg-gray-50 py-8 dark:bg-slate-900/40">
                <Feather name="clock" color="#94a3b8" size={28} />
                <Text className="mt-2 font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">
                  {t('rfq.empty.waiting.title')}
                </Text>
                <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">
                  {t('rfq.empty.waiting.sub')}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
            <View className="flex-row flex-wrap gap-2">
              {['open', 'draft'].includes(current.status) ? (
                <Pressable
                  disabled={closing}
                  onPress={async () => {
                    setClosing(true);
                    setError('');
                    try {
                      await cancelRfq(current.id);
                      await refresh();
                      onClose();
                    } catch (err) {
                      setError(formatApiErrorMessage(err, t('rfq.errors.cancel_failed')));
                    } finally {
                      setClosing(false);
                    }
                  }}
                  className="rounded-lg border border-red-200 px-3 py-2 dark:border-red-800">
                  <Text className="font-sans text-sm text-red-600 dark:text-red-400">
                    {t('rfq.actions.cancel_rfq')}
                  </Text>
                </Pressable>
              ) : null}
              {current.status === 'quoted' ? (
                <Pressable
                  disabled={closing}
                  onPress={async () => {
                    setClosing(true);
                    setError('');
                    try {
                      await closeRfq(current.id);
                      await refresh();
                      onClose();
                    } catch (err) {
                      setError(formatApiErrorMessage(err, t('rfq.errors.close_failed')));
                    } finally {
                      setClosing(false);
                    }
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-600">
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                    {t('rfq.actions.close_bidding')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={() => void refresh()} disabled={loading} className="flex-row items-center gap-1.5 px-3 py-2">
              {loading ? <ActivityIndicator color="#4f46e5" size="small" /> : <Feather name="refresh-cw" color="#64748b" size={16} />}
              <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">{t('rfq.toolbar.refresh')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function BuyerRfqNative() {
  const { t } = useAppTranslation();
  const [rfqs, setRfqs] = useState<SellerRfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RfqStatusFilter>('all');
  const [selectedRfq, setSelectedRfq] = useState<SellerRfq | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRfqs(await fetchSentRfqs());
    } catch (error) {
      setRfqs([]);
      setMessage({
        type: 'error',
        text: formatApiErrorMessage(error, t('rfq.errors.load_failed', { defaultValue: 'Failed to load RFQs.' })),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRfqs = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return rfqs.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch =
        !needle ||
        item.productName.toLowerCase().includes(needle) ||
        item.rfqNumber.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [rfqs, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      quoted: rfqs.filter((item) => item.status === 'quoted').length,
      open: rfqs.filter((item) => item.status === 'open').length,
    }),
    [rfqs]
  );

  const updateListItem = (next: SellerRfq) => {
    setRfqs((current) => current.map((item) => (String(item.id) === String(next.id) ? next : item)));
    setSelectedRfq((current) => (current && String(current.id) === String(next.id) ? next : current));
  };

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xl font-bold text-gray-900 dark:text-white">
            {t('rfq.dashboard.title', 'Request for quote')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('rfq.dashboard.subtitle_buyer', {
              defaultValue: 'Track quotes from sellers and accept the best offer.',
            })}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Link href="/bulk-order-tool" asChild>
            <Pressable className="rounded-lg bg-green-600 px-3 py-2">
              <Text className="font-sans text-xs font-bold text-white">
                {t('bulk_order.title', { defaultValue: 'Bulk order tool' })}
              </Text>
            </Pressable>
          </Link>
          <Pressable onPress={() => void load()} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-600">
            <Feather name="refresh-cw" color="#64748b" size={16} />
          </Pressable>
        </View>
      </View>

      {message ? (
        <Pressable
          onPress={() => setMessage(null)}
          className={`rounded-xl border px-4 py-3 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}>
          <Text
            className={`font-sans text-sm ${
              message.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'
            }`}>
            {message.text}
          </Text>
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        <View className="rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{t('rfq.stats.open')}</Text>
          <Text className="font-sans text-xl font-bold text-blue-700 dark:text-blue-300">{stats.open}</Text>
        </View>
        <View className="rounded-xl bg-purple-50 px-4 py-3 dark:bg-purple-900/20">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{t('rfq.stats.quotes_in')}</Text>
          <Text className="font-sans text-xl font-bold text-purple-700 dark:text-purple-300">{stats.quoted}</Text>
        </View>
      </View>

      <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <View className="gap-3 border-b border-gray-100 px-4 py-4 dark:border-slate-700">
          <View className="flex-row items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-700">
            <Feather name="search" color="#9ca3af" size={16} />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              className="h-11 min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
              placeholder={t('rfq.toolbar.search')}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {statusFilters.map((status) => {
              const active = statusFilter === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  className={`rounded-xl border px-3 py-2 ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-700'
                  }`}>
                  <Text
                    className={`font-sans text-xs font-bold capitalize ${
                      active ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-slate-300'
                    }`}>
                    {status === 'all'
                      ? t('rfq.toolbar.all_statuses')
                      : t(`rfq.status.rfq.${status}.label`, { defaultValue: status })}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View className="p-4">
          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : filteredRfqs.length === 0 ? (
            <View className="items-center py-16">
              <Feather name="file-text" color="#94a3b8" size={32} />
              <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
                {t('rfq.empty.sent.title')}
              </Text>
              <Link href="/bulk-order-tool" asChild>
                <Pressable className="mt-4 rounded-lg bg-indigo-600 px-4 py-2">
                  <Text className="font-sans text-sm font-bold text-white">
                    {t('bulk_order.send_rfq', { defaultValue: 'Send bulk RFQ' })}
                  </Text>
                </Pressable>
              </Link>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-4">
              {filteredRfqs.map((rfq) => (
                <Pressable
                  key={String(rfq.id)}
                  onPress={() => setSelectedRfq(rfq)}
                  className="w-full rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 md:w-[48%]">
                  <View className="mb-2 flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans text-[10px] font-bold uppercase text-gray-400">{rfq.rfqNumber}</Text>
                      <Text className="font-sans text-base font-extrabold text-gray-900 dark:text-white" numberOfLines={1}>
                        {rfq.productName}
                      </Text>
                    </View>
                    <StatusBadge status={rfq.status} />
                  </View>
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                    {rfq.quantity} {rfq.unit} · {rfq.quotesCount} {t('rfq.card.quotes')}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <DetailModal rfq={selectedRfq} onClose={() => setSelectedRfq(null)} onUpdated={updateListItem} />
    </View>
  );
}
