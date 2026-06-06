// components/seller/SellerDashboardRedirect.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { invalidateOnboardingCache } from '../StepGuard';
import { resolveSellerOnboardingStep } from '../../utils/sellerOnboarding';

const SellerDashboardRedirect = () => {
    const navigate  = useNavigate();
    const { user }  = useAuth();
    const started   = useRef(false);

    useEffect(() => {
        if (!user || started.current) return;
        started.current = true;

        const checkOnboardingStatus = async () => {
            // ── Email verification gate ────────────────────────────────────────
            // All users must verify email before accessing seller onboarding
            if (!user.email_verified_at) {
                navigate('/verify-email', { replace: true });
                return;
            }

            try {
                // Invalidate the StepGuard cache so the next step page gets fresh data
                invalidateOnboardingCache();

                const response = await api.get('/seller/onboarding/status');

                if (response.data.success) {
                    const statusData = response.data.data;

                    if (statusData.needs_onboarding || !statusData.onboarding_complete) {
                        const step = await resolveSellerOnboardingStep(statusData);
                        navigate(`/seller/onboarding/${step}`, { replace: true });
                    } else {
                        navigate('/seller/dashboard', { replace: true });
                    }
                } else {
                    navigate('/seller/onboarding/store-basic', { replace: true });
                }
            } catch (error) {
                console.error('Failed to check onboarding status:', error);
                navigate('/seller/onboarding/store-basic', { replace: true });
            }
        };

        checkOnboardingStatus();
    }, [user, navigate]);

    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-950">
            <div className="text-center">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-green-500 mx-auto mb-4" />
                <p className="text-gray-700 dark:text-slate-200 font-medium">Setting up your seller account...</p>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Please wait</p>
            </div>
        </div>
    );
};

export default SellerDashboardRedirect;