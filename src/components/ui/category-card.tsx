import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useAppTranslation } from '@/i18n';
import { getThumbUrl } from '@/utils/image-thumbs';
import type { BrowserCategory, HomeCategory } from '@/utils/native-api';
import { Link, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, SlideInUp, SlideOutUp } from 'react-native-reanimated';

/** Full width inside a CSS grid parent — do not use percentage widths with flex-wrap. */
export const CATEGORY_CARD_WIDTH_CLASS = 'w-full min-w-0';

const GRADIENT_CLASSES = [
  'from-green-400 to-emerald-600',
  'from-blue-400 to-cyan-600',
  'from-purple-400 to-violet-600',
  'from-orange-400 to-amber-600',
  'from-pink-400 to-rose-600',
  'from-teal-400 to-green-600',
  'from-indigo-400 to-blue-600',
  'from-yellow-400 to-orange-500',
] as const;

const GRADIENT_COLORS: Record<(typeof GRADIENT_CLASSES)[number], readonly [string, string]> = {
  'from-green-400 to-emerald-600': ['#4ade80', '#059669'],
  'from-blue-400 to-cyan-600': ['#60a5fa', '#0891b2'],
  'from-purple-400 to-violet-600': ['#c084fc', '#7c3aed'],
  'from-orange-400 to-amber-600': ['#fb923c', '#d97706'],
  'from-pink-400 to-rose-600': ['#f472b6', '#e11d48'],
  'from-teal-400 to-green-600': ['#2dd4bf', '#16a34a'],
  'from-indigo-400 to-blue-600': ['#818cf8', '#2563eb'],
  'from-yellow-400 to-orange-500': ['#facc15', '#f97316'],
};

export const gradientClassFromName = (name = '') => {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return GRADIENT_CLASSES[Math.abs(hash) % GRADIENT_CLASSES.length];
};

const localizeName = (
  language: 'en' | 'my',
  nameEn?: string,
  nameMm?: string,
  fallback = ''
) => (language === 'my' ? nameMm || nameEn || fallback : nameEn || nameMm || fallback);

export function getCategorySlidingItems(
  category: HomeCategory | BrowserCategory,
  language: 'en' | 'my'
): string[] {
  if ('children' in category && Array.isArray(category.children) && category.children.length > 0) {
    const hasProducts = (item: BrowserCategory): boolean =>
      item.productCount > 0 || item.children.some(hasProducts);

    return category.children
      .filter(hasProducts)
      .map((child) => {
        const childName = localizeName(
          language,
          child.nameEn,
          child.nameMm,
          child.name
        );
        return `${child.productCount} ${childName}`;
      });
  }

  if (category.childPreview && category.childPreview.length > 0) {
    return category.childPreview;
  }

  return [];
}

export function getCategoryDisplayName(
  category: HomeCategory | BrowserCategory,
  language: 'en' | 'my'
) {
  return localizeName(language, category.nameEn, category.nameMm, category.name);
}

export function getCategoryHref(
  category: HomeCategory | BrowserCategory,
  language: 'en' | 'my'
): Href {
  const slugEn = category.slugEn || '';
  const slugMm = category.slugMm || '';
  const slug =
    language === 'my'
      ? slugMm || slugEn || String(category.id)
      : slugEn || slugMm || String(category.id);

  return `/categories/${slug}?lang=${language}` as Href;
}

function CategoryGradientPlaceholder({
  displayName,
  gradientClass,
}: {
  displayName: string;
  gradientClass: (typeof GRADIENT_CLASSES)[number];
}) {
  const [startColor, endColor] = GRADIENT_COLORS[gradientClass];

  if (Platform.OS === 'web') {
    return (
      <View
        className={`h-full w-full items-center justify-center bg-gradient-to-br ${gradientClass}`}>
        <Text
          className="px-3 text-center font-sans text-sm font-bold leading-snug text-white drop-shadow-sm"
          numberOfLines={3}>
          {displayName}
        </Text>
      </View>
    );
  }

  return (
    <View className="h-full w-full items-center justify-center px-3" style={{ backgroundColor: startColor }}>
      <View className="absolute inset-0 opacity-80" style={{ backgroundColor: endColor }} />
      <Text
        className="text-center font-sans text-sm font-bold leading-snug text-white drop-shadow-sm"
        numberOfLines={3}>
        {displayName}
      </Text>
    </View>
  );
}

function CategorySlidingText({
  items,
  animate = false,
}: {
  items: string[];
  animate?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!animate || items.length <= 1) return undefined;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 2200);

    return () => clearInterval(timer);
  }, [animate, items.length]);

  if (items.length === 0) return null;

  const label = items[index] ?? items[0];

  return (
    <View className="relative h-5 overflow-hidden">
      <Animated.View
        key={`${index}-${label}`}
        entering={SlideInUp.duration(350)}
        exiting={SlideOutUp.duration(350)}
        className="absolute inset-0 justify-center">
        <Text className="font-sans text-xs font-medium text-green-700 dark:text-green-800" numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

function CategoryCardShell({
  children,
  className,
  animate = false,
}: {
  children: React.ReactNode;
  className: string;
  animate?: boolean;
}) {
  if (Platform.OS === 'web') {
    return <View className={`${animate ? 'animate-card-in ' : ''}${className}`}>{children}</View>;
  }

  if (!animate) {
    return <View className={className}>{children}</View>;
  }

  return (
    <Animated.View entering={FadeInUp.duration(300)} className={className}>
      {children}
    </Animated.View>
  );
}

export type CategoryCardProps = {
  displayName: string;
  imageUrl?: string;
  discountPct?: number;
  slidingItems?: string[];
  href: Href;
  priority?: boolean;
  className?: string;
};

export function CategoryCard({
  displayName,
  imageUrl,
  discountPct = 0,
  slidingItems = [],
  href,
  priority = false,
  className = CATEGORY_CARD_WIDTH_CLASS,
}: CategoryCardProps) {
  const { t } = useAppTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const gradientClass = gradientClassFromName(displayName);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <CategoryCardShell
      animate={priority}
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50 ${className}`}>
      <Link href={href} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={displayName}
          className="active:opacity-95">
          <View className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-700">
            {showImage ? (
              <Image
                source={{ uri: getThumbUrl(imageUrl, 300) }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                loading={priority ? 'eager' : 'lazy'}
                priority={priority ? 'high' : 'normal'}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <CategoryGradientPlaceholder displayName={displayName} gradientClass={gradientClass} />
            )}

            {discountPct > 0 ? (
              <View className="absolute left-2 top-2">
                <Text className="rounded-full bg-red-500 px-2 py-0.5 font-sans text-[10px] font-bold leading-tight text-white shadow-sm">
                  {t('categories.discount_badge', { percent: discountPct })}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="px-2 pt-2 sm:px-3 sm:pt-3">
            <Text
              className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100"
              numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          {slidingItems.length > 0 ? (
            <View className="mt-1 bg-green-300 px-2 py-2 sm:px-3 sm:py-3 dark:bg-green-300">
              <CategorySlidingText animate={priority} items={slidingItems} />
            </View>
          ) : null}
        </Pressable>
      </Link>
    </CategoryCardShell>
  );
}

export function CategoryCardFromHome({
  category,
  language,
  priority = false,
  className,
}: {
  category: HomeCategory;
  language: 'en' | 'my';
  priority?: boolean;
  className?: string;
}) {
  const { t } = useAppTranslation();
  const displayName = getCategoryDisplayName(category, language);
  const slidingItems = getCategorySlidingItems(category, language);

  return (
    <CategoryCard
      displayName={displayName}
      imageUrl={category.imageUrl}
      discountPct={category.discountPct}
      slidingItems={
        slidingItems.length > 0
          ? slidingItems
          : category.productCount > 0
            ? [`${category.productCount} ${t('category.products')}`]
            : []
      }
      href={getCategoryHref(category, language)}
      priority={priority}
      className={className}
    />
  );
}

export function CategoryCardFromBrowser({
  category,
  language,
  priority = false,
  className,
}: {
  category: BrowserCategory;
  language: 'en' | 'my';
  priority?: boolean;
  className?: string;
}) {
  const displayName = getCategoryDisplayName(category, language);
  const slidingItems = getCategorySlidingItems(category, language);

  return (
    <CategoryCard
      displayName={displayName}
      imageUrl={category.imageUrl}
      discountPct={category.discountPct}
      slidingItems={slidingItems}
      href={getCategoryHref(category, language)}
      priority={priority}
      className={className}
    />
  );
}

export function CategoryCardSkeleton({ className = CATEGORY_CARD_WIDTH_CLASS }) {
  return (
    <View
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50 ${className}`}>
      <View className="aspect-square animate-pulse bg-gray-300 dark:bg-slate-700" />
      <View className="gap-2 p-3 sm:p-4">
        <View className="h-4 w-3/4 rounded bg-gray-300 dark:bg-slate-700" />
        <View className="h-3 w-1/2 rounded bg-gray-300 dark:bg-slate-700" />
      </View>
    </View>
  );
}
