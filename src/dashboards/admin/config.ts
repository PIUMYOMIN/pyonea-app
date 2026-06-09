import type Feather from '@expo/vector-icons/Feather';

export type AdminTab =
  | 'dashboard'
  | 'notifications'
  | 'orders'
  | 'products'
  | 'financial-reports'
  | 'platform-logistics'
  | 'delivery-fees'
  | 'cod-invoices'
  | 'delivery-fee-review'
  | 'users'
  | 'sellers'
  | 'commission-rules'
  | 'subscriptions'
  | 'analytics'
  | 'categories'
  | 'business-types'
  | 'email-campaigns'
  | 'announcements'
  | 'blog'
  | 'reviews'
  | 'rfq'
  | 'contact-messages'
  | 'reports'
  | 'settings';

export type AdminNavItem = {
  id: AdminTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

export const ADMIN_DASHBOARD_PATH = '/admin/dashboard';

export const adminTabs: AdminNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bar-chart-2' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'orders', label: 'Orders', icon: 'shopping-bag' },
  { id: 'products', label: 'Products', icon: 'box' },
  { id: 'financial-reports', label: 'Financial Reports', icon: 'trending-up' },
  { id: 'platform-logistics', label: 'Platform Logistics', icon: 'truck' },
  { id: 'delivery-fees', label: 'Delivery Fee Management', icon: 'truck' },
  { id: 'cod-invoices', label: 'COD Invoice Management', icon: 'dollar-sign' },
  { id: 'delivery-fee-review', label: 'Delivery Fee Review', icon: 'check-circle' },
  { id: 'users', label: 'Users', icon: 'users' },
  { id: 'sellers', label: 'Sellers', icon: 'briefcase' },
  { id: 'commission-rules', label: 'Commission Rules', icon: 'percent' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'star' },
  { id: 'analytics', label: 'Analytics', icon: 'pie-chart' },
  { id: 'categories', label: 'Categories', icon: 'grid' },
  { id: 'business-types', label: 'Business Types', icon: 'archive' },
  { id: 'email-campaigns', label: 'Email Campaigns', icon: 'mail' },
  { id: 'announcements', label: 'Announcements', icon: 'volume-2' },
  { id: 'blog', label: 'Blog', icon: 'file-text' },
  { id: 'reviews', label: 'Seller Reviews', icon: 'message-square' },
  { id: 'rfq', label: 'RFQ', icon: 'clipboard' },
  { id: 'contact-messages', label: 'Contact Messages', icon: 'inbox' },
  { id: 'reports', label: 'Reports', icon: 'flag' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const normalizeAdminTab = (value?: string): AdminTab => {
  const normalized = value?.toLowerCase();
  return adminTabs.some((tab) => tab.id === normalized)
    ? (normalized as AdminTab)
    : 'dashboard';
};
