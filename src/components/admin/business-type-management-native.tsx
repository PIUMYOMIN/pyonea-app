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

import { useTheme } from '@/context/theme';
import {
  createAdminBusinessType,
  deleteAdminBusinessType,
  fetchAdminManagedBusinessTypes,
  toggleAdminBusinessType,
  updateAdminBusinessType,
  type AdminBusinessTypeFormPayload,
  type AdminManagedBusinessType,

  formatApiErrorMessage,
} from '@/utils/native-api';

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ICON_OPTIONS: { value: string; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: 'UsersIcon', label: 'Individual', icon: 'users' },
  { value: 'BuildingStorefrontIcon', label: 'Store', icon: 'home' },
  { value: 'BriefcaseIcon', label: 'Business', icon: 'briefcase' },
  { value: 'TruckIcon', label: 'Logistics', icon: 'truck' },
  { value: 'CurrencyDollarIcon', label: 'Finance', icon: 'dollar-sign' },
  { value: 'CubeIcon', label: 'Products', icon: 'box' },
  { value: 'ShieldCheckIcon', label: 'Verified', icon: 'shield' },
  { value: 'ChartBarIcon', label: 'Analytics', icon: 'bar-chart-2' },
];

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#06b6d4', label: 'Cyan' },
];

const EMPTY_FORM: AdminBusinessTypeFormPayload = {
  name_en: '',
  name_mm: '',
  slug_en: '',
  slug_mm: '',
  description_en: '',
  description_mm: '',
  requires_registration: false,
  requires_tax_document: false,
  requires_identity_document: false,
  requires_business_certificate: false,
  additional_requirements: [],
  is_active: true,
  sort_order: 0,
  icon: 'BuildingStorefrontIcon',
  color: '#3b82f6',
};

function getIconName(value: string): keyof typeof Feather.glyphMap {
  return ICON_OPTIONS.find((option) => option.value === value)?.icon || 'home';
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'blue' | 'green' | 'red' | 'purple';
}) {
  const tones = {
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    green: 'bg-green-50 dark:bg-green-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
  };
  const textTones = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    red: 'text-red-500 dark:text-red-400',
    purple: 'text-purple-700 dark:text-purple-300',
  };

  return (
    <View className={`w-[47%] rounded-xl p-4 lg:w-[23%] ${tones[tone]}`}>
      <Text className={`font-sans text-2xl font-bold ${textTones[tone]}`}>{value}</Text>
      <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}

function BusinessTypeFormModal({
  visible,
  editing,
  form,
  additionalRequirementsText,
  fieldErrors,
  saving,
  onClose,
  onChange,
  onAdditionalRequirementsChange,
  onSubmit,
}: {
  visible: boolean;
  editing: AdminManagedBusinessType | null;
  form: AdminBusinessTypeFormPayload;
  additionalRequirementsText: string;
  fieldErrors: Record<string, string>;
  saving: boolean;
  onClose: () => void;
  onChange: (updates: Partial<AdminBusinessTypeFormPayload>) => void;
  onAdditionalRequirementsChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const { isDark } = useTheme();
  if (!visible) return null;

  const docRequirements: { key: keyof AdminBusinessTypeFormPayload; label: string }[] = [
    { key: 'requires_registration', label: 'Business Registration' },
    { key: 'requires_tax_document', label: 'Tax Document' },
    { key: 'requires_identity_document', label: 'Identity Document' },
    { key: 'requires_business_certificate', label: 'Business Certificate' },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="max-h-[90%] w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-700">
            <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">
              {editing ? `Edit — ${editing.nameEn}` : 'New Business Type'}
            </Text>
            <Pressable onPress={onClose} className="rounded-lg p-1.5">
              <Feather name="x" size={20} color={isDark ? '#94a3b8' : '#6b7280'} />
            </Pressable>
          </View>

          <ScrollView className="px-6 py-5" contentContainerClassName="gap-5">
            {fieldErrors.submit ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <Text className="font-sans text-sm text-red-700 dark:text-red-300">{fieldErrors.submit}</Text>
              </View>
            ) : null}

            <View className="gap-4 md:flex-row">
              <View className="flex-1 gap-4">
                <Text className="font-sans text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  English
                </Text>
                <Field label="Name (EN) *" value={form.name_en} error={fieldErrors.name_en} onChangeText={(value) => onChange({ name_en: value, slug_en: editing ? form.slug_en : slugify(value) })} />
                <Field label="Slug (EN) *" value={form.slug_en} error={fieldErrors.slug_en} mono onChangeText={(value) => onChange({ slug_en: value })} />
                <Field label="Description (EN)" value={form.description_en || ''} multiline onChangeText={(value) => onChange({ description_en: value })} />
              </View>
              <View className="flex-1 gap-4">
                <Text className="font-sans text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Myanmar (မြန်မာ)
                </Text>
                <Field label="Name (MM)" value={form.name_mm || ''} onChangeText={(value) => onChange({ name_mm: value })} />
                <Field label="Slug (MM)" value={form.slug_mm || ''} mono onChangeText={(value) => onChange({ slug_mm: value })} />
                <Field label="Description (MM)" value={form.description_mm || ''} multiline onChangeText={(value) => onChange({ description_mm: value })} />
              </View>
            </View>

            <View className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
              <Text className="mb-3 font-sans text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Document Requirements
              </Text>
              <View className="gap-2">
                {docRequirements.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => onChange({ [item.key]: !form[item.key] } as Partial<AdminBusinessTypeFormPayload>)}
                    className="flex-row items-center gap-2">
                    <View className={`h-4 w-4 items-center justify-center rounded border ${form[item.key] ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700'}`}>
                      {form[item.key] ? <Feather name="check" size={10} color="#fff" /> : null}
                    </View>
                    <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="gap-4 md:flex-row">
              <View className="flex-1">
                <Text className="mb-2 font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">Icon</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ICON_OPTIONS.map((option) => {
                    const active = form.icon === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => onChange({ icon: option.value })}
                        className={`w-[22%] items-center rounded-xl border-2 p-2 ${
                          active
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-600'
                        }`}>
                        <Feather name={option.icon} size={18} color={active ? '#2563eb' : '#94a3b8'} />
                        <Text className="mt-1 text-center font-sans text-[10px] text-gray-500 dark:text-slate-400" numberOfLines={1}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View className="flex-1 gap-4">
                <View>
                  <Text className="mb-2 font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">Color</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {COLOR_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => onChange({ color: option.value })}
                        className={`h-8 w-8 rounded-full border-2 ${form.color === option.value ? 'border-gray-900 dark:border-slate-200' : 'border-gray-300 dark:border-slate-600'}`}
                        style={{ backgroundColor: option.value }}
                      />
                    ))}
                  </View>
                </View>
                <Field label="Sort Order" value={String(form.sort_order)} keyboardType="numeric" onChangeText={(value) => onChange({ sort_order: Number(value || 0) })} />
                <Pressable onPress={() => onChange({ is_active: !form.is_active })} className="flex-row items-center gap-2">
                  <View className={`h-4 w-4 items-center justify-center rounded border ${form.is_active ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700'}`}>
                    {form.is_active ? <Feather name="check" size={10} color="#fff" /> : null}
                  </View>
                  <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Active (visible to sellers)</Text>
                </Pressable>
              </View>
            </View>

            <Field
              label="Additional Requirements (JSON array, optional)"
              value={additionalRequirementsText}
              error={fieldErrors.additional_requirements}
              multiline
              mono
              onChangeText={onAdditionalRequirementsChange}
            />
          </ScrollView>

          <View className="flex-row justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-700">
            <Pressable disabled={saving} onPress={onClose} className="rounded-xl border border-gray-300 px-4 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Cancel</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={onSubmit} className={`rounded-xl px-5 py-2 ${saving ? 'bg-blue-600/50' : 'bg-blue-600'}`}>
              <Text className="font-sans text-sm font-semibold text-white">{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  error,
  multiline,
  mono,
  keyboardType = 'default',
  onChangeText,
}: {
  label: string;
  value: string;
  error?: string;
  multiline?: boolean;
  mono?: boolean;
  keyboardType?: 'default' | 'numeric';
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor="#94a3b8"
        className={`rounded-xl border px-3 py-2 font-sans text-sm text-gray-900 dark:bg-slate-700 dark:text-slate-100 ${
          error ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
        } ${mono ? 'font-mono' : ''} ${multiline ? 'min-h-[72px]' : ''}`}
      />
      {error ? <Text className="font-sans text-xs text-red-600 dark:text-red-400">{error}</Text> : null}
    </View>
  );
}

export function BusinessTypeManagementNative() {
  const [types, setTypes] = useState<AdminManagedBusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminManagedBusinessType | null>(null);
  const [form, setForm] = useState<AdminBusinessTypeFormPayload>({ ...EMPTY_FORM });
  const [additionalRequirementsText, setAdditionalRequirementsText] = useState('[]');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminManagedBusinessType | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTypes(await fetchAdminManagedBusinessTypes());
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to load business types.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return types.filter((item) => {
      const matchesSearch =
        !query ||
        item.nameEn.toLowerCase().includes(query) ||
        item.nameMm.toLowerCase().includes(query) ||
        item.slugEn.toLowerCase().includes(query);
      const matchesFilter =
        filterStatus === 'all' ? true : filterStatus === 'active' ? item.isActive : !item.isActive;
      return matchesSearch && matchesFilter;
    });
  }, [types, search, filterStatus]);

  const activeCount = types.filter((item) => item.isActive).length;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setAdditionalRequirementsText('[]');
    setFieldErrors({});
    setShowModal(true);
  };

  const openEdit = (item: AdminManagedBusinessType) => {
    setEditing(item);
    setForm({
      name_en: item.nameEn,
      name_mm: item.nameMm,
      slug_en: item.slugEn,
      slug_mm: item.slugMm,
      description_en: item.descriptionEn,
      description_mm: item.descriptionMm,
      requires_registration: item.requiresRegistration,
      requires_tax_document: item.requiresTaxDocument,
      requires_identity_document: item.requiresIdentityDocument,
      requires_business_certificate: item.requiresBusinessCertificate,
      additional_requirements: item.additionalRequirements,
      is_active: item.isActive,
      sort_order: item.sortOrder,
      icon: item.icon,
      color: item.color,
    });
    setAdditionalRequirementsText(JSON.stringify(item.additionalRequirements ?? [], null, 2));
    setFieldErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name_en.trim()) errors.name_en = 'English name is required.';
    if (!form.slug_en.trim()) errors.slug_en = 'Slug is required.';
    else if (!/^[a-z0-9-]+$/.test(form.slug_en)) errors.slug_en = 'Only lowercase letters, numbers, hyphens.';
    if (additionalRequirementsText.trim()) {
      try {
        JSON.parse(additionalRequirementsText);
      } catch {
        errors.additional_requirements = 'Must be valid JSON.';
      }
    }
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const payload: AdminBusinessTypeFormPayload = {
        ...form,
        additional_requirements: additionalRequirementsText.trim()
          ? JSON.parse(additionalRequirementsText)
          : [],
      };
      if (editing) await updateAdminBusinessType(editing.id, payload);
      else await createAdminBusinessType(payload);
      setShowModal(false);
      setMessage(editing ? 'Business type updated.' : 'Business type created.');
      await load();
    } catch (err) {
      setFieldErrors({ submit: formatApiErrorMessage(err, 'Failed to save.') });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: AdminManagedBusinessType) => {
    setTogglingId(item.id);
    try {
      await toggleAdminBusinessType(item.id);
      setTypes((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: !row.isActive } : row)));
      setMessage(`"${item.nameEn}" ${item.isActive ? 'deactivated' : 'activated'}.`);
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to update status.'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAdminBusinessType(deleteTarget.id);
      setMessage(`"${deleteTarget.nameEn}" deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to delete.'));
      setDeleteTarget(null);
    }
  };

  return (
    <View className="gap-5">
      <BusinessTypeFormModal
        visible={showModal}
        editing={editing}
        form={form}
        additionalRequirementsText={additionalRequirementsText}
        fieldErrors={fieldErrors}
        saving={saving}
        onClose={() => setShowModal(false)}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
        onAdditionalRequirementsChange={setAdditionalRequirementsText}
        onSubmit={() => void handleSubmit()}
      />

      {deleteTarget ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
          <View className="flex-1 items-center justify-center bg-black/40 p-4">
            <View className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-800">
              <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">Delete Business Type</Text>
              <Text className="mt-2 font-sans text-sm text-gray-600 dark:text-slate-400">
                Delete <Text className="font-semibold dark:text-slate-200">{deleteTarget.nameEn}</Text>?
              </Text>
              {deleteTarget.sellersCount > 0 ? (
                <View className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                  <Text className="font-sans text-xs text-amber-700 dark:text-amber-300">
                    {deleteTarget.sellersCount} seller(s) use this type.
                  </Text>
                </View>
              ) : null}
              <View className="mt-5 flex-row justify-end gap-3">
                <Pressable onPress={() => setDeleteTarget(null)} className="rounded-xl border border-gray-300 px-4 py-2 dark:border-slate-600">
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Cancel</Text>
                </Pressable>
                <Pressable onPress={() => void handleDelete()} className="rounded-xl bg-red-600 px-4 py-2">
                  <Text className="font-sans text-sm font-semibold text-white">Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {error ? (
        <Pressable onPress={() => setError('')} className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
        </Pressable>
      ) : null}
      {message ? (
        <Pressable onPress={() => setMessage('')} className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-sm text-green-800 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        <StatCard label="Total" value={types.length} tone="blue" />
        <StatCard label="Active" value={activeCount} tone="green" />
        <StatCard label="Inactive" value={types.length - activeCount} tone="red" />
        <StatCard
          label="Require Docs"
          value={types.filter((item) => item.requiresRegistration || item.requiresBusinessCertificate).length}
          tone="purple"
        />
      </View>

      <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <View className="gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
          <View>
            <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">Business Type Management</Text>
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Manage seller onboarding business types</Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="min-w-[140px] flex-1 flex-row items-center rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
              <Feather name="search" size={16} color="#94a3b8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search…"
                placeholderTextColor="#94a3b8"
                className="ml-2 min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
              />
            </View>
            {(['all', 'active', 'inactive'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setFilterStatus(value)}
                className={`rounded-xl border px-3 py-2 ${filterStatus === value ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-slate-600'}`}>
                <Text className={`font-sans text-xs font-semibold ${filterStatus === value ? 'text-white' : 'text-gray-600 dark:text-slate-300'}`}>
                  {value === 'all' ? 'All Status' : value === 'active' ? 'Active' : 'Inactive'}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => void load()} className="h-10 w-10 items-center justify-center rounded-xl border border-gray-300 dark:border-slate-600">
              <Feather name="refresh-cw" size={16} color="#64748b" />
            </Pressable>
            <Pressable onPress={openCreate} className="flex-row items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2">
              <Feather name="plus" size={16} color="#fff" />
              <Text className="font-sans text-sm font-semibold text-white">Add Type</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View className="items-center py-14">
            <ActivityIndicator color="#2563eb" />
          </View>
        ) : filtered.length === 0 ? (
          <Text className="py-14 text-center font-sans text-sm text-gray-400 dark:text-slate-500">
            {types.length === 0 ? 'No business types yet.' : 'No types match your filter.'}
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[980px]">
              <View className="flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900/50">
                {[
                  { key: 'icon', label: 'Icon', width: 'w-[70px]' },
                  { key: 'name', label: 'Name', width: 'w-[150px]' },
                  { key: 'slug', label: 'Slug', width: 'w-[130px]' },
                  { key: 'requirements', label: 'Requirements', width: 'w-[180px]' },
                  { key: 'sellers', label: 'Sellers', width: 'w-[70px]' },
                  { key: 'status', label: 'Status', width: 'w-[110px]' },
                  { key: 'order', label: 'Order', width: 'w-[70px]' },
                  { key: 'actions', label: 'Actions', width: 'w-[90px]' },
                ].map((column) => (
                  <View key={column.key} className={`${column.width} px-2`}>
                    <Text className="font-sans text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      {column.label}
                    </Text>
                  </View>
                ))}
              </View>

              {filtered.map((item) => (
                <View
                  key={item.id}
                  className={`flex-row border-t border-gray-50 px-4 py-3 dark:border-slate-700/50 ${!item.isActive ? 'opacity-70' : ''}`}>
                  <View className="w-[70px] justify-center px-2">
                    <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${item.color}22` }}>
                      <Feather name={getIconName(item.icon)} size={18} color={item.color} />
                    </View>
                  </View>
                  <View className="w-[150px] justify-center px-2">
                    <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">{item.nameEn}</Text>
                    {item.nameMm ? (
                      <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500">{item.nameMm}</Text>
                    ) : null}
                  </View>
                  <View className="w-[130px] justify-center px-2">
                    <Text className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                      {item.slugEn}
                    </Text>
                  </View>
                  <View className="w-[180px] flex-row flex-wrap gap-1 px-2">
                    {item.requiresRegistration ? <Badge label="Registration" tone="blue" /> : null}
                    {item.requiresTaxDocument ? <Badge label="Tax Doc" tone="green" /> : null}
                    {item.requiresIdentityDocument ? <Badge label="ID Doc" tone="yellow" /> : null}
                    {item.requiresBusinessCertificate ? <Badge label="Biz Cert" tone="purple" /> : null}
                    {!item.requiresRegistration &&
                    !item.requiresTaxDocument &&
                    !item.requiresIdentityDocument &&
                    !item.requiresBusinessCertificate ? (
                      <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500">None</Text>
                    ) : null}
                  </View>
                  <View className="w-[70px] items-center justify-center px-2">
                    <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">{item.sellersCount || '—'}</Text>
                  </View>
                  <View className="w-[110px] justify-center px-2">
                    <Pressable
                      disabled={togglingId === item.id}
                      onPress={() => void handleToggle(item)}
                      className={`self-start rounded-full px-3 py-1 ${item.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {togglingId === item.id ? (
                        <ActivityIndicator size="small" color="#16a34a" />
                      ) : (
                        <Text className={`font-sans text-[11px] font-semibold ${item.isActive ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                  <View className="w-[70px] items-center justify-center px-2">
                    <Text className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                      {item.sortOrder}
                    </Text>
                  </View>
                  <View className="w-[90px] flex-row items-center gap-1 px-2">
                    <Pressable onPress={() => openEdit(item)} className="rounded-lg p-1.5">
                      <Feather name="edit-2" size={16} color="#4f46e5" />
                    </Pressable>
                    <Pressable onPress={() => setDeleteTarget(item)} className="rounded-lg p-1.5">
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'blue' | 'green' | 'yellow' | 'purple' }) {
  const tones = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return (
    <View className={`rounded-full px-2 py-0.5 ${tones[tone]}`}>
      <Text className="font-sans text-[10px] font-medium">{label}</Text>
    </View>
  );
}
