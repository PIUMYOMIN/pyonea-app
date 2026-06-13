import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

type LazyPageOptions = {
  /** Minimal fallback while the route chunk loads (web only). */
  fallback?: ReactNode;
};

const defaultFallback =
  Platform.OS === 'web' ? (
    <View className="min-h-[40vh] items-center justify-center bg-gray-50 dark:bg-slate-950">
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  ) : null;

/**
 * Lazy-load heavy route screens so the main web bundle stays smaller.
 * Use a matching `*.native.tsx` route file with a direct export on iOS/Android —
 * nested React.lazy + Metro dynamic imports cause "Requiring unknown module" races.
 */
export function lazyRouteScreen<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> } | Record<string, ComponentType<P>>>,
  exportName?: string,
  options?: LazyPageOptions,
) {
  const LazyComponent = lazy(async () => {
    const mod = await factory();
    if ('default' in mod && mod.default) {
      return { default: mod.default };
    }
    if (exportName && exportName in mod) {
      return { default: mod[exportName as keyof typeof mod] };
    }
    throw new Error('lazyRouteScreen: module export not found');
  });

  return function LazyRouteScreen(props: P) {
    return (
      <Suspense fallback={options?.fallback ?? defaultFallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
