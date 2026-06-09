import type { Href } from 'expo-router';

import type { NativeUser } from '@/utils/native-api';

const isLocalHref = (value?: string | string[]) => {
  const href = Array.isArray(value) ? value[0] : value;
  if (!href) return '';
  if (!href.startsWith('/') || href.startsWith('//')) return '';
  return href;
};

export const hasUserRole = (user: NativeUser | null | undefined, role: string) => {
  if (!user) return false;
  return user.type === role || user.role === role || user.roles?.includes(role);
};

export const getRoleDestination = (user: NativeUser): Href => {
  if (hasUserRole(user, 'admin')) return '/admin/dashboard' as Href;
  if (hasUserRole(user, 'seller')) return '/seller/dashboard';
  if (hasUserRole(user, 'buyer')) return '/buyer/dashboard';
  return '/';
};

export const needsEmailVerification = (user: NativeUser) => {
  if (!user.email || user.emailVerifiedAt) return false;
  return hasUserRole(user, 'seller') || hasUserRole(user, 'admin');
};

const buildVerifyEmailHref = (returnTo?: string | string[]): Href => {
  const safeReturn = isLocalHref(returnTo);
  if (!safeReturn) return '/verify-email';
  return `/verify-email?returnTo=${encodeURIComponent(safeReturn)}` as Href;
};

export const getPostAuthDestination = (
  user: NativeUser,
  returnTo?: string | string[]
): Href => {
  if (needsEmailVerification(user)) {
    return buildVerifyEmailHref(returnTo);
  }
  return (isLocalHref(returnTo) || getRoleDestination(user)) as Href;
};

export const getPostRegistrationDestination = (user: NativeUser): Href => {
  if (user.email && hasUserRole(user, 'seller')) {
    return '/verify-email';
  }
  if (hasUserRole(user, 'seller')) return '/seller/dashboard';
  return '/products';
};

export const getPostLoginDestination = (
  user: NativeUser,
  returnTo?: string | string[]
): Href => getPostAuthDestination(user, returnTo);
