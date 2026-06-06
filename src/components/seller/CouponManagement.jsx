// src/components/seller/CouponManagement.jsx
//
// Sellers create coupon codes that BUYERS enter at checkout.
// Each coupon belongs to one seller and applies only to their products.
//
// Different from DiscountManagement, which applies price reductions
// directly to product listings without any buyer code entry.

import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XCircleIcon,
  TicketIcon,
  CalendarIcon,
  TagIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const formatMMK  = (n) =>
  n != null ? new Intl.NumberFormat("en-MM").format(n) + " MMK" : "—";

const EMPTY_FORM = {
  name:                   "",
  code:                   "",
  type:                   "percentage",
  value:                  "",
  min_order_amount:       "",
  // null = all seller products; array = specific products only
  applicable_product_ids: null,
  max_uses:               "",
  max_uses_per_user:      "",
  is_one_time_use:        false,
  is_active:              true,
  starts_at:              "",
  expires_at:             "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const CouponManagement = () => {
  const [coupons, setCoupons]           = useState([]);
  const { i18n } = useTranslation();
  const loc = (en, mm) => i18n.language === 'my' ? (mm || en) : (en || mm);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [products, setProducts]         = useState([]);
  const [submitting, setSubmitting]     = useState(false);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [copiedCode, setCopiedCode]     = useState(null);
  // null means "all products"; true means we're in the specific-products mode
  const [restrictToProducts, setRestrictToProducts] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/seller/coupons");
      setCoupons(res.data.data?.data ?? res.data.data ?? []);
    } catch {
      setError("Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get("/seller/products");
      setProducts(res.data.data ?? []);
    } catch {
      console.error("Failed to fetch products");
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, [fetchCoupons, fetchProducts]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingCoupon(null);
    setRestrictToProducts(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleProductSelection = (productId) => {
    setFormData((prev) => {
      const ids = prev.applicable_product_ids ?? [];
      return {
        ...prev,
        applicable_product_ids: ids.includes(productId)
          ? ids.filter((x) => x !== productId)
          : [...ids, productId],
      };
    });
  };

  const handleRestrictToggle = (e) => {
    const restrict = e.target.checked;
    setRestrictToProducts(restrict);
    setFormData((prev) => ({
      ...prev,
      applicable_product_ids: restrict ? [] : null,
    }));
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    const hasRestriction = Array.isArray(coupon.applicable_product_ids) &&
                           coupon.applicable_product_ids.length > 0;
    setRestrictToProducts(hasRestriction);
    setFormData({
      name:                   coupon.name,
      code:                   coupon.code ?? "",
      type:                   coupon.type,
      value:                  coupon.value ?? "",
      min_order_amount:       coupon.min_order_amount ?? "",
      applicable_product_ids: coupon.applicable_product_ids ?? null,
      max_uses:               coupon.max_uses ?? "",
      max_uses_per_user:      coupon.max_uses_per_user ?? "",
      is_one_time_use:        coupon.is_one_time_use ?? false,
      is_active:              coupon.is_active ?? true,
      starts_at:  coupon.starts_at  ? coupon.starts_at.split("T")[0].split(" ")[0]  : "",
      expires_at: coupon.expires_at ? coupon.expires_at.split("T")[0].split(" ")[0] : "",
    });
    setShowForm(true);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.value || parseFloat(formData.value) <= 0) {
      setError("Coupon value must be greater than 0");
      return;
    }
    if (formData.type === "percentage" && parseFloat(formData.value) > 100) {
      setError("Percentage cannot exceed 100");
      return;
    }
    if (restrictToProducts && (!formData.applicable_product_ids?.length)) {
      setError("Please select at least one product, or uncheck the restriction");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name:            formData.name,
        code:            formData.code || null,
        type:            formData.type,
        value:           parseFloat(formData.value),
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        // Send null to mean "all seller products"; array for specific ones
        applicable_product_ids: restrictToProducts ? formData.applicable_product_ids : null,
        max_uses:          formData.max_uses         ? parseInt(formData.max_uses, 10)         : null,
        max_uses_per_user: formData.max_uses_per_user ? parseInt(formData.max_uses_per_user, 10) : null,
        is_one_time_use:   formData.is_one_time_use,
        is_active:         formData.is_active,
        starts_at:  formData.starts_at  || null,
        expires_at: formData.expires_at || null,
      };

      const url    = editingCoupon ? `/seller/coupons/${editingCoupon.id}` : "/seller/coupons";
      const method = editingCoupon ? "put" : "post";

      const res = await api[method](url, payload);
      if (res.data.success) {
        await fetchCoupons();
        resetForm();
        setShowForm(false);
      }
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to save coupon");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/seller/coupons/${deleteTarget}`);
      await fetchCoupons();
    } catch {
      setError("Failed to delete coupon");
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Toggle status (optimistic) ────────────────────────────────────────────

  const toggleStatus = async (coupon) => {
    setCoupons((prev) =>
      prev.map((c) => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)
    );
    try {
      await api.patch(`/seller/coupons/${coupon.id}/toggle-status`);
    } catch {
      setCoupons((prev) =>
        prev.map((c) => c.id === coupon.id ? { ...c, is_active: coupon.is_active } : c)
      );
      setError("Failed to update coupon status");
    }
  };

  // ── Copy code to clipboard ────────────────────────────────────────────────

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  // ── Coupon validity status ────────────────────────────────────────────────

  const couponStatus = (c) => {
    if (!c.is_active) return { label: "Inactive", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
    const now = new Date();
    if (c.starts_at && new Date(c.starts_at) > now) return { label: "Upcoming", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
    if (c.expires_at && new Date(c.expires_at) < now) return { label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
    if (c.max_uses && c.used_count >= c.max_uses) return { label: "Used up", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" };
    return { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Coupon Codes</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Create codes buyers enter at checkout — applies only to your own products.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5" />
          {showForm ? "Cancel" : "New Coupon"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex justify-between items-center text-red-700 dark:text-red-300">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError("")}><XCircleIcon className="h-5 w-5" /></button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Coupon</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
              Are you sure? Buyers who already received this code won't be able to use it.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
<div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">
            {editingCoupon ? "Edit Coupon" : "New Coupon Code"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Name + Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Coupon name *</label>
                <input
                  type="text" name="name" value={formData.name}
                  onChange={handleChange} required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="e.g. Flash Sale 30% Off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Code <span className="text-gray-400 dark:text-slate-500 font-normal">(leave blank to auto-generate)</span>
                </label>
                <input
                  type="text" name="code" value={formData.code}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  maxLength={50}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-mono uppercase bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="e.g. SUMMER30"
                />
              </div>
            </div>

            {/* Type + Value + Min order */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Discount type *</label>
                <select
                  name="type" value={formData.type}
                  onChange={handleChange} required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount (MMK)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {formData.type === "percentage" ? "Percentage (1–100) *" : "Amount (MMK) *"}
                </label>
                <input
                  type="number" name="value" value={formData.value}
                  onChange={handleChange} required
                  min="0.01" max={formData.type === "percentage" ? 100 : undefined}
                  step="0.01"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder={formData.type === "percentage" ? "30" : "5000"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Min order amount (MMK)
                </label>
                <input
                  type="number" name="min_order_amount" value={formData.min_order_amount}
                  onChange={handleChange} min="0" step="0.01"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="Leave empty for none"
                />
              </div>
            </div>

            {/* Validity dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Valid from</label>
                <input
                  type="date" name="starts_at" value={formData.starts_at}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Expires at</label>
                <input
                  type="date" name="expires_at" value={formData.expires_at}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                />
              </div>
            </div>

            {/* Usage limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max total uses</label>
                <input
                  type="number" name="max_uses" value={formData.max_uses}
                  onChange={handleChange} min="1"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max uses per customer</label>
                <input
                  type="number" name="max_uses_per_user" value={formData.max_uses_per_user}
                  onChange={handleChange} min="1"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            {/* Product restriction */}
            <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-700/50 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restrictToProducts}
                  onChange={handleRestrictToggle}
                  className="h-4 w-4 text-green-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Restrict to specific products only
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-slate-400 -mt-1">
                When unchecked, the coupon applies to all your products.
              </p>

              {restrictToProducts && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                    {formData.applicable_product_ids?.length ?? 0} product(s) selected
                  </p>
                  <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg divide-y divide-gray-100 dark:divide-slate-600 bg-white dark:bg-slate-800">
                    {products.length === 0
                      ? <p className="p-3 text-sm text-gray-500 dark:text-slate-400">No products found</p>
                      : products.map((p) => (
                        <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                          <input
                            type="checkbox"
                            checked={(formData.applicable_product_ids ?? []).includes(p.id)}
                            onChange={() => toggleProductSelection(p.id)}
                            className="h-4 w-4 text-green-600"
                          />
                          <span className="text-sm flex-1 text-gray-800 dark:text-slate-200">{loc(p.name_en, p.name_mm)}</span>
                          <span className="text-xs text-gray-400 dark:text-slate-500">{formatMMK(p.price)}</span>
                        </label>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox" name="is_one_time_use"
                  checked={formData.is_one_time_use} onChange={handleChange}
                  className="h-4 w-4 text-green-600"
                />
                One-time use per customer
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox" name="is_active"
                  checked={formData.is_active} onChange={handleChange}
                  className="h-4 w-4 text-green-600"
                />
                Active immediately
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-600">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : editingCoupon ? "Update Coupon" : "Create Coupon"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupon list */}
      {coupons.length === 0 && !showForm ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-700 py-16 flex flex-col items-center text-gray-400 dark:text-slate-500 gap-3">
          <TicketIcon className="h-14 w-14" />
          <p className="text-base font-medium text-gray-600 dark:text-slate-300">No coupon codes yet</p>
          <p className="text-sm">Create your first coupon to share with buyers</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
          >
            Create first coupon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coupons.map((c) => {
            const status = couponStatus(c);
            const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden transition-opacity ${
                  isExpired || !c.is_active ? "opacity-60" : ""
                }`}
              >
                {/* Card header */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-gray-200 dark:border-slate-700 px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-sm font-bold text-green-700 dark:text-green-400 tracking-widest bg-white dark:bg-slate-700 border border-green-200 dark:border-green-700 rounded px-2 py-0.5">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="text-gray-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === c.code
                            ? <CheckIcon className="h-4 w-4 text-green-600" />
                            : <ClipboardDocumentIcon className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-5 py-4 space-y-2">
                  {/* Value */}
                  <div className="flex items-center gap-2 text-sm">
                    {c.type === "percentage"
                      ? <TagIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      : <CurrencyDollarIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    }
                    <span className="font-semibold text-gray-800 dark:text-slate-100">
                      {c.type === "percentage" ? `${c.value}% off` : `${formatMMK(c.value)} off`}
                    </span>
                    {c.min_order_amount && (
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        · min {formatMMK(c.min_order_amount)}
                      </span>
                    )}
                  </div>

                  {/* Scope */}
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {!c.applicable_product_ids || c.applicable_product_ids.length === 0
                      ? "Applies to all your products"
                      : `Applies to ${c.applicable_product_ids.length} specific product(s)`
                    }
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {c.starts_at ? formatDate(c.starts_at) : "Now"}
                    {" → "}
                    {c.expires_at ? formatDate(c.expires_at) : "No expiry"}
                  </div>

                  {/* Usage */}
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Used: {c.used_count ?? 0}
                    {c.max_uses ? ` / ${c.max_uses}` : " / ∞"}
                    {c.max_uses_per_user && ` · ${c.max_uses_per_user}×/customer`}
                    {c.is_one_time_use && " · One-time use"}
                  </div>
                </div>

                {/* Card footer */}
                <div className="border-t border-gray-200 dark:border-slate-700 px-5 py-3 flex items-center justify-between bg-gray-50 dark:bg-slate-700/50">
                  <button
                    onClick={() => toggleStatus(c)}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                      c.is_active
                        ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500"
                    }`}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c.id)}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CouponManagement;