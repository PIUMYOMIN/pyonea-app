import Feather from '@expo/vector-icons/Feather';
import { Link, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useAppTranslation } from '@/i18n';
import {
  getCompareCount,
  subscribeCompareChanged,
  syncCompareStorage,
} from '@/utils/compare-native';

export function FloatingCompareButtonNative() {
  const pathname = usePathname();
  const { t } = useAppTranslation();
  const [count, setCount] = useState(() => getCompareCount());

  useEffect(() => {
    syncCompareStorage();
    return subscribeCompareChanged(setCount);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleSync = () => syncCompareStorage();
    window.addEventListener('focus', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  if (!count || pathname === '/compare') return null;

  return (
    <View
      className="pointer-events-none absolute bottom-6 right-4 z-40 sm:right-6 web:fixed"
      accessibilityElementsHidden={false}>
      <Link href="/compare" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('compare.floating_label', { count })}
          className="pointer-events-auto flex-row items-center gap-2 rounded-full bg-green-600 px-4 py-3 shadow-lg web:transition-colors web:hover:bg-green-700">
          <Feather name="shuffle" size={16} color="#ffffff" />
          <Text className="font-sans text-sm font-semibold text-white">
            {t('compare.floating_button', { count })}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
