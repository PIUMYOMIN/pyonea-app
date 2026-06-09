type WishlistCountListener = (count: number) => void;

const listeners = new Set<WishlistCountListener>();

export const subscribeWishlistCountChanged = (listener: WishlistCountListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitWishlistCountChanged = (count: number) => {
  listeners.forEach((listener) => listener(Math.max(0, count)));
};
