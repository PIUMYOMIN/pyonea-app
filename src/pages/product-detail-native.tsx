import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_CLASS } from '@/constants/layout';
import { ProductDetailActions } from '@/components/product/product-detail-actions';
import { ProductDetailGallery } from '@/components/product/product-detail-gallery';
import { ProductDetailToast } from '@/components/product/product-detail-toast';
import { ProductDetailSecondarySections } from '@/components/product/product-detail-secondary-sections';
import { ProductVariantPicker } from '@/components/product/product-variant-picker';
import { SITE_PUBLIC_URL } from '@/config/native';
import { useNativeAuth } from '@/context/native-auth';
import { useTheme } from '@/context/theme';
import { useWishlist } from '@/context/wishlist-context';
import { localizeBilingualName, mergeRouteLang, useAppTranslation } from '@/i18n';
import { hasUserRole } from '@/utils/auth-routing';
import { emitCartCountChanged } from '@/utils/native-cart-events';
import {
  addToCompare,
  isProductCompared,
  removeCompareItem,
  subscribeCompareChanged,
} from '@/utils/compare-native';
import {
  addProductToCart,
  fetchMoreProductsFromSeller,
  fetchProductDetail,
  fetchProductReviews,
  fetchSellerDeliveryAreas,
  submitProductReview,
  type HomeProduct,
  type ProductDetail,
  type ProductVariant,
  type ProductReview,
  type SellerDeliveryArea,

  formatApiErrorMessage,
} from '@/utils/native-api';
import {
  formatSpecKey,
  getMaxValidQuantity,
  resolveQuantityStep,
  snapQuantityToStep,
  toPositiveInt,
} from '@/utils/product-detail-helpers';
import { buildSocialSharePayload } from '@/utils/social-share';

import {
  buildProductDeliveryLabels,
  type DeliveryLabel,
} from '@/utils/delivery-name-lookup';

function Stars({ rating, count, showCount = true }: { rating: number; count?: number; showCount?: boolean }) {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const filled = Math.round(rating);
  const emptyStarColor = isDark ? '#64748b' : '#d1d5db';

  return (
    <View className="flex-row flex-wrap items-center gap-y-1">
      <View className="flex-row items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <FontAwesome
            key={star}
            name={star <= filled ? 'star' : 'star-o'}
            color={star <= filled ? '#facc15' : emptyStarColor}
            size={18}
          />
        ))}
      </View>
      {showCount ? (
        <Text className="ml-2 font-sans text-sm text-gray-600 dark:text-slate-400 sm:text-base">
          {rating > 0 ? rating.toFixed(1) : '0.0'} ({t('productDetail.reviews_count', { count: count || 0 })})
        </Text>
      ) : null}
    </View>
  );
}

function DetailSkeleton() {
  return (
    <AppLayout>
      <View className="bg-gray-50 py-8 dark:bg-slate-950">
        <View className={`${SITE_CONTAINER_CLASS} min-w-0`}>
          <View className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <View className="min-w-0 gap-4">
            <View className="aspect-square rounded-2xl bg-gray-200 dark:bg-slate-800" />
            <View className="flex-row gap-3">
              {[1, 2, 3].map((item) => (
                <View key={item} className="h-20 w-20 rounded-xl bg-gray-200 dark:bg-slate-800" />
              ))}
            </View>
          </View>
          <View className="min-w-0 gap-4">
            <View className="h-8 w-3/4 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="h-5 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="h-16 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="h-56 rounded-2xl bg-gray-200 dark:bg-slate-800" />
          </View>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}

function PillChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'stock-in' | 'stock-out' | 'verified' | 'delivery';
}) {
  const textClasses = {
    neutral: 'text-gray-700 dark:text-slate-200',
    'stock-in': 'text-green-700 dark:text-green-300',
    'stock-out': 'text-red-700 dark:text-red-300',
    verified: 'text-blue-700 dark:text-blue-300',
    delivery: 'text-amber-800 dark:text-amber-200',
  }[tone];

  const containerClasses = {
    neutral:
      'border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800',
    'stock-in':
      'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    'stock-out':
      'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    verified:
      'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    delivery:
      'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
  }[tone];

  return (
    <View className={`max-w-full rounded-full border px-2.5 py-1 ${containerClasses}`}>
      <Text className={`font-sans text-xs font-medium ${textClasses}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function DeliveryTicker({
  labels,
  loading,
}: {
  labels: DeliveryLabel[];
  loading: boolean;
}) {
  const { t } = useAppTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [animKeys, setAnimKeys] = useState({ region: 0, city: 0, township: 0 });
  const indexRef = useRef(0);
  const prevLabelRef = useRef<DeliveryLabel | null>(null);

  useEffect(() => {
    indexRef.current = 0;
    prevLabelRef.current = null;
    setActiveIndex(0);
    setAnimKeys({ region: 0, city: 0, township: 0 });

    if (labels.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (indexRef.current + 1) % labels.length;
      const prevLabel = prevLabelRef.current;
      const nextLabel = labels[nextIndex];

      indexRef.current = nextIndex;
      prevLabelRef.current = nextLabel;

      setActiveIndex(nextIndex);
      setAnimKeys((keys) => ({
        region:
          !prevLabel || nextLabel.region !== prevLabel.region ? keys.region + 1 : keys.region,
        city: !prevLabel || nextLabel.city !== prevLabel.city ? keys.city + 1 : keys.city,
        township:
          !prevLabel || nextLabel.township !== prevLabel.township
            ? keys.township + 1
            : keys.township,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [labels]);

  if (loading) {
    return (
      <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
        {t('productDetail.delivery_loading')}
      </Text>
    );
  }

  if (labels.length === 0) {
    return (
      <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
        {t('productDetail.delivery_not_set')}
      </Text>
    );
  }

  const activeLabel = labels[activeIndex % labels.length];

  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <Text className="mb-2 font-sans text-xs text-gray-500 dark:text-slate-400">
        {t('productDetail.delivering_to')}
      </Text>
      <View
        accessibilityLiveRegion="polite"
        className="h-5 flex-row items-center gap-1 overflow-hidden">
        <Text
          key={`region-${animKeys.region}`}
          className="dz-word max-w-[130px] font-sans text-xs font-semibold text-gray-900 dark:text-slate-100"
          numberOfLines={1}>
          {activeLabel.region}
        </Text>
        {activeLabel.city ? (
          <>
            <Text className="flex-shrink-0 font-sans text-xs text-gray-400 dark:text-slate-500">
              →
            </Text>
            <Text
              key={`city-${animKeys.city}`}
              className="dz-word max-w-[110px] font-sans text-xs font-semibold text-gray-900 dark:text-slate-100"
              numberOfLines={1}>
              {activeLabel.city}
            </Text>
          </>
        ) : null}
        {activeLabel.township ? (
          <>
            <Text className="flex-shrink-0 font-sans text-xs text-gray-400 dark:text-slate-500">
              →
            </Text>
            <Text
              key={`township-${animKeys.township}`}
              className="dz-word max-w-[100px] font-sans text-xs font-semibold text-gray-900 dark:text-slate-100"
              numberOfLines={1}>
              {activeLabel.township}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

export function ProductDetailNative({
  slug,
  initialProduct,
}: {
  slug: string;
  initialProduct?: ProductDetail | null;
}) {
  const { t, language } = useAppTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const useCompactActions = Platform.OS !== 'web' || width < 768;
  const showMobileStickyCta = Platform.OS === 'web' && width < 640;
  const { user, isAuthenticated } = useNativeAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState<ProductDetail | null>(initialProduct || null);
  const [reviews, setReviews] = useState<ProductReview[]>(initialProduct?.reviews || []);
  const [moreProducts, setMoreProducts] = useState<HomeProduct[]>([]);
  const [moreProductsLoading, setMoreProductsLoading] = useState(false);
  const [deliveryAreas, setDeliveryAreas] = useState<SellerDeliveryArea[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [variantError, setVariantError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(toPositiveInt(initialProduct?.moq ?? 1, 1));
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [compared, setCompared] = useState(
    initialProduct ? isProductCompared(initialProduct.id) : false
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const variantSectionRef = useRef<View>(null);
  const hasInitialProduct = Boolean(initialProduct);
  const isBuyer = hasUserRole(user, 'buyer');
  const hasReviewedProduct = useMemo(
    () =>
      Boolean(
        user?.id &&
          reviews.some((review) => review.userId && String(review.userId) === String(user.id))
      ),
    [reviews, user?.id]
  );
  const savedToWishlist = product ? isInWishlist(product.id) : false;

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setActionMessage(null);
    setTimeout(() => {
      setActionMessage({ type, text });
    }, 0);
    messageTimerRef.current = setTimeout(() => setActionMessage(null), 3500);
  };

  const showInlineLoadMessage = (type: 'success' | 'error' | 'info', text: string) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setActionMessage({ type, text });
    messageTimerRef.current = setTimeout(() => setActionMessage(null), 3500);
  };

  useEffect(
    () => () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!product?.id) return;
    return subscribeCompareChanged(() => {
      setCompared(isProductCompared(product.id));
    });
  }, [product?.id]);

  useEffect(() => {
    const controller = new AbortController();

    const loadProduct = async () => {
      if (!hasInitialProduct) setLoading(true);
      setError('');
      setMoreProducts([]);
      setMoreProductsLoading(false);
      setDeliveryAreas([]);
      setDeliveryLoading(false);

      try {
        const nextProduct =
          hasInitialProduct && initialProduct
            ? initialProduct
            : await fetchProductDetail(slug, controller.signal);
        const moq = toPositiveInt(nextProduct.moq, 1);
        setProduct(nextProduct);
        setReviews(nextProduct.reviews);
        setQuantity(moq);
        setActiveImage(0);
        setSelectedVariant(null);
        setSelectedOptions({});
        setVariantError('');
        setCompared(isProductCompared(nextProduct.id));
      } catch (err) {
        if (!controller.signal.aborted) {
          if (hasInitialProduct) {
            showInlineLoadMessage(
              'info',
              formatApiErrorMessage(err, t('productDetail.failed_load'))
            );
          } else {
            setError(formatApiErrorMessage(err, t('productDetail.failed_load')));
            setProduct(null);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadProduct();

    return () => controller.abort();
  }, [hasInitialProduct, initialProduct, slug, t]);

  useEffect(() => {
    if (!product?.id) return;

    const controller = new AbortController();
    const productId = product.id;
    const sellerId = product.seller?.id || product.sellerId;

    if (product.reviews.length === 0) {
      void fetchProductReviews(productId, controller.signal)
        .then((reviewList) => {
          if (!controller.signal.aborted) setReviews(reviewList);
        })
        .catch(() => {});
    }

    if (sellerId) {
      setMoreProductsLoading(true);
      setDeliveryLoading(true);
      const sellerKey = product.seller?.slug || String(product.seller?.id || sellerId);

      void Promise.all([
        fetchMoreProductsFromSeller(sellerId, productId, controller.signal).catch(() => []),
        fetchSellerDeliveryAreas(sellerKey, controller.signal).catch(() => []),
      ])
        .then(([sellerProducts, areas]) => {
          if (!controller.signal.aborted) {
            setMoreProducts(sellerProducts);
            setDeliveryAreas(areas);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setMoreProductsLoading(false);
            setDeliveryLoading(false);
          }
        });
    } else {
      setMoreProducts([]);
      setDeliveryAreas([]);
      setMoreProductsLoading(false);
      setDeliveryLoading(false);
    }

    return () => controller.abort();
  }, [product?.id, product?.reviews.length, product?.seller?.id, product?.seller?.slug, product?.sellerId]);

  const images = useMemo(() => product?.images ?? [], [product]);
  const deliveryLabels = useMemo(
    () =>
      buildProductDeliveryLabels(
        deliveryAreas,
        language,
        t('productDetail.delivery_whole_myanmar'),
      ),
    [deliveryAreas, language, t],
  );
  const currencyLabel = t('common.currency.mmk', 'MMK');
  const productDisplayName = product
    ? localizeBilingualName(language, product.nameEn || product.name, product.nameMm, product.name)
    : '';
  const productSecondaryName =
    product?.nameEn && product?.nameMm
      ? localizeBilingualName(language, product.nameMm, product.nameEn, product.nameMm)
      : '';
  const productDescription = product
    ? localizeBilingualName(
        language,
        product.descriptionEn || product.description,
        product.descriptionMm,
        product.description
      )
    : '';
  const productUrl = product
    ? `${SITE_PUBLIC_URL}/products/${product.slug}?lang=${language}`
    : SITE_PUBLIC_URL;
  const sharePayload = useMemo(() => {
    if (!product) return null;

    const localizedName = localizeBilingualName(
      language,
      product.nameEn || product.name,
      product.nameMm,
      product.name
    );
    const shareText = t('productDetail.share_text', { title: localizedName });
    const payload = buildSocialSharePayload({
      path: `/products/${product.slug}`,
      title: localizedName,
      text: shareText,
      description: '',
      language,
      imageUrl: product.images[0],
    });

    return {
      ...payload,
      description: t('productDetail.share_description', { url: payload.url }),
    };
  }, [language, product, t]);
  const hasVariants = Boolean(product?.hasVariants && product?.options.length);
  const variantReady = !hasVariants || selectedVariant !== null;
  const availableStock = selectedVariant ? selectedVariant.quantity : (product?.stock ?? 0);
  const effectiveMoq = toPositiveInt(selectedVariant?.moq ?? product?.moq ?? 1, 1);
  const effectiveStep = resolveQuantityStep(
    selectedVariant?.quantityStep ?? product?.quantityStep,
    effectiveMoq
  );
  const maxValidQuantity = getMaxValidQuantity(
    availableStock,
    effectiveMoq,
    effectiveStep,
    product?.productType === 'physical'
  );
  const stockIsOut =
    product?.productType === 'physical' && variantReady && availableStock < effectiveMoq;
  const stockText =
    product?.productType === 'physical'
      ? variantReady
        ? availableStock > 0
          ? t('productDetail.in_stock_count', { count: availableStock })
          : t('productDetail.out_of_stock')
        : t('productDetail.select_options_for_stock')
      : t('productDetail.available');
  const unitLabel = (product?.quantityUnit || 'piece').slice(0, 20);
  const activeTier = product?.wholesaleTiers.length
    ? [...product.wholesaleTiers]
        .sort((a, b) => b.minQty - a.minQty)
        .find((tier) => quantity >= tier.minQty) ?? null
    : null;
  const nextTier = product?.wholesaleTiers.length
    ? [...product.wholesaleTiers]
        .sort((a, b) => a.minQty - b.minQty)
        .find((tier) => quantity < tier.minQty) ?? null
    : null;
  const displayPrice =
    activeTier?.price ?? selectedVariant?.price ?? product?.price ?? '';
  const baseComparePrice = selectedVariant?.price || product?.originalPrice || product?.price || '';
  const displayDiscountPct = activeTier
    ? activeTier.discountPct
    : !selectedVariant
      ? product?.discountPct ?? 0
      : 0;
  const displayDiscountSaved =
    !selectedVariant && product?.savedAmount
      ? product.savedAmount.replace(/\s*MMK/i, '').trim()
      : '';
  const sellerHref = product?.seller
    ? (mergeRouteLang(`/sellers/${product.seller.slug || product.seller.id}`, {}, language) as Href)
    : (mergeRouteLang('/sellers', {}, language) as Href);
  const primaryCtaLabel = addingToCart
    ? t('productDetail.adding')
    : stockIsOut
      ? t('productDetail.out_of_stock')
      : hasVariants && !selectedVariant
        ? t('productDetail.select_options')
        : t('productDetail.add_to_cart');

  const decrementQuantity = () => {
    setQuantity((current) => Math.max(effectiveMoq, current - effectiveStep));
  };

  const incrementQuantity = () => {
    setQuantity((current) => {
      const next = current + effectiveStep;
      return maxValidQuantity !== undefined && maxValidQuantity > 0
        ? Math.min(next, maxValidQuantity)
        : next;
    });
  };

  const requireBuyer = () => {
    if (!isAuthenticated) {
      router.push(
        `/login?returnTo=${encodeURIComponent(`/products/${product?.slug || slug}`)}` as Href
      );
      return false;
    }

    if (!isBuyer) {
      showMessage('error', t('productDetail.buyer_only_action'));
      return false;
    }

    return true;
  };

  const handleVariantChange = (variant: ProductVariant | null, options: Record<string, string>) => {
    setSelectedVariant(variant);
    setSelectedOptions(options);
    setVariantError('');
    setQuantity(toPositiveInt(variant?.moq ?? product?.moq ?? 1, 1));

    if (variant?.imageUrl) {
      const imageIndex = images.findIndex((image) => image === variant.imageUrl);
      if (imageIndex >= 0) setActiveImage(imageIndex);
    }
  };

  const handleAddToCart = async () => {
    if (!product || stockIsOut || addingToCart || !requireBuyer()) return false;

    if (hasVariants && !selectedVariant) {
      const requiredOption = product.options.find((option) => option.isRequired);
      setVariantError(
        requiredOption
          ? t('productDetail.select_required_option', { option: requiredOption.name })
          : t('productDetail.select_options_before_cart')
      );
      return false;
    }

    setAddingToCart(true);
    try {
      const result = await addProductToCart(product.id, quantity, {
        variantId: selectedVariant?.id ?? null,
        selectedOptions: Object.keys(selectedOptions).length ? selectedOptions : null,
      });
      emitCartCountChanged({ cart: result.cart });
      showMessage('success', result.message || t('productDetail.added_to_cart'));
      return true;
    } catch (err) {
      showMessage(
        'error',
        formatApiErrorMessage(err, t('productDetail.add_to_cart_failed'))
      );
      return false;
    } finally {
      setAddingToCart(false);
    }
  };

  const handlePrimaryCta = async () => {
    if (hasVariants && !selectedVariant) {
      setVariantError((prev) => prev || t('productDetail.select_options_before_continue'));
      return;
    }
    await handleAddToCart();
  };

  const handleBuyNow = async () => {
    if (hasVariants && !selectedVariant) {
      setVariantError((prev) => prev || t('productDetail.select_options_before_purchase'));
      return;
    }
    const added = await handleAddToCart();
    if (added) router.push('/cart');
  };

  const handleToggleWishlist = async () => {
    if (!product || wishlistLoading || !requireBuyer()) return;

    setWishlistLoading(true);
    try {
      const { added } = await toggleWishlist(product.id);
      showMessage(
        'success',
        t(added ? 'productDetail.added_to_wishlist' : 'productDetail.removed_from_wishlist')
      );
    } catch (err) {
      showMessage(
        'error',
        formatApiErrorMessage(err, t('productDetail.wishlist_update_failed'))
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleToggleCompare = () => {
    if (!product) return;

    if (compared) {
      removeCompareItem(product.id);
      setCompared(false);
      showMessage('success', t('productDetail.remove_from_compare'));
      return;
    }

    const result = addToCompare(product);
    setCompared(result.compared);

    if (!result.success) {
      const message =
        result.messageKey === 'max_items'
          ? t('compare.max_items', { count: 4 })
          : result.messageKey === 'same_category'
            ? t('compare.same_category')
            : t('compare.same_category');
      showMessage('error', message);
      return;
    }

    showMessage(
      'success',
      result.messageKey === 'already_added'
        ? t('compare.already_added')
        : t('productDetail.add_to_compare')
    );
  };

  const canReview = isAuthenticated && isBuyer && !hasReviewedProduct;

  const handleWriteReviewPress = () => {
    if (!isAuthenticated) {
      router.push(
        `/login?returnTo=${encodeURIComponent(`/products/${product?.slug || slug}`)}` as Href
      );
      return false;
    }

    if (!isBuyer) {
      setReviewMessage({ type: 'error', text: t('productDetail.only_buyers_review') });
      return false;
    }

    if (hasReviewedProduct) {
      setReviewMessage({ type: 'error', text: t('productDetail.already_reviewed') });
      return false;
    }

    return true;
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!product) return false;

    if (!handleWriteReviewPress()) return false;

    if (rating === 0) {
      setReviewMessage({ type: 'error', text: t('productDetail.select_rating_error') });
      return false;
    }

    setSubmittingReview(true);
    setReviewMessage(null);

    try {
      const result = await submitProductReview(product.id, rating, comment);
      setReviews((current) => [result.review, ...current]);
      setProduct((current) =>
        current
          ? {
              ...current,
              rating: result.rating ?? current.rating,
              reviewCount: result.reviewCount ?? current.reviewCount + 1,
            }
          : current
      );
      setReviewMessage({
        type: 'success',
        text: result.message || t('productDetail.review_submitted'),
      });
      return true;
    } catch (err) {
      setReviewMessage({
        type: 'error',
        text: formatApiErrorMessage(err, t('productDetail.review_submit_failed')),
      });
      return false;
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  const handleShareClose = () => {
    setShareOpen(false);
  };

  if (loading) return <DetailSkeleton />;

  if (error || !product) {
    return (
      <AppLayout>
        <View className="bg-gray-50 px-4 py-16 dark:bg-slate-950">
          <View className="mx-auto w-full max-w-xl items-center rounded-2xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
            <Feather name="alert-circle" color="#ef4444" size={42} />
            <Text className="mt-4 text-center font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {t('productDetail.not_found')}
            </Text>
            <Text className="mt-2 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
              {error || t('productDetail.failed_load')}
            </Text>
            <Pressable
              onPress={() => router.push('/products')}
              className="mt-6 rounded-lg bg-green-600 px-5 py-3">
              <Text className="font-sans text-sm font-semibold text-white">
                {t('productDetail.back_to_products')}
              </Text>
            </Pressable>
          </View>
        </View>
      </AppLayout>
    );
  }

  const pageContent = (
    <View className="bg-gray-50 py-6 dark:bg-slate-950 sm:py-8">
      <View className={`${SITE_CONTAINER_CLASS} min-w-0`}>
          <Pressable
            onPress={() => router.back()}
            className="mb-6 min-h-10 flex-row items-center gap-2 rounded-md px-1"
          >
            <Feather name="arrow-left" color="#16a34a" size={20} />
            <Text className="font-sans text-sm font-medium text-green-600 dark:text-green-400">
              {t('productDetail.back')}
            </Text>
          </Pressable>

          <View className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            <View className="min-w-0 gap-4">
              <ProductDetailGallery
                images={images}
                activeImage={activeImage}
                onIndexChange={setActiveImage}
                alt={productDisplayName}
                discountPct={displayDiscountPct}
                discountLabel={
                  displayDiscountPct > 0
                    ? t('productDetail.discount_off', { percent: Math.round(displayDiscountPct) })
                    : undefined
                }
              />
            </View>

            <View className="min-w-0 gap-6">
              <View>
                <Text className="break-words font-sans text-2xl font-bold text-gray-900 dark:text-slate-100 lg:text-3xl">
                  {productDisplayName}
                </Text>
                {productSecondaryName ? (
                  <Text className="mt-1 break-words font-sans text-base text-gray-600 dark:text-slate-400 sm:text-lg">
                    {productSecondaryName}
                  </Text>
                ) : null}
              </View>

              <Stars rating={product.rating} count={product.reviewCount} />

              {product.productType === 'physical' && variantReady && availableStock === 0 ? (
                <View className="flex-row items-start gap-3 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3.5 dark:border-red-600 dark:bg-red-900/30">
                  <Text className="text-xl leading-none">🚫</Text>
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300 sm:text-base">
                      {hasVariants && selectedVariant
                        ? t('productDetail.variant_out_of_stock')
                        : t('productDetail.product_out_of_stock')}
                    </Text>
                    <Text className="mt-0.5 font-sans text-xs text-red-500 dark:text-red-400">
                      {t('productDetail.out_of_stock_hint')}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View>
                {displayDiscountPct > 0 ? (
                  <>
                    <View className="mb-2 flex-row flex-wrap items-center gap-2">
                      <View className="rounded-full bg-red-500 px-2 py-0.5">
                        <Text className="font-sans text-xs font-bold text-white">
                          {t('productDetail.discount_off', { percent: Math.round(displayDiscountPct) })}
                        </Text>
                      </View>
                      {activeTier ? (
                        <View className="rounded-full border border-green-200 bg-green-100 px-2.5 py-1 dark:border-green-700 dark:bg-green-900/40">
                          <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                            🎉 {t('productDetail.volume_price_active')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Text className="min-w-0 break-words font-sans text-2xl font-bold text-red-600 dark:text-red-400">
                        {displayPrice}
                      </Text>
                      {baseComparePrice ? (
                        <Text className="font-sans text-base text-gray-400 line-through dark:text-slate-400 sm:text-lg">
                          {baseComparePrice}
                        </Text>
                      ) : null}
                    </View>
                    {displayDiscountSaved ? (
                      <Text className="mt-0.5 font-sans text-sm font-medium text-green-600 dark:text-green-400">
                        {t('productDetail.you_save', { amount: displayDiscountSaved })}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <View className="flex-row flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Text className="min-w-0 break-words font-sans text-2xl font-semibold text-green-600 dark:text-green-400">
                      {displayPrice}
                    </Text>
                    {activeTier ? (
                      <View className="rounded-full border border-green-200 bg-green-100 px-2.5 py-1 dark:border-green-700 dark:bg-green-900/40">
                        <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                          🎉 {t('productDetail.volume_price_active')}
                        </Text>
                      </View>
                    ) : null}
                    {hasVariants && !selectedVariant ? (
                      <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                        {t('productDetail.starting_price')}
                      </Text>
                    ) : null}
                  </View>
                )}
                <Text className="mt-1 font-sans text-gray-500 dark:text-slate-400">
                  {t('productDetail.tax_exclusive')}
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                <PillChip label={`${t('productDetail.moq')}: ${effectiveMoq} ${unitLabel}`} />
                <PillChip label={`${t('productDetail.unit')}: ${unitLabel}`} />
                <PillChip
                  label={stockText}
                  tone={stockIsOut ? 'stock-out' : 'stock-in'}
                />
                {product.seller?.verified ? (
                  <PillChip label={t('productDetail.verified_seller')} tone="verified" />
                ) : null}
                {!deliveryLoading && deliveryLabels.length > 0 ? (
                  <PillChip label={t('productDetail.delivery_zones_available')} tone="delivery" />
                ) : null}
              </View>

              {hasVariants ? (
                <View
                  ref={variantSectionRef}
                  className="min-w-0 scroll-mt-24 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50 sm:p-4"
                >
                  <ProductVariantPicker
                    options={product.options}
                    variants={product.variants}
                    onVariantChange={handleVariantChange}
                  />
                </View>
              ) : null}

              {variantError ? (
                <View className="flex-row items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-900/20">
                  <Feather name="alert-circle" color="#d97706" size={16} />
                  <Text className="min-w-0 flex-1 font-sans text-sm text-amber-700 dark:text-amber-400">
                    {variantError}
                  </Text>
                </View>
              ) : null}

              <View>
                <Text className="mb-2 font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                  {t('productDetail.description')}
                </Text>
                <Text className="break-words font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
                  {productDescription || t('productDetail.no_description')}
                </Text>
              </View>

              {Object.keys(product.specifications).length > 0 ? (
                <View>
                  <Text className="mb-2 font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                    {t('productDetail.specifications')}
                  </Text>
                  <View className="gap-2 sm:flex-row sm:flex-wrap">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <View
                        key={key}
                        className="border-t border-gray-200 pt-2 dark:border-slate-700 sm:w-[48%]"
                      >
                        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {formatSpecKey(key)}
                        </Text>
                        <Text className="break-words font-sans text-sm text-gray-700 dark:text-slate-300">
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {product.wholesaleTiers.length > 0 ? (
                <View className="min-w-0 max-w-full rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20 sm:p-4">
                  <Text className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    {t('productDetail.volume_pricing')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    className="scroll-x-only max-w-full"
                  >
                    <View className="min-w-[520px] gap-2">
                      <View className="flex-row border-b border-amber-200 pb-1 dark:border-amber-800">
                        <Text className="w-[30%] font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                          {t('productDetail.min_qty')}
                        </Text>
                        <Text className="w-[30%] font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                          {t('productDetail.price_per_unit', { unit: product.quantityUnit })}
                        </Text>
                        <Text className="w-[20%] font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                          {t('productDetail.discount')}
                        </Text>
                        <Text className="w-[20%] font-sans text-xs font-medium text-gray-500 dark:text-slate-400" />
                      </View>
                      {product.wholesaleTiers.map((tier) => {
                        const isActive = activeTier?.minQty === tier.minQty;
                        return (
                          <View
                            key={`${tier.minQty}-${tier.price}`}
                            className={`flex-row border-b border-amber-100 py-1 dark:border-amber-900 ${
                              isActive ? 'bg-amber-100 dark:bg-amber-800/30' : ''
                            }`}
                          >
                            <Text className="w-[30%] font-sans text-sm text-gray-700 dark:text-slate-300">
                              ≥ {tier.minQty} {product.quantityUnit}
                            </Text>
                            <Text className="w-[30%] font-sans text-sm font-semibold text-green-700 dark:text-green-400">
                              {tier.price}
                            </Text>
                            <Text className="w-[20%] font-sans text-sm text-red-600 dark:text-red-400">
                              {tier.discountPct > 0 ? `-${tier.discountPct}%` : '—'}
                            </Text>
                            <View className="w-[20%]">
                              {isActive ? (
                                <Text className="rounded bg-green-100 px-1.5 py-0.5 font-sans text-[10px] text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                  {t('productDetail.applied')}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                  {nextTier ? (
                    <Text className="mt-2 font-sans text-xs font-medium text-amber-700 dark:text-amber-300">
                      💡{' '}
                      {t('productDetail.add_more_for_tier', {
                        count: nextTier.minQty - quantity,
                        unit: product.quantityUnit,
                        discount: nextTier.discountPct
                          ? `-${nextTier.discountPct}%`
                          : t('productDetail.better_price'),
                      })}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View className="gap-2">
                <View className="flex-row flex-wrap items-center gap-3">
                  <Text className="font-sans font-medium text-gray-800 dark:text-slate-200">
                    {t('productDetail.quantity')}
                  </Text>
                  <Pressable
                    onPress={decrementQuantity}
                    disabled={quantity <= effectiveMoq}
                    className="h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                  >
                    <Text className="font-sans text-xl text-gray-700 dark:text-slate-200">−</Text>
                  </Pressable>
                  <TextInput
                    value={String(quantity)}
                    onChangeText={(value) => {
                      const snapped = snapQuantityToStep(value, effectiveMoq, effectiveStep);
                      setQuantity(
                        maxValidQuantity !== undefined && maxValidQuantity > 0
                          ? Math.min(snapped, maxValidQuantity)
                          : snapped
                      );
                    }}
                    keyboardType="number-pad"
                    className="h-8 min-w-[80px] rounded-md border border-gray-300 bg-white px-2 text-center font-sans text-base font-semibold text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <Pressable
                    onPress={incrementQuantity}
                    disabled={
                      maxValidQuantity !== undefined &&
                      maxValidQuantity > 0 &&
                      quantity + effectiveStep > maxValidQuantity
                    }
                    className="h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                  >
                    <Text className="font-sans text-xl text-gray-700 dark:text-slate-200">+</Text>
                  </Pressable>
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                    {product.quantityUnit}
                  </Text>
                </View>
                {effectiveStep > 1 ? (
                  <Text className="font-sans text-xs text-amber-600 dark:text-amber-400">
                    {t('productDetail.order_multiples', {
                      step: effectiveStep,
                      first: effectiveMoq,
                      second: effectiveMoq + effectiveStep,
                      third: effectiveMoq + effectiveStep * 2,
                    })}
                  </Text>
                ) : null}
              </View>

              <ProductDetailActions
                compact={useCompactActions}
                stockIsOut={stockIsOut}
                variantReady={variantReady}
                addingToCart={addingToCart}
                primaryCtaLabel={primaryCtaLabel}
                compared={compared}
                savedToWishlist={savedToWishlist}
                wishlistLoading={wishlistLoading}
                shareOpen={shareOpen}
                sharePayload={sharePayload}
                onPrimaryCta={() => void handlePrimaryCta()}
                onBuyNow={() => void handleBuyNow()}
                onToggleWishlist={() => void handleToggleWishlist()}
                onShare={handleShare}
                onShareClose={handleShareClose}
                onToggleCompare={handleToggleCompare}
                labels={{
                  outOfStock: t('productDetail.out_of_stock'),
                  buyNow: t('productDetail.buy_now'),
                  compared: t('productDetail.compared'),
                  compare: t('productDetail.compare'),
                  removeFromWishlist: t('productDetail.remove_from_wishlist'),
                  addToWishlist: t('productDetail.add_to_wishlist'),
                  shareProduct: t('productDetail.share_product'),
                  shareOn: t('productDetail.share_on'),
                  copyLink: t('productDetail.copy_link'),
                  copied: t('productDetail.copied'),
                  close: t('common.close'),
                  removeFromCompare: t('productDetail.remove_from_compare'),
                  addToCompare: t('productDetail.add_to_compare'),
                  shareFacebook: t('productDetail.share_facebook'),
                  shareWhatsapp: t('productDetail.share_whatsapp'),
                  shareViber: t('productDetail.share_viber'),
                  shareTelegram: t('productDetail.share_telegram'),
                  shareX: t('productDetail.share_x'),
                }}
              />

              {product.seller ? (
                <View className="border-t border-gray-200 pt-2 dark:border-slate-700">
                  <DeliveryTicker labels={deliveryLabels} loading={deliveryLoading} />
                </View>
              ) : null}

              {product.seller ? (
                <View className="border-t border-gray-200 pt-6 dark:border-slate-700">
                  <Text className="mb-3 font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                    {t('productDetail.seller_info')}
                  </Text>
                  <Link href={sellerHref} asChild>
                    <Pressable className="flex-row items-center rounded-lg p-2 active:bg-gray-50 dark:active:bg-slate-800">
                      <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-200 dark:border-slate-600 dark:bg-slate-700">
                        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                          {t('productDetail.shop')}
                        </Text>
                      </View>
                      <View className="ml-4 min-w-0 flex-1">
                        <Text className="font-sans font-medium text-green-600 dark:text-green-400">
                          {product.seller.name}
                        </Text>
                        <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                          {product.seller.rating} ★
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                </View>
              ) : null}
            </View>
          </View>

          <ProductDetailSecondarySections
            product={product}
            moreProducts={moreProducts}
            moreProductsLoading={moreProductsLoading}
            reviews={reviews}
            sellerHref={sellerHref}
            canReview={canReview}
            hasReviewed={hasReviewedProduct}
            submittingReview={submittingReview}
            reviewMessage={reviewMessage}
            onSubmitReview={handleSubmitReview}
            onWriteReviewPress={handleWriteReviewPress}
          />
        </View>
      </View>
  );

  return (
    <AppLayout scrollEnabled={Platform.OS !== 'web'}>
      <ProductDetailToast
        message={actionMessage}
        onDismiss={() => setActionMessage(null)}
      />
      {Platform.OS === 'web' ? (
        <View className="min-h-0 min-w-0 flex-1">
          <ScrollView
            className="min-w-0 flex-1"
            contentContainerClassName={`min-w-0 grow ${showMobileStickyCta ? 'pb-24' : 'pb-8'}`}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator>
            {pageContent}
          </ScrollView>

          {showMobileStickyCta ? (
            <View className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
              <View className={`${SITE_CONTAINER_CLASS} min-w-0 flex-row items-center gap-3`}>
                <View className="min-w-0 flex-1">
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
                    {t('productDetail.price')}
                  </Text>
                  <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
                    {displayPrice}
                  </Text>
                </View>
                {stockIsOut ? (
                  <Pressable
                    disabled
                    className="ml-auto min-h-11 max-w-[52vw] items-center justify-center rounded-xl bg-gray-300 px-4 py-2.5 dark:bg-slate-700">
                    <Text className="font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">
                      🚫 {t('productDetail.out_of_stock')}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => void handlePrimaryCta()}
                    disabled={addingToCart}
                    className={`ml-auto min-h-11 max-w-[52vw] flex-row items-center justify-center rounded-xl px-4 py-2.5 ${
                      variantReady ? 'bg-green-600' : 'bg-amber-500'
                    } ${addingToCart ? 'opacity-50' : ''}`}>
                    <Feather
                      name={variantReady ? 'shopping-cart' : 'sliders'}
                      color="#ffffff"
                      size={16}
                    />
                    <Text className="ml-1.5 font-sans text-sm font-semibold text-white" numberOfLines={1}>
                      {primaryCtaLabel}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        pageContent
      )}
    </AppLayout>
  );
}
