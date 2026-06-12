import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  ProductListCard,
  PRODUCT_CARD_CAROUSEL_CLASS,
} from '@/components/marketplace-list-screen';
import { ProductMarketplaceGrid } from '@/components/marketplace/marketplace-grid';
import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import type { HomeProduct } from '@/utils/native-api';

const CARD_WIDTH_SM = 176;
const CARD_WIDTH_MD = 192;
const CARD_WIDTH_LG = 208;
const CARD_GAP = 12;

function cardWidthForViewport(width: number) {
  if (width >= 1024) return CARD_WIDTH_LG;
  if (width >= 640) return CARD_WIDTH_MD;
  return CARD_WIDTH_SM;
}

type MoreFromSellerCarouselProps = {
  products: HomeProduct[];
};

export function MoreFromSellerCarousel({ products }: MoreFromSellerCarouselProps) {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollMetrics = useRef({ x: 0, contentWidth: 0, layoutWidth: 0 });

  const cardWidth = cardWidthForViewport(viewportWidth);
  const showNav = products.length > 1;

  const syncScrollMetrics = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollMetrics.current.x = event.nativeEvent.contentOffset.x;
      scrollMetrics.current.contentWidth = event.nativeEvent.contentSize.width;
      scrollMetrics.current.layoutWidth = event.nativeEvent.layoutMeasurement.width;
    },
    []
  );

  const handleLayout = useCallback(
    (width: number) => {
      scrollMetrics.current.layoutWidth = width;
      scrollMetrics.current.contentWidth =
        products.length * cardWidth + Math.max(0, products.length - 1) * CARD_GAP;
    },
    [cardWidth, products.length]
  );

  useEffect(() => {
    scrollMetrics.current.x = 0;
    scrollMetrics.current.contentWidth =
      products.length * cardWidth + Math.max(0, products.length - 1) * CARD_GAP;
  }, [cardWidth, products.length]);

  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      const { x, contentWidth, layoutWidth } = scrollMetrics.current;
      const maxScroll = Math.max(0, contentWidth - layoutWidth);
      const step = Math.max(cardWidth + CARD_GAP, Math.floor(layoutWidth * 0.85));

      let nextX = direction === 1 ? x + step : x - step;
      if (direction === 1 && x >= maxScroll - 2) {
        nextX = 0;
      } else if (direction === -1 && x <= 2) {
        nextX = maxScroll;
      }

      scrollRef.current?.scrollTo({ x: Math.max(0, Math.min(maxScroll, nextX)), animated: true });
    },
    [cardWidth]
  );

  if (!products.length) return null;

  if (Platform.OS !== 'web') {
    return <ProductMarketplaceGrid products={products} imagePriorityCount={3} />;
  }

  const chevronColor = isDark ? '#e2e8f0' : '#374151';
  const navButtonClass = `absolute top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-800/95 ${
    Platform.OS === 'web' ? 'hidden md:flex' : 'flex'
  }`;

  return (
    <View
      className="relative min-w-0 w-full"
      onLayout={(event) => handleLayout(event.nativeEvent.layout.width)}
      accessibilityLabel={t('productDetail.more_from_seller')}
    >
      {showNav ? (
        <Pressable
          onPress={() => scrollByPage(-1)}
          accessibilityRole="button"
          accessibilityLabel={t('productDetail.carousel_previous', { defaultValue: 'Previous products' })}
          className={`${navButtonClass} left-0`}
        >
          <Feather name="chevron-left" size={20} color={chevronColor} />
        </Pressable>
      ) : null}

      {showNav ? (
        <Pressable
          onPress={() => scrollByPage(1)}
          accessibilityRole="button"
          accessibilityLabel={t('productDetail.carousel_next', { defaultValue: 'Next products' })}
          className={`${navButtonClass} right-0`}
        >
          <Feather name="chevron-right" size={20} color={chevronColor} />
        </Pressable>
      ) : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={Platform.OS === 'web'}
        showsVerticalScrollIndicator={false}
        onScroll={syncScrollMetrics}
        onContentSizeChange={(contentWidth) => {
          scrollMetrics.current.contentWidth = contentWidth;
        }}
        scrollEventThrottle={16}
        className="scroll-x-only w-full max-w-full md:px-2"
        contentContainerClassName="gap-3 sm:gap-4"
      >
        {products.map((item, index) => (
          <ProductListCard
            key={String(item.id)}
            product={item}
            className={PRODUCT_CARD_CAROUSEL_CLASS}
            imagePriority={index < 3}
          />
        ))}
      </ScrollView>
    </View>
  );
}
