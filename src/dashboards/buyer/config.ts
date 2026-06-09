import type Feather from '@expo/vector-icons/Feather';

export type BuyerTab = 'dashboard' | 'orders' | 'history' | 'cart' | 'wishlist' | 'settings';

export type BuyerNavItem = {
  id: BuyerTab;
  icon: keyof typeof Feather.glyphMap;
  labelKey: string;
};

export const BUYER_DASHBOARD_PATH = '/buyer/dashboard';

export const buyerTabDefinitions: BuyerNavItem[] = [
  { id: 'dashboard', icon: 'home', labelKey: 'sidebar.dashboard' },
  { id: 'orders', icon: 'shopping-bag', labelKey: 'buyer_dashboard.my_orders' },
  { id: 'history', icon: 'file-text', labelKey: 'buyer_dashboard.purchase_history' },
  { id: 'cart', icon: 'shopping-cart', labelKey: 'buyer_dashboard.my_cart' },
  { id: 'wishlist', icon: 'heart', labelKey: 'buyer_dashboard.wishlist' },
  { id: 'settings', icon: 'settings', labelKey: 'buyer_dashboard.settings' },
];

export const normalizeBuyerTab = (value?: string): BuyerTab => {
  const normalized = (value || 'dashboard').toLowerCase() as BuyerTab;
  return buyerTabDefinitions.some((tab) => tab.id === normalized) ? normalized : 'dashboard';
};
