import { useMemo, type ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import {
  CardSkeleton,
  ProductListCard,
  ProductListRow,
  ProductListRowSkeleton,
  PRODUCT_CARD_ROW_CLASS,
} from '@/components/marketplace/product-list-cards';
import { CategoryCardSkeleton } from '@/components/ui/category-card';
import type { HomeProduct } from '@/utils/native-api';
import {
  CATEGORY_BROWSER_GRID_CLASS,
  HOME_CATEGORY_GRID_CLASS,
  HOME_PRODUCT_GRID_CLASS,
  PRODUCT_LIST_GRID_CLASS,
} from '@/constants/layout';

export const isMarketplaceWeb = Platform.OS === 'web';

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
    const list = Array.isArray(children) ? children : children != null ? [children] : [];
    return list.filter((cell) => cell != null && cell !== false);
  }, [children]);
  const emptySlots = Math.max(0, columns - cells.length);

  return (
    <View className="mb-3 flex-row items-stretch gap-3 sm:mb-4 sm:gap-4">
      {cells.map((child, index) => (
        <View key={`marketplace-grid-cell-${index}`} className={PRODUCT_CARD_ROW_CLASS}>
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
};

export function ProductMarketplaceGrid({
  products,
  webGridClass = PRODUCT_LIST_GRID_CLASS,
  loading = false,
  skeletonCount = 8,
  skeletonRows = 3,
  imagePriorityCount = 4,
  footer = null,
}: ProductMarketplaceGridProps) {
  const columns = useProductGridColumns();
  const rows = useMemo(
    () => chunkMarketplaceItems(products, columns),
    [columns, products],
  );

  if (isMarketplaceWeb) {
    return (
      <>
        <View className={webGridClass}>
          {loading
            ? Array.from({ length: skeletonCount }).map((_, index) => (
                <CardSkeleton key={`product-grid-skeleton-${index}`} className="w-full min-w-0" />
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
    <>
      {rows.map((row, rowIndex) => (
        <ProductListRow
          key={`product-grid-row-${rowIndex}`}
          row={row}
          productColumns={columns}
          rowIndex={rowIndex}
        />
      ))}
      {footer}
    </>
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
  const rows = useMemo(() => chunkMarketplaceItems(items, columns), [columns, items]);

  if (isMarketplaceWeb) {
    return (
      <View className={webGridClass}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, index) => (
              <CategoryCardSkeleton key={`category-grid-skeleton-${index}`} className="w-full min-w-0" />
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
          <MarketplaceGridRow key={`category-grid-skeleton-row-${rowIndex}`} columns={columns}>
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
        <MarketplaceGridRow key={`category-grid-row-${rowIndex}`} columns={columns}>
          {row.map((item, cellIndex) => {
            const index = rowIndex * columns + cellIndex;
            return (
              <View key={keyExtractor(item, index)} className="w-full min-w-0 self-stretch">
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
