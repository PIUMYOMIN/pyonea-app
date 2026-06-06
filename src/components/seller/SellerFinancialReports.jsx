// src/components/seller/FinancialReports.jsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  TruckIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../../utils/api';
import * as XLSX from 'xlsx';
import PlanFeatureGate from './PlanFeatureGate';

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString();
};
const mmkNum = (n) => Math.round(Number(n) || 0);
const fmtMMK = (n) => `${fmtK(n)} MMK`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_COLORS = {
  delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  pending:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  processing:'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  confirmed: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
  shipped:   'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
};

const PERIODS = [
  { key: 'today',      label: 'Today' },
  { key: 'yesterday',  label: 'Yesterday' },
  { key: 'week',       label: 'This Week' },
  { key: 'last_week',  label: 'Last Week' },
  { key: 'month',      label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'quarter',    label: 'This Quarter' },
  { key: 'year',       label: 'This Year' },
  { key: 'custom',     label: 'Custom Range' },
];

const GROUP_OPTIONS = [
  { key: 'day',   label: 'Daily' },
  { key: 'week',  label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
];

// ── Excel Export ───────────────────────────────────────────────────────────────

function exportToExcel(data, storeName) {
  const { summary: s, orders, trend } = data;

  const buildSheet = (rows) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Fix: properly accumulate max width across ALL rows (not just the last)
    const maxW = rows.reduce((acc, row) => {
      row.forEach((cell, i) => {
        acc[i] = Math.max(acc[i] || 8, String(cell ?? '').length + 2);
      });
      return acc;
    }, []);
    ws['!cols'] = maxW.map(w => ({ wch: Math.min(w, 40) }));
    return ws;
  };

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ───────────────────────────────────────────────
  const summaryRows = [
    [`PYONEA — ${(storeName || 'SELLER').toUpperCase()} FINANCIAL REPORT`],
    [`Period: ${s.from} → ${s.to}  |  Generated: ${new Date().toLocaleString()}`],
    [],
    ['ORDERS', ''],
    ['Total Orders',         s.total_orders],
    ['Delivered Orders',     s.delivered_orders],
    ['Pending Orders',       s.pending_orders],
    ['Cancelled Orders',     s.cancelled_orders],
    [],
    ['REVENUE (MMK)', ''],
    ['Gross Merchandise Value (GMV)', mmkNum(s.total_gmv)],
    ['Total Subtotal',       mmkNum(s.total_subtotal)],
    ['Shipping Fees',        mmkNum(s.total_shipping)],
    ['Tax',                  mmkNum(s.total_tax)],
    ['Coupon Discounts',     mmkNum(s.total_coupon_discount)],
    [],
    ['COMMISSION (MMK)', ''],
    ['Total Commission Owed',    mmkNum(s.total_commission)],
    ['Commission Pending',       mmkNum(s.total_commission_pending)],
    ['Commission Confirmed',     mmkNum(s.total_commission_confirmed)],
    ['Your Net Payout',          mmkNum(s.total_seller_payout)],
    [],
    ['PLATFORM DELIVERY FEES (MMK)', ''],
    ['Total Delivery Fees',          mmkNum(s.total_delivery_fees)],
    ['Delivery Fees Pending',        mmkNum(s.total_delivery_fees_pending)],
    ['Delivery Fees Confirmed',      mmkNum(s.total_delivery_fees_confirmed)],
    [],
    ...(s.wallet ? [
      ['WALLET SNAPSHOT (MMK)', ''],
      ['Available Balance',        mmkNum(s.wallet.available_balance)],
      ['Escrow Balance',           mmkNum(s.wallet.escrow_balance)],
      ['Total Earned (all time)',  mmkNum(s.wallet.total_earned)],
      ['Total Commission Paid',    mmkNum(s.wallet.total_commission_paid)],
      ['COD Commission Outstanding', mmkNum(s.wallet.cod_commission_outstanding)],
    ] : []),
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summaryRows), 'Summary');

  // ── Sheet 2: Orders ────────────────────────────────────────────────
  const orderHeaders = [
    'Order #', 'Order Date', 'Delivered At',
    'Buyer Name', 'Buyer Email',
    'Items', 'Items Count',
    'Subtotal (MMK)', 'Shipping (MMK)', 'Tax (MMK)', 'Coupon Discount (MMK)', 'Total (MMK)',
    'Commission Rate', 'Commission (MMK)', 'Commission Status',
    'Your Payout (MMK)',
    'Delivery Fee (MMK)', 'Delivery Fee Status',
    'Order Status', 'Payment Method', 'Payment Status',
  ];
  const orderRows = orders.map(o => [
    o.order_number,
    fmtDateTime(o.order_date),
    fmtDateTime(o.delivered_at),
    o.buyer_name,
    o.buyer_email,
    o.items_summary,
    o.items_count,
    mmkNum(o.subtotal),
    mmkNum(o.shipping_fee),
    mmkNum(o.tax_amount),
    mmkNum(o.coupon_discount),
    mmkNum(o.total_amount),
    `${Math.round((o.commission_rate || 0) * 100)}%`,
    mmkNum(o.commission_amount),
    o.commission_status,
    mmkNum(o.seller_payout),
    mmkNum(o.delivery_fee),
    o.delivery_fee_status?.replace(/_/g, ' ') || '—',
    o.order_status,
    o.payment_method?.replace(/_/g, ' ') || '—',
    o.payment_status || '—',
  ]);
  XLSX.utils.book_append_sheet(wb, buildSheet([orderHeaders, ...orderRows]), 'Orders');

  // ── Sheet 3: Trend ─────────────────────────────────────────────────
  const trendHeaders = ['Period', 'Orders', 'GMV (MMK)', 'Tax (MMK)', 'Commission (MMK)', 'Delivery Fee (MMK)', 'Platform Revenue (MMK)'];
  const trendRows = trend.map(t => [
    t.period, t.orders,
    mmkNum(t.gmv), mmkNum(t.tax),
    mmkNum(t.commission), mmkNum(t.delivery_fee), mmkNum(t.platform),
  ]);
  XLSX.utils.book_append_sheet(wb, buildSheet([trendHeaders, ...trendRows]), 'Trend');

  XLSX.writeFile(wb, `pyonea-seller-report-${s.from}-to-${s.to}.xlsx`);
}

// ── Summary Card ───────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, Icon, color }) {
  return (
    <div className={`rounded-xl border-l-4 p-5 shadow-sm ${color}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100 truncate">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">{sub}</p>}
        </div>
        <Icon className="h-8 w-8 text-gray-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

function SellerFinancialReports({ storeName }) {
  const [period,   setPeriod]   = useState('month');
  const [groupBy,  setGroupBy]  = useState('day');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [exporting, setExporting] = useState(false);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Using a ref-based approach to avoid stale closure in useEffect
  const fetchReport = useCallback(async (p = period, gb = groupBy) => {
    setLoading(true);
    setError('');
    try {
      const params = { period: p, group_by: gb };
      if (p === 'custom') {
        if (!fromDate || !toDate) { setLoading(false); return; }
        params.from = fromDate;
        params.to   = toDate;
      }
      const res = await api.get('/seller/financial-report', { params });
      if (res.data.success) setData(res.data);
      else setError(res.data.message || 'Failed to load report.');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [period, groupBy, fromDate, toDate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReport('month', 'day'); }, []); // mount-only initial load

  const handlePeriodChange = (p) => {
    setPeriod(p);
    if (p !== 'custom') fetchReport(p, groupBy);
  };

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try { await exportToExcel(data, storeName); }
    catch (e) { alert('Export failed: ' + e.message); }
    finally { setExporting(false); }
  };

  const s = data?.summary || {};
  const trend = data?.trend || [];

  // Filtered orders
  const orders = (data?.orders || []).filter(o => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      o.order_number?.toLowerCase().includes(q) ||
      o.buyer_name?.toLowerCase().includes(q) ||
      o.items_summary?.toLowerCase().includes(q);
    const matchS = statusFilter === 'all' || o.order_status === statusFilter;
    return matchQ && matchS;
  });

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-green-600" />
            Financial Reports
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Your store's revenue, commissions, and order breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReport()}
            className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={!data || exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* ── Period Picker ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => handlePeriodChange(p.key)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                period === p.key
                  ? 'bg-green-600 text-white border-green-600'
                  : 'text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => fetchReport('custom', groupBy)}
              disabled={!fromDate || !toDate}
              className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-slate-400">Group trend by:</span>
          {GROUP_OPTIONS.map(g => (
            <button
              key={g.key}
              onClick={() => { setGroupBy(g.key); fetchReport(period, g.key); }}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                groupBy === g.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 dark:text-slate-500 animate-spin" />
        </div>
      ) : data && (
        <>
          {/* ── Period Label ─────────────────────────────────────────── */}
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Period: <span className="font-semibold text-gray-700 dark:text-slate-300">{s.from} → {s.to}</span>
          </p>

          {/* ── Summary Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Orders"
              value={s.total_orders || 0}
              sub={`${s.delivered_orders || 0} delivered`}
              Icon={ShoppingBagIcon}
              color="border-green-400 bg-green-50 dark:bg-green-900/20"
            />
            <SummaryCard
              label="Gross Revenue (GMV)"
              value={fmtMMK(s.total_gmv)}
              sub={`Subtotal: ${fmtMMK(s.total_subtotal)}`}
              Icon={CurrencyDollarIcon}
              color="border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            />
            <SummaryCard
              label="Your Net Payout"
              value={fmtMMK(s.total_seller_payout)}
              sub={`Commission: ${fmtMMK(s.total_commission)}`}
              Icon={BanknotesIcon}
              color="border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
            />
            <SummaryCard
              label="Platform Delivery Fees"
              value={fmtMMK(s.total_delivery_fees)}
              sub={`${fmtMMK(s.total_delivery_fees_pending)} pending`}
              Icon={TruckIcon}
              color="border-orange-400 bg-orange-50 dark:bg-orange-900/20"
            />
          </div>

          {/* ── Commission + Wallet row ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Commission breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-4 w-4 text-indigo-500" />
                Commission Breakdown
              </h3>
              <dl className="space-y-3 text-sm">
                {[
                  ['Total Commission Owed',  s.total_commission,            'text-red-600 dark:text-red-400'],
                  ['Commission Pending',      s.total_commission_pending,    'text-yellow-600 dark:text-yellow-400'],
                  ['Commission Confirmed',    s.total_commission_confirmed,  'text-green-600 dark:text-green-400'],
                  ['Your Net Payout',         s.total_seller_payout,         'text-blue-600 dark:text-blue-400 font-bold'],
                ].map(([label, val, cls]) => (
                  <div key={label} className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                    <dt className="text-gray-600 dark:text-slate-400">{label}</dt>
                    <dd className={`font-semibold ${cls}`}>{fmtMMK(val)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Wallet snapshot */}
            {s.wallet && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <BanknotesIcon className="h-4 w-4 text-green-500" />
                  Wallet Snapshot
                </h3>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Available Balance',        s.wallet.available_balance,          'text-green-600 dark:text-green-400 font-bold'],
                    ['Escrow Balance',            s.wallet.escrow_balance,             'text-blue-600 dark:text-blue-400'],
                    ['Total Earned (All Time)',   s.wallet.total_earned,               'text-gray-800 dark:text-slate-200'],
                    ['Total Commission Paid',     s.wallet.total_commission_paid,      'text-red-600 dark:text-red-400'],
                    ['COD Commission Outstanding',s.wallet.cod_commission_outstanding, 'text-orange-600 dark:text-orange-400'],
                  ].map(([label, val, cls]) => (
                    <div key={label} className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                      <dt className="text-gray-600 dark:text-slate-400">{label}</dt>
                      <dd className={`font-semibold ${cls}`}>{fmtMMK(val)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          {/* ── Trend Chart ───────────────────────────────────────────── */}
          {trend.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-4">
                Revenue Trend
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    formatter={(v, name) => [fmtMMK(v), name]}
                    contentStyle={{
                      background: '#1e293b',
                      border: 'none', borderRadius: 10, fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="gmv"        name="GMV"          stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="commission" name="Commission"    stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="platform"   name="Platform Rev." stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Orders Table ──────────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Table header + filters */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex-1">
                Order Details
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-slate-400">
                  ({orders.length} orders shown)
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  {['delivered','pending','confirmed','processing','shipped','cancelled'].map(st => (
                    <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                  ))}
                </select>
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search order, buyer, item…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:outline-none w-48"
                  />
                </div>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                <ShoppingBagIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No orders found for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wide border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Order</th>
                      <th className="px-4 py-3 text-left">Buyer</th>
                      <th className="px-4 py-3 text-left">Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Payout</th>
                      <th className="px-4 py-3 text-right">Commission</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {orders.map(o => (
                      <tr key={o.order_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-gray-800 dark:text-slate-200">{o.order_number}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{o.payment_method?.replace(/_/g,' ')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-slate-100 text-xs">{o.buyer_name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{o.buyer_email}</p>
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="text-xs text-gray-600 dark:text-slate-400 truncate">{o.items_summary}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{o.items_count} item{o.items_count !== 1 ? 's' : ''}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-gray-900 dark:text-slate-100 text-xs">{fmtMMK(o.total_amount)}</p>
                          {o.coupon_discount > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400">-{fmtMMK(o.coupon_discount)} disc.</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-green-700 dark:text-green-400 text-xs">{fmtMMK(o.seller_payout)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-xs text-red-600 dark:text-red-400">{fmtMMK(o.commission_amount)}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            ({Math.round((o.commission_rate || 0) * 100)}%)
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[o.order_status] || 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'}`}>
                            {o.order_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                          {fmtDate(o.order_date)}
                          {o.delivered_at && (
                            <p className="text-green-600 dark:text-green-400 flex items-center gap-0.5">
                              <CheckCircleIcon className="h-3 w-3" />{fmtDate(o.delivered_at)}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Export Footer ────────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={!data || exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {exporting ? 'Generating Excel…' : 'Download Full Report (.xlsx)'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
export default function SellerFinancialReportsGated(props) {
  return (
    <PlanFeatureGate feature="analytics_enabled">
      <SellerFinancialReports {...props} />
    </PlanFeatureGate>
  );
}