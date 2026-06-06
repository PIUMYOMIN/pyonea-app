// src/components/OnboardingGuard.jsx
// Redirects seller to their correct onboarding step if they try to skip ahead.
// Shows a loading spinner while checking — prevents a flash of the wrong step.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const OnboardingGuard = ({ children, currentStep }) => {
  const navigate  = useNavigate();
  const [ready, setReady] = useState(false);  // FIX: was rendering children immediately

  useEffect(() => {
    let cancelled = false;

    const checkStep = async () => {
      try {
        const response = await api.get('/seller/onboarding/status');
        if (cancelled) return;

        const { data } = response.data;
        if (data.needs_onboarding && data.current_step !== currentStep) {
          navigate(`/seller/onboarding/${data.current_step}`, { replace: true });
          return;
        }
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to check onboarding step:', error);
          setReady(true); // fail open so seller isn't stuck
        }
      }
    };

    checkStep();
    return () => { cancelled = true; };
  }, [currentStep, navigate]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  return <>{children}</>;
};

export default OnboardingGuard;