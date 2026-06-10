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
  acceptRfqQuote,
  cancelRfq,
  closeRfq,
  fetchSellerReceivedRfqs,
  fetchSellerRfqDetail,
  fetchSentRfqs,
  rejectRfqQuote,
  submitSellerRfqQuote,
  type SellerRfq,
  type SellerRfqQuote,
} from '@/utils/native-api';

type RfqTab = 'sent' | 'received';
type RfqStatusFilter = 'all' | 'draft' | 'open' | 'quoted' | 'accepted' | 'closed' | 'cancelled';
type Message = { type: 'success' | 'error'; text: string } | null;

const statusFilters: RfqStatusFilter[] = ['all', 'open', 'quoted', 'accepted', 'closed', 'cancelled'];

const statusTone: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-700 dark:text-slate-300', dot: '#94a3b8' },
  open: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: '#2563eb' },
  quoted: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: '#9333ea' },
  accepted: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: '#16a34a' },
  closed: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300', dot: '#64748b' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: '#dc2626' },
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

function ToastMessage({ message, onClose }: { message: Message; onClose: () => void }) {
  if (!message) return null;
  const success = message.type === 'success';
  return (
    <Pressable
      onPress={onClose}
      className={`rounded-xl border px-4 py-3 ${
        success
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      }`}>
      <View className="flex-row items-start gap-2">
        <Feather name={success ? 'check-circle' : 'alert-triangle'} color={success ? '#16a34a' : '#dc2626'} size={16} />
        <Text className={`flex-1 font-sans text-sm font-medium ${success ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
          {message.text}
        </Text>
      </View>
    </Pressable>
  );
}

function StatusBadge({ status, quote = false }: { status: string; quote?: boolean }) {
  const { t } = useAppTranslation();
  const tone = statusTone[status] || statusTone.open;
  const key = quote ? `rfq.status.quote.${status}.label` : `rfq.status.rfq.${status}.label`;
  return (
    <View className={`self-start flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${tone.bg}`}>
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.dot }} />
      <Text className={`font-sans text-xs font-semibold capitalize ${tone.text}`}>
        {t(key, { defaultValue: status.replaceAll('_', ' ') })}
      </Text>
    </View>
  );
}

function HubStatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  icon: keyof typeof Feather.glyphMap;
  tone: 'indigo' | 'emerald';
}) {
  const wrap = tone === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30';
  const iconColor = tone === 'indigo' ? '#4f46e5' : '#059669';
  return (
    <View className={`w-full flex-row items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:w-[48%]`}>
      <View className={`h-12 w-12 items-center justify-center rounded-xl ${wrap}`}>
        <Feather name={icon} color={iconColor} size={22} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</Text>
        <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</Text>
        <Text className="mt-0.5 font-sans text-xs text-amber-600 dark:text-amber-400">{sub}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="w-[48%] rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 lg:w-[23%]">
      <Text className={`font-sans text-2xl font-extrabold ${color}`}>{value}</Text>
      <Text className="mt-0.5 font-sans text-sm font-medium text-gray-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function RfqInfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2 dark:bg-slate-900/60">
      <Text className="font-sans text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">{label}</Text>
      <Text className="mt-0.5 font-sans text-sm font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function RfqListCard({
  rfq,
  mode,
  onOpen,
  onQuote,
}: {
  rfq: SellerRfq;
  mode: RfqTab;
  onOpen: () => void;
  onQuote?: () => void;
}) {
  const { t } = useAppTranslation();
  const needsQuote = mode === 'received' && (rfq.status === 'open' || rfq.status === 'quoted') && !rfq.myQuote;

  return (
    <View className="w-full gap-2 md:w-[48%] xl:w-[31%]">
      <Pressable
        onPress={onOpen}
        className="min-h-[246px] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <View className="mb-3 flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">{rfq.rfqNumber}</Text>
            <Text className="mt-0.5 font-sans text-base font-extrabold text-gray-900 dark:text-slate-100" numberOfLines={1}>
              {rfq.productName}
            </Text>
            {rfq.category ? (
              <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500" numberOfLines={1}>
                {rfq.category}
              </Text>
            ) : null}
          </View>
          <StatusBadge status={rfq.status} />
        </View>

        <View className="mb-3 flex-row gap-2">
          <RfqInfoCell label={t('rfq.card.qty')} value={`${rfq.quantity} ${rfq.unit}`} />
          <RfqInfoCell label={t('rfq.card.deadline')} value={formatDate(rfq.deadline, true) || '-'} />
          <RfqInfoCell
            label={mode === 'sent' ? t('rfq.card.quotes') : t('rfq.card.my_quote')}
            value={
              mode === 'sent'
                ? rfq.quotesCount
                : rfq.myQuote
                  ? t('rfq.submitted')
                  : t('rfq.status.quote.pending.label')
            }
          />
        </View>

        {mode === 'received' && rfq.buyer ? (
          <View className="mb-3 flex-row items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 dark:bg-slate-900/60">
            <Feather name="users" color="#9ca3af" size={14} />
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
              {t('rfq.from')}: {rfq.buyer.name}
            </Text>
          </View>
        ) : null}

        <View className="mt-auto flex-row items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-700">
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
            {t('rfq.card.created')} {formatDate(rfq.createdAt, true)}
          </Text>
          <Feather name="chevron-right" color="#9ca3af" size={18} />
        </View>
      </Pressable>

      {needsQuote && onQuote ? (
        <Pressable onPress={onQuote} className="flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5">
          <Feather name="send" color="#ffffff" size={16} />
          <Text className="font-sans text-xs font-bold text-white">{t('rfq.actions.submit_quotation')}</Text>
        </Pressable>
      ) : null}
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
      setError(err instanceof Error ? err.message : t('rfq.errors.submit_failed'));
    } finally {
      setLoading(false);
    }
  };

  const borderClass =
    quote.status === 'accepted'
      ? 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
      : quote.status === 'rejected'
        ? 'border-gray-200 bg-gray-50 opacity-70 dark:border-slate-700 dark:bg-slate-700/30'
        : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800';

  return (
    <View className={`rounded-2xl border-2 p-4 ${borderClass}`}>
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">{quote.sellerName}</Text>
        </View>
        <StatusBadge status={quote.status} quote />
      </View>
      <View className="mb-3 flex-row flex-wrap gap-3 rounded-xl bg-gray-50 p-3 dark:bg-slate-900/40">
        <RfqInfoCell label={t('rfq.quote.unit_price')} value={quote.unitPrice} />
        <RfqInfoCell label={t('rfq.quote.total')} value={quote.totalPrice} />
        <RfqInfoCell label={t('rfq.quote.delivery')} value={`${quote.deliveryDays} ${t('rfq.quote.days')}`} />
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
            <Text className="font-sans text-xs font-bold text-gray-600 dark:text-slate-300">{t('rfq.actions.decline')}</Text>
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

function RfqDetailModal({
  rfq,
  mode,
  onClose,
  onQuote,
  onUpdated,
}: {
  rfq: SellerRfq | null;
  mode: RfqTab;
  onClose: () => void;
  onQuote?: (rfq: SellerRfq) => void;
  onUpdated: (rfq: SellerRfq) => void;
}) {
  const { t } = useAppTranslation();
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

  const handleCancel = async () => {
    setClosing(true);
    setError('');
    try {
      await cancelRfq(current.id);
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rfq.errors.cancel_failed'));
    } finally {
      setClosing(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    setError('');
    try {
      await closeRfq(current.id);
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rfq.errors.close_failed'));
    } finally {
      setClosing(false);
    }
  };

  return (
    <Modal visible={Boolean(rfq)} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 px-3 py-6 md:px-6">
        <View className="mx-auto max-h-full w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
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

          <ScrollView contentContainerClassName="gap-5 p-5">
            {error ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
              </View>
            ) : null}

            <View className="flex-row flex-wrap gap-2">
              <RfqInfoCell label={t('rfq.card.qty')} value={`${current.quantity} ${current.unit}`} />
              <RfqInfoCell label={t('rfq.card.deadline')} value={formatDate(current.deadline) || '-'} />
              <RfqInfoCell label={t('rfq.card.quotes')} value={current.quotesCount} />
              <RfqInfoCell label={t('rfq.card.created')} value={formatDate(current.createdAt) || '-'} />
            </View>

            {current.specifications ? (
              <View className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-900/60">
                <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
                  {t('rfq.form.specifications')}
                </Text>
                <Text className="mt-2 font-sans text-sm leading-6 text-gray-700 dark:text-slate-200">{current.specifications}</Text>
              </View>
            ) : null}

            {mode === 'received' && current.myQuote ? (
              <View className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <Text className="mb-3 font-sans text-base font-bold text-green-800 dark:text-green-300">
                  {t('rfq.messages.quotation_submitted')}
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  <RfqInfoCell label={t('rfq.quote.unit_price')} value={current.myQuote.unitPrice} />
                  <RfqInfoCell label={t('rfq.quote.total')} value={current.myQuote.totalPrice} />
                  <RfqInfoCell label={t('rfq.quote.delivery')} value={`${current.myQuote.deliveryDays} ${t('rfq.quote.days')}`} />
                </View>
              </View>
            ) : null}

            {mode === 'sent' && current.quotes.length > 0 ? (
              <View className="gap-3">
                <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                  {t('rfq.messages.received_quotations', { count: current.quotes.length })}
                </Text>
                {current.quotes.map((quote) => (
                  <QuoteCard
                    key={String(quote.id)}
                    quote={quote}
                    rfqId={current.id}
                    canRespond={
                      mode === 'sent'
                        ? false
                        : current.status !== 'cancelled' && current.status !== 'closed'
                    }
                    onUpdated={(next) => {
                      setData(next);
                      onUpdated(next);
                    }}
                  />
                ))}
              </View>
            ) : null}

            {mode === 'sent' && current.quotes.length === 0 && current.status === 'open' ? (
              <View className="items-center rounded-2xl bg-gray-50 py-8 dark:bg-slate-900/40">
                <Feather name="clock" color="#94a3b8" size={28} />
                <Text className="mt-2 font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">
                  {t('rfq.empty.waiting.title')}
                </Text>
                <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">{t('rfq.empty.waiting.sub')}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
            <View className="flex-row flex-wrap gap-2">
              {mode === 'received' && (current.status === 'open' || current.status === 'quoted') && !current.myQuote && onQuote ? (
                <Pressable onPress={() => onQuote(current)} className="flex-row items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5">
                  <Feather name="send" color="#ffffff" size={16} />
                  <Text className="font-sans text-sm font-bold text-white">{t('rfq.actions.submit_quotation')}</Text>
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

function SubmitQuoteModal({
  rfq,
  onClose,
  onSuccess,
  onError,
}: {
  rfq: SellerRfq | null;
  onClose: () => void;
  onSuccess: (rfq: SellerRfq | null) => void;
  onError: (message: string) => void;
}) {
  const { t } = useAppTranslation();
  const [unitPrice, setUnitPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [currency, setCurrency] = useState(rfq?.currency || 'MMK');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [validityDays, setValidityDays] = useState('7');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateUnitPrice = (value: string) => {
    setUnitPrice(value);
    const unit = Number(value);
    if (Number.isFinite(unit) && unit > 0 && rfq?.quantity) setTotalPrice(String(unit * rfq.quantity));
  };

  const submit = async () => {
    if (!rfq) return;
    const unit = Number(unitPrice);
    const delivery = Number(deliveryDays);
    if (!Number.isFinite(unit) || unit <= 0) {
      onError(t('rfq.errors.unit_price_required'));
      return;
    }
    if (!Number.isFinite(delivery) || delivery <= 0) {
      onError(t('rfq.modal.delivery_days'));
      return;
    }

    setSubmitting(true);
    try {
      const next = await submitSellerRfqQuote(rfq.id, {
        unit_price: unit,
        total_price: Number(totalPrice) || unit * rfq.quantity,
        currency,
        delivery_days: delivery,
        validity_days: Number(validityDays) || 7,
        notes,
      });
      onSuccess(next);
    } catch (error) {
      onError(error instanceof Error ? error.message : t('rfq.errors.submit_quotation_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!rfq) return null;

  return (
    <Modal visible={Boolean(rfq)} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 px-3 py-6 md:px-6">
        <View className="mx-auto max-h-full w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
          <View className="flex-row items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{t('rfq.modal.submit_quotation')}</Text>
              <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500" numberOfLines={1}>
                {rfq.rfqNumber} - {rfq.productName}
              </Text>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
              <Feather name="x" color="#64748b" size={18} />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="gap-4 p-5">
            <View>
              <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">{t('rfq.quote.unit_price')}</Text>
              <TextInput
                value={unitPrice}
                onChangeText={updateUnitPrice}
                keyboardType="numeric"
                className="h-11 rounded-xl border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                placeholder="0"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">{t('rfq.modal.delivery_days')}</Text>
                <TextInput
                  value={deliveryDays}
                  onChangeText={setDeliveryDays}
                  keyboardType="numeric"
                  className="h-11 rounded-xl border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="7"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">{t('rfq.modal.total_price')}</Text>
                <TextInput
                  value={totalPrice}
                  onChangeText={setTotalPrice}
                  keyboardType="numeric"
                  className="h-11 rounded-xl border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder={t('rfq.modal.auto_calculated')}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
            <View>
              <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">{t('rfq.quote.notes')}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
                className="min-h-24 rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                placeholder={t('rfq.modal.notes_placeholder')}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </ScrollView>
          <View className="flex-row justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
            <Pressable onPress={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 dark:border-slate-600">
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">{t('rfq.actions.cancel')}</Text>
            </Pressable>
            <Pressable disabled={submitting} onPress={() => void submit()} className="flex-row items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 disabled:opacity-60">
              {submitting ? <ActivityIndicator color="#ffffff" /> : <Feather name="send" color="#ffffff" size={16} />}
              <Text className="font-sans text-sm font-bold text-white">
                {submitting ? t('rfq.actions.submitting') : t('rfq.actions.submit_quotation')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminRfqNative() {
  const { t } = useAppTranslation();
  const [activeTab, setActiveTab] = useState<RfqTab>('sent');
  const [sentRfqs, setSentRfqs] = useState<SellerRfq[]>([]);
  const [receivedRfqs, setReceivedRfqs] = useState<SellerRfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RfqStatusFilter>('all');
  const [selectedRfq, setSelectedRfq] = useState<SellerRfq | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<SellerRfq | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [sent, received] = await Promise.allSettled([fetchSentRfqs(), fetchSellerReceivedRfqs()]);
      if (sent.status === 'fulfilled') setSentRfqs(sent.value);
      if (received.status === 'fulfilled') setReceivedRfqs(received.value);
      if (sent.status === 'rejected' && received.status === 'rejected') {
        throw sent.reason;
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('rfq.errors.load_failed'),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const sentQuoted = useMemo(() => sentRfqs.filter((item) => item.status === 'quoted').length, [sentRfqs]);
  const inboxAction = useMemo(
    () => receivedRfqs.filter((item) => item.status === 'open' && !item.myQuote).length,
    [receivedRfqs]
  );

  const sentStats = useMemo(
    () => ({
      total: sentRfqs.length,
      open: sentRfqs.filter((item) => item.status === 'open').length,
      quoted: sentRfqs.filter((item) => item.status === 'quoted').length,
      accepted: sentRfqs.filter((item) => item.status === 'accepted').length,
    }),
    [sentRfqs]
  );

  const receivedStats = useMemo(
    () => ({
      total: receivedRfqs.length,
      open: receivedRfqs.filter((item) => item.status === 'open' && !item.myQuote).length,
      responded: receivedRfqs.filter((item) => item.myQuote).length,
      accepted: receivedRfqs.filter((item) => item.status === 'accepted').length,
    }),
    [receivedRfqs]
  );

  const currentList = activeTab === 'sent' ? sentRfqs : receivedRfqs;
  const filteredRfqs = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return currentList.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch =
        !needle ||
        item.productName.toLowerCase().includes(needle) ||
        item.rfqNumber.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        item.buyer?.name.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [currentList, searchTerm, statusFilter]);

  const updateListItem = (next: SellerRfq) => {
    const updater = (items: SellerRfq[]) =>
      items.map((item) => (String(item.id) === String(next.id) ? next : item));
    if (activeTab === 'sent') setSentRfqs(updater);
    else setReceivedRfqs(updater);
    setSelectedRfq((current) => (current && String(current.id) === String(next.id) ? next : current));
  };

  const previewReceived = receivedRfqs.slice(0, 4);
  const previewSent = sentRfqs.slice(0, 3);

  return (
    <View className="gap-6">
      <ToastMessage message={message} onClose={() => setMessage(null)} />

      <View className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Feather name="clipboard" size={20} color="#4f46e5" />
            <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
              {t('rfq.dashboard.title', 'Request for quote')}
            </Text>
          </View>
          <Text className="mt-1 font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
            {t('rfq.dashboard.subtitle_admin', 'Review buyer RFQs and seller inbox from one place.')}
          </Text>
        </View>
        <Pressable
          onPress={() => void loadAll()}
          className="self-start flex-row items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 dark:border-slate-600">
          {loading ? <ActivityIndicator color="#4f46e5" /> : <Feather name="refresh-cw" color="#4f46e5" size={16} />}
          <Text className="font-sans text-sm font-semibold text-gray-600 dark:text-slate-300">{t('rfq.toolbar.refresh')}</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-4">
        <HubStatCard
          label={t('rfq.tabs.sent', 'Sent')}
          value={sentRfqs.length}
          sub={`${sentQuoted} ${t('rfq.dashboard.awaiting_decision', 'awaiting your decision')}`}
          icon="file-text"
          tone="indigo"
        />
        <HubStatCard
          label={t('rfq.tabs.received', 'Received')}
          value={receivedRfqs.length}
          sub={`${inboxAction} ${t('rfq.dashboard.need_response', 'need a response')}`}
          icon="inbox"
          tone="emerald"
        />
      </View>

      <View className="flex-row flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-700">
        {([
          ['sent', t('rfq.tabs.sent'), sentStats.quoted],
          ['received', t('rfq.tabs.received'), receivedStats.open],
        ] as const).map(([key, label, badge]) => {
          const active = activeTab === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                setActiveTab(key);
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className={`relative flex-row items-center gap-2 rounded-lg px-4 py-2 ${active ? 'bg-white shadow-sm dark:bg-slate-600' : ''}`}>
              <Feather name={key === 'sent' ? 'file-text' : 'inbox'} color={active ? '#4f46e5' : '#64748b'} size={16} />
              <Text className={`font-sans text-sm font-semibold ${active ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-slate-400'}`}>
                {label}
              </Text>
              {badge > 0 ? (
                <View className="min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5">
                  <Text className="font-sans text-[10px] font-bold text-white">{badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap gap-4">
        {(activeTab === 'sent'
          ? [
              { label: t('rfq.stats.total_rfqs'), value: String(sentStats.total), color: 'text-gray-700 dark:text-slate-300' },
              { label: t('rfq.stats.open'), value: String(sentStats.open), color: 'text-blue-600 dark:text-blue-400' },
              { label: t('rfq.stats.quotes_in'), value: String(sentStats.quoted), color: 'text-purple-600 dark:text-purple-400' },
              { label: t('rfq.stats.accepted'), value: String(sentStats.accepted), color: 'text-green-600 dark:text-green-400' },
            ]
          : [
              { label: t('rfq.stats.received'), value: String(receivedStats.total), color: 'text-gray-700 dark:text-slate-300' },
              { label: t('rfq.stats.awaiting'), value: String(receivedStats.open), color: 'text-blue-600 dark:text-blue-400' },
              { label: t('rfq.stats.responded'), value: String(receivedStats.responded), color: 'text-green-600 dark:text-green-400' },
              { label: t('rfq.stats.accepted'), value: String(receivedStats.accepted), color: 'text-green-600 dark:text-green-400' },
            ]
        ).map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} color={item.color} />
        ))}
      </View>

      {!loading && previewReceived.length > 0 && activeTab === 'received' ? (
        <View>
          <Text className="mb-3 font-sans text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">
            {t('rfq.dashboard.recent_inbox', 'Recent inbox')}
          </Text>
          <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            {previewReceived.map((item, index) => (
              <Pressable
                key={String(item.id)}
                onPress={() => setSelectedRfq(item)}
                className={`flex-row items-center justify-between gap-3 px-4 py-3 ${
                  index > 0 ? 'border-t border-gray-100 dark:border-slate-700' : ''
                }`}>
                <View className="min-w-0 flex-1">
                  <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                    {item.rfqNumber} · {item.status}
                    {item.buyer?.name ? ` · ${item.buyer.name}` : ''}
                  </Text>
                </View>
                <Feather name="external-link" color="#cbd5e1" size={16} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {!loading && previewSent.length > 0 && activeTab === 'sent' ? (
        <View>
          <Text className="mb-3 font-sans text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">
            {t('rfq.dashboard.recent_sent', 'Recent sent (as admin)')}
          </Text>
          <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            {previewSent.map((item, index) => (
              <Pressable
                key={String(item.id)}
                onPress={() => setSelectedRfq(item)}
                className={`flex-row items-center justify-between gap-3 px-4 py-3 ${
                  index > 0 ? 'border-t border-gray-100 dark:border-slate-700' : ''
                }`}>
                <View className="min-w-0 flex-1">
                  <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                    {item.rfqNumber} · {item.status}
                  </Text>
                </View>
                <Feather name="external-link" color="#cbd5e1" size={16} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <View className="gap-3 border-b border-gray-100 px-4 py-4 dark:border-slate-700 lg:flex-row lg:items-center">
          <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-700">
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

        <View className="p-4 md:p-6">
          {loading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : filteredRfqs.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-700">
                <Feather name={activeTab === 'sent' ? 'file-text' : 'inbox'} color="#94a3b8" size={30} />
              </View>
              <Text className="font-sans text-base font-semibold text-gray-600 dark:text-slate-300">
                {activeTab === 'sent' ? t('rfq.empty.sent.title') : t('rfq.empty.received.title')}
              </Text>
              <Text className="mt-1 max-w-sm text-center font-sans text-sm leading-6 text-gray-400 dark:text-slate-500">
                {activeTab === 'sent' ? t('rfq.dashboard.empty_admin') : t('rfq.empty.received.sub')}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-4">
              {filteredRfqs.map((rfq) => (
                <RfqListCard
                  key={String(rfq.id)}
                  rfq={rfq}
                  mode={activeTab}
                  onOpen={() => setSelectedRfq(rfq)}
                  onQuote={() => setQuoteTarget(rfq)}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <RfqDetailModal
        rfq={selectedRfq}
        mode={activeTab}
        onClose={() => setSelectedRfq(null)}
        onQuote={(rfq) => {
          setSelectedRfq(null);
          setQuoteTarget(rfq);
        }}
        onUpdated={updateListItem}
      />

      {quoteTarget ? (
        <SubmitQuoteModal
          rfq={quoteTarget}
          onClose={() => setQuoteTarget(null)}
          onSuccess={(next) => {
            if (next) updateListItem(next);
            setQuoteTarget(null);
            setMessage({ type: 'success', text: t('rfq.messages.quotation_submitted') });
          }}
          onError={(text) => setMessage({ type: 'error', text })}
        />
      ) : null}
    </View>
  );
}
