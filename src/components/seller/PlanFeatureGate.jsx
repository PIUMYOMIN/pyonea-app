// src/components/seller/PlanFeatureGate.jsx
import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useSubscription } from '../../context/SubscriptionContext';

const FEATURE_LABELS = {
  analytics_enabled:   'Analytics Dashboard',
  bulk_import_enabled: 'Bulk Import / Export',
  priority_support:    'Priority Support',
  custom_storefront:   'Custom Storefront',
};

/**
 * Wraps any content that requires a specific plan feature.
 * Shows an upgrade prompt instead of rendering children when the
 * seller's active plan does not include the feature.
 *
 * Usage:
 *   <PlanFeatureGate feature="analytics_enabled">
 *     <SalesReports />
 *   </PlanFeatureGate>
 */
const PlanFeatureGate = ({ feature, children }) => {
  const { hasFeature, loading, subscription } = useSubscription();

  // Still loading subscription — render nothing to avoid flash
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  const featureLabel   = FEATURE_LABELS[feature] ?? feature;
  const currentPlan    = subscription?.plan?.name ?? 'Basic';

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
        <SparklesIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {featureLabel} not available
      </h3>

      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        Your current <span className="font-semibold text-gray-700 dark:text-gray-300">{currentPlan}</span> plan
        does not include {featureLabel}. Upgrade to unlock this feature.
      </p>

      <a
        href="/seller/dashboard?tab=subscription"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
      >
        <SparklesIcon className="w-4 h-4" />
        View Upgrade Options
      </a>
    </div>
  );
};

export default PlanFeatureGate;