import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useNativeAuth } from '@/context/native-auth';
import { notificationHref } from '@/utils/notification-routing';

export function PushNotificationHandler() {
  const router = useRouter();
  const { user } = useNativeAuth();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // We import dynamically to avoid loading expo-notifications on web
    const setupListeners = async () => {
      try {
        const Notifications = await import('expo-notifications');

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          // data should match NativeNotification shape for notificationHref
          const href = notificationHref(data as any, user?.type);

          if (href) {
            router.push(href);
          }
        });

        return () => subscription.remove();
      } catch (error) {
        console.warn('Failed to setup push notification listeners:', error);
      }
    };

    const cleanupPromise = setupListeners();
    return () => {
      void cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [router, user?.type]);

  return null;
}
