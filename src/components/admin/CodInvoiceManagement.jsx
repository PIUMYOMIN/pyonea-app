import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString();
};
const fmtMMK   = (n) => `${fmtK(n)} MMK`;
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_CONFIG = {
  outstanding: { label: 'Outstanding', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },
  overdue:     { label: 'Overdue',     bg: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800' },
  paid:        { label: 'Paid',        bg: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' },
  waived:      { label: 'Waived',      bg: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-600' },
};

// ── Confirm Modal ──────────────────────────────────────────────────────────

function ConfirmModal({ invoice, mode, onClose, onConfirm, loading }) {
  const [notes, setNotes] = useState('');
  const isConfirm = mode === 'confirm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {isConfirm ? 'Confirm COD Payment Receipt' : 'Waive Invoice'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{invoice.invoice_number}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-slate-600 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Seller</span>
              <span className="font-medium dark:text-slate-200">{invoice.seller?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Order</span>
              <span className="font-medium dark:text-slate-200">{invoice.order?.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Commission Due</span>
              <span className="font-bold text-gray-900 dark:text-slate-100">{fmtMMK(invoice.commission_amount)}</span>
            </div>
            {isConfirm && invoice.payment_reference && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Payment Ref</span>
                <span className="font-medium text-green-700 dark:text-green-400">{invoice.payment_reference}</span>
              </div>
            )}
            {isConfirm && invoice.payment_method && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Method</span>
                <span className="font-medium dark:text-slate-200">{invoice.payment_method?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              </div>
            )}
            {isConfirm && invoice.seller_notes && (
              <div className="pt-2 border-t border-gray-100 dark:border-slate-600">
                <p className="text-gray-500 dark:text-slate-400 text-xs">Seller Note:</p>
                <p className="text-gray-700 dark:text-slate-300 mt-0.5">{invoice.seller_notes}</p>
              </div>
            )}
          </div>

          {!isConfirm && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-300">
              Waiving removes the obligation — the seller will not need to pay this commission. Use only for disputes or refunds.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Admin Notes {!isConfirm && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              placeholder={isConfirm ? 'Optional notes for records...' : 'Reason for waiving (required)'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(invoice.id, { admin_notes: notes })}
            disabled={loading || (!isConfirm && !notes.trim())}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
              isConfirm ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {isConfirm ? 'Confirm Receipt' : 'Waive Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CodInvoiceManagement() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(null); // { invoice, mode: 'confirm'|'waive' }
  const [acting, setActing]     = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async (status = filter) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/cod-invoices', { params: status ? { status } : {} });
      setData(res.data.data);
    } catch {
      showToast('error', 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (s) => {
    setFilter(s);
    load(s);
  };

  const handleConfirm = async (invoiceId, body) => {
    setActing(true);
    try {
      await api.post(`/admin/cod-invoices/${invoiceId}/confirm-payment`, body);
      showToast('success', 'Payment confirmed. Seller wallet updated.');
      setModal(null);
      load();
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Action failed.');
    } finally {
      setActing(false);
    }
  };

  const handleWaive = async (invoiceId, body) => {
    setActing(true);
    try {
      await api.post(`/admin/cod-invoices/${invoiceId}/waive`, body);
      showToast('success', 'Invoice waived.');
      setModal(null);
      load();
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Action failed.');
    } finally {
      setActing(false);
    }
  };

  const invoices = (data?.invoices?.data || []).filter(inv => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.seller?.name?.toLowerCase().includes(q) ||
      inv.order?.order_number?.toLowerCase().includes(q)
    );
  });

  const summary = data?.summary || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">COD Commission Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Track and confirm commission payments from sellers who received cash on delivery.</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700">
          <ArrowPathIcon className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Outstanding',         value: summary.outstanding_count || 0,  sub: fmtMMK(summary.outstanding_amount), icon: ClockIcon,              color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'Overdue',             value: summary.overdue_count || 0,      sub: 'Past due date',                    icon: ExclamationTriangleIcon, color: 'border-red-400 bg-red-50 dark:bg-red-900/20' },
          { label: 'Total Outstanding',   value: fmtMMK(summary.outstanding_amount), sub: 'To be collected',              icon: BanknotesIcon,           color: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Collected This Month',value: fmtMMK(summary.collected_this_month), sub: 'COD commissions',            icon: CheckCircleIcon,         color: 'border-green-400 bg-green-50 dark:bg-green-900/20' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border-l-4 p-5 shadow-sm ${card.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">{card.value}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{card.sub}</p>
              </div>
              <card.icon className="h-8 w-8 text-gray-300 dark:text-slate-600 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search invoice, seller, order…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'outstanding', 'overdue', 'paid', 'waived'].map(s => (
            <button
              key={s}
              onClick={() => handleFilterChange(s)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                filter === s
                  ? 'bg-green-600 text-white border-green-600'
                  : 'text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><ArrowPathIcon className="h-8 w-8 text-gray-400 dark:text-slate-500 animate-spin" /></div>
      ) : invoices.length === 0 ? (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-12 text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400">No invoices found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wide border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3 text-left">Invoice</th>
                  <th className="px-5 py-3 text-left">Seller</th>
                  <th className="px-5 py-3 text-left">Order</th>
                  <th className="px-5 py-3 text-right">Commission</th>
                  <th className="px-5 py-3 text-left">Due Date</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Payment Ref</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {invoices.map(inv => {
                  const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.outstanding;
                  const pendingPayment = ['outstanding', 'overdue'].includes(inv.status) && inv.paid_at;
                  const canAct = ['outstanding', 'overdue'].includes(inv.status);

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-semibold text-gray-800 dark:text-slate-100">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{fmtDate(inv.created_at)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 dark:text-slate-100">{inv.seller?.name || '—'}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{inv.seller?.email}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-700 dark:text-slate-300">
                        {inv.order?.order_number || inv.order_id}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="font-bold text-gray-900 dark:text-slate-100">{fmtMMK(inv.commission_amount)}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{(inv.commission_rate * 100).toFixed(1)}% commission</p>
                      </td>
                      <td className={`px-5 py-4 text-sm ${inv.status === 'overdue' ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-slate-400'}`}>
                        {fmtDate(inv.due_date)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                        {pendingPayment && (
                          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Pending Confirmation
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-slate-400 max-w-32 truncate">
                        {inv.payment_reference || '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canAct && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setModal({ invoice: inv, mode: 'confirm' })}
                              className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setModal({ invoice: inv, mode: 'waive' })}
                              className="text-xs font-medium text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                            >
                              Waive
                            </button>
                          </div>
                        )}
                        {inv.status === 'paid' && (
                          <span className="text-xs text-gray-400 dark:text-slate-500">Confirmed {fmtDate(inv.confirmed_at)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ConfirmModal
          invoice={modal.invoice}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onConfirm={modal.mode === 'confirm' ? handleConfirm : handleWaive}
          loading={acting}
        />
      )}
    </div>
  );
}
 