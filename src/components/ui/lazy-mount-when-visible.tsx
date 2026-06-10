import { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Platform, View, type ViewProps } from 'react-native';

type LazyMountWhenVisibleProps = PropsWithChildren<
  ViewProps & {
    enabled?: boolean;
    placeholder: React.ReactNode;
    rootMargin?: string;
  }
>;

export function LazyMountWhenVisible({
  children,
  enabled = Platform.OS === 'web',
  placeholder,
  rootMargin = '480px 0px',
  className,
  style,
  ...props
}: LazyMountWhenVisibleProps) {
  const [visible, setVisible] = useState(!enabled);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (!enabled || visible) return;

    const node = containerRef.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin, visible]);

  return (
    <View ref={containerRef} className={className} style={style} {...props}>
      {visible ? children : placeholder}
    </View>
  );
}
