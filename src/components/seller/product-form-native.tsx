import { Feather } from '@expo/vector-icons';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/theme';
import { useAppTranslation } from '@/i18n';
import { ProductOptionsEditorNative } from '@/components/seller/product-options-editor-native';
import {
  appendUploadFile,
  pickImageFromCamera,
  pickImagesFromLibrary,
} from '@/utils/native-image-picker';
import {
  createSellerProduct,
  fetchSellerProductCategories,
  fetchSellerProductForEdit,
  fetchSellerWholesaleTiers,
  formatMMK,
  getNativeImageUrl,
  syncSellerWholesaleTiers,
  updateSellerProduct,
  uploadSellerProductImage,
  type SellerProductCategory,
  type SellerProductFormData,
  type SellerProductImage,
  type SellerWholesaleTier,
} from '@/utils/native-api';

const productTypes = [
  { value: 'physical', label: 'Physical', hint: 'Has stock, requires shipping.' },
  { value: 'digital', label: 'Digital', hint: 'Download/link delivered. No shipping.' },
  { value: 'service', label: 'Service', hint: 'No stock, no shipping.' },
];

const quantityUnits = ['piece', 'kg', 'gram', 'meter', 'liter', 'set', 'pack', 'box', 'pallet', 'roll'];
const warrantyTypes = ['manufacturer', 'seller', 'international', 'no_warranty'];
const imageAngles = ['front', 'back', 'side', 'top', 'default'];
const conditions = [
  { value: 'new', label: 'New', description: 'Brand new, never used' },
  { value: 'used_like_new', label: 'Used - Like New', description: 'Used but looks and functions like new' },
  { value: 'used_good', label: 'Used - Good', description: 'Used with minor signs of wear' },
  { value: 'used_fair', label: 'Used - Fair', description: 'Used with visible signs of wear' },
];

const steps = [
  { id: 1, title: 'Basic Info', description: 'Product details' },
  { id: 2, title: 'Pricing', description: 'Price & B2B' },
  { id: 3, title: 'Media', description: 'Images & specs' },
  { id: 4, title: 'Shipping', description: 'Delivery & more' },
  { id: 5, title: 'Variants', description: 'Options & stock' },
];

const emptyForm: SellerProductFormData = {
  name_en: '',
  name_mm: '',
  description_en: '',
  description_mm: '',
  product_type: 'physical',
  price: '',
  category_id: '',
  quantity_unit: 'piece',
  moq: 1,
  min_order_unit: 'piece',
  lead_time: '',
  condition: 'new',
  is_active: true,
  brand: '',
  model: '',
  material: '',
  origin: '',
  weight_kg: '',
  warranty: '',
  warranty_type: '',
  warranty_period: '',
  return_policy: '',
  shipping_cost: '',
  shipping_time: '',
  packaging_details: '',
  additional_info: '',
  is_featured: false,
  is_new: true,
  free_shipping: false,
  discount_price: '',
  discount_start: '',
  discount_end: '',
  specifications: {},
  file_url: '',
  file_type: '',
  images: [],
};

type Option = {
  value: string;
  label: string;
  description?: string;
};

function toStringValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function buildCategoryOptions(categories: SellerProductCategory[], language: string): Option[] {
  return categories.flatMap((parent) => {
    const parentName = language === 'my' ? parent.nameMm || parent.nameEn || parent.name : parent.nameEn || parent.name;
    if (!parent.children.length) {
      return [{ value: String(parent.id), label: parentName }];
    }

    return parent.children.map((child) => ({
      value: String(child.id),
      label: language === 'my' ? child.nameMm || child.nameEn || child.name : child.nameEn || child.name,
      description: parentName,
    }));
  });
}

function Field({
  label,
  required,
  value,
  placeholder,
  onChange,
  multiline,
  keyboardType = 'default',
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'url';
}) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
        {label}
        {required ? ' *' : ''}
        {!required && <Text className="text-xs text-gray-400">(Optional)</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || label}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-lg border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${
          multiline ? 'min-h-28' : ''
        }`}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  tone = 'green',
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  tone?: 'green' | 'amber' | 'blue';
}) {
  const tones = {
    green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    amber: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
    blue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  };

  return (
    <Pressable onPress={() => onChange(!value)} className={`flex-row items-center gap-3 rounded-lg border p-4 ${tones[tone]}`}>
      <View className={`h-5 w-5 items-center justify-center rounded border ${value ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'}`}>
        {value && <Feather name="check" size={13} color="#ffffff" />}
      </View>
      <Text className="min-w-0 flex-1 font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">{label}</Text>
    </Pressable>
  );
}

function PillSelect({
  label,
  value,
  options,
  onChange,
  columns = false,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  columns?: boolean;
}) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">{label}</Text>
      <View className={`${columns ? 'gap-3 md:grid md:grid-cols-3' : 'flex-row flex-wrap gap-2'}`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`rounded-xl border-2 p-3 ${
                selected
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
              } ${columns ? 'md:flex-1' : ''}`}>
              <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">{option.label}</Text>
              {option.description && (
                <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{option.description}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SelectModal({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="gap-2">
      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
        <View className="min-w-0 flex-1">
          <Text className={`font-sans text-sm ${selected ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400'}`}>
            {selected?.label || placeholder}
          </Text>
          {selected?.description && (
            <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">{selected.description}</Text>
          )}
        </View>
        <Feather name="chevron-down" size={18} color={isDark ? '#cbd5e1' : '#6b7280'} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[520px] md:rounded-2xl">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{label}</Text>
              <Pressable onPress={() => setOpen(false)} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="x" size={18} color={isDark ? '#cbd5e1' : '#64748b'} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const selectedOption = value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`mb-2 rounded-xl border p-4 ${
                      selectedOption
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                    }`}>
                    <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">{option.label}</Text>
                    {option.description && (
                      <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{option.description}</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View>
      <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{title}</Text>
      <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">{subtitle}</Text>
    </View>
  );
}

const emptyTier = (): SellerWholesaleTier => ({
  minQty: '',
  pricePerUnit: '',
  label: '',
  isActive: true,
});

function WholesaleTiersEditorNative({
  productId,
  basePrice,
  moq,
  quantityUnit,
}: {
  productId?: string | number | null;
  basePrice: number;
  moq: number;
  quantityUnit: string;
}) {
  const { t } = useAppTranslation();
  const [tiers, setTiers] = useState<SellerWholesaleTier[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState('[]');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loadTiers = async () => {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const nextTiers = await fetchSellerWholesaleTiers(productId);
      setTiers(nextTiers);
      setSavedSnapshot(JSON.stringify(nextTiers));
    } catch {
      setError('Could not load existing tiers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTiers();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (!productId) {
    return (
      <View className="items-center rounded-xl border border-dashed border-gray-200 p-5 dark:border-slate-700">
        <Feather name="tag" size={20} color="#9ca3af" />
        <Text className="mt-2 text-center font-sans text-sm text-gray-400 dark:text-slate-500">
          {t('product_form.wholesale_tiers.save_first')}
        </Text>
      </View>
    );
  }

  const isDirty = JSON.stringify(tiers) !== savedSnapshot;
  const updateRow = (index: number, key: keyof SellerWholesaleTier, value: string | boolean) => {
    setSuccess(false);
    setTiers((current) => current.map((tier, idx) => (idx === index ? { ...tier, [key]: value } : tier)));
  };
  const removeRow = (index: number) => {
    setSuccess(false);
    setTiers((current) => current.filter((_, idx) => idx !== index));
  };
  const calcDiscount = (price: string) => {
    const nextPrice = parseFloat(price);
    if (!basePrice || !nextPrice || nextPrice >= basePrice) return '0%';
    return `${Math.round(((basePrice - nextPrice) / basePrice) * 100)}%`;
  };
  const validate = () => {
    const seen = new Set<number>();
    for (let index = 0; index < tiers.length; index += 1) {
      const tier = tiers[index];
      const qty = parseInt(tier.minQty, 10);
      const price = parseFloat(tier.pricePerUnit);
      if (!Number.isFinite(qty) || qty < moq) return `Tier ${index + 1}: min qty must be at least MOQ (${moq}).`;
      if (seen.has(qty)) return `Tier ${index + 1}: duplicate min qty.`;
      if (!Number.isFinite(price) || price <= 0) return `Tier ${index + 1}: enter a valid price.`;
      if (basePrice > 0 && price >= basePrice) return `Tier ${index + 1}: tier price should be below base price.`;
      seen.add(qty);
    }
    return '';
  };
  const saveTiers = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fresh = await syncSellerWholesaleTiers(productId, tiers);
      setTiers(fresh);
      setSavedSnapshot(JSON.stringify(fresh));
      setSuccess(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to save tiers. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-3 md:flex-row md:items-start md:justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
            {t('product_form.wholesale_tiers.title')}
          </Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
            {t('product_form.wholesale_tiers.subtitle', { price: formatMMK(basePrice) })}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={loadTiers}
            disabled={loading || saving}
            className="h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600">
            <Feather name="refresh-cw" size={16} color="#94a3b8" />
          </Pressable>
          <Pressable
            onPress={() => setTiers((current) => [...current, { ...emptyTier(), minQty: String(Math.max(moq, 1)) }])}
            disabled={saving}
            className="flex-row items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/30">
            <Feather name="plus" size={15} color="#16a34a" />
            <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
              {t('product_form.wholesale_tiers.add_tier')}
            </Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View className="gap-2">
          <View className="h-12 rounded-lg bg-gray-100 dark:bg-slate-700" />
          <View className="h-12 rounded-lg bg-gray-100 dark:bg-slate-700" />
        </View>
      ) : tiers.length === 0 ? (
        <View className="items-center rounded-xl border border-dashed border-gray-200 py-8 dark:border-slate-700">
          <Text className="text-center font-sans text-sm text-gray-400 dark:text-slate-500">
            {t('product_form.wholesale_tiers.empty').replace(/<[^>]*>/g, '')}
          </Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
          {tiers.map((tier, index) => (
            <View key={`${tier.id || 'new'}-${index}`} className="gap-3 border-b border-gray-100 bg-white p-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-800">
              <View className="gap-3 md:flex-row">
                <Field
                  label={t('product_form.wholesale_tiers.col_min_qty', { unit: quantityUnit })}
                  value={tier.minQty}
                  onChange={(value) => updateRow(index, 'minQty', value.replace(/\D/g, ''))}
                  keyboardType="numeric"
                />
                <Field
                  label={t('product_form.wholesale_tiers.col_price_per_unit', { unit: quantityUnit })}
                  value={tier.pricePerUnit}
                  onChange={(value) => updateRow(index, 'pricePerUnit', value.replace(/[^\d.]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
              <View className="gap-3 md:flex-row md:items-end">
                <View className="flex-1">
                  <Field
                    label={t('product_form.wholesale_tiers.col_label')}
                    value={tier.label}
                    placeholder={t('product_form.wholesale_tiers.label_placeholder')}
                    onChange={(value) => updateRow(index, 'label', value)}
                  />
                </View>
                <View className="gap-2 md:w-36">
                  <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">
                    {t('product_form.wholesale_tiers.col_discount')}
                  </Text>
                  <View className="rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
                    <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                      {calcDiscount(tier.pricePerUnit)}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => updateRow(index, 'isActive', !tier.isActive)}
                  className="flex-row items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-600">
                  <View className={`h-4 w-4 rounded ${tier.isActive ? 'bg-green-600' : 'bg-gray-300'}`}>
                    {tier.isActive ? <Feather name="check" size={12} color="#ffffff" /> : null}
                  </View>
                  <Text className="font-sans text-xs text-gray-600 dark:text-slate-300">
                    {t('product_form.wholesale_tiers.col_active')}
                  </Text>
                </Pressable>
                <Pressable onPress={() => removeRow(index)} className="h-10 w-10 items-center justify-center rounded-lg">
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {(tiers.length > 0 || isDirty) ? (
        <View className="gap-3 md:flex-row md:items-center md:justify-between">
          <Text className={`font-sans text-xs ${success ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
            {success
              ? t('product_form.wholesale_tiers.tiers_saved')
              : isDirty
                ? t('product_form.wholesale_tiers.unsaved_changes')
                : t('product_form.wholesale_tiers.tiers_saved_count', { n: tiers.length, s: tiers.length !== 1 ? 's' : '' })}
          </Text>
          <Pressable
            onPress={saveTiers}
            disabled={saving || loading}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 disabled:opacity-50">
            {saving ? <ActivityIndicator color="#ffffff" /> : <Feather name="check" size={16} color="#ffffff" />}
            <Text className="font-sans text-sm font-semibold text-white">
              {saving ? t('product_form.wholesale_tiers.saving') : t('product_form.wholesale_tiers.save_tiers')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {tiers.length === 0 && !loading ? (
        <Text className="text-center font-sans text-xs text-gray-400 dark:text-slate-500">
          {t('product_form.wholesale_tiers.example', { unit: quantityUnit, base: formatMMK(basePrice) })}
        </Text>
      ) : null}
    </View>
  );
}

export function ProductFormNative({ productId }: { productId?: string }) {
  const { t, language } = useAppTranslation();
  const { isDark } = useTheme();
  const [form, setForm] = useState<SellerProductFormData>(emptyForm);
  const [categories, setCategories] = useState<SellerProductCategory[]>([]);
  const [images, setImages] = useState<SellerProductImage[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [leaveModal, setLeaveModal] = useState(false);
  const [clearImagesModal, setClearImagesModal] = useState(false);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories, language), [categories, language]);
  const editing = Boolean(productId);

  const update = <K extends keyof SellerProductFormData>(key: K, value: SellerProductFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setError('');
        const [nextCategories, productResult] = await Promise.all([
          fetchSellerProductCategories(controller.signal),
          productId ? fetchSellerProductForEdit(productId, controller.signal) : Promise.resolve(null),
        ]);
        if (controller.signal.aborted) return;
        setCategories(nextCategories);
        if (productResult) {
          setForm({ ...emptyForm, ...productResult.product });
          setImages(productResult.images);
          setCompletedSteps(new Set([1, 2, 3, 4]));
        }
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load product form.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [productId]);

  const validateStep = (step: number) => {
    if (step === 1) return Boolean(form.name_en && form.description_en && form.category_id && form.product_type);
    if (step === 2) return Boolean(form.price && Number(form.moq) >= 1 && form.condition);
    if (step === 3) return images.length > 0;
    return true;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      setError('Please complete the required fields before continuing.');
      return;
    }
    setError('');
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const addImageFromUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    setImages((prev) => [
      ...prev,
      {
        url,
        path: url,
        angle: 'default',
        isPrimary: prev.length === 0,
        name: 'External Image',
        size: 'External',
      },
    ]);
    setImageUrl('');
  };

  const uploadPickedImages = async (
    files: { uri: string; name: string; type: string; fileSize?: number }[],
    rejected = 0
  ) => {
    if (rejected > 0) {
      setError('Some images were rejected. Use JPEG, PNG, or WebP under 5 MB.');
    }
    if (!files.length) return;

    setIsUploadingImages(true);
    setUploadProgress(0);
    try {
      const uploaded: SellerProductImage[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const formData = new FormData();
        appendUploadFile(formData, 'image', file);
        formData.append('angle', imageAngles[images.length + uploaded.length] || 'default');
        const result = await uploadSellerProductImage(formData, form.id || productId || undefined);
        if (result) {
          uploaded.push({
            ...result,
            isPrimary: images.length === 0 && uploaded.length === 0,
            name: result.name || file.name,
            size: result.size || (file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Uploaded'),
          });
        }
        setUploadProgress(Math.round(((index + 1) / files.length) * 100));
      }
      if (uploaded.length) setImages((current) => [...current, ...uploaded]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to upload images.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const pickAndUploadImages = async () => {
    const result = await pickImagesFromLibrary({ allowsMultipleSelection: true });
    await uploadPickedImages(result.accepted, result.rejected);
  };

  const takeAndUploadImage = async () => {
    const result = await pickImageFromCamera();
    await uploadPickedImages(result.accepted, result.rejected);
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) => prev.map((image, imageIndex) => ({ ...image, isPrimary: imageIndex === index })));
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, imageIndex) => imageIndex !== index);
      if (!next.some((image) => image.isPrimary) && next[0]) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
  };

  const addSpecification = () => {
    if (!specKey.trim() || !specValue.trim()) return;
    setForm((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, [specKey.trim()]: specValue.trim() },
    }));
    setSpecKey('');
    setSpecValue('');
  };

  const removeSpecification = (key: string) => {
    setForm((prev) => {
      const next = { ...prev.specifications };
      delete next[key];
      return { ...prev, specifications: next };
    });
  };

  const payload = () => ({
    ...form,
    price: Number(form.price),
    moq: Number(form.moq || 1),
    quantity_step: Number(form.moq || 1),
    category_id: Number(form.category_id),
    discount_price: form.discount_price ? Number(form.discount_price) : null,
    weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
    shipping_cost: form.free_shipping ? 0 : form.shipping_cost ? Number(form.shipping_cost) : null,
    file_url: form.product_type === 'digital' ? form.file_url || null : null,
    file_type: form.product_type === 'digital' ? form.file_type || null : null,
    images: images.map((image) => ({
      url: image.path || image.url,
      angle: image.angle,
      is_primary: image.isPrimary,
    })),
  });

  const saveCore = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setError('Please complete required product details, pricing, and at least one product image.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const result = editing && productId
        ? await updateSellerProduct(productId, payload())
        : await createSellerProduct(payload());
      const savedId = toStringValue(result.product.id || productId);
      setForm((prev) => ({ ...prev, ...result.product, id: savedId || prev.id }));
      if (result.images.length) setImages(result.images);
      setCompletedSteps(new Set([1, 2, 3, 4]));
      setCurrentStep(5);
      setSuccess(editing ? 'Product updated! Now review options and variants.' : 'Product created! Now define your options and variants.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Something went wrong while saving the product.');
    } finally {
      setSaving(false);
    }
  };

  const finish = () => {
    setSuccess('All done. Your product listing is ready.');
    setTimeout(() => router.replace('/seller/dashboard?tab=products'), 900);
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <View className="gap-6">
          <SectionTitle title="Basic Information" subtitle="English fields are required" />
          <PillSelect
            label="Product Type *"
            value={form.product_type}
            columns
            options={productTypes.map((type) => ({ value: type.value, label: type.label, description: type.hint }))}
            onChange={(value) => update('product_type', value)}
          />
          <View className="gap-6 md:grid md:grid-cols-2">
            <Field label="Product Name (English)" required value={form.name_en} onChange={(value) => update('name_en', value)} />
            <Field label="Product Name (Myanmar)" value={form.name_mm} onChange={(value) => update('name_mm', value)} />
          </View>
          <View className="gap-6 md:grid md:grid-cols-2">
            <Field label="Description (English)" required multiline value={form.description_en} onChange={(value) => update('description_en', value)} />
            <Field label="Description (Myanmar)" multiline value={form.description_mm} onChange={(value) => update('description_mm', value)} />
          </View>
          <View className="gap-6 md:grid md:grid-cols-2">
            <SelectModal
              label="Category *"
              value={toStringValue(form.category_id)}
              options={categoryOptions}
              placeholder="Select a category"
              onChange={(value) => update('category_id', value)}
            />
            <SelectModal
              label="Condition *"
              value={form.condition}
              options={conditions.map((condition) => ({
                value: condition.value,
                label: condition.label,
                description: condition.description,
              }))}
              placeholder="Select condition"
              onChange={(value) => update('condition', value)}
            />
          </View>
          <View className="gap-6 md:grid md:grid-cols-2">
            <Field label="Brand" value={form.brand} onChange={(value) => update('brand', value)} />
            <Field label="Model" value={form.model} onChange={(value) => update('model', value)} />
            <Field label="Material" value={form.material} onChange={(value) => update('material', value)} />
            <Field label="Country of Origin" value={form.origin} onChange={(value) => update('origin', value)} />
          </View>
          {form.product_type === 'digital' && (
            <View className="gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20 md:grid md:grid-cols-2">
              <Field label="File URL" required keyboardType="url" value={form.file_url} onChange={(value) => update('file_url', value)} />
              <Field label="File Type" value={form.file_type} placeholder="e.g. PDF, ZIP, MP4" onChange={(value) => update('file_type', value)} />
            </View>
          )}
        </View>
      );
    }

    if (currentStep === 2) {
      return (
        <View className="gap-6">
          <SectionTitle title="Pricing & B2B" subtitle="Set the base price and B2B rules. Per-variant pricing comes next." />
          <View className="gap-6 md:grid md:grid-cols-2">
            <Field label="Base Price (MMK)" required keyboardType="numeric" value={toStringValue(form.price)} onChange={(value) => update('price', value)} />
            <Field label="Discount Price (MMK)" keyboardType="numeric" value={toStringValue(form.discount_price)} onChange={(value) => update('discount_price', value)} />
            <Field label="MOQ (Minimum Order Qty)" required keyboardType="numeric" value={toStringValue(form.moq)} onChange={(value) => update('moq', value)} />
            <SelectModal
              label="Quantity Unit *"
              value={form.quantity_unit}
              options={quantityUnits.map((unit) => ({ value: unit, label: unit.replace('_', ' ') }))}
              placeholder="Select unit"
              onChange={(value) => update('quantity_unit', value)}
            />
            <Field label="Lead Time" value={form.lead_time} placeholder="e.g. 3-5 days" onChange={(value) => update('lead_time', value)} />
            <Field label="Weight (kg)" keyboardType="numeric" value={toStringValue(form.weight_kg)} onChange={(value) => update('weight_kg', value)} />
            <Field label="Packaging Details" value={form.packaging_details} onChange={(value) => update('packaging_details', value)} />
          </View>
          <View className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
              <Text className="font-sans text-xs font-bold uppercase text-gray-400 dark:text-slate-500">
                {t('product_form.sections.wholesale_pricing')}
              </Text>
              <View className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
            </View>
            <View className="mt-4">
              <WholesaleTiersEditorNative
                productId={form.id || productId || null}
                basePrice={parseFloat(String(form.price)) || 0}
                moq={parseInt(String(form.moq), 10) || 1}
                quantityUnit={form.quantity_unit || 'piece'}
              />
            </View>
          </View>
        </View>
      );
    }

    if (currentStep === 3) {
      return (
        <View className="gap-7">
          <SectionTitle title={t('product_form.sections.media_title')} subtitle={t('product_form.sections.media_subtitle')} />
          <View className="gap-3">
            <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
              {t('product_form.labels.product_images')} *{' '}
              <Text className="text-xs font-normal text-gray-500">
                {t('product_form.labels.image_count', { count: images.length })}
              </Text>
            </Text>
            <View className="gap-2 md:flex-row">
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://.../image.jpg"
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <Pressable onPress={addImageFromUrl} className="items-center justify-center rounded-lg border border-gray-300 px-4 py-3 dark:border-slate-600">
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {t('product_form.actions.add_url')}
                </Text>
              </Pressable>
              {images.length > 0 && (
                <Pressable onPress={() => setClearImagesModal(true)} className="items-center justify-center rounded-lg border border-red-300 px-4 py-3 dark:border-red-700">
                  <Text className="font-sans text-sm font-semibold text-red-600 dark:text-red-400">
                    {t('product_form.actions.clear_all')}
                  </Text>
                </Pressable>
              )}
            </View>
            {isUploadingImages ? (
              <View className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="font-sans text-sm font-medium text-blue-700 dark:text-blue-400">
                    {t('product_form.messages.uploading_images')}
                  </Text>
                  <Text className="font-sans text-sm text-blue-600 dark:text-blue-400">{uploadProgress}%</Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/30">
                  <View className="h-full rounded-full bg-blue-600" style={{ width: `${uploadProgress}%` }} />
                </View>
              </View>
            ) : null}
            <View className="gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-800">
              <View className="items-center">
              <Feather name="image" size={40} color={isDark ? '#64748b' : '#9ca3af'} />
              <Text className="mt-2 text-center font-sans text-base font-medium text-gray-600 dark:text-slate-400">
                {images.length > 0 ? t('product_form.actions.add_more_images') : t('product_form.actions.click_upload_images')}
              </Text>
              <Text className="mt-1 text-center font-sans text-sm text-gray-500 dark:text-slate-500">
                {t('product_form.hints.image_formats')}
              </Text>
              </View>
              <View className="gap-2 sm:flex-row">
                <Pressable
                  onPress={pickAndUploadImages}
                  disabled={isUploadingImages}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 disabled:opacity-60">
                  <Feather name="folder" size={17} color="#ffffff" />
                  <Text className="font-sans text-sm font-bold text-white">Gallery</Text>
                </Pressable>
                {Platform.OS !== 'web' ? (
                  <Pressable
                    onPress={takeAndUploadImage}
                    disabled={isUploadingImages}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900">
                    <Feather name="camera" size={17} color={isDark ? '#cbd5e1' : '#374151'} />
                    <Text className="font-sans text-sm font-bold text-gray-700 dark:text-slate-200">Camera</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          {images.length > 0 && (
            <View className="gap-3 md:grid md:grid-cols-2">
              {images.map((image, index) => (
                <View key={`${image.url}-${index}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  <Image source={{ uri: getNativeImageUrl(image.url) || image.url }} className="h-44 w-full bg-gray-100 dark:bg-slate-700" contentFit="cover" />
                  <View className="gap-3 p-4">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="min-w-0 flex-1 font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
                        {image.name || `Image ${index + 1}`}
                      </Text>
                      {image.isPrimary && (
                        <View className="rounded-full bg-green-100 px-2 py-1 dark:bg-green-900/30">
                          <Text className="font-sans text-[11px] font-bold text-green-700 dark:text-green-300">Primary</Text>
                        </View>
                      )}
                    </View>
                    <SelectModal
                      label="Image angle"
                      value={image.angle}
                      options={imageAngles.map((angle) => ({ value: angle, label: angle === 'default' ? 'Other View' : `${angle} view` }))}
                      placeholder="Select angle"
                      onChange={(value) => setImages((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, angle: value } : item)))}
                    />
                    <View className="flex-row gap-2">
                      <Pressable onPress={() => setPrimaryImage(index)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-600">
                        <Text className="text-center font-sans text-xs font-semibold text-gray-700 dark:text-slate-300">Set Primary</Text>
                      </Pressable>
                      <Pressable onPress={() => removeImage(index)} className="rounded-lg border border-red-300 px-3 py-2 dark:border-red-700">
                        <Feather name="trash-2" size={16} color="#dc2626" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View className="gap-4">
            <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
              {t('product_form.labels.specifications')}{' '}
              <Text className="text-xs text-gray-400">(Optional)</Text>
            </Text>
            <View className="gap-2 md:flex-row">
              <TextInput value={specKey} onChangeText={setSpecKey} placeholder={t('product_form.placeholders.spec_name')} placeholderTextColor="#9ca3af" className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              <TextInput value={specValue} onChangeText={setSpecValue} placeholder={t('product_form.placeholders.spec_value')} placeholderTextColor="#9ca3af" className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              <Pressable onPress={addSpecification} className="items-center justify-center rounded-lg bg-green-600 px-4 py-3">
                <Text className="font-sans text-sm font-bold text-white">{t('product_form.actions.add_spec')}</Text>
              </Pressable>
            </View>
            {Object.entries(form.specifications).map(([key, value]) => (
              <View key={key} className="flex-row items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-900/60">
                <View className="min-w-0 flex-1">
                  <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">{key}</Text>
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{value}</Text>
                </View>
                <Pressable onPress={() => removeSpecification(key)}>
                  <Feather name="x" size={18} color="#ef4444" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (currentStep === 4) {
      return (
        <View className="gap-6">
          <SectionTitle title="Shipping & More" subtitle="Delivery, warranty, and visibility settings" />
          <View className="gap-6 md:grid md:grid-cols-2">
            <Field label="Shipping Time" value={form.shipping_time} placeholder="e.g. 2-4 business days" onChange={(value) => update('shipping_time', value)} />
            <SelectModal
              label="Warranty Type"
              value={form.warranty_type}
              options={warrantyTypes.map((type) => ({ value: type, label: type.replace('_', ' ') }))}
              placeholder="Select warranty type"
              onChange={(value) => update('warranty_type', value)}
            />
            <Field label="Warranty Period" value={form.warranty_period} placeholder="e.g. 6 months" onChange={(value) => update('warranty_period', value)} />
            <Field label="Warranty Details" value={form.warranty} onChange={(value) => update('warranty', value)} />
          </View>
          <Field label="Return Policy" multiline value={form.return_policy} onChange={(value) => update('return_policy', value)} />
          <Field label="Additional Information" multiline value={form.additional_info} onChange={(value) => update('additional_info', value)} />
          <View className="gap-3">
            <ToggleRow label="Free Shipping" value={Boolean(form.free_shipping)} onChange={(value) => update('free_shipping', value)} tone="blue" />
            {!form.free_shipping && (
              <Field label="Shipping Cost" keyboardType="numeric" value={toStringValue(form.shipping_cost)} onChange={(value) => update('shipping_cost', value)} />
            )}
            <ToggleRow label="Make this product active and visible" value={form.is_active} onChange={(value) => update('is_active', value)} />
            <ToggleRow label="Mark as new product" value={form.is_new} onChange={(value) => update('is_new', value)} tone="amber" />
          </View>
        </View>
      );
    }

    return (
      <View className="gap-6">
        <SectionTitle
          title="Options & Variants"
          subtitle="Define choices buyers can select, then generate and price variants."
        />
        <View className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <Text className="font-sans text-xs font-bold uppercase text-gray-400 dark:text-slate-500">Step A - Define Options</Text>
          <View className="mt-4">
            <ProductOptionsEditorNative
              productId={form.id || productId || null}
              onSaved={() => setSuccess('Options saved. You can now generate and price variants.')}
            />
          </View>
        </View>
        <View className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <Text className="font-sans text-xs font-bold uppercase text-gray-400 dark:text-slate-500">Step B - Generate & Price Variants</Text>
          <Text className="mt-3 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">Generated stock rows, SKU, price overrides, and active toggles will appear here.</Text>
        </View>
        <Pressable onPress={finish} className="self-end flex-row items-center gap-2 rounded-lg bg-green-600 px-6 py-3">
          <Feather name="check-circle" size={18} color="#ffffff" />
          <Text className="font-sans text-sm font-bold text-white">Done - Finish Listing</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 dark:bg-slate-900">
        <ActivityIndicator color="#16a34a" />
      </SafeAreaView>
    );
  }

  const current = steps[currentStep - 1];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 py-8 md:px-8">
        <View className="mx-auto w-full max-w-4xl">
          <View className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <View className="flex-row items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-slate-700">
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {editing ? t('product_form.titles.edit', { defaultValue: 'Edit Product' }) : t('product_form.titles.new', { defaultValue: 'New Listing' })}
                </Text>
                <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
                  {editing ? 'Update your product details' : 'Create a new product listing'}
                  {!editing && <Text className="text-blue-600 dark:text-blue-400"> - Draft auto-saved</Text>}
                </Text>
              </View>
              <Pressable onPress={() => setLeaveModal(true)} className="h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700">
                <Feather name="x" size={20} color={isDark ? '#cbd5e1' : '#6b7280'} />
              </Pressable>
            </View>

            <View className="px-6 py-5">
              <View className="mb-3 flex-row items-center justify-between md:hidden">
                <Text className="font-sans text-sm font-bold text-gray-800 dark:text-slate-200">{current.title}</Text>
                <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-400">Step {currentStep} of {steps.length}</Text>
              </View>
              <View className="flex-row items-start">
                {steps.map((step, index) => {
                  const done = completedSteps.has(step.id);
                  const active = currentStep === step.id;
                  return (
                    <View key={step.id} className="flex-1 flex-row items-start">
                      <Pressable onPress={() => (step.id === 1 || completedSteps.has(step.id - 1) ? setCurrentStep(step.id) : undefined)} className="items-center">
                        <View className={`h-9 w-9 items-center justify-center rounded-full border-2 ${active ? 'border-green-500 bg-green-500' : done ? 'border-green-400 bg-green-400' : 'border-gray-300 dark:border-slate-600'}`}>
                          {done ? <Feather name="check" size={18} color="#ffffff" /> : <Text className={`font-sans text-sm font-bold ${active ? 'text-white' : 'text-gray-400 dark:text-slate-500'}`}>{step.id}</Text>}
                        </View>
                        <Text className={`mt-2 hidden w-20 text-center font-sans text-[11px] font-semibold md:flex ${active ? 'text-green-700 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>{step.title}</Text>
                      </Pressable>
                      {index < steps.length - 1 && <View className={`mx-2 mt-4 h-0.5 flex-1 rounded-full ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-slate-700'}`} />}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {error && (
              <View className="mx-6 mt-6 flex-row gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <Feather name="alert-circle" size={18} color="#dc2626" />
                <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-red-700 dark:text-red-400">{error}</Text>
              </View>
            )}
            {success && (
              <View className="mx-6 mt-6 flex-row gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <Feather name="check-circle" size={18} color="#16a34a" />
                <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-green-700 dark:text-green-400">{success}</Text>
              </View>
            )}
            <View className="p-6 md:p-8">{renderStepContent()}</View>
            {currentStep < 5 && (
              <View className="flex-row items-center justify-between gap-3 border-t border-gray-200 px-4 py-5 dark:border-slate-700 md:px-8">
                <View>
                  {currentStep > 1 && (
                    <Pressable onPress={() => setCurrentStep((prev) => Math.max(prev - 1, 1))} className="flex-row items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 dark:border-slate-600">
                      <Feather name="chevron-left" size={17} color={isDark ? '#cbd5e1' : '#374151'} />
                      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">Previous</Text>
                    </Pressable>
                  )}
                </View>
                {currentStep === 4 ? (
                  <Pressable disabled={saving} onPress={saveCore} className="flex-row items-center gap-2 rounded-lg bg-green-600 px-5 py-3 disabled:opacity-60">
                    {saving ? <ActivityIndicator color="#ffffff" /> : <Feather name="check-circle" size={17} color="#ffffff" />}
                    <Text className="font-sans text-sm font-bold text-white">{saving ? 'Saving...' : editing ? 'Update & Continue' : 'Save & Continue'}</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={nextStep} className="flex-row items-center gap-2 rounded-lg bg-green-600 px-5 py-3">
                    <Text className="font-sans text-sm font-bold text-white">Next</Text>
                    <Feather name="chevron-right" size={17} color="#ffffff" />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={leaveModal} transparent animationType="fade" onRequestClose={() => setLeaveModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-4">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">Leave without saving?</Text>
            <Text className="mt-2 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">Your current changes may not be saved.</Text>
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable onPress={() => setLeaveModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">Keep Editing</Text>
              </Pressable>
              <Pressable onPress={() => router.replace('/seller/dashboard?tab=products')} className="rounded-lg bg-gray-800 px-4 py-2 dark:bg-slate-700">
                <Text className="font-sans text-sm font-semibold text-white">Leave</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={clearImagesModal} transparent animationType="fade" onRequestClose={() => setClearImagesModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-4">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">Remove all images?</Text>
            <Text className="mt-2 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">This cannot be undone.</Text>
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable onPress={() => setClearImagesModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setImages([]);
                  setClearImagesModal(false);
                }}
                className="rounded-lg bg-red-600 px-4 py-2">
                <Text className="font-sans text-sm font-semibold text-white">Remove All</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
