import { useCallback, useMemo, type ReactNode } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
} from "react-native";

import {
  CardSkeleton,
  PRODUCT_CARD_ROW_CLASS,
  ProductListCard,
  ProductListRowSkeleton,
} from "@/components/marketplace/product-list-cards";
import { CategoryCardSkeleton } from "@/components/ui/category-card";
import {
  CATEGORY_BROWSER_GRID_CLASS,
  HOME_CATEGORY_GRID_CLASS,
  HOME_PRODUCT_GRID_CLASS,
  PRODUCT_LIST_GRID_CLASS,
} from "@/constants/layout";
import type { HomeProduct } from "@/utils/native-api";

export const isMarketplaceWeb = Platform.OS === "web";

/** Approximate product card height for FlatList windowing (square image + meta/actions). */
export const PRODUCT_GRID_ESTIMATED_ITEM_SIZE = 320;

const nativeGridStyles = StyleSheet.create({
  list: {
    flexGrow: 1,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 8,
  },
});

export function chunkMarketplaceItems<T>(items: T[], columns: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}

/** Product list pages — 2 cols phone, 3 tablet, 4 desktop. */
export function useProductGridColumns() {
  const { width } = useWindowDimensions();
  return useMemo(() => (width >= 1280 ? 4 : width >= 640 ? 3 : 2), [width]);
}

/** Category cards — 2 cols phone, 3 sm, 4 md, 6 lg (matches home/browser). */
export function useCategoryGridColumns() {
  const { width } = useWindowDimensions();
  return useMemo(
    () => (width >= 1024 ? 6 : width >= 768 ? 4 : width >= 640 ? 3 : 2),
    [width],
  );
}

export function useSellerGridColumns() {
  const { width } = useWindowDimensions();
  return useMemo(() => (width >= 1024 ? 4 : 2), [width]);
}

/** Seller directory — 1 col phone, 2 tablet, 3–4 desktop (matches pyonea Sellers.jsx). */
export function useSellerDirectoryColumns() {
  const { width } = useWindowDimensions();
  return useMemo(
    () => (width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1),
    [width],
  );
}

export function MarketplaceGridRow({
  columns,
  children,
}: {
  columns: number;
  children: ReactNode;
}) {
  const cells = useMemo(() => {
    const list = Array.isArray(children)
      ? children
      : children != null
        ? [children]
        : [];
    return list.filter((cell) => cell != null && cell !== false);
  }, [children]);
  const emptySlots = Math.max(0, columns - cells.length);

  return (
    <View className="mb-3 flex-row items-stretch gap-3 sm:mb-4 sm:gap-4">
      {cells.map((child, index) => (
        <View
          key={`marketplace-grid-cell-${index}`}
          className={PRODUCT_CARD_ROW_CLASS}
        >
          {child}
        </View>
      ))}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <View
          key={`marketplace-grid-filler-${index}`}
          className={`${PRODUCT_CARD_ROW_CLASS} opacity-0`}
          pointerEvents="none"
        />
      ))}
    </View>
  );
}

type ProductMarketplaceGridProps = {
  products: HomeProduct[];
  webGridClass?: string;
  loading?: boolean;
  skeletonCount?: number;
  skeletonRows?: number;
  imagePriorityCount?: number;
  footer?: ReactNode;
  scrollEnabled?: boolean;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  listHeaderComponent?: ReactNode;
  listEmptyComponent?: ReactNode;
};

export function ProductMarketplaceGrid({
  products,
  webGridClass = PRODUCT_LIST_GRID_CLASS,
  loading = false,
  skeletonCount = 8,
  skeletonRows = 3,
  imagePriorityCount = 4,
  footer = null,
  scrollEnabled = false,
  onEndReached,
  onEndReachedThreshold = 0.4,
  listHeaderComponent = null,
  listEmptyComponent = null,
}: ProductMarketplaceGridProps) {
  const columns = useProductGridColumns();
  const { width } = useWindowDimensions();
  const estimatedItemSize = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12 * Math.max(0, columns - 1);
    const cardWidth = Math.max(
      120,
      (width - horizontalPadding - gap) / columns,
    );
    return Math.round(cardWidth + 132);
  }, [columns, width]);

  const renderProduct = useCallback(
    ({ item, index }: ListRenderItemInfo<HomeProduct>) => (
      <ProductListCard
        product={item}
        className={PRODUCT_CARD_ROW_CLASS}
        imagePriority={index < imagePriorityCount}
      />
    ),
    [imagePriorityCount],
  );

  const listFooter = useMemo(
    () => (footer ? <View>{footer}</View> : null),
    [footer],
  );

  const renderListHeader = useCallback(() => {
    if (!listHeaderComponent) return null;
    return <>{listHeaderComponent}</>;
  }, [listHeaderComponent]);

  const renderListEmpty = useCallback(() => {
    if (!listEmptyComponent) return null;
    return <>{listEmptyComponent}</>;
  }, [listEmptyComponent]);

  if (isMarketplaceWeb) {
    return (
      <>
        <View className={webGridClass}>
          {loading
            ? Array.from({ length: skeletonCount }).map((_, index) => (
                <CardSkeleton
                  key={`product-grid-skeleton-${index}`}
                  className="w-full min-w-0"
                />
              ))
            : products.map((product, index) => (
                <ProductListCard
                  key={String(product.id)}
                  product={product}
                  className="w-full min-w-0"
                  imagePriority={index < imagePriorityCount}
                />
              ))}
        </View>
        {footer}
      </>
    );
  }

  if (loading) {
    return (
      <>
        {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
          <ProductListRowSkeleton
            key={`product-grid-skeleton-row-${rowIndex}`}
            productColumns={columns}
          />
        ))}
        {footer}
      </>
    );
  }

  return (
    <FlatList
      data={products}
      key={String(columns)}
      numColumns={columns}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderProduct}
      scrollEnabled={scrollEnabled}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListHeaderComponent={listHeaderComponent ? renderListHeader : undefined}
      ListFooterComponent={listFooter ? () => listFooter : undefined}
      ListEmptyComponent={listEmptyComponent ? renderListEmpty : undefined}
      columnWrapperStyle={
        columns > 1 ? nativeGridStyles.columnWrapper : undefined
      }
      contentContainerStyle={nativeGridStyles.content}
      style={scrollEnabled ? nativeGridStyles.list : undefined}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={columns * 4}
      maxToRenderPerBatch={columns * 3}
      windowSize={7}
      removeClippedSubviews={Platform.OS === "android"}
    />
  );
}

type CategoryMarketplaceGridProps<T> = {
  items: T[];
  webGridClass?: string;
  loading?: boolean;
  skeletonCount?: number;
  skeletonRows?: number;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
};

export function CategoryMarketplaceGrid<T>({
  items,
  webGridClass = HOME_CATEGORY_GRID_CLASS,
  loading = false,
  skeletonCount = 6,
  skeletonRows = 2,
  keyExtractor,
  renderItem,
}: CategoryMarketplaceGridProps<T>) {
  const columns = useCategoryGridColumns();
  const rows = useMemo(
    () => chunkMarketplaceItems(items, columns),
    [columns, items],
  );

  if (isMarketplaceWeb) {
    return (
      <View className={webGridClass}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, index) => (
              <CategoryCardSkeleton
                key={`category-grid-skeleton-${index}`}
                className="w-full min-w-0"
              />
            ))
          : items.map((item, index) => (
              <View key={keyExtractor(item, index)} className="w-full min-w-0">
                {renderItem(item, index)}
              </View>
            ))}
      </View>
    );
  }

  if (loading) {
    return (
      <>
        {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
          <MarketplaceGridRow
            key={`category-grid-skeleton-row-${rowIndex}`}
            columns={columns}
          >
            {Array.from({ length: columns }).map((__, cellIndex) => (
              <CategoryCardSkeleton
                key={`category-grid-skeleton-${rowIndex}-${cellIndex}`}
                className="w-full min-w-0"
              />
            ))}
          </MarketplaceGridRow>
        ))}
      </>
    );
  }

  return (
    <>
      {rows.map((row, rowIndex) => (
        <MarketplaceGridRow
          key={`category-grid-row-${rowIndex}`}
          columns={columns}
        >
          {row.map((item, cellIndex) => {
            const index = rowIndex * columns + cellIndex;
            return (
              <View
                key={keyExtractor(item, index)}
                className="w-full min-w-0 self-stretch"
              >
                {renderItem(item, index)}
              </View>
            );
          })}
        </MarketplaceGridRow>
      ))}
    </>
  );
}

export {
  CATEGORY_BROWSER_GRID_CLASS,
  HOME_CATEGORY_GRID_CLASS,
  HOME_PRODUCT_GRID_CLASS,
  PRODUCT_LIST_GRID_CLASS,
};
