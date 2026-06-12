import {
  ProductImage,
  productGridImageTransition,
} from "@/components/ui/product-image";
import { OptimizedImage } from "@/components/ui/optimized-image";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useRouter, type Href } from "expo-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { AppLayout } from "@/components/layout/app-layout";
import { SiteSection } from "@/components/layout/site-container";
import { ProductMarketplaceGrid } from "@/components/marketplace/marketplace-grid";
import { CategoryCardFromHome } from "@/components/ui/category-card";
import { useIsProductInCompare } from "@/context/compare-products-context";
import { useNativeAuth } from "@/context/native-auth";
import { useWishlistProductState } from "@/context/wishlist-context";
import { localizeBilingualName, useAppTranslation } from "@/i18n";
import { hasUserRole } from "@/utils/auth-routing";
import { toggleCompareProduct } from "@/utils/compare-native";
import { getThumbUrl } from "@/utils/image-thumbs";
import {
  addProductToCart,
  getProductApiId,
  type BlogPost,
  type HomeCategory,
  type HomeProduct,
  type HomeSeller,
  type LocalDeal,
  type SubscriptionPlan,
} from "@/utils/native-api";
import { emitCartCountChanged } from "@/utils/native-cart-events";

const placeholderProduct = require("@/assets/images/placeholder-product.png");

/** Full width inside PRODUCT_LIST_GRID_CLASS — height grows with content. */
export const PRODUCT_CARD_GRID_CLASS = "w-full min-w-0";

export const PRODUCT_CARD_ROW_CLASS = "min-w-0 flex-1 self-stretch";

export const EAGER_PRODUCT_ROWS = 3;

export function ProductListRow({
  row,
  productColumns,
  rowIndex,
}: {
  row: HomeProduct[];
  productColumns: number;
  rowIndex: number;
}) {
  const emptySlots = Math.max(0, productColumns - row.length);
  const eagerRow = rowIndex < EAGER_PRODUCT_ROWS;

  return (
    <View className="product-list-row mb-3 flex-row items-stretch gap-3 sm:mb-4 sm:gap-4">
      {row.map((product) => (
        <ProductListCard
          key={String(product.id)}
          product={product}
          className={PRODUCT_CARD_ROW_CLASS}
          imagePriority={eagerRow}
        />
      ))}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <View
          key={`product-row-filler-${index}`}
          className={`${PRODUCT_CARD_ROW_CLASS} opacity-0`}
          pointerEvents="none"
        />
      ))}
    </View>
  );
}

export function ProductListRowSkeleton({
  productColumns,
}: {
  productColumns: number;
}) {
  return (
    <View className="product-list-row mb-3 flex-row items-stretch gap-3 sm:mb-4 sm:gap-4">
      {Array.from({ length: productColumns }).map((_, index) => (
        <CardSkeleton
          key={`product-row-skeleton-${index}`}
          className={PRODUCT_CARD_ROW_CLASS}
        />
      ))}
    </View>
  );
}

export const PRODUCT_CARD_CAROUSEL_CLASS = "w-44 flex-shrink-0 sm:w-48 lg:w-52";

function Stars({ rating, count }: { rating: string; count?: number }) {
  const numericRating = Number(rating) || 0;
  const filled = Math.round(numericRating);

  return (
    <View className="flex-row items-center gap-1">
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Feather
            key={star}
            name="star"
            color={star <= filled ? "#f59e0b" : "#e5e7eb"}
            size={12}
          />
        ))}
      </View>
      {numericRating > 0 || Number(count) > 0 ? (
        <Text className="font-sans text-[10px] leading-none text-gray-400 dark:text-slate-500">
          {numericRating > 0 ? numericRating.toFixed(1) : ""}
          {Number(count) > 0 ? ` (${count})` : ""}
        </Text>
      ) : null}
    </View>
  );
}

type MarketplaceListScreenProps<T> = {
  title: string;
  description: string;
  emptyMessage: string;
  fetchItems: (signal?: AbortSignal) => Promise<T[]>;
  renderItem: (item: T, index: number) => React.ReactNode;
  skeletonCount?: number;
};

export function MarketplaceListScreen<T>({
  title,
  description,
  emptyMessage,
  fetchItems,
  renderItem,
  skeletonCount = 8,
}: MarketplaceListScreenProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchItemsRef = useRef(fetchItems);

  useEffect(() => {
    fetchItemsRef.current = fetchItems;
  }, [fetchItems]);

  useEffect(() => {
    const controller = new AbortController();

    fetchItemsRef
      .current(controller.signal)
      .then((nextItems) => {
        setItems(nextItems);
        setError("");
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        console.error(`Failed to fetch ${title}:`, fetchError);
        setItems([]);
        setError(emptyMessage);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [emptyMessage, title]);

  return (
    <AppLayout>
      <SiteSection className="bg-gray-50 py-10 dark:bg-slate-950">
        <View className="mb-8">
          <Text className="font-sans text-3xl font-black text-gray-950 dark:text-slate-100 sm:text-4xl">
            {title}
          </Text>
          <Text className="mt-3 max-w-3xl font-sans text-base leading-7 text-gray-600 dark:text-slate-400">
            {description}
          </Text>
        </View>

        {!loading && items.length === 0 ? (
          <View className="w-full rounded-2xl border border-gray-100 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <Text className="text-center font-sans text-base text-gray-500 dark:text-slate-400">
              {error || emptyMessage}
            </Text>
          </View>
        ) : (
          <ProductMarketplaceGrid
            products={items as HomeProduct[]}
            loading={loading}
            skeletonCount={skeletonCount}
            imagePriorityCount={4}
          />
        )}
      </SiteSection>
    </AppLayout>
  );
}

export function CardSkeleton({
  className = PRODUCT_CARD_GRID_CLASS,
}: {
  className?: string;
}) {
  return (
    <View
      className={`${className} min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800`}
    >
      <View className="aspect-square w-full bg-gray-200 dark:bg-slate-800" />
      <View className="gap-1.5 px-2.5 py-2.5 sm:px-3">
        <View className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-800" />
        <View className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
        <View className="mt-1 h-3 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
        <View className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700">
          <View className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
        </View>
        <View className="mt-2 flex-row gap-1.5">
          <View className="h-8 flex-1 rounded-lg bg-gray-200 dark:bg-slate-800" />
          <View className="h-8 flex-1 rounded-lg bg-gray-200 dark:bg-slate-800" />
        </View>
      </View>
    </View>
  );
}

function ProductListCardComponent({
  product,
  className = PRODUCT_CARD_GRID_CLASS,
  imagePriority = false,
}: {
  product: HomeProduct;
  className?: string;
  imagePriority?: boolean;
}) {
  const { t, language } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useNativeAuth();
  const { saved, toggleWishlist } = useWishlistProductState(product);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const productHref = `/products/${product.slug || product.id}` as Href;
  const compared = useIsProductInCompare(product);
  const productName = localizeBilingualName(
    language,
    product.nameEn,
    product.nameMm,
    product.name,
  );
  const categoryLabel = localizeBilingualName(
    language,
    product.categoryNameEn,
    product.categoryNameMm,
    product.categoryName,
  );
  const resolvedImageSource = useMemo(() => {
    const uri = getThumbUrl(product.imageUrl, 480);
    if (uri) return { uri };
    return placeholderProduct;
  }, [product.imageUrl]);

  const nameLineHeight = Platform.OS === "android" ? 20 : 18;

  const handleWishlistPress = async () => {
    if (wishlistBusy) return;

    if (!isAuthenticated) {
      router.push(
        `/login?returnTo=${encodeURIComponent(String(productHref))}` as Href,
      );
      return;
    }

    if (!hasUserRole(user, "buyer")) return;

    setWishlistBusy(true);
    try {
      await toggleWishlist();
    } catch {
      // Wishlist errors are surfaced on detail pages; cards stay silent.
    } finally {
      setWishlistBusy(false);
    }
  };

  const handleAddToCart = async () => {
    if (product.hasVariants) {
      router.push(productHref);
      return;
    }

    if (!isAuthenticated) {
      router.push(
        `/login?returnTo=${encodeURIComponent(String(productHref))}` as Href,
      );
      return;
    }

    if (!hasUserRole(user, "buyer") || cartBusy) return;

    setCartBusy(true);
    try {
      const quantity = Math.max(product.moq ?? 1, 1);
      const result = await addProductToCart(getProductApiId(product), quantity);
      emitCartCountChanged({ cart: result.cart });
    } catch {
      // Keep cards quiet; users can retry from product detail.
    } finally {
      setCartBusy(false);
    }
  };

  return (
    <View
      className={`${className} flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm shadow-gray-200/70 dark:border-gray-700 dark:bg-gray-800 dark:shadow-slate-950/40`}
    >
      <View className="relative w-full flex-shrink-0">
        <Link href={productHref} asChild>
          <Pressable className="aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
            <ProductImage
              source={resolvedImageSource ?? undefined}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              brandSize="sm"
              loading={imagePriority ? "eager" : "lazy"}
              priority={imagePriority ? "high" : "normal"}
              recyclingKey={String(product.productId ?? product.id)}
              transition={productGridImageTransition(imagePriority)}
            />
            <View className="absolute left-2 top-2 z-10 gap-1">
              {product.discountPct && product.discountPct > 0 ? (
                <View className="self-start rounded-full bg-red-500 px-2 py-0.5 shadow-sm">
                  <Text className="text-[10px] font-black text-white">
                    -{product.discountPct}%
                  </Text>
                </View>
              ) : null}
              {product.isNew ? (
                <View className="self-start rounded-full bg-green-500 px-2 py-0.5 shadow-sm">
                  <Text className="text-[10px] font-black text-white">
                    {t("productCard.new_badge")}
                  </Text>
                </View>
              ) : null}
            </View>
            {categoryLabel ? (
              <View className="absolute bottom-2 left-2 z-10 max-w-[82%] rounded-full bg-white/80 px-2 py-0.5 dark:bg-gray-900/75">
                <Text
                  className="font-sans text-[10px] font-medium text-gray-700 dark:text-gray-200"
                  numberOfLines={1}
                >
                  {categoryLabel}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
        <Pressable
          onPress={() => void handleWishlistPress()}
          disabled={wishlistBusy}
          accessibilityLabel={
            saved
              ? t("productDetail.remove_from_wishlist")
              : t("productDetail.add_to_wishlist")
          }
          className="absolute right-2 top-2 z-20 h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-gray-900/85"
        >
          <Feather
            name="heart"
            color={saved ? "#ef4444" : "#9ca3af"}
            size={16}
          />
        </Pressable>
      </View>
      <View className="mt-1.5 flex-1 flex-col px-2.5 pb-2.5 pt-1.5 sm:px-3">
        <Link href={productHref} asChild>
          <Pressable className="shrink-0">
            <Text
              className="font-sans text-[12px] font-semibold text-gray-900 dark:text-gray-100 sm:text-[13px]"
              numberOfLines={2}
              style={{
                lineHeight: nameLineHeight,
                minHeight: nameLineHeight * 2,
                ...(Platform.OS === "android"
                  ? { includeFontPadding: false }
                  : null),
              }}
            >
              {productName}
            </Text>
          </Pressable>
        </Link>
        <View className="mt-0.5 h-3.5 justify-center">
          <Stars rating={product.rating} count={product.reviewCount} />
        </View>
        {product.seller ? (
          <View className="mt-0.5 min-h-[14px] justify-center">
            <Text
              className="font-sans text-[11px] font-medium leading-4 text-gray-600 dark:text-slate-300"
              numberOfLines={1}
            >
              {t("productCard.by_seller", { name: product.seller })}
            </Text>
          </View>
        ) : (
          <View className="min-h-[14px]" />
        )}
        <View className="mt-auto border-t border-gray-100 pt-1.5 dark:border-gray-700">
          <View className="flex-row items-center justify-between gap-1.5">
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <Text
                className={`font-sans text-[12px] font-bold leading-tight sm:text-[13px] ${
                  product.discountPct && product.discountPct > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-700 dark:text-green-400"
                }`}
                numberOfLines={1}
              >
                {product.price}
              </Text>
              {product.originalPrice ? (
                <Text
                  className="font-sans text-[10px] leading-tight text-gray-400 line-through dark:text-slate-500 sm:text-[11px]"
                  numberOfLines={1}
                >
                  {product.originalPrice}
                </Text>
              ) : null}
            </View>
            {product.moq && product.moq > 1 ? (
              <View className="max-w-[44%] flex-shrink-0 rounded-md border border-gray-200 bg-gray-100 px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-700">
                <Text
                  className="font-sans text-[10px] font-medium text-gray-600 dark:text-slate-300"
                  numberOfLines={1}
                >
                  {t("productCard.moq", { count: product.moq })}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="mt-1.5 flex-row gap-1.5">
            <Pressable
              onPress={() => {
                toggleCompareProduct(product);
              }}
              className={`h-8 min-w-0 flex-1 items-center justify-center rounded-lg border px-1 ${
                compared
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <Text
                numberOfLines={1}
                className={`text-center font-sans text-[10px] font-semibold sm:text-[11px] ${
                  compared
                    ? "text-indigo-700 dark:text-indigo-300"
                    : "text-gray-700 dark:text-slate-300"
                }`}
              >
                {compared
                  ? t("productCard.added_to_compare")
                  : t("productCard.add_to_compare")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handleAddToCart()}
              disabled={cartBusy}
              className={`h-8 min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-lg px-1.5 ${
                product.hasVariants
                  ? "border border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30"
                  : "bg-green-600"
              } ${cartBusy ? "opacity-70" : ""}`}
            >
              <Feather
                name={product.hasVariants ? "sliders" : "shopping-cart"}
                color={product.hasVariants ? "#2563eb" : "#ffffff"}
                size={12}
              />
              <Text
                className={`min-w-0 flex-1 text-center font-sans text-[10px] font-semibold sm:text-[11px] ${
                  product.hasVariants
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-white"
                }`}
                numberOfLines={1}
              >
                {cartBusy
                  ? t("productCard.adding_to_cart", {
                      defaultValue: "Adding...",
                    })
                  : product.hasVariants
                    ? t("productCard.select_options")
                    : t("productCard.add_to_cart")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export const ProductListCard = memo(
  ProductListCardComponent,
  (previous, next) =>
    previous.product.id === next.product.id &&
    previous.product.price === next.product.price &&
    previous.product.imageUrl === next.product.imageUrl &&
    previous.className === next.className &&
    previous.imagePriority === next.imagePriority,
);

export function CategoryListCard({ category }: { category: HomeCategory }) {
  const { language } = useAppTranslation();

  return (
    <CategoryCardFromHome
      category={category}
      language={language}
      className="w-full min-w-0"
    />
  );
}

export function SellerListCard({ seller }: { seller: HomeSeller }) {
  const { t } = useAppTranslation();
  const rating = Number(seller.rating) || 0;
  const roundedRating = Math.floor(rating);
  const storeHref = `/sellers/${seller.slug || seller.id}` as Href;

  return (
    <View className="w-[48%] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md shadow-gray-200/70 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50 sm:w-[48%] lg:w-[23%]">
      <View className="p-3 sm:p-4">
        <View className="flex-row items-start gap-2 sm:gap-3">
          <View className="relative flex-shrink-0">
            {seller.imageUrl ? (
              <OptimizedImage
                source={{ uri: getThumbUrl(seller.imageUrl, 160) }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
                contentFit="cover"
                className="border-2 border-gray-200 dark:border-slate-600"
              />
            ) : (
              <View className="relative h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-100 dark:border-slate-500 dark:bg-slate-700 sm:h-16 sm:w-16">
                <Text className="font-sans text-base font-semibold text-gray-500 dark:text-slate-400 sm:text-lg">
                  {seller.name.charAt(0).toUpperCase()}
                </Text>
                {seller.verified ? (
                  <View className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 dark:bg-slate-900">
                    <Feather name="check-circle" color="#22c55e" size={15} />
                  </View>
                ) : null}
              </View>
            )}
          </View>

          <View className="min-w-0 flex-1">
            <Link href={storeHref} asChild>
              <Pressable>
                <Text
                  className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100 sm:text-lg"
                  numberOfLines={1}
                >
                  {seller.name}
                </Text>
              </Pressable>
            </Link>

            <View className="mt-1 gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
              <View className="max-w-[120px] self-start rounded bg-blue-100 px-1.5 py-0.5 dark:bg-blue-900/30 sm:max-w-none sm:px-2">
                <Text
                  className="font-sans text-xs font-medium text-blue-800 dark:text-blue-400"
                  numberOfLines={1}
                >
                  {seller.type}
                </Text>
              </View>
              <Text
                className="font-sans text-xs text-gray-500 dark:text-slate-400"
                numberOfLines={1}
              >
                {seller.city}
              </Text>
            </View>

            <View className="mt-1 flex-row items-center sm:mt-2">
              <View className="flex-row items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesome
                    key={star}
                    name="star"
                    color={
                      rating > 0 && star <= roundedRating
                        ? "#facc15"
                        : "#d1d5db"
                    }
                    size={13}
                  />
                ))}
                {rating > 0 ? (
                  <Text className="ml-1 font-sans text-xs font-medium text-gray-900 dark:text-slate-100 sm:text-sm">
                    {rating.toFixed(1)}
                  </Text>
                ) : (
                  <Text className="ml-1 font-sans text-xs text-gray-500 dark:text-slate-400 sm:text-sm">
                    No ratings
                  </Text>
                )}
              </View>
              {seller.reviews > 0 ? (
                <>
                  <Text className="mx-1 font-sans text-gray-300 dark:text-slate-600 sm:mx-2">
                    •
                  </Text>
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400 sm:text-sm">
                    {seller.reviews}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row gap-2 sm:mt-4">
          <View className="flex-1 rounded-lg border border-green-100 bg-green-50 p-1.5 dark:border-green-800 dark:bg-green-900/30 sm:p-2">
            <Text className="text-center font-sans text-base font-semibold text-green-700 dark:text-green-400 sm:text-lg">
              {seller.products}
            </Text>
            <Text className="text-center font-sans text-xs text-green-600 dark:text-green-400">
              Products
            </Text>
          </View>
          <View className="flex-1 rounded-lg border border-blue-100 bg-blue-50 p-1.5 dark:border-blue-800 dark:bg-blue-900/30 sm:p-2">
            <Text className="text-center font-sans text-base font-semibold text-blue-700 dark:text-blue-400 sm:text-lg">
              {seller.reviews}
            </Text>
            <Text className="text-center font-sans text-xs text-blue-600 dark:text-blue-400">
              Reviews
            </Text>
          </View>
        </View>

        <Link href={storeHref} asChild>
          <Pressable className="mt-3 rounded-lg bg-green-600 px-3 py-2 shadow-sm sm:mt-4 sm:px-4">
            <Text className="text-center font-sans text-sm font-medium text-white sm:text-base">
              {t("seller.view_store", { defaultValue: "View Store" })}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

export function LocalDealCard({ deal }: { deal: LocalDeal }) {
  return (
    <View className="w-[48%] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:w-[31%] lg:w-[23%]">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
        <Feather name="tag" color="#047857" size={24} />
      </View>
      <Text className="text-base font-black text-gray-950" numberOfLines={2}>
        {deal.name}
      </Text>
      <Text className="mt-2 text-xl font-black text-green-700">
        {deal.discount}
      </Text>
      <View className="mt-3 rounded-xl border border-dashed border-green-300 bg-green-50 px-3 py-2">
        <Text className="text-center text-sm font-black tracking-widest text-green-800">
          {deal.code}
        </Text>
      </View>
      <Text className="mt-3 text-sm font-bold text-gray-700" numberOfLines={1}>
        {deal.seller}
      </Text>
      <View className="mt-2 gap-1">
        <InfoLine icon="map-pin" text={deal.location} />
        <InfoLine icon="shopping-bag" text={`Min. ${deal.minimumOrder}`} />
        <InfoLine icon="calendar" text={`Expires ${deal.expiresAt}`} />
      </View>
    </View>
  );
}

export function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <View className="w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:w-[48%] lg:w-[31%]">
      <View className="aspect-[16/9] bg-gray-100">
        {post.imageUrl ? (
          <OptimizedImage
            source={{ uri: getThumbUrl(post.imageUrl, 480) }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-green-50">
            <Feather name="book-open" color="#15803d" size={34} />
          </View>
        )}
      </View>
      <View className="gap-2 p-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <View className="rounded-full bg-green-50 px-3 py-1">
            <Text className="text-xs font-bold text-green-700">
              {post.category}
            </Text>
          </View>
          {post.featured ? (
            <View className="rounded-full bg-amber-50 px-3 py-1">
              <Text className="text-xs font-bold text-amber-700">Featured</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-lg font-black text-gray-950" numberOfLines={2}>
          {post.title}
        </Text>
        <Text className="text-sm leading-6 text-gray-600" numberOfLines={3}>
          {post.excerpt}
        </Text>
        <Text className="mt-1 text-xs font-bold text-gray-500">
          {post.author} - {post.publishedAt}
        </Text>
      </View>
    </View>
  );
}

export function SubscriptionPlanCard({ plan }: { plan: SubscriptionPlan }) {
  const { t } = useAppTranslation();

  return (
    <View
      className={`w-full rounded-2xl border bg-white p-5 shadow-sm sm:w-[48%] lg:w-[31%] ${
        plan.highlighted ? "border-green-500" : "border-gray-100"
      }`}
    >
      {plan.highlighted ? (
        <View className="mb-4 self-start rounded-full bg-green-600 px-3 py-1">
          <Text className="text-xs font-black text-white">POPULAR</Text>
        </View>
      ) : null}
      <Text className="text-2xl font-black text-gray-950">{plan.name}</Text>
      <Text className="mt-2 min-h-12 text-sm leading-6 text-gray-600">
        {plan.description}
      </Text>
      <View className="my-5">
        <Text className="text-3xl font-black text-green-700">{plan.price}</Text>
        <Text className="mt-1 text-sm text-gray-500">
          per {plan.billingCycle}
        </Text>
      </View>
      <View className="gap-2">
        {plan.features.map((feature) => (
          <View key={feature} className="flex-row items-center gap-2">
            <Feather name="check-circle" color="#15803d" size={15} />
            <Text className="flex-1 text-sm font-semibold text-gray-700">
              {feature}
            </Text>
          </View>
        ))}
      </View>
      <Pressable className="mt-6 rounded-xl bg-green-600 px-4 py-3">
        <Text className="text-center text-sm font-black text-white">
          {t("pricing.choose_plan", { defaultValue: "Choose Plan" })}
        </Text>
      </Pressable>
    </View>
  );
}

function InfoLine({
  icon,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Feather name={icon} color="#6b7280" size={12} />
      <Text className="flex-1 text-xs text-gray-500" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
