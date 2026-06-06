// src/components/admin/ReportManagement.jsx
// Admin panel — list, filter, assign, update, and reply to support tickets.

import React, { useState, useEffect, useCallback } from 'react';
import {
  TicketIcon, FunnelIcon, MagnifyingGlassIcon, ArrowPathIcon,
  ChevronDownIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
  UserIcon, ChatBubbleLeftRightIcon, ExclamationTriangleIcon,
  LockClosedIcon, EyeIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open:       { label: 'Open',       cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  in_review:  { label: 'In Review',  cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  waiting:    { label: 'Waiting',    cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  resolved:   { label: 'Resolved',   cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  closed:     { label: 'Closed',     cls: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400' },
  rejected:   { label: 'Rejected',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const PRIORITY_CONFIG = {
  critical: { cls: 'text-red-600 dark:text-red-400 font-bold', bar: 'bg-red-500' },
  high:     { cls: 'text-orange-600 dark:text-orange-400',      bar: 'bg-orange-500' },
  medium:   { cls: 'text-blue-600 dark:text-blue-400',          bar: 'bg-blue-500' },
  low:      { cls: 'text-gray-500 dark:text-slate-400',         bar: 'bg-gray-300 dark:bg-slate-600' },
};

const CATEGORY_LABELS = {
  bug: 'Bug', payment: 'Payment', order: 'Order',
  seller: 'Seller', product: 'Product', account: 'Account',
  content: 'Content', billing: 'Billing', delivery: 'Delivery',
  safety: 'Safety', suggestion: 'Suggestion', other: 'Other',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';
const fmtRelative = (d) => {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

const attachmentHref = (attachment) =>
  attachment?.url ||
  attachment?.file_url ||
  (attachment?.path ? `/storage/${attachment.path}` : '#');

const attachmentLabel = (attachment, index) =>
  attachment?.name || attachment?.filename || `Attachment ${index + 1}`;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className={`bg-white dark:bg-slate-800 border-l-4 ${color} rounded-xl p-4 shadow-sm`}>
      <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">{value}</p>
    </div>
  );
}

// ── TicketDetailPanel ─────────────────────────────────────────────────────────

function TicketDetailPanel({ ticketId, onClose, onUpdated }) {
  const { user }              = useAuth();
  const [report,   setReport] = useState(null);
  const [loading,  setLoad]   = useState(true);
  const [reply,    setReply]  = useState('');
  const [isInternal, setIsInt]= useState(false);
  const [sending,  setSend]   = useState(false);
  const [updating, setUpd]    = useState(false);
  const [fields,   setFields] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/reports/${ticketId}`);
      const r = res.data.data;
      setReport(r);
      setFields({ status: r.status, priority: r.priority, resolution: r.resolution || '', admin_notes: r.admin_notes || '' });
    } catch { } finally { setLoad(false); }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async () => {
    setUpd(true);
    try {
      await api.patch(`/admin/reports/${ticketId}`, fields);
      load();
      onUpdated?.();
    } finally { setUpd(false); }
  };

  const handleReply = async () => {
    if (reply.trim().length < 2) return;
    setSend(true);
    try {
      await api.post(`/admin/reports/${ticketId}/comments`, {
        body: reply.trim(), is_internal: isInternal,
      });
      setReply('');
      load();
      onUpdated?.();
    } finally { setSend(false); }
  };

  const handleAssignSelf = async () => {
    await api.patch(`/admin/reports/${ticketId}`, { assigned_to: user.id, status: 'in_review' });
    setFields(f => ({ ...f, status: 'in_review' }));
    load(); onUpdated?.();
  };

  if (loading) return <div className="flex justify-center py-16"><ArrowPathIcon className="h-7 w-7 text-gray-400 animate-spin" /></div>;
  if (!report) return <div className="text-center py-8 text-red-500">Not found.</div>;

  const pri = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.medium;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-green-600 dark:text-green-400 text-lg">{report.ticket_id}</span>
            <StatusBadge status={report.status} />
            <span className={`text-sm font-semibold uppercase ${pri.cls}`}>{report.priority}</span>
            {report.sla_breached && (
              <span className="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                <ExclamationTriangleIcon className="h-3.5 w-3.5" /> SLA Breached
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 mt-1">{report.subject}</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {CATEGORY_LABELS[report.category]} · {fmtDate(report.created_at)}
            {report.reporter
              ? ` · ${report.reporter.name} (${report.reporter.email})`
              : report.guest_name
                ? ` · ${report.guest_name} (${report.guest_email || 'no email'}) [guest]`
                : ''}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-xl font-bold px-2">✕</button>
      </div>

      {/* Description */}
      <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
        {report.description}
      </div>

      {/* Attachments */}
      {report.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {report.attachments.map((attachment, index) => (
            <a
              key={attachment.id || `${attachment.path || attachment.url}-${index}`}
              href={attachmentHref(attachment)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 transition-colors"
            >
              <EyeIcon className="h-3.5 w-3.5" />
              {attachmentLabel(attachment, index)}
            </a>
          ))}
        </div>
      )}

      {/* Reporter IP / locale (admin only) */}
      <div className="flex gap-4 text-xs text-gray-400 dark:text-slate-500">
        {report.reporter_ip && <span>IP: {report.reporter_ip}</span>}
        {report.reporter_locale && <span>Locale: {report.reporter_locale}</span>}
        {report.first_response_at
          ? <span className="text-green-600 dark:text-green-400">First response: {fmtDate(report.first_response_at)}</span>
          : <span className="text-orange-500">No response yet</span>}
      </div>

      {/* Admin controls */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Admin Controls</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Status</label>
            <select value={fields.status} onChange={e => setFields(f => ({ ...f, status: e.target.value }))}
              className="w-full text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:outline-none">
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Priority</label>
            <select value={fields.priority} onChange={e => setFields(f => ({ ...f, priority: e.target.value }))}
              className="w-full text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:outline-none">
              {['low','medium','high','critical'].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Resolution (shown to user)</label>
          <input value={fields.resolution} onChange={e => setFields(f => ({ ...f, resolution: e.target.value }))}
            placeholder="Brief resolution summary…"
            className="w-full text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:outline-none" />
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">Admin Notes (internal only)</label>
          <textarea value={fields.admin_notes} onChange={e => setFields(f => ({ ...f, admin_notes: e.target.value }))}
            rows={2} placeholder="Internal notes for admin team…"
            className="w-full text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
        </div>

        <div className="flex gap-2">
          <button onClick={handleUpdate} disabled={updating}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
            {updating ? 'Saving…' : 'Save Changes'}
          </button>
          {!report.assignee && (
            <button onClick={handleAssignSelf}
              className="px-4 py-2 border border-green-500 text-green-600 dark:text-green-400 text-sm font-semibold rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
              Assign to me
            </button>
          )}
        </div>

        {report.assignee && (
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Assigned to <strong>{report.assignee.name}</strong> on {fmtDate(report.assigned_at)}
          </p>
        )}
      </div>

      {/* Comments */}
      {report.comments?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
            Thread ({report.comments.length})
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {report.comments.map(c => (
              <div key={c.id} className={`rounded-xl px-4 py-3 text-sm ${
                c.is_internal
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  : c.author_type === 'reporter'
                  ? 'bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 flex items-center gap-1">
                    {c.is_internal && <LockClosedIcon className="h-3 w-3 text-amber-500" />}
                    {c.author_name}
                    {c.is_internal && <span className="text-amber-600 dark:text-amber-400">(internal)</span>}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{fmtRelative(c.created_at)}</span>
                </div>
                <p className="text-gray-700 dark:text-slate-300">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">Reply</p>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={isInternal} onChange={e => setIsInt(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600" />
            <LockClosedIcon className="h-3.5 w-3.5 text-amber-500" />
            Internal note (admin only)
          </label>
        </div>
        <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3}
          placeholder={isInternal ? 'Write an internal note (not shown to reporter)…' : 'Write a reply to the reporter…'}
          className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none resize-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 ${
            isInternal ? 'border-amber-300 dark:border-amber-700' : 'border-gray-300 dark:border-slate-600'
          }`} />
        <button onClick={handleReply} disabled={sending || reply.trim().length < 2}
          className={`w-full py-2 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
            isInternal ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}>
          {sending ? 'Sending…' : isInternal ? '🔒 Save Internal Note' : '↩ Send Reply to Reporter'}
        </button>
      </div>

      {/* Admin notes */}
      <div>
        <p className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">Admin Notes</p>
        <pre className="text-xs text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 whitespace-pre-wrap">
          {report.admin_notes || '(none)'}
        </pre>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReportManagement() {
  const [reports,  setReports]  = useState([]);
  const [summary,  setSummary]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);   // ticket_id
  const [filters,  setFilters]  = useState({ status: '', category: '', priority: '', search: '', assigned_to: '' });
  const [page,     setPage]     = useState(1);
  const [meta,     setMeta]     = useState({});

  const setF = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const res = await api.get('/admin/reports', { params });
      setReports(res.data.data?.data || []);
      setSummary(res.data.summary || {});
      setMeta(res.data.data || {});
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); setPage(1); }, [filters]);

  const SELECT_CLS = 'text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 focus:ring-2 focus:ring-green-500 focus:outline-none';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-green-600" />
            Report Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Manage all user support tickets and system reports
          </p>
        </div>
        <button onClick={() => load(page)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Open"        value={summary.open      ?? 0} color="border-blue-500" />
        <SummaryCard label="In Review"   value={summary.in_review ?? 0} color="border-purple-500" />
        <SummaryCard label="Critical"    value={summary.critical  ?? 0} color="border-red-500" />
        <SummaryCard label="SLA Breached"value={summary.sla_breached ?? 0} color="border-orange-500" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={filters.search} onChange={setF('search')}
              placeholder="Search ticket ID or subject…"
              className={`${SELECT_CLS} pl-9 w-full`} />
          </div>
          <select value={filters.status} onChange={setF('status')} className={SELECT_CLS}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <select value={filters.priority} onChange={setF('priority')} className={SELECT_CLS}>
            <option value="">All Priorities</option>
            {['critical','high','medium','low'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <select value={filters.category} onChange={setF('category')} className={SELECT_CLS}>
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filters.assigned_to} onChange={setF('assigned_to')} className={SELECT_CLS}>
            <option value="">All</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {/* Main layout — list + detail */}
      <div className={`flex gap-4 ${selected ? 'flex-col lg:flex-row' : ''}`}>

        {/* List */}
        <div className={selected ? 'lg:w-2/5' : 'w-full'}>
          {loading && reports.length === 0 ? (
            <div className="flex justify-center py-16">
              <ArrowPathIcon className="h-7 w-7 text-gray-400 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <TicketIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No reports match the current filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map(r => {
                const pri = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
                return (
                  <button key={r.id}
                    onClick={() => setSelected(selected === r.ticket_id ? null : r.ticket_id)}
                    className={`w-full text-left border rounded-xl p-4 transition-all ${
                      selected === r.ticket_id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-green-400 dark:hover:border-green-600 hover:shadow-sm'
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {/* Priority bar */}
                          <div className={`w-1.5 h-4 rounded-full ${pri.bar} shrink-0`} />
                          <span className="font-mono text-xs font-bold text-green-600 dark:text-green-400">{r.ticket_id}</span>
                          <StatusBadge status={r.status} />
                          {r.sla_breached && (
                            <span className="text-xs text-red-500 font-bold">⚠ SLA</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{r.subject}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-slate-400">
                          <span>{CATEGORY_LABELS[r.category]}</span>
                          {r.reporter
                            ? <><span>·</span><span>{r.reporter.name}</span></>
                            : r.guest_name
                              ? <><span>·</span><span>{r.guest_name} [guest]</span></>
                              : null}
                          <span>·</span>
                          <span>{fmtRelative(r.created_at)}</span>
                          {r.comments?.length > 0 && (
                            <><span>·</span>
                            <span className="flex items-center gap-0.5">
                              <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                              {r.comments.length}
                            </span></>
                          )}
                        </div>
                      </div>
                      {r.assignee ? (
                        <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-gray-500 dark:text-slate-400 shrink-0">
                          {r.assignee.name}
                        </span>
                      ) : (
                        <span className="text-xs text-orange-500 font-semibold shrink-0">Unassigned</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Pagination */}
              {meta.last_page > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => { setPage(p); load(p); }}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                        p === page
                          ? 'bg-green-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}>{p}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 overflow-y-auto max-h-[80vh]">
            <TicketDetailPanel
              ticketId={selected}
              onClose={() => setSelected(null)}
              onUpdated={() => load(page)}
            />
          </div>
        )}
      </div>
    </div>
  );
}