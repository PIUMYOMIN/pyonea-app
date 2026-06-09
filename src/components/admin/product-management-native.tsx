import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, router, type Href } from 'expo-router';
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
  approveAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  rejectAdminProduct,
  updateAdminProductActive,
  type AdminManagedProduct,
  type AdminProductFilters,
} from '@/utils/native-api';

const placeholderProduct = require('@/assets/images/placeholder-product.png');

type ApprovalFilter = 'all' | 'approved' | 'pending' | 'rejected';
type ActiveFilter = 'all' | 'active' | 'inactive';

const approvalTone: Record<string, { wrap: string; text: string }> = {
  approved: {
    wrap: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
  },
  pending: {
    wrap: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
  },
  rejected: {
    wrap: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
  },
};

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-MM', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  tone: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colors = {
    blue: ['bg-blue-50 dark:bg-blue-900/20', '#2563eb'],
    green: ['bg-green-50 dark:bg-green-900/20', '#16a34a'],
    yellow: ['bg-yellow-50 dark:bg-yellow-900/20', '#ca8a04'],
    red: ['bg-red-50 dark:bg-red-900/20', '#dc2626'],
  } as const;
  const [bg, color] = colors[tone];

  return (
    <View className={`w-[48%] rounded-xl p-4 lg:w-[23%] ${bg}`}>
      <Feather name={icon} color={color} size={22} />
      <Text className="mt-3 font-sans text-2xl font-black text-gray-950 dark:text-slate-100">{value}</Text>
      <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const tone = approvalTone[status] || approvalTone.pending;
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${tone.text}`}>
        {t(`admin.productManagement.table.${status}`, status)}
      </Text>
    </View>
  );
}

function StockBadge({ product }: { product: AdminManagedProduct }) {
  const { t } = useAppTranslation();
  const out = !product.inStock;
  const low = product.inStock && product.totalStock > 0 && product.totalStock <= 5;

  return (
    <Text
      className={`font-sans text-xs font-medium ${
        out
          ? 'text-red-700 dark:text-red-300'
          : low
            ? 'text-amber-700 dark:text-amber-300'
            : 'text-green-700 dark:text-green-300'
      }`}>
      {out
        ? t('admin.productManagement.table.outOfStock', 'Out of stock')
        : low
          ? t('admin.productManagement.table.lowStock', 'Low stock')
          : `${product.totalStock.toLocaleString()} units`}
    </Text>
  );
}

function ProductRow({
  product,
  busyId,
  onToggleActive,
  onApprove,
  onReject,
  onDelete,
}: {
  product: AdminManagedProduct;
  busyId: string | number | null;
  onToggleActive: (product: AdminManagedProduct) => void;
  onApprove: (product: AdminManagedProduct) => void;
  onReject: (product: AdminManagedProduct) => void;
  onDelete: (product: AdminManagedProduct) => void;
}) {
  const { t } = useAppTranslation();
  const busy = busyId === product.id;
  const productHref = `/products/${product.slug || product.id}` as Href;
  const editHref = `/admin/products/${product.id}/edit` as Href;

  return (
    <View className="min-h-[84px] w-full flex-row items-center border-b border-gray-100 bg-white px-4 py-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-800">
      <View className="w-72 flex-row gap-3 pr-4">
        <View className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
          <Image
            source={product.imageUrl ? { uri: product.imageUrl } : placeholderProduct}
            className="h-full w-full"
            contentFit="cover"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={2}>
            {product.name}
          </Text>
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
            {product.sellerName || '—'}
          </Text>
        </View>
      </View>

      <View className="w-28 pr-4">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300" numberOfLines={1}>
          {product.sku || t('admin.productManagement.table.na', 'N/A')}
        </Text>
      </View>

      <View className="w-36 pr-4">
        <Text className="font-sans text-xs font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {product.categoryName || t('admin.productManagement.table.uncategorized', 'Uncategorized')}
        </Text>
      </View>

      <View className="w-32 pr-4">
        {product.isOnSale ? (
          <>
            <Text className="font-sans text-sm font-bold text-red-600 dark:text-red-400" numberOfLines={1}>
              {product.salePrice}
            </Text>
            <Text className="font-sans text-xs text-gray-400 line-through dark:text-slate-500" numberOfLines={1}>
              {product.price}
            </Text>
          </>
        ) : (
          <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {product.price}
          </Text>
        )}
      </View>

      <View className="w-28 pr-4">
        <StockBadge product={product} />
      </View>

      <View className="w-24 pr-4">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300">{product.moq}</Text>
      </View>

      <View className="w-32 pr-4">
        <ApprovalBadge status={product.approvalStatus} />
      </View>

      <View className="w-28 pr-4">
        <Pressable
          onPress={() => onToggleActive(product)}
          disabled={busy}
          className={`self-start rounded-full px-2.5 py-1 ${
            product.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'
          }`}>
          <Text
            className={`font-sans text-xs font-medium ${
              product.isActive ? 'text-green-800 dark:text-green-300' : 'text-gray-800 dark:text-slate-300'
            }`}>
            {product.isActive
              ? t('admin.productManagement.table.active', 'Active')
              : t('admin.productManagement.table.inactive', 'Inactive')}
          </Text>
        </Pressable>
      </View>

      <View className="w-28 pr-4">
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{formatDate(product.createdAt)}</Text>
      </View>

      <View className="w-48 flex-row flex-wrap items-center gap-1.5">
        <Link href={productHref} asChild>
          <Pressable className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Feather name="external-link" color="#2563eb" size={16} />
          </Pressable>
        </Link>
        <Pressable
          disabled={busy}
          onPress={() => router.push(editHref)}
          className="h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
          <Feather name="edit-2" color="#4f46e5" size={16} />
        </Pressable>
        {product.approvalStatus === 'pending' ? (
          <>
            <Pressable
              disabled={busy}
              onPress={() => onApprove(product)}
              className="h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <Feather name="check" color="#16a34a" size={16} />
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => onReject(product)}
              className="h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
              <Feather name="x" color="#dc2626" size={16} />
            </Pressable>
          </>
        ) : product.approvalStatus === 'rejected' ? (
          <Pressable
            disabled={busy}
            onPress={() => onApprove(product)}
            className="rounded-lg bg-green-50 px-2 py-1 dark:bg-green-900/20">
            <Text className="font-sans text-[11px] font-semibold text-green-700 dark:text-green-300">
              {t('admin.productManagement.table.reApprove', 'Re-approve')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={busy}
          onPress={() => onDelete(product)}
          className="h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
          <Feather name="trash-2" color="#dc2626" size={16} />
        </Pressable>
      </View>
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
                {t('admin.productManagement.modals.cancel', 'Cancel')}
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

export function ProductManagementNative() {
  const { t } = useAppTranslation();
  const [products, setProducts] = useState<AdminManagedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminManagedProduct | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminManagedProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminManagedProduct | null>(null);

  const filters = useMemo<AdminProductFilters>(
    () => ({
      search: search.trim() || undefined,
      approvalStatus: approvalFilter,
      activeStatus: activeFilter,
    }),
    [activeFilter, approvalFilter, search],
  );

  const loadProducts = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError('');
      try {
        setProducts(await fetchAdminProducts(filters));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('admin.productManagement.errors.failedLoadProducts', 'Failed to load products.'),
        );
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [filters, t],
  );

  useEffect(() => {
    const timeout = setTimeout(() => void loadProducts(true), 0);
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  const stats = useMemo(
    () => ({
      total: products.length,
      pending: products.filter((product) => product.approvalStatus === 'pending').length,
      approved: products.filter((product) => product.approvalStatus === 'approved').length,
      inactive: products.filter((product) => !product.isActive).length,
    }),
    [products],
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadProducts(false);
    setRefreshing(false);
  };

  const patchProduct = (next: AdminManagedProduct) => {
    setProducts((current) => current.map((item) => (item.id === next.id ? next : item)));
  };

  const removeProduct = (productId: string | number) => {
    setProducts((current) => current.filter((item) => item.id !== productId));
  };

  const toggleActive = async (product: AdminManagedProduct) => {
    const nextActive = !product.isActive;
    setBusyId(product.id);
    patchProduct({ ...product, isActive: nextActive });
    try {
      await updateAdminProductActive(product.id, nextActive);
      setMessage(t('admin.productManagement.notifications.statusUpdated', 'Status updated'));
      await loadProducts(false);
    } catch (err) {
      patchProduct(product);
      setError(err instanceof Error ? err.message : t('admin.productManagement.errors.unknownError', 'Unknown error'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    const product = approveTarget;
    setApproveTarget(null);
    setBusyId(product.id);
    try {
      await approveAdminProduct(product.id);
      setMessage(t('admin.productManagement.notifications.approved', 'Product approved'));
      await loadProducts(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.productManagement.errors.unknownError', 'Unknown error'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const product = rejectTarget;
    setRejectTarget(null);
    setBusyId(product.id);
    try {
      await rejectAdminProduct(product.id);
      setMessage(t('admin.productManagement.notifications.rejected', 'Product rejected'));
      await loadProducts(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.productManagement.errors.unknownError', 'Unknown error'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const product = deleteTarget;
    setDeleteTarget(null);
    setBusyId(product.id);
    removeProduct(product.id);
    try {
      await deleteAdminProduct(product.id);
      setMessage(t('admin.productManagement.notifications.deleted', 'Product deleted'));
      await loadProducts(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.productManagement.errors.unknownError', 'Unknown error'));
      await loadProducts(false);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
          {t('admin.productManagement.loading', 'Loading products...')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <ConfirmModal
        visible={Boolean(approveTarget)}
        title={t('admin.productManagement.modals.approveProduct', 'Approve Product')}
        message={t(
          'admin.productManagement.modals.approveConfirm',
          'Are you sure you want to approve this product? It will become visible to buyers immediately.',
        )}
        confirmLabel={t('admin.productManagement.modals.approve', 'Approve')}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => void confirmApprove()}
      />
      <ConfirmModal
        visible={Boolean(rejectTarget)}
        title={t('admin.productManagement.modals.rejectProduct', 'Reject Product')}
        message={t(
          'admin.productManagement.modals.rejectReason',
          'Optionally provide a reason for the seller:',
        )}
        confirmLabel={t('admin.productManagement.modals.reject', 'Reject')}
        onClose={() => setRejectTarget(null)}
        onConfirm={() => void confirmReject()}
        danger
      />
      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title={t('admin.productManagement.modals.deleteProduct', 'Delete Product')}
        message={t(
          'admin.productManagement.modals.deleteConfirm',
          'Are you sure you want to delete this product? This cannot be undone.',
        )}
        confirmLabel={t('admin.productManagement.modals.delete', 'Delete')}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        danger
      />

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t('admin.productManagement.title', 'Product Management')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('admin.productManagement.subtitle', 'Manage all products in your marketplace')}
          </Text>
        </View>
        <Pressable
          onPress={() => void refresh()}
          className="flex-row items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={15} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {refreshing
              ? t('admin.productManagement.loading', 'Loading products...')
              : t('admin.orderManagement.refresh', 'Refresh')}
          </Text>
        </Pressable>
      </View>

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
        </Pressable>
      ) : null}

      <View className="gap-3 sm:flex-row sm:items-center">
        <View className="min-w-0 flex-1 flex-row items-center rounded-xl border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
          <Feather name="search" color="#94a3b8" size={16} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('admin.productManagement.filters.searchPlaceholder', 'Search by name, SKU...')}
            placeholderTextColor="#94a3b8"
            className="min-w-0 flex-1 py-2.5 pl-2 font-sans text-sm text-gray-900 dark:text-slate-100"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        <View className="flex-row gap-2 px-1">
          {(['all', 'approved', 'pending', 'rejected'] as ApprovalFilter[]).map((filter) => {
            const active = approvalFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setApprovalFilter(filter)}
                className={`rounded-full px-4 py-2 ${active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-800'}`}>
                <Text
                  className={`font-sans text-sm font-semibold capitalize ${
                    active ? 'text-white' : 'text-gray-700 dark:text-slate-300'
                  }`}>
                  {filter === 'all'
                    ? t('admin.productManagement.filters.allStatuses', 'All Statuses')
                    : t(`admin.productManagement.table.${filter}`, filter)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        <View className="flex-row gap-2 px-1">
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map((filter) => {
            const active = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2 ${active ? 'bg-slate-800 dark:bg-slate-600' : 'bg-gray-100 dark:bg-slate-800'}`}>
                <Text
                  className={`font-sans text-sm font-semibold capitalize ${
                    active ? 'text-white' : 'text-gray-700 dark:text-slate-300'
                  }`}>
                  {filter === 'all'
                    ? t('admin.productManagement.filters.all', 'All')
                    : t(`admin.productManagement.table.${filter}`, filter)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="flex-row flex-wrap gap-3">
        <SummaryCard
          label={t('admin.productManagement.total', 'Total')}
          value={stats.total}
          icon="box"
          tone="blue"
        />
        <SummaryCard
          label={t('admin.productManagement.pending', 'Pending')}
          value={stats.pending}
          icon="clock"
          tone="yellow"
        />
        <SummaryCard
          label={t('admin.productManagement.approved', 'Approved')}
          value={stats.approved}
          icon="check-circle"
          tone="green"
        />
        <SummaryCard
          label={t('admin.productManagement.table.inactive', 'Inactive')}
          value={stats.inactive}
          icon="slash"
          tone="red"
        />
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {products.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[1328px]">
              <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                {[
                  { label: t('admin.productManagement.table.name', 'Name'), width: 'w-72' },
                  { label: t('admin.productManagement.table.sku', 'SKU'), width: 'w-28' },
                  { label: t('admin.productManagement.table.category', 'Category'), width: 'w-36' },
                  { label: t('admin.productManagement.table.price', 'Price'), width: 'w-32' },
                  { label: t('admin.productManagement.table.stock', 'Stock'), width: 'w-28' },
                  { label: t('admin.productManagement.table.moq', 'MOQ'), width: 'w-24' },
                  { label: t('admin.productManagement.table.approvalStatus', 'Approval'), width: 'w-32' },
                  { label: t('admin.productManagement.table.activeInactive', 'Active'), width: 'w-28' },
                  { label: t('admin.productManagement.table.created', 'Created'), width: 'w-28' },
                  { label: t('admin.productManagement.table.actions', 'Actions'), width: 'w-48' },
                ].map((heading) => (
                  <Text
                    key={heading.label}
                    className={`${heading.width} pr-4 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400`}>
                    {heading.label}
                  </Text>
                ))}
              </View>
              {products.map((product) => (
                <ProductRow
                  key={String(product.id)}
                  product={product}
                  busyId={busyId}
                  onToggleActive={(item) => void toggleActive(item)}
                  onApprove={setApproveTarget}
                  onReject={setRejectTarget}
                  onDelete={setDeleteTarget}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className="items-center py-12">
            <Feather name="box" color="#cbd5e1" size={56} />
            <Text className="mt-3 font-sans text-base font-semibold text-gray-900 dark:text-white">
              {t('admin.productManagement.noProductsFound', 'No products found matching your criteria')}
            </Text>
          </View>
        )}
        <View className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
          <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('admin.productManagement.showing', 'Showing')} {products.length}{' '}
            {t('admin.productManagement.products', 'products')}
          </Text>
        </View>
      </View>
    </View>
  );
}
