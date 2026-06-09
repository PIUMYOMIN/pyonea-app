import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNativeAuth } from '@/context/native-auth';
import { hasUserRole } from '@/utils/auth-routing';
import { fetchCart, type CartResult } from '@/utils/native-api';
import { subscribeCartCountChanged } from '@/utils/native-cart-events';

type CartCountContextValue = {
  totalItems: number;
  cartSnapshot: CartResult | null;
  refreshCartCount: () => Promise<void>;
};

const CartCountContext = createContext<CartCountContextValue | null>(null);

export function CartCountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useNativeAuth();
  const buyerId = user && hasUserRole(user, 'buyer') ? String(user.id) : null;
  const [totalItems, setTotalItems] = useState(0);
  const [cartSnapshot, setCartSnapshot] = useState<CartResult | null>(null);

  const refreshCartCount = useCallback(
    async (signal?: AbortSignal) => {
      if (!buyerId) {
        setTotalItems(0);
        setCartSnapshot(null);
        return;
      }

      try {
        const cart = await fetchCart(signal);
        if (signal?.aborted) return;
        setTotalItems(cart.totalItems);
        setCartSnapshot(cart);
      } catch {
        if (!signal?.aborted) {
          setTotalItems(0);
          setCartSnapshot(null);
        }
      }
    },
    [buyerId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refreshCartCount(controller.signal);
    return () => controller.abort();
  }, [refreshCartCount]);

  useEffect(
    () =>
      subscribeCartCountChanged((event) => {
        if (event && typeof event === 'object' && event.cart) {
          setCartSnapshot(event.cart);
          setTotalItems(Math.max(0, event.cart.totalItems));
          return;
        }

        if (typeof event === 'number') {
          setTotalItems(Math.max(0, event));
          return;
        }

        if (typeof event === 'object') {
          if (typeof event.count === 'number') {
            setTotalItems(Math.max(0, event.count));
            return;
          }
          if (typeof event.delta === 'number') {
            setTotalItems((current) => Math.max(0, current + event.delta!));
            void refreshCartCount();
            return;
          }
        }

        void refreshCartCount();
      }),
    [refreshCartCount],
  );

  const value = useMemo<CartCountContextValue>(
    () => ({
      totalItems,
      cartSnapshot,
      refreshCartCount: () => refreshCartCount(),
    }),
    [cartSnapshot, refreshCartCount, totalItems],
  );

  return <CartCountContext.Provider value={value}>{children}</CartCountContext.Provider>;
}

export function useCartCount() {
  const context = useContext(CartCountContext);
  if (!context) {
    throw new Error('useCartCount must be used within CartCountProvider');
  }
  return context;
}
