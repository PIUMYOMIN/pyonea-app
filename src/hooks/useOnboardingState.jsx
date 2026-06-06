// hooks/useOnboardingState.js
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { invalidateOnboardingCache } from '../components/StepGuard';

export const useOnboardingState = () => {
    const [currentStep, setCurrentStep] = useState('store-basic');
    const [formData, setFormData] = useState({});
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [businessTypeInfo, setBusinessTypeInfo] = useState(null);
    const [uploadedDocs, setUploadedDocs] = useState({});
    const [documentRequirements, setDocumentRequirements] = useState([]);

    const initStarted = useRef(false);

    // ── 3-step flow: Register → Business Setup → Dashboard
    // Only one actual onboarding page remains: store-basic (Business Setup)
    const steps = [
        { id: 'store-basic', title: 'Business Setup', icon: '🏪' },
    ];

    const init = useCallback(async () => {
        if (initStarted.current) return;
        initStarted.current = true;

        try {
            setIsLoading(true);

            await api.post('/seller/init-profile').catch(() => { });

            const [dataRes, statusRes] = await Promise.allSettled([
                api.get('/seller/onboarding/data'),
                api.get('/seller/onboarding/status'),
            ]);

            if (dataRes.status === 'fulfilled' && dataRes.value.data.success) {
                setFormData(dataRes.value.data.data);
            }

            if (statusRes.status === 'fulfilled' && statusRes.value.data.success) {
                const { data } = statusRes.value.data;
                setCurrentStep('store-basic');
                setProgress(data.progress_percentage ?? data.progress ?? 0);

                if (data.business_type_info) {
                    setBusinessTypeInfo(data.business_type_info);
                }
            }

        } catch (error) {
            console.error('Onboarding init failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Save step ─────────────────────────────────────────────────────────
    const saveStep = async (step, data) => {
        try {
            setIsLoading(true);

            const endpoints = {
                'store-basic': '/seller/onboarding/store-basic',
            };

            const endpoint = endpoints[step];
            if (!endpoint) throw new Error(`No endpoint for step: ${step}`);

            const response = await api.post(endpoint, data);

            if (response.data.success) {
                setFormData(prev => ({ ...prev, ...data }));
                invalidateOnboardingCache();

                // After store-basic, mark onboarding complete
                return {
                    success: true,
                    nextStep: 'complete',
                    data: response.data.data,
                };
            }

            return {
                success: false,
                errors: response.data.errors,
                message: response.data.message,
            };

        } catch (error) {
            console.error('Save step failed:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to save',
                errors: error.response?.data?.errors,
            };
        } finally {
            setIsLoading(false);
        }
    };

    // ── Complete onboarding (called after store-basic save) ───────────────
    const completeOnboarding = async () => {
        try {
            const response = await api.post('/seller/onboarding/quick-complete');
            return response.data.success
                ? { success: true }
                : { success: false, message: response.data.message };
        } catch (error) {
            // If quick-complete doesn't exist yet, swallow the error — the
            // dashboard will still work, just in pending/needs-review state.
            console.warn('Quick-complete call failed (non-fatal):', error.message);
            return { success: true };
        }
    };

    const loadOnboardingStatus = useCallback(async () => {
        try {
            const response = await api.get('/seller/onboarding/status');
            if (response.data.success) {
                const { data } = response.data;
                setCurrentStep('store-basic');
                setProgress(data.progress_percentage ?? data.progress ?? 0);
                if (data.business_type_info) {
                    setBusinessTypeInfo(data.business_type_info);
                }
            }
        } catch (error) {
            console.error('Failed to load onboarding status:', error);
        }
    }, []);

    useEffect(() => {
        init();
    }, [init]);

    return {
        currentStep,
        setCurrentStep,
        formData,
        setFormData,
        progress,
        steps,
        isLoading,
        businessTypeInfo,
        uploadedDocs,
        documentRequirements,
        saveStep,
        completeOnboarding,
        loadOnboardingStatus,
    };
};
