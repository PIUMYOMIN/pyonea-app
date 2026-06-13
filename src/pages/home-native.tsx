import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import {
  HOME_PRODUCT_GRID_CLASS,
  HOME_SELLER_GRID_CLASS,
  HOME_VALUE_GRID_CLASS,
  SITE_CONTAINER_CLASS,
} from '@/constants/layout';
import {
  CategoryMarketplaceGrid,
  chunkMarketplaceItems,
  isMarketplaceWeb,
  MarketplaceGridRow,
  ProductMarketplaceGrid,
  useSellerGridColumns,
} from '@/components/marketplace/marketplace-grid';
import { LocalDealCard } from '@/components/marketplace-list-screen';
import {
  CategoryCardFromHome,
  CategoryCardSkeleton,
} from '@/components/ui/category-card';
import { useNativeAuth } from '@/context/native-auth';
import { useAppTranslation, useLocalizedHref } from '@/i18n';
import { hasUserRole } from '@/utils/auth-routing';
import {
  fetchFeaturedProducts,
  fetchHomeCategories,
  fetchLocalDeals,
  fetchTopSellers,
  isAbortError,
  type HomeCategory,
  type HomeProduct,
  type HomeSeller,
  type LocalDeal,
} from '@/utils/native-api';
import { getThumbUrl } from '@/utils/image-thumbs';
import { getScreenCache, setScreenCache } from '@/utils/screen-cache';

const HOME_CACHE_KEY = 'home-feed';
const HOME_CACHE_TTL_MS = 2 * 60 * 1000;

type HomeFeedCache = {
  categories: HomeCategory[];
  products: HomeProduct[];
  sellers: HomeSeller[];
  deals: LocalDeal[];
};

const HOME_FEATURED_LIMIT = isMarketplaceWeb ? 20 : 40;
const HOME_SELLER_LIMIT = isMarketplaceWeb ? 4 : 6;
const HOME_DEAL_PREVIEW_COUNT = 4;

type FeatherIconName = ComponentProps<typeof Feather>['name'];

type QuickLink = {
  href: Href;
  labelKey: string;
  icon: FeatherIconName;
};

const values = [
  {
    titleKey: 'home.secure_payments',
    descriptionKey: 'home.secure_payments_desc',
    icon: 'shield',
  },
  {
    titleKey: 'home.business_specific',
    descriptionKey: 'home.business_specific_desc',
    icon: 'briefcase',
  },
  {
    titleKey: 'home.fast_transactions',
    descriptionKey: 'home.fast_transactions_desc',
    icon: 'zap',
  },
  {
    titleKey: 'home.support',
    descriptionKey: 'home.support_desc',
    icon: 'message-circle',
  },
] satisfies {
  titleKey: string;
  descriptionKey: string;
  icon: FeatherIconName;
}[];

const placeholderProduct = require('@/assets/images/placeholder-product.png');

type LoadingState = {
  categories: boolean;
  products: boolean;
  sellers: boolean;
};

type HomeErrorState = {
  categories?: string;
  products?: string;
  sellers?: string;
};

function QuickAccessRow({ links }: { links: QuickLink[] }) {
  const { t } = useAppTranslation();
  const href = useLocalizedHref();

  return (
    <View className="flex-row flex-wrap gap-2">
      {links.map((link) => (
        <Link key={String(link.href)} href={href(String(link.href))} asChild>
          <Pressable className="min-w-[47%] flex-1 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <Feather name={link.icon} color="#16a34a" size={18} />
            </View>
            <Text className="flex-1 font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
              {t(link.labelKey)}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

function ArrowLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-row items-center gap-1">
        <Text className="font-sans text-sm font-bold text-green-600 dark:text-green-300 md:text-base">{label}</Text>
        <Feather name="arrow-right" color="#16a34a" size={16} />
      </Pressable>
    </Link>
  );
}

function SectionShell({
  children,
  tone = 'white',
}: {
  children: ReactNode;
  tone?: 'white' | 'muted' | 'green';
}) {
  const toneClass =
    tone === 'muted'
      ? 'bg-gray-50 dark:bg-gray-800/50'
      : tone === 'green'
        ? 'bg-gradient-to-r from-green-50 to-emerald-100 dark:from-gray-800 dark:to-gray-800'
        : 'bg-white dark:bg-gray-900';

  return (
    <View className={`${toneClass} min-w-0 py-10 sm:py-12`}>
      <View className={`${SITE_CONTAINER_CLASS} min-w-0`}>{children}</View>
    </View>
  );
}

function SellerCard({ seller }: { seller: HomeSeller }) {
  const { t } = useAppTranslation();
  const href = useLocalizedHref();
  const rating = Number(seller.rating) || 0;
  const roundedRating = Math.floor(rating);
  const storeHref = href(`/sellers/${seller.slug || seller.id}`);

  return (
    <View className="w-full overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md shadow-gray-200/70 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
      <View className="p-3 sm:p-4">
        <View className="flex-row items-start gap-2 sm:gap-3">
          <View className="relative flex-shrink-0">
            {seller.imageUrl ? (
              <Image
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
                  numberOfLines={1}>
                  {seller.name}
                </Text>
              </Pressable>
            </Link>

            <View className="mt-1 gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
              <View className="max-w-[120px] self-start rounded bg-blue-100 px-1.5 py-0.5 dark:bg-blue-900/30 sm:max-w-none sm:px-2">
                <Text className="font-sans text-xs font-medium text-blue-800 dark:text-blue-400" numberOfLines={1}>
                  {seller.type}
                </Text>
              </View>
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
                {seller.city}
              </Text>
            </View>

            <View className="mt-1 flex-row items-center sm:mt-2">
              <View className="flex-row items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesome
                    key={star}
                    name="star"
                    color={rating > 0 && star <= roundedRating ? '#facc15' : '#d1d5db'}
                    size={13}
                  />
                ))}
                {rating > 0 ? (
                  <Text className="ml-1 font-sans text-xs font-medium text-gray-900 dark:text-slate-100 sm:text-sm">
                    {rating.toFixed(1)}
                  </Text>
                ) : (
                  <Text className="ml-1 font-sans text-xs text-gray-500 dark:text-slate-400 sm:text-sm">
                    {t('sellers.no_ratings')}
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
              {t('sellers.products_label')}
            </Text>
          </View>
          <View className="flex-1 rounded-lg border border-blue-100 bg-blue-50 p-1.5 dark:border-blue-800 dark:bg-blue-900/30 sm:p-2">
            <Text className="text-center font-sans text-base font-semibold text-blue-700 dark:text-blue-400 sm:text-lg">
              {seller.reviews}
            </Text>
            <Text className="text-center font-sans text-xs text-blue-600 dark:text-blue-400">
              {t('sellers.reviews_label')}
            </Text>
          </View>
        </View>

        <Link href={storeHref} asChild>
          <Pressable className="mt-3 rounded-lg bg-green-600 px-3 py-2 shadow-sm sm:mt-4 sm:px-4">
            <Text className="text-center font-sans text-sm font-medium text-white sm:text-base">
              {t('sellers.view_store')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function ValueItem({ value }: { value: (typeof values)[number] }) {
  const { t } = useAppTranslation();

  return (
    <View className="flex-row gap-4">
      <View className="h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-green-500">
        <Feather name={value.icon} color="#ffffff" size={23} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100 sm:text-lg">{t(value.titleKey)}</Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400 sm:text-base">
          {t(value.descriptionKey)}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View className="w-full items-center justify-center py-10 sm:py-12">
      <Text className="text-center font-sans text-base text-gray-500 dark:text-slate-400 sm:text-lg">{message}</Text>
    </View>
  );
}

function SellerCardSkeleton() {
  return (
    <View className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <View className="aspect-square bg-gray-200 dark:bg-slate-800" />
      <View className="gap-1.5 p-3">
        <View className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-800" />
        <View className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
        <View className="mt-1 h-8 rounded-lg bg-gray-200 dark:bg-slate-800" />
      </View>
    </View>
  );
}

export default function HomeNative() {
  const { t, language } = useAppTranslation();
  const href = useLocalizedHref();
  const { user, isAuthenticated } = useNativeAuth();
  const { width } = useWindowDimensions();
  const sellerColumns = useSellerGridColumns();
  const valueColumns = width >= 768 ? 2 : 1;
  // Snapshot the cache once per mount; reading it on every render would change
  // the reference after the fetch writes the cache and retrigger the effect.
  const [cachedFeed] = useState(() =>
    getScreenCache<HomeFeedCache>(HOME_CACHE_KEY, HOME_CACHE_TTL_MS),
  );
  const tRef = useRef(t);
  const [categories, setCategories] = useState<HomeCategory[]>(cachedFeed?.categories ?? []);
  const [products, setProducts] = useState<HomeProduct[]>(cachedFeed?.products ?? []);
  const [sellers, setSellers] = useState<HomeSeller[]>(cachedFeed?.sellers ?? []);
  const [deals, setDeals] = useState<LocalDeal[]>(cachedFeed?.deals ?? []);
  const [loading, setLoading] = useState<LoadingState>({
    categories: !cachedFeed,
    products: !cachedFeed,
    sellers: !cachedFeed,
  });
  const [dealsLoading, setDealsLoading] = useState(!cachedFeed && Platform.OS !== 'web');
  const [errors, setErrors] = useState<HomeErrorState>({});
  const quickLinks = useMemo<QuickLink[]>(
    () => [
      { href: '/local-deals', labelKey: 'home.quick_local_deals', icon: 'tag' },
      { href: '/track-order', labelKey: 'home.quick_track_order', icon: 'package' },
      { href: '/compare', labelKey: 'home.quick_compare', icon: 'shuffle' },
      { href: '/sellers', labelKey: 'home.quick_sellers', icon: 'users' },
    ],
    [],
  );
  const isSeller = hasUserRole(user, 'seller');
  const isBuyer = hasUserRole(user, 'buyer');
  const isAdmin = hasUserRole(user, 'admin');
  const ctaHref = href(
    !isAuthenticated
      ? '/register'
      : isSeller
        ? '/seller/dashboard'
        : isBuyer
          ? '/products'
          : isAdmin
            ? '/admin/dashboard'
            : '/register',
  );
  const ctaLabel = !isAuthenticated
    ? t('home.become_seller')
    : isSeller
      ? t('home.sell_now')
      : isBuyer
        ? t('home.shop_now')
        : isAdmin
          ? t('home.dashboard')
          : t('home.get_started');

  useEffect(() => {
    tRef.current = t;
  });

  useEffect(() => {
    const controller = new AbortController();
    const t = tRef.current;
    const hasCachedFeed = Boolean(cachedFeed);
    let nextCategories: HomeCategory[] | null = null;
    let nextProducts: HomeProduct[] | null = null;
    let nextSellers: HomeSeller[] | null = null;

    const categoriesPromise = fetchHomeCategories(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        nextCategories = result;
        setCategories(result);
        setLoading((current) => ({ ...current, categories: false }));
        setErrors((current) => ({ ...current, categories: undefined }));
      })
      .catch((error) => {
        if (isAbortError(error, controller.signal)) return;
        console.error('Failed to fetch home categories:', error);
        if (!hasCachedFeed) {
          setCategories([]);
          setErrors((current) => ({ ...current, categories: t('home.no_categories_found') }));
        }
        setLoading((current) => ({ ...current, categories: false }));
      });

    const productsPromise = fetchFeaturedProducts(controller.signal, HOME_FEATURED_LIMIT)
      .then((result) => {
        if (controller.signal.aborted) return;
        nextProducts = result;
        setProducts(result);
        setLoading((current) => ({ ...current, products: false }));
        setErrors((current) => ({ ...current, products: undefined }));
      })
      .catch((error) => {
        if (isAbortError(error, controller.signal)) return;
        console.error('Failed to fetch featured products:', error);
        if (!hasCachedFeed) {
          setProducts([]);
          setErrors((current) => ({ ...current, products: t('home.no_featured_products') }));
        }
        setLoading((current) => ({ ...current, products: false }));
      });

    const sellersPromise = fetchTopSellers(controller.signal, HOME_SELLER_LIMIT)
      .then((result) => {
        if (controller.signal.aborted) return;
        nextSellers = result;
        setSellers(result);
        setLoading((current) => ({ ...current, sellers: false }));
        setErrors((current) => ({ ...current, sellers: undefined }));
      })
      .catch((error) => {
        if (isAbortError(error, controller.signal)) return;
        console.error('Failed to fetch top sellers:', error);
        if (!hasCachedFeed) {
          setSellers([]);
          setErrors((current) => ({ ...current, sellers: t('home.no_top_sellers') }));
        }
        setLoading((current) => ({ ...current, sellers: false }));
      });

    const dealsPromise =
      Platform.OS === 'web'
        ? Promise.resolve(null)
        : fetchLocalDeals(controller.signal)
            .then((result) => {
              if (controller.signal.aborted) return null;
              const preview = result.slice(0, HOME_DEAL_PREVIEW_COUNT);
              setDeals(preview);
              setDealsLoading(false);
              return preview;
            })
            .catch((error) => {
              if (isAbortError(error, controller.signal)) return null;
              console.error('Failed to fetch local deals:', error);
              setDeals([]);
              setDealsLoading(false);
              return [] as LocalDeal[];
            });

    void Promise.all([categoriesPromise, productsPromise, sellersPromise, dealsPromise]).then(
      ([, , , nextDeals]) => {
        if (controller.signal.aborted || !nextCategories || !nextProducts || !nextSellers) return;

        setScreenCache<HomeFeedCache>(HOME_CACHE_KEY, {
          categories: nextCategories,
          products: nextProducts,
          sellers: nextSellers,
          deals: nextDeals ?? [],
        });
        setScreenCache('home-feed:products', nextProducts);
        setScreenCache('home-feed:categories', nextCategories);
      },
    );

    return () => controller.abort();
    // Fetch once per mount; cachedFeed is a mount-time snapshot.
  }, [cachedFeed]);

  const sellerRows = useMemo(
    () => chunkMarketplaceItems(sellers, sellerColumns),
    [sellerColumns, sellers],
  );
  const valueRows = useMemo(
    () => chunkMarketplaceItems(values, valueColumns),
    [valueColumns],
  );

  return (
    <AppLayout>
      <View className="bg-gray-50 dark:bg-gray-900">
        <View className="relative bg-gradient-to-r from-green-600 to-emerald-700">
          <View className="absolute inset-0 bg-gray-950 opacity-40" />
          <View className={`relative ${SITE_CONTAINER_CLASS} py-16 sm:py-24 md:py-32`}>
            <View className="items-center">
              <Text className="max-w-5xl text-center font-sans text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                {t('home.hero_title')}
              </Text>
              <Text className="mt-3 max-w-3xl px-4 text-center font-sans text-sm leading-6 text-green-100 sm:mt-6 sm:text-lg md:text-xl">
                {t('home.hero_subtitle')}
              </Text>
              <View className="mt-8 w-full flex-col gap-4 sm:mt-10 sm:flex-row sm:justify-center">
                <Link href={ctaHref} asChild>
                  <Pressable className="w-full items-center justify-center rounded-md bg-white px-6 py-3 shadow-sm sm:w-auto sm:px-8 md:py-4">
                    <Text className="font-sans text-sm font-medium text-green-700 sm:text-base md:text-lg">
                      {ctaLabel}
                    </Text>
                  </Pressable>
                </Link>
                <Link href={href('/products')} asChild>
                  <Pressable className="w-full items-center justify-center rounded-md bg-green-900/60 px-6 py-3 shadow-sm sm:w-auto sm:px-8 md:py-4">
                    <Text className="font-sans text-sm font-medium text-white sm:text-base md:text-lg">
                      {t('home.browse_products')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
              {isAuthenticated && isBuyer ? (
                <Link href={href('/register-seller')} asChild>
                  <Pressable className="mt-4">
                    <Text className="text-center font-sans text-sm font-semibold text-white sm:text-base">
                      {t('home.become_seller_link')} →
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          </View>
        </View>

        {!isMarketplaceWeb ? (
          <SectionShell tone="muted">
            <Text className="font-sans text-lg font-black text-gray-950 dark:text-slate-100">
              {t('home.quick_access', { defaultValue: 'Explore the app' })}
            </Text>
            <View className="mt-4">
              <QuickAccessRow links={quickLinks} />
            </View>
          </SectionShell>
        ) : null}

        <SectionShell>
          <View className="items-center">
            <Text className="text-center font-sans text-xl font-black text-gray-950 dark:text-slate-100 sm:text-2xl md:text-3xl">
              {t('home.popular_categories')}
            </Text>
            <View className="mt-2">
              <ArrowLink href={href('/categories')} label={t('home.browse_all_categories')} />
            </View>
          </View>
          <View className="mt-8 sm:mt-10">
            {loading.categories ? (
              <CategoryMarketplaceGrid
                items={[]}
                loading
                keyExtractor={() => 'skeleton'}
                renderItem={() => null}
              />
            ) : categories.length > 0 ? (
              <CategoryMarketplaceGrid
                items={categories}
                keyExtractor={(category) => String(category.id)}
                renderItem={(category, index) => (
                  <CategoryCardFromHome
                    category={category}
                    language={language}
                    priority={index < 2}
                    className="w-full min-w-0"
                  />
                )}
              />
            ) : (
              <EmptyState message={errors.categories || t('home.no_categories_found')} />
            )}
          </View>
        </SectionShell>

        {!isMarketplaceWeb ? (
          <SectionShell>
            <View className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <Text className="font-sans text-xl font-black text-gray-950 dark:text-slate-100 sm:text-2xl md:text-3xl">
                {t('home.local_deals', { defaultValue: 'Local Deals' })}
              </Text>
              <ArrowLink href={href('/local-deals')} label={t('home.view_all')} />
            </View>
            <View className="mt-8 sm:mt-10">
              {dealsLoading ? (
                <View className="items-center py-10">
                  <ActivityIndicator color="#16a34a" />
                </View>
              ) : deals.length > 0 ? (
                <View className="flex-row flex-wrap justify-between gap-y-4">
                  {deals.map((deal) => (
                    <LocalDealCard key={String(deal.id)} deal={deal} />
                  ))}
                </View>
              ) : (
                <EmptyState message={t('localDeals.empty', { defaultValue: 'No deals available right now.' })} />
              )}
            </View>
          </SectionShell>
        ) : null}

        <SectionShell tone="muted">
          <View className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <Text className="font-sans text-xl font-black text-gray-950 dark:text-slate-100 sm:text-2xl md:text-3xl">
              {t('home.featured_products')}
            </Text>
            <ArrowLink href={href('/products')} label={t('home.view_all')} />
          </View>
          <View className="mt-8 sm:mt-10">
            {loading.products ? (
              <ProductMarketplaceGrid products={[]} loading webGridClass={HOME_PRODUCT_GRID_CLASS} />
            ) : products.length > 0 ? (
              <ProductMarketplaceGrid
                products={products}
                imagePriorityCount={4}
                webGridClass={HOME_PRODUCT_GRID_CLASS}
              />
            ) : (
              <EmptyState message={errors.products || t('home.no_featured_products')} />
            )}
          </View>
        </SectionShell>

        <SectionShell>
          <View className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <Text className="font-sans text-xl font-black text-gray-950 dark:text-slate-100 sm:text-2xl md:text-3xl">
              {t('home.top_sellers')}
            </Text>
            <ArrowLink href={href('/sellers')} label={t('home.view_all')} />
          </View>
          <View className={`mt-6 ${isMarketplaceWeb ? HOME_SELLER_GRID_CLASS : ''}`}>
            {loading.sellers ? (
              isMarketplaceWeb ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <SellerCardSkeleton key={`seller-skeleton-${index}`} />
                ))
              ) : (
                Array.from({ length: 2 }).map((_, rowIndex) => (
                  <MarketplaceGridRow key={`seller-skeleton-row-${rowIndex}`} columns={sellerColumns}>
                    {Array.from({ length: sellerColumns }).map((__, cellIndex) => (
                      <SellerCardSkeleton key={`seller-skeleton-${rowIndex}-${cellIndex}`} />
                    ))}
                  </MarketplaceGridRow>
                ))
              )
            ) : sellers.length > 0 ? (
              isMarketplaceWeb ? (
                sellers.map((seller) => <SellerCard key={String(seller.id)} seller={seller} />)
              ) : (
                sellerRows.map((row, rowIndex) => (
                  <MarketplaceGridRow key={`seller-row-${rowIndex}`} columns={sellerColumns}>
                    {row.map((seller) => (
                      <SellerCard key={String(seller.id)} seller={seller} />
                    ))}
                  </MarketplaceGridRow>
                ))
              )
            ) : (
              <EmptyState message={errors.sellers || t('home.no_top_sellers')} />
            )}
          </View>
        </SectionShell>

        <SectionShell tone="green">
          <View className="lg:items-center">
            <Text className="font-sans text-sm font-bold uppercase tracking-wide text-green-600 dark:text-green-300 sm:text-base">
              {t('home.why_us')}
            </Text>
            <Text className="mt-2 font-sans text-xl font-black tracking-tight text-gray-950 dark:text-slate-100 sm:text-2xl lg:text-center lg:text-4xl">
              {t('home.why_choose_us')}
            </Text>
            <Text className="mt-3 max-w-2xl font-sans text-base leading-7 text-gray-600 dark:text-slate-400 sm:mt-4 sm:text-lg lg:text-center lg:text-xl">
              {t('home.why_choose_us_subtitle')}
            </Text>
          </View>

          <View className={`mt-8 sm:mt-10 ${isMarketplaceWeb ? HOME_VALUE_GRID_CLASS : ''}`}>
            {isMarketplaceWeb
              ? values.map((value) => <ValueItem key={value.titleKey} value={value} />)
              : valueRows.map((row, rowIndex) => (
                  <MarketplaceGridRow key={`value-row-${rowIndex}`} columns={valueColumns}>
                    {row.map((value) => (
                      <ValueItem key={value.titleKey} value={value} />
                    ))}
                  </MarketplaceGridRow>
                ))}
          </View>
        </SectionShell>

        <SectionShell tone="white">
          <View className="overflow-hidden rounded-lg bg-green-700 shadow-xl">
            <View className="gap-6 px-4 py-10 sm:px-6 sm:py-12 md:px-12 md:py-16 lg:flex-row lg:items-center">
              <View className="lg:w-0 lg:flex-1">
                <Text className="font-sans text-xl font-black tracking-tight text-white sm:text-2xl md:text-3xl">
                  {t('home.cta_title')}
                </Text>
                <Text className="mt-3 max-w-3xl font-sans text-base leading-7 text-green-100 sm:mt-4 sm:text-lg">
                  {t('home.cta_subtitle')}
                </Text>
              </View>
              <View className="lg:ml-8">
                <Link href={href('/register')} asChild>
                  <Pressable className="rounded-md bg-white px-5 py-3 shadow-sm">
                    <Text className="text-center font-sans text-sm font-bold text-green-700 sm:text-base">
                      {t('home.get_started')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </SectionShell>
      </View>
    </AppLayout>
  );
}
