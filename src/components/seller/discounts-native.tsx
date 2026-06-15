import Feather from '@expo/vector-icons/Feather';
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

import {
  deleteSellerDiscount,
  fetchSellerDiscounts,
  fetchSellerManagedProducts,
  fetchSellerProductCategories,
  formatMMK,
  saveSellerDiscount,
  toggleSellerDiscountStatus,
  type SellerDiscount,
  type SellerDiscountPayload,
  type SellerDiscountScope,
  type SellerDiscountType,
  type SellerManagedProduct,
  type SellerProductCategory,

  formatApiErrorMessage,
} from '@/utils/native-api';

type DiscountForm = {
  name: string;
  type: SellerDiscountType;
  value: string;
  min_order_amount: string;
  max_uses: string;
  max_uses_per_user: string;
  starts_at: string;
  expires_at: string;
  applicable_to: SellerDiscountScope;
  applicable_product_ids: (string | number)[];
  applicable_category_ids: (string | number)[];
  is_one_time_use: boolean;
  is_active: boolean;
};

const emptyForm: DiscountForm = {
  name: '',
  type: '',
  value: '',
  min_order_amount: '',
  max_uses: '',
  max_uses_per_user: '',
  starts_at: '',
  expires_at: '',
  applicable_to: 'specific_products',
  applicable_product_ids: [],
  applicable_category_ids: [],
  is_one_time_use: false,
  is_active: true,
};

const dateInputValue = (value: string) => (value ? value.split('T')[0].split(' ')[0] : '');

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-MM').format(date);
};

const flattenCategories = (categories: SellerProductCategory[]): SellerProductCategory[] =>
  categories.flatMap((category) => (category.children.length ? category.children : [category]));

const discountLabel = (discount: SellerDiscount) => {
  if (discount.type === 'percentage') return `${discount.value ?? 0}%`;
  if (discount.type === 'fixed') return formatMMK(discount.value ?? 0);
  if (discount.type === 'free_shipping') return 'Free shipping';
  return '-';
};

const scopeSummary = (discount: SellerDiscount) => {
  if (discount.applicableTo === 'all_products') return 'All products';
  if (discount.applicableTo === 'specific_products') return `${discount.applicableProductIds.length} product(s)`;
  if (discount.applicableTo === 'specific_categories') return `${discount.applicableCategoryIds.length} category(s)`;
  return '-';
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  required?: boolean;
  disabled?: boolean;
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
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 disabled:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
      />
    </View>
  );
}

function CheckRow({
  checked,
  onPress,
  label,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3">
      <View className={`h-5 w-5 items-center justify-center rounded border ${checked ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white dark:border-slate-500 dark:bg-slate-800'}`}>
        {checked ? <Feather name="check" color="#ffffff" size={14} /> : null}
      </View>
      <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">{label}</Text>
    </Pressable>
  );
}

function DiscountTypeButton({
  type,
  active,
  onPress,
}: {
  type: Exclude<SellerDiscountType, ''>;
  active: boolean;
  onPress: () => void;
}) {
  const icon = type === 'percentage' ? 'tag' : type === 'fixed' ? 'dollar-sign' : 'truck';
  const label = type === 'percentage' ? 'Percentage (%)' : type === 'fixed' ? 'Fixed amount' : 'Free shipping';
  return (
    <Pressable
      onPress={onPress}
      className={`min-w-40 flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-3 py-2 ${
        active ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
      }`}
    >
      <Feather name={icon} color={active ? '#16a34a' : '#64748b'} size={16} />
      <Text className={`font-sans text-sm font-semibold ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-300'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function DiscountRow({
  discount,
  onEdit,
  onDelete,
  onToggle,
}: {
  discount: SellerDiscount;
  onEdit: (discount: SellerDiscount) => void;
  onDelete: (discount: SellerDiscount) => void;
  onToggle: (discount: SellerDiscount) => void;
}) {
  return (
    <View className="gap-3 border-b border-gray-200 px-6 py-4 dark:border-slate-700 md:grid md:grid-cols-12 md:items-center md:gap-4">
      <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100 md:col-span-2">{discount.name}</Text>
      <View className="md:col-span-2">
        <View className="flex-row items-center gap-2">
          <Feather name={discount.type === 'percentage' ? 'tag' : discount.type === 'fixed' ? 'dollar-sign' : 'truck'} color={discount.type === 'fixed' ? '#16a34a' : discount.type === 'free_shipping' ? '#8b5cf6' : '#3b82f6'} size={16} />
          <Text className="font-sans text-sm text-gray-700 dark:text-slate-200">{discountLabel(discount)}</Text>
        </View>
        {discount.minOrderAmount ? (
          <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500">Min: {formatMMK(discount.minOrderAmount)}</Text>
        ) : null}
      </View>
      <Text className="font-sans text-sm text-gray-600 dark:text-slate-400 md:col-span-2">{scopeSummary(discount)}</Text>
      <View className="md:col-span-2">
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">From {formatDate(discount.startsAt)}</Text>
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">To {formatDate(discount.expiresAt)}</Text>
      </View>
      <Text className="font-sans text-sm text-gray-500 dark:text-slate-400 md:col-span-1">
        {discount.usedCount} / {discount.maxUses || 'unlimited'}
      </Text>
      <View className="md:col-span-1">
        <Pressable
          onPress={() => onToggle(discount)}
          className={`self-start rounded-full px-3 py-1 ${discount.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}
        >
          <Text className={`font-sans text-xs font-medium ${discount.isActive ? 'text-green-800 dark:text-green-300' : 'text-gray-600 dark:text-slate-300'}`}>
            {discount.isActive ? 'Active' : 'Inactive'}
          </Text>
        </Pressable>
      </View>
      <View className="flex-row gap-3 md:col-span-2 md:justify-end">
        <Pressable onPress={() => onEdit(discount)}>
          <Feather name="edit-3" color="#16a34a" size={20} />
        </Pressable>
        <Pressable onPress={() => onDelete(discount)}>
          <Feather name="trash-2" color="#ef4444" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

function DirectDiscountProductRow({ product }: { product: SellerManagedProduct }) {
  const salePrice = product.discountPriceValue || product.salePriceValue;
  const discountAmount = product.discountPriceValue ? product.priceValue - product.discountPriceValue : 0;
  return (
    <View className="gap-2 border-b border-gray-100 px-4 py-3 dark:border-slate-700 md:grid md:grid-cols-6 md:items-center md:gap-4">
      <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100 md:col-span-1" numberOfLines={1}>{product.nameEn || product.name}</Text>
      <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">{product.price}</Text>
      <Text className="font-sans text-sm font-semibold text-blue-700 dark:text-blue-400">
        {product.discountPercentage ? `-${product.discountPercentage}%` : discountAmount > 0 ? `-${formatMMK(discountAmount)}` : '-'}
      </Text>
      <Text className="font-sans text-sm font-semibold text-red-600 dark:text-red-400">{salePrice ? formatMMK(salePrice) : '-'}</Text>
      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{product.discountEnd ? formatDate(product.discountEnd) : 'No expiry'}</Text>
      <View className={`self-start rounded-full px-2 py-0.5 ${product.isOnSale ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
        <Text className={`font-sans text-xs font-medium ${product.isOnSale ? 'text-green-800 dark:text-green-300' : 'text-gray-600 dark:text-slate-400'}`}>
          {product.isOnSale ? 'On Sale' : 'Inactive'}
        </Text>
      </View>
    </View>
  );
}

export function DiscountsNative() {
  const [discounts, setDiscounts] = useState<SellerDiscount[]>([]);
  const [products, setProducts] = useState<SellerManagedProduct[]>([]);
  const [categories, setCategories] = useState<SellerProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<SellerDiscount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SellerDiscount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<DiscountForm>(emptyForm);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const sellerCategoryIds = useMemo(() => new Set(products.map((product) => String(product.categoryId)).filter(Boolean)), [products]);
  const relevantCategories = useMemo(
    () => flatCategories.filter((category) => sellerCategoryIds.has(String(category.id))),
    [flatCategories, sellerCategoryIds]
  );
  const onSaleProducts = useMemo(
    () => products.filter((product) => product.isOnSale || product.discountPriceValue || product.discountPercentage),
    [products]
  );

  const loadData = useCallback(async () => {
    try {
      const [discountList, productResult, categoryList] = await Promise.all([
        fetchSellerDiscounts(),
        fetchSellerManagedProducts(),
        fetchSellerProductCategories(),
      ]);
      setDiscounts(discountList);
      setProducts(productResult.products);
      setCategories(categoryList);
      setError('');
    } catch (requestError) {
      setError(formatApiErrorMessage(requestError, 'Failed to fetch discounts'));
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

  const updateForm = <K extends keyof DiscountForm>(key: K, value: DiscountForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingDiscount(null);
  };

  const openCreate = () => {
    if (showForm && !editingDiscount) {
      setShowForm(false);
      resetForm();
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const openEdit = (discount: SellerDiscount) => {
    setEditingDiscount(discount);
    setForm({
      name: discount.name,
      type: discount.type,
      value: discount.value == null ? '' : String(discount.value),
      min_order_amount: discount.minOrderAmount == null ? '' : String(discount.minOrderAmount),
      max_uses: discount.maxUses == null ? '' : String(discount.maxUses),
      max_uses_per_user: discount.maxUsesPerUser == null ? '' : String(discount.maxUsesPerUser),
      starts_at: dateInputValue(discount.startsAt),
      expires_at: dateInputValue(discount.expiresAt),
      applicable_to: discount.applicableTo,
      applicable_product_ids: discount.applicableProductIds,
      applicable_category_ids: discount.applicableCategoryIds,
      is_one_time_use: discount.isOneTimeUse,
      is_active: discount.isActive,
    });
    setShowForm(true);
  };

  const toggleSelection = (field: 'applicable_product_ids' | 'applicable_category_ids', id: string | number) => {
    setForm((current) => {
      const ids = current[field];
      return {
        ...current,
        [field]: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
      };
    });
  };

  const submitDiscount = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('Discount name is required');
      return;
    }
    if (!form.type) {
      setError('Please select a discount type');
      return;
    }
    if (form.type !== 'free_shipping' && !form.value) {
      setError('Discount value is required');
      return;
    }
    if (form.applicable_to === 'specific_products' && !form.applicable_product_ids.length) {
      setError('Please select at least one product');
      return;
    }
    if (form.applicable_to === 'specific_categories' && !form.applicable_category_ids.length) {
      setError('Please select at least one category');
      return;
    }

    const payload: SellerDiscountPayload = {
      name: form.name.trim(),
      type: form.type,
      value: form.type === 'free_shipping' ? null : Number(form.value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      max_uses: form.max_uses ? Number.parseInt(form.max_uses, 10) : null,
      max_uses_per_user: form.max_uses_per_user ? Number.parseInt(form.max_uses_per_user, 10) : null,
      starts_at: form.starts_at ? `${form.starts_at} 00:00:00` : null,
      expires_at: form.expires_at ? `${form.expires_at} 23:59:59` : null,
      applicable_to: form.applicable_to,
      applicable_product_ids: form.applicable_to === 'specific_products' ? form.applicable_product_ids : [],
      applicable_category_ids: form.applicable_to === 'specific_categories' ? form.applicable_category_ids : [],
      is_one_time_use: form.is_one_time_use,
      is_active: form.is_active,
    };

    setSubmitting(true);
    try {
      await saveSellerDiscount(payload, editingDiscount?.id);
      await loadData();
      resetForm();
      setShowForm(false);
      setMessage(editingDiscount ? 'Discount updated.' : 'Discount created.');
    } catch (requestError) {
      setError(formatApiErrorMessage(requestError, 'Failed to save discount'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSellerDiscount(deleteTarget.id);
      await loadData();
      setMessage('Discount deleted.');
    } catch (requestError) {
      setError(formatApiErrorMessage(requestError, 'Failed to delete discount'));
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleStatus = async (discount: SellerDiscount) => {
    setDiscounts((current) => current.map((item) => item.id === discount.id ? { ...item, isActive: !item.isActive } : item));
    try {
      await toggleSellerDiscountStatus(discount.id);
    } catch (requestError) {
      setDiscounts((current) => current.map((item) => item.id === discount.id ? discount : item));
      setError(formatApiErrorMessage(requestError, 'Failed to update discount status'));
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
          <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">Product Discounts</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            Price reductions applied directly to product listings - no code required.
          </Text>
        </View>
        <Pressable onPress={openCreate} className="flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2">
          <Feather name="plus" color="#ffffff" size={18} />
          <Text className="font-sans text-sm font-semibold text-white">{showForm ? 'Cancel' : 'New Discount'}</Text>
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
            <Text className="mb-2 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">Delete Discount</Text>
            <Text className="mb-6 font-sans text-sm text-gray-600 dark:text-slate-400">
              Are you sure you want to delete this discount? This cannot be undone.
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
            {editingDiscount ? 'Edit Discount' : 'New Discount'}
          </Text>
          <View className="gap-6">
            <View className="gap-4 md:flex-row">
              <Field label="Name" required value={form.name} onChangeText={(value) => updateForm('name', value)} placeholder="Summer Sale 20%" />
              <View className="min-w-0 flex-[2]">
                <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Type *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {(['percentage', 'fixed', 'free_shipping'] as Exclude<SellerDiscountType, ''>[]).map((type) => (
                    <DiscountTypeButton key={type} type={type} active={form.type === type} onPress={() => updateForm('type', type)} />
                  ))}
                </View>
              </View>
            </View>

            <View className="gap-4 md:flex-row">
              <Field
                label={form.type === 'percentage' ? 'Percentage (0-100)' : 'Amount (MMK)'}
                keyboardType="numeric"
                value={form.value}
                onChangeText={(value) => updateForm('value', value)}
                disabled={!form.type || form.type === 'free_shipping'}
                placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 5000'}
              />
              <Field label="Starts at" value={form.starts_at} onChangeText={(value) => updateForm('starts_at', value)} placeholder="YYYY-MM-DD" />
              <Field label="Expires at" value={form.expires_at} onChangeText={(value) => updateForm('expires_at', value)} placeholder="YYYY-MM-DD" />
            </View>

            <View className="gap-4 md:flex-row">
              <Field label="Min order amount (MMK)" keyboardType="numeric" value={form.min_order_amount} onChangeText={(value) => updateForm('min_order_amount', value)} placeholder="Leave empty for no minimum" />
              <Field label="Max total uses" keyboardType="numeric" value={form.max_uses} onChangeText={(value) => updateForm('max_uses', value)} placeholder="Leave empty for unlimited" />
              <Field label="Max uses per customer" keyboardType="numeric" value={form.max_uses_per_user} onChangeText={(value) => updateForm('max_uses_per_user', value)} placeholder="Leave empty for unlimited" />
            </View>

            <View>
              <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Applies to *</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  ['specific_products', 'Specific products'],
                  ['specific_categories', 'Specific categories'],
                ].map(([value, label]) => {
                  const active = form.applicable_to === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => updateForm('applicable_to', value as SellerDiscountScope)}
                      className={`rounded-lg border px-4 py-2 ${active ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'}`}
                    >
                      <Text className={`font-sans text-sm font-semibold ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-300'}`}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {form.applicable_to === 'specific_products' ? (
              <View>
                <Text className="mb-2 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                  Select products ({form.applicable_product_ids.length} selected)
                </Text>
                <ScrollView className="max-h-52 rounded-lg border border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700">
                  {products.length === 0 ? (
                    <Text className="p-3 font-sans text-sm text-gray-500 dark:text-slate-400">No products found</Text>
                  ) : (
                    products.map((product) => {
                      const checked = form.applicable_product_ids.includes(product.id);
                      return (
                        <Pressable key={String(product.id)} onPress={() => toggleSelection('applicable_product_ids', product.id)} className="flex-row items-center gap-3 border-b border-gray-200 px-3 py-2 dark:border-slate-700">
                          <View className={`h-5 w-5 items-center justify-center rounded border ${checked ? 'border-green-600 bg-green-600' : 'border-gray-300 dark:border-slate-500'}`}>
                            {checked ? <Feather name="check" color="#ffffff" size={14} /> : null}
                          </View>
                          <Text className="min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100" numberOfLines={1}>{product.nameEn || product.nameMm || product.name}</Text>
                          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{product.price}</Text>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            ) : null}

            {form.applicable_to === 'specific_categories' ? (
              <View>
                <Text className="mb-2 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                  Select categories ({form.applicable_category_ids.length} selected)
                </Text>
                <ScrollView className="max-h-52 rounded-lg border border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700">
                  {relevantCategories.length === 0 ? (
                    <Text className="p-3 font-sans text-sm text-gray-500 dark:text-slate-400">No relevant categories found</Text>
                  ) : (
                    relevantCategories.map((category) => {
                      const checked = form.applicable_category_ids.includes(category.id);
                      return (
                        <Pressable key={String(category.id)} onPress={() => toggleSelection('applicable_category_ids', category.id)} className="flex-row items-center gap-3 border-b border-gray-200 px-3 py-2 dark:border-slate-700">
                          <View className={`h-5 w-5 items-center justify-center rounded border ${checked ? 'border-green-600 bg-green-600' : 'border-gray-300 dark:border-slate-500'}`}>
                            {checked ? <Feather name="check" color="#ffffff" size={14} /> : null}
                          </View>
                          <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{category.nameEn || category.nameMm || category.name}</Text>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            ) : null}

            <View className="flex-row flex-wrap gap-6">
              <CheckRow checked={form.is_one_time_use} onPress={() => updateForm('is_one_time_use', !form.is_one_time_use)} label="One-time use per customer" />
              <CheckRow checked={form.is_active} onPress={() => updateForm('is_active', !form.is_active)} label="Active immediately" />
            </View>

            <View className="flex-row justify-end gap-3">
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submitDiscount()} disabled={submitting} className="rounded-lg bg-green-600 px-4 py-2 disabled:opacity-50">
                <Text className="font-sans text-sm text-white">{submitting ? 'Saving...' : editingDiscount ? 'Update Discount' : 'Create Discount'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View className="overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
        <View className="hidden bg-gray-50 px-6 py-3 dark:bg-slate-900/50 md:grid md:grid-cols-12 md:gap-4">
          {['Name', 'Type / Value', 'Applies to', 'Validity', 'Uses', 'Status', 'Actions'].map((heading, index) => (
            <Text key={heading} className={`${index === 0 ? 'col-span-2' : index === 1 ? 'col-span-2' : index === 2 ? 'col-span-2' : index === 3 ? 'col-span-2' : index === 6 ? 'col-span-2 text-right' : 'col-span-1'} font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400`}>
              {heading}
            </Text>
          ))}
        </View>
        {discounts.length === 0 ? (
          <View className="items-center py-10">
            <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">No discounts yet. Create one to get started.</Text>
          </View>
        ) : (
          discounts.map((discount) => (
            <DiscountRow
              key={String(discount.id)}
              discount={discount}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggle={(item) => void toggleStatus(item)}
            />
          ))
        )}
      </View>

      {onSaleProducts.length > 0 ? (
        <View className="mt-2 gap-3">
          <View>
            <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">Product Price Discounts</Text>
            <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
              Direct price reductions set from Product Management, separate from the discount rules above.
            </Text>
          </View>
          <View className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <Text className="font-sans text-sm text-amber-800 dark:text-amber-300">
              Note: these products have discount price or discount percentage set directly on the product record.
            </Text>
          </View>
          <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <View className="hidden bg-gray-50 px-4 py-3 dark:bg-slate-900/50 md:grid md:grid-cols-6 md:gap-4">
              {['Product', 'Price', 'Discount', 'Sale Price', 'Valid Until', 'Status'].map((heading) => (
                <Text key={heading} className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{heading}</Text>
              ))}
            </View>
            {onSaleProducts.map((product) => (
              <DirectDiscountProductRow key={String(product.id)} product={product} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
