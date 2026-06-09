import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useAppTranslation } from '@/i18n';
import { apiGet, apiPost } from '@/utils/native-api';

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

const optionTypeKeys: OptionType[] = ['color', 'size', 'text', 'image', 'input'];

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

function OptionTypeSelect({
  value,
  onChange,
}: {
  value: OptionType;
  onChange: (value: OptionType) => void;
}) {
  const { t } = useAppTranslation();

  return (
    <View className="flex-row flex-wrap gap-2">
      {optionTypeKeys.map((type) => {
        const active = value === type;
        return (
          <Pressable
            key={type}
            onPress={() => onChange(type)}
            className={`rounded-lg border px-3 py-2 ${
              active
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700'
            }`}>
            <Text
              className={`font-sans text-xs font-bold ${
                active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-300'
              }`}>
              {t(`product_form.options.types.${type}`, type)}
            </Text>
          </Pressable>
        );
      })}
    </View>
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

  return (
    <View className="gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <View className="gap-2 md:grid md:grid-cols-3">
        <TextInput
          value={value.label}
          onChangeText={(label) => onChange({ ...value, label, value: value.value || slugify(label) })}
          placeholder={t('product_form.options.value_label_placeholder', 'Label (e.g. Red)')}
          placeholderTextColor="#9ca3af"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <TextInput
          value={value.value}
          onChangeText={(nextValue) => onChange({ ...value, value: slugify(nextValue) })}
          placeholder={t('product_form.options.slug_placeholder', 'Slug (auto-filled)')}
          placeholderTextColor="#9ca3af"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        {optType === 'color' && (
          <View className="flex-row items-center gap-2">
            <View
              className="h-10 w-12 rounded-lg border border-gray-300 dark:border-slate-600"
              style={{ backgroundColor: value.meta.hex || '#000000' }}
            />
            <TextInput
              value={value.meta.hex || ''}
              onChangeText={(hex) => onChange({ ...value, meta: { ...value.meta, hex } })}
              placeholder="#000000"
              placeholderTextColor="#9ca3af"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </View>
        )}
        {optType === 'image' && (
          <TextInput
            value={value.meta.image_url || ''}
            onChangeText={(imageUrl) => onChange({ ...value, meta: { ...value.meta, image_url: imageUrl } })}
            placeholder={t('product_form.options.image_url', 'Image URL')}
            placeholderTextColor="#9ca3af"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        )}
      </View>
      <Pressable onPress={onRemove} className="self-end rounded-lg px-2 py-1">
        <Feather name="trash-2" size={16} color="#ef4444" />
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
  const typeHint = t(`product_form.options.types.${option.type}_hint`, '');

  const updateValue = (index: number, nextValue: OptionValueDraft) => {
    const nextValues = [...option.values];
    nextValues[index] = nextValue;
    onChange({ ...option, values: nextValues });
  };

  return (
    <View className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
      <Pressable
        onPress={() => setOpen((value) => !value)}
        className="gap-3 bg-gray-50 px-3 py-3 dark:bg-slate-800 sm:px-4">
        <View className="flex-row items-center gap-2">
          <Feather name="move" size={16} color="#9ca3af" />
          <TextInput
            value={option.name}
            onChangeText={(name) => onChange({ ...option, name })}
            placeholder={t('product_form.options.option_name_placeholder', 'Option name (e.g. Color)')}
            placeholderTextColor="#9ca3af"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm font-bold text-gray-900 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
          />
          <Pressable onPress={onRemove} className="h-9 w-9 items-center justify-center rounded-lg">
            <Feather name="trash-2" size={16} color="#ef4444" />
          </Pressable>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
        </View>
        <OptionTypeSelect
          value={option.type}
          onChange={(type) => onChange({ ...option, type, values: type === option.type ? option.values : [] })}
        />
        <Pressable
          onPress={() => onChange({ ...option, is_required: !option.is_required })}
          className="flex-row items-center gap-2 self-start">
          <View
            className={`h-4 w-4 items-center justify-center rounded border ${
              option.is_required ? 'border-green-600 bg-green-600' : 'border-gray-300 bg-white'
            }`}>
            {option.is_required && <Feather name="check" size={11} color="#ffffff" />}
          </View>
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
            {t('product_form.options.required', 'Required')}
          </Text>
        </Pressable>
      </Pressable>

      {open && (
        <View className="gap-3 bg-white px-4 py-3 dark:bg-slate-900">
          {typeHint ? (
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{typeHint}</Text>
          ) : null}
          {option.type !== 'input' ? (
            <View className="gap-2">
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
                className="mt-1 flex-row items-center gap-2 self-start rounded-lg px-2.5 py-2">
                <Feather name="plus" size={16} color="#16a34a" />
                <Text className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">
                  {t('product_form.options.add_value', 'Add value')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text className="font-sans text-sm italic text-gray-500 dark:text-slate-400">
              {t('product_form.options.no_predefined_values', 'No predefined values - the buyer will type their own.')}
            </Text>
          )}
        </View>
      )}
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
      return t('product_form.save_steps_first', 'Save the product in Steps 1-4 first.');
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
          return t('product_form.options.error_value_label', 'All values in option "{{name}}" need a label.', {
            name: option.name,
          });
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
          name: option.name,
          type: option.type,
          position: index + 1,
          is_required: option.is_required,
          values: option.values.map((value, valueIndex) => ({
            label: value.label,
            value: slugify(value.value || value.label),
            meta: Object.keys(value.meta).length > 0 ? value.meta : null,
            position: valueIndex + 1,
          })),
        })),
      });
      setSuccess(t('product_form.options.saved', 'Options saved! Now generate your variants below.'));
      onSaved?.();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t('product_form.options.save_failed', 'Failed to save options.'),
      );
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
          <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">
            {t('product_form.options.title', 'Product Options')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('product_form.options.subtitle', 'Define the choices buyers can select (e.g. Color, Size).')}
          </Text>
        </View>
        <Pressable
          onPress={() => setOptions((prev) => [...prev, emptyOption()])}
          className="flex-row items-center justify-center gap-2 self-start rounded-lg bg-green-600 px-3 py-2 sm:self-auto">
          <Feather name="plus" size={16} color="#ffffff" />
          <Text className="font-sans text-sm font-bold text-white">
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
        <View className="flex-row gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-700 dark:bg-red-900/20">
          <Feather name="alert-circle" size={16} color="#dc2626" />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View className="flex-row gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-700 dark:bg-green-900/20">
          <Feather name="check-circle" size={16} color="#16a34a" />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-700 dark:text-green-400">{success}</Text>
        </View>
      ) : null}

      {options.length > 0 && (
        <Pressable
          disabled={saving}
          onPress={saveOptions}
          className="h-10 items-center justify-center rounded-lg bg-green-600 px-4 disabled:opacity-50">
          <Text className="font-sans text-sm font-bold text-white">
            {saving
              ? t('product_form.buttons.saving', 'Saving...')
              : t('product_form.options.save_options', 'Save Options')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
