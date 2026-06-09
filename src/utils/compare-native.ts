import type { HomeProduct } from '@/utils/native-api';

export type NativeCompareItem = {
  id: string | number;
  slug: string;
  name: string;
  price: string;
  rating: string;
  reviewCount: number;
  moq: number;
  inStock: boolean;
  seller: string;
  category: string;
};

const STORAGE_KEY = 'product_compare_guest';
const MAX_COMPARE_ITEMS = 4;
let memoryItems: NativeCompareItem[] = [];

const canUseLocalStorage = () =>
  typeof globalThis !== 'undefined' && 'localStorage' in globalThis;

export const normalizeCompareProduct = (product: HomeProduct): NativeCompareItem => ({
  id: product.id,
  slug: String(product.id),
  name: product.name,
  price: product.price,
  rating: product.rating,
  reviewCount: product.reviewCount || 0,
  moq: product.moq || 1,
  inStock: true,
  seller: product.seller,
  category: product.categoryName || '',
});

export const loadCompareItems = (): NativeCompareItem[] => {
  if (!canUseLocalStorage()) return memoryItems;

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCompareItems = (items: NativeCompareItem[]) => {
  memoryItems = items;

  if (!canUseLocalStorage()) return;

  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore unavailable storage. The in-memory value still works for this session.
  }
};

export const isProductCompared = (productId: string | number) =>
  loadCompareItems().some((item) => String(item.id) === String(productId));

export const toggleCompareProduct = (product: HomeProduct) => {
  const items = loadCompareItems();
  const exists = items.some((item) => String(item.id) === String(product.id));

  if (exists) {
    const nextItems = items.filter((item) => String(item.id) !== String(product.id));
    saveCompareItems(nextItems);
    return { compared: false, count: nextItems.length };
  }

  const nextItems = [...items, normalizeCompareProduct(product)].slice(0, MAX_COMPARE_ITEMS);
  saveCompareItems(nextItems);
  return { compared: true, count: nextItems.length };
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
