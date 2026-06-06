// src/components/seller/NrcInput.jsx
// Myanmar NRC (National Registration Card) structured input.
//
// All township data is stored in src/data/nrc-townships.json
// — do not embed data here; edit the JSON file instead.
//
// NRC format: {division}/{township_code}({type}){number}
// Example EN:  8/KaPaTa(N)123456
// Example MM:  ၈/ကပတ(နိုင်)၁၂၃၄၅၆

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import nrcData from '../../data/nrc-townships.json';

// Re-export so other components (e.g. SellerVerificationManagement) can import
export const NRC_DIVISIONS = nrcData.divisions;
export const NRC_TYPES = nrcData.types;
export const NRC_TOWNSHIPS = nrcData.townships;

// ── Helpers ───────────────────────────────────────────────────────────────────
const MM_DIGITS = '၀၁၂၃၄၅၆၇၈၉';
const toMM = (str) => String(str).replace(/\d/g, (d) => MM_DIGITS[d]);

const SELECT_CLS = [
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600',
  'rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100',
  'focus:ring-2 focus:ring-green-500 focus:outline-none',
].join(' ');

const LABEL_CLS = 'block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1';

// ── Component ─────────────────────────────────────────────────────────────────
export default function NrcInput({ value = {}, onChange, error = {} }) {
  const { t, i18n } = useTranslation();
  const isMM = i18n.language?.startsWith('my');

  const townships = useMemo(
    () => NRC_TOWNSHIPS[value.nrc_division] || [],
    [value.nrc_division],
  );

  const preview = useMemo(() => {
    const { nrc_division: d, nrc_township_code: tc, nrc_township_mm: tmm, nrc_type: tp, nrc_number: num } = value;
    if (!d || !tc || !tp || !num) return null;
    const typeLabel = NRC_TYPES.find((ty) => ty.value === tp)?.mm || tp;
    return {
      en: `${d}/${tc}(${tp})${num}`,
      mm: tmm ? `${toMM(d)}/${tmm}(${typeLabel})${toMM(num)}` : null,
    };
  }, [value]);

  const handleDivision = (e) =>
    onChange({ ...value, nrc_division: e.target.value, nrc_township_code: '', nrc_township_mm: '' });

  const handleTownship = (e) => {
    const tw = townships.find((x) => x.code === e.target.value);
    onChange({ ...value, nrc_township_code: tw?.code || '', nrc_township_mm: tw?.mm || '' });
  };

  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });

  return (
    <div className="space-y-4">
      <div>
        <span className="block text-sm font-semibold text-gray-800 dark:text-slate-200">
          {t('nrc_input.title')}
          <span className="ml-1 text-xs font-normal text-gray-400 dark:text-slate-500">
            — {t('nrc_input.title_mm_script')}
          </span>
        </span>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
          {isMM ? t('nrc_input.subtitle_my') : t('nrc_input.subtitle_en')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className={LABEL_CLS}>
            {isMM ? t('nrc_input.division_mm') : t('nrc_input.division')}
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <select value={value.nrc_division || ''} onChange={handleDivision} className={SELECT_CLS}>
            <option value="">{isMM ? t('nrc_input.select_mm') : t('nrc_input.select')}</option>
            {NRC_DIVISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.value}/ — {isMM ? d.mm : d.en}
              </option>
            ))}
          </select>
          {error.nrc_division && <p className="text-xs text-red-500 mt-1">{error.nrc_division}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL_CLS}>
            {isMM ? t('nrc_input.township_code_mm') : t('nrc_input.township_code')}
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            value={value.nrc_township_code || ''}
            onChange={handleTownship}
            disabled={!value.nrc_division}
            className={SELECT_CLS + (!value.nrc_division ? ' opacity-50 cursor-not-allowed' : '')}
          >
            <option value="">
              {!value.nrc_division
                ? isMM
                  ? t('nrc_input.select_division_first_mm')
                  : t('nrc_input.select_division_first')
                : isMM
                  ? t('nrc_input.select_township_code_mm')
                  : t('nrc_input.select_township_code')}
            </option>
            {townships.map((tw) => (
              <option key={tw.code} value={tw.code}>
                {tw.code} / {tw.mm} — {tw.township}
              </option>
            ))}
          </select>
          {error.nrc_township_code && <p className="text-xs text-red-500 mt-1">{error.nrc_township_code}</p>}
        </div>

        <div>
          <label className={LABEL_CLS}>
            {isMM ? t('nrc_input.id_type_mm') : t('nrc_input.id_type')}
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            value={value.nrc_type || ''}
            onChange={set('nrc_type')}
            disabled={!value.nrc_division}
            className={SELECT_CLS + (!value.nrc_division ? ' opacity-50 cursor-not-allowed' : '')}
          >
            <option value="">
              {!value.nrc_division
                ? isMM
                  ? t('nrc_input.select_division_first_mm')
                  : t('nrc_input.select_division_first')
                : isMM
                  ? t('nrc_input.select_mm')
                  : t('nrc_input.select')}
            </option>
            {NRC_TYPES.map((ty) => (
              <option key={ty.value} value={ty.value}>
                {ty.en} ({ty.mm}) — {ty.label}
              </option>
            ))}
          </select>
          {error.nrc_type && <p className="text-xs text-red-500 mt-1">{error.nrc_type}</p>}
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>
          {isMM ? t('nrc_input.serial_mm') : t('nrc_input.serial')}
          <span className="text-red-500 ml-0.5">*</span>
          <span className="ml-1 font-normal text-gray-400 dark:text-slate-500">
            ({isMM ? t('nrc_input.serial_hint_my') : t('nrc_input.serial_hint_en')})
          </span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          placeholder="123456"
          value={value.nrc_number || ''}
          onChange={(e) => onChange({ ...value, nrc_number: e.target.value.replace(/[^0-9]/g, '') })}
          className={[
            'w-full sm:w-48 px-3 py-2 text-sm border rounded-lg font-mono',
            'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100',
            'placeholder-gray-400 dark:placeholder-slate-500',
            'focus:ring-2 focus:ring-green-500 focus:outline-none',
            error.nrc_number
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-slate-600',
          ].join(' ')}
        />
        {error.nrc_number && <p className="text-xs text-red-500 mt-1">{error.nrc_number}</p>}
      </div>

      {preview && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
          <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1 uppercase tracking-wide">
            {isMM ? t('nrc_input.preview_title_mm') : t('nrc_input.preview_title')}
          </p>
          <p className="text-lg font-mono font-bold text-green-900 dark:text-green-200 tracking-widest">
            {preview.en}
          </p>
          {preview.mm && (
            <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">{preview.mm}</p>
          )}
        </div>
      )}
    </div>
  );
}
