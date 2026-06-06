// src/components/seller/WholesaleTiersEditor.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

// ── helpers ──────────────────────────────────────────────────────────────────

const calcDiscount = (base, tier) => {
  const b = parseFloat(base);
  const t = parseFloat(tier);
  if (!b || b <= 0 || !t) return 0;
  return Math.max(0, ((1 - t / b) * 100)).toFixed(1);
};

const fmtMMK = (v) =>
  v ? Number(v).toLocaleString('my-MM') + ' Ks' : '—';

const EMPTY_TIER = { min_qty: '', price_per_unit: '', label: '', is_active: true };

// ── component ─────────────────────────────────────────────────────────────────

const WholesaleTiersEditor = ({
  productId,
  basePrice = 0,
  moq = 1,
  quantityUnit = 'piece',
  onSaved,
}) => {
  const { t } = useTranslation();
  const [tiers, setTiers]         = useState([]);     // draft rows
  const [saved, setSaved]         = useState([]);     // last-saved snapshot (for dirty check)
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(false);

  // ── fetch existing tiers when productId is available ─────────────────────
  const fetchTiers = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.get(`/seller/products/${productId}/wholesale-tiers`);
      const data = (r.data?.data ?? []).filter(t => t.variant_id == null);
      setTiers(data.length ? data : []);
      setSaved(JSON.stringify(data));
    } catch {
      setError('Could not load existing tiers.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  // ── local row mutations ───────────────────────────────────────────────────

  const addRow = () => {
    setTiers(prev => [...prev, { ...EMPTY_TIER, _id: Date.now() }]);
  };

  const removeRow = (idx) => {
    setTiers(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    setTiers(prev => prev.map((row, i) =>
      i === idx ? { ...row, [field]: value } : row
    ));
  };

  // ── validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const errs = [];
    const qtys = new Set();

    tiers.forEach((row, i) => {
      const qty   = parseInt(row.min_qty, 10);
      const price = parseFloat(row.price_per_unit);
      const rowN  = i + 1;

      if (!qty || qty < 1)         errs.push(`Row ${rowN}: Min quantity must be ≥ 1.`);
      else if (qty < moq)          errs.push(`Row ${rowN}: Min quantity must be ≥ MOQ (${moq}).`);
      else if (qtys.has(qty))      errs.push(`Row ${rowN}: Duplicate min quantity ${qty}.`);
      else                         qtys.add(qty);

      if (isNaN(price) || price < 0)  errs.push(`Row ${rowN}: Price per unit must be a positive number.`);
      if (price > basePrice && basePrice > 0) errs.push(`Row ${rowN}: Tier price should be less than or equal to base price (${fmtMMK(basePrice)}).`);
    });

    return errs;
  };

  // ── save (sync) ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    const errs = validate();
    if (errs.length) { setError(errs.join(' ')); return; }

    setSaving(true);
    try {
      const payload = {
        variant_id: null,
        tiers: tiers.map((row, idx) => ({
          min_qty:        parseInt(row.min_qty, 10),
          price_per_unit: parseFloat(row.price_per_unit),
          label:          row.label?.trim() || null,
          sort_order:     idx,
          is_active:      row.is_active !== false,
        })),
      };

      const r = await api.post(`/seller/products/${productId}/wholesale-tiers/sync`, payload);
      const fresh = r.data?.data ?? [];
      setTiers(fresh);
      setSaved(JSON.stringify(fresh));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSaved?.(fresh);
    } catch (e) {
      const msg = e.response?.data?.message;
      setError(msg || 'Failed to save tiers. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(tiers) !== saved;

  // ── render ────────────────────────────────────────────────────────────────

  if (!productId) {
    return (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-700 p-5 text-sm text-gray-400 dark:text-slate-500 text-center">
        <TagIcon className="h-5 w-5 mx-auto mb-1.5 opacity-50" />
        {t("product_form.wholesale_tiers.save_first", "Save the product first (Steps 1–4) to unlock wholesale tier pricing.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {t("product_form.wholesale_tiers.title", "Volume Pricing Tiers")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {t("product_form.wholesale_tiers.subtitle", "Buyers automatically get the best matching price based on quantity ordered. Base price ({{price}}) applies when no tier is met.", { price: fmtMMK(basePrice) })}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchTiers}
            disabled={loading || saving}
            title={t("product_form.wholesale_tiers.reload", "Reload")}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition disabled:opacity-40"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={addRow}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                       bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400
                       border border-green-200 dark:border-green-800
                       hover:bg-green-100 dark:hover:bg-green-900/50 transition disabled:opacity-40"
          >
          <PlusIcon className="h-3.5 w-3.5" />
          {t("product_form.wholesale_tiers.add_tier", "Add Tier")}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-sm text-gray-400 dark:text-slate-500"
             dangerouslySetInnerHTML={{ __html: t("product_form.wholesale_tiers.empty", "No tiers yet. Click <strong>Add Tier</strong> to define volume discounts.") }} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("product_form.wholesale_tiers.col_min_qty", "Min. Qty ({{unit}})", { unit: quantityUnit })}
                </th>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("product_form.wholesale_tiers.col_price_per_unit", "Price / {{unit}} (Ks)", { unit: quantityUnit })}
                </th>
                <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">
                  {t("product_form.wholesale_tiers.col_discount", "Discount")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">
                  {t("product_form.wholesale_tiers.col_label", "Label")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">
                  {t("product_form.wholesale_tiers.col_active", "Active")}
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {tiers.map((row, idx) => {
                const discount = calcDiscount(basePrice, row.price_per_unit);
                return (
                  <tr key={row.id ?? row._id ?? idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition">
                    {/* Min qty */}
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={moq}
                        step={1}
                        value={row.min_qty}
                        onChange={e => updateRow(idx, 'min_qty', e.target.value)}
                        placeholder={moq}
                        className="w-24 px-2 py-1.5 border border-gray-200 dark:border-slate-600
                                   bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                                   rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </td>

                    {/* Price per unit */}
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.price_per_unit}
                        onChange={e => updateRow(idx, 'price_per_unit', e.target.value)}
                        placeholder="0"
                        className="w-32 px-2 py-1.5 border border-gray-200 dark:border-slate-600
                                   bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                                   rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </td>

                    {/* Discount badge (live, read-only) */}
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      {discount > 0
                        ? <span className="inline-block text-xs font-semibold text-red-600 dark:text-red-400">-{discount}%</span>
                        : <span className="text-gray-300 dark:text-slate-600">—</span>}
                    </td>

                    {/* Label */}
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <input
                        type="text"
                        maxLength={60}
                        value={row.label ?? ''}
                        onChange={e => updateRow(idx, 'label', e.target.value)}
                        placeholder={t("product_form.wholesale_tiers.label_placeholder", "e.g. Wholesale")}
                        className="w-32 px-2 py-1.5 border border-gray-200 dark:border-slate-600
                                   bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400
                                   rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <input
                        type="checkbox"
                        checked={row.is_active !== false}
                        onChange={e => updateRow(idx, 'is_active', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </td>

                    {/* Remove */}
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition"
                        title={t("product_form.wholesale_tiers.remove_tier", "Remove tier")}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Save bar */}
      {(tiers.length > 0 || isDirty) && (
        <div className="flex items-center justify-between gap-3 pt-1">
          {success && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckIcon className="h-4 w-4" />
              {t("product_form.wholesale_tiers.tiers_saved", "Tiers saved!")}
            </span>
          )}
          {!success && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {isDirty
                ? t("product_form.wholesale_tiers.unsaved_changes", "Unsaved changes")
                : t("product_form.wholesale_tiers.tiers_saved_count", "{{n}} tier{{s}} saved", { n: tiers.length, s: tiers.length !== 1 ? 's' : '' })}
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg
                       bg-green-600 hover:bg-green-700 disabled:bg-gray-200 dark:disabled:bg-slate-700
                       text-white disabled:text-gray-400 dark:disabled:text-slate-500
                       transition disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                {t("product_form.wholesale_tiers.saving", "Saving…")}
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                {t("product_form.wholesale_tiers.save_tiers", "Save Tiers")}
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick example hint */}
      {tiers.length === 0 && !loading && productId && (
        <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
          {t("product_form.wholesale_tiers.example", "Example: 1 {{unit}} → {{base}} (base) · 5 {{unit}} → 10% off · 20 {{unit}} → 20% off", { unit: quantityUnit, base: fmtMMK(basePrice) })}
        </p>
      )}
    </div>
  );
};

export default WholesaleTiersEditor;