import { OptimizedImage } from "@/components/ui/optimized-image";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppLayout } from "@/components/layout/app-layout";
import { SiteSection } from "@/components/layout/site-container";
import { ProductMarketplaceGrid } from "@/components/marketplace/marketplace-grid";
import { CategoryCardFromHome } from "@/components/ui/category-card";
import { useAppTranslation, useLocalizedHref } from "@/i18n";
import { getThumbUrl } from "@/utils/image-thumbs";
import {
  type BlogPost,
  type HomeCategory,
  type HomeProduct,
  type HomeSeller,
  type LocalDeal,
  type SubscriptionPlan,
} from "@/utils/native-api";

export {
  CardSkeleton,
  EAGER_PRODUCT_ROWS,
  PRODUCT_CARD_CAROUSEL_CLASS,
  PRODUCT_CARD_GRID_CLASS,
  PRODUCT_CARD_ROW_CLASS,
  ProductListCard,
  ProductListRow,
  ProductListRowSkeleton,
} from "@/components/marketplace/product-list-cards";

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

function SellerStatusBadge({ seller }: { seller: HomeSeller }) {
  if (seller.verified) {
    return (
      <View className="self-start rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/30">
        <Text className="font-sans text-[11px] font-bold text-green-700 dark:text-green-300">
          Approved
        </Text>
      </View>
    );
  }

  return (
    <View className="self-start rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/30">
      <Text className="font-sans text-[11px] font-bold text-amber-700 dark:text-amber-300">
        Pending review
      </Text>
    </View>
  );
}

export function SellerListCard({ seller }: { seller: HomeSeller }) {
  const { t } = useAppTranslation();
  const href = useLocalizedHref();
  const rating = Number(seller.rating) || 0;
  const roundedRating = Math.floor(rating);
  const storeHref = href(`/sellers/${seller.slug || seller.id}`);

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
              </View>
            )}
            {seller.verified ? (
              <View className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 dark:bg-slate-900">
                <Feather name="check-circle" color="#22c55e" size={15} />
              </View>
            ) : null}
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

            <View className="mt-1">
              <SellerStatusBadge seller={seller} />
            </View>

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
