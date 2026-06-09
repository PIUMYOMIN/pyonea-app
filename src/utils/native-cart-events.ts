import type { CartResult } from '@/utils/native-api';

export type CartCountEvent =
  | number
  | {
      count?: number;
      delta?: number;
      cart?: CartResult;
    };

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
