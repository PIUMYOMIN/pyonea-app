import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

type UseDashboardTabsOptions<T extends string> = {
  basePath: string;
  defaultTab: T;
  normalizeTab: (value?: string) => T;
  formatTabParam?: (tab: T) => string | undefined;
};

export function useDashboardTabs<T extends string>({
  basePath,
  defaultTab,
  normalizeTab,
  formatTabParam,
}: UseDashboardTabsOptions<T>) {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tabParam = getParam(params.tab);
  const lastSyncedTabParam = useRef(tabParam);
  const [activeTab, setActiveTab] = useState<T>(() => normalizeTab(tabParam));

  useEffect(() => {
    if (tabParam === lastSyncedTabParam.current) return;
    lastSyncedTabParam.current = tabParam;
    const nextTab = normalizeTab(tabParam);
    const timeout = setTimeout(() => {
      setActiveTab((current) => (current === nextTab ? current : nextTab));
    }, 0);
    return () => clearTimeout(timeout);
  }, [normalizeTab, tabParam]);

  const selectTab = useCallback(
    (tab: T) => {
      const nextTabParam = formatTabParam
        ? formatTabParam(tab)
        : tab === defaultTab
          ? undefined
          : tab;

      setActiveTab(tab);
      lastSyncedTabParam.current = nextTabParam;

      if (typeof router.setParams === 'function') {
        router.setParams({ tab: nextTabParam });
        return;
      }

      if (
        typeof window !== 'undefined' &&
        typeof window.history?.replaceState === 'function'
      ) {
        const nextPath = nextTabParam
          ? `${basePath}?tab=${encodeURIComponent(nextTabParam)}`
          : basePath;
        window.history.replaceState(null, '', nextPath);
      }
    },
    [basePath, defaultTab, formatTabParam, router],
  );

  return { activeTab, selectTab, tabParam };
}
