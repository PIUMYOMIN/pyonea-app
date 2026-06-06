// pages/Seller/DocumentUpload.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DocumentIcon,
    CheckCircleIcon,
    CloudArrowUpIcon,
    TrashIcon,
    EyeIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    DocumentCheckIcon
} from '@heroicons/react/24/outline';
import OnboardingLayout from '../../components/OnboardingLayout';
import { useTranslation } from 'react-i18next';
import { useOnboardingState } from '../../hooks/useOnboardingState';


const DocumentUpload = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { saveStep, isLoading, businessTypeInfo, uploadedDocs, documentRequirements, uploadDocument, deleteDocument } = useOnboardingState();
    const [uploading, setUploading] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [documentsComplete, setDocumentsComplete] = useState(false);

    // requirements come from the hook's init() call — no extra fetch needed
    const requirements = documentRequirements;

    useEffect(() => {
        checkDocumentsComplete();
    }, [uploadedDocs, requirements]);

    const checkDocumentsComplete = () => {
        const requiredDocs = requirements.filter(req => req.required);
        const allRequiredUploaded = requiredDocs.every(req =>
            uploadedDocs[req.type]?.uploaded
        );
        setDocumentsComplete(allRequiredUploaded);
    };

    const handleFileUpload = async (field, file, requirement) => {
        if (!file) return;

        const validExtensions = requirement.accepted_formats?.split(',') || ['jpg', 'jpeg', 'png', 'pdf'];
        const fileExt = file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            setError(`${t('seller_onboarding.documentUpload.error_invalid_type')} ${validExtensions.join(', ')}`);
            return;
        }

        const maxSize = requirement.max_size?.includes('5MB') ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
        if (file.size > maxSize) {
            setError(`${t('seller_onboarding.documentUpload.error_too_large')} ${requirement.max_size || '2MB'}`);
            return;
        }

        setUploading({ ...uploading, [field]: true });
        setError('');
        setSuccess('');

        const result = await uploadDocument(file, field);

        if (result.success) {
            setSuccess(`${requirement.label} ${t('seller_onboarding.documentUpload.success_upload')}`);
            setTimeout(() => setSuccess(""), 3000);
        } else {
            setError(result.message || t('seller_onboarding.documentUpload.error_upload'));
        }

        setUploading({ ...uploading, [field]: false });
    };

    const handleRemoveDocument = async (field) => {
        const result = await deleteDocument(field);

        if (result.success) {
            setSuccess(t('seller_onboarding.documentUpload.success_remove'));
            setTimeout(() => setSuccess(""), 3000);
        } else {
            setError(result.message || t('seller_onboarding.documentUpload.error_remove'));
        }
    };

    const handleViewDocument = (url) => {
        if (url) {
            window.open(url, '_blank');
        }
    };

    const handleContinue = async () => {
        setError('');

        const missing = [];
        requirements.forEach(req => {
            if (req.required && !uploadedDocs[req.type]?.uploaded) {
                missing.push(req.label);
            }
        });

        if (missing.length > 0) {
            setError(`${t('seller_onboarding.documentUpload.error_required_docs')} ${missing.join(', ')}`);
            return;
        }

        const result = await saveStep('documents', {});

        if (result.success) {
            navigate(`/seller/onboarding/review-submit`);
        } else {
            setError(result.message || t('seller_onboarding.documentUpload.error_save'));
        }
    };

    const getDocumentStatus = () => {
        const requiredDocs = requirements.filter(req => req.required);
        const uploadedRequired = requiredDocs.filter(
            req => uploadedDocs[req.type]?.uploaded
        ).length;

        return t('seller_onboarding.documentUpload.status_count', { uploaded: uploadedRequired, total: requiredDocs.length });
    };

    return (
        <OnboardingLayout
            title={t('seller_onboarding.documentUpload.title')}
            description={t('seller_onboarding.documentUpload.description')}
            onBack={() => navigate('/seller/onboarding/delivery-zones')}
            onNext={handleContinue}
            nextLabel={t('seller_onboarding.documentUpload.continue_to_review')}
            nextDisabled={isLoading || !documentsComplete}
            loading={isLoading}
        >
            <div className="p-6">
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 dark:hover:text-red-300 self-start sm:self-auto">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
                            </div>
                            <button onClick={() => setSuccess("")} className="text-green-500 hover:text-green-700 dark:hover:text-green-300 self-start sm:self-auto">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Business Type Info */}
                    {businessTypeInfo && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                            <div className="flex items-start">
                                <InformationCircleIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-1">Business Type: {businessTypeInfo.name}</h3>
                                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                                    {businessTypeInfo.is_individual
                                                        ? t('seller_onboarding.documentUpload.individual_message')
                                                        : t('seller_onboarding.documentUpload.business_message')
                                                    }
                                                </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress Status */}
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <DocumentCheckIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                                <span className="font-medium text-yellow-900 dark:text-yellow-200">{t('seller_onboarding.documentUpload.doc_status')}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                documentsComplete
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            }`}>
                                {getDocumentStatus()}
                            </span>
                        </div>
                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                            <p>• {t('seller_onboarding.documentUpload.rule_1')}</p>
                            <p>• {t('seller_onboarding.documentUpload.rule_2')}</p>
                            <p>• {t('seller_onboarding.documentUpload.rule_3')}</p>
                        </div>
                    </div>

                    {/* Document Upload Sections */}
                    {requirements.map((requirement) => (
                        <div key={requirement.type} className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                            {requirement.label}
                                            {requirement.required && <span className="text-red-500 ml-1">*</span>}
                                        </h3>
                                        {uploadedDocs[requirement.type]?.uploaded && (
                                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{requirement.description}</p>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                                        <div>
                                            <span className="font-medium">{t('seller_onboarding.documentUpload.accepted_formats')}</span> {requirement.accepted_formats || 'jpg, jpeg, png, pdf'}
                                        </div>
                                        <div>
                                            <span className="font-medium">{t('seller_onboarding.documentUpload.max_size')}</span> {requirement.max_size || '2MB'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                    {requirement.required ? t('seller_onboarding.documentUpload.required') : t('seller_onboarding.documentUpload.optional')}
                                </div>
                            </div>

                            {uploadedDocs[requirement.type]?.uploaded ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 gap-3">
                                    <div className="flex items-center space-x-3">
                                        <DocumentIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {t('seller_onboarding.documentUpload.doc_uploaded')}
                                            </p>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-1 gap-2">
                                                    <button
                                                    onClick={() => handleViewDocument(uploadedDocs[requirement.type].url)}
                                                    className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center"
                                                >
                                                    <EyeIcon className="h-4 w-4 inline mr-1" />
                                                    {t('seller_onboarding.documentUpload.view')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveDocument(requirement.type)}
                                        className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title={t('seller_onboarding.documentUpload.remove')}
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="file"
                                        id={`file-${requirement.type}`}
                                        accept={requirement.accepted_formats || '.pdf,.jpg,.jpeg,.png'}
                                        onChange={(e) => handleFileUpload(requirement.type, e.target.files[0], requirement)}
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        disabled={uploading[requirement.type]}
                                    />
                                    <label
                                        htmlFor={`file-${requirement.type}`}
                                        className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                                            uploading[requirement.type]
                                                ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/10'
                                        }`}
                                    >
                                        {uploading[requirement.type] ? (
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-3"></div>
                                                <span className="text-sm text-blue-600 dark:text-blue-400">{t('seller_onboarding.documentUpload.uploading')}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('seller_onboarding.documentUpload.click_to_upload')} {requirement.label}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    {requirement.accepted_formats || 'PDF, JPG, JPEG, PNG'} • Max {requirement.max_size || '2MB'}
                                                </span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default DocumentUpload;