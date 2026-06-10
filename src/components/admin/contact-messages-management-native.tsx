import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import {
  deleteAdminContactMessage,
  fetchAdminContactMessages,
  markAdminContactMessageRead,
  type AdminContactMessage,
  type AdminContactMessageFilter,
  type AdminContactMessagesPagination,
} from '@/utils/native-api';

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg px-3 py-1.5 ${
        active
          ? 'bg-green-100 dark:bg-green-900/40'
          : 'bg-gray-100 dark:bg-slate-700'
      }`}>
      <Text
        className={`font-sans text-sm font-medium ${
          active ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-slate-300'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

function MessageDetailModal({
  visible,
  message,
  markingRead,
  deleting,
  onClose,
  onMarkRead,
  onDelete,
}: {
  visible: boolean;
  message: AdminContactMessage | null;
  markingRead: boolean;
  deleting: boolean;
  onClose: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const { t } = useAppTranslation();

  if (!message) return null;

  const openEmail = () => {
    if (message.email) void Linking.openURL(`mailto:${message.email}`);
  };

  const openPhone = () => {
    if (message.phone) void Linking.openURL(`tel:${message.phone}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="max-h-[90%] w-full max-w-2xl rounded-2xl bg-white p-6 dark:bg-slate-900">
          <View className="mb-5 flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('admin.contactMessages.detailTitle', 'Message Details')}
            </Text>
            <Pressable onPress={onClose} className="rounded-lg p-1">
              <Feather name="x" size={22} color="#94a3b8" />
            </Pressable>
          </View>

          <ScrollView className="max-h-[60vh]" showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <View className="gap-3">
                {[
                  { label: t('admin.contactMessages.from', 'From'), value: message.name },
                  { label: t('admin.contactMessages.email', 'Email'), value: message.email, onPress: openEmail },
                  ...(message.phone
                    ? [{ label: t('admin.contactMessages.phone', 'Phone'), value: message.phone, onPress: openPhone }]
                    : []),
                  { label: t('admin.contactMessages.subject', 'Subject'), value: message.subject },
                  { label: t('admin.contactMessages.received', 'Received'), value: formatDate(message.createdAt) },
                  ...(message.readAt
                    ? [{ label: t('admin.contactMessages.readAt', 'Read at'), value: formatDate(message.readAt) }]
                    : []),
                ].map((row) => (
                  <View key={row.label} className="flex-row gap-3">
                    <Text className="w-24 font-sans text-sm font-medium text-gray-600 dark:text-slate-400">
                      {row.label}:
                    </Text>
                    {'onPress' in row && row.onPress ? (
                      <Pressable onPress={row.onPress} className="min-w-0 flex-1">
                        <Text className="font-sans text-sm text-green-700 underline dark:text-green-400">
                          {row.value}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text className="min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100">
                        {row.value}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              <View>
                <Text className="mb-2 font-sans text-sm font-medium text-gray-600 dark:text-slate-400">
                  {t('admin.contactMessages.message', 'Message')}:
                </Text>
                <View className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-800">
                  <Text className="font-sans text-sm leading-6 text-gray-800 dark:text-slate-200">
                    {message.message}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="mt-6 flex-row flex-wrap justify-end gap-2">
            {!message.readAt ? (
              <Pressable
                disabled={markingRead}
                onPress={onMarkRead}
                className="rounded-xl bg-green-600 px-4 py-2.5 disabled:opacity-50">
                {markingRead ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="font-sans text-sm font-medium text-white">
                    {t('admin.contactMessages.markRead', 'Mark as Read')}
                  </Text>
                )}
              </Pressable>
            ) : null}
            <Pressable
              disabled={deleting}
              onPress={onDelete}
              className="rounded-xl bg-red-600 px-4 py-2.5 disabled:opacity-50">
              {deleting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="font-sans text-sm font-medium text-white">
                  {t('admin.contactMessages.delete', 'Delete')}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={onClose}
              className="rounded-xl bg-gray-100 px-4 py-2.5 dark:bg-slate-700">
              <Text className="font-sans text-sm font-medium text-gray-800 dark:text-slate-200">
                {t('admin.contactMessages.close', 'Close')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ContactMessagesManagementNative() {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
  const [pagination, setPagination] = useState<AdminContactMessagesPagination>({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    from: 0,
    to: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<AdminContactMessageFilter>('all');
  const [selectedMessage, setSelectedMessage] = useState<AdminContactMessage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadMessages = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchAdminContactMessages({
          page,
          perPage: 15,
          search: debouncedSearch,
          filter,
        });
        setMessages(result.messages);
        setPagination(result.pagination);
      } catch (err) {
        setMessages([]);
        setError(
          err instanceof Error
            ? err.message
            : t('admin.contactMessages.errors.load', 'Failed to load messages'),
        );
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, filter, t],
  );

  useEffect(() => {
    void loadMessages(1);
  }, [loadMessages]);

  const markMessageReadLocally = (id: string, readAt = new Date().toISOString()) => {
    setMessages((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt } : item)),
    );
    setSelectedMessage((current) => (current?.id === id ? { ...current, readAt } : current));
  };

  const handleViewMessage = async (message: AdminContactMessage) => {
    setSelectedMessage(message);
    setShowModal(true);
    if (!message.readAt) {
      setMarkingReadId(message.id);
      try {
        await markAdminContactMessageRead(message.id);
        markMessageReadLocally(message.id);
      } catch {
        flash(t('admin.contactMessages.errors.markRead', 'Failed to mark as read'), 'error');
      } finally {
        setMarkingReadId(null);
      }
    }
  };

  const handleMarkRead = async (id: string) => {
    setMarkingReadId(id);
    try {
      await markAdminContactMessageRead(id);
      markMessageReadLocally(id);
      flash(t('admin.contactMessages.messages.markedRead', 'Message marked as read'));
    } catch {
      flash(t('admin.contactMessages.errors.markRead', 'Failed to mark as read'), 'error');
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAdminContactMessage(id);
      setMessages((current) => current.filter((item) => item.id !== id));
      if (selectedMessage?.id === id) {
        setShowModal(false);
        setSelectedMessage(null);
      }
      setPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
      flash(t('admin.contactMessages.messages.deleted', 'Message deleted'));
    } catch {
      flash(t('admin.contactMessages.errors.delete', 'Failed to delete message'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: t('admin.contactMessages.filters.all', 'All') },
      { value: 'unread' as const, label: t('admin.contactMessages.filters.unread', 'Unread') },
      { value: 'read' as const, label: t('admin.contactMessages.filters.read', 'Read') },
    ],
    [t],
  );

  return (
    <View className="gap-5">
      <View>
        <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
          {t('admin.contactMessages.title', 'Contact Messages')}
        </Text>
        <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-500">
          {t('admin.contactMessages.subtitle', 'Manage customer inquiries and feedback')}
        </Text>
      </View>

      {toast ? (
        <Pressable onPress={() => setToast(null)}>
          <View
            className={`rounded-xl border p-3 ${
              toast.type === 'success'
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}>
            <Text
              className={`font-sans text-sm font-medium ${
                toast.type === 'success'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
              {toast.msg}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <View className="gap-4 border-b border-gray-200 p-4 dark:border-slate-700">
          <View className="flex-row flex-wrap items-center gap-2">
            {filterOptions.map((option) => (
              <FilterPill
                key={option.value}
                label={
                  option.value === 'all'
                    ? `${option.label} (${pagination.total})`
                    : option.label
                }
                active={filter === option.value}
                onPress={() => setFilter(option.value)}
              />
            ))}
            <Pressable
              onPress={() => void loadMessages(pagination.currentPage)}
              className="ml-auto rounded-lg p-2">
              <Feather name="refresh-cw" size={18} color={isDark ? '#94a3b8' : '#6b7280'} />
            </Pressable>
          </View>

          <View className="relative">
            <Feather
              name="search"
              size={16}
              color="#9ca3af"
              style={{ position: 'absolute', left: 12, top: 14, zIndex: 1 }}
            />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder={t(
                'admin.contactMessages.searchPlaceholder',
                'Search by name, email, subject...',
              )}
              placeholderTextColor="#9ca3af"
              className="h-12 rounded-xl border border-gray-300 bg-white pl-10 pr-4 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </View>
        </View>

        {error ? (
          <View className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
            <Pressable
              onPress={() => void loadMessages(pagination.currentPage)}
              className="mt-3 self-start rounded-lg bg-red-600 px-3 py-1.5">
              <Text className="font-sans text-xs font-semibold text-white">
                {t('admin.contactMessages.retry', 'Retry')}
              </Text>
            </Pressable>
          </View>
        ) : loading && messages.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#16a34a" size="large" />
          </View>
        ) : messages.length === 0 ? (
          <View className="items-center px-6 py-12">
            <Feather name="inbox" size={36} color="#94a3b8" />
            <Text className="mt-3 font-sans text-sm text-gray-400 dark:text-slate-500">
              {t('admin.contactMessages.empty', 'No messages found')}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View className="min-w-full">
              <View className="min-w-[920px] flex-row border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                {[
                  { label: t('admin.contactMessages.columns.status', 'Status'), width: 'w-16' },
                  { label: t('admin.contactMessages.columns.name', 'Name'), width: 'w-36' },
                  { label: t('admin.contactMessages.columns.email', 'Email'), width: 'w-44' },
                  { label: t('admin.contactMessages.columns.subject', 'Subject'), width: 'w-52' },
                  { label: t('admin.contactMessages.columns.received', 'Received'), width: 'w-40' },
                  { label: t('admin.contactMessages.columns.actions', 'Actions'), width: 'w-24' },
                ].map((heading) => (
                  <Text
                    key={heading.label}
                    className={`${heading.width} pr-4 font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500`}>
                    {heading.label}
                  </Text>
                ))}
              </View>

              {messages.map((message) => {
                const unread = !message.readAt;
                return (
                  <View
                    key={message.id}
                    className={`min-w-[920px] flex-row items-center border-b border-gray-100 dark:border-slate-700 ${
                      unread ? 'bg-green-50/40 dark:bg-green-900/10' : ''
                    }`}>
                    <Pressable
                      onPress={() => void handleViewMessage(message)}
                      className="min-w-0 flex-1 flex-row items-center px-4 py-3">
                      <View className="w-16 pr-4">
                        <Feather name="mail" size={18} color={unread ? '#16a34a' : '#94a3b8'} />
                      </View>
                      <Text
                        className={`w-36 pr-4 font-sans text-sm text-gray-900 dark:text-slate-100 ${
                          unread ? 'font-semibold' : ''
                        }`}
                        numberOfLines={1}>
                        {message.name}
                      </Text>
                      <Text
                        className="w-44 pr-4 font-sans text-sm text-gray-500 dark:text-slate-400"
                        numberOfLines={1}>
                        {message.email}
                      </Text>
                      <Text
                        className="w-52 pr-4 font-sans text-sm text-gray-500 dark:text-slate-400"
                        numberOfLines={1}>
                        {message.subject}
                      </Text>
                      <Text className="w-40 pr-4 font-sans text-xs text-gray-500 dark:text-slate-500">
                        {formatDate(message.createdAt)}
                      </Text>
                    </Pressable>
                    <View className="w-24 flex-row items-center gap-2 pr-4">
                      {unread ? (
                        <Pressable
                          disabled={markingReadId === message.id}
                          onPress={() => void handleMarkRead(message.id)}
                          className="rounded-lg p-1">
                          {markingReadId === message.id ? (
                            <ActivityIndicator color="#16a34a" size="small" />
                          ) : (
                            <Feather name="check-circle" size={18} color="#16a34a" />
                          )}
                        </Pressable>
                      ) : null}
                      <Pressable
                        disabled={deletingId === message.id}
                        onPress={() => void handleDelete(message.id)}
                        className="rounded-lg p-1">
                        {deletingId === message.id ? (
                          <ActivityIndicator color="#ef4444" size="small" />
                        ) : (
                          <Feather name="trash-2" size={18} color="#ef4444" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {pagination.lastPage > 1 ? (
          <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-4 dark:border-slate-700">
            <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
              {t('admin.contactMessages.pagination.summary', 'Showing {{from}} to {{to}} of {{total}} results', {
                from: pagination.from || 1,
                to: pagination.to || messages.length,
                total: pagination.total,
              })}
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                disabled={pagination.currentPage <= 1 || loading}
                onPress={() => void loadMessages(pagination.currentPage - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                  {t('admin.contactMessages.pagination.previous', 'Previous')}
                </Text>
              </Pressable>
              <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                {t('admin.contactMessages.pagination.page', 'Page {{current}} of {{last}}', {
                  current: pagination.currentPage,
                  last: pagination.lastPage,
                })}
              </Text>
              <Pressable
                disabled={pagination.currentPage >= pagination.lastPage || loading}
                onPress={() => void loadMessages(pagination.currentPage + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                  {t('admin.contactMessages.pagination.next', 'Next')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <MessageDetailModal
        visible={showModal}
        message={selectedMessage}
        markingRead={Boolean(selectedMessage && markingReadId === selectedMessage.id)}
        deleting={Boolean(selectedMessage && deletingId === selectedMessage.id)}
        onClose={() => {
          setShowModal(false);
          setSelectedMessage(null);
        }}
        onMarkRead={() => {
          if (selectedMessage) void handleMarkRead(selectedMessage.id);
        }}
        onDelete={() => {
          if (selectedMessage) void handleDelete(selectedMessage.id);
        }}
      />
    </View>
  );
}
