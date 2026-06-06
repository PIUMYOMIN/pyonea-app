import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { exportToExcel, mmkCell, todayStr } from '../../utils/exportExcel';

// ── Formatters ─────────────────────────────────────────────────────────────
const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000)         return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString();
};
const fmtMMK  = (n) => `${fmtK(n)} MMK`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Avatar initials ────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const initials    = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

// ── Stat card ──────────────────────────────────────────────────────────────
  const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 flex items-start gap-3">
    <div className={`p-2.5 rounded-lg flex-shrink-0 ${color}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const Customers = () => {
  const [customers,  setCustomers]  = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState('');
  const [sort,       setSort]       = useState('last_order');
  const [page,       setPage]       = useState(1);
  const [meta,       setMeta]       = useState({ total: 0, last_page: 1 });
  const [exporting,  setExporting]  = useState(false);
  const searchTimer = useRef(null);

  const fetchCustomers = useCallback(async (pg = 1, q = search, s = sort) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/seller/customers', {
        params: { page: pg, per_page: 15, search: q || undefined, sort: s },
      });
      if (res.data.success) {
        setCustomers(res.data.data || []);
        setMeta(res.data.meta || { total: 0, last_page: 1 });
        if (res.data.stats) setStats(res.data.stats);
      } else {
        setError(res.data.message || 'Failed to load customers.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search, sort]);

  // Initial load
  useEffect(() => { fetchCustomers(1, '', sort); }, [sort]);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchCustomers(1, val, sort), 400);
  };

  const handleSort = (val) => { setSort(val); setPage(1); };

  const handlePage = (pg) => {
    setPage(pg);
    fetchCustomers(pg, search, sort);
  };

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all pages for export
      const all = [];
      let pg = 1;
      while (true) {
        const res = await api.get('/seller/customers', {
          params: { page: pg, per_page: 100, search: search || undefined, sort },
        });
        const items = res.data.data || [];
        all.push(...items);
        if (pg >= (res.data.meta?.last_page || 1)) break;
        pg++;
      }

      const rows = [
        ['Pyonea — My Customers', `Exported: ${new Date().toLocaleString()}`],
        [],
        ['Name', 'Email', 'Phone', 'Total Orders', 'Total Spent (MMK)',
          'Avg Order (MMK)', 'Delivered Orders', 'First Order', 'Last Order'],
        ...all.map(c => [
          c.name,
          c.email,
          c.phone || '',
          c.total_orders,
          mmkCell(c.total_spent),
          mmkCell(c.avg_order_value),
          c.delivered_count,
          fmtDate(c.first_order_at),
          fmtDate(c.last_order_at),
        ]),
      ];

      if (stats) {
        rows.push(
          [],
          ['SUMMARY'],
          ['Total Customers',  stats.total_customers],
          ['Total Orders',     stats.total_orders],
          ['Total Revenue',    mmkCell(stats.total_revenue)],
          ['Avg Order Value',  mmkCell(stats.avg_order_value)],
          ['Active (30 days)', stats.active_30d],
        );
      }

      await exportToExcel(rows, 'Customers', `pyonea-customers-${todayStr()}.xlsx`);
    } catch (e) {
      alert(e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-green-600" />
            My Customers
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Buyers who have ordered from your store
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={UserGroupIcon}       label="Total Customers" value={stats.total_customers.toLocaleString()} sub={`${stats.active_30d} active (30d)`}     color="bg-green-500" />
          <StatCard icon={ShoppingBagIcon}     label="Total Orders"    value={stats.total_orders.toLocaleString()}    sub="across all customers"                     color="bg-blue-500"  />
          <StatCard icon={CurrencyDollarIcon}  label="Total Revenue"   value={fmtMMK(stats.total_revenue)}            sub="from your store"                          color="bg-purple-500"/>
          <StatCard icon={ArrowTrendingUpIcon} label="Avg Order Value" value={fmtMMK(stats.avg_order_value)}          sub="per transaction"                          color="bg-amber-500" />
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
          />
        </div>
        <div className="relative">
          <ChevronUpDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
          <select
            value={sort}
            onChange={e => handleSort(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
          >
            <option value="last_order">Sort: Recent Order</option>
            <option value="orders">Sort: Most Orders</option>
            <option value="spent">Sort: Highest Spend</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 dark:bg-slate-700 text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wide border-b border-gray-100 dark:border-slate-600">
          <span className="col-span-4">Customer</span>
          <span className="col-span-2 text-right">Orders</span>
          <span className="col-span-2 text-right">Total Spent</span>
          <span className="col-span-2 text-right">Avg Order</span>
          <span className="col-span-2 text-right">Last Order</span>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 dark:bg-slate-700/60 rounded w-1/4" />
                </div>
                <div className="hidden md:flex gap-6">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-3 bg-gray-100 dark:bg-slate-700/60 rounded w-16" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {search ? 'No customers match your search.' : 'No customers yet.'}
            </p>
            {!search && (
            <p className="text-xs mt-1 text-gray-500 dark:text-slate-400">Customers will appear here once they place an order.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {customers.map((c) => (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50/60 dark:hover:bg-slate-700/40 transition-colors">

                {/* Avatar + name */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarColor(c.name)}`}>
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{c.email}</p>
                    {c.phone && <p className="text-xs text-gray-400 dark:text-slate-500">{c.phone}</p>}
                  </div>
                </div>

                {/* Mobile: key stats inline */}
                <div className="md:hidden flex gap-4 text-xs text-gray-500 dark:text-slate-400 pl-13">
                  <span><span className="font-semibold text-gray-900 dark:text-slate-100">{c.total_orders}</span> orders</span>
                  <span><span className="font-semibold text-gray-900 dark:text-slate-100">{fmtMMK(c.total_spent)}</span></span>
                  <span>Last: {fmtDate(c.last_order_at)}</span>
                </div>

                {/* Desktop columns */}
                <div className="hidden md:flex col-span-2 items-center justify-end">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {c.total_orders}
                    {c.delivered_count > 0 && (
                  <span className="text-xs font-normal text-green-600 dark:text-green-400">
                        ({c.delivered_count}✓)
                      </span>
                    )}
                  </span>
                </div>
                <div className="hidden md:flex col-span-2 items-center justify-end">
                  <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{fmtMMK(c.total_spent)}</span>
                </div>
                <div className="hidden md:flex col-span-2 items-center justify-end">
                  <span className="text-sm text-gray-600 dark:text-slate-400">{fmtMMK(c.avg_order_value)}</span>
                </div>
                <div className="hidden md:flex col-span-2 items-center justify-end">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{fmtDate(c.last_order_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500 dark:text-slate-400 text-xs">
            {((page - 1) * 15) + 1}–{Math.min(page * 15, meta.total)} of {meta.total} customers
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
            </button>
            {[...Array(meta.last_page)].map((_, i) => {
              const pg = i + 1;
              if (meta.last_page > 7 && Math.abs(pg - page) > 2 && pg !== 1 && pg !== meta.last_page) {
                if (pg === 2 || pg === meta.last_page - 1) return <span key={pg} className="px-1 text-gray-400 dark:text-slate-500">…</span>;
                return null;
              }
              return (
                <button
                  key={pg}
                  onClick={() => handlePage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    pg === page
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => handlePage(page + 1)}
              disabled={page >= meta.last_page}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4 text-gray-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;