import React from "react";
import { useTranslation } from "react-i18next";
import { TruckIcon, CheckCircleIcon } from "@heroicons/react/24/outline";


const CODPayment = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
          <TruckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            {t("payment.cod_title")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t("payment.cod_description")}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="animate-fadeIn flex items-start"
        >
          <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5" />
          <p className="ml-3 text-sm text-gray-700 dark:text-slate-300">
            {t("payment.cod_benefit_1")}
          </p>
        </div>

        <div className="animate-fadeIn flex items-start"
        >
          <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5" />
          <p className="ml-3 text-sm text-gray-700 dark:text-slate-300">
            {t("payment.cod_benefit_2")}
          </p>
        </div>

        <div className="animate-fadeIn flex items-start"
        >
          <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5" />
          <p className="ml-3 text-sm text-gray-700 dark:text-slate-300">
            {t("payment.cod_benefit_3")}
          </p>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t("payment.cod_note")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-gray-200 dark:border-slate-700 pt-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100">
          {t("payment.delivery_process")}
        </h4>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="bg-gray-100 dark:bg-slate-700 rounded-full h-12 w-12 flex items-center justify-center mx-auto">
              <span className="text-gray-800 dark:text-slate-100 font-bold">1</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              {t("payment.process_1")}
            </p>
          </div>
          <div className="text-center">
            <div className="bg-gray-100 dark:bg-slate-700 rounded-full h-12 w-12 flex items-center justify-center mx-auto">
              <span className="text-gray-800 dark:text-slate-100 font-bold">2</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              {t("payment.process_2")}
            </p>
          </div>
          <div className="text-center">
            <div className="bg-gray-100 dark:bg-slate-700 rounded-full h-12 w-12 flex items-center justify-center mx-auto">
              <span className="text-gray-800 dark:text-slate-100 font-bold">3</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              {t("payment.process_3")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CODPayment;
