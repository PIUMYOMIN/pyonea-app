type CartCountEvent = number | { count?: number; delta?: number };
type CartCountListener = (event?: CartCountEvent) => void;

const listeners = new Set<CartCountListener>();

export const subscribeCartCountChanged = (listener: CartCountListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitCartCountChanged = (event?: CartCountEvent) => {
  listeners.forEach((listener) => listener(event));
};
