// src/pages/Email/EmailVerification.jsx
// Handles both: link-click verification AND 6-digit code entry.
// Route: /verify-email/:id?/:hash?
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, Link, useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon, XCircleIcon, EnvelopeIcon,
  ArrowPathIcon, KeyIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO/SEO';

// ── Code Input — 6 separate digit boxes ──────────────────────────────────────
const CodeInput = ({ value, onChange, disabled }) => {
  const inputs = useRef([]);

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !e.target.value && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = (value || '').split('');
    arr[i] = digit;
    const next = arr.join('').replace(/\D/g, '').slice(0, 6);
    onChange(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length) {
      onChange(pasted);
      inputs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          disabled={disabled}
          className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all focus:outline-none
            ${disabled ? 'bg-gray-50 text-gray-300 border-gray-200' : 'bg-white border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-100 text-gray-900'}
          `}
        />
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const EmailVerification = () => {
  const { id, hash }   = useParams();
  const location       = useLocation();
  const navigate       = useNavigate();
  const { refreshUser, isSeller, isAdmin, user, logout, updateUser } = useAuth();
  const { t } = useTranslation();

  // Link-based verification state
  const [linkStatus, setLinkStatus]   = useState(id && hash ? 'verifying' : 'idle');
  const [linkMessage, setLinkMessage] = useState('');
  /** Same signed link verified successfully — skip duplicate GET (e.g. React Strict Mode). */
  const linkSuccessParamsKeyRef = useRef(null);
  const resendCooldownIntervalRef = useRef(null);

  // Code-based verification state
  const [code,        setCode]        = useState('');
  const [codeStatus,  setCodeStatus]  = useState('idle'); // idle|loading|success|error
  const [codeMessage, setCodeMessage] = useState('');

  // Resend state
  const [resending,   setResending]   = useState(false);
  const [resendMsg,   setResendMsg]   = useState('');
  const [resendCooldown, setCooldown] = useState(60);

  // ── Initial resend cooldown — email just sent on registration ───────────────
  useEffect(() => {
    const id = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          resendCooldownIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    resendCooldownIntervalRef.current = id;
    return () => {
      clearInterval(id);
      if (resendCooldownIntervalRef.current === id) {
        resendCooldownIntervalRef.current = null;
      }
    };
  }, []);

  // ── Link verification (runs if URL has id + hash) ───────────────────────
  const paramsKey = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return `${id}|${hash}|${p.get('expires')}|${p.get('signature')}`;
  }, [id, hash, location.search]);

  useEffect(() => {
    if (!id || !hash) return;
    if (linkSuccessParamsKeyRef.current === paramsKey) return;

    const params = new URLSearchParams(location.search);
    const expires   = params.get('expires');
    const signature = params.get('signature');

    if (!expires || !signature) {
      setLinkStatus('error');
      setLinkMessage(t('email_verification.link_failed_desc', { message: 'This verification link is incomplete or malformed.' }));
      return;
    }

    setLinkStatus('verifying');
    const ctrl = new AbortController();

    api.get(`/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`, { signal: ctrl.signal })
      .then(async r => {
        const verifiedAt = r.data?.data?.email_verified_at;
        try {
          await refreshUser();
        } catch {
          // e.g. opened the link on a device without a session — still merge if we have a local user.
          if (verifiedAt && user) {
            try {
              updateUser({ email_verified_at: verifiedAt });
            } catch {
              /* ignore */
            }
          }
        }
        linkSuccessParamsKeyRef.current = paramsKey;
        setLinkStatus('success');
        setLinkMessage(r.data.message || t('email_verification.success_default_msg'));
      })
      .catch(err => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setLinkStatus('error');
        setLinkMessage(err.response?.data?.message || t('email_verification.link_failed_desc', { message: 'Verification failed. The link may be invalid or expired.' }));
      });

    return () => ctrl.abort();
  // paramsKey drives re-runs; refreshUser/updateUser/user are stable enough for this flow.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  // ── Code submission ─────────────────────────────────────────────────────
  const submitCode = async () => {
    if (code.replace(/\s/g, '').length !== 6) return;
    setCodeStatus('loading');
    setCodeMessage('');
    try {
      const r = await api.post('/email/verify-code', { code: code.trim() });
      const verifiedAt = r.data?.data?.email_verified_at;
      try {
        await refreshUser();
      } catch {
        if (verifiedAt && user) {
          updateUser({ email_verified_at: verifiedAt });
        }
      }
      setCodeStatus('success');
      setCodeMessage(r.data.message || t('email_verification.success_default_msg'));
      setLinkStatus('success'); // unify success state
    } catch (err) {
      setCodeStatus('error');
      setCodeMessage(err.response?.data?.message || t('email_verification.resend_failed'));
    }
  };

  // Reset error state when the user edits the code so the error banner clears
  // and auto-submit can re-fire on a fresh 6-digit entry.
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (codeStatus === 'error') {
      setCodeStatus('idle');
      setCodeMessage('');
    }
  };

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (code.replace(/\s/g, '').length === 6 && codeStatus === 'idle') {
      submitCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, codeStatus]);

  // ── Resend with 60s cooldown ────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setResendMsg('');
    try {
      await api.post('/email/resend');
      setResendMsg(t('email_verification.resend_success'));
      setCode('');
      setCodeStatus('idle');
      setCodeMessage('');
      if (resendCooldownIntervalRef.current != null) {
        clearInterval(resendCooldownIntervalRef.current);
      }
      setCooldown(60);
      const id = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(id);
            resendCooldownIntervalRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      resendCooldownIntervalRef.current = id;
    } catch (err) {
      setResendMsg(err.response?.data?.message || t('email_verification.resend_failed'));
    } finally {
      setResending(false);
    }
  };

  // ── Redirect destination after verification ─────────────────────────────
  // Accept returnTo only from a safe internal path (blocks external URLs,
  // protocol-relative URLs and JavaScript-scheme attacks).
  const getSafeReturn = () => {
    const candidates = [location.state?.returnTo, new URLSearchParams(location.search).get('returnTo')];
    for (const raw of candidates) {
      if (!raw) continue;
      const cleaned = raw.trim();
      if (/^https?:\/\//i.test(cleaned)) continue;      // explicit http/https schemes
      if (cleaned.startsWith('//')) continue;             // protocol-relative URL
      if (/^javascript:/i.test(cleaned)) continue;        // javascript: scheme
      if (cleaned.startsWith('/')) return cleaned;        // safe internal path
    }
    return null;
  };

  const redirect = () => {
    const returnTo = getSafeReturn();
    if (returnTo) return navigate(returnTo, { replace: true });
    if (isAdmin?.()) return navigate('/admin/dashboard');
    if (isSeller?.()) return navigate('/seller');
    return navigate('/');
  };

  // ── Already verified ────────────────────────────────────────────────────
  if (user?.email_verified_at && linkStatus !== 'verifying') {
    return (
      <>
        <SEO title={t('email_verification.seo_title')} noindex={true} url="/verify-email"/>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto"/>
            <h1 className="text-2xl font-bold text-gray-900">{t('email_verification.already_verified_title')}</h1>
            <p className="text-gray-500 text-sm">{t('email_verification.already_verified_desc')}</p>
            <button onClick={redirect}
              className="w-full px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors">
              {isAdmin?.() ? t('email_verification.go_admin') : isSeller?.() ? t('email_verification.go_seller') : t('email_verification.start_shopping')}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Unified success (link OR code) ──────────────────────────────────────
  const isSuccess = linkStatus === 'success' || codeStatus === 'success';

  return (
    <>
      <SEO title={t('email_verification.seo_title')} noindex={true} url="/verify-email"/>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-4">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            {/* ── Verifying link spinner ── */}
            {linkStatus === 'verifying' && (
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"/>
                <h2 className="text-xl font-bold text-gray-900">{t('email_verification.verifying_title')}</h2>
                <p className="text-gray-500 text-sm">{t('email_verification.verifying_desc')}</p>
              </div>
            )}

            {/* ── Success ── */}
            {isSuccess && (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircleIcon className="h-9 w-9 text-green-600"/>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('email_verification.success_title')}</h2>
                <p className="text-gray-500 text-sm">
                  {linkMessage || codeMessage || t('email_verification.success_default_msg')}
                </p>
                <button onClick={redirect}
                  className="w-full px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors">
                  {isAdmin?.() ? t('email_verification.go_admin') : isSeller?.() ? t('email_verification.go_seller') : t('email_verification.start_shopping')}
                </button>
                <Link to="/" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  {t('email_verification.back_home')}
                </Link>
              </div>
            )}

            {/* ── Code entry (main state when no link params or link failed) ── */}
            {!isSuccess && linkStatus !== 'verifying' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <EnvelopeIcon className="h-7 w-7 text-green-600"/>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{t('email_verification.check_email_title')}</h2>
                  <p className="text-gray-500 text-sm mt-2">
                    {t('email_verification.check_email_desc', { email: user?.email || 'your email address' })}
                  </p>
                </div>

                {/* Link error banner */}
                {linkStatus === 'error' && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <XCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500"/>
                    <div>
                          <p className="font-medium">{t('email_verification.link_failed_title')}</p>
                          <p className="text-xs mt-0.5 text-amber-600">{t('email_verification.link_failed_desc', { message: linkMessage })}</p>
                    </div>
                  </div>
                )}

                {/* Code input */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 text-center uppercase tracking-wide">
                    {t('email_verification.enter_6_digit')}
                  </p>
                  <CodeInput
                    value={code}
                    onChange={handleCodeChange}
                    disabled={codeStatus === 'loading' || codeStatus === 'success'}
                  />

                  {/* Code status */}
                  {codeStatus === 'loading' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <ArrowPathIcon className="h-4 w-4 animate-spin"/> {t('email_verification.verifying')}
                    </div>
                  )}
                  {codeStatus === 'error' && (
                    <p className="text-center text-sm text-red-600">{codeMessage}</p>
                  )}
                </div>

                {/* Manual submit (in case auto didn't fire) */}
                {codeStatus !== 'loading' && codeStatus !== 'success' && (
                  <button
                    onClick={submitCode}
                    disabled={code.replace(/\s/g, '').length < 6}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-40 transition-colors">
                    <KeyIcon className="h-4 w-4"/> {t('email_verification.verify_email_btn')}
                  </button>
                )}

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"/></div>
                    <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">
                    {t('email_verification.didnt_get')}
                  </div>
                </div>

                {/* Resend */}
                <div className="text-center space-y-2">
                  <button
                    onClick={handleResend}
                    disabled={resending || resendCooldown > 0}
                    className="flex items-center justify-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 disabled:text-gray-400 disabled:cursor-not-allowed mx-auto transition-colors">
                    <ArrowPathIcon className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`}/>
                    {resending
                      ? t('email_verification.resend_sending')
                      : resendCooldown > 0
                        ? t('email_verification.resend_in', { seconds: resendCooldown })
                        : t('email_verification.resend_code')}
                  </button>
                  {resendMsg && (
                    <p className={`text-xs ${resendMsg.includes('sent') ? 'text-green-600' : 'text-red-500'}`}>
                      {resendMsg}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {t('email_verification.check_spam')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400">
            {t('email_verification.wrong_account')}{' '}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="text-green-600 hover:underline bg-transparent border-0 p-0 cursor-pointer text-xs"
            >
              {t('email_verification.sign_out')}
            </button>
          </p>
        </div>
      </div>
    </>
  );
};

export default EmailVerification;