// src/pages/Seller/StorePolicies.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import api from "../../utils/api";

const StorePolicies = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");

    try {
      const storeResponse = await api.get("/sellers/my-store");
      const sellerId = storeResponse.data.data.id;

      await api.put(`/sellers/${sellerId}`, {
        return_policy: data.return_policy,
        warranty: data.warranty,
        warranty_type: data.warranty_type,
        warranty_period: data.warranty_period,
        social_facebook: data.social_facebook,
        social_instagram: data.social_instagram,
        social_twitter: data.social_twitter,
        shipping_details: data.shipping_details,
        shipping_cost: data.shipping_cost,
        min_order_unit: data.min_order_unit,
        moq: data.moq
      });

      navigate("/seller/onboarding/address");
    } catch (error) {
      setError(error.response?.data?.message || t("seller_onboarding.storePolicies.error_save"));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:bg-gray-900 dark:from-gray-900 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {t("seller_onboarding.storePolicies.title")}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("seller_onboarding.storePolicies.description")}
          </p>
          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Return Policy */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("seller_onboarding.storePolicies.return_policy")}
              </label>
              <textarea
                rows={3}
                className={inputClass}
                placeholder={t("seller_onboarding.storePolicies.return_placeholder")}
                {...register("return_policy")}
              />
            </div>

            {/* Warranty Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("seller_onboarding.storePolicies.warranty_type")}
              </label>
              <select
                className={inputClass}
                {...register("warranty_type")}
              >
                <option value="">{t("seller_onboarding.storePolicies.warranty_select")}</option>
                <option value="manufacturer">{t("seller_onboarding.storePolicies.warranty_manufacturer")}</option>
                <option value="seller">{t("seller_onboarding.storePolicies.warranty_seller")}</option>
                <option value="none">{t("seller_onboarding.storePolicies.warranty_none")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("seller_onboarding.storePolicies.warranty_period")}
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder={t("seller_onboarding.storePolicies.warranty_period_placeholder")}
                {...register("warranty_period")}
              />
            </div>

            {/* Social Media */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t("seller_onboarding.storePolicies.social_media")}</h3>
              <div className="space-y-4">
                <input
                  type="url"
                  className={inputClass}
                  placeholder={t("seller_onboarding.storePolicies.facebook_placeholder")}
                  {...register("social_facebook")}
                />
                <input
                  type="url"
                  className={inputClass}
                  placeholder={t("seller_onboarding.storePolicies.instagram_placeholder")}
                  {...register("social_instagram")}
                />
                <input
                  type="url"
                  className={inputClass}
                  placeholder={t("seller_onboarding.storePolicies.twitter_placeholder")}
                  {...register("social_twitter")}
                />
              </div>
            </div>

            {/* Shipping Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t("seller_onboarding.storePolicies.shipping_info")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("seller_onboarding.storePolicies.shipping_cost")}
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    {...register("shipping_cost")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("seller_onboarding.storePolicies.moq")}
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    {...register("moq")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate("/seller/onboarding/business-details")}
              className="flex-1 py-4 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium flex items-center justify-center"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              {t("seller_onboarding.storePolicies.back")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 px-6 border border-transparent text-white rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>{t("seller_onboarding.storePolicies.continue")}</span>
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StorePolicies;
