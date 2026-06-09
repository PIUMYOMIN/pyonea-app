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

export const getPostLoginDestination = (
  user: NativeUser,
  returnTo?: string | string[]
): Href => (isLocalHref(returnTo) || getRoleDestination(user)) as Href;
