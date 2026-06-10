import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

import { ADMIN_DASHBOARD_PATH } from '@/dashboards/admin/config';
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

const PER_PAGE = 20;
const POLL_MS = 30_000;

type NotificationFilter = 'all' | 'unread';

const formatRelativeTime = (value: string, t: ReturnType<typeof useAppTranslation>['t']) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('notifications.just_now');

  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return t('notifications.just_now');
  if (diff < 3600) return t('notifications.minutes_ago', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('notifications.hours_ago', { count: Math.floor(diff / 3600) });
  if (diff < 604800) return t('notifications.days_ago', { count: Math.floor(diff / 86400) });
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const notificationIcon = (
  type: string,
): { name: keyof typeof Feather.glyphMap; color: string } => {
  switch (type) {
    case 'order_placed':
    case 'order_status_changed':
    case 'new_order':
      return { name: 'shopping-bag', color: '#3b82f6' };
    case 'delivery_status_changed':
    case 'platform_logistics_requested':
    case 'order_delivered_thank_you':
      return { name: 'truck', color: '#f97316' };
    case 'product_review':
      return { name: 'star', color: '#eab308' };
    case 'seller_approved':
      return { name: 'check-circle', color: '#16a34a' };
    case 'seller_rejected':
      return { name: 'x-circle', color: '#ef4444' };
    case 'subscription_request':
    case 'subscription_approved':
      return { name: 'check-circle', color: '#16a34a' };
    case 'subscription_rejected':
      return { name: 'x-circle', color: '#ef4444' };
    case 'rfq_created':
    case 'rfq_quote_received':
    case 'rfq_quote_accepted':
    case 'rfq_quote_rejected':
      return { name: 'info', color: '#6366f1' };
    case 'welcome':
      return { name: 'bell', color: '#4ade80' };
    default:
      return { name: 'info', color: '#9ca3af' };
  }
};

const adminNotificationHref = (notification: NativeNotification): Href | null => {
  if (notification.url) return notification.url as Href;

  const type = notification.type;
  if (type === 'new_order') return `${ADMIN_DASHBOARD_PATH}?tab=orders` as Href;
  if (type === 'subscription_request' || type.startsWith('subscription_')) {
    return `${ADMIN_DASHBOARD_PATH}?tab=subscriptions` as Href;
  }
  if (type === 'platform_logistics_requested') {
    return `${ADMIN_DASHBOARD_PATH}?tab=platform-logistics` as Href;
  }
  if (type === 'seller_approved' || type === 'seller_rejected') {
    return `${ADMIN_DASHBOARD_PATH}?tab=sellers` as Href;
  }
  if (type.startsWith('rfq_')) return `${ADMIN_DASHBOARD_PATH}?tab=rfq` as Href;
  if (type === 'product_review') return `${ADMIN_DASHBOARD_PATH}?tab=reviews` as Href;
  if (notification.orderNumber && type.includes('delivery')) {
    return `/track-order?order=${encodeURIComponent(notification.orderNumber)}` as Href;
  }
  if (notification.orderNumber || notification.orderId) {
    return `${ADMIN_DASHBOARD_PATH}?tab=orders` as Href;
  }
  return null;
};

export function AdminNotificationsNative() {
  const router = useRouter();
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const [items, setItems] = useState<NativeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busyIds, setBusyIds] = useState<(string | number)[]>([]);

  const loadPage = useCallback(
    async (targetPage = 1, reset = true, signal?: AbortSignal) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const result = await fetchNotifications(
          { page: targetPage, perPage: PER_PAGE, unread: filter === 'unread' },
          signal,
        );
        setItems((current) => (reset ? result.notifications : [...current, ...result.notifications]));
        setPage(result.currentPage);
        setHasMore(result.currentPage < result.lastPage);
        setUnreadCount(result.unreadCount);
      } catch {
        if (reset) setItems([]);
      } finally {
        if (reset) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPage(1, true, controller.signal);
    return () => controller.abort();
  }, [loadPage]);

  useEffect(() => {
    const id = setInterval(() => void loadPage(1, true), POLL_MS);
    return () => clearInterval(id);
  }, [loadPage]);

  const markRead = async (notification: NativeNotification) => {
    if (notification.readAt || busyIds.includes(notification.id)) return;
    setBusyIds((current) => [...current, notification.id]);
    try {
      await markNotificationRead(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } finally {
      setBusyIds((current) => current.filter((id) => id !== notification.id));
    }
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
    );
    setUnreadCount(0);
  };

  const removeNotification = async (notification: NativeNotification) => {
    await deleteNotification(notification.id).catch(() => undefined);
    setItems((current) => current.filter((item) => item.id !== notification.id));
    if (!notification.readAt) setUnreadCount((count) => Math.max(0, count - 1));
  };

  const clearAll = async () => {
    await clearNotifications().catch(() => undefined);
    setItems([]);
    setConfirmClear(false);
    setUnreadCount(0);
  };

  const openNotification = async (notification: NativeNotification) => {
    const href = adminNotificationHref(notification);
    if (!notification.readAt) await markRead(notification);
    if (href) router.push(href);
  };

  const visibleItems = filter === 'unread' ? items.filter((item) => !item.readAt) : items;

  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Feather name={unreadCount > 0 ? 'bell' : 'bell'} size={22} color={unreadCount > 0 ? '#16a34a' : '#64748b'} />
          <View>
            <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
              {t('notifications.panel_title', 'Notifications')}
            </Text>
            {unreadCount > 0 ? (
              <Text className="font-sans text-sm text-green-700 dark:text-green-400">
                {t('admin.notifications.unreadCount', '{{count}} unread', { count: unreadCount })}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {unreadCount > 0 ? (
            <Pressable onPress={() => void markAllRead()} className="rounded-lg border border-green-200 px-3 py-2 dark:border-green-700">
              <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                {t('notifications.mark_all_read', 'Mark all read')}
              </Text>
            </Pressable>
          ) : null}
          {items.length > 0 ? (
            <Pressable
              onPress={() => setConfirmClear(true)}
              className="rounded-lg border border-red-200 px-3 py-2 dark:border-red-800">
              <Text className="font-sans text-xs font-semibold text-red-600 dark:text-red-300">
                {t('notifications.clear_all', 'Clear all')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => void loadPage(1, true)} className="rounded-lg p-2">
            <Feather name="refresh-cw" size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
          </Pressable>
        </View>
      </View>

      {confirmClear ? (
        <View className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-triangle" size={18} color="#ef4444" />
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-sm font-medium text-red-700 dark:text-red-300">
              {t('notifications.clear_confirm', 'Delete all notifications? This cannot be undone.')}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => setConfirmClear(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 dark:border-slate-600">
                <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-300">
                  {t('notifications.cancel', 'Cancel')}
                </Text>
              </Pressable>
              <Pressable onPress={() => void clearAll()} className="rounded-lg bg-red-600 px-3 py-1.5">
                <Text className="font-sans text-xs font-semibold text-white">
                  {t('notifications.clear_confirm_yes', 'Clear all')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View className="self-start flex-row rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
        {(['all', 'unread'] as const).map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              className={`rounded-lg px-4 py-2 ${active ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}>
              <Text
                className={`font-sans text-sm font-medium ${
                  active ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'
                }`}>
                {item === 'all'
                  ? t('notifications.filter_all', 'All')
                  : `${t('notifications.filter_unread', 'Unread')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <View className="gap-0 divide-y divide-gray-50 dark:divide-slate-700">
            {[1, 2, 3, 4, 5].map((item) => (
              <View key={item} className="flex-row gap-3 p-4">
                <View className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-700" />
                <View className="flex-1 gap-2">
                  <View className="h-3 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
                  <View className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
                </View>
              </View>
            ))}
          </View>
        ) : visibleItems.length === 0 ? (
          <View className="items-center px-6 py-16">
            <Feather name="bell-off" size={40} color="#94a3b8" />
            <Text className="mt-3 font-sans text-sm text-gray-400 dark:text-slate-500">
              {filter === 'unread'
                ? t('notifications.no_unread', 'No unread notifications')
                : t('notifications.no_notifications', 'No notifications yet')}
            </Text>
          </View>
        ) : (
          <View>
            {visibleItems.map((notification) => {
              const unread = !notification.readAt;
              const href = adminNotificationHref(notification);
              const icon = notificationIcon(notification.type);
              const marking = busyIds.includes(notification.id);

              return (
                <View
                  key={String(notification.id)}
                  className={`flex-row gap-3 border-b border-gray-50 p-4 dark:border-slate-700 ${
                    unread ? 'bg-green-50/60 dark:bg-green-900/10' : ''
                  }`}>
                  <Pressable
                    onPress={() => void openNotification(notification)}
                    className="min-w-0 flex-1 flex-row gap-3">
                    <View
                      className={`mt-0.5 h-9 w-9 items-center justify-center rounded-full ${
                        unread ? 'bg-white shadow-sm dark:bg-slate-700' : 'bg-gray-100 dark:bg-slate-700'
                      }`}>
                      <Feather name={icon.name} size={16} color={icon.color} />
                    </View>

                    <View className="min-w-0 flex-1">
                      <Text
                        className={`font-sans text-sm leading-5 ${
                          unread
                            ? 'font-semibold text-gray-900 dark:text-slate-100'
                            : 'text-gray-600 dark:text-slate-400'
                        }`}>
                        {notification.message || t('notifications.new_notification', 'New notification')}
                      </Text>
                      {notification.orderNumber ? (
                        <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500">
                          {t('notifications.order_number', 'Order #{{number}}', {
                            number: notification.orderNumber,
                          })}
                        </Text>
                      ) : null}
                      <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">
                        {formatRelativeTime(notification.createdAt, t)}
                      </Text>
                      {href ? (
                        <Text className="mt-1 font-sans text-xs font-medium text-green-700 dark:text-green-400">
                          {t('admin.notifications.openRelated', 'Tap to open related page')}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>

                  <View className="items-center gap-1">
                    {unread ? (
                      <Pressable
                        disabled={marking}
                        onPress={() => void markRead(notification)}
                        className="h-8 w-8 items-center justify-center rounded-lg">
                        {marking ? (
                          <ActivityIndicator color="#16a34a" size="small" />
                        ) : (
                          <Feather name="check-circle" size={16} color="#16a34a" />
                        )}
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => void removeNotification(notification)}
                      className="h-8 w-8 items-center justify-center rounded-lg">
                      <Feather name="trash-2" size={15} color="#ef4444" />
                    </Pressable>
                    {unread ? <View className="mt-1 h-2 w-2 rounded-full bg-green-500" /> : null}
                  </View>
                </View>
              );
            })}

            {hasMore ? (
              <Pressable
                disabled={loadingMore}
                onPress={() => void loadPage(page + 1, false)}
                className="items-center py-4">
                {loadingMore ? (
                  <ActivityIndicator color="#16a34a" />
                ) : (
                  <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                    {t('notifications.load_more', 'Load more')}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}
