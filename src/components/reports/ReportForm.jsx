// src/components/reports/ReportForm.jsx
// Universal report/ticket submission form.
// Can be triggered from anywhere in the app (floating button, order page, product page, etc.)
//
// Props:
//   isOpen       bool
//   onClose      () => void
//   context      { category?, related_order_id?, related_seller_id?, related_product_id?, related_url? }
//                — pre-fills fields when opened from a specific context

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  PaperClipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  { value: 'bug',        label: '🐛 Bug / App Error',        labelMM: '🐛 ပရိုဂရမ်ချို့ယွင်းမှု' },
  { value: 'payment',    label: '💳 Payment Issue',           labelMM: '💳 ငွေပေးချေမှုပြဿနာ' },
  { value: 'order',      label: '📦 Order Problem',           labelMM: '📦 အော်ဒါပြဿနာ' },
  { value: 'seller',     label: '🏪 Seller Misconduct',       labelMM: '🏪 ရောင်းသူပြဿနာ' },
  { value: 'product',    label: '📋 Fake / Wrong Product',    labelMM: '📋 ကုန်ပစ္စည်းပြဿနာ' },
  { value: 'account',    label: '👤 Account Issue',           labelMM: '👤 အကောင့်ပြဿနာ' },
  { value: 'content',    label: '⚠️ Inappropriate Content',  labelMM: '⚠️ မသင့်တော်သောအကြောင်းအရာ' },
  { value: 'billing',    label: '🧾 Billing Dispute',         labelMM: '🧾 ငွေကြေးဆိုင်ရာတိုင်ကြားချက်' },
  { value: 'delivery',   label: '🚚 Delivery Problem',        labelMM: '🚚 ပို့ဆောင်ရေးပြဿနာ' },
  { value: 'safety',     label: '🚨 Safety / Fraud / Scam',  labelMM: '🚨 လုံခြုံရေး / လိမ်လည်မှု' },
  { value: 'suggestion', label: '💡 Suggestion / Feedback',  labelMM: '💡 အကြံပြုချက်' },
  { value: 'other',      label: '❓ Other',                   labelMM: '❓ အခြား' },
];

const PRIORITIES = [
  { value: 'low',      label: 'Low',      cls: 'text-gray-600 dark:text-slate-400' },
  { value: 'medium',   label: 'Medium',   cls: 'text-blue-600 dark:text-blue-400' },
  { value: 'high',     label: 'High',     cls: 'text-orange-600 dark:text-orange-400' },
  { value: 'critical', label: 'Critical', cls: 'text-red-600 dark:text-red-400' },
];

const INPUT_CLS = [
  'w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl text-sm',
  'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100',
  'placeholder-gray-400 dark:placeholder-slate-500',
  'focus:ring-2 focus:ring-green-500 focus:outline-none',
].join(' ');

const extractTicketId = (response) =>
  response?.data?.ticket_id ||
  response?.data?.data?.ticket_id ||
  response?.data?.data?.report?.ticket_id ||
  null;

export default function ReportForm({ isOpen, onClose, context = {} }) {
  const { t, i18n } = useTranslation();
  const { user }          = useAuth();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const isMM        = i18n.language === 'my';

  const [form, setForm] = useState({
    category:           context.category || '',
    priority:           'medium',
    subject:            '',
    description:        '',
    related_order_id:   context.related_order_id || '',
    related_seller_id:  context.related_seller_id || '',
    related_product_id: context.related_product_id || '',
    related_url:        context.related_url || '',
    guest_name:         '',
    guest_email:        '',
  });
  const [files,     setFiles]   = useState([]);
  const [loading,   setLoading] = useState(false);
  const [success,   setSuccess] = useState(null);  // { ticket_id }
  const [errors,    setErrors]  = useState({});

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).slice(0, 5);
    setFiles(newFiles);
  };

  const handleSubmit = async () => {
    setErrors({});

    // reCAPTCHA v3 — must execute before submitting
    if (!executeRecaptcha) {
      setErrors({ general: 'reCAPTCHA not ready. Please refresh and try again.' });
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha('report');
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      fd.append('recaptcha_token', recaptchaToken);
      files.forEach((f, i) => fd.append(`attachments[${i}]`, f));

      const res = await api.post('/reports', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const ticketId = extractTicketId(res);
      if (!ticketId) {
        throw new Error('Report submitted but ticket ID was missing in response.');
      }
      setSuccess({ ticket_id: ticketId });
    } catch (e) {
      if (e.response?.data?.errors) {
        setErrors(e.response.data.errors);
      } else {
        setErrors({ general: e.response?.data?.message || 'Failed to submit report. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ category: context.category || '', priority: 'medium', subject: '', description: '', guest_name: '', guest_email: '', related_order_id: context.related_order_id || '', related_seller_id: context.related_seller_id || '', related_product_id: context.related_product_id || '', related_url: context.related_url || '' });
    setFiles([]);
    setSuccess(null);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-green-600" />
            <h2 className="font-bold text-gray-900 dark:text-slate-100">
              {isMM ? 'တိုင်ကြားချက်တင်ပြမည်' : 'Submit a Report'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
                {isMM ? 'တိုင်ကြားချက် လက်ခံပြီး' : 'Report Submitted!'}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                {isMM ? 'သင့်ကိစ္စရပ် ID:' : 'Your ticket ID:'}
              </p>
              <div className="inline-block bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-6 py-3">
                <span className="font-mono text-xl font-bold text-green-800 dark:text-green-200 tracking-widest">
                  {success.ticket_id}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">
                {isMM
                  ? 'အပ်ဒိတ်များကို သင့် email သို့ ပေးပို့ပါမည်။ My Reports မှ ခြေရာခံနိုင်သည်။'
                  : 'Updates will be sent to your email. Track progress in My Reports.'}
              </p>
            </div>
            <button onClick={handleClose}
              className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-sm">
              {isMM ? 'ပိတ်မည်' : 'Close'}
            </button>
          </div>
        ) : (
          <>
            {/* Scrollable form body */}
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">

              {errors.general && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                  <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  {errors.general}
                </div>
              )}

              {/* Guest fields (when not logged in) */}
              {!user && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                      {isMM ? 'နာမည်' : 'Your Name'} *
                    </label>
                    <input value={form.guest_name} onChange={set('guest_name')}
                      placeholder={isMM ? 'နာမည်ထည့်ပါ' : 'Full name'}
                      className={INPUT_CLS} />
                    {errors.guest_name && <p className="text-xs text-red-500 mt-1">{errors.guest_name[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                      Email *
                    </label>
                    <input type="email" value={form.guest_email} onChange={set('guest_email')}
                      placeholder="your@email.com" className={INPUT_CLS} />
                    {errors.guest_email && <p className="text-xs text-red-500 mt-1">{errors.guest_email[0]}</p>}
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  {isMM ? 'အမျိုးအစား' : 'Category'} *
                </label>
                <select value={form.category} onChange={set('category')} className={INPUT_CLS}>
                  <option value="">{isMM ? 'ရွေးချယ်ပါ' : 'Select category'}</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{isMM ? c.labelMM : c.label}</option>
                  ))}
                </select>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category[0]}</p>}
                {/* Safety/fraud auto-escalation notice */}
                {(form.category === 'safety' || form.category === 'fraud') && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                    {isMM ? 'ဤအမျိုးအစားကို ဦးစားပေး HIGH အဖြစ် အလိုအလျောက် တင်ပေးပါမည်'
                           : 'This category is automatically escalated to HIGH priority'}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  {isMM ? 'အရေးတကြီး' : 'Priority'}
                </label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                        form.priority === p.value
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                      } ${p.cls}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  {isMM ? 'အကျဉ်းချုပ်' : 'Subject'} *
                </label>
                <input value={form.subject} onChange={set('subject')}
                  placeholder={isMM ? 'ပြဿနာအကျဉ်းချုပ်' : 'Brief summary of the issue'}
                  className={INPUT_CLS} maxLength={200} />
                {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject[0]}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  {isMM ? 'အသေးစိတ်ဖော်ပြချက်' : 'Description'} *
                  <span className="ml-1 font-normal text-gray-400">{isMM ? '(အနည်းဆုံး ၂၀ လုံး)' : '(min 20 chars)'}</span>
                </label>
                <textarea value={form.description} onChange={set('description')} rows={4}
                  placeholder={isMM
                    ? 'ဘာဖြစ်ခဲ့သနည်း? ဘယ်အချိန်မှာ? ဘယ်လိုဖြေရှင်းရမလဲ?'
                    : 'What happened? When did it occur? What were you trying to do? Any steps to reproduce?'}
                  className={INPUT_CLS + ' resize-none'} maxLength={5000} />
                <p className="text-right text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {form.description.length}/5000
                </p>
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description[0]}</p>}
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                  <PaperClipIcon className="inline h-3.5 w-3.5 mr-1" />
                  {isMM ? 'ပူးတွဲဖိုင်များ' : 'Attachments'}
                  <span className="ml-1 font-normal text-gray-400">{isMM ? '(max 5)' : '(screenshots, up to 5)'}</span>
                </label>
                <input type="file" multiple accept="image/*,.pdf" onChange={handleFileChange}
                  className="block w-full text-xs text-gray-600 dark:text-slate-400
                    file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                    file:bg-green-50 dark:file:bg-green-900/20 file:text-green-700 dark:file:text-green-400
                    file:text-xs file:font-medium hover:file:bg-green-100 dark:hover:file:bg-green-900/30" />
                {files.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Optional context fields */}
              {(context.related_order_id || context.related_seller_id || context.related_url) ? null : (
                <details className="group">
                  <summary className="text-xs text-gray-500 dark:text-slate-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-slate-300">
                    + {isMM ? 'ဆက်စပ်သောအချက်အလက်များ (ရွေးချယ်စရာ)' : 'Add related context (optional)'}
                  </summary>
                  <div className="mt-3 space-y-2">
                    <input value={form.related_url} onChange={set('related_url')}
                      placeholder="https://pyonea.com/... (page where issue occurred)"
                      className={INPUT_CLS + ' text-xs'} />
                    <input value={form.related_order_id} onChange={set('related_order_id')}
                      placeholder="Order ID (if related to an order)"
                      className={INPUT_CLS + ' text-xs'} type="number" />
                  </div>
                </details>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 shrink-0 space-y-2">
              <button onClick={handleSubmit} disabled={loading || !form.category || !form.subject || !form.description}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2">
                {loading ? (
                  <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isMM ? 'တင်ပေးနေသည်…' : 'Submitting…'}</>
                ) : (
                  <><TicketIcon className="h-4 w-4" />
                  {isMM ? 'တိုင်ကြားချက်တင်မည်' : 'Submit Report'}</>
                )}
              </button>
              <p className="text-center text-xs text-gray-400 dark:text-slate-500">
                {isMM
                  ? 'တင်ပြချက်အတွက် ကိစ္စရပ် ID ရရှိမည်ဖြစ်သည်'
                  : 'You will receive a ticket ID to track your report'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}