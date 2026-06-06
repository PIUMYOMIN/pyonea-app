import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CompareContext = createContext(null);

const MAX_COMPARE_ITEMS = 4;

const getCurrentBucketKey = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return "product_compare_guest";
    const parsed = JSON.parse(rawUser);
    const uid = parsed?.id || parsed?.user_id || "guest";
    return `product_compare_user_${uid}`;
  } catch {
    return "product_compare_guest";
  }
};

const loadItems = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeCompareItem = (product) => ({
  id: product.id,
  slug: product.slug_en || product.slug || String(product.id),
  name: product.name_en || product.name_mm || product.name || "Product",
  category_id: product.category_id || product.category?.id || null,
  price: Number(product.price || 0),
  average_rating: Number(product.average_rating || 0),
  review_count: Number(product.review_count || 0),
  moq: Number(product.moq || 1),
  in_stock: product.in_stock !== false,
  is_active: product.is_active !== false,
  image: product.images?.[0] || product.image || null,
  seller_name:
    product.seller?.seller_profile?.store_name ||
    product.seller?.store_name ||
    product.seller?.name ||
    "",
});

export const CompareProvider = ({ children }) => {
  const [storageKey, setStorageKey] = useState(getCurrentBucketKey());
  const [compareItems, setCompareItems] = useState(() => loadItems(getCurrentBucketKey()));

  useEffect(() => {
    const syncBucket = () => {
      const nextKey = getCurrentBucketKey();
      setStorageKey(nextKey);
      setCompareItems(loadItems(nextKey));
    };
    window.addEventListener("storage", syncBucket);
    window.addEventListener("focus", syncBucket);
    return () => {
      window.removeEventListener("storage", syncBucket);
      window.removeEventListener("focus", syncBucket);
    };
  }, []);

  const persist = useCallback((items) => {
    setCompareItems(items);
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [storageKey]);

  const isCompared = useCallback((productId) => {
    return compareItems.some((item) => item.id === productId);
  }, [compareItems]);

  const addToCompare = useCallback((product) => {
    if (!product?.id) return { success: false, message: "Invalid product." };
    if (compareItems.some((item) => item.id === product.id)) {
      return { success: true, message: "Product already in comparison list." };
    }
    if (compareItems.length >= MAX_COMPARE_ITEMS) {
      return { success: false, message: `You can compare up to ${MAX_COMPARE_ITEMS} products only.` };
    }

    const incoming = normalizeCompareItem(product);
    const firstCategory = compareItems[0]?.category_id;
    if (
      compareItems.length > 0 &&
      firstCategory &&
      incoming.category_id &&
      Number(firstCategory) !== Number(incoming.category_id)
    ) {
      return { success: false, message: "Please compare products from the same category." };
    }

    persist([...compareItems, incoming]);
    return { success: true, message: "Added to comparison." };
  }, [compareItems, persist]);

  const removeFromCompare = useCallback((productId) => {
    persist(compareItems.filter((item) => item.id !== productId));
  }, [compareItems, persist]);

  const clearCompare = useCallback(() => {
    persist([]);
  }, [persist]);

  const value = useMemo(() => ({
    compareItems,
    compareCount: compareItems.length,
    maxCompareItems: MAX_COMPARE_ITEMS,
    isCompared,
    addToCompare,
    removeFromCompare,
    clearCompare,
  }), [compareItems, isCompared, addToCompare, removeFromCompare, clearCompare]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) throw new Error("useCompare must be used within CompareProvider");
  return context;
};

