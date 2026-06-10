import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import {
  confirmAdminDeliveryFee,
  fetchAdminPendingDeliveryFees,
  type AdminPendingDeliveryFee,
} from '@/utils/native-api';

const formatSubmittedAt = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function DeliveryFeeReviewNative() {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const [fees, setFees] = useState<AdminPendingDeliveryFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextFees = await fetchAdminPendingDeliveryFees();
      setFees(nextFees);
    } catch {
      setFees([]);
      flash(
        t('admin.deliveryFeeReview.errors.load', 'Failed to load pending delivery fees.'),
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmFee = async (fee: AdminPendingDeliveryFee) => {
    setConfirmingId(fee.id);
    try {
      const note = notes[fee.id]?.trim() || t('admin.deliveryFeeReview.defaultNote', 'Confirmed by admin.');
      await confirmAdminDeliveryFee(fee.id, note);
      flash(t('admin.deliveryFeeReview.messages.confirmed', 'Fee confirmed!'));
      setNotes((current) => {
        const next = { ...current };
        delete next[fee.id];
        return next;
      });
      await load();
    } catch (error) {
      flash(
        error instanceof Error
          ? error.message
          : t('admin.deliveryFeeReview.errors.confirm', 'Failed to confirm.'),
        'error',
      );
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <View className="gap-5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
            {t('admin.deliveryFeeReview.title', 'Delivery Fee Confirmations')}
          </Text>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-500">
            {t(
              'admin.deliveryFeeReview.subtitle',
              'Sellers have submitted delivery fee payment — confirm receipt below.',
            )}
          </Text>
        </View>
        <Pressable
          onPress={() => void load()}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-800">
          <Feather name="refresh-cw" size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
        </Pressable>
      </View>

      {toast ? (
        <Pressable onPress={() => setToast(null)}>
          <View
            className={`rounded-xl border p-3 ${
              toast.type === 'success'
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}>
            <Text
              className={`font-sans text-sm font-medium ${
                toast.type === 'success'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
              {toast.msg}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator color="#22c55e" size="large" />
        </View>
      ) : fees.length === 0 ? (
        <View className="items-center rounded-2xl border border-gray-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-800">
          <Feather name="check-circle" size={36} color="#94a3b8" />
          <Text className="mt-3 text-center font-sans text-sm text-gray-400 dark:text-slate-600">
            {t('admin.deliveryFeeReview.empty', 'No pending delivery fee confirmations.')}
          </Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View className="min-w-full">
              <View className="min-w-[920px] flex-row border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                {[
                  { label: t('admin.deliveryFeeReview.columns.order', 'Order #'), width: 'w-28' },
                  { label: t('admin.deliveryFeeReview.columns.seller', 'Seller'), width: 'w-40' },
                  { label: t('admin.deliveryFeeReview.columns.fee', 'Fee'), width: 'w-32' },
                  { label: t('admin.deliveryFeeReview.columns.submittedAt', 'Submitted At'), width: 'w-44' },
                  { label: t('admin.deliveryFeeReview.columns.sellerNote', 'Seller Note'), width: 'w-40' },
                  { label: t('admin.deliveryFeeReview.columns.action', 'Action'), width: 'w-72' },
                ].map((heading) => (
                  <Text
                    key={heading.label}
                    className={`${heading.width} pr-4 font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500`}>
                    {heading.label}
                  </Text>
                ))}
              </View>

              {fees.map((fee) => {
                const isConfirming = confirmingId === fee.id;
                return (
                  <View
                    key={fee.id}
                    className="min-w-[920px] flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-slate-700">
                    <Text className="w-28 pr-4 font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                      #{fee.orderNumber}
                    </Text>
                    <Text
                      className="w-40 pr-4 font-sans text-sm text-gray-700 dark:text-slate-300"
                      numberOfLines={1}>
                      {fee.sellerName}
                    </Text>
                    <Text className="w-32 pr-4 font-sans text-sm font-semibold text-green-700 dark:text-green-400">
                      {fee.platformDeliveryFee}
                    </Text>
                    <Text className="w-44 pr-4 font-sans text-xs text-gray-500 dark:text-slate-500">
                      {formatSubmittedAt(fee.feeSubmittedAt)}
                    </Text>
                    <Text
                      className="w-40 pr-4 font-sans text-xs text-gray-500 dark:text-slate-500"
                      numberOfLines={2}>
                      {fee.feeSubmissionNote || '—'}
                    </Text>
                    <View className="w-72 flex-row items-center gap-2">
                      <TextInput
                        value={notes[fee.id] || ''}
                        onChangeText={(value) =>
                          setNotes((current) => ({ ...current, [fee.id]: value }))
                        }
                        placeholder={t('admin.deliveryFeeReview.notePlaceholder', 'Note (optional)')}
                        placeholderTextColor="#9ca3af"
                        editable={confirmingId !== fee.id}
                        className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 font-sans text-xs text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                      <Pressable
                        disabled={confirmingId === fee.id}
                        onPress={() => void confirmFee(fee)}
                        className="rounded-xl bg-green-600 px-3 py-1.5 disabled:opacity-50">
                        {isConfirming ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text className="font-sans text-xs font-semibold text-white">
                            {t('admin.deliveryFeeReview.confirm', '✓ Confirm')}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
