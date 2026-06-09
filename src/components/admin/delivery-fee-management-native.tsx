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
  adjustAdminDeliveryFee,
  collectAdminDeliveryFee,
  fetchAdminDeliveryFees,
  formatMMK,
  type AdminDeliveryFee,
  type AdminDeliveryFeeSummary,
} from '@/utils/native-api';

type FeeFilter = '' | 'outstanding' | 'collected';

const DELIVERY_STATUS_TONE: Record<string, { wrap: string; text: string }> = {
  delivered: { wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  in_transit: { wrap: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
  out_for_delivery: { wrap: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
  cancelled: { wrap: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-500 dark:text-slate-400' },
};

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatStatus(status: string) {
  return (status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
  borderTone,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: keyof typeof Feather.glyphMap;
  borderTone: 'yellow' | 'orange' | 'green' | 'blue';
}) {
  const tones = {
    yellow: 'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    orange: 'border-l-orange-400 bg-orange-50 dark:bg-orange-900/20',
    green: 'border-l-green-400 bg-green-50 dark:bg-green-900/20',
    blue: 'border-l-blue-400 bg-blue-50 dark:bg-blue-900/20',
  };

  return (
    <View className={`rounded-xl border-l-4 p-4 shadow-sm ${tones[borderTone]}`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {label}
          </Text>
          <Text className="mt-1 font-sans text-xl font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {value}
          </Text>
          <Text className="mt-0.5 font-sans text-[11px] text-gray-500 dark:text-slate-400">{sub}</Text>
        </View>
        <Feather name={icon} size={24} color="#cbd5e1" />
      </View>
    </View>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const tone = DELIVERY_STATUS_TONE[status] || {
    wrap: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
  };

  return (
    <View className={`self-start rounded-full border border-transparent px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-[11px] font-semibold capitalize ${tone.text}`}>{formatStatus(status)}</Text>
    </View>
  );
}

function FeeStatusBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const isCollected = status === 'collected';
  const isOutstanding = status === 'outstanding';
  const tone = isCollected
    ? { wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' }
    : isOutstanding
      ? { wrap: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' }
      : { wrap: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-500 dark:text-slate-400' };

  const label =
    status === 'not_applicable'
      ? t('admin.deliveryFeeManagement.feeStatus.na', 'N/A')
      : formatStatus(status);

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-[11px] font-semibold ${tone.text}`}>{label}</Text>
    </View>
  );
}

function CollectModal({
  visible,
  delivery,
  submitting,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  delivery: AdminDeliveryFee | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (form: { collection_ref: string; admin_notes: string }) => void;
}) {
  const { t } = useAppTranslation();
  const [collectionRef, setCollectionRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setCollectionRef('');
      setAdminNotes('');
    }
  }, [visible, delivery?.id]);

  if (!visible || !delivery) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('admin.deliveryFeeManagement.collectModal.title', 'Mark Delivery Fee Collected')}
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('admin.deliveryFeeManagement.collectModal.order', 'Order: {{number}}', {
                number: delivery.orderNumber,
              })}
            </Text>
          </View>

          <ScrollView className="px-5 py-4" contentContainerClassName="gap-4">
            <View className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <Text className="font-sans text-sm font-medium text-blue-800 dark:text-blue-300">
                {t('admin.deliveryFeeManagement.collectModal.feeAmount', 'Fee Amount')}
              </Text>
              <Text className="mt-1 font-sans text-2xl font-bold text-blue-900 dark:text-blue-200">
                {delivery.platformDeliveryFee}
              </Text>
              <Text className="mt-1 font-sans text-xs text-blue-600 dark:text-blue-400">
                {t('admin.deliveryFeeManagement.collectModal.fromSeller', 'From seller: {{name}}', {
                  name: delivery.supplierName || '—',
                })}
              </Text>
            </View>

            <View>
              <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('admin.deliveryFeeManagement.collectModal.collectionRef', 'Collection Reference *')}
              </Text>
              <TextInput
                value={collectionRef}
                onChangeText={setCollectionRef}
                editable={!submitting}
                placeholder={t(
                  'admin.deliveryFeeManagement.collectModal.collectionRefPlaceholder',
                  'e.g. bank transfer ref, receipt ID',
                )}
                placeholderTextColor="#94a3b8"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </View>

            <View>
              <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('admin.deliveryFeeManagement.collectModal.adminNotes', 'Admin Notes (optional)')}
              </Text>
              <TextInput
                value={adminNotes}
                onChangeText={setAdminNotes}
                editable={!submitting}
                multiline
                numberOfLines={2}
                placeholder={t(
                  'admin.deliveryFeeManagement.collectModal.adminNotesPlaceholder',
                  'Any notes for internal records',
                )}
                placeholderTextColor="#94a3b8"
                className="min-h-[72px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View className="flex-row justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
            <Pressable
              disabled={submitting}
              onPress={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">
                {t('admin.deliveryFeeManagement.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              disabled={!collectionRef.trim() || submitting}
              onPress={() => onConfirm({ collection_ref: collectionRef.trim(), admin_notes: adminNotes.trim() })}
              className={`flex-row items-center gap-2 rounded-lg px-4 py-2 ${
                !collectionRef.trim() || submitting ? 'bg-green-600/50' : 'bg-green-600'
              }`}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text className="font-sans text-sm font-medium text-white">
                {t('admin.deliveryFeeManagement.collectModal.confirm', 'Mark as Collected')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AdjustFeeModal({
  visible,
  delivery,
  submitting,
  onClose,
  onSave,
}: {
  visible: boolean;
  delivery: AdminDeliveryFee | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (form: { platform_delivery_fee: number; adjustment_note?: string }) => void;
}) {
  const { t } = useAppTranslation();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible && delivery) {
      setAmount(String(Math.round(delivery.platformDeliveryFeeValue || 0)));
      setNote('');
    }
  }, [visible, delivery?.id, delivery?.platformDeliveryFeeValue]);

  if (!visible || !delivery) return null;

  const sellerSubmitted = Boolean(delivery.feeSubmittedAt);
  const parsedAmount = Number(amount);
  const canSave = amount !== '' && !Number.isNaN(parsedAmount) && parsedAmount >= 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('admin.deliveryFeeManagement.adjustModal.title', 'Adjust platform delivery fee')}
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('admin.deliveryFeeManagement.adjustModal.order', 'Order: {{number}}', {
                number: delivery.orderNumber,
              })}
            </Text>
          </View>

          <ScrollView className="px-5 py-4" contentContainerClassName="gap-4">
            {sellerSubmitted ? (
              <View className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/30">
                <Text className="font-sans text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                  {t(
                    'admin.deliveryFeeManagement.adjustModal.sellerSubmittedWarning',
                    'The seller already submitted a payment proof for this fee. If you change the amount, confirm the actual transfer matches the new total.',
                  )}
                </Text>
              </View>
            ) : null}

            <View>
              <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('admin.deliveryFeeManagement.adjustModal.feeLabel', 'Fee (MMK) *')}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                editable={!submitting}
                keyboardType="numeric"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-500">
                {t('admin.deliveryFeeManagement.adjustModal.previousQuote', 'Previous quote: {{amount}}', {
                  amount: delivery.platformDeliveryFee,
                })}
              </Text>
            </View>

            <View>
              <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('admin.deliveryFeeManagement.adjustModal.noteLabel', 'Note (optional)')}
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                editable={!submitting}
                multiline
                numberOfLines={2}
                placeholder={t(
                  'admin.deliveryFeeManagement.adjustModal.notePlaceholder',
                  'e.g. actual weight 12 kg, remote area surcharge',
                )}
                placeholderTextColor="#94a3b8"
                className="min-h-[72px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View className="flex-row justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
            <Pressable
              disabled={submitting}
              onPress={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">
                {t('admin.deliveryFeeManagement.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              disabled={!canSave || submitting}
              onPress={() =>
                onSave({
                  platform_delivery_fee: parsedAmount,
                  adjustment_note: note.trim() || undefined,
                })
              }
              className={`flex-row items-center gap-2 rounded-lg px-4 py-2 ${
                !canSave || submitting ? 'bg-blue-600/50' : 'bg-blue-600'
              }`}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text className="font-sans text-sm font-medium text-white">
                {t('admin.deliveryFeeManagement.adjustModal.save', 'Save fee')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function DeliveryFeeManagementNative() {
  const { t } = useAppTranslation();
  const [deliveries, setDeliveries] = useState<AdminDeliveryFee[]>([]);
  const [summary, setSummary] = useState<AdminDeliveryFeeSummary>({
    outstandingCount: 0,
    outstandingAmount: 0,
    collectedCount: 0,
    collectedAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeeFilter>('');
  const [search, setSearch] = useState('');
  const [collectTarget, setCollectTarget] = useState<AdminDeliveryFee | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdminDeliveryFee | null>(null);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (feeStatus: FeeFilter = filter) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAdminDeliveryFees(feeStatus);
      setDeliveries(result.deliveries);
      setSummary(result.summary);
    } catch {
      setError(t('admin.deliveryFeeManagement.errors.load', 'Failed to load delivery fees.'));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFilterChange = (nextFilter: FeeFilter) => {
    setFilter(nextFilter);
    void load(nextFilter);
  };

  const handleCollect = async (form: { collection_ref: string; admin_notes: string }) => {
    if (!collectTarget) return;
    setActing(true);
    setError('');
    try {
      await collectAdminDeliveryFee(collectTarget.id, form);
      setMessage(t('admin.deliveryFeeManagement.messages.collected', 'Delivery fee marked as collected.'));
      setCollectTarget(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.deliveryFeeManagement.errors.action', 'Action failed.'),
      );
    } finally {
      setActing(false);
    }
  };

  const handleAdjustFee = async (form: { platform_delivery_fee: number; adjustment_note?: string }) => {
    if (!adjustTarget) return;
    setActing(true);
    setError('');
    try {
      await adjustAdminDeliveryFee(adjustTarget.id, form);
      setMessage(t('admin.deliveryFeeManagement.messages.adjusted', 'Platform delivery fee updated.'));
      setAdjustTarget(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.deliveryFeeManagement.errors.adjust', 'Could not update fee.'),
      );
    } finally {
      setActing(false);
    }
  };

  const filteredDeliveries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return deliveries;
    return deliveries.filter(
      (delivery) =>
        delivery.orderNumber.toLowerCase().includes(query) ||
        delivery.supplierName.toLowerCase().includes(query),
    );
  }, [deliveries, search]);

  const filterOptions: { value: FeeFilter; label: string }[] = [
    { value: '', label: t('admin.deliveryFeeManagement.filters.all', 'All') },
    { value: 'outstanding', label: t('admin.deliveryFeeManagement.filters.outstanding', 'Outstanding') },
    { value: 'collected', label: t('admin.deliveryFeeManagement.filters.collected', 'Collected') },
  ];

  if (loading && deliveries.length === 0) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
          {t('admin.deliveryFeeManagement.loading', 'Loading delivery fees...')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <CollectModal
        visible={Boolean(collectTarget)}
        delivery={collectTarget}
        submitting={acting}
        onClose={() => setCollectTarget(null)}
        onConfirm={(form) => void handleCollect(form)}
      />
      <AdjustFeeModal
        visible={Boolean(adjustTarget)}
        delivery={adjustTarget}
        submitting={acting}
        onClose={() => setAdjustTarget(null)}
        onSave={(form) => void handleAdjustFee(form)}
      />

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t('admin.deliveryFeeManagement.title', 'Delivery Fee Collections')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t(
              'admin.deliveryFeeManagement.subtitle',
              'Track platform-managed delivery fees — quote, collect, and confirm manually.',
            )}
          </Text>
        </View>
        <Pressable
          onPress={() => void load()}
          className="h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={16} />
        </Pressable>
      </View>

      {error ? (
        <Pressable
          onPress={() => setError('')}
          className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" color="#dc2626" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Pressable onPress={() => void load()}>
            <Text className="font-sans text-xs font-semibold text-red-700 underline dark:text-red-300">
              {t('admin.orderManagement.retry', 'Retry')}
            </Text>
          </Pressable>
        </Pressable>
      ) : null}

      {message ? (
        <Pressable
          onPress={() => setMessage('')}
          className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" color="#15803d" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-800 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        <View className="w-[47%] lg:w-[23%]">
          <SummaryCard
            label={t('admin.deliveryFeeManagement.summary.outstandingCount', 'Outstanding Count')}
            value={summary.outstandingCount}
            sub={t('admin.deliveryFeeManagement.summary.outstandingCountSub', 'Fees not yet collected')}
            icon="clock"
            borderTone="yellow"
          />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <SummaryCard
            label={t('admin.deliveryFeeManagement.summary.outstandingAmount', 'Outstanding Amount')}
            value={formatMMK(summary.outstandingAmount)}
            sub={t('admin.deliveryFeeManagement.summary.outstandingAmountSub', 'Total owed to platform')}
            icon="dollar-sign"
            borderTone="orange"
          />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <SummaryCard
            label={t('admin.deliveryFeeManagement.summary.collectedCount', 'Collected Count')}
            value={summary.collectedCount}
            sub={t('admin.deliveryFeeManagement.summary.collectedCountSub', 'Successfully collected')}
            icon="check-circle"
            borderTone="green"
          />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <SummaryCard
            label={t('admin.deliveryFeeManagement.summary.collectedAmount', 'Collected Amount')}
            value={formatMMK(summary.collectedAmount)}
            sub={t('admin.deliveryFeeManagement.summary.collectedAmountSub', 'Platform delivery revenue')}
            icon="truck"
            borderTone="blue"
          />
        </View>
      </View>

      <View className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <Text className="font-sans text-sm font-semibold text-blue-900 dark:text-blue-200">
          {t('admin.deliveryFeeManagement.policy.title', 'How Delivery Fee Collection Works')}
        </Text>
        <Text className="mt-1 font-sans text-xs leading-relaxed text-blue-800 dark:text-blue-300">
          {t(
            'admin.deliveryFeeManagement.policy.body',
            'When a seller requests platform delivery, the admin manually quotes a fee based on distance, weight, and area. The fee is negotiated and agreed before dispatch — no fixed rate is enforced by the platform. Once the fee is received (via bank transfer or mobile payment), mark it as collected here with the reference number.',
          )}
        </Text>
      </View>

      <View className="gap-3">
        <View className="relative">
          <View className="absolute left-3 top-0 z-10 h-10 justify-center">
            <Feather name="search" size={16} color="#94a3b8" />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t(
              'admin.deliveryFeeManagement.searchPlaceholder',
              'Search order number or seller name…',
            )}
            placeholderTextColor="#94a3b8"
            className="h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-4 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </View>

        <View className="flex-row flex-wrap gap-2">
          {filterOptions.map((option) => {
            const active = filter === option.value;
            return (
              <Pressable
                key={option.value || 'all'}
                onPress={() => handleFilterChange(option.value)}
                className={`rounded-full border px-3 py-1.5 ${
                  active
                    ? 'border-green-600 bg-green-600'
                    : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}>
                <Text
                  className={`font-sans text-xs font-medium ${
                    active ? 'text-white' : 'text-gray-600 dark:text-slate-400'
                  }`}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#16a34a" size="large" />
          </View>
        ) : filteredDeliveries.length === 0 ? (
          <View className="items-center px-6 py-14">
            <Feather name="truck" color="#94a3b8" size={40} />
            <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('admin.deliveryFeeManagement.empty', 'No platform delivery fees found.')}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[1080px]">
              <View className="flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                {[
                  { key: 'order', label: t('admin.deliveryFeeManagement.columns.order', 'Order'), width: 'w-[110px]' },
                  { key: 'seller', label: t('admin.deliveryFeeManagement.columns.seller', 'Seller'), width: 'w-[150px]' },
                  {
                    key: 'fee',
                    label: t('admin.deliveryFeeManagement.columns.feeQuoted', 'Fee Quoted'),
                    width: 'w-[120px]',
                  },
                  {
                    key: 'deliveryStatus',
                    label: t('admin.deliveryFeeManagement.columns.deliveryStatus', 'Delivery Status'),
                    width: 'w-[140px]',
                  },
                  {
                    key: 'feeStatus',
                    label: t('admin.deliveryFeeManagement.columns.feeStatus', 'Fee Status'),
                    width: 'w-[120px]',
                  },
                  {
                    key: 'collectedOn',
                    label: t('admin.deliveryFeeManagement.columns.collectedOn', 'Collected On'),
                    width: 'w-[120px]',
                  },
                  { key: 'ref', label: t('admin.deliveryFeeManagement.columns.ref', 'Ref'), width: 'w-[110px]' },
                  {
                    key: 'actions',
                    label: t('admin.deliveryFeeManagement.columns.actions', 'Actions'),
                    width: 'w-[170px]',
                  },
                ].map((column) => (
                  <View key={column.key} className={`${column.width} px-2`}>
                    <Text className="font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      {column.label}
                    </Text>
                  </View>
                ))}
              </View>

              {filteredDeliveries.map((delivery) => {
                const isOutstanding = delivery.deliveryFeeStatus === 'outstanding';
                const isCollected = delivery.deliveryFeeStatus === 'collected';

                return (
                  <View
                    key={delivery.id}
                    className="flex-row border-t border-gray-100 px-4 py-3 dark:border-slate-700">
                    <View className="w-[110px] justify-center px-2">
                      <Text className="font-sans text-xs font-semibold text-gray-800 dark:text-slate-100">
                        {delivery.orderNumber || `#${delivery.orderId}`}
                      </Text>
                      <Text className="mt-0.5 font-sans text-[10px] text-gray-400 dark:text-slate-500">
                        {formatDate(delivery.createdAt)}
                      </Text>
                    </View>
                    <View className="w-[150px] justify-center px-2">
                      <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
                        {delivery.supplierName || '—'}
                      </Text>
                      {delivery.supplierEmail ? (
                        <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500" numberOfLines={1}>
                          {delivery.supplierEmail}
                        </Text>
                      ) : null}
                    </View>
                    <View className="w-[120px] justify-center px-2">
                      <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                        {delivery.platformDeliveryFee}
                      </Text>
                    </View>
                    <View className="w-[140px] justify-center px-2">
                      <DeliveryStatusBadge status={delivery.status} />
                    </View>
                    <View className="w-[120px] justify-center px-2">
                      <FeeStatusBadge status={delivery.deliveryFeeStatus} />
                    </View>
                    <View className="w-[120px] justify-center px-2">
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                        {formatDate(delivery.deliveryFeeCollectedAt)}
                      </Text>
                    </View>
                    <View className="w-[110px] justify-center px-2">
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
                        {delivery.deliveryFeeCollectionRef || '—'}
                      </Text>
                    </View>
                    <View className="w-[170px] items-end justify-center gap-1.5 px-2">
                      {isOutstanding ? (
                        <>
                          <Pressable
                            onPress={() => setAdjustTarget(delivery)}
                            className="flex-row items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5">
                            <Feather name="edit-2" size={12} color="#fff" />
                            <Text className="font-sans text-[11px] font-medium text-white">
                              {t('admin.deliveryFeeManagement.actions.adjustFee', 'Adjust fee')}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setCollectTarget(delivery)}
                            className="rounded-lg bg-green-600 px-3 py-1.5">
                            <Text className="font-sans text-[11px] font-medium text-white">
                              {t('admin.deliveryFeeManagement.actions.markCollected', 'Mark Collected')}
                            </Text>
                          </Pressable>
                        </>
                      ) : null}
                      {isCollected ? (
                        <View className="flex-row items-center gap-1">
                          <Feather name="check-circle" size={14} color="#16a34a" />
                          <Text className="font-sans text-xs font-medium text-green-600 dark:text-green-400">
                            {t('admin.deliveryFeeManagement.actions.done', 'Done')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
