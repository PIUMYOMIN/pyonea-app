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

import { OptimizedImage } from '@/components/ui/optimized-image';
import { DEFAULT_PRODUCT_IMAGE } from '@/config/native';
import { useTheme } from '@/context/theme';
import { pickImagesFromLibrary } from '@/utils/native-image-picker';
import {
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminManagedCategories,
  updateAdminCategory,
  updateAdminCategoryStatus,
  type AdminCategoryFormPayload,
  type AdminManagedCategory,
  type NativeUploadFile,

  formatApiErrorMessage,
} from '@/utils/native-api';

type FlatCategory = AdminManagedCategory & {
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
};

function formatCommissionRate(rate: number) {
  const value = Number(rate);
  if (!Number.isFinite(value)) return '0.00';
  return (value <= 1 ? value * 100 : value).toFixed(2);
}

function updateCategoryRecursively(
  categories: AdminManagedCategory[],
  targetId: string,
  updates: Partial<AdminManagedCategory>
): AdminManagedCategory[] {
  return categories.map((category) => {
    if (category.id === targetId) return { ...category, ...updates };
    if (category.children.length) {
      return { ...category, children: updateCategoryRecursively(category.children, targetId, updates) };
    }
    return category;
  });
}

function filterCategories(categories: AdminManagedCategory[], term: string): AdminManagedCategory[] {
  if (!term) return categories;
  const query = term.toLowerCase();
  return categories.reduce<AdminManagedCategory[]>((acc, category) => {
    const selfMatches =
      category.nameEn.toLowerCase().includes(query) ||
      category.nameMm.toLowerCase().includes(query) ||
      category.descriptionEn.toLowerCase().includes(query);
    const filteredChildren = category.children.length ? filterCategories(category.children, term) : [];
    if (selfMatches) acc.push(category);
    else if (filteredChildren.length) acc.push({ ...category, children: filteredChildren });
    return acc;
  }, []);
}

function countAll(categories: AdminManagedCategory[]): number {
  return categories.reduce((acc, category) => acc + 1 + countAll(category.children), 0);
}

function collectParentIds(categories: AdminManagedCategory[]): Record<string, boolean> {
  const ids: Record<string, boolean> = {};
  categories.forEach((category) => {
    if (category.children.length) {
      ids[category.id] = true;
      Object.assign(ids, collectParentIds(category.children));
    }
  });
  return ids;
}

function flattenForSelect(
  categories: AdminManagedCategory[],
  excludeId?: string,
  depth = 0
): { id: string; label: string }[] {
  return categories.reduce<{ id: string; label: string }[]>((acc, category) => {
    if (category.id !== excludeId) {
      acc.push({ id: category.id, label: `${'  '.repeat(depth)}${category.nameEn}` });
      if (category.children.length) {
        acc.push(...flattenForSelect(category.children, excludeId, depth + 1));
      }
    }
    return acc;
  }, []);
}

function CategoryFormModal({
  visible,
  mode,
  category,
  parentId,
  categories,
  onClose,
  onSaved,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  category: AdminManagedCategory | null;
  parentId?: string;
  categories: AdminManagedCategory[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { isDark } = useTheme();
  const [saving, setSaving] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameMm, setNameMm] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionMm, setDescriptionMm] = useState('');
  const [commissionRate, setCommissionRate] = useState('0');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<NativeUploadFile | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [parentPickerOpen, setParentPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && category) {
      setNameEn(category.nameEn);
      setNameMm(category.nameMm);
      setDescriptionEn(category.descriptionEn);
      setDescriptionMm(category.descriptionMm);
      setCommissionRate(formatCommissionRate(category.commissionRate));
      setSelectedParentId(category.parentId || '');
      setIsActive(category.isActive);
      setImagePreview(category.imageUrl);
      setImageFile(null);
      setRemoveImage(false);
    } else {
      setNameEn('');
      setNameMm('');
      setDescriptionEn('');
      setDescriptionMm('');
      setCommissionRate('0');
      setSelectedParentId(parentId || '');
      setIsActive(true);
      setImagePreview('');
      setImageFile(null);
      setRemoveImage(false);
    }
    setErrors({});
  }, [visible, mode, category, parentId]);

  const parentOptions = useMemo(
    () => [{ id: '', label: 'None (Top Level)' }, ...flattenForSelect(categories, category?.id)],
    [categories, category?.id]
  );
  const selectedParent = parentOptions.find((option) => option.id === selectedParentId);

  const pickImage = async () => {
    const result = await pickImagesFromLibrary({ allowsMultipleSelection: false });
    const file = result.accepted[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(file.uri);
    setRemoveImage(false);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!nameEn.trim()) nextErrors.name_en = 'English name is required';
    const rate = parseFloat(commissionRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      nextErrors.commission_rate = 'Commission rate must be between 0 and 100';
    }
    return nextErrors;
  };

  const submit = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    const payload: AdminCategoryFormPayload = {
      name_en: nameEn.trim(),
      name_mm: nameMm.trim(),
      description_en: descriptionEn.trim(),
      description_mm: descriptionMm.trim(),
      commission_rate: parseFloat(commissionRate),
      parent_id: selectedParentId || undefined,
      is_active: isActive,
      image: imageFile,
      removeImage,
    };

    try {
      if (mode === 'edit' && category) await updateAdminCategory(category.id, payload);
      else await createAdminCategory(payload);
      await onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: formatApiErrorMessage(err, 'Failed to save category.') });
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="max-h-[90%] w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-700">
            <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {mode === 'edit' ? 'Edit Category' : 'Create New Category'}
            </Text>
            <Pressable onPress={onClose} className="rounded-lg p-1.5">
              <Feather name="x" size={20} color={isDark ? '#94a3b8' : '#6b7280'} />
            </Pressable>
          </View>

          <ScrollView className="px-6 py-5" contentContainerClassName="gap-4">
            {errors.submit ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <Text className="font-sans text-sm text-red-700 dark:text-red-300">{errors.submit}</Text>
              </View>
            ) : null}

            <View className="gap-4 md:flex-row">
              <View className="flex-1 gap-3">
                <FormField label="Category Name (English) *" value={nameEn} error={errors.name_en} onChangeText={setNameEn} />
                <FormField label="Category Name (Myanmar)" value={nameMm} onChangeText={setNameMm} />
              </View>
              <View className="flex-1 gap-3">
                <FormField label="Description (English)" value={descriptionEn} multiline onChangeText={setDescriptionEn} />
                <FormField label="Description (Myanmar)" value={descriptionMm} multiline onChangeText={setDescriptionMm} />
              </View>
            </View>

            <View className="gap-4 md:flex-row">
              <View className="flex-1">
                <FormField
                  label="Commission Rate (%)"
                  value={commissionRate}
                  error={errors.commission_rate}
                  keyboardType="numeric"
                  onChangeText={setCommissionRate}
                />
              </View>
              <View className="flex-1 gap-1">
                <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">Parent Category</Text>
                <Pressable
                  onPress={() => setParentPickerOpen(true)}
                  className="flex-row items-center justify-between rounded-xl border border-gray-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700">
                  <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{selectedParent?.label || 'None (Top Level)'}</Text>
                  <Feather name="chevron-down" size={16} color="#94a3b8" />
                </Pressable>
              </View>
            </View>

            <Pressable onPress={() => setIsActive(!isActive)} className="flex-row items-center gap-2">
              <View className={`h-4 w-4 items-center justify-center rounded border ${isActive ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700'}`}>
                {isActive ? <Feather name="check" size={10} color="#fff" /> : null}
              </View>
              <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Active category</Text>
            </Pressable>

            <View className="gap-2">
              <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">Category Image</Text>
              <View className="flex-row items-center gap-3">
                <OptimizedImage
                  source={{ uri: imagePreview || DEFAULT_PRODUCT_IMAGE }}
                  className="h-16 w-16 rounded-full"
                  contentFit="cover"
                />
                <View className="gap-2">
                  <Pressable onPress={() => void pickImage()} className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-slate-700">
                    <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-200">Upload Image</Text>
                  </Pressable>
                  {imagePreview ? (
                    <Pressable
                      onPress={() => {
                        setImagePreview('');
                        setImageFile(null);
                        setRemoveImage(true);
                      }}
                      className="rounded-lg px-3 py-2">
                      <Text className="font-sans text-xs font-semibold text-red-600 dark:text-red-400">Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          </ScrollView>

          <View className="flex-row justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-700">
            <Pressable disabled={saving} onPress={onClose} className="rounded-xl border border-gray-300 px-4 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Cancel</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={() => void submit()} className={`rounded-xl px-5 py-2 ${saving ? 'bg-green-600/50' : 'bg-green-600'}`}>
              <Text className="font-sans text-sm font-semibold text-white">{saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Category'}</Text>
            </Pressable>
          </View>

          <Modal visible={parentPickerOpen} transparent animationType="fade" onRequestClose={() => setParentPickerOpen(false)}>
            <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
              <View className="max-h-[60%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[420px] md:rounded-2xl">
                <Text className="mb-4 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">Parent Category</Text>
                <ScrollView>
                  {parentOptions.map((option) => (
                    <Pressable
                      key={option.id || 'root'}
                      onPress={() => {
                        setSelectedParentId(option.id);
                        setParentPickerOpen(false);
                      }}
                      className={`mb-2 rounded-xl border px-4 py-3 ${
                        selectedParentId === option.id
                          ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-slate-700'
                      }`}>
                      <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{option.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

function FormField({
  label,
  value,
  error,
  multiline,
  keyboardType = 'default',
  onChangeText,
}: {
  label: string;
  value: string;
  error?: string;
  multiline?: boolean;
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
        className={`rounded-xl border px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${multiline ? 'min-h-[72px]' : ''}`}
      />
      {error ? <Text className="font-sans text-xs text-red-600 dark:text-red-400">{error}</Text> : null}
    </View>
  );
}

export function CategoryManagementNative() {
  const [categories, setCategories] = useState<AdminManagedCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    visible: boolean;
    mode: 'create' | 'edit';
    category: AdminManagedCategory | null;
    parentId?: string;
  }>({ visible: false, mode: 'create', category: null });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await fetchAdminManagedCategories());
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to load categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCategories = useMemo(() => filterCategories(categories, searchTerm.trim()), [categories, searchTerm]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setExpandedCategories(collectParentIds(filteredCategories));
    }
  }, [searchTerm, filteredCategories]);

  const flattenedCategories = useMemo(() => {
    const flatten = (items: AdminManagedCategory[], level = 0): FlatCategory[] =>
      items.flatMap((category) => {
        const hasChildren = category.children.length > 0;
        const isExpanded = expandedCategories[category.id] || false;
        const row: FlatCategory = { ...category, level, hasChildren, isExpanded };
        if (hasChildren && isExpanded) {
          return [row, ...flatten(category.children, level + 1)];
        }
        return [row];
      });
    return flatten(filteredCategories);
  }, [filteredCategories, expandedCategories]);

  const totalCount = countAll(categories);
  const filteredCount = countAll(filteredCategories);
  const anyExpanded = Object.values(expandedCategories).some(Boolean);
  const anyExpandable = categories.some((category) => category.children.length > 0);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const expandAll = () => {
    setExpandedCategories(collectParentIds(categories));
  };

  const handleStatusToggle = async (categoryId: string, currentStatus: boolean) => {
    setCategories((prev) => updateCategoryRecursively(prev, categoryId, { isActive: !currentStatus }));
    try {
      await updateAdminCategoryStatus(categoryId, !currentStatus);
      setMessage(`Category ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
    } catch (err) {
      setCategories((prev) => updateCategoryRecursively(prev, categoryId, { isActive: currentStatus }));
      setError(formatApiErrorMessage(err, 'Failed to update status.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAdminCategory(deleteTarget);
      setMessage('Category deleted successfully.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to delete category.'));
      setDeleteTarget(null);
    }
  };

  return (
    <View className="gap-6">
      <CategoryFormModal
        visible={formState.visible}
        mode={formState.mode}
        category={formState.category}
        parentId={formState.parentId}
        categories={categories}
        onClose={() => setFormState({ visible: false, mode: 'create', category: null })}
        onSaved={async () => {
          setMessage(formState.mode === 'edit' ? 'Category updated successfully.' : 'Category created successfully.');
          await load();
        }}
      />

      {deleteTarget ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
          <View className="flex-1 items-center justify-center bg-black/40 p-4">
            <View className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-800">
              <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">Delete Category</Text>
              <Text className="mt-2 font-sans text-sm text-gray-600 dark:text-slate-400">
                This action cannot be undone. Any subcategories and associated products may be affected.
              </Text>
              <View className="mt-5 flex-row justify-end gap-3">
                <Pressable onPress={() => setDeleteTarget(null)} className="rounded-xl border border-gray-300 px-4 py-2 dark:border-slate-600">
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Cancel</Text>
                </Pressable>
                <Pressable onPress={() => void confirmDelete()} className="rounded-xl bg-red-600 px-4 py-2">
                  <Text className="font-sans text-sm font-semibold text-white">Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">Category Management</Text>
          <Text className="mt-1 font-sans text-sm text-gray-600 dark:text-slate-400">
            Manage product categories and their hierarchy
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => void load()} className="h-10 w-10 items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600">
            <Feather name="refresh-cw" size={16} color="#64748b" />
          </Pressable>
          <Pressable
            onPress={() => setFormState({ visible: true, mode: 'create', category: null })}
            className="flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2">
            <Feather name="plus" size={16} color="#fff" />
            <Text className="font-sans text-sm font-medium text-white">Add Category</Text>
          </Pressable>
        </View>
      </View>

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

      <View className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
        <View className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <View className="relative min-w-0 flex-1">
            <View className="absolute left-3 top-0 z-10 h-10 justify-center">
              <Feather name="search" size={16} color="#94a3b8" />
            </View>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search categories by name or description..."
              placeholderTextColor="#94a3b8"
              className="h-10 rounded-md border border-gray-300 bg-white pl-10 pr-10 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
            {searchTerm ? (
              <Pressable onPress={() => setSearchTerm('')} className="absolute right-2 top-2 rounded-md p-1">
                <Feather name="x" size={16} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">Total: {totalCount}</Text>
            {searchTerm ? (
              <>
                <Text className="font-sans text-sm text-gray-400">•</Text>
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">Matches: {filteredCount}</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {loading ? (
        <View className="items-center rounded-lg bg-white p-8 dark:bg-slate-800">
          <ActivityIndicator color="#16a34a" size="large" />
          <Text className="mt-3 font-sans text-sm text-gray-600 dark:text-slate-400">Loading categories...</Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
          {flattenedCategories.length === 0 ? (
            <View className="items-center px-6 py-12">
              <Feather name="folder" color="#94a3b8" size={40} />
              <Text className="mt-3 font-sans text-lg font-medium text-gray-900 dark:text-slate-100">
                {searchTerm ? 'No categories found' : 'No categories yet'}
              </Text>
              <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
                {searchTerm ? 'Try adjusting your search term' : 'Get started by creating your first category'}
              </Text>
              {!searchTerm ? (
                <Pressable
                  onPress={() => setFormState({ visible: true, mode: 'create', category: null })}
                  className="mt-4 flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2">
                  <Feather name="plus" size={16} color="#fff" />
                  <Text className="font-sans text-sm font-medium text-white">Create Category</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
              <View className="w-full min-w-[980px]">
                <View className="flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900/50">
                  {[
                    { key: 'name', label: 'Category Name', width: 'w-[280px]' },
                    { key: 'name_mm', label: 'Myanmar Name', width: 'w-[140px]' },
                    { key: 'slug', label: 'Slug', width: 'w-[140px]' },
                    { key: 'commission', label: 'Commission Rate', width: 'w-[130px]' },
                    { key: 'status', label: 'Status', width: 'w-[100px]' },
                    { key: 'actions', label: 'Actions', width: 'w-[120px]' },
                  ].map((column) => (
                    <View key={column.key} className={`${column.width} px-2`}>
                      <Text className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        {column.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {flattenedCategories.map((category) => (
                  <View
                    key={category.id}
                    className={`flex-row border-t border-gray-200 px-4 py-3 dark:border-slate-700 ${
                      category.level > 0 ? 'bg-gray-50/50 dark:bg-slate-700/20' : ''
                    }`}>
                    <View className="w-[280px] flex-row items-center px-2" style={{ paddingLeft: category.level * 24 }}>
                      {category.hasChildren ? (
                        <Pressable onPress={() => toggleCategory(category.id)} className="mr-2 rounded p-1">
                          <Feather name={category.isExpanded ? 'chevron-down' : 'chevron-right'} size={16} color="#64748b" />
                        </Pressable>
                      ) : (
                        <View className="ml-6" />
                      )}
                      {category.imageUrl ? (
                        <OptimizedImage source={{ uri: category.imageUrl }} className="mr-3 h-8 w-8 rounded-full" contentFit="cover" />
                      ) : null}
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">{category.nameEn}</Text>
                        {category.descriptionEn ? (
                          <Text className="font-sans text-[10px] text-gray-500 dark:text-slate-400" numberOfLines={1}>
                            {category.descriptionEn}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View className="w-[140px] justify-center px-2">
                      <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">{category.nameMm || '—'}</Text>
                    </View>
                    <View className="w-[140px] justify-center px-2">
                      <Text className="font-mono text-xs text-gray-500 dark:text-slate-400">/{category.slugEn}</Text>
                    </View>
                    <View className="w-[130px] justify-center px-2">
                      <View className="self-start rounded-full bg-green-100 px-2.5 py-0.5 dark:bg-green-900/30">
                        <Text className="font-sans text-xs font-medium text-green-800 dark:text-green-300">
                          {formatCommissionRate(category.commissionRate)}%
                        </Text>
                      </View>
                    </View>
                    <View className="w-[100px] justify-center px-2">
                      <Pressable
                        onPress={() => void handleStatusToggle(category.id, category.isActive)}
                        className={`self-start rounded-full px-2.5 py-0.5 ${
                          category.isActive
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                        <Text
                          className={`font-sans text-xs font-medium ${
                            category.isActive ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                          }`}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="w-[120px] flex-row items-center gap-1 px-2">
                      <Pressable
                        onPress={() => setFormState({ visible: true, mode: 'edit', category })}
                        className="rounded p-1.5">
                        <Feather name="edit-2" size={16} color="#4f46e5" />
                      </Pressable>
                      <Pressable onPress={() => setDeleteTarget(category.id)} className="rounded p-1.5">
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </Pressable>
                      <Pressable
                        onPress={() => setFormState({ visible: true, mode: 'create', category: null, parentId: category.id })}
                        className="rounded p-1.5">
                        <Feather name="plus" size={16} color="#64748b" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <View className="flex-row items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
              Showing <Text className="font-medium text-gray-700 dark:text-slate-300">{flattenedCategories.length}</Text> of{' '}
              <Text className="font-medium text-gray-700 dark:text-slate-300">{totalCount}</Text> categories
            </Text>
            {anyExpandable ? (
              <Pressable onPress={anyExpanded ? () => setExpandedCategories({}) : expandAll}>
                <Text className="font-sans text-sm font-medium text-green-600 dark:text-green-400">
                  {anyExpanded ? 'Collapse All' : 'Expand All'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}
