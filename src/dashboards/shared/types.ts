import type Feather from '@expo/vector-icons/Feather';
import type { Href } from 'expo-router';
import type { ReactNode } from 'react';

export type DashboardRole = 'admin' | 'seller' | 'buyer';

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  locked?: boolean;
};

export type DashboardNavVariant = 'list' | 'pill' | 'seller';

export type DashboardShellProps = {
  navItems?: DashboardNavItem[];
  navVariant?: DashboardNavVariant;
  activeTab: string;
  onTab: (tab: string) => void;
  title: string;
  subtitle?: string;
  dashboardHref: Href;
  sidebarOpen: boolean;
  onSidebarOpen: (open: boolean) => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  showBrand?: boolean;
  brandSubtitle?: string;
  sidebarHeader?: ReactNode;
  sidebarFooter?: ReactNode;
  drawerHeader?: ReactNode;
  drawerFooter?: ReactNode;
  sidebar?: ReactNode;
  mobileDrawer?: ReactNode;
  mobileTabBar?: boolean;
  headerBelow?: ReactNode;
  children: ReactNode;
};
