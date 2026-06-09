import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import {
  clearNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NativeNotification,
} from '@/utils/native-api';

type NotificationFilter = 'all' | 'unread';

const PER_PAGE = 12;

const formatRelativeTime = (
  value: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('notifications.just_now');

  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return t('notifications.just_now');
  if (diff < 3600) return t('notifications.minutes_ago', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('notifications.hours_ago', { count: Math.floor(diff / 3600) });
  return t('notifications.days_ago', { count: Math.floor(diff / 86400) });
};

const notificationHref = (notification: NativeNotification): Href | null => {
  if (notification.url) return notification.url as Href;
  if (notification.type === 'new_order') return '/seller/dashboard?tab=orders' as Href;
  if (notification.type.startsWith('subscription_')) {
    return '/seller/dashboard?tab=subscription' as Href;
  }
  if (notification.type.startsWith('rfq_')) return '/seller/dashboard?tab=rfq' as Href;
  if (notification.orderNumber && notification.type.includes('delivery')) {
    return `/track-order?order=${encodeURIComponent(notification.orderNumber)}` as Href;
  }
  if (notification.orderNumber || notification.orderId) {
    return '/seller/dashboard?tab=orders' as Href;
  }
  return null;
};

function NotificationRow({
  notification,
  busy,
  onOpen,
  onRead,
  onDelete,
}: {
  notification: NativeNotification;
  busy: boolean;
  onOpen: (notification: NativeNotification) => void;
  onRead: (notification: NativeNotification) => void;
  onDelete: (notification: NativeNotification) => void;
}) {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const unread = !notification.readAt;
  const href = notificationHref(notification);

  return (
    <View
      className={`border-b border-gray-100 p-4 dark:border-slate-700 ${
        unread
          ? 'bg-green-50/70 dark:bg-green-950/20'
          : 'bg-white dark:bg-slate-800'
      }`}
    >
      <View className="flex-row items-start gap-3">
        <Pressable
          onPress={() => onOpen(notification)}
          className="min-w-0 flex-1 flex-row gap-3"
        >
          <View
            className={`h-10 w-10 items-center justify-center rounded-full ${
              unread ? 'bg-white dark:bg-slate-900' : 'bg-gray-100 dark:bg-slate-900'
            }`}
          >
            <Feather
              name={href ? 'external-link' : unread ? 'bell' : 'check-circle'}
              color={unread ? '#16a34a' : isDark ? '#94a3b8' : '#94a3b8'}
              size={18}
            />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              {unread ? <View className="h-2 w-2 rounded-full bg-green-500" /> : null}
              <Text
                className={`min-w-0 flex-1 font-sans text-sm leading-5 ${
                  unread
                    ? 'font-semibold text-gray-950 dark:text-slate-100'
                    : 'font-medium text-gray-700 dark:text-slate-300'
                }`}
              >
                {notification.message || t('notifications.new_notification')}
              </Text>
            </View>
            <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                {formatRelativeTime(notification.createdAt, t)}
              </Text>
              {notification.orderNumber ? (
                <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                  {t('notifications.order_number', { number: notification.orderNumber })}
                </Text>
              ) : null}
              <Text className="font-sans text-xs capitalize text-gray-400 dark:text-slate-500">
                {notification.type.replaceAll('_', ' ')}
              </Text>
            </View>
          </View>
        </Pressable>

        <View className="items-end gap-2">
          {unread ? (
            <Pressable
              disabled={busy}
              onPress={() => onRead(notification)}
              className="h-9 w-9 items-center justify-center rounded-lg"
            >
              {busy ? (
                <ActivityIndicator color="#16a34a" />
              ) : (
                <Feather name="check-circle" color="#16a34a" size={16} />
              )}
            </Pressable>
          ) : null}
          <Pressable
            disabled={busy}
            onPress={() => onDelete(notification)}
            className="h-9 w-9 items-center justify-center rounded-lg"
          >
            {busy ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Feather name="trash-2" color="#ef4444" size={15} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function SellerNotificationsNative() {
  const router = useRouter();
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const [items, setItems] = useState<NativeNotification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyIds, setBusyIds] = useState<(string | number)[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(
    async (targetPage = 1, reset = true, signal?: AbortSignal) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');

      try {
        const result = await fetchNotifications(
          { page: targetPage, perPage: PER_PAGE, unread: filter === 'unread' },
          signal,
        );
        setItems((current) =>
          reset ? result.notifications : [...current, ...result.notifications],
        );
        setUnreadCount(result.unreadCount);
        setPage(result.currentPage);
        setHasMore(result.currentPage < result.lastPage);
      } catch (loadError) {
        if (!signal?.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load notifications.');
          if (reset) setItems([]);
        }
      } finally {
        if (reset) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [filter],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void loadNotifications(1, true, controller.signal);
    }, 0);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [loadNotifications]);

  const markRead = async (notification: NativeNotification) => {
    if (notification.readAt || busyIds.includes(notification.id)) return;
    setBusyIds((current) => [...current, notification.id]);
    try {
      await markNotificationRead(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: item.readAt || new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } finally {
      setBusyIds((current) => current.filter((id) => id !== notification.id));
    }
  };

  const openNotification = async (notification: NativeNotification) => {
    const href = notificationHref(notification);
    if (!notification.readAt) await markRead(notification);
    if (href) router.push(href);
  };

  const removeNotification = async (notification: NativeNotification) => {
    setBusyIds((current) => [...current, notification.id]);
    try {
      await deleteNotification(notification.id).catch(() => undefined);
      setItems((current) => current.filter((item) => item.id !== notification.id));
      if (!notification.readAt) setUnreadCount((current) => Math.max(0, current - 1));
    } finally {
      setBusyIds((current) => current.filter((id) => id !== notification.id));
    }
  };

  const markEveryNotificationRead = async () => {
    await markAllNotificationsRead();
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
    );
    setUnreadCount(0);
  };

  const clearEveryNotification = async () => {
    await clearNotifications().catch(() => undefined);
    setItems([]);
    setUnreadCount(0);
    setConfirmClear(false);
  };

  return (
    <View className="w-full gap-4">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
          <Feather
            name="bell"
            color={unreadCount > 0 ? '#16a34a' : isDark ? '#94a3b8' : '#6b7280'}
            size={20}
          />
          <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
            {t('notifications.panel_title', { defaultValue: 'Notifications' })}
          </Text>
          {unreadCount > 0 ? (
            <View className="rounded-full bg-green-600 px-2 py-0.5">
              <Text className="font-sans text-xs font-semibold text-white">{unreadCount}</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-2">
          {unreadCount > 0 ? (
            <Pressable
              onPress={() => void markEveryNotificationRead()}
              className="min-h-9 flex-row items-center rounded-lg border border-green-200 px-3 dark:border-green-800"
            >
              <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                {t('notifications.mark_all_read')}
              </Text>
            </Pressable>
          ) : null}
          {items.length > 0 ? (
            <Pressable
              onPress={() => setConfirmClear(true)}
              className="min-h-9 flex-row items-center rounded-lg border border-red-200 px-3 dark:border-red-900"
            >
              <Text className="font-sans text-xs font-semibold text-red-600 dark:text-red-300">
                {t('notifications.clear_all')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {confirmClear ? (
        <View className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
          <Feather name="alert-triangle" color="#ef4444" size={18} />
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">
              {t('notifications.clear_confirm')}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => setConfirmClear(false)}
                className="min-h-9 flex-1 items-center justify-center rounded-lg border border-gray-300 px-3 dark:border-slate-600"
              >
                <Text className="font-sans text-xs font-bold text-gray-600 dark:text-slate-300">
                  {t('notifications.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void clearEveryNotification()}
                className="min-h-9 flex-1 items-center justify-center rounded-lg bg-red-600 px-3"
              >
                <Text className="font-sans text-xs font-bold text-white">
                  {t('notifications.clear_confirm_yes')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View className="flex-row self-start rounded-xl bg-gray-100 p-1 dark:bg-slate-700">
        {(['all', 'unread'] as const).map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              className={`min-h-9 rounded-lg px-4 py-2 ${
                active ? 'bg-white shadow-sm dark:bg-slate-600' : ''
              }`}
            >
              <Text
                className={`font-sans text-sm font-semibold ${
                  active
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-500 dark:text-slate-400'
                }`}
              >
                {item === 'all'
                  ? t('notifications.filter_all')
                  : `${t('notifications.filter_unread')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Pressable
          onPress={() => void loadNotifications(1, true)}
          className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40"
        >
          <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">
            {error}
          </Text>
          <Text className="mt-1 font-sans text-xs text-red-600 dark:text-red-400">
            Tap to retry.
          </Text>
        </Pressable>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#16a34a" size="large" />
            <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('notifications.loading')}
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View className="items-center py-16">
            <Feather name="bell-off" color={isDark ? '#64748b' : '#9ca3af'} size={32} />
            <Text className="mt-3 text-center font-sans text-sm text-gray-400 dark:text-slate-500">
              {filter === 'unread'
                ? t('notifications.no_unread')
                : t('notifications.no_notifications')}
            </Text>
          </View>
        ) : (
          <>
            {items.map((notification) => (
              <NotificationRow
                key={String(notification.id)}
                notification={notification}
                busy={busyIds.includes(notification.id)}
                onOpen={(item) => void openNotification(item)}
                onRead={(item) => void markRead(item)}
                onDelete={(item) => void removeNotification(item)}
              />
            ))}

            {hasMore ? (
              <Pressable
                disabled={loadingMore}
                onPress={() => void loadNotifications(page + 1, false)}
                className="min-h-12 items-center justify-center border-t border-gray-100 px-4 dark:border-slate-700"
              >
                <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                  {loadingMore ? t('notifications.loading') : t('notifications.load_more')}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
