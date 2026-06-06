import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompare } from "../context/CompareContext";

const money = (value, locale) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "MMK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const ProductComparison = () => {
  const { t, i18n } = useTranslation();
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const currencyLocale = i18n.language === "my" ? "my-MM" : "en-US";

  if (!compareItems.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t("compare.title")}</h1>
        <p className="mt-3 text-gray-600 dark:text-slate-400">
          {t("compare.empty_message")}
        </p>
        <Link
          to="/products"
          className="inline-flex mt-5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          {t("compare.browse_products")}
        </Link>
      </div>
    );
  }

  const rows = [
    { label: t("compare.features.price"), render: (p) => money(p.price, currencyLocale) },
    { label: t("compare.features.rating"), render: (p) => `${Number(p.average_rating || 0).toFixed(1)} (${p.review_count || 0})` },
    { label: t("compare.features.moq"), render: (p) => p.moq || 1 },
    { label: t("compare.features.stock"), render: (p) => (p.is_active && p.in_stock ? t("compare.in_stock") : t("compare.out_of_stock")) },
    { label: t("compare.features.seller"), render: (p) => p.seller_name || t("compare.not_available") },
    { label: t("compare.features.category_id"), render: (p) => p.category_id || t("compare.not_available") },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">
          {t("compare.title")} ({compareItems.length})
        </h1>
        <button
          type="button"
          onClick={clearCompare}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t("compare.clear_all")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-200">{t("compare.feature")}</th>
              {compareItems.map((p) => (
                <th key={p.id} className="min-w-[220px] px-4 py-3 text-left">
                  <div className="space-y-2">
                    <Link to={`/products/${p.slug}`} className="text-sm font-semibold text-green-700 hover:underline dark:text-green-400">
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromCompare(p.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      {t("compare.remove")}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-100 dark:border-slate-800">
                <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-200">{row.label}</td>
                {compareItems.map((p) => (
                  <td key={`${p.id}-${row.label}`} className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductComparison;
