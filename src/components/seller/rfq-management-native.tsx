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
  fetchSellerReceivedRfqs,
  fetchSellerRfqDetail,
  submitSellerRfqQuote,
  type SellerRfq,
  type SellerRfqQuote,

  formatApiErrorMessage,
} from '@/utils/native-api';

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
      className={`absolute right-4 top-4 z-50 max-w-sm flex-row items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
        success
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900'
      }`}
    >
      <Feather name={success ? 'check-circle' : 'alert-triangle'} color={success ? '#16a34a' : '#dc2626'} size={18} />
      <Text
        className={`min-w-0 flex-1 font-sans text-sm font-semibold ${
          success ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'
        }`}
      >
        {message.text}
      </Text>
      <Feather name="x" color={success ? '#16a34a' : '#dc2626'} size={16} />
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

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  tone: 'gray' | 'blue' | 'green' | 'amber';
}) {
  const iconTone = {
    gray: ['bg-gray-100 dark:bg-slate-700', '#475569'],
    blue: ['bg-blue-50 dark:bg-blue-900/30', '#2563eb'],
    green: ['bg-emerald-50 dark:bg-emerald-900/30', '#059669'],
    amber: ['bg-amber-50 dark:bg-amber-900/30', '#d97706'],
  }[tone];

  return (
    <View className={`w-[48%] rounded-xl p-4 lg:w-[23%] ${iconTone[0]}`}>
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-950/30">
          <Feather name={icon} color={iconTone[1]} size={20} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-sans text-2xl font-black text-gray-950 dark:text-slate-100"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value}
          </Text>
          <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400" numberOfLines={2}>
            {label}
          </Text>
        </View>
      </View>
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

function RfqCard({
  rfq,
  onOpen,
  onQuote,
}: {
  rfq: SellerRfq;
  onOpen: () => void;
  onQuote: () => void;
}) {
  const { t } = useAppTranslation();
  const needsQuote =
    (rfq.status === 'open' || rfq.status === 'quoted') && !rfq.myQuote;

  return (
    <View className="w-full gap-2 md:w-[48%] xl:w-[31%]">
      <Pressable
        onPress={onOpen}
        className="min-h-[246px] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <View className="flex-1">
          <View className="mb-3 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">
                {rfq.rfqNumber}
              </Text>
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
              label={t('rfq.card.my_quote')}
              value={rfq.myQuote ? t('rfq.submitted') : t('rfq.status.quote.pending.label')}
            />
          </View>

          {rfq.buyer ? (
            <View className="mb-3 flex-row items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 dark:bg-slate-900/60">
              <Feather name="users" color="#9ca3af" size={14} />
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
                {t('rfq.from')}: {rfq.buyer.name}
              </Text>
            </View>
          ) : null}

          {rfq.specifications ? (
            <Text className="mb-3 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400" numberOfLines={2}>
              {rfq.specifications}
            </Text>
          ) : null}
        </View>

        <View className="mt-auto flex-row items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-700">
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
            {t('rfq.card.created')} {formatDate(rfq.createdAt, true)}
          </Text>
          <Feather name="chevron-right" color="#9ca3af" size={18} />
        </View>
      </Pressable>

      {needsQuote ? (
        <Pressable
          onPress={onQuote}
          className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5"
        >
          <Feather name="send" color="#ffffff" size={16} />
          <Text className="font-sans text-xs font-bold text-white">{t('rfq.actions.submit_quotation')}</Text>
        </Pressable>
      ) : rfq.myQuote ? (
        <View className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check" color="#16a34a" size={16} />
          <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-400">{t('rfq.submitted')}</Text>
        </View>
      ) : null}
    </View>
  );
}

function QuoteSummary({ quote }: { quote: SellerRfqQuote }) {
  const { t } = useAppTranslation();
  return (
    <View className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <Text className="font-sans text-base font-bold text-green-800 dark:text-green-300">
          {t('rfq.messages.quotation_submitted')}
        </Text>
        <StatusBadge status={quote.status} quote />
      </View>
      <View className="flex-row flex-wrap gap-3">
        <RfqInfoCell label={t('rfq.quote.unit_price')} value={quote.unitPrice} />
        <RfqInfoCell label={t('rfq.quote.total')} value={quote.totalPrice} />
        <RfqInfoCell label={t('rfq.quote.delivery')} value={`${quote.deliveryDays} ${t('rfq.quote.days')}`} />
      </View>
      {quote.notes ? (
        <Text className="mt-3 font-sans text-sm leading-6 text-green-700 dark:text-green-300">{quote.notes}</Text>
      ) : null}
    </View>
  );
}

function DetailModal({
  rfq,
  onClose,
  onQuote,
  onRefresh,
}: {
  rfq: SellerRfq | null;
  onClose: () => void;
  onQuote: (rfq: SellerRfq) => void;
  onRefresh: (rfq: SellerRfq) => void;
}) {
  const { t } = useAppTranslation();
  const [freshData, setFreshData] = useState<SellerRfq | null>(null);
  const [loading, setLoading] = useState(false);
  const data = freshData && rfq && String(freshData.id) === String(rfq.id) ? freshData : rfq;

  const loadDetail = useCallback(async () => {
    if (!rfq) return;
    setLoading(true);
    try {
      const next = await fetchSellerRfqDetail(rfq.id);
      setFreshData(next);
      onRefresh(next);
    } finally {
      setLoading(false);
    }
  }, [onRefresh, rfq]);

  if (!data) return null;

  return (
    <Modal visible={Boolean(rfq)} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 px-3 py-6 md:px-6">
        <View className="mx-auto max-h-full w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
          <View className="bg-indigo-600 px-5 py-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-xs font-semibold text-indigo-100">{data.rfqNumber}</Text>
                <Text className="mt-1 font-sans text-xl font-extrabold text-white" numberOfLines={2}>
                  {data.productName}
                </Text>
              </View>
              <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <Feather name="x" color="#ffffff" size={18} />
              </Pressable>
            </View>
          </View>

          <ScrollView className="max-h-[78vh]" contentContainerClassName="p-5">
            <View className="mb-4 flex-row flex-wrap gap-3">
              <RfqInfoCell label={t('rfq.card.qty')} value={`${data.quantity} ${data.unit}`} />
              <RfqInfoCell label={t('rfq.card.deadline')} value={formatDate(data.deadline) || '-'} />
              <RfqInfoCell label={t('rfq.card.created')} value={formatDate(data.createdAt) || '-'} />
            </View>

            <View className="mb-4 rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
              <Text className="mb-1 font-sans text-xs font-bold uppercase text-indigo-600 dark:text-indigo-300">
                {t('rfq.form.specifications')}
              </Text>
              <Text className="font-sans text-sm leading-6 text-indigo-700 dark:text-indigo-200">
                {data.specifications || t('common.not_available', { defaultValue: 'Not available' })}
              </Text>
            </View>

            {data.notes ? (
              <View className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
                  {t('rfq.form.notes')}
                </Text>
                <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">{data.notes}</Text>
              </View>
            ) : null}

            <View className="mb-4 flex-row flex-wrap gap-3">
              <RfqInfoCell
                label={t('rfq.form.budget_min')}
                value={data.budgetMin || t('common.not_available', { defaultValue: 'N/A' })}
              />
              <RfqInfoCell
                label={t('rfq.form.budget_max')}
                value={data.budgetMax || t('common.not_available', { defaultValue: 'N/A' })}
              />
              <RfqInfoCell label={t('rfq.modal.currency')} value={data.currency} />
            </View>

            {data.buyer ? (
              <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <Text className="mb-2 font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
                  {t('rfq.from')}
                </Text>
                <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">{data.buyer.name}</Text>
                <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">{data.buyer.email}</Text>
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{data.buyer.phone}</Text>
              </View>
            ) : null}

            {data.myQuote ? <QuoteSummary quote={data.myQuote} /> : null}
          </ScrollView>

          <View className="flex-row flex-wrap justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
            <Pressable
              onPress={loadDetail}
              disabled={loading}
              className="flex-row items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 dark:border-slate-600"
            >
              {loading ? <ActivityIndicator color="#4f46e5" /> : <Feather name="refresh-cw" color="#4f46e5" size={16} />}
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                {t('rfq.toolbar.refresh')}
              </Text>
            </Pressable>
            {data.status !== 'cancelled' &&
            data.status !== 'closed' &&
            (data.status === 'open' || data.status === 'quoted') &&
            !data.myQuote ? (
              <Pressable
                onPress={() => onQuote(data)}
                className="flex-row items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5"
              >
                <Feather name="send" color="#ffffff" size={16} />
                <Text className="font-sans text-sm font-bold text-white">{t('rfq.actions.submit_quotation')}</Text>
              </Pressable>
            ) : null}
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
    if (Number.isFinite(unit) && unit > 0 && rfq?.quantity) {
      setTotalPrice(String(unit * rfq.quantity));
    }
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
      onError(formatApiErrorMessage(error, t('rfq.errors.submit_quotation_failed')));
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
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
                {t('rfq.modal.submit_quotation')}
              </Text>
              <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500" numberOfLines={1}>
                {rfq.rfqNumber} - {rfq.productName}
              </Text>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
              <Feather name="x" color="#64748b" size={18} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="p-5">
            <View className="mb-5 rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
              <Text className="font-sans text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {rfq.productName}
              </Text>
              <Text className="mt-1 font-sans text-xs text-indigo-500 dark:text-indigo-400">
                x {rfq.quantity} {rfq.unit}
              </Text>
              {rfq.specifications ? (
                <Text className="mt-2 font-sans text-xs leading-5 text-indigo-500 dark:text-indigo-400">
                  {rfq.specifications}
                </Text>
              ) : null}
            </View>

            <View className="gap-4">
              <View>
                <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">
                  {t('rfq.quote.unit_price')}
                </Text>
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
                  <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">
                    {t('rfq.modal.currency')}
                  </Text>
                  <View className="flex-row gap-2">
                    {['MMK', 'USD'].map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setCurrency(item)}
                        className={`flex-1 rounded-xl border px-3 py-3 ${
                          currency === item
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                            : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                        }`}
                      >
                        <Text
                          className={`text-center font-sans text-sm font-bold ${
                            currency === item ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">
                    {t('rfq.modal.total_price')}
                  </Text>
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

              <View className="flex-row gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">
                    {t('rfq.modal.delivery_days')}
                  </Text>
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
                  <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">
                    {t('rfq.modal.quote_valid')}
                  </Text>
                  <TextInput
                    value={validityDays}
                    onChangeText={setValidityDays}
                    keyboardType="numeric"
                    className="h-11 rounded-xl border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="7"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View>
                <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-600 dark:text-slate-400">
                  {t('rfq.quote.notes')}
                </Text>
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
            </View>
          </ScrollView>

          <View className="flex-row justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
            <Pressable onPress={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 dark:border-slate-600">
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                {t('rfq.actions.cancel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={submitting}
              className="flex-row items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 disabled:opacity-60"
            >
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

export function RfqManagementNative() {
  const { t } = useAppTranslation();
  const [rfqs, setRfqs] = useState<SellerRfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RfqStatusFilter>('all');
  const [selectedRfq, setSelectedRfq] = useState<SellerRfq | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<SellerRfq | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      setRfqs(await fetchSellerReceivedRfqs());
    } catch (error) {
      setRfqs([]);
      setMessage({
        type: 'error',
        text: formatApiErrorMessage(error, t('rfq.errors.load_received_failed')),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const stats = useMemo(
    () => ({
      total: rfqs.length,
      awaiting: rfqs.filter((item) => item.status === 'open' && !item.myQuote).length,
      responded: rfqs.filter((item) => item.myQuote).length,
      accepted: rfqs.filter((item) => item.status === 'accepted').length,
    }),
    [rfqs]
  );

  const filteredRfqs = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return rfqs.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch =
        !needle ||
        item.productName.toLowerCase().includes(needle) ||
        item.rfqNumber.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        item.buyer?.name.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [rfqs, searchTerm, statusFilter]);

  const updateRfq = (next: SellerRfq | null) => {
    if (!next) return;
    setRfqs((current) => current.map((item) => (String(item.id) === String(next.id) ? next : item)));
    setSelectedRfq((current) => (current && String(current.id) === String(next.id) ? next : current));
  };

  return (
    <View className="gap-6">
      <ToastMessage message={message} onClose={() => setMessage(null)} />

      <View className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-2xl font-extrabold text-gray-900 dark:text-slate-100">
            {t('rfq.dashboard.title')}
          </Text>
          <Text className="mt-1 font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
            {t('rfq.dashboard.subtitle_seller')}
          </Text>
        </View>
        <Pressable
          onPress={load}
          className="self-start flex-row items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 dark:border-slate-600 sm:self-auto"
        >
          {loading ? <ActivityIndicator color="#4f46e5" /> : <Feather name="refresh-cw" color="#4f46e5" size={16} />}
          <Text className="font-sans text-sm font-semibold text-gray-600 dark:text-slate-300">
            {t('rfq.toolbar.refresh')}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-4">
        <StatCard label={t('rfq.stats.received')} value={stats.total} icon="inbox" tone="gray" />
        <StatCard label={t('rfq.stats.awaiting')} value={stats.awaiting} icon="clock" tone="amber" />
        <StatCard label={t('rfq.stats.responded')} value={stats.responded} icon="check-circle" tone="green" />
        <StatCard label={t('rfq.stats.accepted')} value={stats.accepted} icon="award" tone="blue" />
      </View>

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
                  }`}
                >
                  <Text
                    className={`font-sans text-xs font-bold capitalize ${
                      active ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-slate-300'
                    }`}
                  >
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
                <Feather name="inbox" color="#94a3b8" size={30} />
              </View>
              <Text className="font-sans text-base font-semibold text-gray-600 dark:text-slate-300">
                {t('rfq.empty.received.title')}
              </Text>
              <Text className="mt-1 max-w-sm text-center font-sans text-sm leading-6 text-gray-400 dark:text-slate-500">
                {t('rfq.empty.received.sub')}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-4">
              {filteredRfqs.map((rfq) => (
                <RfqCard
                  key={rfq.id}
                  rfq={rfq}
                  onOpen={() => setSelectedRfq(rfq)}
                  onQuote={() => setQuoteTarget(rfq)}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <DetailModal
        rfq={selectedRfq}
        onClose={() => setSelectedRfq(null)}
        onQuote={(rfq) => {
          setSelectedRfq(null);
          setQuoteTarget(rfq);
        }}
        onRefresh={updateRfq}
      />
      {quoteTarget ? (
        <SubmitQuoteModal
          key={String(quoteTarget.id)}
          rfq={quoteTarget}
          onClose={() => setQuoteTarget(null)}
          onSuccess={(next) => {
            updateRfq(next);
            setQuoteTarget(null);
            setMessage({ type: 'success', text: t('rfq.messages.quotation_submitted') });
            if (!next) load();
          }}
          onError={(text) => setMessage({ type: 'error', text })}
        />
      ) : null}
    </View>
  );
}
