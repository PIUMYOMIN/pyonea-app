import React from "react";
import { Link } from "react-router-dom";
import Logo from "../../assets/images/logo.png";

const AuthLayout = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 theme-transition">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/">
          <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center">
            <img src={Logo} alt="Pyonea Logo" className="h-full w-full object-fill" />
          </div>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
          {subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow dark:shadow-slate-900/50 sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;