import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { ProductMarketplaceGrid } from '@/components/marketplace/marketplace-grid';
import { SocialShareModal } from '@/components/ui/social-share-modal';
import { useNativeAuth } from '@/context/native-auth';
import { useAppTranslation } from '@/i18n';
import { hasUserRole } from '@/utils/auth-routing';
import { getThumbUrl } from '@/utils/image-thumbs';
import {
    computeReviewStatsFromReviews,
    fetchSellerDeliveryAreas,
    fetchSellerProfile,
    fetchSellerReviews,
    formatApiErrorMessage,
    submitSellerReview,
    type HomeProduct,
    type SellerDeliveryArea,
    type SellerProfile,
    type SellerProfileResult,
    type SellerReview,
    type SellerReviewStats,
} from '@/utils/native-api';
import { buildSocialSharePayload } from '@/utils/social-share';

const tabKeys = ['products', 'reviews', 'about', 'policies', 'delivery'] as const;

type TabKey = (typeof tabKeys)[number];

const getTabLabel = (tab: TabKey, seller: SellerProfile, productCount: number) => {
  switch (tab) {
    case 'products':
      return `Products (${seller.products || productCount})`;
    case 'reviews':
      return `Reviews (${seller.reviews})`;
    case 'about':
      return 'About';
    case 'policies':
      return 'Policies';
    case 'delivery':
      return 'Delivery Zones';
    default:
      return tab;
  }
};

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatK = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value || 0);
};

const policyItems = [
  { key: 'returnPolicy', label: 'Return & Refund Policy' },
  { key: 'shippingPolicy', label: 'Shipping Policy' },
  { key: 'warrantyPolicy', label: 'Warranty Policy' },
  { key: 'privacyPolicy', label: 'Privacy Policy' },
  { key: 'termsOfService', label: 'Terms of Service' },
] as const;

function Stars({ rating, count }: { rating: number; count?: number }) {
  const filled = Math.round(rating);

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <FontAwesome
            key={star}
            name={star <= filled ? 'star' : 'star-o'}
            color={star <= filled ? '#f59e0b' : '#cbd5e1'}
            size={14}
          />
        ))}
      </View>
      <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
        {rating > 0 ? rating.toFixed(1) : '0.0'}
        {Number(count) > 0 ? ` (${count})` : ''}
      </Text>
    </View>
  );
}

function TodayHours({ seller }: { seller: SellerProfile }) {
  const todayName = dayLabels[new Date().getDay()].toLowerCase();
  const today = seller.businessHours[todayName];

  if (!today) return null;

  return (
    <View className="mt-2 flex-row items-center gap-1.5">
      <Feather name="clock" color="#94a3b8" size={14} />
      <Text
        className={`font-sans text-xs font-medium ${
          today.closed ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        }`}>
        {today.closed ? 'Closed today' : `Open: ${today.open || '--'} - ${today.close || '--'}`}
      </Text>
    </View>
  );
}

function SellerSkeleton() {
  return (
    <AppLayout>
      <View className="bg-gray-50 dark:bg-slate-950">
        <View className="h-52 bg-gray-200 dark:bg-slate-800" />
        <View className="mx-auto w-full max-w-6xl px-4 pb-12">
          <View className="-mt-14 h-28 w-28 rounded-2xl bg-gray-300 dark:bg-slate-700" />
          <View className="mt-6 gap-3">
            <View className="h-8 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="h-20 rounded bg-gray-200 dark:bg-slate-800" />
          </View>
          <View className={Platform.OS === 'web' ? 'mt-8' : 'mt-6'}>
            <ProductMarketplaceGrid products={[]} loading skeletonCount={6} skeletonRows={2} />
          </View>
        </View>
      </View>
    </AppLayout>
  );
}

function StatChip({ icon, value, label }: { icon: keyof typeof Feather.glyphMap; value: string; label: string }) {
  return (
    <View className="min-w-[120px] flex-1 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm shadow-gray-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
      <View className="flex-row items-center gap-2">
        <Feather name={icon} color="#16a34a" size={16} />
        <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">{value}</Text>
      </View>
      <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function ReviewItem({ review }: { review: SellerReview }) {
  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-100 dark:border-slate-600 dark:bg-slate-800">
          <Text className="font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">
            {review.author.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100">
              {review.author}
            </Text>
            {review.createdAt ? (
              <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                {review.createdAt}
              </Text>
            ) : null}
          </View>
          <View className="mt-1">
            <Stars rating={review.rating} />
          </View>
          {review.comment ? (
            <Text className="mt-3 font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
              {review.comment}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function StarDistribution({
  reviewCount,
  reviewStats,
}: {
  reviewCount: number;
  reviewStats: SellerReviewStats;
}) {
  const starRows = [
    { star: 5, count: reviewStats.star5 },
    { star: 4, count: reviewStats.star4 },
    { star: 3, count: reviewStats.star3 },
    { star: 2, count: reviewStats.star2 },
    { star: 1, count: reviewStats.star1 },
  ];

  return (
    <View className="min-w-0 flex-1 gap-1.5">
      {starRows.map(({ star, count }) => {
        const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
        return (
          <View key={star} className="flex-row items-center gap-2">
            <Text className="w-3 font-sans text-xs text-gray-500 dark:text-slate-500">{star}</Text>
            <FontAwesome name="star" color="#facc15" size={12} />
            <View className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
              <View className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
            </View>
            <Text className="w-8 text-right font-sans text-xs text-gray-400 dark:text-slate-600">
              {pct}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SellerReviewForm({
  open,
  rating,
  comment,
  submitting,
  onOpen,
  onClose,
  onRatingChange,
  onCommentChange,
  onSubmit,
}: {
  open: boolean;
  rating: number;
  comment: string;
  submitting: boolean;
  onOpen: () => void;
  onClose: () => void;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
}) {
  if (!open) {
    return (
      <Pressable onPress={onOpen} className="flex-row items-center gap-2 self-start">
        <Feather name="message-circle" color="#16a34a" size={16} />
        <Text className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">
          Write a Review
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100">
        Your Review
      </Text>
      <View className="mt-3 flex-row gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => onRatingChange(star)} className="p-1">
            <FontAwesome
              name="star"
              color={star <= rating ? '#facc15' : '#e5e7eb'}
              size={28}
            />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={comment}
        onChangeText={onCommentChange}
        placeholder="Share your experience with this seller…"
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        className="mt-4 min-h-24 rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={onSubmit}
          disabled={!rating || submitting}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 disabled:opacity-50">
          {submitting ? <ActivityIndicator color="#ffffff" size="small" /> : null}
          <Text className="font-sans text-sm font-semibold text-white">
            {submitting ? 'Submitting…' : 'Submit Review'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          className="rounded-xl border border-gray-200 px-4 py-2.5 dark:border-slate-700">
          <Text className="font-sans text-sm font-semibold text-gray-600 dark:text-slate-400">
            Cancel
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <View>
      <Text className="font-sans text-[11px] font-semibold uppercase text-gray-400 dark:text-slate-500">
        {label}
      </Text>
      <Text className="mt-1 font-sans text-sm text-gray-900 dark:text-slate-100">{value}</Text>
    </View>
  );
}

const isFreeFee = (fee?: string) => {
  const normalized = String(fee || '').trim().toLowerCase();
  return !normalized || normalized === '0' || normalized === '0.00' || normalized === 'free';
};

const displayFee = (fee?: string) => (isFreeFee(fee) ? 'Free' : fee || '--');

type DeliveryRegionGroup = {
  key: string;
  title: string;
  isNationwide: boolean;
  regionArea?: SellerDeliveryArea;
  cityGroups: {
    city: string;
    cityArea?: SellerDeliveryArea;
    townships: SellerDeliveryArea[];
  }[];
};

function buildDeliveryRegionGroups(areas: SellerDeliveryArea[]): DeliveryRegionGroup[] {
  const groups = new Map<string, SellerDeliveryArea[]>();

  areas.forEach((area) => {
    const key = area.areaType === 'country' ? '__nationwide__' : area.state || 'Other';
    const current = groups.get(key) || [];
    current.push(area);
    groups.set(key, current);
  });

  return Array.from(groups.entries()).map(([key, regionAreas]) => {
    const isNationwide = key === '__nationwide__';
    const regionArea = regionAreas.find((area) =>
      ['state', 'country'].includes(area.areaType),
    );
    const subAreas = regionAreas.filter(
      (area) => !['state', 'country'].includes(area.areaType),
    );
    const cityMap = new Map<string, SellerDeliveryArea[]>();

    subAreas.forEach((area) => {
      const city = area.city || '--';
      const current = cityMap.get(city) || [];
      current.push(area);
      cityMap.set(city, current);
    });

    return {
      key,
      title: isNationwide ? 'Nationwide' : key,
      isNationwide,
      regionArea,
      cityGroups: Array.from(cityMap.entries()).map(([city, cityAreas]) => ({
        city,
        cityArea: cityAreas.find((area) => area.areaType === 'city'),
        townships: cityAreas.filter((area) => area.areaType !== 'city'),
      })),
    };
  });
}

function DeliveryZonesPanel({
  areas,
  loading,
}: {
  areas: SellerDeliveryArea[] | null;
  loading: boolean;
}) {
  const groups = useMemo(() => buildDeliveryRegionGroups(areas || []), [areas]);

  if (loading || areas === null) {
    return (
      <View className="flex-row flex-wrap gap-2 pb-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <View
            key={`delivery-skeleton-${index}`}
            className="h-24 w-[48%] rounded-lg bg-gray-100 dark:bg-slate-800 lg:w-[24%]"
            style={{ opacity: 1 - index * 0.08 }}
          />
        ))}
      </View>
    );
  }

  if (!areas.length) {
    return (
      <View className="items-center py-10">
        <Feather name="truck" color="#cbd5e1" size={30} />
        <Text className="mt-2 font-sans text-xs text-gray-400 dark:text-slate-500">
          No delivery zones published yet.
        </Text>
      </View>
    );
  }

  return (
    <View className="pb-6">
      <View className="flex-row flex-wrap gap-2">
        {groups.map((group) => (
          <View
            key={group.key}
            className="w-[48%] overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800 lg:w-[24%]">
            <View className="flex-row items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-700/50">
              <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                {group.isNationwide ? (
                  <Feather name="globe" color="#16a34a" size={12} />
                ) : null}
                <Text
                  className="min-w-0 flex-1 font-sans text-xs font-semibold text-gray-700 dark:text-slate-200"
                  numberOfLines={1}>
                  {group.title}
                </Text>
              </View>
              {group.regionArea ? (
                <Text
                  className={`font-sans text-[11px] font-semibold ${
                    isFreeFee(group.regionArea.shippingFee)
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-slate-400'
                  }`}
                  numberOfLines={1}>
                  {displayFee(group.regionArea.shippingFee)}
                </Text>
              ) : null}
            </View>

            <View className="gap-1 px-2.5 py-2">
              {group.cityGroups.length === 0 && group.regionArea ? (
                <Text className="font-sans text-[11px] italic text-gray-400 dark:text-slate-500">
                  All areas
                </Text>
              ) : null}

              {group.cityGroups.map((cityGroup) => {
                const cityFee = cityGroup.cityArea?.shippingFee;
                return (
                  <View key={cityGroup.city}>
                    <View className="flex-row items-baseline justify-between gap-1">
                      <Text
                        className="min-w-0 flex-1 font-sans text-xs font-medium text-gray-700 dark:text-slate-300"
                        numberOfLines={1}>
                        {cityGroup.city}
                      </Text>
                      {cityFee ? (
                        <Text
                          className={`font-sans text-[11px] ${
                            isFreeFee(cityFee)
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-400 dark:text-slate-500'
                          }`}>
                          {displayFee(cityFee)}
                        </Text>
                      ) : null}
                    </View>

                    {cityGroup.townships.length > 0 ? (
                      <Text className="font-sans text-[10px] leading-4 text-gray-400 dark:text-slate-500">
                        {cityGroup.townships.map((township, index) => {
                          const name = township.township || township.city || 'Area';
                          const suffix = index < cityGroup.townships.length - 1 ? ', ' : '';
                          return `${name}${isFreeFee(township.shippingFee) ? ' ✓' : ''}${suffix}`;
                        })}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <Text className="mt-3 font-sans text-xs text-gray-400 dark:text-slate-500">
        <Text className="font-sans font-semibold text-green-500">✓</Text> = free shipping for that township. Fees may vary by order size.
      </Text>
    </View>
  );
}
export function SellerProfileNative({
  slug,
  initialProfile,
}: {
  slug: string;
  initialProfile?: SellerProfileResult | null;
}) {
  const { t, language } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useNativeAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(initialProfile?.seller || null);
  const [products, setProducts] = useState<HomeProduct[]>(initialProfile?.products || []);
  const [productPage, setProductPage] = useState(initialProfile?.currentPage || 1);
  const [productsHasMore, setProductsHasMore] = useState(
    (initialProfile?.currentPage || 1) < (initialProfile?.lastPage || 1),
  );
  const [productsLoading, setProductsLoading] = useState(false);
  const productSentinelRef = useRef<View | null>(null);
  const productsFetchingRef = useRef(false);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [reviewStats, setReviewStats] = useState<SellerReviewStats>(
    initialProfile?.reviewStats || { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 }
  );
  const [revPage, setRevPage] = useState(1);
  const [revLastPage, setRevLastPage] = useState(1);
  const [revLoading, setRevLoading] = useState(false);
  const [isOwnStore, setIsOwnStore] = useState(initialProfile?.isOwnStore || false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deliveryAreas, setDeliveryAreas] = useState<SellerDeliveryArea[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('products');
  const [loading, setLoading] = useState(!initialProfile?.seller);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [error, setError] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const hasInitialSeller = Boolean(initialProfile?.seller);
  const isBuyer = hasUserRole(user, 'buyer');
  const canWriteReview = isAuthenticated && isBuyer && !isOwnStore;
  const hasReviewedSeller = useMemo(
    () =>
      Boolean(
        user?.id &&
          reviews.some((review) => review.userId && String(review.userId) === String(user.id))
      ),
    [reviews, user?.id]
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadSeller = async () => {
      if (!hasInitialSeller) setLoading(true);
      setError('');
      setProductPage(1);
      setProductsHasMore(false);

      try {
        const profileResult = await fetchSellerProfile(slug, 1, controller.signal);

        if (!controller.signal.aborted) {
          setSeller(profileResult.seller);
          setProducts(profileResult.products);
          setProductPage(profileResult.currentPage);
          setProductsHasMore(profileResult.currentPage < profileResult.lastPage);
          setReviewStats(profileResult.reviewStats);
          setIsOwnStore(profileResult.isOwnStore);
          setDescriptionExpanded(false);
          setActiveTab('products');
          setDeliveryAreas(null);
          setRevPage(1);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSeller(null);
          setProducts([]);
          setReviews([]);
          setError(formatApiErrorMessage(err, 'Could not load this seller profile.'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (slug) void loadSeller();

    return () => controller.abort();
  }, [hasInitialSeller, slug]);

  const loadMoreProducts = useCallback(async () => {
    if (!slug || !productsHasMore || productsFetchingRef.current) return;

    productsFetchingRef.current = true;
    setProductsLoading(true);
    const nextPage = productPage + 1;

    try {
      const profileResult = await fetchSellerProfile(slug, nextPage);
      const productItems = profileResult.products;

      setProducts((current) => {
        const ids = new Set(current.map((product) => String(product.id)));
        return [...current, ...productItems.filter((product) => !ids.has(String(product.id)))];
      });
      setProductPage(profileResult.currentPage);
      setProductsHasMore(profileResult.currentPage < profileResult.lastPage);
    } catch (error) {
      console.error('Could not load more seller products:', error);
      setProductsHasMore(false);
    } finally {
      productsFetchingRef.current = false;
      setProductsLoading(false);
    }
  }, [productPage, productsHasMore, slug]);

  useEffect(() => {
    if (activeTab !== 'products' || Platform.OS !== 'web' || !productSentinelRef.current) return;

    const node = productSentinelRef.current as unknown as Element;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMoreProducts();
      },
      { rootMargin: '300px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, loadMoreProducts, products.length]);

  useEffect(() => {
    setLogoError(false);
  }, [seller?.imageUrl]);

  useEffect(() => {
    if (activeTab !== 'reviews' || !slug || !seller?.reviews) return;

    const controller = new AbortController();
    const perPage = Math.min(Math.max(seller.reviews, 1), 100);

    void fetchSellerReviews(slug, 1, controller.signal, perPage)
      .then((result) => {
        if (!controller.signal.aborted) {
          setReviewStats(computeReviewStatsFromReviews(result.reviews));
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [activeTab, seller?.reviews, slug]);

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    const loadReviews = async () => {
      setRevLoading(true);
      try {
        const reviewResult = await fetchSellerReviews(slug, revPage, controller.signal);
        if (!controller.signal.aborted) {
          setReviews(reviewResult.reviews);
          setRevLastPage(reviewResult.lastPage);
        }
      } catch {
        if (!controller.signal.aborted) {
          setReviews([]);
          setRevLastPage(1);
        }
      } finally {
        if (!controller.signal.aborted) setRevLoading(false);
      }
    };

    void loadReviews();

    return () => controller.abort();
  }, [revPage, slug]);

  const openReviewForm = () => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/sellers/${slug}` as Href);
      return;
    }

    if (!isBuyer) {
      setReviewMessage({ type: 'error', text: 'Only buyers can write reviews.' });
      return;
    }

    if (isOwnStore) {
      setReviewMessage({ type: 'error', text: 'You cannot review your own store.' });
      return;
    }

    if (hasReviewedSeller) {
      setReviewMessage({ type: 'error', text: 'You have already reviewed this seller.' });
      return;
    }

    setReviewMessage(null);
    setReviewFormOpen(true);
  };

  const closeReviewForm = () => {
    setReviewFormOpen(false);
    setReviewRating(0);
    setReviewComment('');
  };

  const handleSubmitSellerReview = async () => {
    if (!slug || !reviewRating) return;

    setSubmittingReview(true);
    setReviewMessage(null);

    try {
      const result = await submitSellerReview(slug, reviewRating, reviewComment);
      closeReviewForm();
      setReviewMessage({ type: 'success', text: result.message || 'Review submitted successfully.' });
      setRevPage(1);
      const profileResult = await fetchSellerProfile(slug, 1);
      setSeller(profileResult.seller);
      setReviewStats(profileResult.reviewStats);
    } catch (err) {
      setReviewMessage({
        type: 'error',
        text: formatApiErrorMessage(err, 'Failed to submit review.'),
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'delivery' || deliveryAreas !== null || !slug) return;

    const controller = new AbortController();

    const loadDeliveryAreas = async () => {
      setDeliveryLoading(true);
      try {
        const areas = await fetchSellerDeliveryAreas(slug, controller.signal);
        if (!controller.signal.aborted) setDeliveryAreas(areas);
      } catch {
        if (!controller.signal.aborted) setDeliveryAreas([]);
      } finally {
        if (!controller.signal.aborted) setDeliveryLoading(false);
      }
    };

    void loadDeliveryAreas();

    return () => controller.abort();
  }, [activeTab, deliveryAreas, slug]);

  const visibleTabs = useMemo(() => {
    const hasPolicies = seller
      ? Object.values(seller.policies).some((policy) => Boolean(policy))
      : false;

    return tabKeys.filter((tab) => {
      if (tab === 'policies' && !hasPolicies) return false;
      if (tab === 'reviews' && seller?.showReviews === false) return false;
      return true;
    });
  }, [seller]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] || 'products');
    }
  }, [activeTab, visibleTabs]);

  if (loading) return <SellerSkeleton />;

  if (!slug || error || !seller) {
    return (
      <AppLayout>
        <View className="bg-gray-50 px-4 py-16 dark:bg-slate-950">
          <View className="mx-auto w-full max-w-xl items-center rounded-2xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
            <Feather name="shopping-bag" color="#cbd5e1" size={46} />
            <Text className="mt-4 text-center font-sans text-2xl font-bold text-gray-950 dark:text-slate-100">
              Seller not found
            </Text>
            <Text className="mt-2 text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
              {error || 'Could not load this seller profile.'}
            </Text>
            <Pressable
              onPress={() => router.push('/sellers')}
              className="mt-6 flex-row items-center gap-2 rounded-lg bg-green-600 px-5 py-3">
              <Feather name="arrow-left" color="#ffffff" size={16} />
              <Text className="font-sans text-sm font-semibold text-white">Browse all sellers</Text>
            </Pressable>
          </View>
        </View>
      </AppLayout>
    );
  }

  const rating = Number(seller.rating) || 0;
  const shareText = t('seller.share_text', { name: seller.name });
  const sharePayload = (() => {
    const payload = buildSocialSharePayload({
      path: `/sellers/${seller.slug || slug}`,
      title: seller.name,
      text: shareText,
      description: '',
      language,
      imageUrl: seller.imageUrl,
    });

    return {
      ...payload,
      description: t('seller.share_description', { url: payload.url }),
    };
  })();
  const descriptionPreview =
    seller.description.length > 220 && !descriptionExpanded
      ? `${seller.description.slice(0, 220).trim()}...`
      : seller.description;
  const contactHref = seller.email ? `mailto:${seller.email}` : seller.phone ? `tel:${seller.phone}` : '';
  const activePolicies = policyItems.filter((item) => Boolean(seller.policies[item.key]));
  const socialLinks = Object.entries(seller.socialLinks).filter(([, value]) => Boolean(value));

  const shareProfile = () => {
    setShareOpen(true);
  };

  const openContact = () => {
    if (contactHref) void Linking.openURL(contactHref);
  };

  return (
    <AppLayout>
      {shareOpen ? (
        <SocialShareModal
          open={shareOpen}
          payload={sharePayload}
          onClose={() => setShareOpen(false)}
          labels={{
            heading: t('seller.share_product'),
            shareOn: t('seller.share_on'),
            copyLink: t('productDetail.copy_link'),
            copied: t('productDetail.copied'),
            close: t('common.close'),
            shareFacebook: t('productDetail.share_facebook'),
            shareWhatsapp: t('productDetail.share_whatsapp'),
            shareViber: t('productDetail.share_viber'),
            shareTelegram: t('productDetail.share_telegram'),
            shareX: t('productDetail.share_x'),
          }}
        />
      ) : null}
      <View className="bg-gray-50 dark:bg-slate-950">
        {seller.vacationMode ? (
          <View className="bg-amber-500 px-4 py-3">
            <Text className="text-center font-sans text-sm font-semibold text-white">
              {seller.vacationMessage || 'This store is currently on vacation. Orders may be delayed.'}
            </Text>
          </View>
        ) : null}

        <View className="relative h-48 overflow-hidden bg-green-600 sm:h-60">
          {seller.bannerUrl ? (
            <Image
              source={{ uri: getThumbUrl(seller.bannerUrl, 800) }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              loading="eager"
              priority="high"
            />
          ) : null}
          <View className="absolute inset-0 bg-black/25" />
        </View>

        <View className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <View className="-mt-14 mb-6 gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <View className="min-w-0 flex-row items-end gap-4">
              <View className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg dark:border-slate-950 dark:bg-slate-800 sm:h-28 sm:w-28">
                {seller.imageUrl && !logoError ? (
                  <Image
                    source={{ uri: getThumbUrl(seller.imageUrl, 300) }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    loading="eager"
                    priority="high"
                    recyclingKey={seller.imageUrl}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-green-50 dark:bg-green-900/30">
                    <Text className="font-sans text-3xl font-bold text-green-700 dark:text-green-300 sm:text-4xl">
                      {seller.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View className="min-w-0 flex-1 pb-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text
                    className="font-sans text-2xl font-bold leading-tight text-gray-950 dark:text-slate-100 sm:text-3xl"
                    numberOfLines={2}>
                    {seller.name}
                  </Text>
                  {seller.verified ? <Feather name="check-circle" color="#16a34a" size={20} /> : null}
                </View>
                <View className="mt-2 flex-row flex-wrap items-center gap-3">
                  <Stars rating={rating} count={seller.reviews} />
                  <View className="flex-row items-center gap-1">
                    <Feather name="map-pin" color="#94a3b8" size={14} />
                    <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                      {[seller.city, seller.state].filter(Boolean).join(', ') || 'Myanmar'}
                    </Text>
                  </View>
                </View>
                <TodayHours seller={seller} />
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Pressable className="flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5">
                <Feather name="user-plus" color="#ffffff" size={16} />
                <Text className="font-sans text-sm font-semibold text-white">Follow</Text>
              </Pressable>
              <Pressable
                onPress={shareProfile}
                className={`flex-row items-center gap-2 rounded-lg border px-4 py-2.5 ${
                  shareOpen
                    ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}>
                <Feather name="share-2" color="#16a34a" size={16} />
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {t('seller.share_product')}
                </Text>
              </Pressable>
              {contactHref ? (
                <Pressable
                  onPress={openContact}
                  className="flex-row items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                  <Feather name={seller.email ? 'mail' : 'phone'} color="#16a34a" size={16} />
                  <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Contact
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View className="mb-6 flex-row flex-wrap gap-3">
            <StatChip icon="shopping-bag" value={formatK(seller.products)} label="Products" />
            <StatChip icon="users" value={formatK(seller.followers)} label="Followers" />
            {seller.showReviews !== false ? (
              <StatChip icon="message-circle" value={formatK(seller.reviews)} label="Reviews" />
            ) : null}
            <StatChip icon="calendar" value={seller.memberSince || 'New'} label="Member since" />
          </View>

          {seller.description ? (
            <View className="mb-6 max-w-3xl">
              <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
                {descriptionPreview}
              </Text>
              {seller.description.length > 220 ? (
                <Pressable
                  onPress={() => setDescriptionExpanded((current) => !current)}
                  className="mt-2 self-start">
                  <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                    {descriptionExpanded ? 'Show Less' : 'Read More >>'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {socialLinks.length > 0 ? (
            <View className="mb-6 flex-row flex-wrap gap-2">
              {socialLinks.map(([key, url]) => (
                <Pressable
                  key={key}
                  onPress={() => void Linking.openURL(String(url))}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                  <Text className="font-sans text-xs font-semibold capitalize text-gray-700 dark:text-slate-200">
                    {key}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6 max-w-full border-b border-gray-200 dark:border-slate-800"
            contentContainerClassName="flex-row items-stretch">
            {visibleTabs.map((tab) => {
              const selected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={`border-b-2 px-4 py-3 ${selected ? 'border-green-600' : 'border-transparent'}`}>
                  <Text
                    className={`font-sans text-sm font-semibold ${
                      selected
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-500 dark:text-slate-400'
                    }`}
                    numberOfLines={1}>
                    {getTabLabel(tab, seller, products.length)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {activeTab === 'products' ? (
            products.length > 0 ? (
              <View className="gap-4">
                <ProductMarketplaceGrid products={products} imagePriorityCount={6} />
                {productsLoading ? (
                  <View className="items-center py-4">
                    <ActivityIndicator color="#16a34a" />
                  </View>
                ) : null}
                {Platform.OS === 'web' ? (
                  <View ref={productSentinelRef} className="h-1 w-full" />
                ) : productsHasMore ? (
                  <Pressable
                    onPress={() => void loadMoreProducts()}
                    disabled={productsLoading}
                    className="items-center rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                      Load more products
                    </Text>
                  </Pressable>
                ) : null}
                {!productsHasMore && products.length > 0 ? (
                  <Text className="text-center font-sans text-xs text-gray-400 dark:text-slate-500">
                    All products from this seller are loaded.
                  </Text>
                ) : null}
              </View>
            ) : (
              <View className="items-center py-16">
                <Feather name="shopping-bag" color="#cbd5e1" size={48} />
                <Text className="mt-3 font-sans text-sm text-gray-400 dark:text-slate-500">
                  No products listed yet.
                </Text>
              </View>
            )
          ) : null}

          {activeTab === 'reviews' ? (
            <View className="max-w-2xl gap-4 pb-8">
              <View className="flex-col gap-6 rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
                <View className="items-center sm:items-start">
                  <Text className="font-sans text-4xl font-bold text-gray-950 dark:text-slate-100 sm:text-5xl">
                    {rating.toFixed(1)}
                  </Text>
                  <View className="mt-2">
                    <Stars rating={rating} />
                  </View>
                  <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-600">
                    {seller.reviews} reviews
                  </Text>
                </View>
                <StarDistribution reviewCount={seller.reviews} reviewStats={reviewStats} />
              </View>

              {reviewMessage ? (
                <View
                  className={`rounded-xl px-4 py-3 ${
                    reviewMessage.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : 'bg-green-50 dark:bg-green-900/20'
                  }`}>
                  <Text
                    className={`font-sans text-sm font-medium ${
                      reviewMessage.type === 'error'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}>
                    {reviewMessage.text}
                  </Text>
                </View>
              ) : null}

              {canWriteReview ? (
                <SellerReviewForm
                  open={reviewFormOpen}
                  rating={reviewRating}
                  comment={reviewComment}
                  submitting={submittingReview}
                  onOpen={openReviewForm}
                  onClose={closeReviewForm}
                  onRatingChange={setReviewRating}
                  onCommentChange={setReviewComment}
                  onSubmit={() => void handleSubmitSellerReview()}
                />
              ) : !isOwnStore ? (
                <Pressable onPress={openReviewForm} className="flex-row items-center gap-2 self-start">
                  <Feather name="message-circle" color="#16a34a" size={16} />
                  <Text className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">
                    Write a Review
                  </Text>
                </Pressable>
              ) : null}

              {revLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator color="#16a34a" size="large" />
                </View>
              ) : reviews.length > 0 ? (
                reviews.map((review) => <ReviewItem key={String(review.id)} review={review} />)
              ) : (
                <View className="items-center py-12">
                  <Feather name="message-circle" color="#cbd5e1" size={40} />
                  <Text className="mt-3 font-sans text-sm text-gray-400 dark:text-slate-500">
                    No reviews yet. Be the first!
                  </Text>
                </View>
              )}

              {revLastPage > 1 ? (
                <View className="flex-row items-center justify-between gap-3 pt-2">
                  <Pressable
                    onPress={() => setRevPage((current) => Math.max(current - 1, 1))}
                    disabled={revPage <= 1 || revLoading}
                    className={`rounded-lg border px-4 py-2 ${
                      revPage <= 1
                        ? 'border-gray-200 opacity-50 dark:border-slate-700'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}>
                    <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                      Previous
                    </Text>
                  </Pressable>
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                    Page {revPage} of {revLastPage}
                  </Text>
                  <Pressable
                    onPress={() => setRevPage((current) => Math.min(current + 1, revLastPage))}
                    disabled={revPage >= revLastPage || revLoading}
                    className={`rounded-lg border px-4 py-2 ${
                      revPage >= revLastPage
                        ? 'border-gray-200 opacity-50 dark:border-slate-700'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}>
                    <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                      Next
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          {activeTab === 'about' ? (
            <View className="gap-6 pb-8 lg:flex-row">
              <View className="min-w-0 flex-1 gap-6">
                {seller.description ? (
                  <View className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                    <Text className="font-sans text-base font-semibold text-gray-950 dark:text-slate-100">
                      About {seller.name}
                    </Text>
                    <Text className="mt-3 font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
                      {seller.description}
                    </Text>
                  </View>
                ) : null}

                <View className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <Text className="font-sans text-base font-semibold text-gray-950 dark:text-slate-100">
                    Business Information
                  </Text>
                  <View className="mt-5 flex-row flex-wrap gap-x-8 gap-y-5">
                    <View className="w-full sm:w-[45%]">
                      <DetailRow label="Business Type" value={seller.type} />
                    </View>
                    <View className="w-full sm:w-[45%]">
                      <DetailRow label="Business Name" value={seller.businessName} />
                    </View>
                    <View className="w-full sm:w-[45%]">
                      <DetailRow label="Location" value={[seller.city, seller.state, seller.country].filter(Boolean).join(', ')} />
                    </View>
                    <View className="w-full sm:w-[45%]">
                      <DetailRow label="Address" value={seller.address} />
                    </View>
                  </View>
                </View>
              </View>

              <View className="w-full gap-4 lg:w-80">
                <View className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <Text className="font-sans text-base font-semibold text-gray-950 dark:text-slate-100">
                    Contact
                  </Text>
                  <View className="mt-4 gap-4">
                    <DetailRow label="Email" value={seller.email} />
                    <DetailRow label="Phone" value={seller.phone} />
                    <DetailRow label="Website" value={seller.website} />
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {activeTab === 'policies' ? (
            <View className="max-w-3xl gap-4 pb-8">
              {activePolicies.map((item) => (
                <View
                  key={item.key}
                  className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100">
                    {item.label}
                  </Text>
                  <Text className="mt-3 font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
                    {seller.policies[item.key]}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {activeTab === 'delivery' ? (
            <DeliveryZonesPanel areas={deliveryAreas} loading={deliveryLoading} />
          ) : null}

          <Link href="/sellers" asChild>
            <Pressable className="mt-4 flex-row items-center gap-2 self-start">
              <Feather name="arrow-left" color="#16a34a" size={16} />
              <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                Browse all sellers
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </AppLayout>
  );
}
