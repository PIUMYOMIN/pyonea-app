import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as ExpoThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { AnalyticsPageTracker } from '@/components/analytics-page-tracker';
import { AuthDeepLinkHandler } from '@/components/auth-deep-link-handler';
import { NativeSeo } from '@/components/SEO/native-seo';
import { CookieBannerNative } from '@/components/ui/cookie-banner-native';
import { CookieProvider } from '@/context/cookies';
import { CartCountProvider } from '@/context/cart-count-context';
import { NativeAuthProvider } from '@/context/native-auth';
import { AppThemeProvider, useTheme } from '@/context/theme';
import { WishlistProvider } from '@/context/wishlist-context';
import { WelcomeLoaderProvider } from '@/context/welcome-loader';
import '@/i18n';
import '../global.css';

void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { isDark } = useTheme();

  return (
    <ExpoThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <NativeSeo />
      <AnalyticsPageTracker />
      <AuthDeepLinkHandler />
      <Stack screenOptions={{ headerShown: false }} />
      <CookieBannerNative />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ExpoThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'NotoSansMyanmar-Regular': require('@/fonts/NotoSansMyanmar/NotoSansMyanmar-Regular.ttf'),
    'Roboto-Bold': require('@/fonts/Roboto/Roboto-Bold.ttf'),
    'Torus-SemiBold': require('@/fonts/Torus/Torus-SemiBold.ttf'),
  });
  const isWeb = Platform.OS === 'web';
  const appReady = isWeb || fontsLoaded || fontError;

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <AppThemeProvider>
      <NativeAuthProvider>
        <CartCountProvider>
          <WishlistProvider>
            <CookieProvider>
              <WelcomeLoaderProvider>
                <RootStack />
              </WelcomeLoaderProvider>
            </CookieProvider>
          </WishlistProvider>
        </CartCountProvider>
      </NativeAuthProvider>
    </AppThemeProvider>
  );
}
