import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAppTranslation } from '@/i18n';
import {
  fetchSellerProductReviews,
  type SellerProductReview,
  type SellerProductReviewsResult,
} from '@/utils/native-api';

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';

const ratingFilters: RatingFilter[] = ['all', '5', '4', '3', '2', '1'];

const activeFilterClass = (filter: RatingFilter) => {
  if (filter === '5' || filter === '4') return 'bg-green-100 dark:bg-green-900/30';
  if (filter === '3') return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (filter === '2') return 'bg-orange-100 dark:bg-orange-900/30';
  if (filter === '1') return 'bg-red-100 dark:bg-red-900/30';
  return 'bg-blue-100 dark:bg-blue-900/30';
};

const activeTextClass = (filter: RatingFilter) => {
  if (filter === '5' || filter === '4') return 'text-green-800 dark:text-green-300';
  if (filter === '3') return 'text-yellow-800 dark:text-yellow-300';
  if (filter === '2') return 'text-orange-800 dark:text-orange-300';
  if (filter === '1') return 'text-red-800 dark:text-red-300';
  return 'text-blue-800 dark:text-blue-300';
};

function StarRow({ rating, size = 20 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= Math.round(rating);
        return (
          <Feather
            key={star}
            name="star"
            color={active ? '#facc15' : '#d1d5db'}
            size={size}
          />
        );
      })}
    </View>
  );
}

function formatReviewDate(value: string, language: string) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === 'my' ? 'my-MM' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ReviewCard({
  review,
  language,
}: {
  review: SellerProductReview;
  language: string;
}) {
  const { t } = useAppTranslation();

  return (
    <View className="rounded-lg border border-gray-200 p-6 dark:border-slate-700">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center">
          <View className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-dashed border-gray-300 bg-gray-200 dark:border-slate-600 dark:bg-slate-700" />
          <View className="ml-4 min-w-0">
            <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
              {review.buyerName || t('seller.reviews.unknown_user', 'Unknown user')}
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
              {formatReviewDate(review.createdAt, language)}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <StarRow rating={review.rating} size={18} />
          <Pressable className="h-8 w-8 items-center justify-center rounded-full">
            <Feather name="more-vertical" color="#9ca3af" size={20} />
          </Pressable>
        </View>
      </View>

      <View className="mt-4">
        <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-200">
          {review.comment || t('seller.reviews.no_comment', 'No written comment.')}
        </Text>
        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('seller.reviews.for_product', 'For product')}:
          </Text>
          <Text className="min-w-0 flex-1 font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {review.productName || t('seller.reviews.unknown_product', 'Unknown product')}
          </Text>
        </View>
      </View>

      {review.reply ? (
        <View className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <View className="flex-row gap-3">
            <Feather name="message-circle" color="#3b82f6" size={20} />
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-sm font-medium text-blue-800 dark:text-blue-300">
                {t('seller.reviews.your_response', 'Your response')}
              </Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-blue-700 dark:text-blue-300">
                {review.reply}
              </Text>
              <Pressable className="mt-2 self-start">
                <Text className="font-sans text-sm font-medium text-blue-600 dark:text-blue-400">
                  {t('seller.reviews.edit_response', 'Edit response')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <Pressable className="mt-4 flex-row items-center gap-1 self-start">
          <Feather name="corner-up-left" color="#2563eb" size={16} />
          <Text className="font-sans text-sm font-medium text-blue-600 dark:text-blue-400">
            {t('seller.reviews.reply_to_review', 'Reply to review')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function ReviewManagementNative() {
  const { t, i18n } = useAppTranslation();
  const [activeFilter, setActiveFilter] = useState<RatingFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SellerProductReviewsResult>({
    reviews: [],
    currentPage: 1,
    lastPage: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchSellerProductReviews(page, controller.signal)
      .then((nextResult) => {
        setResult(nextResult);
        setActiveFilter('all');
      })
      .catch((reviewError: unknown) => {
        if (controller.signal.aborted) return;
        setError(reviewError instanceof Error ? reviewError.message : t('seller.reviews.fetch_error', 'Failed to fetch reviews'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, refreshKey, t]);

  const reviews = result.reviews;
  const averageRating = useMemo(
    () => (reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0),
    [reviews],
  );
  const ratingCounts = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((rating) => {
        const count = reviews.filter((review) => review.rating === rating).length;
        return {
          rating,
          count,
          percent: reviews.length ? (count / reviews.length) * 100 : 0,
        };
      }),
    [reviews],
  );
  const filteredReviews = useMemo(
    () =>
      activeFilter === 'all'
        ? reviews
        : reviews.filter((review) => review.rating === Number(activeFilter)),
    [activeFilter, reviews],
  );

  return (
    <View className="rounded-lg bg-white p-6 shadow dark:bg-slate-800 dark:shadow-slate-900/50">
      <Text className="mb-6 font-sans text-2xl font-bold text-gray-800 dark:text-slate-100">
        {t('seller.reviews.title', 'Product Reviews')}
      </Text>

      {loading ? (
        <View className="h-64 items-center justify-center">
          <ActivityIndicator color="#16a34a" size="large" />
        </View>
      ) : error ? (
        <View className="items-center rounded-lg border border-red-100 bg-red-50 px-4 py-8 dark:border-red-900 dark:bg-red-950">
          <Feather name="alert-circle" color="#ef4444" size={28} />
          <Text className="mt-3 text-center font-sans text-sm text-red-600 dark:text-red-300">
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              setError('');
              setRefreshKey((current) => current + 1);
            }}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2"
          >
            <Text className="font-sans text-sm font-semibold text-white">
              {t('common.retry', 'Retry')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="mb-8 rounded-lg border border-gray-100 bg-gray-50 p-6 dark:border-slate-600 dark:bg-slate-700/50">
            <View className="gap-5 md:flex-row md:items-center md:justify-between">
              <View className="flex-row items-center">
                <Text className="mr-4 font-sans text-5xl font-bold text-gray-900 dark:text-slate-100">
                  {averageRating.toFixed(1)}
                </Text>
                <View>
                  <StarRow rating={averageRating} size={24} />
                  <Text className="mt-1 font-sans text-sm text-gray-600 dark:text-slate-400">
                    {t('seller.reviews.based_on', 'Based on {{count}} reviews', { count: reviews.length })}
                  </Text>
                </View>
              </View>

              <View className="w-full gap-2 md:w-auto">
                {ratingCounts.map(({ rating, count, percent }) => (
                  <View key={rating} className="flex-row items-center">
                    <View className="mr-3 h-2.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                      <View className="h-full rounded-full bg-yellow-400" style={{ width: `${percent}%` }} />
                    </View>
                    <View className="flex-row items-center">
                      <Text className="mr-1 font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                        {rating}
                      </Text>
                      <Feather name="star" color="#facc15" size={16} />
                    </View>
                    <Text className="ml-1 font-sans text-sm text-gray-500 dark:text-slate-400">
                      ({count})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <View className="flex-row gap-2 pb-2">
              {ratingFilters.map((filter) => {
                const active = activeFilter === filter;
                const count =
                  filter === 'all'
                    ? reviews.length
                    : ratingCounts.find((item) => item.rating === Number(filter))?.count || 0;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setActiveFilter(filter)}
                    className={`rounded-full px-4 py-2 ${
                      active
                        ? activeFilterClass(filter)
                        : 'bg-gray-100 dark:bg-slate-700'
                    }`}
                  >
                    <Text
                      className={`whitespace-nowrap font-sans text-sm font-medium ${
                        active
                          ? activeTextClass(filter)
                          : 'text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {filter === 'all'
                        ? `${t('seller.reviews.all_reviews', 'All reviews')} (${count})`
                        : `${filter} ${t('seller.reviews.star', 'star')} (${count})`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="gap-6">
            {filteredReviews.length === 0 ? (
              <View className="items-center py-8">
                <Feather name="star" color="#94a3b8" size={34} />
                <Text className="mt-3 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('seller.reviews.no_reviews_found', 'No reviews found')}
                </Text>
              </View>
            ) : (
              filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} language={i18n.language} />
              ))
            )}
          </View>

          {result.lastPage > 1 ? (
            <View className="mt-8 gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Pressable
                onPress={() => {
                  setLoading(true);
                  setError('');
                  setPage((current) => Math.max(current - 1, 1));
                }}
                disabled={result.currentPage <= 1}
                className={`items-center rounded-md border px-4 py-2 ${
                  result.currentPage <= 1
                    ? 'border-gray-300 bg-gray-100 dark:border-slate-600 dark:bg-slate-700'
                    : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                <Text
                  className={`font-sans text-sm font-medium ${
                    result.currentPage <= 1
                      ? 'text-gray-400 dark:text-slate-500'
                      : 'text-gray-700 dark:text-slate-300'
                  }`}
                >
                  {t('seller.previous', 'Previous')}
                </Text>
              </Pressable>
              <Text className="text-center font-sans text-sm text-gray-700 dark:text-slate-300">
                {t('seller.page', 'Page')}{' '}
                <Text className="font-semibold">{result.currentPage}</Text>{' '}
                {t('seller.of', 'of')}{' '}
                <Text className="font-semibold">{result.lastPage}</Text>
              </Text>
              <Pressable
                onPress={() => {
                  setLoading(true);
                  setError('');
                  setPage((current) => Math.min(current + 1, result.lastPage));
                }}
                disabled={result.currentPage >= result.lastPage}
                className={`items-center rounded-md border px-4 py-2 ${
                  result.currentPage >= result.lastPage
                    ? 'border-gray-300 bg-gray-100 dark:border-slate-600 dark:bg-slate-700'
                    : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                <Text
                  className={`font-sans text-sm font-medium ${
                    result.currentPage >= result.lastPage
                      ? 'text-gray-400 dark:text-slate-500'
                      : 'text-gray-700 dark:text-slate-300'
                  }`}
                >
                  {t('seller.next', 'Next')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
