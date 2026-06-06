// src/components/ui/CookieBanner.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon, XMarkIcon, AdjustmentsHorizontalIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useCookies } from '../../context/CookieContext';

// ── Cookie category definitions ───────────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'necessary',
    icon: '🔒',
    title: 'Necessary',
    titleMM: 'မဖြစ်မနေလိုအပ်သော',
    desc: 'Required for the website to function. Cannot be disabled.',
    descMM: 'ဝဘ်ဆိုက် လုပ်ဆောင်ရန် လိုအပ်သည်။ ပိတ်၍မရပါ။',
    locked: true,
  },
  {
    key: 'functional',
    icon: '⚙️',
    title: 'Functional',
    titleMM: 'လုပ်ဆောင်ချက်ဆိုင်ရာ',
    desc: 'Remember your preferences like language and cart items.',
    descMM: 'ဘာသာစကားနှင့် ခြင်းတောင်းပစ္စည်းများကဲ့သို့ သင့်ရွေးချယ်မှုများကို မှတ်မိသည်။',
    locked: false,
  },
  {
    key: 'analytics',
    icon: '📊',
    title: 'Analytics',
    titleMM: 'ခွဲခြမ်းစိတ်ဖြာမှု',
    desc: 'Help us understand how you use our site to improve it.',
    descMM: 'ဝဘ်ဆိုက်ကို မည်သို့အသုံးပြုသည်ကို နားလည်ရန် ကူညီသည်။',
    locked: false,
  },
  {
    key: 'marketing',
    icon: '📣',
    title: 'Marketing',
    titleMM: 'စျေးကွက်ရှာဖွေရေး',
    desc: 'Used to show you relevant promotions and advertisements.',
    descMM: 'သင်နှင့်သက်ဆိုင်သော ပြည်သားများနှင့် ကြော်ငြာများကို ပြသရန် အသုံးပြုသည်။',
    locked: false,
  },
];

// ── Toggle switch ────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
                ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white
                      shadow ring-0 transition duration-200
                      ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

// ── Preferences modal ────────────────────────────────────────────────────────
const PreferencesModal = ({ onClose, isMM }) => {
  const { prefs, saveCustom } = useCookies();
  const [local, setLocal] = useState({ ...prefs });

  const toggle = (key) => setLocal(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0,      opacity: 1 }}
        exit={{    y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            {isMM ? 'ကွတ်ကီးနှစ်သက်မှုများ' : 'Cookie Preferences'}
          </h3>
          <button onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Categories */}
        <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="flex items-start gap-4 px-5 py-4">
              <span className="text-xl flex-shrink-0 mt-0.5">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {isMM ? cat.titleMM : cat.title}
                  {cat.locked && (
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide
                                     text-green-700 bg-green-50 border border-green-200
                                     px-1.5 py-0.5 rounded-full">
                      {isMM ? 'မဖြစ်မနေ' : 'Required'}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {isMM ? cat.descMM : cat.desc}
                </p>
              </div>
              <Toggle
                checked={cat.locked ? true : local[cat.key]}
                onChange={(v) => toggle(cat.key)}
                disabled={cat.locked}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm
                       font-medium rounded-xl hover:bg-white transition-colors">
            {isMM ? 'မသိမ်းဘဲ ပိတ်ရန်' : 'Cancel'}
          </button>
          <button
            onClick={() => { saveCustom(local); onClose(); }}
            className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold
                       rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5">
            <CheckIcon className="h-4 w-4" />
            {isMM ? 'ရွေးချယ်မှုများ သိမ်းဆည်းရန်' : 'Save Preferences'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main banner ───────────────────────────────────────────────────────────────
const CookieBanner = () => {
  const { showBanner, acceptAll, declineAll } = useCookies();
  const [showPrefs, setShowPrefs] = useState(false);

  // Detect Myanmar locale from html lang or i18n
  const isMM = document.documentElement.lang === 'my' ||
    localStorage.getItem('i18nextLng') === 'my';

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4
                       sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-md"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0,   opacity: 1 }}
            exit={{    y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Top accent */}
              <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />

              <div className="p-4 sm:p-5">
                {/* Icon + title */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {isMM ? 'ကွတ်ကီးသတိပေးချက်' : 'We use cookies'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {isMM
                        ? 'ဝဘ်ဆိုက်ကို ပိုမိုကောင်းမွန်စေရန် ကွတ်ကီးများ အသုံးပြုပါသည်။'
                        : 'We use cookies to enhance your experience and analyse site usage.'}
                      {' '}
                      <Link to="/privacy-policy"
                        className="text-green-700 underline underline-offset-2 hover:text-green-800">
                        {isMM ? 'ပိုမိုလေ့လာရန်' : 'Learn more'}
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={acceptAll}
                    className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold
                               rounded-xl hover:bg-green-700 transition-colors">
                    {isMM ? 'အားလုံးလက်ခံရန်' : 'Accept All'}
                  </button>
                  <button onClick={() => setShowPrefs(true)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 text-xs
                               font-medium rounded-xl hover:bg-gray-50 transition-colors
                               flex items-center justify-center gap-1">
                    <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                    {isMM ? 'ရွေးချယ်မှုများ' : 'Customize'}
                  </button>
                  <button onClick={declineAll}
                    className="flex-1 py-2 text-gray-500 text-xs font-medium
                               hover:text-gray-700 transition-colors">
                    {isMM ? 'ငြင်းပယ်ရန်' : 'Decline'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences modal */}
      <AnimatePresence>
        {showPrefs && (
          <PreferencesModal onClose={() => setShowPrefs(false)} isMM={isMM} />
        )}
      </AnimatePresence>
    </>
  );
};

export default CookieBanner;