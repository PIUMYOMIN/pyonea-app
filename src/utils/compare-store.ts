import { useSyncExternalStore } from 'react';

import { getProductApiId, type HomeProduct } from '@/utils/native-api';

type Listener = () => void;

let productIds = new Set<string>();
const productListeners = new Map<string, Set<Listener>>();
const globalListeners = new Set<Listener>();

const notifyProduct = (productId: string) => {
  productListeners.get(productId)?.forEach((listener) => listener());
};

export const getCompareSize = () => productIds.size;

export const isInCompare = (productId: string | number) =>
  productIds.has(String(productId));

export const replaceCompareIds = (nextIds: Iterable<string | number>) => {
  const next = new Set(Array.from(nextIds, String));
  const changed = new Set<string>();

  productIds.forEach((id) => {
    if (!next.has(id)) changed.add(id);
  });
  next.forEach((id) => {
    if (!productIds.has(id)) changed.add(id);
  });

  productIds = next;
  globalListeners.forEach((listener) => listener());
  changed.forEach((id) => notifyProduct(id));
};

export const updateCompareId = (productId: string | number, compared: boolean) => {
  const key = String(productId);
  const had = productIds.has(key);

  if (compared === had) return;

  const next = new Set(productIds);
  if (compared) next.add(key);
  else next.delete(key);

  productIds = next;
  globalListeners.forEach((listener) => listener());
  notifyProduct(key);
};

export const clearCompareStore = () => {
  if (productIds.size === 0) return;

  const previous = productIds;
  productIds = new Set();
  globalListeners.forEach((listener) => listener());
  previous.forEach((id) => notifyProduct(id));
};

export const subscribeCompareProduct = (productId: string | number, listener: Listener) => {
  const key = String(productId);
  if (!productListeners.has(key)) productListeners.set(key, new Set());
  productListeners.get(key)!.add(listener);

  return () => {
    productListeners.get(key)?.delete(listener);
  };
};

export const subscribeCompareGlobal = (listener: Listener) => {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
};

export function useIsProductInCompare(product: Pick<HomeProduct, 'id' | 'productId'>) {
  const productId = getProductApiId(product);

  return useSyncExternalStore(
    (listener) => subscribeCompareProduct(productId, listener),
    () => isInCompare(productId),
    () => false,
  );
}
