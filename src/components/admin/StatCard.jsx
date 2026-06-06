import React from "react";

const StatCard = ({ title, value, subtitle, icon: Icon, iconColor, bgColor, isString }) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100 truncate">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 ml-3 p-2.5 ${bgColor || "bg-gray-50 dark:bg-slate-700"} rounded-xl`}>
            <Icon className={`h-6 w-6 ${iconColor || "text-gray-500 dark:text-slate-400"}`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;