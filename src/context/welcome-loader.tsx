import { usePathname } from 'expo-router';
import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { usePyoneaWelcomeLoader } from '@/hooks/use-pyonea-welcome-loader';

type WelcomeLoaderContextValue = {
  setHomeDataProgress: (progress: number) => void;
};

const WelcomeLoaderContext = createContext<WelcomeLoaderContextValue | null>(null);

function isHomePathname(pathname: string) {
  return pathname === '/' || pathname === '';
}

export function WelcomeLoaderProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [homeDataProgress, setHomeDataProgress] = useState(0);
  const isHome = isHomePathname(pathname);
  const dataProgress = isHome ? homeDataProgress : 100;

  usePyoneaWelcomeLoader(dataProgress, Platform.OS === 'web');

  const value = useMemo(
    () => ({
      setHomeDataProgress,
    }),
    [],
  );

  return <WelcomeLoaderContext.Provider value={value}>{children}</WelcomeLoaderContext.Provider>;
}

export function useWelcomeLoaderProgress() {
  return useContext(WelcomeLoaderContext);
}
