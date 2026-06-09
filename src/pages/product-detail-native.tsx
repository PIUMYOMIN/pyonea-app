import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useRouter, type Href } from 'expo-router';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { ProductVariantPicker } from '@/components/product/product-variant-picker';
import { SITE_PUBLIC_URL } from '@/config/native';
import { useNativeAuth } from '@/context/native-auth';
import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import { hasUserRole } from '@/utils/auth-routing';
import { emitCartCountChanged } from '@/utils/native-cart-events';
import {
  isProductCompared,
  loadCompareItems,
  saveCompareItems,
  type NativeCompareItem,
} from '@/utils/compare-native';
import {
  addProductToCart,
  addWishlistItem,
  fetchMoreProductsFromSeller,
  fetchProductDetail,
  fetchProductReviews,
  fetchSellerDeliveryAreas,
  fetchWishlist,
  removeWishlistItem,
  submitProductReview,
  type HomeProduct,
  type ProductDetail,
  type ProductVariant,
  type ProductReview,
  type SellerDeliveryArea,
} from '@/utils/native-api';

const ProductDetailSecondarySections = lazy(() =>
  import('@/components/product/product-detail-secondary-sections').then((module) => ({
    default: module.ProductDetailSecondarySections,
  })),
);

const placeholderProduct = require('@/../assets/images/placeholder-product.png');

type DeliveryLabel = {
  region: string;
  city?: string;
  township?: string;
};

const toPositiveInt = (value: number, fallback = 1) => {
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const formatSpecKey = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

function DetailSkeleton() {
  return (
    <AppLayout>
      <View className="bg-gray-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
        <View className="mx-auto w-full max-w-7xl gap-8 lg:flex-row">
          <View className="min-w-0 flex-1 gap-4">
            <View className="aspect-square rounded-2xl bg-gray-200 dark:bg-slate-800" />
            <View className="flex-row gap-3">
              {[1, 2, 3].map((item) => (
                <View key={item} className="h-20 w-20 rounded-xl bg-gray-200 dark:bg-slate-800" />
              ))}
            </View>
          </View>
          <View className="min-w-0 flex-1 gap-4">
            <View className="h-8 w-3/4 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="h-5 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="h-16 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="h-56 rounded-2xl bg-gray-200 dark:bg-slate-800" />
          </View>
        </View>
      </View>
    </AppLayout>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
      <Text className="font-sans text-[11px] text-gray-500 dark:text-slate-400">{label}</Text>
      <Text className="mt-0.5 font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
        {value}
      </Text>
    </View>
  );
}

function ActionMessage({
  message,
}: {
  message: { type: 'success' | 'error' | 'info'; text: string } | null;
}) {
  const styles = {
    success: {
      box: 'border-green-200 bg-white dark:border-green-800 dark:bg-slate-900',
      iconBox: 'bg-green-100 dark:bg-green-900/50',
      icon: 'check-circle' as const,
      iconColor: '#16a34a',
      text: 'text-green-800 dark:text-green-200',
    },
    error: {
      box: 'border-red-200 bg-white dark:border-red-800 dark:bg-slate-900',
      iconBox: 'bg-red-100 dark:bg-red-900/50',
      icon: 'alert-circle' as const,
      iconColor: '#dc2626',
      text: 'text-red-700 dark:text-red-200',
    },
    info: {
      box: 'border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-900',
      iconBox: 'bg-blue-100 dark:bg-blue-900/50',
      icon: 'info' as const,
      iconColor: '#2563eb',
      text: 'text-blue-700 dark:text-blue-200',
    },
  }[message?.type || 'info'];

  return (
    <Modal transparent visible={Boolean(message)} animationType="fade" statusBarTranslucent>
      <View pointerEvents="box-none" className="flex-1 items-center px-4 pt-20">
        <View
          className={`w-full max-w-md flex-row items-center gap-3 rounded-xl border px-4 py-3 shadow-xl shadow-slate-950/15 ${styles.box}`}>
          <View className={`h-9 w-9 items-center justify-center rounded-full ${styles.iconBox}`}>
            <Feather name={styles.icon} color={styles.iconColor} size={19} />
          </View>
          <Text className={`min-w-0 flex-1 font-sans text-sm font-bold ${styles.text}`}>
            {message?.text}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function DeliveryWord({ value }: { value?: string }) {
  const { isDark } = useTheme();
  const [translateY] = useState(() => new Animated.Value(12));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    translateY.setValue(12);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, value]);

  if (!value) return null;

  return (
    <Animated.Text
      className="max-w-[150px] font-sans text-sm font-semibold"
      numberOfLines={1}
      style={{ color: isDark ? '#f8fafc' : '#111827', opacity, transform: [{ translateY }] }}>
      {value}
    </Animated.Text>
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
  const { isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = labels.length ? activeIndex % labels.length : 0;
  const activeLabel = labels[safeIndex];

  useEffect(() => {
    if (labels.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % labels.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [labels.length]);

  if (loading) {
    return (
      <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-200">
        {t('productDetail.delivery_loading')}
      </Text>
    );
  }

  if (!activeLabel) {
    return (
      <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-200">
        {t('productDetail.delivery_not_set')}
      </Text>
    );
  }

  return (
    <View className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-700/70 dark:bg-slate-800">
      <View className="mb-2 flex-row items-center justify-between gap-3">
        <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
          {t('productDetail.delivering_to')}
        </Text>
        {labels.length > 1 ? (
          <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
            {safeIndex + 1}/{labels.length}
          </Text>
        ) : null}
      </View>

      <View className="min-h-7 flex-row items-center gap-1.5 overflow-hidden">
        <DeliveryWord value={activeLabel.region} />
        {activeLabel.city ? (
          <>
            <Text
              className="font-sans text-sm"
              style={{ color: isDark ? '#94a3b8' : '#9ca3af' }}>
              {'>'}
            </Text>
            <DeliveryWord value={activeLabel.city} />
          </>
        ) : null}
        {activeLabel.township ? (
          <>
            <Text
              className="font-sans text-sm"
              style={{ color: isDark ? '#94a3b8' : '#9ca3af' }}>
              {'>'}
            </Text>
            <DeliveryWord value={activeLabel.township} />
          </>
        ) : null}
      </View>
    </View>
  );
}

const productToCompareItem = (product: ProductDetail): NativeCompareItem => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  price: product.price,
  rating: String(product.rating || 0),
  reviewCount: product.reviewCount || 0,
  moq: product.moq || 1,
  inStock: product.productType !== 'physical' || product.stock > 0,
  seller: product.seller?.name || 'Pyonea seller',
  category: product.categoryName || '',
});

const buildDeliveryLabels = (
  areas: SellerDeliveryArea[],
  wholeMyanmarLabel: string
): DeliveryLabel[] =>
  areas
    .map((area) => {
      if (area.areaType === 'country') {
        return { region: wholeMyanmarLabel };
      }

      const region = area.state || '';
      if (!region) return null;

      return {
        region,
        city: area.city || undefined,
        township: area.township || undefined,
      };
    })
    .filter((label): label is DeliveryLabel => Boolean(label));

export function ProductDetailNative({
  slug,
  initialProduct,
}: {
  slug: string;
  initialProduct?: ProductDetail | null;
}) {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useNativeAuth();
  const [product, setProduct] = useState<ProductDetail | null>(initialProduct || null);
  const [reviews, setReviews] = useState<ProductReview[]>(initialProduct?.reviews || []);
  const [moreProducts, setMoreProducts] = useState<HomeProduct[]>([]);
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
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [compared, setCompared] = useState(
    initialProduct ? isProductCompared(initialProduct.id) : false
  );
  const [copied, setCopied] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialProduct = Boolean(initialProduct);
  const isBuyer = hasUserRole(user, 'buyer');

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
    const controller = new AbortController();

    const loadProduct = async () => {
      if (!hasInitialProduct) setLoading(true);
      setError('');

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

        const reviewList =
          nextProduct.reviews.length > 0
            ? nextProduct.reviews
            : await fetchProductReviews(nextProduct.id, controller.signal).catch(() => []);
        setReviews(reviewList);

        if (nextProduct.seller?.id) {
          const sellerProducts = await fetchMoreProductsFromSeller(
            nextProduct.seller.id,
            nextProduct.id,
            controller.signal
          ).catch(() => []);
          setMoreProducts(sellerProducts);

          if (!controller.signal.aborted) setDeliveryLoading(true);
          const sellerKey = nextProduct.seller.slug || String(nextProduct.seller.id);
          const areas = await fetchSellerDeliveryAreas(sellerKey, controller.signal).catch(() => []);
          if (!controller.signal.aborted) {
            setDeliveryAreas(areas);
            setDeliveryLoading(false);
          }
        } else {
          setMoreProducts([]);
          setDeliveryAreas([]);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          if (hasInitialProduct) {
            showInlineLoadMessage(
              'info',
              err instanceof Error ? err.message : t('productDetail.failed_load')
            );
          } else {
            setError(err instanceof Error ? err.message : t('productDetail.failed_load'));
            setProduct(null);
          }
        }
      } finally {
        if (!controller.signal.aborted) setDeliveryLoading(false);
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadProduct();

    return () => controller.abort();
  }, [hasInitialProduct, initialProduct, slug, t]);

  const images = useMemo(() => product?.images ?? [], [product]);
  const currentImage = images[activeImage];
  const deliveryLabels = useMemo(
    () => buildDeliveryLabels(deliveryAreas, t('productDetail.delivery_whole_myanmar')),
    [deliveryAreas, t]
  );
  const productUrl = product ? `${SITE_PUBLIC_URL}/products/${product.slug}` : SITE_PUBLIC_URL;
  const hasVariants = Boolean(product?.hasVariants && product.options.length > 0);
  const variantReady = !hasVariants || selectedVariant !== null;
  const availableStock = selectedVariant ? selectedVariant.quantity : (product?.stock ?? 0);
  const effectiveMoq = toPositiveInt(selectedVariant?.moq ?? product?.moq ?? 1, 1);
  const effectiveStep = toPositiveInt(
    selectedVariant?.quantityStep ?? product?.quantityStep ?? effectiveMoq,
    effectiveMoq
  );
  const maxQuantity =
    product?.productType === 'physical' && variantReady && availableStock > 0
      ? availableStock
      : undefined;
  const stockOut =
    product?.productType === 'physical' && variantReady && availableStock < effectiveMoq;
  const displayPrice = selectedVariant ? selectedVariant.price : product?.price;
  const activeTier = product?.wholesaleTiers.length
    ? [...product.wholesaleTiers]
        .sort((a, b) => b.minQty - a.minQty)
        .find((tier) => quantity >= tier.minQty)
    : null;
  const nextTier = product?.wholesaleTiers.length
    ? [...product.wholesaleTiers]
        .sort((a, b) => a.minQty - b.minQty)
        .find((tier) => quantity < tier.minQty)
    : null;
  const sellerHref = product?.seller
    ? (`/sellers/${product.seller.slug || product.seller.id}` as Href)
    : '/sellers';

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setActiveImage((current) => (current + 1) % images.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    if (!product || !isAuthenticated || !isBuyer) return;

    const controller = new AbortController();
    const loadWishlistStatus = async () => {
      try {
        const wishlist = await fetchWishlist(controller.signal);
        setIsInWishlist(wishlist.some((item) => String(item.id) === String(product.id)));
      } catch {
        setIsInWishlist(false);
      }
    };

    void loadWishlistStatus();
    return () => controller.abort();
  }, [isAuthenticated, isBuyer, product]);

  const decrementQuantity = () => {
    setQuantity((current) => Math.max(effectiveMoq, current - effectiveStep));
  };

  const incrementQuantity = () => {
    setQuantity((current) => {
      const next = current + effectiveStep;
      return maxQuantity ? Math.min(next, maxQuantity) : next;
    });
  };

  const goToPreviousImage = () => {
    if (images.length <= 1) return;
    setActiveImage((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const goToNextImage = () => {
    if (images.length <= 1) return;
    setActiveImage((current) => (current + 1) % images.length);
  };

  const requireBuyer = () => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/products/${product?.slug || slug}` as Href);
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
    if (!product || stockOut || addingToCart || !requireBuyer()) return false;

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
      if (typeof result.totalItems === 'number') {
        emitCartCountChanged(result.totalItems);
      } else {
        emitCartCountChanged({ delta: quantity });
      }
      showMessage('success', result.message || t('productDetail.added_to_cart'));
      return true;
    } catch (err) {
      showMessage(
        'error',
        err instanceof Error ? err.message : t('productDetail.add_to_cart_failed')
      );
      return false;
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    const added = await handleAddToCart();
    if (added) router.push('/cart');
  };

  const handleToggleWishlist = async () => {
    if (!product || wishlistLoading || !requireBuyer()) return;

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await removeWishlistItem(product.id);
        setIsInWishlist(false);
        showMessage('success', t('productDetail.removed_from_wishlist'));
      } else {
        await addWishlistItem(product.id);
        setIsInWishlist(true);
        showMessage('success', t('productDetail.added_to_wishlist'));
      }
    } catch (err) {
      showMessage(
        'error',
        err instanceof Error ? err.message : t('productDetail.wishlist_update_failed')
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleToggleCompare = () => {
    if (!product) return;

    const items = loadCompareItems();
    const exists = items.some((item) => String(item.id) === String(product.id));
    const nextItems = exists
      ? items.filter((item) => String(item.id) !== String(product.id))
      : [...items, productToCompareItem(product)].slice(0, 4);

    saveCompareItems(nextItems);
    setCompared(!exists);
    showMessage(
      'success',
      exists ? t('productDetail.remove_from_compare') : t('productDetail.add_to_compare')
    );
  };

  const canReview = isAuthenticated && isBuyer;

  const handleWriteReviewPress = () => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/products/${product?.slug || slug}` as Href);
      return false;
    }

    if (!isBuyer) {
      setReviewMessage({ type: 'error', text: t('productDetail.only_buyers_review') });
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
        text: err instanceof Error ? err.message : t('productDetail.review_submit_failed'),
      });
      return false;
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;

    const shareText = t('productDetail.share_text', { title: product.name });
    try {
      await Share.share({
        title: product.name,
        message: `${shareText}\n${productUrl}`,
        url: productUrl,
      });
    } catch {
      try {
        await globalThis.navigator?.clipboard?.writeText(productUrl);
        setCopied(true);
        showMessage('success', t('productDetail.copied'));
        setTimeout(() => setCopied(false), 2500);
      } catch {
        showMessage('info', productUrl);
      }
    }
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

  return (
    <AppLayout>
      <ActionMessage message={actionMessage} />
      <View className="bg-gray-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
        <View className="mx-auto w-full max-w-7xl">
          <Pressable onPress={() => router.push('/products')} className="mb-5 flex-row items-center gap-2">
            <Feather name="arrow-left" color="#16a34a" size={18} />
            <Text className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">
              {t('productDetail.back_to_products')}
            </Text>
          </Pressable>

          <View className="gap-8 rounded-2xl border border-gray-100 bg-white p-4 shadow-md shadow-gray-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/50 sm:p-6 lg:flex-row lg:p-8">
            <View className="min-w-0 flex-1 gap-4">
              <View className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800 sm:aspect-[4/3] lg:aspect-[5/4]">
                <Image
                  source={currentImage ? { uri: currentImage } : placeholderProduct}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  loading="eager"
                  priority="high"
                />
                {product.discountPct > 0 ? (
                  <View className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1">
                    <Text className="font-sans text-xs font-black text-white">
                      {t('productDetail.discount_off', { percent: product.discountPct })}
                    </Text>
                  </View>
                ) : null}
                {images.length > 1 ? (
                  <>
                    <Pressable
                      onPress={goToPreviousImage}
                      className="absolute left-3 top-1/2 h-10 w-10 -translate-y-5 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-slate-950/85">
                      <Feather name="chevron-left" color="#16a34a" size={22} />
                    </Pressable>
                    <Pressable
                      onPress={goToNextImage}
                      className="absolute right-3 top-1/2 h-10 w-10 -translate-y-5 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-slate-950/85">
                      <Feather name="chevron-right" color="#16a34a" size={22} />
                    </Pressable>
                    <View className="absolute bottom-4 left-0 right-0 items-center">
                      <View className="flex-row gap-1.5 rounded-full bg-slate-950/55 px-3 py-1.5">
                        {images.map((image, index) => (
                          <Pressable
                            key={`dot-${image}-${index}`}
                            onPress={() => setActiveImage(index)}
                            className={`h-2 rounded-full ${
                              activeImage === index ? 'w-5 bg-white' : 'w-2 bg-white/50'
                            }`}
                          />
                        ))}
                      </View>
                    </View>
                    <View className="absolute right-4 top-4 rounded-full bg-slate-950/60 px-3 py-1">
                      <Text className="font-sans text-xs font-bold text-white">
                        {activeImage + 1}/{images.length}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>

              {images.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-3 pr-2">
                    {images.map((image, index) => (
                      <Pressable
                        key={`${image}-${index}`}
                        onPress={() => setActiveImage(index)}
                        className={`h-20 w-20 overflow-hidden rounded-xl border-2 ${
                          activeImage === index
                            ? 'border-green-500'
                            : 'border-gray-200 dark:border-slate-700'
                        }`}>
                        <Image
                          source={{ uri: image }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          priority={index === activeImage ? 'high' : 'low'}
                        />
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
            </View>

            <View className="min-w-0 flex-1 gap-6">
              <View>
                {product.categoryName ? (
                  <Text className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                    {product.categoryName}
                  </Text>
                ) : null}
                <Text className="font-sans text-2xl font-bold leading-tight text-gray-950 dark:text-slate-100 sm:text-3xl">
                  {product.name}
                </Text>
                <View className="mt-3">
                  <Stars rating={product.rating} count={product.reviewCount} />
                </View>
              </View>

              <View className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t('productDetail.price')}
                </Text>
                <View className="mt-1 flex-row flex-wrap items-end gap-2">
                  <Text
                    className={`font-sans text-3xl font-black ${
                      product.discountPct > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-700 dark:text-green-300'
                    }`}>
                    {displayPrice || product.price}
                  </Text>
                  {!selectedVariant && product.originalPrice ? (
                    <Text className="mb-1 font-sans text-base text-gray-400 line-through dark:text-slate-500">
                      {product.originalPrice}
                    </Text>
                  ) : null}
                </View>
                {!selectedVariant && product.savedAmount ? (
                  <Text className="mt-2 font-sans text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {t('productDetail.you_save', { amount: product.savedAmount.replace(' MMK', '') })}
                  </Text>
                ) : null}
              </View>

              <View className="flex-row flex-wrap gap-3">
                {effectiveMoq > 1 ? (
                  <InfoChip label={t('productDetail.moq')} value={`${effectiveMoq}`} />
                ) : null}
                <InfoChip label={t('productDetail.unit')} value={product.quantityUnit} />
                <InfoChip
                  label={t('productDetail.quantity')}
                  value={
                    product.productType === 'physical'
                      ? variantReady
                        ? t('productDetail.in_stock_count', { count: availableStock })
                        : t('productDetail.select_options_for_stock')
                      : t('productDetail.available')
                  }
                />
                {product.sku ? <InfoChip label="SKU" value={product.sku} /> : null}
              </View>

              {hasVariants ? (
                <View className="min-w-0 rounded-xl border border-gray-200 p-3 dark:border-slate-700 sm:p-4">
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

              {product.description ? (
                <View>
                  <Text className="mb-2 font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                    {t('productDetail.description')}
                  </Text>
                  <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
                    {product.description || t('productDetail.no_description')}
                  </Text>
                </View>
              ) : null}

              {Object.keys(product.specifications).length > 0 ? (
                <View>
                  <Text className="mb-2 font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                    {t('productDetail.specifications')}
                  </Text>
                  <View className="gap-2 sm:flex-row sm:flex-wrap">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <View
                        key={key}
                        className="border-t border-gray-200 pt-2 dark:border-slate-700 sm:w-[48%]">
                        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {formatSpecKey(key)}
                        </Text>
                        <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {product.wholesaleTiers.length > 0 ? (
                <View className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <Text className="mb-3 font-sans text-base font-semibold text-amber-900 dark:text-amber-200">
                    {t('productDetail.volume_pricing')}
                  </Text>
                  <View className="gap-2">
                    {product.wholesaleTiers.map((tier) => (
                      <View
                        key={`${tier.minQty}-${tier.price}`}
                        className={`flex-row items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                          activeTier?.minQty === tier.minQty
                            ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/25'
                            : 'border-white bg-white dark:border-slate-800 dark:bg-slate-900'
                        }`}>
                        <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                          {t('productDetail.min_qty')}: {tier.minQty}
                        </Text>
                        <View className="items-end">
                          <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                            {tier.price}
                          </Text>
                          {activeTier?.minQty === tier.minQty ? (
                            <Text className="font-sans text-[10px] font-bold uppercase text-green-600 dark:text-green-300">
                              {t('productDetail.applied')}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                  {nextTier ? (
                    <Text className="mt-3 font-sans text-xs text-amber-700 dark:text-amber-300">
                      {t('productDetail.add_more_for_tier', {
                        count: nextTier.minQty - quantity,
                        unit: product.quantityUnit,
                        discount: nextTier.discountPct ? `${nextTier.discountPct}%` : t('productDetail.better_price'),
                      })}
                    </Text>
                  ) : activeTier ? (
                    <Text className="mt-3 font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                      {t('productDetail.volume_price_active')}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View className="gap-4 border-t border-gray-200 pt-6 dark:border-slate-700">
                <View className="flex-row flex-wrap items-center gap-3">
                  <Text className="font-sans font-semibold text-gray-800 dark:text-slate-200">
                    {t('productDetail.quantity')}
                  </Text>
                  <Pressable
                    onPress={decrementQuantity}
                    disabled={quantity <= effectiveMoq}
                    className="h-9 w-9 items-center justify-center rounded border border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800">
                    <Text className="font-sans text-xl text-gray-700 dark:text-slate-200">-</Text>
                  </Pressable>
                  <View className="h-9 min-w-16 items-center justify-center rounded-md border border-gray-300 bg-white px-4 dark:border-slate-600 dark:bg-slate-800">
                    <Text className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100">
                      {quantity}
                    </Text>
                  </View>
                  <Pressable
                    onPress={incrementQuantity}
                    disabled={maxQuantity !== undefined && quantity + effectiveStep > maxQuantity}
                    className="h-9 w-9 items-center justify-center rounded border border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800">
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

                <View className="gap-3 sm:flex-row">
                  <Pressable
                    onPress={handleAddToCart}
                    disabled={(variantReady && stockOut) || addingToCart}
                    className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg px-5 py-3 ${
                      stockOut || addingToCart
                        ? 'bg-gray-300 dark:bg-slate-700'
                        : !variantReady
                          ? 'bg-amber-500'
                          : 'bg-green-600'
                    }`}>
                    <Feather name="shopping-cart" color="#ffffff" size={18} />
                    <Text className="font-sans text-sm font-semibold text-white">
                      {addingToCart
                        ? t('productDetail.adding')
                        : !variantReady
                          ? t('productDetail.select_options')
                          : stockOut
                          ? t('productDetail.out_of_stock')
                          : t('productDetail.add_to_cart')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleBuyNow}
                    disabled={(variantReady && stockOut) || addingToCart}
                    className="min-h-12 flex-1 items-center justify-center rounded-lg border border-green-600 px-5 py-3">
                    <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                      {t('productDetail.buy_now')}
                    </Text>
                  </Pressable>
                </View>

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={handleToggleWishlist}
                    disabled={wishlistLoading}
                    className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-md border px-3 ${
                      isInWishlist
                        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}>
                    <Feather name="heart" color={isInWishlist ? '#ef4444' : '#64748b'} size={16} />
                    <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
                      {wishlistLoading
                        ? t('productDetail.adding')
                        : isInWishlist
                          ? t('productDetail.remove_from_wishlist')
                          : t('productDetail.add_to_wishlist')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleShare}
                    className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-md border border-gray-300 px-3 dark:border-slate-600">
                    <Feather name={copied ? 'check' : 'share-2'} color="#64748b" size={16} />
                    <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
                      {copied ? t('productDetail.copied') : t('productDetail.share_product')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleToggleCompare}
                    className={`min-h-11 flex-1 items-center justify-center rounded-md border px-3 ${
                      compared
                        ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20'
                        : 'border-gray-300 dark:border-slate-600'
                    }`}>
                    <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
                      {compared ? t('productDetail.compared') : t('productDetail.compare')}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {product.seller ? (
                <View className="border-t border-gray-200 pt-5 dark:border-slate-700">
                  <DeliveryTicker labels={deliveryLabels} loading={deliveryLoading} />
                </View>
              ) : null}

              {product.seller ? (
                <View className="border-t border-gray-200 pt-6 dark:border-slate-700">
                  <Text className="mb-3 font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                    {t('productDetail.seller_info')}
                  </Text>
                  <Link href={sellerHref} asChild>
                    <Pressable className="flex-row items-center gap-4 rounded-lg p-2">
                      <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-100 dark:border-slate-600 dark:bg-slate-700">
                        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                          {t('productDetail.shop')}
                        </Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="min-w-0 font-sans font-medium text-green-600 dark:text-green-400">
                            {product.seller.name}
                          </Text>
                          {product.seller.verified ? (
                            <Feather name="check-circle" color="#22c55e" size={15} />
                          ) : null}
                        </View>
                        <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                          {t('productDetail.seller_rating', { rating: product.seller.rating })}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                </View>
              ) : null}
            </View>
          </View>

          <Suspense fallback={null}>
            <ProductDetailSecondarySections
              product={product}
              moreProducts={moreProducts}
              reviews={reviews}
              sellerHref={sellerHref}
              canReview={canReview}
              submittingReview={submittingReview}
              reviewMessage={reviewMessage}
              onSubmitReview={handleSubmitReview}
              onWriteReviewPress={handleWriteReviewPress}
            />
          </Suspense>
        </View>
      </View>

      <View className="sticky bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/95 sm:hidden">
        <View className="mx-auto w-full max-w-7xl flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-500" numberOfLines={1}>
              {t('productDetail.price')}
            </Text>
            <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
              {activeTier?.price || displayPrice || product.price}
            </Text>
          </View>
          <Pressable
            onPress={handleAddToCart}
            disabled={(variantReady && stockOut) || addingToCart}
            className={`min-h-11 max-w-[58%] flex-row items-center justify-center gap-2 rounded-xl px-4 py-2.5 ${
              stockOut || addingToCart
                ? 'bg-gray-300 dark:bg-slate-700'
                : !variantReady
                  ? 'bg-amber-500'
                  : 'bg-green-600'
            }`}>
            <Feather name="shopping-cart" color="#ffffff" size={16} />
            <Text className="font-sans text-sm font-semibold text-white" numberOfLines={1}>
              {addingToCart
                ? t('productDetail.adding')
                : !variantReady
                  ? t('productDetail.select_options')
                  : stockOut
                  ? t('productDetail.out_of_stock')
                  : t('productDetail.add_to_cart')}
            </Text>
          </Pressable>
        </View>
      </View>
    </AppLayout>
  );
}
