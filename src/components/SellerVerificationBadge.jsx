// src/components/VerificationStatusBadge.jsx
import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  StarIcon,
  TrophyIcon,
  RocketIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const VerificationStatusBadge = ({ status, badge, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircleIcon,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-300',
          label: 'Verified'
        };
      case 'pending':
        return {
          icon: ClockIcon,
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-800 dark:text-yellow-300',
          label: 'Pending Verification'
        };
      case 'rejected':
        return {
          icon: XCircleIcon,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-800 dark:text-red-300',
          label: 'Rejected'
        };
      default:
        return {
          icon: ShieldCheckIcon,
          iconColor: 'text-gray-500 dark:text-slate-400',
          bgColor: 'bg-gray-100 dark:bg-slate-700',
          textColor: 'text-gray-800 dark:text-slate-300',
          label: 'Not Verified'
        };
    }
  };

  const getBadgeConfig = (badgeType) => {
    switch (badgeType) {
      case 'premium':
        return {
          icon: StarIcon,
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-800 dark:text-yellow-300',
          label: 'Premium Seller'
        };
      case 'top_rated':
        return {
          icon: TrophyIcon,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-800 dark:text-blue-300',
          label: 'Top Rated'
        };
      case 'fast_shipper':
        return {
          icon: RocketIcon,
          iconColor: 'text-purple-500',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          textColor: 'text-purple-800 dark:text-purple-300',
          label: 'Fast Shipper'
        };
      case 'verified':
        return {
          icon: CheckCircleIcon,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-300',
          label: 'Verified'
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();
  const badgeConfig = badge ? getBadgeConfig(badge) : null;
  const StatusIcon = statusConfig.icon;
  const BadgeIcon = badgeConfig?.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Status Badge */}
      <div className={`inline-flex items-center ${sizeClasses[size]} rounded-full ${statusConfig.bgColor} ${statusConfig.textColor} font-medium`}>
        <StatusIcon className={`h-4 w-4 mr-1 ${statusConfig.iconColor}`} />
        <span>{statusConfig.label}</span>
      </div>

      {/* Additional Badge (if any) */}
      {badgeConfig && (
        <div className={`inline-flex items-center ${sizeClasses[size]} rounded-full ${badgeConfig.bgColor} ${badgeConfig.textColor} font-medium`}>
          <BadgeIcon className={`h-4 w-4 mr-1 ${badgeConfig.iconColor}`} />
          <span>{badgeConfig.label}</span>
        </div>
      )}
    </div>
  );
};

export default VerificationStatusBadge;