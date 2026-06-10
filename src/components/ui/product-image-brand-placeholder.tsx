import { Platform, Text, View } from 'react-native';

import { BRAND_FONT_FAMILY } from '@/constants/brand';

type ProductImageBrandPlaceholderProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'text-sm sm:text-base',
  md: 'text-base sm:text-lg',
  lg: 'text-xl sm:text-2xl lg:text-3xl',
} as const;

/** Web-only branded fallback shown while product photos load or are missing. */
export function ProductImageBrandPlaceholder({
  className = '',
  size = 'md',
}: ProductImageBrandPlaceholderProps) {
  if (Platform.OS !== 'web') return null;

  return (
    <View
      className={`absolute inset-0 items-center justify-center bg-gray-100 dark:bg-slate-800 ${className}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        className={`select-none text-green-800 dark:text-green-300 ${sizeClasses[size]}`}
        style={{ fontFamily: BRAND_FONT_FAMILY }}
        accessibilityLabel="Pyonea"
      >
        Pyonea
      </Text>
    </View>
  );
}
