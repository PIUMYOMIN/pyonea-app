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

import { useAppTranslation } from '@/i18n';
import { useTheme } from '@/context/theme';
import {
  createAdminCommissionRule,
  fetchAdminBusinessTypes,
  fetchAdminCommissionCategories,
  fetchAdminCommissionRules,
  updateAdminCommissionRule,
  type AdminBusinessType,
  type AdminCommissionCategory,
  type AdminCommissionRule,
  type AdminCommissionRuleType,
} from '@/utils/native-api';

const TIER_LABELS: Record<string, string> = {
  '1': '🥉 Bronze',
  '2': '🥈 Silver',
  '3': '🥇 Gold',
};

const TYPE_META: Record<
  AdminCommissionRuleType,
  { label: string; wrap: string; text: string; heading: string; emptyHint?: string }
> = {
  default: {
    label: 'Platform Default',
    wrap: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
    heading: 'Platform Default',
  },
  account_level: {
    label: 'Seller Tier',
    wrap: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    heading: 'Seller Tiers',
  },
  category: {
    label: 'Category',
    wrap: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    heading: 'Categories',
    emptyHint:
      ' Category and business type rules let you override the default rate for specific segments.',
  },
  business_type: {
    label: 'Business Type',
    wrap: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    heading: 'Business Types',
    emptyHint:
      ' Category and business type rules let you override the default rate for specific segments.',
  },
};

const GROUP_ORDER: AdminCommissionRuleType[] = ['default', 'account_level', 'category', 'business_type'];

type SelectOption = { value: string; label: string };

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-400">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-2 dark:border-slate-600 dark:bg-slate-700">
        <Text
          className={`min-w-0 flex-1 font-sans text-sm ${
            selected ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'
          }`}
          numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={isDark ? '#cbd5e1' : '#6b7280'} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[520px] md:rounded-2xl">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{label}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="x" size={18} color={isDark ? '#cbd5e1' : '#94a3b8'} />
              </Pressable>
            </View>
            <ScrollView className="max-h-80">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`mb-2 rounded-xl border px-4 py-3 ${
                      active
                        ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                        : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                    }`}>
                    <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">{option.label}</Text>
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

function ActiveToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      className={`h-5 w-9 justify-center rounded-full border-2 border-transparent ${
        active ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-600'
      }`}>
      <View
        className={`h-4 w-4 rounded-full bg-white shadow ${active ? 'ml-[18px]' : 'ml-0.5'}`}
      />
    </Pressable>
  );
}

function RateCell({
  rule,
  onSave,
}: {
  rule: AdminCommissionRule;
  onSave: (id: string, updates: { rate: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState((Number(rule.rate) * 100).toFixed(2));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setValue((Number(rule.rate) * 100).toFixed(2));
  }, [rule.rate, editing]);

  const save = async () => {
    const rate = parseFloat(value) / 100;
    if (Number.isNaN(rate) || rate < 0 || rate > 1) return;
    setSaving(true);
    try {
      await onSave(rule.id, { rate: rate.toFixed(4) });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <View className="flex-row items-center gap-1">
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          autoFocus
          editable={!saving}
          className="w-20 rounded-lg border border-gray-200 bg-white px-2.5 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">%</Text>
        <Pressable disabled={saving} onPress={() => void save()} className="p-0.5">
          {saving ? (
            <ActivityIndicator size="small" color="#16a34a" />
          ) : (
            <Feather name="check-circle" size={20} color="#16a34a" />
          )}
        </Pressable>
        <Pressable disabled={saving} onPress={() => setEditing(false)} className="p-0.5">
          <Feather name="x-circle" size={20} color="#94a3b8" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable onPress={() => setEditing(true)} className="flex-row items-center gap-1.5">
      <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
        {(Number(rule.rate) * 100).toFixed(1)}%
      </Text>
      <Feather name="edit-2" size={14} color="#cbd5e1" />
    </Pressable>
  );
}

function NewRuleForm({
  categories,
  businessTypes,
  onCreated,
  onCancel,
}: {
  categories: AdminCommissionCategory[];
  businessTypes: AdminBusinessType[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { t } = useAppTranslation();
  const [type, setType] = useState<Exclude<AdminCommissionRuleType, 'default'>>('category');
  const [referenceId, setReferenceId] = useState('');
  const [rate, setRate] = useState('5.0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const typeOptions: SelectOption[] = [
    { value: 'category', label: t('admin.commissionRules.form.types.category', 'Category') },
    { value: 'business_type', label: t('admin.commissionRules.form.types.businessType', 'Business Type') },
    { value: 'account_level', label: t('admin.commissionRules.form.types.accountLevel', 'Seller Tier') },
  ];

  const referenceOptions = useMemo(() => {
    if (type === 'account_level') {
      return Object.entries(TIER_LABELS).map(([id, label]) => ({ value: id, label }));
    }
    if (type === 'category') {
      return categories.map((category) => ({ value: category.id, label: category.name }));
    }
    return businessTypes.map((businessType) => ({ value: businessType.id, label: businessType.name }));
  }, [type, categories, businessTypes]);

  const submit = async () => {
    if (!rate || Number.isNaN(parseFloat(rate))) {
      setError(t('admin.commissionRules.errors.invalidRate', 'Enter a valid rate.'));
      return;
    }
    if (!referenceId) {
      setError(t('admin.commissionRules.errors.selectReference', 'Select a reference.'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createAdminCommissionRule({
        type,
        reference_id: referenceId,
        rate: (parseFloat(rate) / 100).toFixed(4),
        notes: notes.trim() || null,
        is_active: true,
      });
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.commissionRules.errors.create', 'Failed to create rule.'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <Text className="font-sans text-sm font-semibold text-blue-900 dark:text-blue-200">
        {t('admin.commissionRules.form.title', 'New Commission Rule')}
      </Text>
      {error ? <Text className="font-sans text-xs text-red-600 dark:text-red-400">{error}</Text> : null}

      <View className="flex-row flex-wrap gap-3">
        <SelectField
          label={t('admin.commissionRules.form.type', 'Type')}
          value={type}
          options={typeOptions}
          placeholder={t('admin.commissionRules.form.selectType', 'Select type…')}
          onChange={(value) => {
            setType(value as Exclude<AdminCommissionRuleType, 'default'>);
            setReferenceId('');
          }}
        />
        <SelectField
          label={t('admin.commissionRules.form.reference', 'Reference')}
          value={referenceId}
          options={referenceOptions}
          placeholder={t('admin.commissionRules.form.selectReference', 'Select…')}
          onChange={setReferenceId}
        />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-400">
            {t('admin.commissionRules.form.rate', 'Rate (%)')}
          </Text>
          <TextInput
            value={rate}
            onChangeText={setRate}
            keyboardType="numeric"
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-400">
            {t('admin.commissionRules.form.notes', 'Notes')}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('admin.commissionRules.form.notesOptional', 'Optional')}
            placeholderTextColor="#94a3b8"
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </View>
      </View>

      <View className="flex-row gap-2 pt-1">
        <Pressable
          disabled={saving}
          onPress={() => void submit()}
          className={`rounded-lg px-4 py-1.5 ${saving ? 'bg-blue-600/50' : 'bg-blue-600'}`}>
          <Text className="font-sans text-sm font-medium text-white">
            {saving
              ? t('admin.commissionRules.form.saving', 'Saving…')
              : t('admin.commissionRules.form.create', 'Create Rule')}
          </Text>
        </Pressable>
        <Pressable
          disabled={saving}
          onPress={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-1.5 dark:border-slate-600">
          <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">
            {t('admin.commissionRules.cancel', 'Cancel')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CommissionRulesManagementNative() {
  const { t } = useAppTranslation();
  const [rules, setRules] = useState<AdminCommissionRule[]>([]);
  const [categories, setCategories] = useState<AdminCommissionCategory[]>([]);
  const [businessTypes, setBusinessTypes] = useState<AdminBusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextRules, nextCategories, nextBusinessTypes] = await Promise.all([
        fetchAdminCommissionRules(),
        fetchAdminCommissionCategories(),
        fetchAdminBusinessTypes(),
      ]);
      setRules(nextRules);
      setCategories(nextCategories);
      setBusinessTypes(nextBusinessTypes);
    } catch {
      setError(t('admin.commissionRules.errors.load', 'Failed to load commission rules.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (id: string, updates: { rate: string }) => {
    await updateAdminCommissionRule(id, updates);
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, rate: Number(updates.rate) } : rule,
      ),
    );
    setMessage(t('admin.commissionRules.messages.rateUpdated', 'Rate updated.'));
  };

  const handleToggle = async (rule: AdminCommissionRule) => {
    const next = !rule.isActive;
    try {
      await updateAdminCommissionRule(rule.id, { is_active: next });
      setRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, isActive: next } : item)));
      setMessage(
        next
          ? t('admin.commissionRules.messages.activated', 'Rule activated.')
          : t('admin.commissionRules.messages.deactivated', 'Rule deactivated.'),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.commissionRules.errors.update', 'Failed to update rule.'),
      );
    }
  };

  const refLabel = useCallback(
    (rule: AdminCommissionRule) => {
      if (rule.type === 'default') return t('admin.commissionRules.reference.platformWide', 'Platform-wide');
      if (rule.type === 'account_level') {
        return TIER_LABELS[String(rule.referenceId)] || `Tier ${rule.referenceId}`;
      }
      if (rule.referenceLabel) return rule.referenceLabel;
      if (rule.type === 'category') {
        return categories.find((category) => category.id === String(rule.referenceId))?.name || `#${rule.referenceId}`;
      }
      if (rule.type === 'business_type') {
        return businessTypes.find((businessType) => businessType.id === String(rule.referenceId))?.name || `#${rule.referenceId}`;
      }
      return `#${rule.referenceId}`;
    },
    [categories, businessTypes, t],
  );

  const grouped = useMemo(
    () => ({
      default: rules.filter((rule) => rule.type === 'default'),
      account_level: rules.filter((rule) => rule.type === 'account_level'),
      category: rules.filter((rule) => rule.type === 'category'),
      business_type: rules.filter((rule) => rule.type === 'business_type'),
    }),
    [rules],
  );

  if (loading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Feather name="dollar-sign" size={20} color="#16a34a" />
            <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
              {t('admin.commissionRules.title', 'Commission Rules')}
            </Text>
          </View>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t(
              'admin.commissionRules.subtitle',
              'Priority: Seller Tier → Business Type → Category → Platform Default',
            )}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowForm((value) => !value)}
          className="flex-row items-center gap-2 rounded-xl bg-green-600 px-4 py-2">
          <Feather name="plus" size={16} color="#fff" />
          <Text className="font-sans text-sm font-medium text-white">
            {t('admin.commissionRules.newRule', 'New Rule')}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Pressable
          onPress={() => setError('')}
          className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" size={16} color="#dc2626" />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Pressable onPress={() => void load()}>
            <Text className="font-sans text-xs font-semibold text-red-700 underline dark:text-red-300">
              {t('admin.orderManagement.retry', 'Retry')}
            </Text>
          </Pressable>
        </Pressable>
      ) : null}

      {message ? (
        <Pressable
          onPress={() => setMessage('')}
          className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" size={16} color="#15803d" />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-800 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      {showForm ? (
        <NewRuleForm
          categories={categories}
          businessTypes={businessTypes}
          onCreated={() => {
            setShowForm(false);
            void load();
            setMessage(t('admin.commissionRules.messages.created', 'Rule created.'));
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
        <Text className="font-sans text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          <Text className="font-bold">{t('admin.commissionRules.priority.title', 'How priority works:')}</Text>{' '}
          {t(
            'admin.commissionRules.priority.body',
            'For each order, the platform checks rules in order. The first match wins: Tier → Business Type → Category → Default. A Gold seller always pays the Gold rate regardless of what category they sell in. Click any rate to edit it inline. Toggle the switch to activate/deactivate a rule.',
          )}
        </Text>
      </View>

      {GROUP_ORDER.map((type) => {
        const group = grouped[type];
        const meta = TYPE_META[type];

        return (
          <View key={type}>
            <View className="mb-2 flex-row items-center gap-2">
              <View className={`rounded-full px-2 py-0.5 ${meta.wrap}`}>
                <Text className={`font-sans text-xs font-semibold ${meta.text}`}>{meta.label}</Text>
              </View>
              <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                {t('admin.commissionRules.ruleCount', '{{count}} rule{{suffix}}', {
                  count: group.length,
                  suffix: group.length !== 1 ? 's' : '',
                })}
              </Text>
            </View>

            <View className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
              {group.length === 0 ? (
                <Text className="px-5 py-4 font-sans text-xs text-gray-400 dark:text-slate-500">
                  {t('admin.commissionRules.emptyGroup', 'No {{heading}} rules yet.', {
                    heading: meta.heading.toLowerCase(),
                  })}
                  {type !== 'default' ? meta.emptyHint : ''}
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
                  <View className="w-full min-w-[720px]">
                    <View className="flex-row bg-gray-50 px-5 py-2.5 dark:bg-slate-900/50">
                      {[
                        { key: 'reference', label: t('admin.commissionRules.columns.reference', 'Reference'), width: 'w-[220px]' },
                        { key: 'rate', label: t('admin.commissionRules.columns.rate', 'Rate'), width: 'w-[140px]' },
                        { key: 'notes', label: t('admin.commissionRules.columns.notes', 'Notes'), width: 'w-[220px]' },
                        { key: 'active', label: t('admin.commissionRules.columns.active', 'Active'), width: 'w-[90px]' },
                      ].map((column) => (
                        <View key={column.key} className={`${column.width} px-0`}>
                          <Text className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                            {column.label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {group.map((rule) => (
                      <View
                        key={rule.id}
                        className={`flex-row border-t border-gray-50 px-5 py-3 dark:border-slate-700/50 ${
                          !rule.isActive ? 'opacity-50' : ''
                        }`}>
                        <View className="w-[220px] justify-center pr-3">
                          <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                            {refLabel(rule)}
                          </Text>
                        </View>
                        <View className="w-[140px] justify-center pr-3">
                          <RateCell rule={rule} onSave={handleSave} />
                        </View>
                        <View className="w-[220px] justify-center pr-3">
                          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                            {rule.notes || '—'}
                          </Text>
                        </View>
                        <View className="w-[90px] items-end justify-center">
                          <ActiveToggle active={rule.isActive} onToggle={() => void handleToggle(rule)} />
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
