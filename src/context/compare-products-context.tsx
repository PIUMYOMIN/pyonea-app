import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { loadCompareItems, subscribeCompareChanged } from '@/utils/compare-native';
import { getProductApiId, type HomeProduct } from '@/utils/native-api';

type CompareProductsContextValue = {
  comparedIds: ReadonlySet<string>;
};

const CompareProductsContext = createContext<CompareProductsContextValue>({
  comparedIds: new Set(),
});

function buildCompareIdSet() {
  return new Set(loadCompareItems().map((item) => String(item.id)));
}

export function CompareProductsProvider({ children }: PropsWithChildren) {
  const [comparedIds, setComparedIds] = useState(buildCompareIdSet);

  useEffect(() => {
    setComparedIds(buildCompareIdSet());
    return subscribeCompareChanged(() => {
      setComparedIds(buildCompareIdSet());
    });
  }, []);

  const value = useMemo(() => ({ comparedIds }), [comparedIds]);

  return (
    <CompareProductsContext.Provider value={value}>{children}</CompareProductsContext.Provider>
  );
}

export function useComparedProductIds() {
  return useContext(CompareProductsContext).comparedIds;
}

export function useIsProductInCompare(product: Pick<HomeProduct, 'id' | 'productId'>) {
  const comparedIds = useComparedProductIds();
  return comparedIds.has(String(getProductApiId(product)));
}
