import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
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

import { useNativeAuth } from '@/context/native-auth';
import { useAppTranslation } from '@/i18n';
import {
  assignAdminUserRole,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUserActive,
  type AdminManagedUser,
  type AdminUserFilters,
  type AdminUsersPagination,
} from '@/utils/native-api';

type RoleFilter = 'all' | 'admin' | 'seller' | 'buyer';
type StatusFilter = 'all' | 'active' | 'inactive';
type BulkAction = '' | 'activate' | 'deactivate' | 'delete';
type UserRole = 'admin' | 'seller' | 'buyer';

const ROLES: UserRole[] = ['admin', 'seller', 'buyer'];

const roleTone: Record<string, { wrap: string; text: string }> = {
  admin: {
    wrap: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-300',
  },
  seller: {
    wrap: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
  },
  buyer: {
    wrap: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
  },
};

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-MM', { month: 'short', day: 'numeric', year: 'numeric' });
}

function RoleBadge({ role }: { role: string }) {
  const { t } = useAppTranslation();
  const tone = roleTone[role] || {
    wrap: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
  };

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${tone.text}`}>
        {t(`admin.userManagement.roles.${role}`, role)}
      </Text>
    </View>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useAppTranslation();
  return (
    <View
      className={`self-start flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
        active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
      }`}>
      <Feather name={active ? 'check-circle' : 'x-circle'} color={active ? '#15803d' : '#dc2626'} size={12} />
      <Text
        className={`font-sans text-xs font-semibold ${
          active ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'
        }`}>
        {active
          ? t('admin.userManagement.status.active', 'Active')
          : t('admin.userManagement.status.inactive', 'Inactive')}
      </Text>
    </View>
  );
}

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
  danger = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  const { t } = useAppTranslation();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
          <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">{title}</Text>
          <Text className="mt-2 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">{message}</Text>
          <View className="mt-6 flex-row justify-end gap-3">
            <Pressable onPress={onClose} className="rounded-lg border border-gray-200 px-4 py-2 dark:border-slate-700">
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                {t('admin.userManagement.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className={`rounded-lg px-4 py-2 ${danger ? 'bg-red-600' : 'bg-green-600'}`}>
              <Text className="font-sans text-sm font-semibold text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RolePickerModal({
  visible,
  currentRole,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentRole: string;
  onClose: () => void;
  onSelect: (role: UserRole) => void;
}) {
  const { t } = useAppTranslation();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 p-4" onPress={onClose}>
        <Pressable className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-slate-900" onPress={() => undefined}>
          <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">
            {t('admin.userManagement.changeRole', 'Change role')}
          </Text>
          <View className="mt-4 gap-2">
            {ROLES.map((role) => {
              const selected = currentRole === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => onSelect(role)}
                  className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                    selected
                      ? 'border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-900/20'
                      : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  }`}>
                  <RoleBadge role={role} />
                  {selected ? <Feather name="check" color="#16a34a" size={18} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function UserAvatar({ name, profilePhoto, size = 44 }: { name: string; profilePhoto?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  useEffect(() => {
    setFailed(false);
  }, [profilePhoto]);

  const showPhoto = Boolean(profilePhoto) && !failed;

  return (
    <View
      className="overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-slate-600 dark:bg-slate-700"
      style={{ width: size, height: size }}>
      {showPhoto ? (
        <Image
          source={{ uri: profilePhoto }}
          style={{ width: size, height: size }}
          className="h-full w-full"
          contentFit="cover"
          recyclingKey={profilePhoto}
          onError={() => setFailed(true)}
        />
      ) : (
        <View className="h-full w-full items-center justify-center bg-green-100 dark:bg-green-900/30">
          <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">{initial}</Text>
        </View>
      )}
    </View>
  );
}

function UserRow({
  user,
  isSelf,
  selected,
  busy,
  onToggleSelect,
  onToggleActive,
  onChangeRole,
  onDelete,
}: {
  user: AdminManagedUser;
  isSelf: boolean;
  selected: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onToggleActive: () => void;
  onChangeRole: () => void;
  onDelete: () => void;
}) {
  const { t } = useAppTranslation();

  return (
    <View
      className={`min-h-[76px] w-full flex-row items-center border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-slate-700 ${
        isSelf ? 'bg-green-50/60 dark:bg-green-900/10' : 'bg-white dark:bg-slate-800'
      }`}>
      <View className="w-10 pr-3">
        <Pressable
          disabled={isSelf}
          onPress={onToggleSelect}
          className={`h-8 w-8 items-center justify-center rounded-lg border ${
            selected
              ? 'border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-900/20'
              : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
          } ${isSelf ? 'opacity-30' : ''}`}>
          <Feather name={selected ? 'check-square' : 'square'} color={selected ? '#16a34a' : '#94a3b8'} size={16} />
        </Pressable>
      </View>

      <View className="w-64 flex-row gap-3 pr-4">
        <UserAvatar name={user.name} profilePhoto={user.profilePhoto} size={44} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1">
            <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
              {user.name}
            </Text>
            {isSelf ? <Feather name="shield" color="#16a34a" size={13} /> : null}
          </View>
          <Text className="mt-0.5 font-sans text-[11px] text-gray-400 dark:text-slate-500" numberOfLines={1}>
            {user.userId || `#${user.id}`}
          </Text>
        </View>
      </View>

      <View className="w-52 pr-4">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300" numberOfLines={1}>
          {user.email || '—'}
        </Text>
        <Text className="mt-0.5 font-sans text-[11px] text-gray-400 dark:text-slate-500" numberOfLines={1}>
          {user.phone || '—'}
        </Text>
      </View>

      <View className="w-36 pr-4">
        <Pressable disabled={isSelf || busy} onPress={onChangeRole} className={isSelf ? 'opacity-40' : ''}>
          <RoleBadge role={user.role} />
        </Pressable>
      </View>

      <View className="w-36 pr-4">
        <StatusBadge active={user.isActive} />
        {!isSelf ? (
          <Pressable disabled={busy} onPress={onToggleActive} className="mt-1">
            <Text className="font-sans text-[11px] text-gray-400 underline dark:text-slate-500">
              {user.isActive
                ? t('admin.userManagement.deactivate', 'Deactivate')
                : t('admin.userManagement.activate', 'Activate')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="w-28 pr-4">
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{formatDate(user.createdAt)}</Text>
      </View>

      <View className="w-16">
        <Pressable
          disabled={isSelf || busy}
          onPress={onDelete}
          className={`h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 ${
            isSelf ? 'opacity-30' : ''
          }`}>
          <Feather name="trash-2" color="#dc2626" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

export function UserManagementNative() {
  const { t } = useAppTranslation();
  const { user: currentUser } = useNativeAuth();
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [pagination, setPagination] = useState<AdminUsersPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>('');
  const [deleteTarget, setDeleteTarget] = useState<AdminManagedUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminManagedUser | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const filters = useMemo<AdminUserFilters>(
    () => ({
      search: search.trim() || undefined,
      role: roleFilter,
      status: statusFilter,
      page,
      perPage: 15,
    }),
    [page, roleFilter, search, statusFilter],
  );

  const loadUsers = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError('');
      try {
        const result = await fetchAdminUsers(filters);
        setUsers(result.users);
        setPagination(result.pagination);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('admin.userManagement.errors.load', 'Failed to load users.'),
        );
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [filters, t],
  );

  useEffect(() => {
    const timeout = setTimeout(() => void loadUsers(true), 0);
    return () => clearTimeout(timeout);
  }, [loadUsers]);

  const selectableUsers = useMemo(
    () => users.filter((user) => String(user.id) !== String(currentUser?.id)),
    [currentUser?.id, users],
  );

  const allSelected =
    selectableUsers.length > 0 && selectableUsers.every((user) => selectedIds.includes(user.id));

  const refresh = async () => {
    setRefreshing(true);
    await loadUsers(false);
    setRefreshing(false);
  };

  const patchUser = (next: AdminManagedUser) => {
    setUsers((current) => current.map((item) => (item.id === next.id ? next : item)));
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : selectableUsers.map((user) => user.id));
  };

  const toggleSelect = (userId: string | number) => {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const toggleActive = async (user: AdminManagedUser) => {
    const nextActive = !user.isActive;
    setBusyId(user.id);
    patchUser({ ...user, isActive: nextActive });
    try {
      await updateAdminUserActive(user.id, nextActive);
      setMessage(
        nextActive
          ? t('admin.userManagement.messages.activated', 'User activated.')
          : t('admin.userManagement.messages.deactivated', 'User deactivated.'),
      );
      await loadUsers(false);
    } catch (err) {
      patchUser(user);
      setError(err instanceof Error ? err.message : t('admin.userManagement.errors.update', 'Failed to update user.'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmRoleChange = async (role: UserRole) => {
    if (!roleTarget) return;
    const user = roleTarget;
    setRoleTarget(null);

    if (String(user.id) === String(currentUser?.id) && role !== 'admin') {
      setError(t('admin.userManagement.errors.ownRole', 'You cannot change your own role.'));
      return;
    }

    setBusyId(user.id);
    try {
      await assignAdminUserRole(user.id, role);
      patchUser({ ...user, role });
      setMessage(t('admin.userManagement.messages.roleUpdated', 'Role updated.'));
      await loadUsers(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.userManagement.errors.role', 'Failed to update role.'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const user = deleteTarget;
    setDeleteTarget(null);
    setBusyId(user.id);
    setUsers((current) => current.filter((item) => item.id !== user.id));
    setSelectedIds((current) => current.filter((id) => id !== user.id));
    try {
      await deleteAdminUser(user.id);
      setMessage(t('admin.userManagement.messages.deleted', 'User deleted.'));
      await loadUsers(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.userManagement.errors.delete', 'Failed to delete user.'));
      await loadUsers(false);
    } finally {
      setBusyId(null);
    }
  };

  const executeBulk = async () => {
    setShowBulkModal(false);
    const actionableIds = selectedIds.filter((id) => String(id) !== String(currentUser?.id));

    if (actionableIds.length !== selectedIds.length) {
      setError(t('admin.userManagement.errors.ownSkipped', 'Your own account was skipped for safety.'));
    }

    if (actionableIds.length === 0) {
      setSelectedIds([]);
      setBulkAction('');
      return;
    }

    setBusyId('bulk');
    try {
      await Promise.all(
        actionableIds.map(async (id) => {
          if (bulkAction === 'delete') return deleteAdminUser(id);
          if (bulkAction === 'activate') return updateAdminUserActive(id, true);
          if (bulkAction === 'deactivate') return updateAdminUserActive(id, false);
          return Promise.resolve();
        }),
      );
      setMessage(
        t('admin.userManagement.messages.bulkApplied', '{{action}} applied to {{count}} user(s).', {
          action: bulkAction,
          count: actionableIds.length,
        }),
      );
      setSelectedIds([]);
      setBulkAction('');
      await loadUsers(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.userManagement.errors.bulk', 'Bulk action failed.'),
      );
    } finally {
      setBusyId(null);
    }
  };

  const hasActiveFilters = search.trim().length > 0 || roleFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const roleFilters = (['all', 'admin', 'seller', 'buyer'] as RoleFilter[]).map((filter) => ({
    id: filter,
    label:
      filter === 'all'
        ? t('admin.userManagement.filters.allRoles', 'All Roles')
        : t(`admin.userManagement.roles.${filter}`, filter),
  }));

  const statusFilters = (['all', 'active', 'inactive'] as StatusFilter[]).map((filter) => ({
    id: filter,
    label:
      filter === 'all'
        ? t('admin.userManagement.filters.allStatus', 'All Status')
        : t(`admin.userManagement.status.${filter}`, filter),
  }));

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
          {t('admin.userManagement.loading', 'Loading users...')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title={t('admin.userManagement.modals.deleteTitle', 'Delete User')}
        message={t(
          'admin.userManagement.modals.deleteConfirm',
          'Are you sure you want to delete {{name}}? This cannot be undone.',
          { name: deleteTarget?.name || '' },
        )}
        confirmLabel={t('admin.userManagement.modals.delete', 'Delete')}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        danger
      />
      <ConfirmModal
        visible={showBulkModal}
        title={t('admin.userManagement.modals.bulkTitle', 'Confirm Bulk Action')}
        message={t(
          'admin.userManagement.modals.bulkConfirm',
          'Are you sure you want to {{action}} {{count}} user(s)?',
          { action: bulkAction, count: selectedIds.length },
        )}
        confirmLabel={t('admin.userManagement.modals.confirm', 'Confirm')}
        onClose={() => setShowBulkModal(false)}
        onConfirm={() => void executeBulk()}
        danger={bulkAction === 'delete'}
      />
      <RolePickerModal
        visible={Boolean(roleTarget)}
        currentRole={roleTarget?.role || 'buyer'}
        onClose={() => setRoleTarget(null)}
        onSelect={(role) => void confirmRoleChange(role)}
      />

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t('admin.userManagement.title', 'User Management')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {pagination?.total
              ? t('admin.userManagement.subtitleCount', '{{count}} total users', {
                  count: pagination.total,
                })
              : t('admin.userManagement.subtitle', 'Manage registered users')}
          </Text>
        </View>
        <Pressable
          onPress={() => void refresh()}
          className="flex-row items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={15} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {refreshing
              ? t('admin.userManagement.loading', 'Loading users...')
              : t('admin.orderManagement.refresh', 'Refresh')}
          </Text>
        </Pressable>
      </View>

      {selectedIds.length > 0 ? (
        <View className="flex-row flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-sm font-semibold text-green-800 dark:text-green-300">
            {t('admin.userManagement.selected', '{{count}} selected', { count: selectedIds.length })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-full flex-1">
            <View className="flex-row gap-2">
              {(['activate', 'deactivate', 'delete'] as const).map((action) => {
                const active = bulkAction === action;
                return (
                  <Pressable
                    key={action}
                    onPress={() => setBulkAction(action)}
                    className={`rounded-full px-3 py-1.5 ${
                      active ? 'bg-green-600' : 'bg-white dark:bg-slate-800'
                    }`}>
                    <Text
                      className={`font-sans text-xs font-semibold capitalize ${
                        active ? 'text-white' : 'text-gray-700 dark:text-slate-300'
                      }`}>
                      {t(`admin.userManagement.bulk.${action}`, action)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Pressable
            onPress={() => {
              if (!bulkAction) {
                setError(t('admin.userManagement.errors.noAction', 'Please select an action.'));
                return;
              }
              setShowBulkModal(true);
            }}
            className="rounded-lg bg-green-600 px-3 py-1.5">
            <Text className="font-sans text-xs font-semibold text-white">
              {t('admin.userManagement.apply', 'Apply')}
            </Text>
          </Pressable>
          <Pressable onPress={() => setSelectedIds([])} className="rounded-lg border border-gray-300 px-3 py-1.5 dark:border-slate-600">
            <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-300">
              {t('admin.userManagement.clear', 'Clear')}
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
          <Pressable onPress={() => void loadUsers()}>
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
            placeholder={t('admin.userManagement.searchPlaceholder', 'Name, email or phone…')}
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
              {t('admin.userManagement.columns.role', 'Role')}
            </Text>
            {roleFilters.map((filter) => {
              const active = roleFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => {
                    setRoleFilter(filter.id);
                    setPage(1);
                  }}
                  className={`h-9 justify-center rounded-lg border px-3 ${
                    active
                      ? 'border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-900/20'
                      : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900'
                  }`}>
                  <Text
                    className={`font-sans text-sm font-medium ${
                      active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-300'
                    }`}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}

            <View className="mx-1 h-6 w-px bg-gray-200 dark:bg-slate-600" />

            <Text className="mr-1 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              {t('admin.userManagement.columns.status', 'Status')}
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
                    {t('admin.userManagement.clear', 'Clear')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </ScrollView>

        {pagination ? (
          <View className="mt-3 flex-row flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-slate-700">
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {t('admin.userManagement.subtitleCount', '{{count}} total users', {
                count: pagination.total,
              })}
            </Text>
            {pagination.from > 0 && pagination.to > 0 ? (
              <>
                <Text className="font-sans text-xs text-gray-300 dark:text-slate-600">·</Text>
                <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t('admin.userManagement.showing', 'Showing {{from}}–{{to}} of {{total}} users', {
                    from: pagination.from,
                    to: pagination.to,
                    total: pagination.total,
                  })}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {users.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[980px]">
              <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                <Pressable onPress={toggleSelectAll} className="w-10 pr-3">
                  <Feather name={allSelected ? 'check-square' : 'square'} color="#64748b" size={16} />
                </Pressable>
                {[
                  { label: t('admin.userManagement.columns.name', 'Name'), width: 'w-64' },
                  { label: t('admin.userManagement.columns.contact', 'Email / Phone'), width: 'w-52' },
                  { label: t('admin.userManagement.columns.role', 'Role'), width: 'w-36' },
                  { label: t('admin.userManagement.columns.status', 'Status'), width: 'w-36' },
                  { label: t('admin.userManagement.columns.joined', 'Joined'), width: 'w-28' },
                  { label: t('admin.userManagement.columns.actions', 'Actions'), width: 'w-16' },
                ].map((heading) => (
                  <Text
                    key={heading.label}
                    className={`${heading.width} pr-4 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400`}>
                    {heading.label}
                  </Text>
                ))}
              </View>
              {users.map((user) => (
                <UserRow
                  key={String(user.id)}
                  user={user}
                  isSelf={String(user.id) === String(currentUser?.id)}
                  selected={selectedIds.includes(user.id)}
                  busy={busyId === user.id || busyId === 'bulk'}
                  onToggleSelect={() => toggleSelect(user.id)}
                  onToggleActive={() => void toggleActive(user)}
                  onChangeRole={() => setRoleTarget(user)}
                  onDelete={() => setDeleteTarget(user)}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className="items-center py-12">
            <Feather name="user" color="#cbd5e1" size={56} />
            <Text className="mt-3 font-sans text-base font-semibold text-gray-900 dark:text-white">
              {search || roleFilter !== 'all' || statusFilter !== 'all'
                ? t('admin.userManagement.emptyFiltered', 'No users match your filters.')
                : t('admin.userManagement.empty', 'No users yet.')}
            </Text>
          </View>
        )}

        {pagination && pagination.lastPage > 1 ? (
          <View className="flex-row flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
            <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
              {t('admin.userManagement.page', 'Page {{current}} of {{last}}', {
                current: pagination.currentPage,
                last: pagination.lastPage,
              })}
            </Text>
            <Pressable
              disabled={pagination.currentPage <= 1}
              onPress={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800">
              <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-300">
                {t('admin.userManagement.previous', 'Previous')}
              </Text>
            </Pressable>
            <Pressable
              disabled={pagination.currentPage >= pagination.lastPage}
              onPress={() => setPage((current) => current + 1)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800">
              <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-300">
                {t('admin.userManagement.next', 'Next')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
