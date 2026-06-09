import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTranslation } from '@/i18n';
import {
  deleteSellerProductVariant,
  fetchSellerProductVariants,
  generateSellerProductVariants,
  toggleSellerProductVariant,
  updateSellerProductVariant,
  type SellerManagedVariant,
} from '@/utils/native-api';

type VariantEditRow = {
  price: string;
  quantity: string;
  quantity_unit: string;
  moq: string;
  sku: string;
  is_active: boolean;
};

function VariantBadges({ variant }: { variant: SellerManagedVariant }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {variant.optionValues.map((optionValue) => (
        <View
          key={String(optionValue.valueId)}
          className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2 py-1 dark:bg-slate-700">
          {optionValue.optionType === 'color' && optionValue.meta?.hex ? (
            <View
              className="h-3 w-3 rounded-full border border-gray-300 dark:border-slate-500"
              style={{ backgroundColor: optionValue.meta.hex }}
            />
          ) : null}
          <Text className="font-sans text-xs text-gray-700 dark:text-slate-300">{optionValue.label}</Text>
        </View>
      ))}
    </View>
  );
}

function EditableField({
  label,
  value,
  onChange,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View>
      <Text className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor="#94a3b8"
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
    </View>
  );
}

function VariantCard({
  variant,
  row,
  saving,
  error,
  onChange,
  onSave,
  onToggle,
  onDelete,
}: {
  variant: SellerManagedVariant;
  row: VariantEditRow;
  saving: boolean;
  error: string;
  onChange: (field: keyof VariantEditRow, value: string | boolean) => void;
  onSave: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useAppTranslation();

  return (
    <View
      className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${
        !row.is_active ? 'opacity-70' : ''
      }`}>
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <VariantBadges variant={variant} />
        <Pressable
          onPress={onToggle}
          className={`rounded-full px-3 py-1 ${
            row.is_active ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
          }`}>
          <Text
            className={`font-sans text-xs font-semibold ${
              row.is_active ? 'text-white' : 'text-gray-700 dark:text-slate-300'
            }`}>
            {row.is_active
              ? t('product_form.variants.active', 'Active')
              : t('product_form.variants.inactive', 'Inactive')}
          </Text>
        </Pressable>
      </View>

      <View className="mt-4 gap-3">
        <EditableField
          label={t('product_form.variants.col_price', 'Price')}
          value={row.price}
          onChange={(value) => onChange('price', value)}
          keyboardType="numeric"
        />
        <EditableField
          label={t('product_form.variants.col_qty', 'Qty')}
          value={row.quantity}
          onChange={(value) => onChange('quantity', value)}
          keyboardType="numeric"
        />
        <EditableField
          label={t('product_form.variants.col_unit', 'Unit')}
          value={row.quantity_unit}
          onChange={(value) => onChange('quantity_unit', value)}
        />
        <EditableField
          label={t('product_form.variants.col_moq', 'MOQ')}
          value={row.moq}
          onChange={(value) => onChange('moq', value)}
          keyboardType="numeric"
        />
        <EditableField
          label={t('product_form.variants.col_sku', 'SKU')}
          value={row.sku}
          onChange={(value) => onChange('sku', value)}
        />
      </View>

      {error ? <Text className="mt-2 font-sans text-xs text-red-500">{error}</Text> : null}

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Pressable
          disabled={saving}
          onPress={onSave}
          className="flex-row items-center gap-2 rounded-lg bg-green-600 px-3 py-2 disabled:opacity-50">
          {saving ? <ActivityIndicator color="#ffffff" size="small" /> : <Feather name="check-circle" size={16} color="#ffffff" />}
          <Text className="font-sans text-sm font-semibold text-white">
            {t('product_form.actions.save', 'Save')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="rounded-lg px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20">
          <Text className="font-sans text-sm font-semibold text-red-600 dark:text-red-400">
            {t('product_form.actions.delete', 'Delete')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function VariantTableNative({
  productId,
  onUpdated,
}: {
  productId?: string | number | null;
  onUpdated?: () => void;
}) {
  const { t } = useAppTranslation();
  const [variants, setVariants] = useState<SellerManagedVariant[]>([]);
  const [edits, setEdits] = useState<Record<string, VariantEditRow>>({});
  const [loading, setLoading] = useState(Boolean(productId));
  const [generating, setGenerating] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);
  const [genDefaults, setGenDefaults] = useState({ price: '', quantity: '0', moq: '' });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const fmt = (value: unknown) => (value == null ? '' : String(value));

  const buildEditRow = useCallback(
    (variant: SellerManagedVariant): VariantEditRow => ({
      price: fmt(variant.price),
      quantity: fmt(variant.quantity),
      quantity_unit: variant.quantityUnit ?? '',
      moq: fmt(variant.moq),
      sku: variant.sku ?? '',
      is_active: variant.isActive,
    }),
    []
  );

  const loadVariants = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setGlobalError('');
    try {
      const nextVariants = await fetchSellerProductVariants(productId);
      setVariants(nextVariants);
      const nextEdits: Record<string, VariantEditRow> = {};
      nextVariants.forEach((variant) => {
        nextEdits[String(variant.id)] = buildEditRow(variant);
      });
      setEdits(nextEdits);
      setErrors({});
    } catch (err) {
      setVariants([]);
      setEdits({});
      setGlobalError(
        err instanceof Error ? err.message : t('product_form.variants.load_failed', 'Failed to load variants.'),
      );
    } finally {
      setLoading(false);
    }
  }, [buildEditRow, productId, t]);

  useEffect(() => {
    setVariants([]);
    setEdits({});
    setErrors({});
    setSaving({});
    setGlobalError('');
    setShowGenForm(false);
  }, [productId]);

  useEffect(() => {
    void loadVariants();
  }, [loadVariants]);

  const updateEdit = (variantId: string | number, field: keyof VariantEditRow, value: string | boolean) => {
    const key = String(variantId);
    setEdits((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value } as VariantEditRow,
    }));
  };

  const saveVariant = async (variant: SellerManagedVariant) => {
    if (!productId) return;
    const key = String(variant.id);
    const row = edits[key];
    if (!row) return;

    const price = parseFloat(row.price);
    const quantity = parseFloat(row.quantity);
    if (row.price === '' || Number.isNaN(price)) {
      setErrors((current) => ({
        ...current,
        [key]: t('product_form.variants.valid_price', 'Enter a valid price.'),
      }));
      return;
    }
    if (row.quantity === '' || Number.isNaN(quantity)) {
      setErrors((current) => ({
        ...current,
        [key]: t('product_form.variants.valid_quantity', 'Enter a valid quantity.'),
      }));
      return;
    }

    let moqVal: number | null = null;
    if (row.moq !== '' && row.moq != null) {
      moqVal = parseInt(row.moq, 10);
      if (Number.isNaN(moqVal)) {
        setErrors((current) => ({
          ...current,
          [key]: t('product_form.variants.valid_moq', 'MOQ must be a whole number or empty.'),
        }));
        return;
      }
    }

    setSaving((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [key]: '' }));

    try {
      await updateSellerProductVariant(productId, variant.id, {
        price,
        quantity,
        quantity_unit: row.quantity_unit || null,
        moq: moqVal,
        quantity_step: moqVal,
        sku: row.sku || null,
        is_active: row.is_active,
      });
      onUpdated?.();
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [key]: err instanceof Error ? err.message : t('product_form.variants.save_failed', 'Save failed.'),
      }));
    } finally {
      setSaving((current) => ({ ...current, [key]: false }));
    }
  };

  const toggleActive = async (variant: SellerManagedVariant) => {
    if (!productId) return;
    const key = String(variant.id);
    try {
      const nextActive = await toggleSellerProductVariant(productId, variant.id);
      updateEdit(variant.id, 'is_active', nextActive);
      setVariants((current) =>
        current.map((item) => (String(item.id) === key ? { ...item, isActive: nextActive } : item)),
      );
      onUpdated?.();
    } catch {
      setErrors((current) => ({
        ...current,
        [key]: t('product_form.variants.toggle_failed', 'Toggle failed.'),
      }));
    }
  };

  const deleteVariant = (variant: SellerManagedVariant) => {
    if (!productId) return;
    const label = variant.label || variant.optionValues.map((value) => value.label).join(' / ') || 'variant';
    Alert.alert(
      t('product_form.actions.delete', 'Delete'),
      t('product_form.variants.delete_confirm', 'Delete variant "{{label}}"?', { label }),
      [
        { text: t('product_form.actions.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('product_form.actions.delete', 'Delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const key = String(variant.id);
              try {
                await deleteSellerProductVariant(productId, variant.id);
                setVariants((current) => current.filter((item) => String(item.id) !== key));
                setEdits((current) => {
                  const next = { ...current };
                  delete next[key];
                  return next;
                });
                onUpdated?.();
              } catch (err) {
                setErrors((current) => ({
                  ...current,
                  [key]:
                    err instanceof Error
                      ? err.message
                      : t('product_form.variants.delete_failed', 'Delete failed.'),
                }));
                await loadVariants();
              }
            })();
          },
        },
      ],
    );
  };

  const generateVariants = async () => {
    if (!productId) return;
    if (!genDefaults.price.trim()) {
      setGlobalError(t('product_form.variants.default_price_required', 'Please enter a default price before generating.'));
      return;
    }

    const genPrice = parseFloat(genDefaults.price);
    const genQty = parseFloat(genDefaults.quantity || '0');
    if (Number.isNaN(genPrice)) {
      setGlobalError(t('product_form.variants.valid_default_price', 'Please enter a valid default price.'));
      return;
    }
    if (Number.isNaN(genQty) || genQty < 0) {
      setGlobalError(
        t('product_form.variants.valid_default_quantity', 'Please enter a valid default quantity (0 or more).'),
      );
      return;
    }

    let moqVal: number | null = null;
    if (genDefaults.moq.trim()) {
      moqVal = parseInt(genDefaults.moq, 10);
      if (Number.isNaN(moqVal)) moqVal = null;
    }

    setGenerating(true);
    setGlobalError('');
    try {
      await generateSellerProductVariants(productId, {
        price: genPrice,
        quantity: genQty,
        moq: moqVal,
        quantity_step: moqVal,
      });
      await loadVariants();
      setShowGenForm(false);
      onUpdated?.();
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : t('product_form.variants.generation_failed', 'Generation failed.'),
      );
    } finally {
      setGenerating(false);
    }
  };

  const totalLabel = useMemo(
    () =>
      variants.length > 0
        ? t('product_form.variants.total', '({{count}} total)', { count: variants.length })
        : '',
    [t, variants.length],
  );

  if (loading) {
    return (
      <View className="flex-row items-center justify-center gap-2 py-6">
        <ActivityIndicator color="#16a34a" />
        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
          {t('product_form.variants.loading', 'Loading variants...')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100">
            {t('product_form.variants.title', 'Variants')} {totalLabel}
          </Text>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t('product_form.variants.subtitle', 'Each row is one purchasable combination. Set price and stock per variant.')}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => {
              setShowGenForm((value) => !value);
              setGlobalError('');
            }}
            className="flex-row items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2">
            <Feather name="plus" color="#ffffff" size={16} />
            <Text className="font-sans text-sm font-semibold text-white">
              {variants.length > 0
                ? t('product_form.variants.generate_more', 'Generate More')
                : t('product_form.variants.generate_variants', 'Generate Variants')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void loadVariants()}
            className="h-10 w-10 items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600">
            <Feather name="refresh-cw" color="#64748b" size={16} />
          </Pressable>
        </View>
      </View>

      {showGenForm ? (
        <View className="gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-sm font-medium text-green-800 dark:text-green-300">
            {t(
              'product_form.variants.generate_hint',
              'Auto-generate all option combinations. Set defaults applied to every new variant:',
            )}
          </Text>
          <View className="gap-3 md:grid md:grid-cols-3">
            <EditableField
              label={`${t('product_form.variants.default_price', 'Default Price')} *`}
              value={genDefaults.price}
              onChange={(value) => setGenDefaults((current) => ({ ...current, price: value }))}
              keyboardType="numeric"
            />
            <EditableField
              label={t('product_form.variants.default_qty', 'Default Qty')}
              value={genDefaults.quantity}
              onChange={(value) => setGenDefaults((current) => ({ ...current, quantity: value }))}
              keyboardType="numeric"
            />
            <EditableField
              label={t('product_form.variants.default_moq', 'Default MOQ')}
              value={genDefaults.moq}
              onChange={(value) => setGenDefaults((current) => ({ ...current, moq: value }))}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-row justify-end gap-2">
            <Pressable
              onPress={() => setShowGenForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">
                {t('product_form.actions.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              disabled={generating}
              onPress={() => void generateVariants()}
              className="rounded-lg bg-green-600 px-4 py-2 disabled:opacity-50">
              <Text className="font-sans text-sm font-semibold text-white">
                {generating
                  ? t('product_form.variants.generating', 'Generating...')
                  : t('product_form.variants.generate', 'Generate')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {globalError ? (
        <View className="flex-row items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-700 dark:bg-red-900/20">
          <Feather name="alert-circle" size={16} color="#dc2626" />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-600 dark:text-red-400">{globalError}</Text>
        </View>
      ) : null}

      {variants.length === 0 ? (
        <View className="items-center rounded-xl border-2 border-dashed border-gray-200 py-10 dark:border-slate-700">
          <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">
            {t(
              'product_form.variants.empty',
              'No variants yet. Save your options first, then click "Generate Variants".',
            )}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="hidden min-w-[980px] md:flex">
              <View className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                <View className="flex-row bg-gray-50 px-4 py-3 dark:bg-slate-800">
                  {[
                    t('product_form.variants.col_variant', 'Variant'),
                    t('product_form.variants.col_price', 'Price'),
                    t('product_form.variants.col_qty', 'Qty'),
                    t('product_form.variants.col_unit', 'Unit'),
                    t('product_form.variants.col_moq', 'MOQ'),
                    t('product_form.variants.col_sku', 'SKU'),
                    t('product_form.variants.col_active', 'Active'),
                    t('product_form.variants.col_actions', 'Actions'),
                  ].map((heading, index) => (
                    <Text
                      key={heading}
                      className={`pr-3 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 ${
                        index === 0 ? 'w-56' : index === 7 ? 'w-36' : 'w-24'
                      }`}>
                      {heading}
                    </Text>
                  ))}
                </View>
                {variants.map((variant) => {
                  const key = String(variant.id);
                  const row = edits[key];
                  if (!row) return null;
                  return (
                    <View
                      key={key}
                      className={`border-t border-gray-100 px-4 py-3 dark:border-slate-700 ${
                        !row.is_active ? 'opacity-60' : ''
                      }`}>
                      <View className="flex-row items-center">
                        <View className="w-56 pr-3">
                          <VariantBadges variant={variant} />
                        </View>
                        <View className="w-24 pr-3">
                          <TextInput
                            value={row.price}
                            onChangeText={(value) => updateEdit(variant.id, 'price', value)}
                            keyboardType="numeric"
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-sans text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </View>
                        <View className="w-24 pr-3">
                          <TextInput
                            value={row.quantity}
                            onChangeText={(value) => updateEdit(variant.id, 'quantity', value)}
                            keyboardType="numeric"
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-sans text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </View>
                        <View className="w-24 pr-3">
                          <TextInput
                            value={row.quantity_unit}
                            onChangeText={(value) => updateEdit(variant.id, 'quantity_unit', value)}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-sans text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </View>
                        <View className="w-24 pr-3">
                          <TextInput
                            value={row.moq}
                            onChangeText={(value) => updateEdit(variant.id, 'moq', value)}
                            keyboardType="numeric"
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-sans text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </View>
                        <View className="w-24 pr-3">
                          <TextInput
                            value={row.sku}
                            onChangeText={(value) => updateEdit(variant.id, 'sku', value)}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-sans text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </View>
                        <View className="w-24 items-center pr-3">
                          <Pressable
                            onPress={() => void toggleActive(variant)}
                            className={`h-5 w-10 rounded-full ${row.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                            <View
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${
                                row.is_active ? 'right-0.5' : 'left-0.5'
                              }`}
                            />
                          </Pressable>
                        </View>
                        <View className="w-36 flex-row gap-2">
                          <Pressable
                            disabled={saving[key]}
                            onPress={() => void saveVariant(variant)}
                            className="rounded-lg bg-green-600 px-2 py-1.5 disabled:opacity-50">
                            <Text className="font-sans text-xs font-semibold text-white">
                              {t('product_form.actions.save', 'Save')}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => deleteVariant(variant)} className="rounded-lg px-2 py-1.5">
                            <Text className="font-sans text-xs font-semibold text-red-600 dark:text-red-400">
                              {t('product_form.actions.del', 'Del')}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      {errors[key] ? (
                        <Text className="mt-2 font-sans text-xs text-red-500">{errors[key]}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View className="gap-3 md:hidden">
            {variants.map((variant) => {
              const key = String(variant.id);
              const row = edits[key];
              if (!row) return null;
              return (
                <VariantCard
                  key={key}
                  variant={variant}
                  row={row}
                  saving={Boolean(saving[key])}
                  error={errors[key] || ''}
                  onChange={(field, value) => updateEdit(variant.id, field, value)}
                  onSave={() => void saveVariant(variant)}
                  onToggle={() => void toggleActive(variant)}
                  onDelete={() => deleteVariant(variant)}
                />
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
