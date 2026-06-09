import type Feather from '@expo/vector-icons/Feather';

export type SellerTab =
  | 'dashboard'
  | 'notifications'
  | 'my_store'
  | 'orders'
  | 'products'
  | 'discounts'
  | 'coupons'
  | 'delivery_zones'
  | 'rfq'
  | 'sales'
  | 'reviews'
  | 'customers'
  | 'delivery'
  | 'subscription'
  | 'bulk_import'
  | 'financial_reports'
  | 'wallet'
  | 'settings';

export type SellerFeatureFlag =
  | 'analytics_enabled'
  | 'bulk_import_enabled'
  | 'priority_support'
  | 'custom_storefront';

export type SellerNavItem = {
  id: SellerTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

export const SELLER_DASHBOARD_PATH = '/seller/dashboard';

export const sellerTabs: SellerNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bar-chart-2' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'my_store', label: 'My Store', icon: 'home' },
  { id: 'orders', label: 'Orders', icon: 'shopping-bag' },
  { id: 'products', label: 'Products', icon: 'box' },
  { id: 'discounts', label: 'Discounts', icon: 'tag' },
  { id: 'coupons', label: 'Coupons', icon: 'percent' },
  { id: 'delivery_zones', label: 'Delivery Zones', icon: 'map-pin' },
  { id: 'rfq', label: 'RFQ', icon: 'clipboard' },
  { id: 'sales', label: 'Sales Reports', icon: 'trending-up' },
  { id: 'reviews', label: 'Reviews', icon: 'star' },
  { id: 'customers', label: 'Customers', icon: 'users' },
  { id: 'delivery', label: 'Delivery', icon: 'truck' },
  { id: 'subscription', label: 'Subscription', icon: 'zap' },
  { id: 'bulk_import', label: 'Bulk Import', icon: 'upload' },
  { id: 'financial_reports', label: 'Financial Reports', icon: 'file-text' },
  { id: 'wallet', label: 'Wallet', icon: 'credit-card' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const protectedSellerTabs: Partial<Record<SellerTab, SellerFeatureFlag>> = {
  sales: 'analytics_enabled',
  financial_reports: 'analytics_enabled',
  bulk_import: 'bulk_import_enabled',
};

export const featureLabels: Record<SellerFeatureFlag, string> = {
  analytics_enabled: 'Analytics Dashboard',
  bulk_import_enabled: 'Bulk Import / Export',
  priority_support: 'Priority Support',
  custom_storefront: 'Custom Storefront',
};

export const normalizeSellerTab = (value?: string): SellerTab => {
  const normalized = value?.toLowerCase().replaceAll('-', '_');
  if (normalized === 'store_profile' || normalized === 'edit_store') return 'my_store';
  if (normalized === 'profile') return 'settings';
  if (normalized === 'coupon' || normalized === 'coupon_codes') return 'coupons';
  if (normalized === 'discount' || normalized === 'discount_rules') return 'discounts';
  return sellerTabs.some((tab) => tab.id === normalized)
    ? (normalized as SellerTab)
    : 'dashboard';
};

export const formatSellerTabParam = (tab: SellerTab): string | undefined =>
  tab === 'dashboard' ? undefined : tab.replaceAll('_', '-');
