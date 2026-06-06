// src/components/payments/WalletPayment.jsx
import React from "react";
import { useTranslation } from "react-i18next";

const WalletPayment = () => {
  const { t } = useTranslation();

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900">
        {t("wallet.title")}
      </h3>
      <p className="mt-2 text-gray-600">
        {t("wallet.description")}
      </p>

      <div className="mt-6">
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700"
        >
          {t("wallet.phone_label")}
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
            +95
          </span>
          <input
            type="tel"
            id="phone"
            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-green-500 focus:border-green-500 sm:text-sm"
            placeholder="9xxxxxxxxx"
          />
        </div>
      </div>

      <div className="mt-6">
        <button className="w-full bg-green-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
          {t("wallet.pay_button")}
        </button>
      </div>
    </div>
  );
};

export default WalletPayment;
