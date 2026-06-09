import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { apiDelete, apiPost, ApiError } from '@/utils/native-api';

type NotificationsModule = typeof import('expo-notifications');

type PushTokenRegistration = {
  token: string;
  provider: 'expo';
  platform: typeof Platform.OS;
  device_name?: string;
};

const PUSH_TOKEN_ENDPOINTS = ['/push-tokens', '/device-tokens', '/notifications/push-tokens'];
let lastRegisteredToken: string | null = null;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let notificationHandlerConfigured = false;

const isAndroidExpoGo = () => Platform.OS === 'android' && Constants.appOwnership === 'expo';

const loadNotificationsModule = async () => {
  if (Platform.OS === 'web' || isAndroidExpoGo()) return null;

  notificationsModulePromise ??= import('expo-notifications').catch((error) => {
    console.warn('Push notifications unavailable in this runtime:', error);
    return null;
  });

  const Notifications = await notificationsModulePromise;
  if (!Notifications) return null;

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return Notifications;
};

const getProjectId = () =>
  Constants.easConfig?.projectId ||
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.expoConfig?.extra?.projectId;

const ensureAndroidChannel = async (Notifications: NotificationsModule) => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Pyonea notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#16a34a',
  });
};

const registerTokenWithApi = async (payload: PushTokenRegistration) => {
  for (const endpoint of PUSH_TOKEN_ENDPOINTS) {
    try {
      await apiPost(endpoint, payload);
      return true;
    } catch (error) {
      if (error instanceof ApiError && [404, 405].includes(error.status)) continue;
      throw error;
    }
  }

  return false;
};

export async function registerForPushNotifications() {
  if (Platform.OS === 'web' || !Device.isDevice || isAndroidExpoGo()) return null;

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return null;

  await ensureAndroidChannel(Notifications);

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = getProjectId();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  const token = tokenResponse.data;

  if (!token || token === lastRegisteredToken) return token || null;

  await registerTokenWithApi({
    token,
    provider: 'expo',
    platform: Platform.OS,
    device_name: Device.deviceName || Device.modelName || undefined,
  });

  lastRegisteredToken = token;
  return token;
}

export async function unregisterPushNotifications() {
  if (!lastRegisteredToken) return;

  const token = lastRegisteredToken;
  lastRegisteredToken = null;

  for (const endpoint of PUSH_TOKEN_ENDPOINTS) {
    try {
      await apiDelete(`${endpoint}/${encodeURIComponent(token)}`);
      return;
    } catch (error) {
      if (error instanceof ApiError && [404, 405].includes(error.status)) continue;
      return;
    }
  }
}
