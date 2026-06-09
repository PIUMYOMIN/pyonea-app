import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { useNativeAuth } from '@/context/native-auth';
import {
  getRoleDestination,
  hasUserRole,
  needsEmailVerification,
} from '@/utils/auth-routing';

import type { DashboardRole } from './types';

type UseDashboardGuardOptions = {
  role: DashboardRole;
  returnTo: string;
  requireEmailVerification?: boolean;
};

export function useDashboardGuard({
  role,
  returnTo,
  requireEmailVerification = role !== 'buyer',
}: UseDashboardGuardOptions) {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useNativeAuth();
  const hasRole = hasUserRole(user, role);
  const isReady = !authLoading && isAuthenticated && hasRole;

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}` as Href);
      return;
    }

    if (user && requireEmailVerification && needsEmailVerification(user)) {
      router.replace(
        `/verify-email?returnTo=${encodeURIComponent(returnTo)}` as Href,
      );
      return;
    }

    if (user && !hasUserRole(user, role)) {
      router.replace(getRoleDestination(user));
    }
  }, [authLoading, isAuthenticated, requireEmailVerification, returnTo, role, router, user]);

  const handleUnauthorized = useCallback(async () => {
    await logout();
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}` as Href);
  }, [logout, returnTo, router]);

  return {
    user,
    isReady,
    authLoading,
    isAuthenticated,
    hasRole,
    logout,
    handleUnauthorized,
  };
}
