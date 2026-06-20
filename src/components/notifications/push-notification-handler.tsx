import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useNativeAuth } from '@/context/native-auth';
import { notificationHref } from '@/utils/notification-routing';

const isAndroidExpoGo = () => Platform.OS === 'android' && Constants.appOwnership === 'expo';

export function PushNotificationHandler() {
  const router = useRouter();
  const { user } = useNativeAuth();

  useEffect(() => {
    if (Platform.OS === 'web' || isAndroidExpoGo()) return;

    // We import dynamically to avoid loading expo-notifications on web or Expo Go
    const setupListeners = async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Final safety check in case the dynamic import returns a module that
        // still throws on specific property access in Expo Go
        if (typeof Notifications.addNotificationResponseReceivedListener !== 'function') {
          return;
        }

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          const href = notificationHref(data as any, user?.type);

          if (href) {
            router.push(href);
          }
        });

        return () => subscription.remove();
      } catch (error) {
        // Silently fail in Expo Go environment as per SDK 53+ limitations
        if (!isAndroidExpoGo()) {
          console.warn('Failed to setup push notification listeners:', error);
        }
      }
    };

    const cleanupPromise = setupListeners();
    return () => {
      void cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [router, user?.type]);

  return null;
}
