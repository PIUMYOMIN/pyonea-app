// pages/Seller/BusinessDetails.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
    BuildingOfficeIcon,
    CreditCardIcon,
    GlobeAltIcon,
    InformationCircleIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import OnboardingLayout from '../../components/OnboardingLayout';
import NrcInput from '../../components/seller/NrcInput';
import { useOnboardingState } from '../../hooks/useOnboardingState';

const BusinessDetails = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { formData, saveStep, isLoading, businessTypeInfo } = useOnboardingState();
    const [error, setError] = useState('');
    const [isIndividual, setIsIndividual] = useState(false);
    const [nrcValue, setNrcValue] = useState({
        nrc_division:      formData?.business_details?.nrc_division      || '',
        nrc_township_code: formData?.business_details?.nrc_township_code || '',
        nrc_township_mm:   formData?.business_details?.nrc_township_mm   || '',
        nrc_type:          formData?.business_details?.nrc_type          || '',
        nrc_number:        formData?.business_details?.nrc_number        || '',
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        trigger
    } = useForm({
        defaultValues: formData.business_details || {
            business_registration_number: '',
            tax_id: '',
            website: '',
            account_number: '',
            social_facebook: '',
            social_instagram: '',
            social_twitter: '',
            social_linkedin: ''
        }
    });

    useEffect(() => {
        if (businessTypeInfo) {
            setIsIndividual(businessTypeInfo.is_individual || false);
        }
    }, [businessTypeInfo]);

    const onSubmit = async (data) => {
        setError('');

        if (!isIndividual) {
            if (!data.business_registration_number?.trim()) {
                setError(t('seller_onboarding.businessDetails.error_reg_required'));
                return;
            }
            if (!data.tax_id?.trim()) {
                setError(t('seller_onboarding.businessDetails.error_tax_required'));
                return;
            }
        }

        const result = await saveStep('business-details', { ...data, ...nrcValue });

        if (result.success) {
            navigate(`/seller/onboarding/${result.nextStep}`);
        } else {
            setError(result.message || t('seller_onboarding.businessDetails.error_save'));
        }
    };

    const handleContinue = async () => {
        const isValid = await trigger();
        if (isValid) {
            await onSubmit(watch());
        }
    };

    const inputClass = (hasError) =>
        `mt-1 block w-full px-4 py-3 border ${
            hasError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
        } rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500`;

    const addonWrapperClass = "mt-1 flex rounded-xl shadow-sm overflow-hidden border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500";
    const prefixClass = "inline-flex items-center px-3 py-3 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm border-r border-gray-300 dark:border-gray-600 whitespace-nowrap flex-shrink-0";
    const suffixInputClass = "flex-1 min-w-0 px-3 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none";

    return (
        <OnboardingLayout
            title={t("seller_onboarding.businessDetails.title")}
            description={t("seller_onboarding.businessDetails.subtitle")}
            onBack={() => navigate('/seller/onboarding/store-basic')}
            onNext={handleContinue}
            nextLabel={t("seller_onboarding.businessDetails.continue_to_address")}
            nextDisabled={isLoading}
            loading={isLoading}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <div className="flex items-center">
                            <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                            <p className="text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Business Registration Details - Only for non-individuals */}
                    {!isIndividual && (
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                                <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                                {t("seller_onboarding.businessDetails.section_registration")}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t("seller_onboarding.businessDetails.registrationNumber.label")} *
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass(errors.business_registration_number)}
                                        placeholder={t("seller_onboarding.businessDetails.registrationNumber.placeholder")}
                                        {...register("business_registration_number", {
                                            required: !isIndividual ? t('seller_onboarding.businessDetails.error_reg_required') : false
                                        })}
                                    />
                                    {errors.business_registration_number && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.business_registration_number.message}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {t("seller_onboarding.businessDetails.reg_hint")}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t("seller_onboarding.businessDetails.taxId.label")} *
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass(errors.tax_id)}
                                        placeholder={t("seller_onboarding.businessDetails.taxId.placeholder")}
                                        {...register("tax_id", {
                                            required: !isIndividual ? t('seller_onboarding.businessDetails.error_tax_required') : false
                                        })}
                                    />
                                    {errors.tax_id && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tax_id.message}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {t("seller_onboarding.businessDetails.tax_hint")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financial Information */}
                    <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <CreditCardIcon className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                            {t("seller_onboarding.businessDetails.section_financial")} ({t("seller_onboarding.businessDetails.optional")})
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("seller_onboarding.businessDetails.accountNumber.label")}
                                </label>
                                <input
                                    type="text"
                                    className={inputClass(false)}
                                    placeholder={t("seller_onboarding.businessDetails.accountNumber.placeholder")}
                                    {...register("account_number")}
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {t("seller_onboarding.businessDetails.bank_hint")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Online Presence */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <GlobeAltIcon className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                            {t("seller_onboarding.businessDetails.section_online")} ({t("seller_onboarding.businessDetails.optional")})
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t("seller_onboarding.businessDetails.website.label")}
                                </label>
                                <div className={addonWrapperClass}>
                                    <span className={prefixClass}>https://</span>
                                    <input
                                        type="text"
                                        className={suffixInputClass}
                                        placeholder="yourstore.com"
                                        {...register("website")}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t("seller_onboarding.businessDetails.social_media")}
                                </label>
                                <div className="space-y-3">
                                    <div className={addonWrapperClass}>
                                        <span className={prefixClass}>facebook.com/</span>
                                        <input type="text" className={suffixInputClass} placeholder="yourpage" {...register("social_facebook")} />
                                    </div>
                                    <div className={addonWrapperClass}>
                                        <span className={prefixClass}>instagram.com/</span>
                                        <input type="text" className={suffixInputClass} placeholder="yourprofile" {...register("social_instagram")} />
                                    </div>
                                    <div className={addonWrapperClass}>
                                        <span className={prefixClass}>twitter.com/</span>
                                        <input type="text" className={suffixInputClass} placeholder="yourprofile" {...register("social_twitter")} />
                                    </div>
                                    <div className={addonWrapperClass}>
                                        <span className={prefixClass}>linkedin.com/in/</span>
                                        <input type="text" className={suffixInputClass} placeholder="yourprofile" {...register("social_linkedin")} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Myanmar NRC */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 flex items-center">
                        <span className="mr-2">🪪</span> {t("seller_onboarding.businessDetails.nrc_title")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t("seller_onboarding.businessDetails.nrc_subtitle")}</p>
                    <NrcInput
                        value={nrcValue}
                        onChange={setNrcValue}
                    />
                </div>

                {/* Information Card */}
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                <span className="font-medium">{t("seller_onboarding.businessDetails.info_next")}</span> {t("seller_onboarding.businessDetails.info_next_text")}
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                {t("seller_onboarding.businessDetails.info_doc_note")}
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </OnboardingLayout>
    );
};

export default BusinessDetails;