// src/components/SellerVerificationPanel.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import VerificationStatusBadge from './SellerVerificationBadge';

const SellerVerificationPanel = ({ onStatusChange }) => {
  const { t } = useTranslation();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchVerificationData();
  }, []);

  const fetchVerificationData = async () => {
    try {
      const response = await api.get('/seller/verification/details');
      setVerificationData(response.data.data);
      if (onStatusChange) {
        onStatusChange(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch verification data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load verification status'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!verificationData?.profile_complete) {
      setMessage({
        type: 'error',
        text: 'Please complete your profile before submitting for verification'
      });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/seller/verification/submit');
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: response.data.message
        });
        fetchVerificationData(); // Refresh data
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to submit for verification'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!verificationData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-slate-400">Unable to load verification data</p>
      </div>
    );
  }

  const getProgressPercentage = () => {
    const requirements = verificationData.requirements || [];
    const completed = requirements.filter(req => req.completed).length;
    const total = requirements.filter(req => req.required).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Store Verification</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Complete verification to unlock selling features
            </p>
          </div>
          <VerificationStatusBadge 
            status={verificationData.verification_status}
            badge={verificationData.verification_badge}
            size="md"
          />
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`px-6 py-3 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
            )}
            <p className={`text-sm ${
              message.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700 dark:text-slate-300">Profile Completion</span>
            <span className="text-gray-500 dark:text-slate-400">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Verification Requirements</h4>
          <div className="space-y-3">
            {verificationData.requirements?.map((requirement, index) => (
              <div key={index} className="flex items-center">
                {requirement.completed ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-slate-600 mr-3 flex-shrink-0"></div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {requirement.name}
                    {!requirement.required && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-slate-500">(Optional)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{requirement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Fields (if any) */}
        {verificationData.missing_fields && verificationData.missing_fields.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2 flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 mr-2" />
              Missing Required Information
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
              {verificationData.missing_fields.map((field, index) => (
                <li key={index} className="flex items-center">
                  <span className="h-1.5 w-1.5 bg-yellow-500 dark:bg-yellow-400 rounded-full mr-2"></span>
                  {field}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Verification Details */}
        {verificationData.verified_at && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Verification Details</h4>
            <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <p>Verified on: {new Date(verificationData.verified_at).toLocaleDateString()}</p>
              <p>Verified by: {verificationData.verified_by || 'System Administrator'}</p>
              {verificationData.admin_notes && (
                <p>Notes: {verificationData.admin_notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={fetchVerificationData}
            disabled={submitting}
            className="flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>

          {verificationData.can_submit && (
            <button
              onClick={handleSubmitVerification}
              disabled={submitting || !verificationData.profile_complete}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            <strong>Note:</strong> Verification typically takes 1-3 business days. 
            Once verified, you'll receive a verification badge and full access to selling features.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerVerificationPanel;