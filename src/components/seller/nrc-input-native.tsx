import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import nrcData from '@/data/nrc-townships.json';
import { useAppTranslation } from '@/i18n';

export type NrcInputValue = {
  nrc_division: string;
  nrc_township_code: string;
  nrc_township_mm: string;
  nrc_type: string;
  nrc_number: string;
};

export type NrcInputErrors = Partial<Record<keyof NrcInputValue, string>>;

export const NRC_DIVISIONS = nrcData.divisions;
export const NRC_TYPES = nrcData.types;
export const NRC_TOWNSHIPS = nrcData.townships as Record<
  string,
  { code: string; mm: string; township: string }[]
>;

const MM_DIGITS = '၀၁၂၃၄၅၆၇၈၉';
const toMM = (value: string) => value.replace(/\d/g, (digit) => MM_DIGITS[Number(digit)]);

function NrcPicker({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 ${
          disabled ? 'opacity-50' : ''
        }`}>
        <Text className="min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {selected?.label || value || '—'}
        </Text>
        <Feather name="chevron-down" size={16} color="#6b7280" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[420px] md:rounded-2xl">
            <Text className="mb-4 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{label}</Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-2 rounded-xl border px-4 py-3 ${
                    value === option.value
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
  );
}

export function NrcInputNative({
  value,
  onChange,
  errors = {},
  disabled = false,
}: {
  value: NrcInputValue;
  onChange: (next: NrcInputValue) => void;
  errors?: NrcInputErrors;
  disabled?: boolean;
}) {
  const { t, language } = useAppTranslation();
  const isMy = language === 'my';

  const townships = useMemo(() => NRC_TOWNSHIPS[value.nrc_division] || [], [value.nrc_division]);

  const preview = useMemo(() => {
    const { nrc_division: division, nrc_township_code: code, nrc_township_mm: townshipMm, nrc_type: type, nrc_number: number } =
      value;
    if (!division || !code || !type || !number) return null;
    const typeLabel = NRC_TYPES.find((entry) => entry.value === type)?.mm || type;
    return {
      en: `${division}/${code}(${type})${number}`,
      mm: townshipMm ? `${toMM(division)}/${townshipMm}(${typeLabel})${toMM(number)}` : null,
    };
  }, [value]);

  const divisionOptions = NRC_DIVISIONS.map((division) => ({
    value: division.value,
    label: `${division.value}/ — ${isMy ? division.mm : division.en}`,
  }));

  const townshipOptions = townships.map((township) => ({
    value: township.code,
    label: `${township.code} / ${township.mm} — ${township.township}`,
  }));

  const typeOptions = NRC_TYPES.map((type) => ({
    value: type.value,
    label: `${type.en} (${type.mm}) — ${type.label}`,
  }));

  const divisionPlaceholder = isMy ? t('nrc_input.select_mm') : t('nrc_input.select');
  const townshipPlaceholder = !value.nrc_division
    ? isMy
      ? t('nrc_input.select_division_first_mm')
      : t('nrc_input.select_division_first')
    : isMy
      ? t('nrc_input.select_township_code_mm')
      : t('nrc_input.select_township_code');

  return (
    <View className="gap-4">
      <View>
        <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-200">
          {t('nrc_input.title')}
          <Text className="font-sans text-xs font-normal text-gray-400 dark:text-slate-500">
            {' '}
            — {t('nrc_input.title_mm_script')}
          </Text>
        </Text>
        <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500">
          {isMy ? t('nrc_input.subtitle_my') : t('nrc_input.subtitle_en')}
        </Text>
      </View>

      <View className="gap-3 md:flex-row">
        <NrcPicker
          label={`${isMy ? t('nrc_input.division_mm') : t('nrc_input.division')} *`}
          value={value.nrc_division}
          disabled={disabled}
          options={[{ value: '', label: divisionPlaceholder }, ...divisionOptions]}
          onChange={(next) =>
            onChange({
              ...value,
              nrc_division: next,
              nrc_township_code: '',
              nrc_township_mm: '',
            })
          }
        />
        <NrcPicker
          label={`${isMy ? t('nrc_input.township_code_mm') : t('nrc_input.township_code')} *`}
          value={value.nrc_township_code}
          disabled={disabled || !value.nrc_division}
          options={[{ value: '', label: townshipPlaceholder }, ...townshipOptions]}
          onChange={(next) => {
            const township = townships.find((entry) => entry.code === next);
            onChange({
              ...value,
              nrc_township_code: next,
              nrc_township_mm: township?.mm || '',
            });
          }}
        />
      </View>

      <NrcPicker
        label={`${isMy ? t('nrc_input.id_type_mm') : t('nrc_input.id_type')} *`}
        value={value.nrc_type}
        disabled={disabled || !value.nrc_division}
        options={[
          {
            value: '',
            label: !value.nrc_division
              ? isMy
                ? t('nrc_input.select_division_first_mm')
                : t('nrc_input.select_division_first')
              : isMy
                ? t('nrc_input.select_mm')
                : t('nrc_input.select'),
          },
          ...typeOptions,
        ]}
        onChange={(next) => onChange({ ...value, nrc_type: next })}
      />

      <View className="gap-1">
        <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
          {isMy ? t('nrc_input.serial_mm') : t('nrc_input.serial')}
          <Text className="text-red-500"> *</Text>
          <Text className="font-normal text-gray-400 dark:text-slate-500">
            {' '}
            ({isMy ? t('nrc_input.serial_hint_my') : t('nrc_input.serial_hint_en')})
          </Text>
        </Text>
        <TextInput
          value={value.nrc_number}
          onChangeText={(next) => onChange({ ...value, nrc_number: next.replace(/[^0-9]/g, '').slice(0, 10) })}
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="123456"
          placeholderTextColor="#94a3b8"
          className={`w-full rounded-xl border bg-white px-3 py-2.5 font-mono text-sm text-gray-900 dark:bg-slate-700 dark:text-slate-100 sm:w-48 ${
            errors.nrc_number ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
          }`}
        />
        {errors.nrc_number ? (
          <Text className="font-sans text-xs text-red-500">{errors.nrc_number}</Text>
        ) : null}
      </View>

      {errors.nrc_division ? <Text className="font-sans text-xs text-red-500">{errors.nrc_division}</Text> : null}
      {errors.nrc_township_code ? (
        <Text className="font-sans text-xs text-red-500">{errors.nrc_township_code}</Text>
      ) : null}
      {errors.nrc_type ? <Text className="font-sans text-xs text-red-500">{errors.nrc_type}</Text> : null}

      {preview ? (
        <View className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
            {isMy ? t('nrc_input.preview_title_mm') : t('nrc_input.preview_title')}
          </Text>
          <Text className="mt-1 font-mono text-lg font-bold tracking-widest text-green-900 dark:text-green-200">
            {preview.en}
          </Text>
          {preview.mm ? (
            <Text className="mt-0.5 font-sans text-sm text-green-700 dark:text-green-300">{preview.mm}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function nrcValueFromSeller(seller: {
  nrcDivision?: string;
  nrcTownshipCode?: string;
  nrcTownshipMm?: string;
  nrcType?: string;
  nrcNumber?: string;
}): NrcInputValue {
  return {
    nrc_division: seller.nrcDivision || '',
    nrc_township_code: seller.nrcTownshipCode || '',
    nrc_township_mm: seller.nrcTownshipMm || '',
    nrc_type: seller.nrcType || '',
    nrc_number: seller.nrcNumber || '',
  };
}

export function isNrcInputComplete(value: NrcInputValue) {
  return Boolean(
    value.nrc_division && value.nrc_township_code && value.nrc_type && value.nrc_number.trim(),
  );
}
