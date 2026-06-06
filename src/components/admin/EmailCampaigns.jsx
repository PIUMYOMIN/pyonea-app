// src/components/admin/EmailCampaigns.jsx
// Admin email campaign manager — compose, audience, preview, send
import React, { useState, useEffect, useCallback } from 'react';
import {
  EnvelopeIcon, PaperAirplaneIcon, ChartBarIcon,
  PencilSquareIcon, EyeIcon, PlusIcon, TrashIcon,
  ExclamationCircleIcon, CheckCircleIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import DOMPurify from 'dompurify';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

const STATUS_COLORS = {
  draft:      'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
  scheduled:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  sending:    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  sent:       'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  cancelled:  'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

const AUDIENCE_LABELS = {
  newsletter_subscribers: '📧 Newsletter subscribers',
  all_buyers:             '🛍️ All buyers',
  all_sellers:            '🏪 All sellers',
  buyers_by_city:         '📍 Buyers by city',
  sellers_by_tier:        '⭐ Sellers by tier',
  custom_ids:             '🎯 Custom list',
};

// ── Campaign Form ─────────────────────────────────────────────────────────────
const CampaignForm = ({ initial, onSaved, onCancel }) => {
  const blank = { name:'', subject:'', body_html:'', audience:'newsletter_subscribers', audience_filter:{} };
  const [form,      setForm]      = useState(initial || blank);
  const [preview,   setPreview]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [recCount,  setRecCount]  = useState(null);
  const [previewLoading, setPL]   = useState(false);
  const [error,     setError]     = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setFilter = (k, v) => setForm(p => ({ ...p, audience_filter: { ...p.audience_filter, [k]: v } }));

  const loadPreview = async () => {
    if (!form.subject) return;
    setPL(true);
    try {
      if (initial?.id) {
        const r = await api.get(`/admin/newsletter/campaigns/${initial.id}/preview`);
        setRecCount(r.data.recipient_count);
      }
    } catch {} finally { setPL(false); }
  };

  useEffect(() => { loadPreview(); }, [form.audience, JSON.stringify(form.audience_filter)]);

  const save = async () => {
    if (!form.name || !form.subject || !form.body_html) { setError('Name, subject and content are required.'); return; }
    setSaving(true); setError('');
    try {
      if (initial?.id) {
        await api.put(`/admin/newsletter/campaigns/${initial.id}`, form);
      } else {
        await api.post('/admin/newsletter/campaigns', form);
      }
      onSaved();
    } catch (e) { setError(e.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{initial ? 'Edit Campaign' : 'New Campaign'}</h3>
        <button onClick={onCancel} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">✕</button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"><ExclamationCircleIcon className="h-4 w-4"/>{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Campaign Name (internal)</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. March Promo"
            className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-green-500 focus:outline-none"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Subject Line</label>
          <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="What buyers will see in their inbox"
            className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-green-500 focus:outline-none"/>
        </div>
      </div>

      {/* Audience */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Audience</label>
        <select value={form.audience} onChange={e => set('audience', e.target.value)}
          className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:outline-none">
          {Object.entries(AUDIENCE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {form.audience === 'buyers_by_city' && (
          <input value={form.audience_filter?.city || ''} onChange={e => setFilter('city', e.target.value)}
            placeholder="City name (e.g. Yangon)"
            className="mt-2 w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-green-500 focus:outline-none"/>
        )}
        {form.audience === 'sellers_by_tier' && (
          <select value={form.audience_filter?.tier || 'gold'} onChange={e => setFilter('tier', e.target.value)}
            className="mt-2 w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:outline-none">
            <option value="bronze">🥉 Bronze tier</option>
            <option value="silver">🥈 Silver tier</option>
            <option value="gold">🥇 Gold tier</option>
          </select>
        )}
        {recCount !== null && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
            <UserGroupIcon className="h-3.5 w-3.5"/>
            {previewLoading ? 'Counting recipients…' : `Estimated ${recCount.toLocaleString()} recipient${recCount !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Email Content (HTML supported)</label>
          <button onClick={() => setPreview(v => !v)}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${preview ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
            <EyeIcon className="h-3.5 w-3.5"/>{preview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {preview ? (
          <div className="border border-gray-200 dark:border-slate-600 rounded-xl min-h-[200px] max-h-[400px] overflow-y-auto p-4 text-sm text-gray-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-700"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.body_html || '<em class="text-gray-400">No content yet.</em>') }}/>
        ) : (
          <textarea value={form.body_html} onChange={e => set('body_html', e.target.value)}
            placeholder="<h2>Subject headline</h2><p>Your message here. You can use HTML for formatting.</p><p><a href='https://pyonea.com'>Shop Now</a></p>"
            rows={10}
            className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-mono bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"/>
        )}
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Tip: Use simple HTML. Add links with &lt;a href="..."&gt;. An unsubscribe link is added automatically for newsletter subscribers.</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : initial ? 'Update Campaign' : 'Create Campaign'}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const EmailCampaigns = () => {
  const [campaigns,   setCampaigns]   = useState([]);
  const [subscribers, setSubscribers] = useState({ total:0, unconfirmed:0 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [view,        setView]        = useState('campaigns'); // campaigns|subscribers
  const [showForm,    setShowForm]    = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [sending,     setSending]     = useState(null);
  const [toast,       setToast]       = useState('');
  const [subList,     setSubList]     = useState([]);
  const [subMeta,     setSubMeta]     = useState({});
  const [subSearch,   setSubSearch]   = useState('');

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, sr] = await Promise.all([
        api.get('/admin/newsletter/campaigns'),
        api.get('/admin/newsletter/subscribers?per_page=1'),
      ]);
      setCampaigns(cr.data.data || []);
      setSubscribers({ total: sr.data.meta?.total || 0, unconfirmed: sr.data.meta?.unconfirmed || 0 });
    } catch { setError('Failed to load campaigns.'); }
    finally { setLoading(false); }
  }, []);

  const loadSubs = async (search = '') => {
    try {
      const r = await api.get('/admin/newsletter/subscribers', { params: { search, per_page:20 } });
      setSubList(r.data.data || []);
      setSubMeta(r.data.meta || {});
    } catch {}
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (view === 'subscribers') loadSubs(subSearch); }, [view, subSearch]);

  const sendCampaign = async (id) => {
    if (!confirm('Send this campaign now? This cannot be undone.')) return;
    setSending(id);
    try {
      const r = await api.post(`/admin/newsletter/campaigns/${id}/send`);
      flash(r.data.message || 'Campaign sent!');
      load();
    } catch (e) { flash(e.response?.data?.message || 'Send failed.'); }
    finally { setSending(null); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-48">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"/>
    </div>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4"/> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5 text-green-600"/> Email Campaigns
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            <span className="font-semibold text-green-700 dark:text-green-400">{subscribers.total.toLocaleString()}</span> active subscribers
            {subscribers.unconfirmed > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">({subscribers.unconfirmed} pending confirmation)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(v => v === 'campaigns' ? 'subscribers' : 'campaigns')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
            <UserGroupIcon className="h-4 w-4"/>
            {view === 'campaigns' ? 'View Subscribers' : 'View Campaigns'}
          </button>
          {view === 'campaigns' && !showForm && (
            <button onClick={() => { setShowForm(true); setEditing(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors">
              <PlusIcon className="h-4 w-4"/> New Campaign
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Form */}
      {showForm && (
        <CampaignForm
          initial={editing}
          onSaved={() => { setShowForm(false); setEditing(null); load(); flash('Campaign saved.'); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Campaigns list */}
      {view === 'campaigns' && !showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          {campaigns.length === 0 ? (
            <div className="text-center py-14 text-gray-400 dark:text-slate-500">
              <EnvelopeIcon className="h-10 w-10 mx-auto mb-3 opacity-40"/>
              <p className="text-sm">No campaigns yet. Create your first email campaign.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Campaign</th>
                    <th className="px-5 py-3 text-left">Audience</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right hidden sm:table-cell">Recipients</th>
                    <th className="px-5 py-3 text-right hidden md:table-cell">Sent</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {campaigns.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900 dark:text-slate-100 truncate max-w-xs">{c.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{c.subject}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600 dark:text-slate-400">{AUDIENCE_LABELS[c.audience] || c.audience}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600 dark:text-slate-400 hidden sm:table-cell">
                        {c.recipients_count > 0 ? c.recipients_count.toLocaleString() : '—'}
                        {c.delivered_count > 0 && <span className="text-green-600 dark:text-green-400 ml-1">({c.delivered_count} delivered)</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400 dark:text-slate-500 hidden md:table-cell">{fmtDate(c.sent_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {['draft','scheduled'].includes(c.status) && (
                            <>
                              <button onClick={() => { setEditing(c); setShowForm(true); }}
                                className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                                <PencilSquareIcon className="h-4 w-4"/>
                              </button>
                              <button onClick={() => sendCampaign(c.id)} disabled={sending === c.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                                <PaperAirplaneIcon className="h-3.5 w-3.5"/>
                                {sending === c.id ? 'Sending…' : 'Send'}
                              </button>
                            </>
                          )}
                          {c.status === 'sent' && (
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                              <span title="Open rate">👁 {c.open_rate ?? 0}%</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subscribers list */}
      {view === 'subscribers' && (
        <div className="space-y-4">
          <input value={subSearch} onChange={e => setSubSearch(e.target.value)}
            placeholder="Search by email…"
            className="w-full sm:w-72 border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-green-500 focus:outline-none"/>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            {subList.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400 dark:text-slate-500">No subscribers found.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left hidden sm:table-cell">Name</th>
                    <th className="px-5 py-3 text-left hidden md:table-cell">Source</th>
                    <th className="px-5 py-3 text-left">Subscribed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {subList.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-slate-100">{s.email}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-slate-400 hidden sm:table-cell">{s.name || '—'}</td>
                      <td className="px-5 py-3 text-xs text-gray-400 dark:text-slate-500 hidden md:table-cell capitalize">{s.source}</td>
                      <td className="px-5 py-3 text-xs text-gray-400 dark:text-slate-500">{fmtDate(s.confirmed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500">{subMeta.total?.toLocaleString() || 0} active subscribers total</p>
        </div>
      )}
    </div>
  );
};

export default EmailCampaigns;