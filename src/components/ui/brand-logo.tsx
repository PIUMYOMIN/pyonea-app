import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { View } from 'react-native';

import { BRAND_LOGO, BRAND_LOGO_BACKGROUND } from '@/constants/brand';

type BrandLogoProps = {
  size?: number;
  className?: string;
  opacity?: number;
};

/**
 * Logo_on_payslip.png is a square canvas with a centered green disc.
 * Cover + center fill inside a round clip; brand green backs any sub-pixel gaps.
 */
export function BrandLogo({ size = 36, className = '', opacity }: BrandLogoProps) {
  return (
    <View
      className={`shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        opacity,
        backgroundColor: BRAND_LOGO_BACKGROUND,
      }}
    >
      <Image
        source={BRAND_LOGO}
        style={{ width: size, height: size }}
        contentFit="cover"
        contentPosition="center"
        accessibilityLabel="Pyonea"
      />
    </View>
  );
}
