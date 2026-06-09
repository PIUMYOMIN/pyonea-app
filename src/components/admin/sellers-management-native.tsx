import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTranslation } from '@/i18n';
import {
  fetchAdminSellers,
  updateAdminSellerStatus,
  type AdminManagedSeller,
  type AdminSellerFilters,
  type AdminSellerStatus,
  type AdminSellersPagination,
} from '@/utils/native-api';

type StatusFilter = 'all' | AdminSellerStatus;
type BulkAction = '' | AdminSellerStatus;

const SELLER_STATUSES: AdminSellerStatus[] = [
  'setup_pending',
  'pending',
  'approved',
  'active',
  'rejected',
  'suspended',
  'closed',
];

const statusTone: Record<string, { wrap: string; text: string; icon: keyof typeof Feather.glyphMap }> = {
  approved: { wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', icon: 'check-circle' },
  active: { wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', icon: 'check-circle' },
  pending: { wrap: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', icon: 'clock' },
  setup_pending: { wrap: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', icon: 'clock' },
  rejected: { wrap: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: 'x-circle' },
  suspended: { wrap: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: 'x-circle' },
  closed: { wrap: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-700 dark:text-slate-300', icon: 'minus-circle' },
};

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-MM', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SellerStatusBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const tone = statusTone[status] || {
    wrap: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
    icon: 'help-circle' as const,
  };

  return (
    <View className={`self-start flex-row items-center gap-1 rounded-full px-2.5 py-1 ${tone.wrap}`}>
      <Feather name={tone.icon} color={status === 'pending' || status === 'setup_pending' ? '#ca8a04' : '#15803d'} size={12} />
      <Text className={`font-sans text-xs font-semibold capitalize ${tone.text}`}>
        {t(`admin.sellerManagement.status.${status}`, status.replace(/_/g, ' '))}
      </Text>
    </View>
  );
}

function StatusUpdateModal({
  visible,
  seller,
  newStatus,
  reason,
  submitting,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  seller: AdminManagedSeller | null;
  newStatus: AdminSellerStatus | string;
  reason: string;
  submitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useAppTranslation();
  if (!visible || !seller) return null;

  const requiresReason = ['rejected', 'suspended', 'closed'].includes(newStatus);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Feather name="alert-triangle" color="#2563eb" size={18} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">
                {t('admin.sellerManagement.modals.updateTitle', 'Update Seller Status')}
              </Text>
              <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                {seller.storeName || t('admin.sellerManagement.unknownStore', 'Unknown Store')}
              </Text>
            </View>
          </View>

          <View className="mb-4 flex-row flex-wrap items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 dark:bg-slate-800">
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('admin.sellerManagement.modals.current', 'Current')}:
            </Text>
            <SellerStatusBadge status={seller.status} />
            <Feather name="arrow-right" color="#94a3b8" size={14} />
            <SellerStatusBadge status={newStatus} />
          </View>

          <Text className="mb-1.5 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
            {t('admin.sellerManagement.modals.reason', 'Reason')}
            {requiresReason ? <Text className="text-red-500"> *</Text> : null}
          </Text>
          <TextInput
            value={reason}
            onChangeText={onReasonChange}
            multiline
            numberOfLines={3}
            editable={!submitting}
            placeholder={
              requiresReason
                ? t('admin.sellerManagement.modals.reasonRequired', 'Please provide a reason for this status change…')
                : t('admin.sellerManagement.modals.reasonOptional', 'Optionally describe why you are changing the status…')
            }
            placeholderTextColor="#94a3b8"
            className="min-h-[88px] rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            textAlignVertical="top"
          />

          <View className="mt-6 flex-row justify-end gap-3">
            <Pressable
              disabled={submitting}
              onPress={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 dark:border-slate-700">
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                {t('admin.sellerManagement.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              disabled={submitting || (requiresReason && !reason.trim())}
              onPress={onConfirm}
              className="rounded-lg bg-green-600 px-4 py-2 disabled:opacity-50">
              <Text className="font-sans text-sm font-semibold text-white">
                {submitting
                  ? t('admin.sellerManagement.modals.updating', 'Updating…')
                  : t('admin.sellerManagement.modals.confirm', 'Confirm Update')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatusPickerModal({
  visible,
  currentStatus,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentStatus: string;
  onClose: () => void;
  onSelect: (status: AdminSellerStatus) => void;
}) {
  const { t } = useAppTranslation();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-white p-4 dark:bg-slate-900" onPress={() => undefined}>
          <Text className="mb-3 font-sans text-base font-bold text-gray-950 dark:text-slate-100">
            {t('admin.sellerManagement.changeStatus', 'Change status')}
          </Text>
          {SELLER_STATUSES.map((status) => (
            <Pressable
              key={status}
              onPress={() => {
                onSelect(status);
                onClose();
              }}
              className={`mb-2 flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                currentStatus === status
                  ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-slate-700'
              }`}>
              <SellerStatusBadge status={status} />
              {currentStatus === status ? <Feather name="check" color="#16a34a" size={16} /> : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SellersManagementNative() {
  const { t } = useAppTranslation();
  const [sellers, setSellers] = useState<AdminManagedSeller[]>([]);
  const [pagination, setPagination] = useState<AdminSellersPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{ seller: AdminManagedSeller; newStatus: AdminSellerStatus } | null>(
    null,
  );
  const [statusReason, setStatusReason] = useState('');
  const [statusPickerTarget, setStatusPickerTarget] = useState<AdminManagedSeller | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const loadSellers = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      setError('');

      const filters: AdminSellerFilters = {
        search: search.trim() || undefined,
        status: statusFilter,
        page,
        perPage: 15,
      };

      try {
        const result = await fetchAdminSellers(filters);
        setSellers(result.sellers);
        setPagination(result.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('admin.sellerManagement.errors.load', 'Failed to load sellers.'));
        setSellers([]);
        setPagination(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, statusFilter, t],
  );

  useEffect(() => {
    void loadSellers();
  }, [loadSellers]);

  const refresh = () => void loadSellers(false);

  const patchSeller = (sellerId: string, patch: Partial<AdminManagedSeller>) => {
    setSellers((current) => current.map((item) => (item.id === sellerId ? { ...item, ...patch } : item)));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleAllSelection = () => {
    setSelectedIds((current) => (current.length === sellers.length ? [] : sellers.map((seller) => seller.id)));
  };

  const openStatusModal = (seller: AdminManagedSeller, newStatus: AdminSellerStatus) => {
    if (seller.status === newStatus) return;
    setStatusReason('');
    setStatusModal({ seller, newStatus });
  };

  const confirmStatusUpdate = async () => {
    if (!statusModal) return;
    const { seller, newStatus } = statusModal;
    const requiresReason = ['rejected', 'suspended', 'closed'].includes(newStatus);
    if (requiresReason && !statusReason.trim()) return;

    setBusyId(seller.id);
    try {
      await updateAdminSellerStatus(seller.id, newStatus, statusReason);
      patchSeller(seller.id, { status: newStatus });
      setMessage(
        t('admin.sellerManagement.messages.statusUpdated', 'Seller status updated to {{status}}.', {
          status: t(`admin.sellerManagement.status.${newStatus}`, newStatus),
        }),
      );
      setStatusModal(null);
      setStatusReason('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.sellerManagement.errors.update', 'Failed to update seller status.'),
      );
    } finally {
      setBusyId(null);
    }
  };

  const executeBulk = async () => {
    setShowBulkModal(false);
    if (!bulkAction || selectedIds.length === 0) return;

    setBusyId('bulk');
    try {
      const selected = sellers.filter((seller) => selectedIds.includes(seller.id));
      const results = await Promise.allSettled(
        selected.map((seller) => updateAdminSellerStatus(seller.id, bulkAction, 'Bulk action by admin')),
      );
      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failureCount = selected.length - successCount;

      if (successCount > 0) {
        setMessage(
          t('admin.sellerManagement.messages.bulkApplied', '{{count}} seller(s) updated.', {
            count: successCount,
          }) + (failureCount ? ` ${failureCount} failed.` : ''),
        );
      } else {
        setError(t('admin.sellerManagement.errors.bulk', 'Bulk action failed.'));
      }

      setSelectedIds([]);
      setBulkAction('');
      await loadSellers(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.sellerManagement.errors.bulk', 'Bulk action failed.'));
    } finally {
      setBusyId(null);
    }
  };

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPage(1);
  };

  const statusFilters = useMemo(
    () =>
      (['all', ...SELLER_STATUSES] as StatusFilter[]).map((filter) => ({
        id: filter,
        label:
          filter === 'all'
            ? t('admin.sellerManagement.filters.allStatus', 'All Statuses')
            : t(`admin.sellerManagement.status.${filter}`, filter.replace(/_/g, ' ')),
      })),
    [t],
  );

  const bulkOptions = useMemo(
    () =>
      [
        { id: 'approved' as BulkAction, label: t('admin.sellerManagement.bulk.approve', 'Approve selected') },
        { id: 'active' as BulkAction, label: t('admin.sellerManagement.bulk.reactivate', 'Reactivate selected') },
        { id: 'suspended' as BulkAction, label: t('admin.sellerManagement.bulk.suspend', 'Suspend selected') },
        { id: 'pending' as BulkAction, label: t('admin.sellerManagement.bulk.pending', 'Move to pending') },
        {
          id: 'setup_pending' as BulkAction,
          label: t('admin.sellerManagement.bulk.setupPending', 'Move to setup pending'),
        },
        { id: 'closed' as BulkAction, label: t('admin.sellerManagement.bulk.close', 'Close selected') },
      ].filter((option) => option.id !== ''),
    [t],
  );

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
          {t('admin.sellerManagement.loading', 'Loading sellers...')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <StatusUpdateModal
        visible={Boolean(statusModal)}
        seller={statusModal?.seller || null}
        newStatus={statusModal?.newStatus || 'pending'}
        reason={statusReason}
        submitting={busyId === statusModal?.seller.id}
        onReasonChange={setStatusReason}
        onClose={() => {
          if (busyId === statusModal?.seller.id) return;
          setStatusModal(null);
          setStatusReason('');
        }}
        onConfirm={() => void confirmStatusUpdate()}
      />
      <StatusPickerModal
        visible={Boolean(statusPickerTarget)}
        currentStatus={statusPickerTarget?.status || 'pending'}
        onClose={() => setStatusPickerTarget(null)}
        onSelect={(status) => {
          if (statusPickerTarget) openStatusModal(statusPickerTarget, status);
        }}
      />

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t('admin.sellerManagement.title', 'Seller directory')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {pagination?.total
              ? t('admin.sellerManagement.subtitleCount', '{{count}} total sellers', { count: pagination.total })
              : t('admin.sellerManagement.subtitle', 'Manage all sellers in your marketplace')}
          </Text>
        </View>
        <Pressable
          onPress={refresh}
          className="flex-row items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={15} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {refreshing
              ? t('admin.sellerManagement.loading', 'Loading sellers...')
              : t('admin.orderManagement.refresh', 'Refresh')}
          </Text>
        </Pressable>
      </View>

      {selectedIds.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-sm font-semibold text-green-800 dark:text-green-300">
            {t('admin.sellerManagement.selected', '{{count}} selected', { count: selectedIds.length })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-full flex-1">
            <View className="flex-row items-center gap-2">
              {bulkOptions.map((option) => {
                const active = bulkAction === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setBulkAction(option.id)}
                    className={`rounded-lg border px-3 py-2 ${
                      active
                        ? 'border-green-600 bg-white dark:border-green-500 dark:bg-slate-900'
                        : 'border-green-300 bg-green-100/60 dark:border-green-700 dark:bg-green-900/30'
                    }`}>
                    <Text
                      className={`font-sans text-xs font-semibold ${
                        active ? 'text-green-700 dark:text-green-300' : 'text-green-800 dark:text-green-300'
                      }`}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Pressable
            disabled={!bulkAction || busyId === 'bulk'}
            onPress={() => setShowBulkModal(true)}
            className="rounded-lg bg-green-600 px-4 py-2 disabled:opacity-50">
            <Text className="font-sans text-sm font-semibold text-white">
              {t('admin.sellerManagement.apply', 'Apply')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setSelectedIds([]);
              setBulkAction('');
            }}
            className="rounded-lg border border-green-300 px-3 py-2 dark:border-green-700">
            <Text className="font-sans text-sm font-semibold text-green-800 dark:text-green-300">
              {t('admin.sellerManagement.clear', 'Clear')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {message ? (
        <Pressable
          onPress={() => setMessage('')}
          className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" color="#15803d" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-800 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      {error ? (
        <Pressable
          onPress={() => setError('')}
          className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" color="#dc2626" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Pressable onPress={() => void loadSellers()}>
            <Text className="font-sans text-sm font-semibold text-red-700 underline dark:text-red-300">
              {t('admin.orderManagement.retry', 'Retry')}
            </Text>
          </Pressable>
        </Pressable>
      ) : null}

      <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <View className="h-11 flex-row items-center rounded-lg border border-gray-200 bg-gray-50 px-3 dark:border-slate-600 dark:bg-slate-900/80">
          <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm dark:bg-slate-800">
            <Feather name="search" color="#16a34a" size={16} />
          </View>
          <TextInput
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t('admin.sellerManagement.searchPlaceholder', 'Store name, email…')}
            placeholderTextColor="#94a3b8"
            className="min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
            returnKeyType="search"
          />
          {search.trim().length > 0 ? (
            <Pressable
              onPress={() => {
                setSearch('');
                setPage(1);
              }}
              className="ml-2 h-7 w-7 items-center justify-center rounded-full bg-gray-200/80 dark:bg-slate-700">
              <Feather name="x" color="#64748b" size={14} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
          <View className="flex-row items-center gap-2 pr-1">
            <Text className="mr-1 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {t('admin.sellerManagement.columns.status', 'Status')}
            </Text>
            {statusFilters.map((filter) => {
              const active = statusFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => {
                    setStatusFilter(filter.id);
                    setPage(1);
                  }}
                  className={`h-9 justify-center rounded-lg border px-3 ${
                    active
                      ? 'border-slate-700 bg-slate-800 dark:border-slate-500 dark:bg-slate-600'
                      : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900'
                  }`}>
                  <Text
                    className={`font-sans text-sm font-medium ${
                      active ? 'text-white' : 'text-gray-700 dark:text-slate-300'
                    }`}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}

            {hasActiveFilters ? (
              <>
                <View className="mx-1 h-6 w-px bg-gray-200 dark:bg-slate-600" />
                <Pressable
                  onPress={resetFilters}
                  className="h-9 flex-row items-center justify-center rounded-lg border border-gray-200 bg-white px-3 dark:border-slate-600 dark:bg-slate-900">
                  <Feather name="rotate-ccw" color="#64748b" size={14} />
                  <Text className="ml-1.5 font-sans text-sm font-medium text-gray-600 dark:text-slate-300">
                    {t('admin.sellerManagement.clear', 'Clear')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </ScrollView>

        {pagination ? (
          <View className="mt-3 flex-row flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-slate-700">
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {t('admin.sellerManagement.showing', 'Showing {{from}}–{{to}} of {{total}} sellers', {
                from: pagination.from,
                to: pagination.to,
                total: pagination.total,
              })}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {sellers.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[1180px]">
              <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                <View className="w-10 items-center justify-center">
                  <Pressable onPress={toggleAllSelection}>
                    <View
                      className={`h-4 w-4 items-center justify-center rounded border ${
                        selectedIds.length === sellers.length && sellers.length > 0
                          ? 'border-green-600 bg-green-600'
                          : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                      }`}>
                      {selectedIds.length === sellers.length && sellers.length > 0 ? (
                        <Feather name="check" size={11} color="#ffffff" />
                      ) : null}
                    </View>
                  </Pressable>
                </View>
                {[
                  { key: 'storeId', label: t('admin.sellerManagement.columns.storeId', 'Store ID'), width: 'w-[100px]' },
                  { key: 'storeName', label: t('admin.sellerManagement.columns.storeName', 'Store Name'), width: 'w-[160px]' },
                  { key: 'email', label: t('admin.sellerManagement.columns.email', 'Email'), width: 'w-[180px]' },
                  { key: 'phone', label: t('admin.sellerManagement.columns.phone', 'Phone'), width: 'w-[120px]' },
                  { key: 'business', label: t('admin.sellerManagement.columns.businessType', 'Business Type'), width: 'w-[120px]' },
                  { key: 'status', label: t('admin.sellerManagement.columns.status', 'Status'), width: 'w-[130px]' },
                  { key: 'rating', label: t('admin.sellerManagement.columns.rating', 'Rating'), width: 'w-[80px]' },
                  { key: 'products', label: t('admin.sellerManagement.columns.products', 'Products'), width: 'w-[90px]' },
                  { key: 'created', label: t('admin.sellerManagement.columns.created', 'Created'), width: 'w-[110px]' },
                  { key: 'actions', label: t('admin.sellerManagement.columns.actions', 'Actions'), width: 'w-[140px]' },
                ].map((column) => (
                  <View key={column.key} className={`${column.width} px-2`}>
                    <Text className="font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      {column.label}
                    </Text>
                  </View>
                ))}
              </View>

              {sellers.map((seller) => {
                const selected = selectedIds.includes(seller.id);
                const slug = seller.storeSlug || seller.id;
                return (
                  <View
                    key={seller.id}
                    className="w-full flex-row border-t border-gray-100 px-4 py-3 dark:border-slate-700">
                    <View className="w-10 items-center justify-center">
                      <Pressable onPress={() => toggleSelection(seller.id)}>
                        <View
                          className={`h-4 w-4 items-center justify-center rounded border ${
                            selected ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                          }`}>
                          {selected ? <Feather name="check" size={11} color="#ffffff" /> : null}
                        </View>
                      </Pressable>
                    </View>
                    <View className="w-[100px] justify-center px-2">
                      <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">{seller.storeId || '—'}</Text>
                    </View>
                    <View className="w-[160px] justify-center px-2">
                      <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={2}>
                        {seller.storeName || '—'}
                      </Text>
                    </View>
                    <View className="w-[180px] justify-center px-2">
                      <Text className="font-sans text-sm text-gray-700 dark:text-slate-300" numberOfLines={1}>
                        {seller.contactEmail || '—'}
                      </Text>
                    </View>
                    <View className="w-[120px] justify-center px-2">
                      <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">{seller.contactPhone || '—'}</Text>
                    </View>
                    <View className="w-[120px] justify-center px-2">
                      <Text className="font-sans text-sm capitalize text-gray-700 dark:text-slate-300">
                        {seller.businessType || '—'}
                      </Text>
                    </View>
                    <View className="w-[130px] justify-center px-2">
                      <SellerStatusBadge status={seller.status} />
                    </View>
                    <View className="w-[80px] justify-center px-2">
                      <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                        {seller.rating ? seller.rating.toFixed(1) : '0.0'}
                      </Text>
                    </View>
                    <View className="w-[90px] justify-center px-2">
                      <View
                        className={`self-start rounded-full px-2.5 py-1 ${
                          seller.productsCount > 0
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-gray-100 dark:bg-slate-700'
                        }`}>
                        <Text
                          className={`font-sans text-xs font-semibold ${
                            seller.productsCount > 0
                              ? 'text-blue-800 dark:text-blue-300'
                              : 'text-gray-500 dark:text-slate-400'
                          }`}>
                          {seller.productsCount}
                        </Text>
                      </View>
                    </View>
                    <View className="w-[110px] justify-center px-2">
                      <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">{formatDate(seller.createdAt)}</Text>
                    </View>
                    <View className="w-[140px] flex-row items-center gap-2 px-2">
                      <Link href={`/sellers/${slug}` as never} asChild>
                        <Pressable className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600">
                          <Feather name="eye" color="#64748b" size={15} />
                        </Pressable>
                      </Link>
                      <Pressable
                        disabled={busyId === seller.id}
                        onPress={() => setStatusPickerTarget(seller)}
                        className="min-w-0 flex-1 flex-row items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5 dark:border-slate-600">
                        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300" numberOfLines={1}>
                          {t(`admin.sellerManagement.status.${seller.status}`, seller.status.replace(/_/g, ' '))}
                        </Text>
                        <Feather name="chevron-down" color="#64748b" size={14} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View className="items-center px-6 py-12">
            <Feather name="users" color="#94a3b8" size={40} />
            <Text className="mt-4 font-sans text-base font-semibold text-gray-900 dark:text-slate-100">
              {hasActiveFilters
                ? t('admin.sellerManagement.emptyFiltered', 'No sellers found matching your criteria')
                : t('admin.sellerManagement.empty', 'No sellers yet')}
            </Text>
            <Text className="mt-1 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
              {hasActiveFilters
                ? t('admin.sellerManagement.emptyFilteredDesc', 'Try adjusting your search or filters')
                : t('admin.sellerManagement.emptyDesc', 'Sellers will appear here once they register.')}
            </Text>
          </View>
        )}

        {pagination && pagination.lastPage > 1 ? (
          <View className="flex-row items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-slate-700">
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('admin.sellerManagement.page', 'Page {{current}} of {{last}}', {
                current: pagination.currentPage,
                last: pagination.lastPage,
              })}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                disabled={pagination.currentPage <= 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                  {t('admin.sellerManagement.previous', 'Previous')}
                </Text>
              </Pressable>
              <Pressable
                disabled={pagination.currentPage >= pagination.lastPage}
                onPress={() => setPage((current) => current + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                  {t('admin.sellerManagement.next', 'Next')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Modal visible={showBulkModal} transparent animationType="fade" onRequestClose={() => setShowBulkModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-4">
          <View className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
            <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
              {t('admin.sellerManagement.modals.bulkTitle', 'Confirm Bulk Action')}
            </Text>
            <Text className="mt-2 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
              {t('admin.sellerManagement.modals.bulkConfirm', 'Apply "{{action}}" to {{count}} selected seller(s)?', {
                action: bulkAction,
                count: selectedIds.length,
              })}
            </Text>
            <View className="mt-6 flex-row justify-end gap-3">
              <Pressable onPress={() => setShowBulkModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 dark:border-slate-700">
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {t('admin.sellerManagement.cancel', 'Cancel')}
                </Text>
              </Pressable>
              <Pressable onPress={() => void executeBulk()} className="rounded-lg bg-green-600 px-4 py-2">
                <Text className="font-sans text-sm font-semibold text-white">
                  {t('admin.sellerManagement.modals.confirm', 'Confirm Update')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
