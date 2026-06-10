import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

type WebLoadMoreSentinelProps = {
  onVisible: () => void;
  rootMargin?: string;
};

/**
 * Web-only infinite-scroll trigger using IntersectionObserver (passive, no scroll handlers).
 */
export function WebLoadMoreSentinel({
  onVisible,
  rootMargin = '320px',
}: WebLoadMoreSentinelProps) {
  const ref = useRef<View>(null);
  const armedRef = useRef(true);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof IntersectionObserver === 'undefined') return;

    const node = ref.current as unknown as HTMLElement | null;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = Boolean(entries[0]?.isIntersecting);
        if (visible && armedRef.current) {
          armedRef.current = false;
          onVisible();
        } else if (!visible) {
          armedRef.current = true;
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible, rootMargin]);

  if (Platform.OS !== 'web') return null;

  return <View ref={ref} className="h-px w-full" accessibilityElementsHidden importantForAccessibility="no" />;
}
