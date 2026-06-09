import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as ExpoThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AnalyticsPageTracker } from '@/components/analytics-page-tracker';
import { AuthDeepLinkHandler } from '@/components/auth-deep-link-handler';
import { NativeSeo } from '@/components/SEO/native-seo';
import { CookieBannerNative } from '@/components/ui/cookie-banner-native';
import { CookieProvider } from '@/context/cookies';
import { NativeAuthProvider } from '@/context/native-auth';
import { AppThemeProvider, useTheme } from '@/context/theme';
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

function RootLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-6">
      <View className="items-center rounded-2xl border border-gray-100 bg-white px-8 py-7 shadow-sm">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <ActivityIndicator color="#16a34a" size="large" />
        </View>
        <Text className="font-brand text-2xl text-green-600">
          Pyonea<Text className="font-sans text-gray-400">.com</Text>
        </Text>
        <Text className="mt-2 text-center font-sans text-sm text-gray-500">
          Preparing marketplace...
        </Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'NotoSansMyanmar-Regular': require('@/fonts/NotoSansMyanmar/NotoSansMyanmar-Regular.ttf'),
    'Roboto-Bold': require('@/fonts/Roboto/Roboto-Bold.ttf'),
    'Torus-SemiBold': require('@/fonts/Torus/Torus-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return <RootLoading />;
  }

  return (
    <AppThemeProvider>
      <NativeAuthProvider>
        <CookieProvider>
          <RootStack />
        </CookieProvider>
      </NativeAuthProvider>
    </AppThemeProvider>
  );
}
