import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { useNativeAuth } from '@/context/native-auth';
import { hasUserRole } from '@/utils/auth-routing';
import {
  addWishlistItem,
  fetchWishlist,
  getProductApiId,
  removeWishlistItem,
  type HomeProduct,
} from '@/utils/native-api';
import { emitWishlistCountChanged } from '@/utils/native-wishlist-events';
import {
  clearWishlistStore,
  getWishlistSize,
  isProductInWishlist,
  replaceWishlistIds,
  subscribeWishlistGlobal,
  subscribeWishlistProduct,
  updateWishlistId,
} from '@/utils/wishlist-store';

type WishlistContextValue = {
  count: number;
  loading: boolean;
  items: HomeProduct[];
  isInWishlist: (productId: string | number) => boolean;
  toggleWishlist: (productId: string | number) => Promise<{ added: boolean }>;
  refreshWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useNativeAuth();
  const isBuyer = hasUserRole(user, 'buyer');
  const buyerId = isAuthenticated && isBuyer && user ? String(user.id) : null;
  const count = useSyncExternalStore(subscribeWishlistGlobal, getWishlistSize, () => 0);
  const [items, setItems] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedBuyerIdRef = useRef<string | null>(null);

  const refreshWishlist = useCallback(async () => {
    if (!buyerId) {
      loadedBuyerIdRef.current = null;
      clearWishlistStore();
      setItems([]);
      emitWishlistCountChanged(0);
      return;
    }

    setLoading(true);
    try {
      const nextItems = await fetchWishlist();
      replaceWishlistIds(nextItems.map((item) => getProductApiId(item)));
      setItems(nextItems);
      loadedBuyerIdRef.current = buyerId;
      emitWishlistCountChanged(getWishlistSize());
    } catch {
      if (loadedBuyerIdRef.current !== buyerId) {
        clearWishlistStore();
        setItems([]);
      }
      emitWishlistCountChanged(getWishlistSize());
    } finally {
      setLoading(false);
    }
  }, [buyerId]);

  useEffect(() => {
    if (!buyerId) {
      loadedBuyerIdRef.current = null;
      clearWishlistStore();
      setItems([]);
      emitWishlistCountChanged(0);
      return;
    }

    if (loadedBuyerIdRef.current === buyerId) {
      return;
    }

    void refreshWishlist();
  }, [buyerId, refreshWishlist]);

  const isInWishlist = useCallback(
    (productId: string | number) => isProductInWishlist(productId),
    [],
  );

  const toggleWishlist = useCallback(
    async (productId: string | number) => {
      const key = String(productId);
      const wasInWishlist = isProductInWishlist(key);

      updateWishlistId(key, !wasInWishlist);
      emitWishlistCountChanged(getWishlistSize());

      try {
        if (wasInWishlist) {
          await removeWishlistItem(productId);
          setItems((current) =>
            current.filter((item) => String(getProductApiId(item)) !== key),
          );
          return { added: false };
        }

        await addWishlistItem(productId);
        await refreshWishlist();
        return { added: true };
      } catch (error) {
        updateWishlistId(key, wasInWishlist);
        emitWishlistCountChanged(getWishlistSize());
        await refreshWishlist();
        throw error;
      }
    },
    [refreshWishlist],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      count,
      loading,
      items,
      isInWishlist,
      toggleWishlist,
      refreshWishlist,
    }),
    [count, isInWishlist, items, loading, refreshWishlist, toggleWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}

export function useWishlistSaved(productId: string | number) {
  return useSyncExternalStore(
    (listener) => subscribeWishlistProduct(productId, listener),
    () => isProductInWishlist(productId),
    () => false,
  );
}

export function useWishlistProductState(product: Pick<HomeProduct, 'id' | 'productId'>) {
  const { toggleWishlist } = useWishlist();
  const productId = getProductApiId(product);
  const saved = useWishlistSaved(productId);

  return {
    productId,
    saved,
    toggleWishlist: () => toggleWishlist(productId),
  };
}
