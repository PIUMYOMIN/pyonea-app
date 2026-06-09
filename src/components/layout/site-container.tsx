import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

import {
  SITE_CONTAINER_4XL_CLASS,
  SITE_CONTAINER_5XL_CLASS,
  SITE_CONTAINER_6XL_CLASS,
  SITE_CONTAINER_CLASS,
} from '@/constants/layout';

type SiteWidth = '7xl' | '6xl' | '5xl' | '4xl';

const widthClass: Record<SiteWidth, string> = {
  '7xl': SITE_CONTAINER_CLASS,
  '6xl': SITE_CONTAINER_6XL_CLASS,
  '5xl': SITE_CONTAINER_5XL_CLASS,
  '4xl': SITE_CONTAINER_4XL_CLASS,
};

type SiteContainerProps = PropsWithChildren<
  ViewProps & {
    className?: string;
    width?: SiteWidth;
  }
>;

export function SiteContainer({
  children,
  className = '',
  width = '7xl',
  ...props
}: SiteContainerProps) {
  return (
    <View className={`${widthClass[width]} ${className}`.trim()} {...props}>
      {children}
    </View>
  );
}

type SiteSectionProps = PropsWithChildren<
  ViewProps & {
    containerClassName?: string;
    width?: SiteWidth;
  }
>;

/** Full-bleed background with a pyonea-aligned inner column. */
export function SiteSection({
  children,
  className = '',
  containerClassName = '',
  width = '7xl',
  ...props
}: SiteSectionProps) {
  return (
    <View className={className} {...props}>
      <SiteContainer className={containerClassName} width={width}>
        {children}
      </SiteContainer>
    </View>
  );
}
