// src/components/Shared/ReferralPanel.jsx
// Shows a user's referral code + link + count. Usable in buyer/seller dashboards.
import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon, LinkIcon, ClipboardDocumentIcon,
  CheckIcon, GiftIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

const ReferralPanel = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    api.get('/referral/my-link')
      .then(r => { if (r.data.success) setData(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copy = async () => {
    if (!data?.ref_url) return;
    try {
      await navigator.clipboard.writeText(data.ref_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  if (loading)
    return <div className="animate-pulse h-28 bg-gray-100 dark:bg-slate-700 rounded-2xl" />;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
          <GiftIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Refer & Earn</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">Share your link and grow the community</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{data?.referred_count ?? 0}</p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">Referrals</p>
        </div>
      </div>

      {/* Ref code */}
      <div className="bg-white dark:bg-slate-700 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase tracking-wide">Your Code</p>
          <p className="text-sm font-mono font-bold text-gray-900 dark:text-white tracking-wider">
            {data?.ref_code ?? '—'}
          </p>
        </div>
        <LinkIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />
      </div>

      {/* Copy link button */}
      <button
        onClick={copy}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
                    transition-all duration-200
                    ${copied
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-slate-700 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-slate-600'}`}
      >
        {copied
          ? <><CheckIcon className="h-4 w-4" /> Copied!</>
          : <><ClipboardDocumentIcon className="h-4 w-4" /> Copy Referral Link</>}
      </button>

      {/* Recent referrals */}
      {data?.referred_users?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Recent Referrals</p>
          <div className="space-y-1">
            {data.referred_users.slice(0, 3).map((u, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-slate-300 font-medium">{u.name}</span>
                <span className="text-gray-400 dark:text-slate-500 capitalize">{u.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralPanel;