import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTranslation } from '@/i18n';
import {
  fetchAdminProductReviews,
  fetchAdminSellerReviews,
  updateAdminReviewStatus,
  type AdminReview,
} from '@/utils/native-api';

type ReviewTab = 'seller' | 'product';

const TABLE_COLUMNS = [
  { key: 'reviewer', width: 'w-[140px]' },
  { key: 'target', width: 'w-[160px]' },
  { key: 'rating', width: 'w-[110px]' },
  { key: 'comment', width: 'w-[200px]' },
  { key: 'status', width: 'w-[110px]' },
  { key: 'date', width: 'w-[110px]' },
  { key: 'actions', width: 'w-[160px]' },
] as const;

function StarRow({ rating }: { rating: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <Feather
          key={star}
          name="star"
          color={star <= Math.round(rating) ? '#fbbf24' : '#d1d5db'}
          size={14}
        />
      ))}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const normalized = status || 'pending';
  const className =
    normalized === 'approved'
      ? 'bg-green-100 dark:bg-green-900/30'
      : normalized === 'rejected'
        ? 'bg-red-100 dark:bg-red-900/30'
        : 'bg-yellow-100 dark:bg-yellow-900/30';
  const textClass =
    normalized === 'approved'
      ? 'text-green-800 dark:text-green-300'
      : normalized === 'rejected'
        ? 'text-red-800 dark:text-red-300'
        : 'text-yellow-800 dark:text-yellow-300';

  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${className}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${textClass}`}>
        {t(`admin.reviewManagement.status.${normalized}`, normalized)}
      </Text>
    </View>
  );
}

function ReviewTable({
  reviews,
  actionLoading,
  onAction,
}: {
  reviews: AdminReview[];
  actionLoading: string | number | null;
  onAction: (reviewId: string | number, status: 'approved' | 'rejected') => void;
}) {
  const { t } = useAppTranslation();

  if (reviews.length === 0) {
    return (
      <View className="items-center py-14">
        <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">
          {t('admin.reviewManagement.noReviews', 'No reviews found.')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
      <View className="w-full min-w-[990px]">
        <View className="flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900/50">
          {TABLE_COLUMNS.map((column) => (
            <View key={column.key} className={`${column.width} px-2`}>
              <Text className="font-sans text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {t(`admin.reviewManagement.table.${column.key}`, column.key)}
              </Text>
            </View>
          ))}
        </View>

        {reviews.map((review) => {
          const createdLabel = review.createdAt
            ? new Date(review.createdAt).toLocaleDateString()
            : '—';

          return (
            <View key={String(review.id)} className="flex-row border-t border-gray-100 px-4 py-3 dark:border-slate-700/50">
              <View className="w-[140px] justify-center px-2">
                <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
                  {review.reviewerName}
                </Text>
              </View>
              <View className="w-[160px] justify-center px-2">
                <Text className="font-sans text-sm text-gray-600 dark:text-slate-400" numberOfLines={2}>
                  {review.targetName}
                </Text>
              </View>
              <View className="w-[110px] justify-center px-2">
                <StarRow rating={review.rating} />
              </View>
              <View className="w-[200px] justify-center px-2">
                <Text className="font-sans text-sm text-gray-600 dark:text-slate-400" numberOfLines={2}>
                  {review.comment || '—'}
                </Text>
              </View>
              <View className="w-[110px] justify-center px-2">
                <StatusBadge status={review.status} />
              </View>
              <View className="w-[110px] justify-center px-2">
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{createdLabel}</Text>
              </View>
              <View className="w-[160px] flex-row flex-wrap items-center gap-2 px-2">
                {review.status !== 'approved' ? (
                  <Pressable
                    onPress={() => onAction(review.id, 'approved')}
                    disabled={actionLoading === review.id}
                    className="flex-row items-center gap-1 disabled:opacity-50">
                    {actionLoading === review.id ? (
                      <ActivityIndicator color="#15803d" size="small" />
                    ) : (
                      <Feather name="check" color="#15803d" size={14} />
                    )}
                    <Text className="font-sans text-xs font-medium text-green-700 dark:text-green-400">
                      {t('admin.reviewManagement.actions.approve', 'Approve')}
                    </Text>
                  </Pressable>
                ) : null}
                {review.status !== 'rejected' ? (
                  <Pressable
                    onPress={() => onAction(review.id, 'rejected')}
                    disabled={actionLoading === review.id}
                    className="flex-row items-center gap-1 disabled:opacity-50">
                    <Feather name="x" color="#dc2626" size={14} />
                    <Text className="font-sans text-xs font-medium text-red-600 dark:text-red-400">
                      {t('admin.reviewManagement.actions.reject', 'Reject')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function ReviewManagementNative() {
  const { t } = useAppTranslation();
  const [tab, setTab] = useState<ReviewTab>('seller');
  const [sellerReviews, setSellerReviews] = useState<AdminReview[]>([]);
  const [productReviews, setProductReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [sellerResult, productResult] = await Promise.allSettled([
        fetchAdminSellerReviews(),
        fetchAdminProductReviews(),
      ]);

      if (sellerResult.status === 'fulfilled') setSellerReviews(sellerResult.value);
      if (productResult.status === 'fulfilled') setProductReviews(productResult.value);

      if (sellerResult.status === 'rejected' && productResult.status === 'rejected') {
        throw sellerResult.reason;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('admin.reviewManagement.errors.load', 'Failed to load reviews.')
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const handleAction = async (reviewId: string | number, status: 'approved' | 'rejected') => {
    setActionLoading(reviewId);

    try {
      await updateAdminReviewStatus(tab, reviewId, status);
      const update = (items: AdminReview[]) =>
        items.map((item) => (item.id === reviewId ? { ...item, status } : item));

      if (tab === 'seller') setSellerReviews(update);
      else setProductReviews(update);

      flash(t(`admin.reviewManagement.messages.${status}`, 'Review updated successfully.'));
    } catch (err) {
      flash(
        err instanceof Error ? err.message : t('admin.reviewManagement.errors.update', 'Failed to update review.'),
        'error'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const reviews = tab === 'seller' ? sellerReviews : productReviews;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reviews;

    return reviews.filter(
      (review) =>
        review.reviewerName.toLowerCase().includes(query) ||
        review.targetName.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query)
    );
  }, [reviews, search]);

  return (
    <View className="gap-4">
      {toast ? (
        <View
          className={`flex-row items-center gap-2 rounded-xl border px-4 py-3 ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}>
          <Feather
            name={toast.type === 'success' ? 'check-circle' : 'alert-circle'}
            size={16}
            color={toast.type === 'success' ? '#15803d' : '#dc2626'}
          />
          <Text
            className={`flex-1 font-sans text-sm font-medium ${
              toast.type === 'success'
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
            {toast.msg}
          </Text>
        </View>
      ) : null}

      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View>
          <View className="flex-row items-center gap-2">
            <Feather name="message-square" size={20} color="#16a34a" />
            <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {t('admin.reviewManagement.title', 'Review Management')}
            </Text>
          </View>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('admin.reviewManagement.count', '{{count}} reviews', { count: filtered.length })}
          </Text>
        </View>
        <Pressable
          onPress={() => void fetchAll()}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-700">
          <Feather name="refresh-cw" color="#64748b" size={16} />
        </Pressable>
      </View>

      <View className="flex-row gap-1 self-start rounded-xl bg-gray-100 p-1 dark:bg-slate-700">
        {([
          ['seller', t('admin.reviewManagement.tabs.seller', 'Seller Reviews')],
          ['product', t('admin.reviewManagement.tabs.product', 'Product Reviews')],
        ] as const).map(([key, label]) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                setTab(key);
                setSearch('');
              }}
              className={`rounded-lg px-4 py-1.5 ${active ? 'bg-white shadow-sm dark:bg-slate-600' : ''}`}>
              <Text
                className={`font-sans text-sm font-medium ${
                  active
                    ? 'text-gray-900 dark:text-slate-100'
                    : 'text-gray-500 dark:text-slate-400'
                }`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="relative max-w-sm">
        <Feather
          name="search"
          color="#94a3b8"
          size={16}
          style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('admin.reviewManagement.searchPlaceholder', 'Search reviews...')}
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#16a34a" size="large" />
          </View>
        ) : error ? (
          <View className="items-center px-4 py-8">
            <Text className="text-center font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
            <Pressable onPress={() => void fetchAll()} className="mt-3">
              <Text className="font-sans text-sm font-semibold text-green-700 underline dark:text-green-300">
                {t('admin.reviewManagement.retry', 'Retry')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <ReviewTable
            reviews={filtered}
            actionLoading={actionLoading}
            onAction={(reviewId, status) => void handleAction(reviewId, status)}
          />
        )}
      </View>
    </View>
  );
}
