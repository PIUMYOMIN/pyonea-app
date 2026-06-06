import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../../utils/api";
import { useTheme } from "../../context/ThemeContext";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000)         return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return v.toLocaleString();
};
const fullMMK = (n) =>
  new Intl.NumberFormat("my-MM", { style: "currency", currency: "MMK", minimumFractionDigits: 0 })
    .format(Number(n) || 0);
const fmtMMK = (n) => `${fmtK(n)} MMK`;

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, color, bg }) => (
  <div className={`${bg} rounded-xl p-4`}>
    <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
    <p className={`text-xl font-bold ${color} mt-1 break-all`}>{value}</p>
    {sub && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

// ── Export CSV ────────────────────────────────────────────────────────────────
const exportCSV = (filename, headers, rows) => {
  const lines = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

const ExportBtn = ({ label, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white
               rounded-lg flex items-center gap-1.5 disabled:opacity-60 transition-colors">
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
    {disabled ? "Exporting…" : label}
  </button>
);

// ── Main component ────────────────────────────────────────────────────────────
const AnalyticsManagement = () => {
  const { isDark } = useTheme();
  const [stats,     setStats]     = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [exportErr, setExportErr] = useState("");
  const [exporting, setExporting] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, breakdownRes] = await Promise.allSettled([
        api.get("/admin/stats"),
        api.get("/admin/revenue-breakdown"),
      ]);
      if (statsRes.status === "fulfilled" && statsRes.value.data.success) {
        setStats(statsRes.value.data.data);
      }
      if (breakdownRes.status === "fulfilled" && breakdownRes.value.data.success) {
        setBreakdown(breakdownRes.value.data.data || []);
      }
    } catch {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const doExport = (key, fn) => {
    setExporting(key);
    setExportErr("");
    try { fn(); }
    catch (e) { setExportErr(e.message || "Export failed."); }
    finally { setExporting(""); }
  };

  const exportBreakdown = () => doExport("breakdown", () =>
    exportCSV(
      `pyonea-platform-revenue-${new Date().toISOString().slice(0,10)}.csv`,
      ["Month", "Commission (MMK)", "Delivery Fees (MMK)", "Total Platform Revenue (MMK)", "GMV (MMK)"],
      breakdown.map(r => [r.month, r.commission, r.delivery_fee, r.platform, r.gmv])
    )
  );

  const exportSummary = () => doExport("summary", () =>
    exportCSV(
      `pyonea-summary-${new Date().toISOString().slice(0,10)}.csv`,
      ["Metric", "Value (MMK)"],
      [
        ["Total GMV",             stats?.total_revenue       ?? 0],
        ["Platform Revenue",      stats?.platform_revenue    ?? 0],
        ["Commission Revenue",    stats?.commission_revenue  ?? 0],
        ["Delivery Fee Revenue",  stats?.delivery_fee_revenue?? 0],
        ["Pending Commissions",   stats?.pending_commissions ?? 0],
        ["Paid Commissions",      stats?.paid_commissions    ?? 0],
        ["Total Orders",          stats?.total_orders        ?? 0],
        ["Completed Orders",      stats?.completed_orders    ?? 0],
      ]
    )
  );

  const totals = {
    commission:  breakdown.reduce((s, r) => s + (r.commission   || 0), 0),
    deliveryFee: breakdown.reduce((s, r) => s + (r.delivery_fee || 0), 0),
    platform:    breakdown.reduce((s, r) => s + (r.platform     || 0), 0),
    gmv:         breakdown.reduce((s, r) => s + (r.gmv          || 0), 0),
  };

  // Chart theme colours
  const axisColor  = isDark ? "#94a3b8" : "#666";
  const gridColor  = isDark ? "#334155" : "#f0f0f0";
  const tooltipBg  = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "#475569" : "#e2e8f0";

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    borderColor: tooltipBorder,
    color: isDark ? "#f1f5f9" : "#1e293b",
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
      </div>
    );

  if (error)
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-3">
        {error}
        <button onClick={fetchAll} className="underline font-medium">Retry</button>
      </div>
    );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Revenue Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Platform revenue = seller commissions + platform delivery fees
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportBtn label="Export Summary"   onClick={exportSummary}   disabled={!!exporting} />
          <ExportBtn label="Export Breakdown" onClick={exportBreakdown} disabled={!!exporting} />
        </div>
      </div>

      {exportErr && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {exportErr}
        </div>
      )}

      {/* Platform Revenue KPIs */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
          Platform Revenue (What Pyonea Earns)
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total Platform Revenue" value={fmtMMK(stats?.platform_revenue)}
               sub="Commission + Delivery Fees"
               color="text-emerald-700 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/20" />
          <KPI label="Commission Revenue"     value={fmtMMK(stats?.commission_revenue)}
               sub="From delivered orders"
               color="text-teal-700 dark:text-teal-400"    bg="bg-teal-50 dark:bg-teal-900/20" />
          <KPI label="Delivery Fee Revenue"   value={fmtMMK(stats?.delivery_fee_revenue)}
               sub="Platform deliveries"
               color="text-blue-700 dark:text-blue-400"    bg="bg-blue-50 dark:bg-blue-900/20" />
          <KPI label="Pending Commissions"    value={fmtMMK(stats?.pending_commissions)}
               sub="Awaiting collection"
               color="text-amber-700 dark:text-amber-400"  bg="bg-amber-50 dark:bg-amber-900/20" />
        </div>
      </div>

      {/* GMV + Order KPIs */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
          Marketplace Volume (GMV)
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total GMV"        value={fmtMMK(stats?.total_revenue)}
               sub="All time order value"
               color="text-gray-700 dark:text-slate-300" bg="bg-gray-50 dark:bg-slate-700/50" />
          <KPI label="Total Orders"     value={(stats?.total_orders ?? 0).toLocaleString()}
               sub=""
               color="text-gray-700 dark:text-slate-300" bg="bg-gray-50 dark:bg-slate-700/50" />
          <KPI label="Completed Orders" value={(stats?.completed_orders ?? 0).toLocaleString()}
               sub="Delivered"
               color="text-green-700 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" />
          <KPI label="Paid Commissions" value={fmtMMK(stats?.paid_commissions)}
               sub="Collected"
               color="text-gray-700 dark:text-slate-300" bg="bg-gray-50 dark:bg-slate-700/50" />
        </div>
      </div>

      {/* Charts + Table */}
      {breakdown.length > 0 ? (
        <>
          {/* Stacked Bar — Platform Revenue */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Monthly Platform Revenue (Last 12 months)
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Commission fees + Platform delivery fees
                </p>
              </div>
              <ExportBtn label="Export" onClick={exportBreakdown} disabled={!!exporting} />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: axisColor }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: axisColor }} />
                  <Tooltip
                    formatter={(v, name) => [fullMMK(v), name]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend wrapperStyle={{ color: axisColor }} />
                  <Bar dataKey="commission"   name="Commission"    fill="#10b981" radius={[4,4,0,0]} stackId="platform" />
                  <Bar dataKey="delivery_fee" name="Delivery Fees" fill="#3b82f6" radius={[4,4,0,0]} stackId="platform" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line — GMV vs Platform Revenue */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">
              GMV vs Platform Revenue (Last 12 months)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={breakdown} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: axisColor }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: axisColor }} />
                  <Tooltip
                    formatter={(v, name) => [fullMMK(v), name]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend wrapperStyle={{ color: axisColor }} />
                  <Line dataKey="gmv"      name="GMV"             stroke="#94a3b8" strokeWidth={2} dot={false} />
                  <Line dataKey="platform" name="Platform Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Monthly Breakdown</h3>
              <ExportBtn label="Export CSV" onClick={exportBreakdown} disabled={!!exporting} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    {["Month","Commission","Delivery Fees","Total Platform","GMV","Take Rate"].map(h => (
                      <th key={h}
                        className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {breakdown.map(r => {
                    const takeRate = r.gmv > 0 ? ((r.platform / r.gmv) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={r.month} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-slate-100">{r.month}</td>
                        <td className="px-4 py-2.5 text-teal-700 dark:text-teal-400">{fullMMK(r.commission)}</td>
                        <td className="px-4 py-2.5 text-blue-700 dark:text-blue-400">{fullMMK(r.delivery_fee)}</td>
                        <td className="px-4 py-2.5 font-bold text-emerald-700 dark:text-emerald-400">{fullMMK(r.platform)}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400">{fullMMK(r.gmv)}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400">{takeRate}%</td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-gray-50 dark:bg-slate-900/50 font-semibold border-t-2 border-gray-200 dark:border-slate-600">
                    <td className="px-4 py-2.5 text-gray-700 dark:text-slate-300">Total</td>
                    <td className="px-4 py-2.5 text-teal-700 dark:text-teal-400">{fullMMK(totals.commission)}</td>
                    <td className="px-4 py-2.5 text-blue-700 dark:text-blue-400">{fullMMK(totals.deliveryFee)}</td>
                    <td className="px-4 py-2.5 text-emerald-700 dark:text-emerald-400">{fullMMK(totals.platform)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400">{fullMMK(totals.gmv)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400">
                      {totals.gmv > 0 ? ((totals.platform / totals.gmv) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-10 text-center text-gray-400 dark:text-slate-500 text-sm">
          No revenue data yet. Revenue will appear here once orders are delivered and commissions recorded.
        </div>
      )}
    </div>
  );
};

export default AnalyticsManagement;
