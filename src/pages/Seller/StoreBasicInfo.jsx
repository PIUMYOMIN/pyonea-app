// pages/Seller/StoreBasicInfo.jsx
// Step 2 of the new 3-step onboarding: Register → Business Setup → Dashboard
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
    BuildingStorefrontIcon,
    PhotoIcon,
    UserIcon,
    BuildingOfficeIcon,
    TruckIcon,
    UsersIcon,
    ExclamationCircleIcon,
    CheckCircleIcon,
    RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import OnboardingLayout from '../../components/OnboardingLayout';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import api from '../../utils/api';

const StoreBasicInfo = () => {
    const { t, i18n } = useTranslation();
    const loc = (en, mm) => i18n.language === 'my' ? (mm || en) : (en || mm);
    const navigate = useNavigate();
    const { formData, saveStep, completeOnboarding, isLoading, businessTypeInfo } = useOnboardingState();

    const [businessTypes, setBusinessTypes] = useState([]);
    const [storeLogoPreview, setStoreLogoPreview] = useState('');
    const [storeBannerPreview, setStoreBannerPreview] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [error, setError] = useState('');
    const [logoPath, setLogoPath] = useState('');
    const [bannerPath, setBannerPath] = useState('');
    const [logoUploaded, setLogoUploaded] = useState(false);
    const [bannerUploaded, setBannerUploaded] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        trigger,
        reset,
    } = useForm({
        defaultValues: {
            store_name: '',
            business_type_slug: '',
            contact_email: '',
            contact_phone: '',
            store_description: '',
        },
    });

    // Pre-fill from existing onboarding data
    useEffect(() => {
        if (!formData.store_basic) return;
        const saved = formData.store_basic;
        const isDefaultStore = saved.store_name?.endsWith("'s Store");
        reset({
            store_name: isDefaultStore ? '' : (saved.store_name || ''),
            business_type_slug: saved.business_type_slug === 'individual' && isDefaultStore
                ? '' : (saved.business_type_slug || ''),
            contact_email: saved.contact_email || '',
            contact_phone: saved.contact_phone || '',
            store_description: saved.store_description || saved.description || '',
        });
        if (saved.store_logo) {
            setStoreLogoPreview(saved.store_logo);
            setLogoPath(saved.store_logo);
            setLogoUploaded(true);
        }
        if (saved.store_banner) {
            setStoreBannerPreview(saved.store_banner);
            setBannerPath(saved.store_banner);
            setBannerUploaded(true);
        }
    }, [formData.store_basic, reset]);

    useEffect(() => { fetchBusinessTypes(); }, []);

    const selectedBusinessSlug = watch('business_type_slug');
    const selectedBusinessType = businessTypes.find(
        bt => bt.slug_en === selectedBusinessSlug || bt.slug === selectedBusinessSlug
    );

    const fetchBusinessTypes = async () => {
        try {
            const response = await api.get('/business-types');
            if (response.data.success) setBusinessTypes(response.data.data);
        } catch (err) {
            console.error('Failed to fetch business types:', err);
        }
    };

    const getBusinessTypeIcon = (iconName) => {
        const icons = {
            user: <UserIcon className="h-5 w-5" />,
            building: <BuildingOfficeIcon className="h-5 w-5" />,
            store: <BuildingOfficeIcon className="h-5 w-5" />,
            truck: <TruckIcon className="h-5 w-5" />,
            users: <UsersIcon className="h-5 w-5" />,
        };
        return icons[iconName] || <BuildingOfficeIcon className="h-5 w-5" />;
    };

    const handleLogoUpload = async (file) => {
        if (!file) return;
        setUploadingLogo(true);
        setError('');
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await api.post('/seller/onboarding/storeLogo', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.data.success) {
                const { url, path } = res.data.data;
                setStoreLogoPreview(url);
                setLogoPath(path);
                setLogoUploaded(true);
                setValue('store_logo', path, { shouldValidate: true });
            } else {
                setError(res.data.message || t('store_basic.upload_logo_failed'));
            }
        } catch (err) {
            setError(err.response?.data?.message || t('store_basic.upload_logo_failed'));
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleBannerUpload = async (file) => {
        if (!file) return;
        setUploadingBanner(true);
        setError('');
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await api.post('/seller/onboarding/storeBanner', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.data.success) {
                const { url, path } = res.data.data;
                setStoreBannerPreview(url);
                setBannerPath(path);
                setBannerUploaded(true);
                setValue('store_banner', path, { shouldValidate: true });
            } else {
                setError(res.data.message || t('store_basic.upload_banner_failed'));
            }
        } catch (err) {
            setError(err.response?.data?.message || t('store_basic.upload_banner_failed'));
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleRemoveLogo = () => {
        setStoreLogoPreview(''); setLogoPath(''); setLogoUploaded(false);
        setValue('store_logo', '', { shouldValidate: true });
    };

    const handleRemoveBanner = () => {
        setStoreBannerPreview(''); setBannerPath(''); setBannerUploaded(false);
        setValue('store_banner', '', { shouldValidate: true });
    };

    // ── Submit: save store-basic then mark onboarding complete ────────────
    const onSubmit = async (data) => {
        setError('');

        const submitData = {
            ...data,
            store_logo: logoPath,
            store_banner: bannerPath,
        };

        const result = await saveStep('store-basic', submitData);

        if (result.success) {
            // Best-effort: mark onboarding complete (non-blocking)
            await completeOnboarding();
            // Go straight to dashboard — Step 3 ✅
            navigate('/seller/dashboard', { replace: true });
        } else {
            if (result.errors) {
                setError(Object.values(result.errors).flat().join(', '));
            } else {
                setError(result.message || 'Failed to save store information');
            }
        }
    };

    const handleContinue = async () => {
        const isValid = await trigger();
        if (isValid) {
            await onSubmit(watch());
        } else {
            const firstError = Object.keys(errors)[0];
            if (firstError) {
                const el = document.getElementsByName(firstError)[0];
                if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
            }
        }
    };

    return (
        <OnboardingLayout
            title={t('store_basic.title') || 'Set Up Your Business'}
            description={t('store_basic.description') || 'Tell us a bit about your store — this takes under a minute.'}
            onNext={handleContinue}
            nextLabel="Start Selling 🚀"
            nextDisabled={isLoading || uploadingLogo || uploadingBanner}
            loading={isLoading}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-2">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
                        <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* ── Store Name ─────────────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('store_basic.store_name') || 'Store Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        className={`block w-full px-4 py-3 border ${errors.store_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                            } rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder={t('store_basic.enter_store_name') || 'e.g. My Awesome Store'}
                        {...register('store_name', {
                            required: t('store_basic.store_name_required') || 'Store name is required',
                            minLength: { value: 2, message: t('store_basic.store_name_min') || 'Min 2 characters' },
                        })}
                    />
                    {errors.store_name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.store_name.message}</p>
                    )}
                </div>

                {/* ── Business Type ──────────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('store_basic.business_type') || 'Business Type'} <span className="text-red-500">*</span>
                    </label>

                    {/* Visual card picker */}
                    {businessTypes.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                            {businessTypes.map((type) => {
                                const isSelected = selectedBusinessSlug === type.slug_en;
                                return (
                                    <button
                                        key={type.slug_en}
                                        type="button"
                                        onClick={() => setValue('business_type_slug', type.slug_en, { shouldValidate: true })}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center
                                            ${isSelected
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        <span className="text-2xl">{
                                            type.icon === 'user' ? '👤'
                                                : type.icon === 'truck' ? '🚚'
                                                    : type.icon === 'users' ? '👥'
                                                        : '🏢'
                                        }</span>
                                        <span className="text-xs font-medium leading-tight">
                                            {loc(type.name_en, type.name_mm)}
                                        </span>
                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="mt-1 h-20 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent mr-2" />
                            Loading…
                        </div>
                    )}

                    {/* Hidden input for react-hook-form validation */}
                    <input type="hidden" {...register('business_type_slug', {
                        required: t('store_basic.business_type_required') || 'Please select a business type',
                    })} />
                    {errors.business_type_slug && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.business_type_slug.message}</p>
                    )}

                    {/* Business type info card */}
                    {selectedBusinessType && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-800/40 shrink-0">
                                {getBusinessTypeIcon(selectedBusinessType.icon)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                    {loc(selectedBusinessType.name_en, selectedBusinessType.name_mm)}
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                    {loc(selectedBusinessType.description_en, selectedBusinessType.description_mm)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Contact Email ──────────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('store_basic.contact_email') || 'Contact Email'} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        className={`block w-full px-4 py-3 border ${errors.contact_email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                            } rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder="contact@yourstore.com"
                        {...register('contact_email', {
                            required: t('store_basic.email_required') || 'Email is required',
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: t('store_basic.invalid_email') || 'Invalid email address',
                            },
                        })}
                    />
                    {errors.contact_email && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contact_email.message}</p>
                    )}
                </div>

                {/* ── Contact Phone ──────────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('store_basic.contact_phone') || 'Contact Phone'} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        className={`block w-full px-4 py-3 border ${errors.contact_phone ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                            } rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder="+95 9 123 456 789"
                        {...register('contact_phone', {
                            required: t('store_basic.phone_required') || 'Phone number is required',
                            pattern: {
                                value: /^\+?[0-9\s\-\(\)]+$/,
                                message: t('store_basic.invalid_phone') || 'Invalid phone number',
                            },
                        })}
                    />
                    {errors.contact_phone && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contact_phone.message}</p>
                    )}
                </div>

                {/* ── Store Description (optional) ──────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('store_basic.store_description') || 'Store Description'}
                        <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                        rows={3}
                        className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder={t('store_basic.description_placeholder') || 'Tell customers what makes your store special…'}
                        {...register('store_description', {
                            maxLength: { value: 2000, message: 'Max 2000 characters' },
                        })}
                    />
                </div>

                {/* ── Store Logo & Banner (optional, collapsible) ───────── */}
                <details className="group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer
                                        text-sm font-medium text-gray-700 dark:text-gray-300
                                        hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors list-none">
                        <span className="flex items-center gap-2">
                            <PhotoIcon className="w-4 h-4 text-gray-400" />
                            Store Logo &amp; Banner
                            <span className="text-xs font-normal text-gray-400">(optional — can add later)</span>
                        </span>
                        <span className="text-gray-400 group-open:rotate-180 transition-transform text-lg leading-none select-none">⌄</span>
                    </summary>

                    <div className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Logo */}
                        <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Store Logo</p>
                            <div className="flex items-center gap-3">
                                <div className={`w-16 h-16 rounded-xl border-2 ${logoUploaded ? 'border-green-300' : 'border-dashed border-gray-300 dark:border-gray-600'} flex items-center justify-center overflow-hidden shrink-0`}>
                                    {storeLogoPreview
                                        ? <img src={storeLogoPreview} alt="Logo" className="w-full h-full object-cover" />
                                        : <BuildingStorefrontIcon className="h-6 w-6 text-gray-400" />}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <input type="file" accept="image/*" id="logo-upload"
                                        onChange={(e) => handleLogoUpload(e.target.files[0])}
                                        className="hidden" disabled={uploadingLogo} />
                                    <label htmlFor="logo-upload"
                                        className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors text-center">
                                        {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                                    </label>
                                    {logoUploaded && (
                                        <button type="button" onClick={handleRemoveLogo}
                                            className="text-xs px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Banner */}
                        <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Store Banner</p>
                            <div className={`w-full h-16 rounded-xl border-2 ${bannerUploaded ? 'border-green-300' : 'border-dashed border-gray-300 dark:border-gray-600'} flex items-center justify-center overflow-hidden mb-2`}>
                                {storeBannerPreview
                                    ? <img src={storeBannerPreview} alt="Banner" className="w-full h-full object-cover" />
                                    : <PhotoIcon className="h-6 w-6 text-gray-400" />}
                            </div>
                            <div className="flex gap-1">
                                <input type="file" accept="image/*" id="banner-upload"
                                    onChange={(e) => handleBannerUpload(e.target.files[0])}
                                    className="hidden" disabled={uploadingBanner} />
                                <label htmlFor="banner-upload"
                                    className="flex-1 text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors text-center">
                                    {uploadingBanner ? 'Uploading…' : 'Upload Banner'}
                                </label>
                                {bannerUploaded && (
                                    <button type="button" onClick={handleRemoveBanner}
                                        className="text-xs px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </details>

                {/* Hidden fields */}
                <input type="hidden" {...register('store_logo')} />
                <input type="hidden" {...register('store_banner')} />

                {/* ── "What happens next" info box ──────────────────────── */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <RocketLaunchIcon className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-green-900 dark:text-green-200">
                                You're almost there!
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                                After clicking <strong>Start Selling</strong> you'll go straight to your seller dashboard.
                                You can add address, delivery zones, and documents anytime from Settings.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </OnboardingLayout>
    );
};

export default StoreBasicInfo;
