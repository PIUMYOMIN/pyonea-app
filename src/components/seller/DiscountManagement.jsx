// src/components/seller/DiscountManagement.jsx
//
// Manages price reductions applied DIRECTLY to product prices.
// No code entry required from the buyer — the discounted price
// shows on the product listing automatically.
//
// For buyer-entered coupon codes at checkout, see CouponManagement.jsx.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  TagIcon,
  CurrencyDollarIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString() : "—";

const formatMMK = (n) =>
  n != null ? new Intl.NumberFormat("en-MM").format(n) + " MMK" : "—";

const EMPTY_FORM = (isAdmin) => ({
  name: "",
  type: "",
  value: "",
  // FIX: correct field names matching the backend
  min_order_amount: "",
  max_uses: "",
  max_uses_per_user: "",
  starts_at: "",
  expires_at: "",
  // Sellers can only target specific_products or specific_categories
  applicable_to: isAdmin ? "all_products" : "specific_products",
  applicable_product_ids: [],
  applicable_category_ids: [],
  is_one_time_use: false,
  is_active: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const DiscountManagement = () => {
  const { t, i18n } = useTranslation();
  const loc = (en, mm) => i18n.language === 'my' ? (mm || en) : (en || mm);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.roles?.includes("admin");

  const [discounts, setDiscounts]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [showForm, setShowForm]           = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [products, setProducts]           = useState([]);
  const [onSaleProducts, setOnSaleProducts] = useState([]);
  const [categories, setCategories]       = useState([]);
  const [submitting, setSubmitting]       = useState(false);
  const [formData, setFormData]           = useState(() => EMPTY_FORM(isAdmin));

  // Only show categories that have at least one of the seller's products
  const sellerCategoryIds = useMemo(() => {
    const ids = new Set();
    products.forEach((p) => { if (p.category_id) ids.add(p.category_id); });
    return ids;
  }, [products]);

  const relevantCategories = useMemo(
    () => categories.filter((c) => sellerCategoryIds.has(c.id)),
    [categories, sellerCategoryIds]
  );

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/seller/discounts");
      // FIX: handle both paginated {data:{data:[]}} and flat {data:[]}
      setDiscounts(res.data.data?.data ?? res.data.data ?? []);
    } catch {
      setError("Failed to fetch discounts");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get("/seller/products");
      const allProducts = res.data.data ?? [];
      setProducts(allProducts);
      setOnSaleProducts(allProducts.filter(p =>
        p.is_on_sale || p.discount_price || p.discount_percentage
      ));
    } catch {
      console.error("Failed to fetch products");
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/categories/all");
      // /categories/all returns root categories with children array
      // Flatten to a single list of leaf + parent categories for discount selection
      const raw = res.data.data ?? [];
      const flat = [];
      raw.forEach(root => {
        if (root.children && root.children.length > 0) {
          root.children.forEach(child => flat.push(child));
        } else {
          flat.push(root);
        }
      });
      setCategories(flat);
    } catch {
      console.error("Failed to fetch categories");
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
    fetchProducts();
    fetchCategories();
  }, [fetchDiscounts, fetchProducts, fetchCategories]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData(EMPTY_FORM(isAdmin));
    setEditingDiscount(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleSelection = (field, id) => {
    setFormData((prev) => {
      const ids = prev[field];
      return {
        ...prev,
        [field]: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      };
    });
  };

  const openEdit = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      name:               discount.name,
      type:               discount.type,
      value:              discount.value ?? "",
      // FIX: read the correct field names from the API response
      min_order_amount:   discount.min_order_amount ?? "",
      max_uses:           discount.max_uses ?? "",
      max_uses_per_user:  discount.max_uses_per_user ?? "",
      starts_at:          discount.starts_at ? discount.starts_at.split("T")[0].split(" ")[0] : "",
      expires_at:         discount.expires_at ? discount.expires_at.split("T")[0].split(" ")[0] : "",
      applicable_to:      discount.applicable_to,
      applicable_product_ids:  discount.applicable_product_ids ?? [],
      applicable_category_ids: discount.applicable_category_ids ?? [],
      is_one_time_use:    discount.is_one_time_use ?? false,
      is_active:          discount.is_active ?? true,
    });
    setShowForm(true);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.type) { setError("Please select a discount type"); return; }
    if (formData.type !== "free_shipping" && !formData.value) {
      setError("Discount value is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name:             formData.name,
        type:             formData.type,
        value:            formData.type === "free_shipping" ? null : parseFloat(formData.value),
        // FIX: send correct field names — backend expects min_order_amount, max_uses, max_uses_per_user
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        max_uses:         formData.max_uses          ? parseInt(formData.max_uses, 10)         : null,
        max_uses_per_user:formData.max_uses_per_user ? parseInt(formData.max_uses_per_user, 10): null,
        starts_at:        formData.starts_at  ? formData.starts_at  + " 00:00:00" : null,
        expires_at:       formData.expires_at ? formData.expires_at + " 23:59:59" : null,
        applicable_to:    formData.applicable_to,
        applicable_product_ids:  formData.applicable_to === "specific_products"
                                    ? formData.applicable_product_ids : [],
        applicable_category_ids: formData.applicable_to === "specific_categories"
                                    ? formData.applicable_category_ids : [],
        is_one_time_use:  formData.is_one_time_use,
        is_active:        formData.is_active,
      };

      const url    = editingDiscount ? `/seller/discounts/${editingDiscount.id}` : "/seller/discounts";
      const method = editingDiscount ? "put" : "post";

      const res = await api[method](url, payload);
      if (res.data.success) {
        await fetchDiscounts();
        resetForm();
        setShowForm(false);
      }
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to save discount");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/seller/discounts/${deleteTarget}`);
      await fetchDiscounts();
    } catch {
      setError("Failed to delete discount");
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Toggle status (optimistic) ────────────────────────────────────────────

  const toggleStatus = async (discount) => {
    setDiscounts((prev) =>
      prev.map((d) => d.id === discount.id ? { ...d, is_active: !d.is_active } : d)
    );
    try {
      // FIX: use PATCH (matches the fixed api.php route)
      await api.patch(`/seller/discounts/${discount.id}/toggle-status`);
    } catch {
      // revert on failure
      setDiscounts((prev) =>
        prev.map((d) => d.id === discount.id ? { ...d, is_active: discount.is_active } : d)
      );
      setError("Failed to update discount status");
    }
  };

  // ── Applicable scope summary ──────────────────────────────────────────────

  const scopeSummary = (d) => {
    switch (d.applicable_to) {
      case "all_products":        return "All products";
      case "specific_products":   return `${d.applicable_product_ids?.length ?? 0} product(s)`;
      case "specific_categories": return `${d.applicable_category_ids?.length ?? 0} category(s)`;
      default:                    return "—";
    }
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t("seller.discount.title", "Product Discounts")}
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Price reductions applied directly to product listings — no code required.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5" />
          {showForm ? "Cancel" : "New Discount"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex justify-between items-center text-red-700 dark:text-red-300">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError("")}><XCircleIcon className="h-5 w-5" /></button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Delete Discount</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete this discount? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-6">
            {editingDiscount ? "Edit Discount" : "New Discount"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name + Type + Value */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name *</label>
                <input
                  type="text" name="name" value={formData.name}
                  onChange={handleChange} required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="Summer Sale 20%"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type *</label>
                <select
                  name="type" value={formData.type}
                  onChange={handleChange} required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                >
                  <option value="" disabled>Select type</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount (MMK)</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {formData.type === "percentage" ? "Percentage (0–100)" : "Amount (MMK)"}
                </label>
                <input
                  type="number" name="value" value={formData.value}
                  onChange={handleChange}
                  required={!!formData.type && formData.type !== "free_shipping"}
                  disabled={!formData.type || formData.type === "free_shipping"}
                  min="0" step="0.01"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:bg-gray-100 dark:disabled:bg-slate-700 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder={formData.type === "percentage" ? "e.g. 20" : "e.g. 5000"}
                />
              </div>
            </div>

            {/* Dates + Min order */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Starts at *</label>
                <input
                  type="date" name="starts_at" value={formData.starts_at}
                  onChange={handleChange} required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Expires at *</label>
                <input
                  type="date" name="expires_at" value={formData.expires_at}
                  onChange={handleChange} required
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                />
              </div>
              <div>
                {/* FIX: input name is now min_order_amount (matches backend) */}
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Min order amount (MMK)</label>
                <input
                  type="number" name="min_order_amount" value={formData.min_order_amount}
                  onChange={handleChange} min="0" step="0.01"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="Leave empty for no minimum"
                />
              </div>
            </div>

            {/* Usage limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                {/* FIX: name is max_uses (was max_uses_total) */}
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max total uses</label>
                <input
                  type="number" name="max_uses" value={formData.max_uses}
                  onChange={handleChange} min="1"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div>
                {/* FIX: name is max_uses_per_user (was max_uses_per_customer) */}
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max uses per customer</label>
                <input
                  type="number" name="max_uses_per_user" value={formData.max_uses_per_user}
                  onChange={handleChange} min="1"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            {/* Applicable to */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Applies to *</label>
              <select
                name="applicable_to" value={formData.applicable_to}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
              >
                {isAdmin && <option value="all_products">All products (store-wide)</option>}
                <option value="specific_products">Specific products</option>
                <option value="specific_categories">Specific categories</option>
              </select>
            </div>

            {/* Product picker */}
            {formData.applicable_to === "specific_products" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Select products ({formData.applicable_product_ids.length} selected)
                </label>
                <div className="max-h-52 overflow-y-auto border border-gray-300 dark:border-slate-600 rounded-lg divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-700">
                  {products.length === 0
                    ? <p className="p-3 text-sm text-gray-500 dark:text-slate-400">No products found</p>
                    : products.map((p) => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                        <input
                          type="checkbox"
                          checked={formData.applicable_product_ids.includes(p.id)}
                          onChange={() => toggleSelection("applicable_product_ids", p.id)}
                          className="h-4 w-4 text-green-600 dark:text-green-400"
                        />
                        <span className="text-sm flex-1 text-gray-900 dark:text-slate-100">{loc(p.name_en, p.name_mm)}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{formatMMK(p.price)}</span>
                      </label>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Category picker */}
            {formData.applicable_to === "specific_categories" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Select categories ({formData.applicable_category_ids.length} selected)
                </label>
                <div className="max-h-52 overflow-y-auto border border-gray-300 dark:border-slate-600 rounded-lg divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-700">
                  {relevantCategories.length === 0
                    ? <p className="p-3 text-sm text-gray-500 dark:text-slate-400">No relevant categories found</p>
                    : relevantCategories.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600">
                        <input
                          type="checkbox"
                          checked={formData.applicable_category_ids.includes(c.id)}
                          onChange={() => toggleSelection("applicable_category_ids", c.id)}
                          className="h-4 w-4 text-green-600 dark:text-green-400"
                        />
                        <span className="text-sm text-gray-900 dark:text-slate-100">{loc(c.name_en, c.name_mm)}</span>
                      </label>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Flags */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="is_one_time_use" name="is_one_time_use"
                checked={formData.is_one_time_use} onChange={handleChange}
                className="h-4 w-4 text-green-600 focus:ring-2 focus:ring-green-500 dark:text-green-400 rounded"
              />
              <label htmlFor="is_one_time_use" className="text-sm text-gray-700 dark:text-slate-300">
                One-time use per customer
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : editingDiscount ? "Update Discount" : "Create Discount"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                {["Name", "Type / Value", "Applies to", "Validity", "Uses", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">
                    No discounts yet. Create one to get started.
                  </td>
                </tr>
              ) : discounts.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">{d.name}</td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                      {d.type === "percentage" && <TagIcon className="h-4 w-4 text-blue-500" />}
                      {d.type === "fixed"       && <CurrencyDollarIcon className="h-4 w-4 text-green-500" />}
                      {d.type === "free_shipping" && <TruckIcon className="h-4 w-4 text-purple-500" />}
                      <span>
                        {d.type === "percentage"   ? `${d.value}%`
                         : d.type === "fixed"      ? formatMMK(d.value)
                         : "Free shipping"}
                      </span>
                    </div>
                    {/* FIX: read min_order_amount (correct field name) */}
                    {d.min_order_amount && (
                      <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        Min: {formatMMK(d.min_order_amount)}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{scopeSummary(d)}</td>

                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {formatDate(d.starts_at)}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {formatDate(d.expires_at)}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                    {/* FIX: read max_uses (was max_uses_total) */}
                    {d.max_uses ? `${d.used_count ?? 0} / ${d.max_uses}` : `${d.used_count ?? 0} / ∞`}
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(d)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        d.is_active
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {d.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(d)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300" title="Edit">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => setDeleteTarget(d.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" title="Delete">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* ── Products with Direct Price Discounts ── */}
      {onSaleProducts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Product Price Discounts
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Set via the <span className="font-medium">discount icon</span> (✨) in Product Management.
                These are direct price reductions on individual products — separate from the discount rules above.
              </p>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3 text-sm text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> These products have <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">discount_price</code> or
            <code className="bg-amber-100 dark:bg-amber-900/40 px-1 ml-1 rounded">discount_percentage</code> set directly on the product record.
            They show a sale badge on the listing automatically without needing a discount rule.
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                  <tr>
                    {["Product","Price","Discount","Sale Price","Valid Until","Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {onSaleProducts.map(p => {
                    const salePrice = p.discount_price
                      || (p.discount_percentage ? p.price * (1 - p.discount_percentage / 100) : null);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100 max-w-[180px] truncate">
                          {p.name_en || p.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                          {formatMMK(p.price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.discount_percentage
                            ? <span className="text-blue-700 dark:text-blue-400 font-semibold">-{p.discount_percentage}%</span>
                            : p.discount_price
                            ? <span className="text-green-700 dark:text-green-400 font-semibold">-{formatMMK(p.price - p.discount_price)}</span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400 font-semibold whitespace-nowrap">
                          {salePrice ? formatMMK(salePrice) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs whitespace-nowrap">
                          {p.discount_end ? new Date(p.discount_end).toLocaleDateString() : "No expiry"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.is_on_sale ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                          }`}>
                            {p.is_on_sale ? "On Sale" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default DiscountManagement;