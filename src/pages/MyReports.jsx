// src/pages/MyReports.jsx
// User-facing report history, detail view, and reply interface.
// Route: /my-reports  and  /my-reports/:ticket_id

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  TicketIcon, ArrowLeftIcon, ChatBubbleLeftRightIcon,
  PaperClipIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
  ExclamationTriangleIcon, ArrowPathIcon, PlusIcon,
  ChevronRightIcon, FlagIcon,
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import ReportForm from '../components/reports/ReportForm';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open:       { label: 'Open',        cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',       dot: 'bg-blue-500' },
  in_review:  { label: 'In Review',   cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', dot: 'bg-purple-500' },
  waiting:    { label: 'Waiting',     cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', dot: 'bg-yellow-500' },
  resolved:   { label: 'Resolved',    cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',    dot: 'bg-green-500' },
  closed:     { label: 'Closed',      cls: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400',         dot: 'bg-gray-400' },
  rejected:   { label: 'Rejected',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',            dot: 'bg-red-400' },
};

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      cls: 'text-gray-500' },
  medium:   { label: 'Medium',   cls: 'text-blue-600 dark:text-blue-400' },
  high:     { label: 'High',     cls: 'text-orange-600 dark:text-orange-400' },
  critical: { label: 'Critical', cls: 'text-red-600 dark:text-red-400 font-bold' },
};

const CATEGORY_LABELS = {
  bug: 'Bug', payment: '💳 Payment', order: 'Order',
  seller: 'Seller', product: '📋 Product', account: 'Account',
  content: 'Content', billing: '🧾 Billing', delivery: 'Delivery',
  safety: 'Safety', suggestion: '💡 Suggestion', other: 'Other',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const fmtRelative = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const attachmentHref = (attachment) =>
  attachment?.url ||
  attachment?.file_url ||
  (attachment?.path ? `/storage/${attachment.path}` : '#');

const attachmentLabel = (attachment, index) =>
  attachment?.name || attachment?.filename || `Attachment ${index + 1}`;

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── TicketCard ────────────────────────────────────────────────────────────────

function TicketCard({ report, onClick }) {
  const pri = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.medium;
  return (
    <button onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-green-600 dark:text-green-400">
              {report.ticket_id}
            </span>
            <StatusBadge status={report.status} />
            <span className={`text-xs ${pri.cls}`}>{pri.label}</span>
          </div>
          <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm truncate">{report.subject}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-slate-400">
            <span>{CATEGORY_LABELS[report.category] || report.category}</span>
            <span>·</span>
            <span>{fmtRelative(report.created_at)}</span>
            {report.comments?.length > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                  {report.comments.length}
                </span>
              </>
            )}
          </div>
        </div>
        <ChevronRightIcon className="h-4 w-4 text-gray-400 shrink-0 mt-1 group-hover:text-green-500 transition-colors" />
      </div>
      {report.resolution && (
        <div className="mt-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-1.5">
          ✓ {report.resolution}
        </div>
      )}
    </button>
  );
}

// ── TicketDetail ──────────────────────────────────────────────────────────────

function TicketDetail({ ticketId, onBack }) {
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply,   setReply]   = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/reports/${ticketId}`);
      setReport(res.data.data);
    } catch {
      setError('Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async () => {
    if (reply.trim().length < 5) return;
    setSending(true);
    try {
      await api.post(`/reports/${ticketId}/comments`, { body: reply.trim() });
      setReply('');
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <ArrowPathIcon className="h-7 w-7 text-gray-400 animate-spin" />
    </div>
  );

  if (error || !report) return (
    <div className="text-center py-12 text-red-500">{error || 'Ticket not found.'}</div>
  );

  const pri    = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.medium;
  const isClosed = ['resolved', 'closed', 'rejected'].includes(report.status);

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back to my reports
      </button>

      {/* Ticket header */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono font-bold text-green-600 dark:text-green-400">{report.ticket_id}</span>
          <StatusBadge status={report.status} />
          <span className={`text-xs font-semibold ${pri.cls}`}>{pri.label} priority</span>
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">{fmtDate(report.created_at)}</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{report.subject}</h1>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          {CATEGORY_LABELS[report.category]} · SLA: {report.sla_hours}h response target
          {report.sla_breached && (
            <span className="ml-2 text-red-500 font-semibold">⚠ SLA breached</span>
          )}
        </p>

        <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
          {report.description}
        </div>

        {report.resolution && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm">
            <p className="font-semibold text-green-800 dark:text-green-300 mb-1 flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4" /> Resolution
            </p>
            <p className="text-green-700 dark:text-green-400">{report.resolution}</p>
          </div>
        )}

        {report.attachments?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {report.attachments.map((a, i) => (
              <a key={i} href={attachmentHref(a)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 transition-colors">
                <PaperClipIcon className="h-3.5 w-3.5" />
                {attachmentLabel(a, i)}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Comments thread */}
      {report.comments?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
            Conversation ({report.comments.length})
          </h3>
          {report.comments.map(c => (
            <div key={c.id}
              className={`flex gap-3 ${c.author_type === 'reporter' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                c.author_type === 'admin'    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                c.author_type === 'system'   ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400' :
                                               'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>
                {c.author_type === 'admin' ? 'S' : c.author_type === 'system' ? '⚙' : 'Y'}
              </div>
              <div className={`flex-1 max-w-[80%] ${c.author_type === 'reporter' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  c.author_type === 'reporter'
                    ? 'bg-green-600 text-white rounded-tr-sm'
                    : c.author_type === 'system'
                    ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 italic text-xs'
                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-tl-sm'
                }`}>
                  {c.body}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {c.author_type === 'admin' ? 'Support Team' : c.author_type === 'system' ? 'System' : 'You'}
                  </span>
                  <span className="text-xs text-gray-300 dark:text-slate-600">·</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{fmtRelative(c.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply box */}
      {!isClosed ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">Add a reply</p>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            placeholder="Provide additional information, updates, or questions…"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <div className="flex justify-end mt-2">
            <button onClick={handleReply}
              disabled={sending || reply.trim().length < 5}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2">
              {sending && <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Send Reply
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-400 dark:text-slate-500">
          This ticket is {report.status}. Open a new report if you need further assistance.
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyReports() {
  const { ticket_id }           = useParams();
  const navigate                = useNavigate();
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState('all');
  const [meta,     setMeta]     = useState({ current_page: 1, last_page: 1 });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/reports', { params: { page } });
      const paginated = res.data.data;
      setReports(paginated?.data || paginated || []);
      setMeta({
        current_page: paginated?.current_page || 1,
        last_page:    paginated?.last_page    || 1,
      });
    } catch { /* handled by 401 interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const filtered = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter);

  const counts = {
    all:      reports.length,
    open:     reports.filter(r => r.status === 'open').length,
    in_review:reports.filter(r => r.status === 'in_review').length,
    waiting:  reports.filter(r => r.status === 'waiting').length,
    resolved: reports.filter(r => ['resolved','closed'].includes(r.status)).length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  };

  // ── Detail view ──
  if (ticket_id) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <TicketDetail ticketId={ticket_id} onBack={() => navigate('/my-reports')} />
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <TicketIcon className="h-6 w-6 text-green-600" />
              My Reports
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Track all your support tickets and system reports
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <PlusIcon className="h-4 w-4" /> New Report
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-1 mb-4 overflow-x-auto">
          {[
            { key: 'all',       label: 'All' },
            { key: 'open',      label: 'Open' },
            { key: 'in_review', label: 'In Review' },
            { key: 'waiting',   label: 'Waiting' },
            { key: 'resolved',  label: 'Resolved' },
            { key: 'rejected',  label: 'Rejected' },
          ].map(f => (
            <button key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}>
              {f.label}
              {counts[f.key] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                }`}>{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <ArrowPathIcon className="h-7 w-7 text-gray-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
            <TicketIcon className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 dark:text-slate-300 mb-1">
              {filter === 'all' ? 'No reports yet' : `No ${filter.replace('_', ' ')} tickets`}
            </p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mb-4">
              Found a bug or issue? We want to hear about it.
            </p>
            <button onClick={() => setShowForm(true)}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Submit First Report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <TicketCard key={r.id} report={r}
                onClick={() => navigate(`/my-reports/${r.ticket_id}`)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div className="flex justify-center gap-2 pt-3">
            <button
              onClick={() => load(meta.current_page - 1)}
              disabled={meta.current_page <= 1 || loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-500 dark:text-slate-400">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <button
              onClick={() => load(meta.current_page + 1)}
              disabled={meta.current_page >= meta.last_page || loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        )}

        {/* Info banner */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm">
          <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4" /> Response Times
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-700 dark:text-blue-400 mt-1">
            <span>🔴 Critical — 4 hours</span>
            <span>🟠 High — 12 hours</span>
            <span>🔵 Medium — 48 hours</span>
            <span>⚪ Low — 5 days</span>
          </div>
        </div>
      </div>

      <ReportForm isOpen={showForm} onClose={() => { setShowForm(false); load(); }} />
    </div>
  );
}