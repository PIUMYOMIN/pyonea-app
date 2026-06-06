// components/admin/BusinessTypeManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  BuildingStorefrontIcon, UsersIcon, BriefcaseIcon, TruckIcon,
  CurrencyDollarIcon, CubeIcon, ShieldCheckIcon, ChartBarIcon,
  CheckCircleIcon, XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  MagnifyingGlassIcon, PlusIcon, XMarkIcon, ArrowPathIcon,
  PencilIcon, TrashIcon,
} from "@heroicons/react/20/solid";
import api from "../../utils/api";

const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ICONS = [
  { value: "UsersIcon",              label: "Individual",  Icon: UsersIcon },
  { value: "BuildingStorefrontIcon", label: "Store",       Icon: BuildingStorefrontIcon },
  { value: "BriefcaseIcon",          label: "Business",    Icon: BriefcaseIcon },
  { value: "TruckIcon",              label: "Logistics",   Icon: TruckIcon },
  { value: "CurrencyDollarIcon",     label: "Finance",     Icon: CurrencyDollarIcon },
  { value: "CubeIcon",               label: "Products",    Icon: CubeIcon },
  { value: "ShieldCheckIcon",        label: "Verified",    Icon: ShieldCheckIcon },
  { value: "ChartBarIcon",           label: "Analytics",   Icon: ChartBarIcon },
];

const COLORS = [
  { value: "#3b82f6", label: "Blue"   },
  { value: "#10b981", label: "Green"  },
  { value: "#f59e0b", label: "Amber"  },
  { value: "#ef4444", label: "Red"    },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink"   },
  { value: "#6366f1", label: "Indigo" },
  { value: "#06b6d4", label: "Cyan"   },
];

const EMPTY_FORM = {
  name_en: "", name_mm: "", slug_en: "", slug_mm: "",
  description_en: "", description_mm: "",
  requires_registration: false, requires_tax_document: false,
  requires_identity_document: false, requires_business_certificate: false,
  additional_requirements: "", is_active: true, sort_order: 0,
  icon: "BuildingStorefrontIcon", color: "#3b82f6",
};

const Toast = ({ toast }) => toast ? (
  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium mb-4
    ${toast.type === "success"
      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"}`}>
    {toast.type === "success"
      ? <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
      : <XCircleIcon    className="h-4 w-4 flex-shrink-0" />}
    {toast.msg}
  </div>
) : null;

const DeleteModal = ({ item, onConfirm, onClose }) => !item ? null : (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
      <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2">Delete Business Type</h3>
      <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
        Delete <strong className="dark:text-slate-200">{item.name_en}</strong>?
      </p>
      {item.sellers_count > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4">
          ⚠ {item.sellers_count} seller(s) use this type.
        </p>
      )}
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700">
          Cancel
        </button>
        <button onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">
          Delete
        </button>
      </div>
    </div>
  </div>
);

const BusinessTypeManagement = () => {
  const [types, setTypes]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [toast, setToast]               = useState(null);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState(null);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors]   = useState({});
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggling, setToggling]         = useState(null);

  const flash = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetch = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/admin/business-types");
      setTypes(res.data.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load business types.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditing(null); setForm({ ...EMPTY_FORM }); setFieldErrors({}); setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name_en: t.name_en || "", name_mm: t.name_mm || "",
      slug_en: t.slug_en || "", slug_mm: t.slug_mm || "",
      description_en: t.description_en || "", description_mm: t.description_mm || "",
      requires_registration:         !!t.requires_registration,
      requires_tax_document:         !!t.requires_tax_document,
      requires_identity_document:    !!t.requires_identity_document,
      requires_business_certificate: !!t.requires_business_certificate,
      additional_requirements: t.additional_requirements
        ? JSON.stringify(t.additional_requirements, null, 2) : "",
      is_active:  t.is_active !== undefined ? t.is_active : true,
      sort_order: t.sort_order ?? 0,
      icon:  t.icon  || "BuildingStorefrontIcon",
      color: t.color || "#3b82f6",
    });
    setFieldErrors({}); setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setForm((p) => {
      const next = { ...p, [name]: val };
      if (name === "name_en" && !editing) next.slug_en = slugify(value);
      return next;
    });
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name_en.trim()) errs.name_en = "English name is required.";
    if (!form.slug_en.trim()) { errs.slug_en = "Slug is required."; }
    else if (!/^[a-z0-9-]+$/.test(form.slug_en)) { errs.slug_en = "Only lowercase letters, numbers, hyphens."; }
    if (form.additional_requirements.trim()) {
      try { JSON.parse(form.additional_requirements); }
      catch { errs.additional_requirements = "Must be valid JSON."; }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setSaving(true); setFieldErrors({});
    try {
      const payload = {
        ...form,
        additional_requirements: form.additional_requirements.trim()
          ? JSON.parse(form.additional_requirements) : [],
      };
      if (editing) {
        await api.put(`/admin/business-types/${editing.id}`, payload);
        flash("Business type updated.");
      } else {
        await api.post("/admin/business-types", payload);
        flash("Business type created.");
      }
      setShowModal(false); fetch();
    } catch (err) {
      if (err.response?.data?.errors) setFieldErrors(err.response.data.errors);
      else setFieldErrors({ submit: err.response?.data?.message || "Failed to save." });
    } finally { setSaving(false); }
  };

  const handleToggle = async (t) => {
    setToggling(t.id);
    try {
      await api.patch(`/admin/business-types/${t.id}/toggle`);
      setTypes((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
      flash(`"${t.name_en}" ${t.is_active ? "deactivated" : "activated"}.`);
    } catch (err) {
      flash(err.response?.data?.message || "Failed to update status.", "error");
    } finally { setToggling(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/business-types/${deleteTarget.id}`);
      flash(`"${deleteTarget.name_en}" deleted.`);
      setDeleteTarget(null); fetch();
    } catch (err) {
      flash(err.response?.data?.message || "Failed to delete.", "error");
      setDeleteTarget(null);
    }
  };

  const filtered = types.filter((t) => {
    const ms = t.name_en?.toLowerCase().includes(search.toLowerCase()) ||
               t.name_mm?.toLowerCase().includes(search.toLowerCase()) ||
               t.slug_en?.toLowerCase().includes(search.toLowerCase());
    const mf = filterStatus === "all" ? true : filterStatus === "active" ? t.is_active : !t.is_active;
    return ms && mf;
  });

  const activeCount = types.filter((t) => t.is_active).length;

  const inputCls = (err) =>
    `w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      err ? "border-red-400 dark:border-red-600" : "border-gray-300 dark:border-slate-600"
    }`;

  return (
    <div className="space-y-5">
      <DeleteModal item={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      <Toast toast={toast} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total",        value: types.length,                   color: "text-blue-700 dark:text-blue-300",   bg: "bg-blue-50 dark:bg-blue-900/20"   },
          { label: "Active",       value: activeCount,                    color: "text-green-700 dark:text-green-300",  bg: "bg-green-50 dark:bg-green-900/20"  },
          { label: "Inactive",     value: types.length - activeCount,     color: "text-red-500 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-900/20"      },
          { label: "Require Docs", value: types.filter(t => t.requires_registration || t.requires_business_certificate).length,
                                                                          color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-900/20" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Business Type Management</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Manage seller onboarding business types</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl w-44 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={fetch}
              className="p-2 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <ArrowPathIcon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" /> Add Type
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border-b border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-400 dark:text-slate-500 text-sm">
            {types.length === 0 ? "No business types yet." : "No types match your filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  {["Icon", "Name", "Slug", "Requirements", "Sellers", "Status", "Order", "Actions"].map((h) => (
                    <th key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {filtered.map((t) => {
                  const iconCfg = ICONS.find((i) => i.value === t.icon) || ICONS[1];
                  const Icon = iconCfg.Icon;
                  return (
                    <tr key={t.id}
                      className={`transition-colors ${
                        t.is_active
                          ? "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                          : "bg-gray-50/50 dark:bg-slate-700/20 opacity-70 hover:opacity-100"
                      }`}>

                      {/* Icon */}
                      <td className="px-4 py-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${t.color}22` }}>
                          <Icon className="h-5 w-5" style={{ color: t.color }} />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{t.name_en}</p>
                        {t.name_mm && <p className="text-xs text-gray-400 dark:text-slate-500">{t.name_mm}</p>}
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-700 dark:text-slate-300">
                          {t.slug_en}
                        </code>
                      </td>

                      {/* Requirements */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {t.requires_registration && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium">
                              Registration
                            </span>
                          )}
                          {t.requires_tax_document && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium">
                              Tax Doc
                            </span>
                          )}
                          {t.requires_identity_document && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 font-medium">
                              ID Doc
                            </span>
                          )}
                          {t.requires_business_certificate && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-medium">
                              Biz Cert
                            </span>
                          )}
                          {!t.requires_registration && !t.requires_tax_document &&
                           !t.requires_identity_document && !t.requires_business_certificate && (
                            <span className="text-[10px] text-gray-400 dark:text-slate-500">None</span>
                          )}
                        </div>
                      </td>

                      {/* Sellers */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                          {t.sellers_count ?? "—"}
                        </span>
                      </td>

                      {/* Status toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(t)} disabled={toggling === t.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-60 ${
                            t.is_active
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                          }`}>
                          {toggling === t.id
                            ? <span className="h-2.5 w-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            : t.is_active
                              ? <CheckCircleIcon className="h-3.5 w-3.5" />
                              : <XCircleIcon    className="h-3.5 w-3.5" />}
                          {t.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Sort order */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                          {t.sort_order}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(t)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Edit">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(t)}
                            className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 dark:bg-black/60 flex items-start justify-center p-4">
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                {editing ? `Edit — ${editing.name_en}` : "New Business Type"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {fieldErrors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                  {fieldErrors.submit}
                </div>
              )}

              {/* Name / Slug / Description grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* English column */}
                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">English</p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Name (EN) *</label>
                    <input name="name_en" value={form.name_en} onChange={handleChange}
                      placeholder="e.g. Individual Seller"
                      className={inputCls(fieldErrors.name_en)} />
                    {fieldErrors.name_en && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{fieldErrors.name_en}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                      Slug (EN) * <span className="text-gray-400 dark:text-slate-500 font-normal">(auto-generated)</span>
                    </label>
                    <input name="slug_en" value={form.slug_en} onChange={handleChange}
                      placeholder="e.g. individual-seller"
                      className={`${inputCls(fieldErrors.slug_en)} font-mono`} />
                    {fieldErrors.slug_en && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{fieldErrors.slug_en}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Description (EN)</label>
                    <textarea name="description_en" value={form.description_en} onChange={handleChange} rows={3}
                      className={`${inputCls(false)} resize-none`} />
                  </div>
                </div>

                {/* Myanmar column */}
                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Myanmar (မြန်မာ)</p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Name (MM)</label>
                    <input name="name_mm" value={form.name_mm} onChange={handleChange}
                      className={inputCls(false)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Slug (MM)</label>
                    <input name="slug_mm" value={form.slug_mm} onChange={handleChange}
                      className={`${inputCls(false)} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Description (MM)</label>
                    <textarea name="description_mm" value={form.description_mm} onChange={handleChange} rows={3}
                      className={`${inputCls(false)} resize-none`} />
                  </div>
                </div>
              </div>

              {/* Document requirements */}
              <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  Document Requirements
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ["requires_registration",         "Business Registration"],
                    ["requires_tax_document",          "Tax Document"],
                    ["requires_identity_document",     "Identity Document"],
                    ["requires_business_certificate",  "Business Certificate"],
                  ].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" name={name} checked={form[name]} onChange={handleChange}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600" />
                      <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Icon + Color + Sort + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Icon picker */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">Icon</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ICONS.map(({ value, label, Icon }) => (
                      <button key={value} type="button" onClick={() => setForm((p) => ({ ...p, icon: value }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-[10px] transition-all ${
                          form.icon === value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-500 dark:text-slate-400"
                        }`}
                        title={label}>
                        <Icon className="h-5 w-5" />
                        <span className="truncate w-full text-center">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color + Sort + Active */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => setForm((p) => ({ ...p, color: value }))}
                          className={`h-8 w-8 rounded-full border-2 transition-all ${
                            form.color === value
                              ? "border-gray-900 dark:border-slate-200 scale-110"
                              : "border-gray-300 dark:border-slate-600 hover:border-gray-500 dark:hover:border-slate-400"
                          }`}
                          style={{ backgroundColor: value }} title={label} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Sort Order</label>
                    <input type="number" name="sort_order" value={form.sort_order} onChange={handleChange} min="0"
                      className={inputCls(false)} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600" />
                    <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Active (visible to sellers)</span>
                  </label>
                </div>
              </div>

              {/* Additional requirements JSON */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  Additional Requirements <span className="text-gray-400 dark:text-slate-500 font-normal">(JSON array, optional)</span>
                </label>
                <textarea name="additional_requirements" value={form.additional_requirements} onChange={handleChange} rows={3}
                  placeholder='[{"name":"Example","description":"Detail"}]'
                  className={`${inputCls(fieldErrors.additional_requirements)} font-mono resize-none`} />
                {fieldErrors.additional_requirements && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{fieldErrors.additional_requirements}</p>
                )}
              </div>
            </form>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessTypeManagement;
