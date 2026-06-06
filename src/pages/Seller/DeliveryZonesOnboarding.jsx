import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import OnboardingLayout from '../../components/OnboardingLayout';
import DeliveryZones from '../../components/seller/DeliveryZones';
import { invalidateOnboardingCache } from '../../components/StepGuard';

const DeliveryZonesOnboarding = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <OnboardingLayout
      title={t('seller_onboarding.deliveryZonesOnboarding.title')}
      description={t('seller_onboarding.deliveryZonesOnboarding.description')}
      showFooter={false}
      currentStepOverride="delivery-zones"
    >
      <div className="p-6 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/seller/onboarding/address')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-green-700 dark:text-slate-300 dark:hover:text-green-400"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('seller_onboarding.deliveryZonesOnboarding.back')}
        </button>

        <DeliveryZones
          showHeader={false}
          saveButtonLabel={t('seller_onboarding.deliveryZonesOnboarding.save_continue')}
          onSaveSuccess={() => {
            invalidateOnboardingCache();
            navigate('/seller/onboarding/documents');
          }}
        />
      </div>
    </OnboardingLayout>
  );
};

export default DeliveryZonesOnboarding;
