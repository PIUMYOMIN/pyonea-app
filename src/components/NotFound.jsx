// src/components/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-bold text-green-600">404</h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            {t('notFound.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            {t('notFound.description')}
          </p>
        </div>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            {t('notFound.goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;