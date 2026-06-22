import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as ExpoThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { AnalyticsPageTracker } from "@/components/analytics-page-tracker";
import { AuthDeepLinkHandler } from "@/components/auth-deep-link-handler";
import { PushNotificationHandler } from "@/components/notifications/push-notification-handler";
import { NativeSeo } from "@/components/SEO/native-seo";
import { CookieBannerNative } from "@/components/ui/cookie-banner-native";
import { CartCountProvider } from "@/context/cart-count-context";
import { CookieProvider } from "@/context/cookies";
import { NativeAuthProvider } from "@/context/native-auth";
import { AppThemeProvider, useTheme } from "@/context/theme";
import { WelcomeLoaderProvider } from "@/context/welcome-loader";
import { WishlistProvider } from "@/context/wishlist-context";
import "@/i18n";
import { hydrateLanguageFromStorage, RouteLanguageSync } from "@/i18n";
import "../global.css";

void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { isDark } = useTheme();

  return (
    <ExpoThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <RouteLanguageSync />
      <NativeSeo />
      <AnalyticsPageTracker />
      <AuthDeepLinkHandler />
      <PushNotificationHandler />
      <CookieBannerNative />
      <StatusBar style={isDark ? "light" : "dark"} />
    </ExpoThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "NotoSansMyanmar-Regular": require("@/fonts/NotoSansMyanmar/NotoSansMyanmar-Regular.woff2"),
    "Torus-SemiBold": require("@/fonts/Torus/Torus-SemiBold.woff2"),
  });
  const isWeb = Platform.OS === "web";
  const [languageReady, setLanguageReady] = useState(isWeb);
  const fontsReady = isWeb || fontsLoaded || fontError;
  const appReady = fontsReady && languageReady;

  useEffect(() => {
    if (isWeb) return;
    void hydrateLanguageFromStorage().finally(() => setLanguageReady(true));
  }, [isWeb]);

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
