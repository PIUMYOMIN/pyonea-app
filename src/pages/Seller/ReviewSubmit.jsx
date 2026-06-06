// pages/Seller/ReviewSubmit.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    CheckCircleIcon,
    BuildingStorefrontIcon,
    DocumentTextIcon,
    MapPinIcon,
    DocumentIcon,
    ClockIcon,
    ShieldCheckIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import OnboardingLayout from '../../components/OnboardingLayout';
import { useOnboardingState } from '../../hooks/useOnboardingState';

const ReviewSubmit = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { formData, saveStep, isLoading } = useOnboardingState();

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const TERMS = [
        { id: 'terms-accuracy',   label: t('seller_onboarding.reviewSubmit.term_0') },
        { id: 'terms-tos',        label: t('seller_onboarding.reviewSubmit.term_1') },
        { id: 'terms-suspension', label: t('seller_onboarding.reviewSubmit.term_2') },
    ];

    const NEXT_STEPS = [
        t('seller_onboarding.reviewSubmit.next_0'),
        t('seller_onboarding.reviewSubmit.next_1'),
        t('seller_onboarding.reviewSubmit.next_2'),
        t('seller_onboarding.reviewSubmit.next_3'),
    ];

    const [termsChecked, setTermsChecked] = useState(
        () => Object.fromEntries(TERMS.map(term => [term.id, false]))
    );
    const allTermsAccepted = Object.values(termsChecked).every(Boolean);

    const toggleTerm = (id) =>
        setTermsChecked(prev => ({ ...prev, [id]: !prev[id] }));

    const notProvided = t('seller_onboarding.reviewSubmit.not_provided');

    const getSafeValue = (obj, path) => {
        if (!obj) return notProvided;
        const keys = path.split('.');
        let result = obj;
        for (const key of keys) {
            if (result === undefined || result === null) return notProvided;
            result = result[key];
        }
        return result === '' || result === null || result === undefined
            ? notProvided
            : result;
    };

    const addressData         = formData.address         || {};
    const storeBasicData      = formData.store_basic      || {};
    const businessDetailsData = formData.business_details || {};

    const docsSubmitted =
        formData.documents?.documents_submitted ?? formData.documents_submitted;

    const handleSubmit = async () => {
        setError('');

        if (!allTermsAccepted) {
            setError(t('seller_onboarding.reviewSubmit.error_terms'));
            return;
        }

        if (docsSubmitted === false) {
            setError(t('seller_onboarding.reviewSubmit.error_docs'));
            return;
        }

        setSubmitting(true);

        const result = await saveStep('review-submit', { terms_accepted: true });

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                navigate('/seller', {
                    state: {
                        success: true,
                        message: 'Seller onboarding completed successfully! Your store is now under review.',
                    },
                });
            }, 3000);
        } else {
            if (Array.isArray(result.errors) && result.errors.length > 0) {
                setError(t('seller_onboarding.reviewSubmit.error_complete') + ' ' + result.errors.join(', '));
            } else {
                setError(result.message || t('seller_onboarding.reviewSubmit.error_save'));
            }
        }

        setSubmitting(false);
    };

    const handleEditSection = (section) => navigate(`/seller/onboarding/${section}`);

    // ── Success screen ───────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:bg-gray-900 dark:from-gray-900 dark:to-gray-900 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                    <div className="mx-auto h-20 w-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
                        <CheckCircleIcon className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('seller_onboarding.reviewSubmit.success_title')}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('seller_onboarding.reviewSubmit.success_desc')}
                    </p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {t('seller_onboarding.reviewSubmit.redirecting')}
                    </p>
                </div>
            </div>
        );
    }

    const sectionClass = "border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6";
    const labelClass   = "text-xs sm:text-sm text-gray-500 dark:text-gray-400";
    const valueClass   = "font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100";
    const editBtnClass = "text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:underline flex-shrink-0";

    // ── Main render ──────────────────────────────────────────────────────────
    return (
        <OnboardingLayout
            title={t('seller_onboarding.reviewSubmit.title')}
            description={t('seller_onboarding.reviewSubmit.description')}
            onBack={() => navigate('/seller/onboarding/documents')}
            onNext={handleSubmit}
            nextLabel={submitting
                ? t('seller_onboarding.reviewSubmit.saving')
                : t('seller_onboarding.reviewSubmit.submit')}
            nextDisabled={submitting || isLoading || !allTermsAccepted}
            loading={submitting}
            showFooter={true}
        >
            <div className="p-4 sm:p-6">

                {/* Error banner */}
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <div className="flex items-start gap-2">
                            <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-4 sm:space-y-6">

                    {/* Store Information */}
                    <div className={sectionClass}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-3">
                                <BuildingStorefrontIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                                    {t('seller_onboarding.reviewSubmit.store_info')}
                                </h3>
                            </div>
                            <button onClick={() => handleEditSection('store-basic')} className={editBtnClass}>
                                {t('seller_onboarding.reviewSubmit.edit')}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <p className={labelClass}>{t('seller_onboarding.reviewSubmit.store_name')}</p>
                                <p className={`${valueClass} truncate`}>{getSafeValue(storeBasicData, 'store_name')}</p>
                            </div>
                            <div>
                                <p className={labelClass}>{t('seller_onboarding.reviewSubmit.business_type')}</p>
                                <p className={`${valueClass} truncate`}>{getSafeValue(storeBasicData, 'business_type_slug')}</p>
                            </div>
                            <div className="min-w-0">
                                <p className={labelClass}>{t('seller_onboarding.reviewSubmit.contact_email')}</p>
                                <p className={`${valueClass} truncate`} title={getSafeValue(storeBasicData, 'contact_email')}>
                                    {getSafeValue(storeBasicData, 'contact_email')}
                                </p>
                            </div>
                            <div>
                                <p className={labelClass}>{t('seller_onboarding.reviewSubmit.contact_phone')}</p>
                                <p className={`${valueClass} truncate`}>{getSafeValue(storeBasicData, 'contact_phone')}</p>
                            </div>
                            {getSafeValue(storeBasicData, 'description') !== notProvided && (
                                <div className="sm:col-span-2">
                                    <p className={labelClass}>{t('seller_onboarding.reviewSubmit.field_description')}</p>
                                    <p className={valueClass}>{getSafeValue(storeBasicData, 'description')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Business Details — only when data exists */}
                    {(businessDetailsData.business_registration_number ||
                        businessDetailsData.tax_id ||
                        businessDetailsData.website ||
                        businessDetailsData.account_number) && (
                        <div className={sectionClass}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center space-x-3">
                                    <DocumentTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                                        {t('seller_onboarding.reviewSubmit.business_details')}
                                    </h3>
                                </div>
                                <button onClick={() => handleEditSection('business-details')} className={editBtnClass}>
                                    {t('seller_onboarding.reviewSubmit.edit')}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {businessDetailsData.business_registration_number && (
                                    <div>
                                        <p className={labelClass}>{t('seller_onboarding.reviewSubmit.reg_number')}</p>
                                        <p className={`${valueClass} truncate`}>{businessDetailsData.business_registration_number}</p>
                                    </div>
                                )}
                                {businessDetailsData.tax_id && (
                                    <div>
                                        <p className={labelClass}>{t('seller_onboarding.reviewSubmit.tax_id')}</p>
                                        <p className={`${valueClass} truncate`}>{businessDetailsData.tax_id}</p>
                                    </div>
                                )}
                                {businessDetailsData.website && (
                                    <div>
                                        <p className={labelClass}>{t('seller_onboarding.reviewSubmit.website')}</p>
                                        <p className={`${valueClass} truncate`}>{businessDetailsData.website}</p>
                                    </div>
                                )}
                                {businessDetailsData.account_number && (
                                    <div>
                                        <p className={labelClass}>{t('seller_onboarding.reviewSubmit.account_number')}</p>
                                        <p className={`${valueClass} truncate`}>{businessDetailsData.account_number}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Address Information */}
                    <div className={sectionClass}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-3">
                                <MapPinIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                                    {t('seller_onboarding.reviewSubmit.address_info')}
                                </h3>
                            </div>
                            <button onClick={() => handleEditSection('address')} className={editBtnClass}>
                                {t('seller_onboarding.reviewSubmit.edit')}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="sm:col-span-2">
                                <p className={labelClass}>{t('seller_onboarding.reviewSubmit.address')}</p>
                                <p className={valueClass}>{addressData.address || notProvided}</p>
                            </div>
                            <div>
                                <p className={labelClass}>{t('seller_onboarding.reviewSubmit.city')}</p>
                                <p className={`${valueClass} truncate`}>{addressData.city || notProvided}</p>
                            </div>
                            <div>
                                <p className={labelClass}>{t('seller_onboarding.reviewSubmit.state_region')}</p>
                                <p className={`${valueClass} truncate`}>{addressData.state || notProvided}</p>
                            </div>
                            <div>
                                <p className={labelClass}>{t('seller_onboarding.reviewSubmit.country')}</p>
                                <p className={`${valueClass} truncate`}>{addressData.country || notProvided}</p>
                            </div>
                            {addressData.postal_code && (
                                <div>
                                    <p className={labelClass}>{t('seller_onboarding.reviewSubmit.postal_code')}</p>
                                    <p className={valueClass}>{addressData.postal_code}</p>
                                </div>
                            )}
                            {addressData.location && (
                                <div>
                                    <p className={labelClass}>{t('seller_onboarding.reviewSubmit.location')}</p>
                                    <p className={valueClass}>{addressData.location}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Documents Status */}
                    <div className={sectionClass}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-3">
                                <DocumentIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                                    {t('seller_onboarding.reviewSubmit.documents')}
                                </h3>
                            </div>
                            <button onClick={() => handleEditSection('documents')} className={editBtnClass}>
                                {t('seller_onboarding.reviewSubmit.edit')}
                            </button>
                        </div>

                        {docsSubmitted ? (
                            <div className="flex flex-wrap items-center gap-3">
                                <ShieldCheckIcon className="h-8 w-8 text-green-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {t('seller_onboarding.reviewSubmit.docs_submitted')}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {t('seller_onboarding.reviewSubmit.docs_uploaded_desc')}
                                    </p>
                                </div>
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium whitespace-nowrap">
                                    {t('seller_onboarding.reviewSubmit.docs_submitted_badge')}
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-3">
                                <ExclamationCircleIcon className="h-8 w-8 text-amber-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {t('seller_onboarding.reviewSubmit.docs_not_submitted')}
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                        {t('seller_onboarding.reviewSubmit.docs_go_back')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleEditSection('documents')}
                                    className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 whitespace-nowrap"
                                >
                                    {t('seller_onboarding.reviewSubmit.docs_complete')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-3 flex items-center text-sm sm:text-base">
                        <DocumentIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                        {t('seller_onboarding.reviewSubmit.terms_title')}
                    </h4>
                    <ul className="space-y-3">
                        {TERMS.map(term => (
                            <li key={term.id}>
                                <label
                                    htmlFor={term.id}
                                    className="flex items-start gap-3 cursor-pointer group"
                                >
                                    <input
                                        type="checkbox"
                                        id={term.id}
                                        checked={termsChecked[term.id]}
                                        onChange={() => toggleTerm(term.id)}
                                        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-yellow-400 text-green-600 focus:ring-green-500 cursor-pointer"
                                    />
                                    <span className="text-sm text-yellow-800 dark:text-yellow-300 group-hover:text-yellow-900 dark:group-hover:text-yellow-200 leading-snug">
                                        {term.label}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>

                    {!allTermsAccepted && (
                        <p className="mt-3 text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
                            <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                            {t('seller_onboarding.reviewSubmit.terms_warning')}
                        </p>
                    )}
                </div>

                {/* What Happens Next */}
                <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center text-sm sm:text-base">
                        <ClockIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                        {t('seller_onboarding.reviewSubmit.next_steps_title')}
                    </h4>
                    <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                        {NEXT_STEPS.map((text) => (
                            <li key={text} className="flex items-start gap-3">
                                <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                                <span>{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </OnboardingLayout>
    );
};

export default ReviewSubmit;
