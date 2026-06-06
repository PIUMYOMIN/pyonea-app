import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

const Sidebar = () => {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  const navigation = [
    {
      name: t("sidebar.dashboard"),
      href: "/seller/dashboard",
      icon: "📊"
    },
    {
      name: t("sidebar.products"),
      href: "/seller/products",
      icon: "📦"
    },
    {
      name: t("sidebar.orders"),
      href: "/seller/orders",
      icon: "📋"
    },
    {
      name: t("sidebar.customers"),
      href: "/seller/customers",
      icon: "👥"
    },
    {
      name: t("sidebar.payments"),
      href: "/seller/payments",
      icon: "💳"
    },
    {
      name: t("sidebar.settings"),
      href: "/seller/dashboard?tab=settings",
      icon: "⚙️"
    }
  ];

  return (
    <div className="hidden md:flex md:w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700">
      <div className="w-full py-6">
        <div className="px-4 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {t("sidebar.platform_name")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {t("sidebar.seller_portal")}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        <nav className="mt-6">
          <ul className="space-y-1 px-2">
            {navigation.map(item =>
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-green-500 text-white shadow-lg dark:shadow-green-900/50"
                        : "text-gray-700 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 shadow-sm"
                    }`}
                >
                  <span className="mr-3 text-lg">
                    {item.icon}
                  </span>
                  <span>
                    {item.name}
                  </span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
