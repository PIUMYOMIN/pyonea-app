import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

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

function EmptyState({ filter }: { filter: NotificationFilter }) {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();

  return (
    <View className="items-center rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-12 dark:border-slate-700 dark:bg-slate-800">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-900">
        <Feather name="bell-off" color={isDark ? '#64748b' : '#9ca3af'} size={26} />
      </View>
      <Text className="mt-4 text-center font-sans text-base font-bold text-gray-900 dark:text-slate-100">
        {filter === 'unread'
          ? t('notifications.no_unread')
          : t('notifications.no_notifications')}
      </Text>
      <Text className="mt-2 text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
        Seller order, RFQ, review, and account updates will appear here.
      </Text>
    </View>
  );
}

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
      className={`rounded-2xl border p-4 ${
        unread
          ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
          : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      <View className="flex-row items-start gap-3">
        <Pressable
          onPress={() => onOpen(notification)}
          className="min-w-0 flex-1 flex-row gap-3"
        >
          <View
            className={`h-11 w-11 items-center justify-center rounded-2xl ${
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
                    ? 'font-bold text-gray-950 dark:text-slate-100'
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
          <Pressable
            disabled={busy}
            onPress={() => onDelete(notification)}
            className="h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-white/70 dark:border-red-900 dark:bg-slate-900/50"
          >
            {busy ? <ActivityIndicator color="#ef4444" /> : <Feather name="trash-2" color="#ef4444" size={17} />}
          </Pressable>
          {unread ? (
            <Pressable
              disabled={busy}
              onPress={() => onRead(notification)}
              className="h-11 w-11 items-center justify-center rounded-xl border border-green-200 bg-white/70 dark:border-green-800 dark:bg-slate-900/50"
            >
              {busy ? <ActivityIndicator color="#16a34a" /> : <Feather name="check" color="#16a34a" size={17} />}
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function SellerNotificationsNative() {
  const router = useRouter();
  const { t } = useAppTranslation();
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

  const title = useMemo(
    () => t('notifications.panel_title', { defaultValue: 'Notifications' }),
    [t],
  );

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
      <View className="rounded-2xl bg-green-600 p-4 dark:bg-emerald-700 sm:p-6">
        <View className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-xl font-black text-white sm:text-2xl">
              {title}
            </Text>
            <Text className="mt-1 font-sans text-sm leading-6 text-green-50">
              Track store, order, RFQ, review, and subscription updates in one place.
            </Text>
          </View>
          <View className="self-start rounded-2xl bg-white/15 px-4 py-3">
            <Text className="font-sans text-2xl font-black text-white">{unreadCount}</Text>
            <Text className="font-sans text-xs font-semibold text-green-50">Unread</Text>
          </View>
        </View>
      </View>

      <View className="gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {(['all', 'unread'] as const).map((item) => {
              const active = filter === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setFilter(item)}
                  className={`min-h-10 rounded-xl px-4 py-2 ${
                    active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-900'
                  }`}
                >
                  <Text
                    className={`font-sans text-sm font-bold ${
                      active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
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
        </ScrollView>

        <View className="gap-2 sm:flex-row">
          <Pressable
            disabled={unreadCount === 0}
            onPress={() => void markEveryNotificationRead()}
            className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-green-200 px-4 disabled:opacity-50 dark:border-green-800"
          >
            <Feather name="check-circle" color="#16a34a" size={16} />
            <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
              {t('notifications.mark_all_read')}
            </Text>
          </Pressable>
          <Pressable
            disabled={items.length === 0}
            onPress={() => setConfirmClear((current) => !current)}
            className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 px-4 disabled:opacity-50 dark:border-red-900"
          >
            <Feather name="trash-2" color="#ef4444" size={16} />
            <Text className="font-sans text-sm font-bold text-red-600 dark:text-red-300">
              {t('notifications.clear_all')}
            </Text>
          </Pressable>
        </View>

        {confirmClear ? (
          <View className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
            <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">
              {t('notifications.clear_confirm')}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => setConfirmClear(false)}
                className="min-h-10 flex-1 items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600"
              >
                <Text className="font-sans text-xs font-bold text-gray-600 dark:text-slate-300">
                  {t('notifications.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void clearEveryNotification()}
                className="min-h-10 flex-1 items-center justify-center rounded-lg bg-red-600"
              >
                <Text className="font-sans text-xs font-bold text-white">
                  {t('notifications.clear_confirm_yes')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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

      {loading ? (
        <View className="items-center rounded-2xl border border-gray-100 bg-white py-16 dark:border-slate-700 dark:bg-slate-800">
          <ActivityIndicator color="#16a34a" size="large" />
          <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('notifications.loading')}
          </Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <View className="gap-3">
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
              className="min-h-12 items-center justify-center rounded-xl border border-green-200 bg-white px-4 dark:border-green-800 dark:bg-slate-800"
            >
              <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                {loadingMore ? t('notifications.loading') : t('notifications.load_more')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
