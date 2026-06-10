import type { AdminVerificationSeller } from '@/utils/native-api';
import { getNativeImageUrl, resolveAdminSellerDocumentUrl } from '@/utils/native-api';

export type SellerCenterSection = 'directory' | 'verification' | 'verified';

export const SELLER_CENTER_SECTIONS: {
  id: SellerCenterSection;
  label: string;
  shortLabel: string;
  description: string;
  icon: 'briefcase' | 'shield' | 'award';
}[] = [
  {
    id: 'directory',
    label: 'All sellers',
    shortLabel: 'Directory',
    description: 'Search, filter, and update store status for every seller account.',
    icon: 'briefcase',
  },
  {
    id: 'verification',
    label: 'Verification queue',
    shortLabel: 'Verification',
    description: 'Review KYC documents, NRC, and approve or reject pending sellers.',
    icon: 'shield',
  },
  {
    id: 'verified',
    label: 'Verified directory',
    shortLabel: 'Verified',
    description: 'Export and manage sellers who already passed verification.',
    icon: 'award',
  },
];

export const NRC_STATUS_CFG: Record<string, { label: string; wrap: string; text: string }> = {
  unverified: { label: 'Unverified', wrap: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-500 dark:text-slate-400' },
  pending: { label: 'Pending', wrap: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  verified: { label: 'Verified', wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  mismatch: { label: 'Mismatch', wrap: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
  rejected: { label: 'Rejected', wrap: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

export const VERIFICATION_LEVEL_CFG: Record<string, { label: string; wrap: string; text: string }> = {
  basic: { label: 'Basic', wrap: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
  verified: { label: 'Verified', wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  premium: { label: 'Premium', wrap: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
};

export const BADGE_CFG: Record<string, { label: string; wrap: string; text: string }> = {
  verified: { label: 'Verified', wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  premium: { label: 'Premium', wrap: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  featured: { label: 'Featured', wrap: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  top_rated: { label: 'Top Rated', wrap: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
};

export const VERIFICATION_STATUS_CFG: Record<string, { wrap: string; text: string }> = {
  pending: { wrap: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  under_review: { wrap: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
  verified: { wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  rejected: { wrap: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
};

export const STORE_STATUS_OPTS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' },
  { value: 'setup_pending', label: 'Setup Pending' },
];

export const formatAdminDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getSellerDocumentUrl = (
  seller: AdminVerificationSeller,
  field: keyof AdminVerificationSeller | string,
  fallback?: string
) => resolveAdminSellerDocumentUrl(seller, field) || getNativeImageUrl(fallback);

export const isPdfUrl = (url?: string) => Boolean(url && url.toLowerCase().includes('.pdf'));

export const isImageUrl = (url?: string) => Boolean(url && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url));
