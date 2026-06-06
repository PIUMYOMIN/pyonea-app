// components/SellerRouteGuard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { resolveSellerOnboardingStep } from '../utils/sellerOnboarding';

const SellerRouteGuard = ({ children }) => {
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const validateSeller = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is a seller
      if (user.type !== 'seller' && !user.roles?.includes('seller')) {
        navigate('/');
        return;
      }

      try {
        const response = await api.get('/seller/onboarding/status');
        
        if (response.data.success) {
          const statusData = response.data.data;
          
          // Check if onboarding is complete
          if (statusData.needs_onboarding || !statusData.onboarding_complete) {
            // Redirect to onboarding
            const step = await resolveSellerOnboardingStep(statusData);
            navigate(`/seller/onboarding/${step}`);
          } else {
            // Allow access to dashboard
            setIsValid(true);
          }
        }
      } catch (error) {
        console.error('Seller validation failed:', error);
        navigate('/seller/onboarding/store-basic');
      } finally {
        setLoading(false);
      }
    };

    validateSeller();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Verifying seller status...</p>
        </div>
      </div>
    );
  }

  return isValid ? children : null;
};

export default SellerRouteGuard;