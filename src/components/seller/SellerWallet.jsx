import React, { useState, useEffect, useCallback } from 'react';
import {
  BanknotesIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString();
};
const fmtMMK = (n) => `${fmtK(n)} MMK`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_CONFIG = {
  outstanding: { label: 'Outstanding', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' },
  overdue:     { label: 'Overdue',     color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' },
  paid:        { label: 'Paid',        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' },
  waived:      { label: 'Waived',      color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600' },
};

const TX_TYPE_CONFIG = {
  escrow_hold:    { label: 'Escrow Hold',        color: 'text-blue-600 dark:text-blue-400',   icon: '🔒' },
  escrow_release: { label: 'Payout Released',    color: 'text-green-600 dark:text-green-400', icon: '✅' },
  escrow_reverse: { label: 'Escrow Reversed',    color: 'text-gray-500 dark:text-slate-400',  icon: '↩️' },
  refund_hold:    { label: 'Refund Deducted',    color: 'text-red-600 dark:text-red-400',     icon: '↩️' },
  withdrawal:     { label: 'Withdrawal',          color: 'text-purple-600 dark:text-purple-400', icon: '💸' },
  cod_invoice:    { label: 'COD Invoice Raised',  color: 'text-orange-600 dark:text-orange-400', icon: '📄' },
  cod_payment:    { label: 'COD Commission Paid', color: 'text-green-600 dark:text-green-400', icon: '💰' },
  adjustment:     { label: 'Adjustment',          color: 'text-gray-500 dark:text-slate-400',  icon: '⚙️' },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent }) {
  const accents = {
    green:  'border-green-400 bg-green-50 dark:bg-green-900/20',
    blue:   'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    orange: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
    red:    'border-red-400 bg-red-50 dark:bg-red-900/20',
  };
  return (
    <div className={`rounded-xl border-l-4 p-5 shadow-sm ${accents[accent] || accents.green}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{sub}</p>}
        </div>
        <Icon className="h-8 w-8 text-gray-300 dark:text-slate-600 flex-shrink-0" />
      </div>
    </div>
  );
}

function PaymentModal({ invoice, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ payment_reference: '', payment_method: 'kbz_pay', seller_notes: '' });
  const methods = [
    { value: 'kbz_pay',       label: 'KBZ Pay' },
    { value: 'wave_pay',      label: 'Wave Pay' },
    { value: 'cb_pay',        label: 'CB Pay' },
    { value: 'aya_pay',       label: 'AYA Pay' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Submit COD Commission Payment</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Invoice {invoice.invoice_number}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">Amount Due</p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-200 mt-1">{fmtMMK(invoice.commission_amount)}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Due by {fmtDate(invoice.due_date)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Method</label>
            <select
              value={form.payment_method}
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Transaction Reference *</label>
            <input
              type="text"
              placeholder="e.g. TXN-20260405-001 or screenshot ID"
              value={form.payment_reference}
              onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Any additional info for admin"
              value={form.seller_notes}
              onChange={e => setForm(f => ({ ...f, seller_notes: e.target.value }))}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <p className="text-xs text-gray-400 dark:text-slate-500">
            After submitting, the platform admin will verify and confirm your payment. Status will update once confirmed.
          </p>
        </div>
        <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(invoice.id, form)}
            disabled={!form.payment_reference || loading}
            className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            Submit Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SellerWallet() {
  const [wallet, setWallet]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices]       = useState([]);
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [loading, setLoading]         = useState(true);
  const [invLoading, setInvLoading]   = useState(false);
  const [payModal, setPayModal]       = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState(null);
  const [txExpanded, setTxExpanded]   = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, invoiceRes] = await Promise.all([
        api.get('/seller/wallet'),
        api.get('/seller/cod-invoices'),
      ]);
      setWallet(walletRes.data.data.wallet);
      setTransactions(walletRes.data.data.recent_transactions || []);
      setInvoices(invoiceRes.data.data?.data || []);
    } catch {
      showToast('error', 'Failed to load wallet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadInvoices = useCallback(async (status = '') => {
    setInvLoading(true);
    try {
      const res = await api.get('/seller/cod-invoices', { params: status ? { status } : {} });
      setInvoices(res.data.data?.data || []);
    } finally {
      setInvLoading(false);
    }
  }, []);

  const handleFilterChange = (status) => {
    setInvoiceFilter(status);
    loadInvoices(status);
  };

  const handleSubmitPayment = async (invoiceId, form) => {
    setSubmitting(true);
    try {
      await api.post(`/seller/cod-invoices/${invoiceId}/submit-payment`, form);
      showToast('success', 'Payment submitted. Awaiting admin confirmation.');
      setPayModal(null);
      load();
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  const hasOutstanding = (wallet?.cod_commission_outstanding || 0) > 0;
  const displayTx = txExpanded ? transactions : transactions.slice(0, 8);

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Wallet</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Track your earnings, escrow, and COD commission invoices.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700">
          <ArrowPathIcon className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Outstanding COD warning banner */}
      {hasOutstanding && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">COD Commission Outstanding</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
              You owe <strong>{fmtMMK(wallet.cod_commission_outstanding)}</strong> in COD commission to the platform.
              Please settle outstanding invoices below to avoid account restrictions.
            </p>
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={LockClosedIcon}
          label="In Escrow"
          value={fmtMMK(wallet?.escrow_balance)}
          sub="Held until delivery confirmed"
          accent="blue"
        />
        <StatCard
          icon={BanknotesIcon}
          label="Available Balance"
          value={fmtMMK(wallet?.available_balance)}
          sub="Released after delivery"
          accent="green"
        />
        <StatCard
          icon={ArrowDownTrayIcon}
          label="Total Earned"
          value={fmtMMK(wallet?.total_earned)}
          sub="Lifetime seller payout"
          accent="green"
        />
        <StatCard
          icon={DocumentTextIcon}
          label="COD Outstanding"
          value={fmtMMK(wallet?.cod_commission_outstanding)}
          sub="Commission owed to platform"
          accent={hasOutstanding ? 'red' : 'orange'}
        />
      </div>

      {/* Policy Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-900 dark:text-amber-300 space-y-1">
        <p className="font-semibold">Platform Commission Policy</p>
        <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
          <li><strong>Digital payments (KBZ Pay, Wave Pay, etc.):</strong> Your payout is held in escrow until the buyer confirms delivery. Commission is deducted automatically at release.</li>
          <li><strong>Cash on Delivery (COD):</strong> You collect full payment from the buyer. A commission invoice is raised after delivery — you must pay this to the platform within 7 days.</li>
          <li><strong>Refunds:</strong> Commission is non-refundable. If an order is refunded, the buyer receives the product amount minus commission, which is retained by the platform.</li>
        </ul>
      </div>

      {/* Recent Wallet Transactions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wallet Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No transactions yet.</p>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Available After</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {displayTx.map(tx => {
                  const cfg = TX_TYPE_CONFIG[tx.type] || { label: tx.type, color: 'text-gray-600 dark:text-slate-400', icon: '•' };
                  const isCredit = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg.icon}</span>
                          <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        {tx.notes && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate max-w-xs">{tx.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{tx.order_number || '—'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isCredit ? '+' : ''}{fmtMMK(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-slate-400">{fmtMMK(tx.available_balance_after)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-500">{fmtDate(tx.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {transactions.length > 8 && (
              <div className="border-t border-gray-100 dark:border-slate-700 p-3 text-center">
                <button
                  onClick={() => setTxExpanded(e => !e)}
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1 mx-auto"
                >
                  {txExpanded ? <><ChevronUpIcon className="h-4 w-4" /> Show less</> : <><ChevronDownIcon className="h-4 w-4" /> Show all {transactions.length} transactions</>}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* COD Commission Invoices */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">COD Commission Invoices</h2>
          <div className="flex flex-wrap gap-2">
            {['', 'outstanding', 'overdue', 'paid', 'waived'].map(s => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                  invoiceFilter === s
                    ? 'bg-green-600 text-white border-green-600'
                    : 'text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {invLoading ? (
          <div className="flex justify-center py-8"><ArrowPathIcon className="h-6 w-6 text-gray-400 dark:text-slate-500 animate-spin" /></div>
        ) : invoices.length === 0 ? (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
            <DocumentTextIcon className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-slate-400">No COD invoices found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => {
              const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.outstanding;
              const canPay = ['outstanding', 'overdue'].includes(inv.status) && !inv.paid_at;
              const pendingConfirmation = ['outstanding', 'overdue'].includes(inv.status) && inv.paid_at;

              return (
                <div key={inv.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{inv.invoice_number}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {pendingConfirmation && (
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            Awaiting Admin Confirmation
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Order: <span className="font-medium">{inv.order?.order_number || inv.order_id}</span>
                        {' · '}Due: <span className={inv.status === 'overdue' ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>{fmtDate(inv.due_date)}</span>
                      </p>
                      {inv.payment_reference && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Ref: {inv.payment_reference}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtMMK(inv.commission_amount)}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {(inv.commission_rate * 100).toFixed(1)}% of {fmtMMK(inv.order_subtotal)}
                      </p>
                      {canPay && (
                        <button
                          onClick={() => setPayModal(inv)}
                          className="mt-2 text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {payModal && (
        <PaymentModal
          invoice={payModal}
          onClose={() => setPayModal(null)}
          onSubmit={handleSubmitPayment}
          loading={submitting}
        />
      )}
    </div>
  );
}