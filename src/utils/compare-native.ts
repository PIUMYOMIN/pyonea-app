import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { replaceCompareIds } from '@/utils/compare-store';
import type { HomeProduct, ProductDetail } from '@/utils/native-api';
import { fetchProductDetail } from '@/utils/native-api';
import { invalidateScreenCache } from '@/utils/screen-cache';

export type NativeCompareItem = {
  id: string | number;
  slug: string;
  name: string;
  categoryId: string | number | null;
  priceValue: number;
  price: string;
  rating: string;
  reviewCount: number;
  moq: number;
  inStock: boolean;
  isActive: boolean;
  seller: string;
  category: string;
  categoryNameEn?: string;
  categoryNameMm?: string;
  imageUrl?: string;
};

export type CompareActionResult = {
  success: boolean;
  compared: boolean;
  count: number;
  messageKey?: string;
  message?: string;
};

export const MAX_COMPARE_ITEMS = 4;

type CompareListener = (count: number) => void;

const listeners = new Set<CompareListener>();
let memoryItems: NativeCompareItem[] = [];
let memoryStorageKey = 'product_compare_guest';
let nativeHydrated = false;

const canUseLocalStorage = () =>
  Platform.OS === 'web' &&
  typeof globalThis !== 'undefined' &&
  'localStorage' in globalThis;

const getNativeCompareStorageKey = () => `product_compare_guest`;

const persistNativeCompareItems = (items: NativeCompareItem[]) => {
  if (Platform.OS === 'web') return;
  void AsyncStorage.setItem(getNativeCompareStorageKey(), JSON.stringify(items)).catch(() => {
    // Ignore persistence failures; in-memory list still works for this session.
  });
};

export const hydrateCompareFromStorage = async () => {
  if (Platform.OS === 'web' || nativeHydrated) return;

  nativeHydrated = true;
  memoryStorageKey = getNativeCompareStorageKey();

  try {
    const raw = await AsyncStorage.getItem(getNativeCompareStorageKey());
    if (!raw) {
      syncCompareStore([]);
      emitCompareChanged(0);
      return;
    }

    const parsed = JSON.parse(raw);
    memoryItems = Array.isArray(parsed)
      ? parsed.map((item) => normalizeLegacyItem(item))
      : [];
    syncCompareStore(memoryItems);
    emitCompareChanged(memoryItems.length);
  } catch {
    memoryItems = [];
    syncCompareStore(memoryItems);
    emitCompareChanged(0);
  }
};

const getCompareStorageKey = () => {
  if (Platform.OS !== 'web') return getNativeCompareStorageKey();

  if (!canUseLocalStorage()) return memoryStorageKey;

  try {
    const rawUser = globalThis.localStorage.getItem('user');
    if (!rawUser) return 'product_compare_guest';

    const parsed = JSON.parse(rawUser) as { id?: string | number; user_id?: string | number };
    const uid = parsed?.id || parsed?.user_id || 'guest';
    return `product_compare_user_${uid}`;
  } catch {
    return 'product_compare_guest';
  }
};

const parsePriceValue = (value: string | number | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeLegacyItem = (raw: unknown): NativeCompareItem => {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Partial<NativeCompareItem> &
    Record<string, unknown>;

  const numericLegacyPrice =
    typeof item.price === 'number'
      ? item.price
      : typeof item.priceValue === 'number'
        ? item.priceValue
        : typeof (item as Record<string, unknown>).price === 'number'
          ? ((item as Record<string, unknown>).price as number)
          : undefined;

  return {
    id: item.id ?? '',
    slug: String(item.slug || item.slug_en || item.id || ''),
    name: String(item.name || item.name_en || item.name_mm || 'Product'),
    categoryId:
      item.categoryId ??
      (typeof item.category_id === 'string' || typeof item.category_id === 'number'
        ? item.category_id
        : null),
    priceValue: item.priceValue ?? parsePriceValue(numericLegacyPrice ?? item.price),
    price: typeof item.price === 'string' ? item.price : '',
    rating: String(item.rating ?? item.average_rating ?? 0),
    reviewCount: Number(item.reviewCount ?? item.review_count ?? 0),
    moq: Number(item.moq ?? 1),
    inStock: item.inStock ?? item.in_stock !== false,
    isActive: item.isActive ?? item.is_active !== false,
    seller: String(item.seller ?? item.seller_name ?? ''),
    category: String(item.category ?? item.category_name ?? ''),
    categoryNameEn: String(item.categoryNameEn ?? item.category_name_en ?? item.category ?? ''),
    categoryNameMm: String(item.categoryNameMm ?? item.category_name_mm ?? ''),
    imageUrl: item.imageUrl ?? (typeof item.image === 'string' ? item.image : undefined),
  };
};

export const normalizeCompareProduct = (product: HomeProduct): NativeCompareItem => ({
  id: product.productId || product.id,
  slug: String(product.slug || product.id),
  name: product.name,
  categoryId: product.categoryId ?? null,
  priceValue: product.priceValue ?? parsePriceValue(product.price),
  price: product.price,
  rating: product.rating,
  reviewCount: product.reviewCount || 0,
  moq: product.moq || 1,
  inStock: product.inStock !== false,
  isActive: product.isActive !== false,
  seller: product.seller,
  category: product.categoryName || '',
  categoryNameEn: product.categoryNameEn || product.categoryName || '',
  categoryNameMm: product.categoryNameMm || '',
  imageUrl: product.imageUrl,
});

export const normalizeCompareProductDetail = (product: ProductDetail): NativeCompareItem => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  categoryId: product.categoryId ?? null,
  priceValue: product.priceValue,
  price: product.price,
  rating: String(product.rating || 0),
  reviewCount: product.reviewCount || 0,
  moq: product.moq || 1,
  inStock: product.inStock !== false,
  isActive: product.isActive !== false,
  seller: product.seller?.name || 'Pyonea seller',
  category: product.categoryName || '',
  categoryNameEn: product.categoryNameEn || product.categoryName || '',
  categoryNameMm: product.categoryNameMm || '',
  imageUrl: product.images?.[0],
});

export const subscribeCompareChanged = (listener: CompareListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const emitCompareChanged = (count: number) => {
  listeners.forEach((listener) => listener(count));
};

const syncCompareStore = (items: NativeCompareItem[]) => {
  replaceCompareIds(items.map((item) => item.id));
};

export const syncCompareStoreFromStorage = () => {
  syncCompareStore(loadCompareItems());
};

export const loadCompareItems = (): NativeCompareItem[] => {
  const storageKey = getCompareStorageKey();

  if (Platform.OS !== 'web') {
    return storageKey === memoryStorageKey ? memoryItems : [];
  }

  if (!canUseLocalStorage()) {
    return storageKey === memoryStorageKey ? memoryItems : [];
  }

  try {
    const raw = globalThis.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeLegacyItem(item));
  } catch {
    return [];
  }
};

export const saveCompareItems = (items: NativeCompareItem[]) => {
  const storageKey = getCompareStorageKey();
  memoryItems = items;
  memoryStorageKey = storageKey;
  syncCompareStore(items);

  if (Platform.OS !== 'web') {
    persistNativeCompareItems(items);
    emitCompareChanged(items.length);
    return;
  }

  if (!canUseLocalStorage()) {
    emitCompareChanged(items.length);
    return;
  }

  try {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // Ignore unavailable storage. The in-memory value still works for this session.
  }

  emitCompareChanged(items.length);
};

export const getCompareCount = () => loadCompareItems().length;

export const isProductCompared = (productId: string | number) =>
  loadCompareItems().some((item) => String(item.id) === String(productId));

export const formatComparePrice = (priceValue: number, language: string) =>
  new Intl.NumberFormat(language === 'my' ? 'my-MM' : 'en-US', {
    style: 'currency',
    currency: 'MMK',
    maximumFractionDigits: 0,
  }).format(Number(priceValue || 0));

export const addToCompare = (
  product: HomeProduct | ProductDetail
): CompareActionResult => {
  const normalized =
    'images' in product && Array.isArray((product as ProductDetail).images)
      ? normalizeCompareProductDetail(product as ProductDetail)
      : normalizeCompareProduct(product as HomeProduct);

  if (!normalized.id) {
    return { success: false, compared: false, count: getCompareCount(), messageKey: 'invalid' };
  }

  const items = loadCompareItems();
  const exists = items.some((item) => String(item.id) === String(normalized.id));

  if (exists) {
    return {
      success: true,
      compared: true,
      count: items.length,
      messageKey: 'already_added',
    };
  }

  if (items.length >= MAX_COMPARE_ITEMS) {
    return {
      success: false,
      compared: false,
      count: items.length,
      messageKey: 'max_items',
    };
  }

  const firstCategory = items[0]?.categoryId;
  if (
    items.length > 0 &&
    firstCategory &&
    normalized.categoryId &&
    String(firstCategory) !== String(normalized.categoryId)
  ) {
    return {
      success: false,
      compared: false,
      count: items.length,
      messageKey: 'same_category',
    };
  }

  const nextItems = [...items, normalized];
  saveCompareItems(nextItems);
  return {
    success: true,
    compared: true,
    count: nextItems.length,
    messageKey: 'added',
  };
};

export const toggleCompareProduct = (product: HomeProduct): CompareActionResult => {
  const items = loadCompareItems();
  const exists = items.some((item) => String(item.id) === String(product.productId || product.id));

  if (exists) {
    const nextItems = items.filter(
      (item) => String(item.id) !== String(product.productId || product.id)
    );
    saveCompareItems(nextItems);
    return { success: true, compared: false, count: nextItems.length };
  }

  return addToCompare(product);
};

export const removeCompareItem = (productId: string | number) => {
  const nextItems = loadCompareItems().filter((item) => String(item.id) !== String(productId));
  saveCompareItems(nextItems);
  return nextItems;
};

export const clearCompareItems = () => {
  saveCompareItems([]);
  return [];
};

export const syncCompareStorage = () => {
  syncCompareStoreFromStorage();
  emitCompareChanged(getCompareCount());
};

if (Platform.OS === 'web' && canUseLocalStorage()) {
  syncCompareStoreFromStorage();
}

export type CompareRefreshResult = {
  items: NativeCompareItem[];
  removedCount: number;
  usedCache: boolean;
};

export async function refreshCompareItemsFromBackend(
  signal?: AbortSignal
): Promise<CompareRefreshResult> {
  const stored = loadCompareItems();
  if (!stored.length) {
    return { items: [], removedCount: 0, usedCache: false };
  }

  try {
    const results = await Promise.all(
      stored.map(async (item) => {
        const lookup = String(item.slug || item.id);
        if (!lookup) return null;

        try {
          invalidateScreenCache(`api:product-detail:${lookup}`);
          const detail = await fetchProductDetail(lookup, signal);
          return normalizeCompareProductDetail(detail);
        } catch {
          return null;
        }
      })
    );

    const items = results.filter((item): item is NativeCompareItem => item !== null);
    const removedCount = stored.length - items.length;

    saveCompareItems(items);

    return { items, removedCount, usedCache: false };
  } catch {
    return { items: stored, removedCount: 0, usedCache: true };
  }
};
