import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { createElement, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTranslation } from '@/i18n';
import { ApiError, apiGet, apiPost } from '@/utils/native-api';

type OptionType = 'color' | 'size' | 'text' | 'image' | 'input';

type OptionValueDraft = {
  _id: string;
  label: string;
  value: string;
  meta: {
    hex?: string;
    image_url?: string;
  };
};

type ProductOptionDraft = {
  _id: string;
  name: string;
  type: OptionType;
  is_required: boolean;
  values: OptionValueDraft[];
};

type UnknownRecord = Record<string, unknown>;

const OPTION_TYPES = [
  { value: 'color' as const, labelKey: 'color', hintKey: 'color_hint' },
  { value: 'size' as const, labelKey: 'size', hintKey: 'size_hint' },
  { value: 'text' as const, labelKey: 'text', hintKey: 'text_hint' },
  { value: 'image' as const, labelKey: 'image', hintKey: 'image_hint' },
  { value: 'input' as const, labelKey: 'input', hintKey: 'input_hint' },
];

const PRESET_COLORS = [
  '#000000',
  '#FFFFFF',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
  '#92400E',
  '#1E3A5F',
  '#78716C',
  '#A855F7',
];

const inputClassName =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

const randomId = () => Math.random().toString(36).slice(2);

const emptyOption = (): ProductOptionDraft => ({
  _id: randomId(),
  name: '',
  type: 'text',
  is_required: true,
  values: [],
});

const emptyValue = (): OptionValueDraft => ({
  _id: randomId(),
  label: '',
  value: '',
  meta: {},
});

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const slugify = (value: string) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const isValidSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

const isValidHex = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash.length === 7 ? withHash : withHash.slice(0, 7);
};

const isRecordOfErrorLists = (value: unknown): value is Record<string, string[]> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((entry) => Array.isArray(entry));

const formatApiError = (error: unknown, fallback: string) => {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback;
  }

  if (isRecordOfErrorLists(error.errors)) {
    const messages = Object.values(error.errors).flat().filter(Boolean);
    if (messages.length) return messages.join(', ');
  }

  return error.message || fallback;
};

const cleanValueMeta = (optType: OptionType, meta: OptionValueDraft['meta']) => {
  const cleaned: OptionValueDraft['meta'] = {};

  if (optType === 'color') {
    const hex = normalizeHex(meta.hex || '');
    if (hex && isValidHex(hex)) cleaned.hex = hex;
  }

  if (optType === 'image' && meta.image_url?.trim()) {
    cleaned.image_url = meta.image_url.trim();
  }

  return Object.keys(cleaned).length > 0 ? cleaned : null;
};

const getString = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
};

const getPayloadArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload)) {
    if (Array.isArray(payload.data)) return payload.data;
    if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data;
  }
  return [];
};

const mapValue = (value: UnknownRecord): OptionValueDraft => {
  const meta = isRecord(value.meta) ? value.meta : {};

  return {
    _id: getString(value.id, randomId()),
    label: getString(value.label),
    value: getString(value.value),
    meta: {
      hex: getString(meta.hex),
      image_url: getString(meta.image_url),
    },
  };
};

const mapOption = (option: UnknownRecord): ProductOptionDraft => ({
  _id: getString(option.id, randomId()),
  name: getString(option.name),
  type: (getString(option.type, 'text') as OptionType) || 'text',
  is_required: option.is_required !== false,
  values: Array.isArray(option.values) ? option.values.filter(isRecord).map(mapValue) : [],
});

function WebColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  if (Platform.OS !== 'web') return null;

  return createElement('input', {
    type: 'color',
    'aria-label': label,
    value: isValidHex(value) ? value : '#000000',
    onChange: (event: Event) => {
      const target = event.target as HTMLInputElement;
      onChange(target.value);
    },
    className:
      'h-9 w-12 flex-shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-transparent dark:border-slate-600',
  });
}

function WebOptionTypeSelect({
  value,
  onChange,
  options,
}: {
  value: OptionType;
  onChange: (value: OptionType) => void;
  options: Array<{ value: OptionType; label: string }>;
}) {
  if (Platform.OS !== 'web') return null;

  return createElement(
    'select',
    {
      value,
      onClick: (event: Event) => event.stopPropagation(),
      onChange: (event: Event) => {
        const target = event.target as HTMLSelectElement;
        onChange(target.value as OptionType);
      },
      className:
        'min-w-[120px] flex-[1_1_120px] rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
    },
    options.map((option) =>
      createElement('option', { key: option.value, value: option.value }, option.label),
    ),
  );
}

function NativeColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const display = isValidHex(normalizeHex(value)) ? normalizeHex(value) : '#000000';

  if (Platform.OS === 'web') return null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className="h-9 w-12 flex-shrink-0 rounded-lg border border-gray-300 dark:border-slate-600"
        style={{ backgroundColor: display }}
      />

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5 dark:bg-slate-900">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">
                {label}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="x" size={16} color="#64748b" />
              </Pressable>
            </View>

            <View className="mb-4 flex-row flex-wrap gap-2">
              {PRESET_COLORS.map((color) => {
                const active = display.toLowerCase() === color.toLowerCase();
                return (
                  <Pressable
                    key={color}
                    onPress={() => {
                      onChange(color);
                      setOpen(false);
                    }}
                    className={`h-10 w-10 rounded-lg border-2 ${active ? 'border-green-500' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </View>

            <Text className="mb-2 font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">
              {t('product_form.options.hex_colour', 'Hex colour')}
            </Text>
            <TextInput
              value={value}
              onChangeText={(hex) => onChange(normalizeHex(hex))}
              placeholder="#000000"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              className={inputClassName}
            />

            <Pressable
              onPress={() => setOpen(false)}
              className="mt-4 h-10 items-center justify-center rounded-lg bg-green-600">
              <Text className="font-sans text-sm font-semibold text-white">
                {t('common.done', 'Done')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function OptionTypeSelect({
  value,
  onChange,
}: {
  value: OptionType;
  onChange: (value: OptionType) => void;
}) {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () =>
      OPTION_TYPES.map((type) => ({
        value: type.value,
        label: t(`product_form.options.types.${type.labelKey}`, type.value),
        hint: t(`product_form.options.types.${type.hintKey}`, ''),
      })),
    [t],
  );
  const selected = options.find((option) => option.value === value);

  if (Platform.OS === 'web') {
    return (
      <WebOptionTypeSelect
        value={value}
        onChange={onChange}
        options={options.map((option) => ({ value: option.value, label: option.label }))}
      />
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="min-w-[120px] flex-[1_1_120px] flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-700">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300" numberOfLines={1}>
          {selected?.label || value}
        </Text>
        <Feather name="chevron-down" size={14} color="#9ca3af" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[75%] rounded-t-3xl bg-white p-5 dark:bg-slate-900">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">
                {t('product_form.options.type_label', 'Option type')}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="x" size={16} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`mb-2 rounded-xl border p-3 ${
                      active
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                    }`}>
                    <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {option.label}
                    </Text>
                    {option.hint ? (
                      <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
                        {option.hint}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ValueRow({
  optType,
  value,
  onChange,
  onRemove,
}: {
  optType: OptionType;
  value: OptionValueDraft;
  onChange: (value: OptionValueDraft) => void;
  onRemove: () => void;
}) {
  const { t } = useAppTranslation();
  const pickColourLabel = t('product_form.options.pick_colour', 'Pick colour');
  const imagePreview =
    optType === 'image' && value.meta.image_url?.trim().startsWith('http')
      ? value.meta.image_url.trim()
      : '';

  return (
    <View className="gap-2 py-1.5 sm:flex-row sm:items-center">
      <View className="min-w-0 flex-1 gap-2 lg:flex-row">
        <TextInput
          value={value.label}
          onChangeText={(label) =>
            onChange({ ...value, label, value: value.value ? value.value : slugify(label) })
          }
          placeholder={t('product_form.options.value_label_placeholder', 'Label (e.g. Red)')}
          placeholderTextColor="#9ca3af"
          className={`min-w-0 flex-1 ${inputClassName}`}
        />
        <TextInput
          value={value.value}
          onChangeText={(nextValue) => onChange({ ...value, value: slugify(nextValue) })}
          placeholder={t('product_form.options.english_slug_placeholder', 'English slug (e.g. red)')}
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          className={`min-w-0 flex-1 ${inputClassName}`}
        />
        {optType === 'color' && (
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <WebColorInput
              label={pickColourLabel}
              value={value.meta.hex || '#000000'}
              onChange={(hex) => onChange({ ...value, meta: { ...value.meta, hex } })}
            />
            <NativeColorPicker
              label={pickColourLabel}
              value={value.meta.hex || '#000000'}
              onChange={(hex) => onChange({ ...value, meta: { ...value.meta, hex } })}
            />
            <TextInput
              value={value.meta.hex || ''}
              onChangeText={(hex) => onChange({ ...value, meta: { ...value.meta, hex } })}
              placeholder="#000000"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              className={`min-w-0 flex-1 ${inputClassName}`}
            />
          </View>
        )}
        {optType === 'image' && (
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            {imagePreview ? (
              <View className="h-9 w-9 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600">
                <Image
                  source={{ uri: imagePreview }}
                  style={{ width: 36, height: 36 }}
                  contentFit="cover"
                />
              </View>
            ) : null}
            <TextInput
              value={value.meta.image_url || ''}
              onChangeText={(imageUrl) => onChange({ ...value, meta: { ...value.meta, image_url: imageUrl } })}
              placeholder={t('product_form.placeholders.image_url', 'https://…/image.jpg')}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="url"
              className={`min-w-0 flex-1 ${inputClassName}`}
            />
          </View>
        )}
      </View>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t('product_form.actions.remove', 'Remove')}
        className="h-8 w-8 flex-shrink-0 items-center justify-center self-end rounded-lg sm:self-auto">
        <Feather name="trash-2" size={16} color="#9ca3af" />
      </Pressable>
    </View>
  );
}

function OptionBlock({
  option,
  onChange,
  onRemove,
}: {
  option: ProductOptionDraft;
  onChange: (option: ProductOptionDraft) => void;
  onRemove: () => void;
}) {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(true);
  const typeInfo = OPTION_TYPES.find((entry) => entry.value === option.type);
  const typeHint = typeInfo ? t(`product_form.options.types.${typeInfo.hintKey}`, '') : '';

  const secondColumnLabel =
    option.type === 'color'
      ? t('product_form.options.hex_colour', 'Hex colour')
      : option.type === 'image'
        ? t('product_form.options.image_url', 'Image URL')
        : t('product_form.options.slug', 'Slug');

  const updateValue = (index: number, nextValue: OptionValueDraft) => {
    const nextValues = [...option.values];
    nextValues[index] = nextValue;
    onChange({ ...option, values: nextValues });
  };

  return (
    <View className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
      <View className="flex-row flex-wrap items-center gap-2 bg-gray-50 px-3 py-3 dark:bg-slate-800 sm:gap-3 sm:px-4">
        <Pressable onPress={() => setOpen((current) => !current)} className="h-8 w-8 items-center justify-center">
          <Feather name="move" size={16} color="#9ca3af" />
        </Pressable>

        <TextInput
          value={option.name}
          onChangeText={(name) => onChange({ ...option, name })}
          placeholder={t('product_form.options.option_name_placeholder', 'Option name (e.g. Color)')}
          placeholderTextColor="#9ca3af"
          className="min-w-0 flex-[1_1_150px] rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-sans text-sm font-semibold text-gray-800 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-200"
        />

        <OptionTypeSelect
          value={option.type}
          onChange={(type) => onChange({ ...option, type, values: [] })}
        />

        <Pressable
          onPress={() => onChange({ ...option, is_required: !option.is_required })}
          className="flex-shrink-0 flex-row items-center gap-1">
          <View
            className={`h-4 w-4 items-center justify-center rounded border ${
              option.is_required ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white dark:border-slate-500 dark:bg-slate-700'
            }`}>
            {option.is_required ? <Feather name="check" size={11} color="#ffffff" /> : null}
          </View>
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
            {t('product_form.options.required', 'Required')}
          </Text>
        </Pressable>

        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t('product_form.actions.remove', 'Remove')}
          className="h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
          <Feather name="trash-2" size={16} color="#9ca3af" />
        </Pressable>

        <Pressable onPress={() => setOpen((current) => !current)} className="h-8 w-8 flex-shrink-0 items-center justify-center">
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
        </Pressable>
      </View>

      {open ? (
        <View className="gap-1 bg-white px-4 py-3 dark:bg-slate-900">
          {typeHint ? (
            <Text className="mb-2 font-sans text-xs text-gray-500 dark:text-slate-400">{typeHint}</Text>
          ) : null}

          {option.type !== 'input' ? (
            <>
              {option.values.length > 0 ? (
                <View className="mb-1 flex-row gap-2">
                  <Text className="min-w-0 flex-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                    {t('product_form.options.label', 'Label')}
                  </Text>
                  <Text className="min-w-0 flex-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                    {secondColumnLabel}
                  </Text>
                </View>
              ) : null}

              {option.values.map((value, index) => (
                <ValueRow
                  key={value._id}
                  optType={option.type}
                  value={value}
                  onChange={(nextValue) => updateValue(index, nextValue)}
                  onRemove={() =>
                    onChange({ ...option, values: option.values.filter((_, itemIndex) => itemIndex !== index) })
                  }
                />
              ))}

              <Pressable
                onPress={() => onChange({ ...option, values: [...option.values, emptyValue()] })}
                className="mt-2 flex-row items-center gap-1.5 self-start rounded-lg px-2.5 py-2">
                <Feather name="plus" size={16} color="#16a34a" />
                <Text className="font-sans text-sm font-medium text-green-600 dark:text-green-400">
                  {t('product_form.options.add_value', 'Add value')}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text className="font-sans text-sm italic text-gray-500 dark:text-slate-400">
              {t(
                'product_form.options.no_predefined_values',
                'No predefined values - the buyer will type their own.',
              )}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

export function ProductOptionsEditorNative({
  productId,
  onSaved,
}: {
  productId?: string | number | null;
  onSaved?: () => void;
}) {
  const { t } = useAppTranslation();
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setOptions([]);
    setError('');
    setSuccess('');
    setLoading(Boolean(productId));
  }, [productId]);

  useEffect(() => {
    if (!productId) return;

    const controller = new AbortController();
    apiGet(`/seller/products/${encodeURIComponent(String(productId))}/options`, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) {
          setOptions(getPayloadArray(payload).filter(isRecord).map(mapOption));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [productId]);

  const validate = () => {
    if (!productId) {
      return t('product_form.messages.save_steps_first', 'Save the product in Steps 1-4 first.');
    }

    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      if (!option.name.trim()) {
        return t('product_form.options.error_missing_name', 'Option #{{number}} is missing a name. Fill it in or remove it.', {
          number: index + 1,
        });
      }
      if (option.type !== 'input' && option.values.length === 0) {
        return t('product_form.options.error_needs_value', 'Option "{{name}}" needs at least one value.', {
          name: option.name,
        });
      }

      for (const value of option.values) {
        if (!value.label.trim()) {
          return t('product_form.options.error_value_label', 'All values in option "{{name}}" need a label.', {
            name: option.name,
          });
        }
        const slug = slugify(value.value || value.label);
        if (!slug || !isValidSlug(slug)) {
          return t(
            'product_form.options.error_value_slug',
            'Value "{{label}}" in option "{{name}}" needs an English slug using a-z, 0-9, or hyphen.',
            { name: option.name, label: value.label },
          );
        }
      }
    }

    return '';
  };

  const saveOptions = async () => {
    const validationError = validate();
    setError(validationError);
    setSuccess('');
    if (validationError || !productId) return;

    setSaving(true);
    try {
      await apiPost(`/seller/products/${encodeURIComponent(String(productId))}/options`, {
        options: options.map((option, index) => ({
          name: option.name.trim(),
          type: option.type,
          position: index + 1,
          is_required: option.is_required,
          values: option.values.map((value, valueIndex) => ({
            label: value.label.trim(),
            value: slugify(value.value || value.label),
            meta: cleanValueMeta(option.type, value.meta),
            position: valueIndex + 1,
          })),
        })),
      });
      setSuccess(t('product_form.options.saved', 'Options saved! Now generate your variants below.'));
      onSaved?.();
    } catch (nextError) {
      setError(formatApiError(nextError, t('product_form.options.save_failed', 'Failed to save options.')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="items-center rounded-xl border-2 border-dashed border-gray-300 py-10 dark:border-slate-600">
        <ActivityIndicator color="#16a34a" />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100">
            {t('product_form.options.title', 'Product Options')}
          </Text>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('product_form.options.subtitle', 'Define the choices buyers can select (e.g. Color, Size).')}
          </Text>
        </View>
        <Pressable
          onPress={() => setOptions((prev) => [...prev, emptyOption()])}
          className="h-9 flex-row items-center justify-center gap-1.5 self-start rounded-lg bg-green-600 px-3 sm:self-auto">
          <Feather name="plus" size={16} color="#ffffff" />
          <Text className="font-sans text-sm font-medium text-white">
            {t('product_form.options.add_option', 'Add Option')}
          </Text>
        </Pressable>
      </View>

      {options.length === 0 ? (
        <View className="items-center rounded-xl border-2 border-dashed border-gray-300 py-10 dark:border-slate-600">
          <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">
            {t('product_form.options.empty_title', 'No options yet.')}
          </Text>
          <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">
            {t('product_form.options.empty_hint', 'Click "Add Option" to define Color, Size, etc.')}
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {options.map((option, index) => (
            <OptionBlock
              key={option._id}
              option={option}
              onChange={(nextOption) => {
                const next = [...options];
                next[index] = nextOption;
                setOptions(next);
              }}
              onRemove={() => setOptions((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
            />
          ))}
        </View>
      )}

      {error ? (
        <View className="flex-row items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-700 dark:bg-red-900/20">
          <Feather name="alert-circle" size={16} color="#dc2626" style={{ marginTop: 2 }} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
        </View>
      ) : null}

      {success ? (
        <View className="flex-row items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-700 dark:bg-green-900/20">
          <Feather name="check-circle" size={16} color="#16a34a" style={{ marginTop: 2 }} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-700 dark:text-green-400">{success}</Text>
        </View>
      ) : null}

      {options.length > 0 ? (
        <Pressable
          disabled={saving}
          onPress={saveOptions}
          className="h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 disabled:opacity-50">
          <Text className="font-sans text-sm font-medium text-white">
            {saving
              ? t('product_form.actions.saving', 'Saving...')
              : t('product_form.options.save_options', 'Save Options')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
