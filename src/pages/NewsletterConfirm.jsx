import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircleIcon, ExclamationCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';

const NewsletterConfirm = () => {
  const [params]  = useSearchParams();
  const token     = params.get('token');
  const [status,  setStatus]  = useState('loading'); // loading | success | error | invalid
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    (async () => {
      try {
        const r = await api.get(`/newsletter/confirm?token=${encodeURIComponent(token)}`);
        if (r.data.success) {
          setStatus('success');
          setMessage(r.data.message || 'Your subscription has been confirmed!');
        } else {
          setStatus('error');
          setMessage(r.data.message || 'Something went wrong. Please try again.');
        }
      } catch (e) {
        setStatus('error');
        setMessage(
          e.response?.data?.message ||
          'This confirmation link is invalid or has already been used.'
        );
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-extrabold text-green-600 tracking-tight">
            Pyonea<span className="text-gray-400">.com</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
              </div>
              <p className="text-gray-500 text-sm">Confirming your subscription…</p>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">You're subscribed! 🎉</h1>
              <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
              <p className="text-gray-400 text-xs mt-2">
                You'll receive Pyonea updates, promotions, and new seller highlights.
                You can unsubscribe at any time from any email we send.
              </p>
              <div className="pt-4 space-y-2">
                <Link
                  to="/products"
                  className="block w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Browse Products
                </Link>
                <Link
                  to="/"
                  className="block w-full px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Back to Pyonea
                </Link>
              </div>
            </>
          )}

          {/* Error / Invalid */}
          {(status === 'error' || status === 'invalid') && (
            <>
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
                  <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Link not valid</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                {status === 'invalid'
                  ? 'No confirmation token was found in this link. Please use the link from your confirmation email.'
                  : message}
              </p>
              <div className="pt-4 space-y-2">
                <Link
                  to="/"
                  className="block w-full px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Go to Pyonea
                </Link>
                <a
                  href="mailto:support@pyonea.com"
                  className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-green-600 pt-1"
                >
                  <EnvelopeIcon className="h-4 w-4" /> Contact support
                </a>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Pyonea Marketplace · Yangon, Myanmar
        </p>
      </div>
    </div>
  );
};

export default NewsletterConfirm;
