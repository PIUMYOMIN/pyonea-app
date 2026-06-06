import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSEO from '../hooks/useSEO';

const HelpCenter = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('buying');
  const [activeQuestion, setActiveQuestion] = useState(null);

  // FAQ categories with translation keys
  const faqCategories = {
    buying: [
      'place_order',
      'minimum_order',
      'track_order'
    ],
    selling: [
      'become_seller',
      'seller_fees',
      'receive_payments'
    ],
    payments: [
      'payment_methods',
      'payment_security',
      'refund_time'
    ]
  };

  const SeoComponent = useSEO({
    title: t('helpCenter.title'),
    description: t('helpCenter.description'),
  });

  return (
    <>
      {SeoComponent}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-xl sm:text-3xl font-bold mb-8">
          {t('helpCenter.page_title')}
        </h1>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <button
              onClick={() => setActiveCategory("buying")}
              className={`px-6 py-3 rounded-lg ${activeCategory === "buying"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200"}`}
            >
              {t('helpCenter.categories.buying')}
            </button>
            <button
              onClick={() => setActiveCategory("selling")}
              className={`px-6 py-3 rounded-lg ${activeCategory === "selling"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200"}`}
            >
              {t('helpCenter.categories.selling')}
            </button>
            <button
              onClick={() => setActiveCategory("payments")}
              className={`px-6 py-3 rounded-lg ${activeCategory === "payments"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200"}`}
            >
              {t('helpCenter.categories.payments')}
            </button>
          </div>

          <div className="space-y-4">
            {faqCategories[activeCategory].map((faqKey) => {
              const faqId = `${activeCategory}.${faqKey}`;
              const question = t(`helpCenter.${activeCategory}.${faqKey}.question`);
              const answer = t(`helpCenter.${activeCategory}.${faqKey}.answer`);
              
              return (
                <div key={faqId} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveQuestion(activeQuestion === faqId ? null : faqId)}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 flex justify-between items-center dark:text-slate-100"
                  >
                    <span className="font-medium">{question}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 transform transition-transform ${activeQuestion === faqId ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {activeQuestion === faqId && (
                    <div className="p-4 bg-white dark:bg-slate-800">
                      <p className="text-gray-700 dark:text-slate-300">{answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 dark:text-slate-100">
            {t('helpCenter.support.title')}
          </h2>
          <p className="text-gray-700 dark:text-slate-300 mb-6">
            {t('helpCenter.support.description')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border dark:border-slate-600 rounded-lg p-4">
              <h3 className="font-semibold mb-2 dark:text-slate-100">
                {t('helpCenter.support.email.title')}
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-3">
                {t('helpCenter.support.email.email')}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-500">
                {t('helpCenter.support.email.response_time')}
              </p>
            </div>

            <div className="border dark:border-slate-600 rounded-lg p-4">
              <h3 className="font-semibold mb-2 dark:text-slate-100">
                {t('helpCenter.support.phone.title')}
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-3">
                {t('helpCenter.support.phone.phone')}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-500">
                {t('helpCenter.support.phone.hours')}
              </p>
            </div>

            <div className="border dark:border-slate-600 rounded-lg p-4">
              <h3 className="font-semibold mb-2 dark:text-slate-100">
                {t('helpCenter.support.chat.title')}
              </h3>
              <p className="text-gray-600 dark:text-slate-400 mb-3">
                {t('helpCenter.support.chat.status')}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-500">
                {t('helpCenter.support.chat.alternative')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpCenter;