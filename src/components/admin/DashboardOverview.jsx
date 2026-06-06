import React from "react";
import { useTranslation } from "react-i18next";
import {
  UserGroupIcon,
  CubeIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";

const KPI = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-green-600",
  bg = "bg-green-50",
  isString = false,
}) => {
  const { t } = useTranslation();

  const fmtK = (n) => {
    const v = Number(n) || 0;
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return v.toLocaleString();
  };

  const fmtMMK = (n) => {
    const num = Number(n) || 0;
    const formattedNumber = new Intl.NumberFormat("en-MM", { minimumFractionDigits: 0 }).format(num);
    return `${formattedNumber} ${t("common.currency.mmk", "MMK")}`;
  };

  return (
    <div className={`${bg} dark:bg-slate-700/50 rounded-2xl p-4 sm:p-5 flex items-start gap-4`}>
      <div className="rounded-xl p-2.5 bg-white dark:bg-slate-800 shadow-sm flex-shrink-0">
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide truncate">
          {title}
        </p>
        <p className={`text-xl font-bold mt-0.5 ${iconColor}`}>
          {isString ? value : fmtK(value)}
        </p>
        {subtitle && (
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const DashboardOverview = ({ data, loading, error }) => {
  const { t } = useTranslation();

  const fmtMMK = (n) => {
    const num = Number(n) || 0;
    const formattedNumber = new Intl.NumberFormat("en-MM", { minimumFractionDigits: 0 }).format(num);
    return `${formattedNumber} ${t("common.currency.mmk", "MMK")}`;
  };

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" />
      </div>
    );

  if (error)
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error?.message || "Error loading data."}
      </div>
    );

  if (!data) return <div className="p-6 text-gray-400 text-sm text-center">No data available.</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Platform Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI
            title="Total Users"
            value={data.total_users ?? 0}
            subtitle={`${data.active_users ?? 0} active · ${data.total_sellers ?? 0} sellers`}
            icon={UserGroupIcon}
            iconColor="text-green-600"
            bg="bg-green-50"
          />
          <KPI
            title="Total Products"
            value={data.total_products ?? 0}
            subtitle={`${data.active_products ?? 0} active`}
            icon={CubeIcon}
            iconColor="text-blue-600"
            bg="bg-blue-50"
          />
          <KPI
            title="Total Orders"
            value={data.total_orders ?? 0}
            subtitle={`${data.pending_orders ?? 0} pending · ${data.completed_orders ?? 0} done`}
            icon={ShoppingBagIcon}
            iconColor="text-purple-600"
            bg="bg-purple-50"
          />
          <KPI
            title="Total Revenue"
            value={fmtMMK(data.total_revenue ?? 0)}
            subtitle={`${fmtMMK(data.confirmed_revenue ?? 0)} confirmed`}
            icon={CurrencyDollarIcon}
            iconColor="text-amber-600"
            bg="bg-amber-50"
            isString
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Commission Fees</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KPI
            title="Total Commission"
            value={fmtMMK(data.commission_revenue ?? 0)}
            subtitle="From delivered orders"
            icon={CurrencyDollarIcon}
            iconColor="text-emerald-700"
            bg="bg-emerald-50"
            isString
          />
          <KPI
            title="Collected"
            value={fmtMMK(data.collected_commissions ?? 0)}
            subtitle="Paid to platform"
            icon={CheckCircleIcon}
            iconColor="text-teal-700"
            bg="bg-teal-50"
            isString
          />
          <KPI
            title="Pending Commission"
            value={fmtMMK(data.pending_commissions ?? 0)}
            subtitle="Awaiting collection"
            icon={ClockIcon}
            iconColor="text-orange-600"
            bg="bg-orange-50"
            isString
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Delivery Fees (Platform Logistics)</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI
            title="Total Delivery Fees"
            value={fmtMMK(data.total_delivery_fees ?? 0)}
            subtitle="All platform deliveries"
            icon={TruckIcon}
            iconColor="text-blue-700"
            bg="bg-blue-50"
            isString
          />
          <KPI
            title="Confirmed Fees"
            value={fmtMMK(data.confirmed_delivery_fees ?? 0)}
            subtitle="Admin confirmed received"
            icon={CheckCircleIcon}
            iconColor="text-green-700"
            bg="bg-green-50"
            isString
          />
          <KPI
            title="Submitted (Awaiting)"
            value={fmtMMK(data.submitted_delivery_fees ?? 0)}
            subtitle="Seller sent, not confirmed yet"
            icon={ExclamationCircleIcon}
            iconColor="text-yellow-600"
            bg="bg-yellow-50"
            isString
          />
          <KPI
            title="Pending (Not Submitted)"
            value={fmtMMK(data.pending_delivery_fees ?? 0)}
            subtitle="Unsubmitted delivery fees"
            icon={ClockIcon}
            iconColor="text-red-500"
            bg="bg-red-50"
            isString
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Sellers & Business</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI
            title="Total Sellers"
            value={data.total_sellers ?? 0}
            subtitle={`${data.total_sellers_approved ?? 0} approved`}
            icon={BuildingStorefrontIcon}
            iconColor="text-indigo-600"
            bg="bg-indigo-50"
          />
          <KPI
            title="Sellers Pending"
            value={data.sellers_pending ?? 0}
            subtitle="Awaiting approval"
            icon={ClockIcon}
            iconColor="text-yellow-600"
            bg="bg-yellow-50"
          />
          <KPI
            title="Business Types"
            value={data.total_business_types ?? 0}
            subtitle={`${data.active_business_types ?? 0} active`}
            icon={BriefcaseIcon}
            iconColor="text-pink-600"
            bg="bg-pink-50"
          />
          <KPI
            title="Cancelled Orders"
            value={data.cancelled_orders ?? 0}
            subtitle="All time"
            icon={ExclamationCircleIcon}
            iconColor="text-gray-500"
            bg="bg-gray-50"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;

