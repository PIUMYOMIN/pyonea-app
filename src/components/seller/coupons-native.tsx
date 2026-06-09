import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  deleteSellerCoupon,
  fetchSellerCoupons,
  fetchSellerManagedProducts,
  formatMMK,
  saveSellerCoupon,
  toggleSellerCouponStatus,
  type SellerCoupon,
  type SellerCouponPayload,
  type SellerCouponType,
  type SellerManagedProduct,
} from '@/utils/native-api';

type CouponForm = {
  name: string;
  code: string;
  type: SellerCouponType;
  value: string;
  min_order_amount: string;
  applicable_product_ids: (string | number)[] | null;
  max_uses: string;
  max_uses_per_user: string;
  is_one_time_use: boolean;
  is_active: boolean;
  starts_at: string;
  expires_at: string;
};

const emptyForm: CouponForm = {
  name: '',
  code: '',
  type: 'percentage',
  value: '',
  min_order_amount: '',
  applicable_product_ids: null,
  max_uses: '',
  max_uses_per_user: '',
  is_one_time_use: false,
  is_active: true,
  starts_at: '',
  expires_at: '',
};

const dateInputValue = (value: string) => (value ? value.split('T')[0].split(' ')[0] : '');

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-MM').format(date);
};

const getStatus = (coupon: SellerCoupon, nowTimestamp: number) => {
  if (!coupon.isActive) return { label: 'Inactive', className: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-300' };
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > nowTimestamp) {
    return { label: 'Upcoming', className: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < nowTimestamp) {
    return { label: 'Expired', className: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' };
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { label: 'Used up', className: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' };
  }
  return { label: 'Active', className: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-800 dark:text-green-300' };
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  required,
  mono,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  required?: boolean;
  mono?: boolean;
}) {
  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        className={`h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${
          mono ? 'font-mono uppercase' : 'font-sans'
        }`}
      />
    </View>
  );
}

function CheckboxRow({
  checked,
  onPress,
  label,
  description,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  description?: string;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-start gap-3">
      <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${checked ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white dark:border-slate-500 dark:bg-slate-800'}`}>
        {checked ? <Feather name="check" color="#ffffff" size={14} /> : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-200">{label}</Text>
        {description ? <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{description}</Text> : null}
      </View>
    </Pressable>
  );
}

function CouponCard({
  coupon,
  nowTimestamp,
  copiedCode,
  onCopy,
  onEdit,
  onDelete,
  onToggle,
}: {
  coupon: SellerCoupon;
  nowTimestamp: number;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onEdit: (coupon: SellerCoupon) => void;
  onDelete: (coupon: SellerCoupon) => void;
  onToggle: (coupon: SellerCoupon) => void;
}) {
  const status = getStatus(coupon, nowTimestamp);
  const expired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < nowTimestamp;
  const dimmed = expired || !coupon.isActive;

  return (
    <View className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${dimmed ? 'opacity-60' : ''}`}>
      <View className="border-b border-gray-200 bg-green-50 px-5 py-4 dark:border-slate-700 dark:bg-green-900/20">
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="font-sans font-semibold text-gray-900 dark:text-white" numberOfLines={1}>{coupon.name}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className="rounded border border-green-200 bg-white px-2 py-0.5 dark:border-green-700 dark:bg-slate-700">
                <Text className="font-mono text-sm font-bold uppercase tracking-widest text-green-700 dark:text-green-400">{coupon.code}</Text>
              </View>
              <Pressable onPress={() => onCopy(coupon.code)}>
                <Feather name={copiedCode === coupon.code ? 'check' : 'clipboard'} color={copiedCode === coupon.code ? '#16a34a' : '#94a3b8'} size={16} />
              </Pressable>
            </View>
          </View>
          <View className={`rounded-full px-2.5 py-1 ${status.className}`}>
            <Text className={`font-sans text-xs font-medium ${status.text}`}>{status.label}</Text>
          </View>
        </View>
      </View>

      <View className="gap-2 px-5 py-4">
        <View className="flex-row items-center gap-2">
          <Feather name={coupon.type === 'percentage' ? 'tag' : 'dollar-sign'} color={coupon.type === 'percentage' ? '#3b82f6' : '#16a34a'} size={16} />
          <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">
            {coupon.type === 'percentage' ? `${coupon.value}% off` : `${formatMMK(coupon.value)} off`}
          </Text>
          {coupon.minOrderAmount ? (
            <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">min {formatMMK(coupon.minOrderAmount)}</Text>
          ) : null}
        </View>
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
          {!coupon.applicableProductIds || coupon.applicableProductIds.length === 0
            ? 'Applies to all your products'
            : `Applies to ${coupon.applicableProductIds.length} specific product(s)`}
        </Text>
        <View className="flex-row items-center gap-1">
          <Feather name="calendar" color="#94a3b8" size={14} />
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
            {coupon.startsAt ? formatDate(coupon.startsAt) : 'Now'} - {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No expiry'}
          </Text>
        </View>
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
          Used: {coupon.usedCount} / {coupon.maxUses || 'unlimited'}
          {coupon.maxUsesPerUser ? ` - ${coupon.maxUsesPerUser}x/customer` : ''}
          {coupon.isOneTimeUse ? ' - One-time use' : ''}
        </Text>
      </View>

      <View className="flex-row items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-700/50">
        <Pressable
          onPress={() => onToggle(coupon)}
          className={`rounded-full px-3 py-1 ${coupon.isActive ? 'bg-green-100 dark:bg-green-900/40' : 'bg-gray-200 dark:bg-slate-600'}`}
        >
          <Text className={`font-sans text-xs font-medium ${coupon.isActive ? 'text-green-800 dark:text-green-300' : 'text-gray-600 dark:text-slate-300'}`}>
            {coupon.isActive ? 'Active' : 'Inactive'}
          </Text>
        </Pressable>
        <View className="flex-row gap-2">
          <Pressable onPress={() => onEdit(coupon)} className="rounded p-1.5 hover:bg-gray-200 dark:hover:bg-slate-600">
            <Feather name="edit-3" color="#64748b" size={16} />
          </Pressable>
          <Pressable onPress={() => onDelete(coupon)} className="rounded p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30">
            <Feather name="trash-2" color="#ef4444" size={16} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function CouponsNative() {
  const [coupons, setCoupons] = useState<SellerCoupon[]>([]);
  const [products, setProducts] = useState<SellerManagedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<SellerCoupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SellerCoupon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [restrictToProducts, setRestrictToProducts] = useState(false);
  const [nowTimestamp] = useState(() => Date.now());

  const loadData = useCallback(async () => {
    try {
      const [couponList, productResult] = await Promise.all([
        fetchSellerCoupons(),
        fetchSellerManagedProducts(),
      ]);
      setCoupons(couponList);
      setProducts(productResult.products);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadData]);

  const updateForm = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCoupon(null);
    setRestrictToProducts(false);
  };

  const openCreate = () => {
    if (showForm && !editingCoupon) {
      setShowForm(false);
      resetForm();
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const openEdit = (coupon: SellerCoupon) => {
    const hasRestriction = Array.isArray(coupon.applicableProductIds) && coupon.applicableProductIds.length > 0;
    setEditingCoupon(coupon);
    setRestrictToProducts(hasRestriction);
    setForm({
      name: coupon.name,
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value || ''),
      min_order_amount: coupon.minOrderAmount == null ? '' : String(coupon.minOrderAmount),
      applicable_product_ids: coupon.applicableProductIds,
      max_uses: coupon.maxUses == null ? '' : String(coupon.maxUses),
      max_uses_per_user: coupon.maxUsesPerUser == null ? '' : String(coupon.maxUsesPerUser),
      is_one_time_use: coupon.isOneTimeUse,
      is_active: coupon.isActive,
      starts_at: dateInputValue(coupon.startsAt),
      expires_at: dateInputValue(coupon.expiresAt),
    });
    setShowForm(true);
  };

  const toggleProductSelection = (productId: string | number) => {
    setForm((current) => {
      const ids = current.applicable_product_ids ?? [];
      return {
        ...current,
        applicable_product_ids: ids.includes(productId)
          ? ids.filter((id) => id !== productId)
          : [...ids, productId],
      };
    });
  };

  const toggleRestrictToProducts = () => {
    setRestrictToProducts((current) => {
      const next = !current;
      updateForm('applicable_product_ids', next ? [] : null);
      return next;
    });
  };

  const copyCode = (code: string) => {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (clipboard?.writeText) void clipboard.writeText(code);
    setCopiedCode(code);
    setMessage('Coupon code copied.');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const submitCoupon = async () => {
    setError('');
    const value = Number(form.value);
    if (!form.name.trim()) {
      setError('Coupon name is required');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Coupon value must be greater than 0');
      return;
    }
    if (form.type === 'percentage' && value > 100) {
      setError('Percentage cannot exceed 100');
      return;
    }
    if (restrictToProducts && !form.applicable_product_ids?.length) {
      setError('Please select at least one product, or uncheck the restriction');
      return;
    }

    const payload: SellerCouponPayload = {
      name: form.name.trim(),
      code: form.code.trim() ? form.code.trim().toUpperCase() : null,
      type: form.type,
      value,
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      applicable_product_ids: restrictToProducts ? form.applicable_product_ids ?? [] : null,
      max_uses: form.max_uses ? Number.parseInt(form.max_uses, 10) : null,
      max_uses_per_user: form.max_uses_per_user ? Number.parseInt(form.max_uses_per_user, 10) : null,
      is_one_time_use: form.is_one_time_use,
      is_active: form.is_active,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
    };

    setSubmitting(true);
    try {
      await saveSellerCoupon(payload, editingCoupon?.id);
      await loadData();
      resetForm();
      setShowForm(false);
      setMessage(editingCoupon ? 'Coupon updated.' : 'Coupon created.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSellerCoupon(deleteTarget.id);
      await loadData();
      setMessage('Coupon deleted.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete coupon');
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleStatus = async (coupon: SellerCoupon) => {
    setCoupons((current) => current.map((item) => item.id === coupon.id ? { ...item, isActive: !item.isActive } : item));
    try {
      await toggleSellerCouponStatus(coupon.id);
    } catch (requestError) {
      setCoupons((current) => current.map((item) => item.id === coupon.id ? coupon : item));
      setError(requestError instanceof Error ? requestError.message : 'Failed to update coupon status');
    }
  };

  if (loading) {
    return (
      <View className="h-64 items-center justify-center">
        <ActivityIndicator color="#22c55e" size="large" />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-white">Coupon Codes</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            Create codes buyers enter at checkout - applies only to your own products.
          </Text>
        </View>
        <Pressable onPress={openCreate} className="flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2">
          <Feather name="plus" color="#ffffff" size={18} />
          <Text className="font-sans text-sm font-semibold text-white">{showForm ? 'Cancel' : 'New Coupon'}</Text>
        </Pressable>
      </View>

      {message ? (
        <Pressable onPress={() => setMessage('')} className="flex-row items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-sm text-green-700 dark:text-green-300">{message}</Text>
          <Feather name="x-circle" color="#16a34a" size={18} />
        </Pressable>
      ) : null}

      {error ? (
        <Pressable onPress={() => setError('')} className="flex-row items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Feather name="x-circle" color="#dc2626" size={18} />
        </Pressable>
      ) : null}

      <Modal transparent visible={Boolean(deleteTarget)} animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-4">
          <View className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <Text className="mb-2 font-sans text-lg font-semibold text-gray-900 dark:text-white">Delete Coupon</Text>
            <Text className="mb-6 font-sans text-sm text-gray-600 dark:text-slate-300">
              Are you sure? Buyers who already received this code will not be able to use it.
            </Text>
            <View className="flex-row justify-end gap-3">
              <Pressable onPress={() => setDeleteTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void confirmDelete()} className="rounded-lg bg-red-600 px-4 py-2">
                <Text className="font-sans text-sm text-white">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {showForm ? (
        <View className="rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-slate-700 dark:bg-slate-800">
          <Text className="mb-6 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
            {editingCoupon ? 'Edit Coupon' : 'New Coupon Code'}
          </Text>

          <View className="gap-6">
            <View className="gap-4 md:flex-row">
              <Field label="Coupon name" required value={form.name} onChangeText={(value) => updateForm('name', value)} placeholder="e.g. Flash Sale 30% Off" />
              <Field label="Code" mono value={form.code} onChangeText={(value) => updateForm('code', value.toUpperCase())} placeholder="e.g. SUMMER30" />
            </View>

            <View className="gap-4 md:flex-row">
              <View className="min-w-0 flex-1">
                <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Discount type *</Text>
                <View className="flex-row gap-2">
                  {(['percentage', 'fixed'] as SellerCouponType[]).map((type) => {
                    const active = form.type === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => updateForm('type', type)}
                        className={`flex-1 rounded-lg border px-3 py-2 ${active ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'}`}
                      >
                        <Text className={`text-center font-sans text-sm font-semibold ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-300'}`}>
                          {type === 'percentage' ? 'Percentage (%)' : 'Fixed amount'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <Field label={form.type === 'percentage' ? 'Percentage (1-100)' : 'Amount (MMK)'} required keyboardType="numeric" value={form.value} onChangeText={(value) => updateForm('value', value)} placeholder={form.type === 'percentage' ? '30' : '5000'} />
              <Field label="Min order amount (MMK)" keyboardType="numeric" value={form.min_order_amount} onChangeText={(value) => updateForm('min_order_amount', value)} placeholder="Leave empty for none" />
            </View>

            <View className="gap-4 md:flex-row">
              <Field label="Valid from" value={form.starts_at} onChangeText={(value) => updateForm('starts_at', value)} placeholder="YYYY-MM-DD" />
              <Field label="Expires at" value={form.expires_at} onChangeText={(value) => updateForm('expires_at', value)} placeholder="YYYY-MM-DD" />
            </View>

            <View className="gap-4 md:flex-row">
              <Field label="Max total uses" keyboardType="numeric" value={form.max_uses} onChangeText={(value) => updateForm('max_uses', value)} placeholder="Leave empty for unlimited" />
              <Field label="Max uses per customer" keyboardType="numeric" value={form.max_uses_per_user} onChangeText={(value) => updateForm('max_uses_per_user', value)} placeholder="Leave empty for unlimited" />
            </View>

            <View className="gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/50">
              <CheckboxRow
                checked={restrictToProducts}
                onPress={toggleRestrictToProducts}
                label="Restrict to specific products only"
                description="When unchecked, the coupon applies to all your products."
              />

              {restrictToProducts ? (
                <View>
                  <Text className="mb-2 font-sans text-xs text-gray-500 dark:text-slate-400">
                    {form.applicable_product_ids?.length ?? 0} product(s) selected
                  </Text>
                  <ScrollView className="max-h-52 rounded-lg border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                    {products.length === 0 ? (
                      <Text className="p-3 font-sans text-sm text-gray-500 dark:text-slate-400">No products found</Text>
                    ) : (
                      products.map((product) => {
                        const checked = (form.applicable_product_ids ?? []).includes(product.id);
                        return (
                          <Pressable
                            key={String(product.id)}
                            onPress={() => toggleProductSelection(product.id)}
                            className="flex-row items-center gap-3 border-b border-gray-100 px-3 py-2 dark:border-slate-700"
                          >
                            <View className={`h-5 w-5 items-center justify-center rounded border ${checked ? 'border-green-600 bg-green-600' : 'border-gray-300 dark:border-slate-500'}`}>
                              {checked ? <Feather name="check" color="#ffffff" size={14} /> : null}
                            </View>
                            <Text className="min-w-0 flex-1 font-sans text-sm text-gray-800 dark:text-slate-200" numberOfLines={1}>
                              {product.nameEn || product.nameMm || product.name}
                            </Text>
                            <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{product.price}</Text>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <View className="flex-row flex-wrap gap-6">
              <CheckboxRow checked={form.is_one_time_use} onPress={() => updateForm('is_one_time_use', !form.is_one_time_use)} label="One-time use per customer" />
              <CheckboxRow checked={form.is_active} onPress={() => updateForm('is_active', !form.is_active)} label="Active immediately" />
            </View>

            <View className="flex-row justify-end gap-3 border-t border-gray-200 pt-2 dark:border-slate-600">
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submitCoupon()} disabled={submitting} className="rounded-lg bg-green-600 px-4 py-2 disabled:opacity-50">
                <Text className="font-sans text-sm text-white">{submitting ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {coupons.length === 0 && !showForm ? (
        <View className="items-center gap-3 rounded-lg border border-gray-200 bg-white py-16 shadow dark:border-slate-700 dark:bg-slate-800">
          <Feather name="percent" color="#94a3b8" size={56} />
          <Text className="font-sans text-base font-medium text-gray-600 dark:text-slate-300">No coupon codes yet</Text>
          <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">Create your first coupon to share with buyers</Text>
          <Pressable onPress={openCreate} className="mt-2 rounded-lg bg-green-600 px-4 py-2">
            <Text className="font-sans text-sm text-white">Create first coupon</Text>
          </Pressable>
        </View>
      ) : (
        <View className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon) => (
            <CouponCard
              key={String(coupon.id)}
              coupon={coupon}
              nowTimestamp={nowTimestamp}
              copiedCode={copiedCode}
              onCopy={copyCode}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggle={(item) => void toggleStatus(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
