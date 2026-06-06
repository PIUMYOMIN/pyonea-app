import React from "react";
import { Link } from "react-router-dom";

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-4">403</h1>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">
          Access Denied
        </h2>
        <p className="text-gray-500 mb-8">
          You don't have permission to access this page.
        </p>
        <div className="space-x-4">
          <Link
            to="/"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            to="/login"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
