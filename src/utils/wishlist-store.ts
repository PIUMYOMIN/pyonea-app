type Listener = () => void;

let productIds = new Set<string>();
const productListeners = new Map<string, Set<Listener>>();
const globalListeners = new Set<Listener>();

const notifyProduct = (productId: string) => {
  productListeners.get(productId)?.forEach((listener) => listener());
};

export const getWishlistSize = () => productIds.size;

export const isProductInWishlist = (productId: string | number) =>
  productIds.has(String(productId));

export const replaceWishlistIds = (nextIds: Iterable<string | number>) => {
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

export const updateWishlistId = (productId: string | number, inWishlist: boolean) => {
  const key = String(productId);
  const had = productIds.has(key);

  if (inWishlist === had) return;

  const next = new Set(productIds);
  if (inWishlist) next.add(key);
  else next.delete(key);

  productIds = next;
  globalListeners.forEach((listener) => listener());
  notifyProduct(key);
};

export const clearWishlistStore = () => {
  if (productIds.size === 0) return;

  const previous = productIds;
  productIds = new Set();
  globalListeners.forEach((listener) => listener());
  previous.forEach((id) => notifyProduct(id));
};

export const subscribeWishlistProduct = (productId: string | number, listener: Listener) => {
  const key = String(productId);
  if (!productListeners.has(key)) productListeners.set(key, new Set());
  productListeners.get(key)!.add(listener);

  return () => {
    productListeners.get(key)?.delete(listener);
  };
};

export const subscribeWishlistGlobal = (listener: Listener) => {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
};
