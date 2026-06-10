import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

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
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const timer = window.setTimeout(() => {
      const container = containerRef.current as unknown as HTMLElement | null;
      if (!container) return;

      const containerStyle = window.getComputedStyle(container);
      const img = container.querySelector('img');
      const imgStyle = img ? window.getComputedStyle(img) : null;

      // #region agent log
      fetch('http://127.0.0.1:7881/ingest/2abef94f-5c12-4a0b-a31b-9ad0887d232d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'763aef'},body:JSON.stringify({sessionId:'763aef',runId:'pre-fix',hypothesisId:'H1-H2',location:'brand-logo.tsx:useEffect',message:'BrandLogo web layout metrics',data:{size,opacity,containerWidth:containerStyle.width,containerHeight:containerStyle.height,borderRadius:containerStyle.borderRadius,overflow:containerStyle.overflow,imgWidth:imgStyle?.width,imgHeight:imgStyle?.height,objectFit:imgStyle?.objectFit,objectPosition:imgStyle?.objectPosition,imgNaturalW:img?.naturalWidth,imgNaturalH:img?.naturalHeight},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }, 800);

    return () => window.clearTimeout(timer);
  }, [size, opacity]);

  return (
    <View
      ref={containerRef}
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
