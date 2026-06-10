import Feather from '@expo/vector-icons/Feather';
import { Link, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { ProductListCard, PRODUCT_CARD_CAROUSEL_CLASS } from '@/components/marketplace-list-screen';
import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import type { HomeProduct, ProductDetail, ProductReview } from '@/utils/native-api';

function Stars({
  rating,
  count,
  showCount = true,
}: {
  rating: number;
  count?: number;
  showCount?: boolean;
}) {
  const { isDark } = useTheme();
  const emptyStarColor = isDark ? '#64748b' : '#d1d5db';
  const filled = Math.round(rating || 0);
  return (
    <View className="flex-row items-center gap-1">
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Feather
            key={star}
            name="star"
            color={star <= filled ? '#f59e0b' : emptyStarColor}
            size={14}
          />
        ))}
      </View>
      {showCount && count !== undefined ? (
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
          ({count})
        </Text>
      ) : null}
    </View>
  );
}

function ReviewItem({ review }: { review: ProductReview }) {
  const { t } = useAppTranslation();

  return (
    <View className="border-b border-gray-200 pb-6 dark:border-slate-700">
      <View className="flex-row gap-4">
        <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-200 dark:border-slate-600 dark:bg-slate-700">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
            {t('productDetail.user')}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="break-words font-sans font-medium text-gray-900 dark:text-slate-100">
            {review.author}
          </Text>
          {review.company ? (
            <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
              {review.company}
            </Text>
          ) : null}
          <View className="mt-1 flex-row flex-wrap items-center gap-y-1">
            <Stars rating={review.rating} showCount={false} />
            {review.createdAt ? (
              <Text className="ml-2 font-sans text-sm text-gray-500 dark:text-slate-400">
                {review.createdAt}
              </Text>
            ) : null}
          </View>
          <Text className="mt-3 break-words font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
            {review.comment}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MoreFromSellerSkeleton() {
  return (
    <View className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <View
          key={index}
          className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-800"
        >
          <View className="aspect-square animate-pulse bg-gray-200 dark:bg-slate-700" />
          <View className="gap-2 p-3">
            <View className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
            <View className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
            <View className="mt-3 h-8 animate-pulse rounded-xl bg-gray-200 dark:bg-slate-700" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ProductDetailSecondarySections({
  product,
  moreProducts,
  moreProductsLoading = false,
  reviews,
  sellerHref,
  canReview,
  hasReviewed = false,
  submittingReview,
  reviewMessage,
  onSubmitReview,
  onWriteReviewPress,
}: {
  product: ProductDetail;
  moreProducts: HomeProduct[];
  moreProductsLoading?: boolean;
  reviews: ProductReview[];
  sellerHref: Href;
  canReview: boolean;
  hasReviewed?: boolean;
  submittingReview: boolean;
  reviewMessage?: { type: 'success' | 'error' | 'info'; text: string } | null;
  onSubmitReview: (rating: number, comment: string) => Promise<boolean>;
  onWriteReviewPress?: () => boolean;
}) {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const emptyStarColor = isDark ? '#64748b' : '#d1d5db';
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submit = async () => {
    const ok = await onSubmitReview(rating, comment);
    if (ok) {
      setRating(0);
      setComment('');
      setFormOpen(false);
    }
  };

  return (
    <View className="min-w-0">
      {moreProductsLoading || moreProducts.length > 0 ? (
        <View className="mt-14 min-w-0">
          <View className="mb-5 gap-3 sm:flex-row sm:items-end sm:justify-between">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                {t('productDetail.more_from_seller')}
              </Text>
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                {t('productDetail.more_from_seller_subtitle')}
              </Text>
            </View>
            {product.seller ? (
              <Link href={sellerHref} asChild>
                <Pressable className="self-start">
                  <Text className="font-sans text-sm font-medium text-green-600 dark:text-green-400">
                    {t('productDetail.view_store')}
                  </Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
          {moreProductsLoading ? (
            <MoreFromSellerSkeleton />
          ) : (
            <View className="min-w-0 w-full">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                className="scroll-x-only w-full max-w-full"
                contentContainerClassName="gap-3 sm:gap-4">
                {moreProducts.map((item) => (
                  <ProductListCard
                    key={String(item.id)}
                    product={item}
                    className={PRODUCT_CARD_CAROUSEL_CLASS}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      ) : null}

      <View className="mt-16 min-w-0">
        <View className="mb-6 gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100 sm:text-2xl">
            {t('productDetail.customer_reviews')} ({product.reviewCount || reviews.length})
          </Text>
          {!hasReviewed ? (
            <Pressable
              onPress={() => {
                if (onWriteReviewPress && !onWriteReviewPress()) return;
                setFormOpen((current) => !current);
              }}
              className="self-start rounded-md bg-green-600 px-4 py-2"
            >
              <Text className="font-sans text-sm font-semibold text-white">
                {t('productDetail.write_review')}
              </Text>
            </Pressable>
          ) : (
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('productDetail.already_reviewed')}
            </Text>
          )}
        </View>

        {formOpen ? (
          <View className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            {reviewMessage ? (
              <View
                className={`mb-4 rounded-xl p-3 ${
                  reviewMessage.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-green-50 dark:bg-green-900/20'
                }`}
              >
                <Text
                  className={`font-sans text-sm font-semibold ${
                    reviewMessage.type === 'error'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}
                >
                  {reviewMessage.text}
                </Text>
              </View>
            ) : null}
            <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">
              {t('productDetail.write_review')}
            </Text>
            <Text className="mt-3 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
              {t('productDetail.your_rating')}
            </Text>
            <View className="mt-2 flex-row gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)} className="h-9 w-9 items-center justify-center">
                  <Feather name="star" color={star <= rating ? '#f59e0b' : emptyStarColor} size={24} />
                </Pressable>
              ))}
            </View>
            <Text className="mt-4 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
              {t('productDetail.your_review')}
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={t('productDetail.review_placeholder')}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              className="mt-2 min-h-28 rounded-xl border border-gray-200 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {!canReview ? (
              <Text className="mt-3 font-sans text-xs text-amber-700 dark:text-amber-300">
                {t('productDetail.only_buyers_review')}
              </Text>
            ) : null}
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setFormOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-slate-600 dark:bg-slate-800"
              >
                <Text className="text-center font-sans text-sm font-bold text-gray-600 dark:text-slate-300">
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void submit()}
                disabled={!canReview || !rating || submittingReview}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 disabled:opacity-50"
              >
                {submittingReview ? <ActivityIndicator color="#ffffff" /> : null}
                <Text className="text-center font-sans text-sm font-bold text-white">
                  {submittingReview ? t('productDetail.submitting') : t('productDetail.submit_review')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : reviewMessage ? (
          <View
            className={`mb-6 rounded-xl p-3 ${
              reviewMessage.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-green-50 dark:bg-green-900/20'
            }`}
          >
            <Text
              className={`font-sans text-sm font-semibold ${
                reviewMessage.type === 'error'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-green-700 dark:text-green-300'
              }`}
            >
              {reviewMessage.text}
            </Text>
          </View>
        ) : null}

        {reviews.length > 0 ? (
          <View className="gap-6">
            {reviews.map((review) => (
              <ReviewItem key={String(review.id)} review={review} />
            ))}
          </View>
        ) : (
          <View className="items-center py-8">
            <Text className="font-sans text-lg text-gray-500 dark:text-slate-400">
              {t('productDetail.no_reviews_title')}
            </Text>
            <Text className="mt-1 text-center font-sans text-sm text-gray-400 dark:text-slate-400">
              {t('productDetail.no_reviews_subtitle')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
