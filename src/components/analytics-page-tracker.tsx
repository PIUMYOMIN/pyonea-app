import { usePathname, useGlobalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useCookies } from '@/context/cookies';
import { isInitialised, trackPageView } from '@/utils/analytics';

export function AnalyticsPageTracker() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const { prefs } = useCookies();

  useEffect(() => {
    if (Platform.OS !== 'web' || !prefs.analytics || !isInitialised()) return;

    const query = Object.entries(params)
      .flatMap(([key, value]) => {
        if (value == null || value === '') return [];
        const values = Array.isArray(value) ? value : [value];
        return values.map((entry) => `${encodeURIComponent(key)}=${encodeURIComponent(String(entry))}`);
      })
      .join('&');

    const path = query ? `${pathname}?${query}` : pathname;
    trackPageView(path);
  }, [params, pathname, prefs.analytics]);

  return null;
}
