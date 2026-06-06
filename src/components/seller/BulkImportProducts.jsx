// src/components/seller/BulkImportProducts.jsx
import React, { useState, useRef } from "react";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import PlanFeatureGate from "./PlanFeatureGate";

// ─── Column descriptions shown in the guide table ────────────────────────────
const COLUMNS = [
  { name: "name_en",        required: true,  note: "Product name (English)" },
  { name: "name_mm",        required: false, note: "Product name (Myanmar)" },
  { name: "price",          required: true,  note: "Price in MMK  e.g. 25000" },
  { name: "category_id",   required: true,  note: "Category ID from your admin panel" },
  { name: "product_type",  required: false, note: "physical / digital / service  (default: physical)" },
  { name: "sku",            required: false, note: "Unique SKU code" },
  { name: "brand",          required: false, note: "Brand name" },
  { name: "model",          required: false, note: "Model name" },
  { name: "description_en", required: false, note: "Description (English)" },
  { name: "description_mm", required: false, note: "Description (Myanmar)" },
  { name: "moq",            required: false, note: "Minimum order quantity  (default: 1)" },
  { name: "min_order_unit", required: false, note: "Unit label  e.g. piece, box  (default: piece)" },
  { name: "condition",      required: false, note: "new / used_like_new / used_good / used_fair / refurbished" },
  { name: "weight_kg",      required: false, note: "Weight in kg  e.g. 0.5" },
  { name: "material",       required: false, note: "Material" },
  { name: "origin",         required: false, note: "Country of origin" },
];

// ─── Inner component (gated separately so the gate itself always renders) ────
const BulkImportProducts = () => {
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState(null);   // { imported, skipped, errors, imported_list }
  const [error, setError]         = useState(null);
  const fileInputRef              = useRef(null);

  // ── File selection ──────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  };

  // ── Template download ───────────────────────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const res = await api.get("/seller/products/bulk-import/template", {
        responseType: "blob",
      });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href     = url;
      link.download = "bulk_import_template.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download template.");
    }
  };

  // ── Upload & import ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await api.post("/seller/products/bulk-import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult({
        imported:      res.data.data.imported_count,
        skipped:       res.data.data.skipped_count,
        errors:        res.data.data.errors ?? [],
        imported_list: res.data.data.imported ?? [],
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const msg = err.response?.data?.message || "Upload failed. Please try again.";
      const errs = err.response?.data?.errors ?? [];
      setError(msg);
      if (errs.length) setResult({ imported: 0, skipped: 0, errors: errs, imported_list: [] });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Bulk Import Products
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Upload a CSV or Excel file to add multiple products at once.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-medium transition-colors"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl py-14 px-6 cursor-pointer transition-colors
          ${dragging
            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
          <ArrowUpTrayIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        {file ? (
          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-gray-100">{file.name}</p>
            <p className="text-sm text-gray-400">
              {(file.size / 1024).toFixed(1)} KB — click to change
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-medium text-gray-700 dark:text-gray-300">
              Drop your file here or <span className="text-green-600">browse</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">CSV, XLS, XLSX — max 5 MB, max 500 rows</p>
          </div>
        )}
      </div>

      {/* Upload button */}
      {file && (
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-4 h-4" />
                Import Products
              </>
            )}
          </button>
          <button
            onClick={reset}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && !result && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="space-y-4">
          {/* Counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{result.imported}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Imported</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <XCircleIcon className="w-8 h-8 text-red-500 dark:text-red-400 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-300">{result.skipped}</p>
                <p className="text-sm text-red-500 dark:text-red-400">Skipped</p>
              </div>
            </div>
          </div>

          {/* Row errors */}
          {result.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {result.errors.length} row(s) with errors
                </p>
              </div>
              <div className="divide-y divide-red-100 dark:divide-red-900 max-h-64 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Row {e.row}
                    </p>
                    <ul className="space-y-0.5">
                      {e.errors.map((msg, j) => (
                        <li key={j} className="text-sm text-red-600 dark:text-red-400">• {msg}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.imported > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Imported products are in <span className="font-medium text-gray-700 dark:text-gray-300">Pending</span> status and will be visible after admin approval.
            </p>
          )}
        </div>
      )}

      {/* Column guide */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <DocumentTextIcon className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Column Guide</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Column</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Required</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {COLUMNS.map((col) => (
                <tr key={col.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">{col.name}</td>
                  <td className="px-4 py-2">
                    {col.required
                      ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Required</span>
                      : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Optional</span>
                    }
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{col.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

// ─── Gated export ─────────────────────────────────────────────────────────────
export default function BulkImportProductsGated(props) {
  return (
    <PlanFeatureGate feature="bulk_import_enabled">
      <BulkImportProducts {...props} />
    </PlanFeatureGate>
  );
}