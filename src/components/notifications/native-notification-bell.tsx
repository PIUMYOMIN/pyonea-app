import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';

import { useNativeAuth } from '@/context/native-auth';
import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import { notificationHref } from '@/utils/notification-routing';
import {
  clearNotifications,
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NativeNotification,
} from '@/utils/native-api';

const PER_PAGE = 12;
const POLL_MS = 15_000;

type NotificationFilter = 'all' | 'unread';

const formatRelativeTime = (value: string, t: (key: string, options?: Record<string, unknown>) => string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('notifications.just_now');

  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return t('notifications.just_now');
  if (diff < 3600) return t('notifications.minutes_ago', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('notifications.hours_ago', { count: Math.floor(diff / 3600) });
  return t('notifications.days_ago', { count: Math.floor(diff / 86400) });
};

function NotificationPanel({
  visible,
  onClose,
  unreadCount,
  onUnreadCountChange,
}: {
  visible: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}) {
  const router = useRouter();
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const { user } = useNativeAuth();
  const [items, setItems] = useState<NativeNotification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busyIds, setBusyIds] = useState<(string | number)[]>([]);

  const loadNotifications = useCallback(
    async (targetPage = 1, reset = true, signal?: AbortSignal) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const result = await fetchNotifications(
          { page: targetPage, perPage: PER_PAGE, unread: filter === 'unread' },
          signal
        );
        setItems((current) =>
          reset ? result.notifications : [...current, ...result.notifications]
        );
        setPage(result.currentPage);
        setHasMore(result.currentPage < result.lastPage);
        onUnreadCountChange(result.unreadCount);
      } catch {
        if (reset) setItems([]);
      } finally {
        if (reset) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [filter, onUnreadCountChange]
  );

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => void loadNotifications(1, true, controller.signal), 0);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [loadNotifications, visible]);

  const markRead = async (notification: NativeNotification) => {
    if (notification.readAt || busyIds.includes(notification.id)) return;
    setBusyIds((current) => [...current, notification.id]);
    try {
      await markNotificationRead(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
      onUnreadCountChange(Math.max(0, unreadCount - 1));
    } finally {
      setBusyIds((current) => current.filter((id) => id !== notification.id));
    }
  };

  const openNotification = async (notification: NativeNotification) => {
    const href = notificationHref(notification, user?.type);
    if (!href) {
      await markRead(notification);
      return;
    }
    if (!notification.readAt) await markRead(notification);
    onClose();
    router.push(href);
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
    );
    onUnreadCountChange(0);
  };

  const removeNotification = async (notification: NativeNotification) => {
    await deleteNotification(notification.id).catch(() => undefined);
    setItems((current) => current.filter((item) => item.id !== notification.id));
    if (!notification.readAt) onUnreadCountChange(Math.max(0, unreadCount - 1));
  };

  const clearAll = async () => {
    await clearNotifications().catch(() => undefined);
    setItems([]);
    setConfirmClear(false);
    onUnreadCountChange(0);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/25 px-3 py-16 sm:items-end sm:px-6" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="max-h-[80vh] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:max-w-md">
          <View className="border-b border-gray-100 p-4 dark:border-slate-800">
            <View className="flex-row flex-wrap gap-2">
              {unreadCount > 0 ? (
                <Pressable onPress={markAllRead} className="rounded-lg border border-green-200 px-2.5 py-1 dark:border-green-700">
                  <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                    {t('notifications.mark_all_read')}
                  </Text>
                </Pressable>
              ) : null}
              {items.length > 0 ? (
                <Pressable onPress={() => setConfirmClear(true)} className="rounded-lg border border-red-200 px-2.5 py-1 dark:border-red-800">
                  <Text className="font-sans text-xs font-semibold text-red-600 dark:text-red-300">
                    {t('notifications.clear_all')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {confirmClear ? (
              <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
                <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">
                  {t('notifications.clear_confirm')}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <Pressable onPress={() => setConfirmClear(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 dark:border-slate-600">
                    <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-300">
                      {t('notifications.cancel')}
                    </Text>
                  </Pressable>
                  <Pressable onPress={clearAll} className="rounded-lg bg-red-600 px-3 py-1.5">
                    <Text className="font-sans text-xs font-semibold text-white">
                      {t('notifications.clear_confirm_yes')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View className="mt-3 flex-row self-start rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
              {(['all', 'unread'] as const).map((item) => {
                const active = filter === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setFilter(item)}
                    className={`rounded-lg px-3 py-1.5 ${active ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}>
                    <Text
                      className={`font-sans text-xs font-semibold ${
                        active ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-slate-400'
                      }`}>
                      {item === 'all'
                        ? t('notifications.filter_all')
                        : `${t('notifications.filter_unread')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ScrollView className="max-h-[52vh]" contentContainerClassName="py-1">
            {loading ? (
              <View className="items-center py-12">
                <ActivityIndicator color="#16a34a" />
                <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('notifications.loading')}
                </Text>
              </View>
            ) : items.length === 0 ? (
              <View className="items-center py-12">
                <Feather name="bell-off" color={isDark ? '#475569' : '#cbd5e1'} size={34} />
                <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
                  {filter === 'unread'
                    ? t('notifications.no_unread')
                    : t('notifications.no_notifications')}
                </Text>
              </View>
            ) : (
              <View>
                {items.map((notification) => {
                  const unread = !notification.readAt;
                  const href = notificationHref(notification, user?.type);
                  return (
                    <Pressable
                      key={String(notification.id)}
                      onPress={() => void openNotification(notification)}
                      className={`flex-row gap-3 border-b border-gray-50 p-4 dark:border-slate-800 ${
                        unread ? 'bg-green-50/70 dark:bg-green-950/20' : ''
                      }`}>
                      <View className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${unread ? 'bg-white dark:bg-slate-800' : 'bg-gray-100 dark:bg-slate-800'}`}>
                        <Feather
                          name={href ? 'external-link' : 'bell'}
                          color={unread ? '#16a34a' : isDark ? '#94a3b8' : '#9ca3af'}
                          size={15}
                        />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          className={`font-sans text-sm leading-5 ${
                            unread
                              ? 'font-semibold text-gray-950 dark:text-slate-100'
                              : 'text-gray-600 dark:text-slate-400'
                          }`}>
                          {notification.message || t('notifications.new_notification')}
                        </Text>
                        {notification.orderNumber ? (
                          <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500">
                            {t('notifications.order_number', { number: notification.orderNumber })}
                          </Text>
                        ) : null}
                        <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">
                          {formatRelativeTime(notification.createdAt, t)}
                        </Text>
                      </View>
                      <View className="items-center gap-1">
                        {unread ? (
                          <Pressable
                            onPress={(event) => {
                              event.stopPropagation();
                              void markRead(notification);
                            }}
                            className="h-8 w-8 items-center justify-center rounded-lg">
                            <Feather name="check-circle" color="#16a34a" size={16} />
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            void removeNotification(notification);
                          }}
                          className="h-8 w-8 items-center justify-center rounded-lg">
                          <Feather name="trash-2" color="#ef4444" size={15} />
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}

                {hasMore ? (
                  <Pressable
                    onPress={() => void loadNotifications(page + 1, false)}
                    disabled={loadingMore}
                    className="items-center py-4">
                    <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                      {loadingMore ? t('notifications.loading') : t('notifications.load_more')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function NativeNotificationBell({
  compact = false,
  iconSize,
}: {
  compact?: boolean;
  iconSize?: number;
}) {
  const { user } = useNativeAuth();
  const { isDark } = useTheme();
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const badgeText = useMemo(() => (unreadCount > 99 ? '99+' : String(unreadCount)), [unreadCount]);

  const refreshCount = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      try {
        setUnreadCount(await fetchUnreadNotificationCount(signal));
      } catch {
        setUnreadCount(0);
      }
    },
    [user]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => void refreshCount(controller.signal), 0);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void refreshCount();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshCount, user]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      if (Platform.OS === 'web' || AppState.currentState === 'active') {
        void refreshCount();
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refreshCount, user]);

  if (!user) return null;

  const resolvedIconSize = iconSize ?? (compact ? 20 : 19);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={t('notifications.open_notifications')}
        className="relative h-10 w-10 items-center justify-center">
        <Feather name="bell" color={isDark ? '#cbd5e1' : '#475569'} size={resolvedIconSize} />
        {unreadCount > 0 ? (
          <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-red-600 px-1.5 py-0.5">
            <Text className="font-sans text-[10px] font-bold text-white">{badgeText}</Text>
          </View>
        ) : null}
      </Pressable>
      <NotificationPanel
        visible={open}
        onClose={() => {
          setOpen(false);
          void refreshCount();
        }}
        unreadCount={unreadCount}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}
