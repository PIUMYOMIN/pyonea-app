import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopNav } from '@/components/dashboard/dashboard-top-nav';
import { useNativeAuth } from '@/context/native-auth';
import { useTheme } from '@/context/theme';
import { getRoleDestination, hasUserRole } from '@/utils/auth-routing';
import {
  ApiError,
  fetchAdminStats,
  type AdminStats,
} from '@/utils/native-api';

const AdminOverviewNative = lazy(() =>
  import('@/components/admin/admin-overview-native').then((module) => ({
    default: module.AdminOverviewNative,
  })),
);
const AdminAnnouncementsNative = lazy(() =>
  import('@/components/admin/announcement-management-native').then((module) => ({
    default: module.AnnouncementManagementNative,
  })),
);
const AdminSubscriptionManagementNative = lazy(() =>
  import('@/components/admin/subscription-management-native').then((module) => ({
    default: module.AdminSubscriptionManagementNative,
  })),
);
const AdminReviewManagementNative = lazy(() =>
  import('@/components/admin/review-management-native').then((module) => ({
    default: module.ReviewManagementNative,
  })),
);

type AdminTab =
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

const lazyAdminTabs: Partial<Record<AdminTab, LazyExoticComponent<ComponentType>>> = {
  announcements: AdminAnnouncementsNative,
  subscriptions: AdminSubscriptionManagementNative,
  reviews: AdminReviewManagementNative,
};

type AdminNavItem = {
  id: AdminTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

const adminTabs: AdminNavItem[] = [
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

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const normalizeTab = (value?: string): AdminTab => {
  const normalized = value?.toLowerCase();
  return adminTabs.some((tab) => tab.id === normalized) ? (normalized as AdminTab) : 'dashboard';
};

function ComingSoonPanel({ item }: { item: AdminNavItem }) {
  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/25">
        <Feather name={item.icon} color="#16a34a" size={24} />
      </View>
      <Text className="mt-5 font-sans text-xl font-bold text-gray-950 dark:text-slate-100">{item.label}</Text>
      <Text className="mt-2 max-w-2xl font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
        This admin component will be ported in the next step. The route and dashboard shell are ready, so each heavy module can be added one at a time.
      </Text>
    </View>
  );
}

function AdminSidebar({
  activeTab,
  onTab,
  userName,
  userEmail,
}: {
  activeTab: AdminTab;
  onTab: (tab: AdminTab) => void;
  userName: string;
  userEmail: string;
}) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <View className="relative z-20 hidden w-64 border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
      <View className="border-b border-gray-100 px-5 py-5 dark:border-slate-800">
        <Link href="/" asChild>
          <Pressable className="flex-row items-center gap-3">
            <Image source={require('@/assets/images/logo.png')} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="contain" />
            <View>
              <Text className="text-lg text-green-800 dark:text-green-300" style={{ fontFamily: 'Torus-SemiBold' }}>
                Pyonea
              </Text>
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Admin Console</Text>
            </View>
          </Pressable>
        </Link>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-1 px-3 py-4">
        {adminTabs.map((item) => {
          const active = activeTab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onTab(item.id)}
              className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                active ? 'bg-green-50 dark:bg-green-900/25' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}>
              <Feather name={item.icon} color={active ? '#15803d' : '#64748b'} size={18} />
              <Text className={`min-w-0 flex-1 font-sans text-sm font-semibold ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-slate-300'}`} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="border-t border-gray-100 p-4 dark:border-slate-800">
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100" numberOfLines={1}>{userName}</Text>
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-500" numberOfLines={1}>{userEmail}</Text>
          </View>
        </View>
        <Pressable onPress={toggleTheme} className="flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 dark:border-slate-700">
          <Feather name={isDark ? 'sun' : 'moon'} color={isDark ? '#fde68a' : '#64748b'} size={16} />
          <Text className="font-sans text-sm font-semibold text-gray-600 dark:text-slate-300">
            {isDark ? 'Light mode' : 'Dark mode'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AdminMobileDrawer({
  visible,
  activeTab,
  onClose,
  onTab,
  userName,
  userEmail,
}: {
  visible: boolean;
  activeTab: AdminTab;
  onClose: () => void;
  onTab: (tab: AdminTab) => void;
  userName: string;
  userEmail: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="relative z-50 flex-1 md:hidden">
        <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />
        <View className="relative z-10 h-full w-72 bg-white shadow-2xl dark:bg-slate-900">
          <View className="border-b border-gray-100 px-4 py-5 dark:border-slate-800">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Image source={require('@/assets/images/logo.png')} style={{ width: 38, height: 38, borderRadius: 10 }} contentFit="contain" />
                <View>
                  <Text className="text-lg text-green-800 dark:text-green-300" style={{ fontFamily: 'Torus-SemiBold' }}>
                    Pyonea
                  </Text>
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Admin Console</Text>
                </View>
              </View>
              <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="x" color="#64748b" size={18} />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="gap-1 px-3 py-4">
            {adminTabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onTab(item.id)}
                  className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                    active ? 'bg-green-50 dark:bg-green-900/25' : ''
                  }`}>
                  <Feather name={item.icon} color={active ? '#15803d' : '#64748b'} size={18} />
                  <Text className={`min-w-0 flex-1 font-sans text-sm font-semibold ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-slate-300'}`} numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="border-t border-gray-100 p-4 dark:border-slate-800">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">{userName.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100" numberOfLines={1}>{userName}</Text>
                <Text className="font-sans text-xs text-gray-500 dark:text-slate-500" numberOfLines={1}>{userEmail}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminDashboardNative() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useNativeAuth();
  const tabParam = getParam(params.tab);
  const initialTab = normalizeTab(tabParam);
  const lastSyncedTabParam = useRef(tabParam);
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = hasUserRole(user, 'admin');
  const activeItem = useMemo(
    () => adminTabs.find((item) => item.id === activeTab) || adminTabs[0],
    [activeTab]
  );
  const ActiveLazyAdminTab = lazyAdminTabs[activeTab];
  useEffect(() => {
    if (tabParam === lastSyncedTabParam.current) return;
    lastSyncedTabParam.current = tabParam;
    const nextTab = normalizeTab(tabParam);
    const timeout = setTimeout(() => {
      setActiveTab((current) => (current === nextTab ? current : nextTab));
    }, 0);
    return () => clearTimeout(timeout);
  }, [tabParam]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?returnTo=/admin/dashboard' as Href);
      return;
    }
    if (user && !isAdmin) {
      router.replace(getRoleDestination(user));
    }
  }, [authLoading, isAdmin, isAuthenticated, router, user]);

  const loadStats = useCallback(
    async (silent = false) => {
      if (!isAdmin) return;
      if (!silent) setStatsLoading(true);
      setStatsError('');
      try {
        const nextStats = await fetchAdminStats();
        setStats(nextStats);
        setLastUpdated(new Date());
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await logout();
          router.replace('/login?returnTo=/admin/dashboard' as Href);
          return;
        }
        setStatsError(error instanceof Error ? error.message : 'Error loading admin dashboard.');
      } finally {
        if (!silent) setStatsLoading(false);
      }
    },
    [isAdmin, logout, router]
  );

  useEffect(() => {
    if (!isAdmin) return;
    const timeout = setTimeout(() => void loadStats(), 0);
    return () => clearTimeout(timeout);
  }, [isAdmin, loadStats]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'dashboard') return;
    const id = setInterval(() => void loadStats(true), 30_000);
    return () => clearInterval(id);
  }, [activeTab, isAdmin, loadStats]);

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    lastSyncedTabParam.current = tab;
    if (typeof window !== 'undefined') {
      const nextPath = tab === 'dashboard' ? '/admin/dashboard' : `/admin/dashboard?tab=${tab}`;
      window.history.replaceState(null, '', nextPath);
    }
  };

  if (authLoading || !isAuthenticated || !isAdmin) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 dark:bg-slate-950">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-4 font-sans text-sm text-gray-500 dark:text-slate-400">Checking admin access...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950">
      <View className="relative flex-1 overflow-hidden md:flex-row">
        <AdminSidebar
          activeTab={activeTab}
          onTab={selectTab}
          userName={user?.name || 'Admin User'}
          userEmail={user?.email || 'Administrator'}
        />
        <AdminMobileDrawer
          visible={sidebarOpen}
          activeTab={activeTab}
          onClose={() => setSidebarOpen(false)}
          onTab={selectTab}
          userName={user?.name || 'Admin User'}
          userEmail={user?.email || 'Administrator'}
        />

        <View className="relative z-0 min-w-0 flex-1 overflow-hidden">
          <View className="relative z-30 bg-white shadow-sm shadow-slate-200/60 dark:bg-slate-900 dark:shadow-none">
            <DashboardTopNav
              title={activeItem.label}
              subtitle="Manage users, products, orders, sellers, and marketplace operations."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onRefresh={() => void loadStats()}
              dashboardHref="/admin/dashboard"
              showBrand={false}
              leadingAction={
                <Pressable
                  onPress={() => setSidebarOpen(true)}
                  className="h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-950 md:hidden"
                >
                  <Feather name="menu" color="#64748b" size={19} />
                </Pressable>
              }
            />
            <View className="border-t border-gray-100 px-4 py-3 dark:border-slate-800 md:hidden">
              <View className="flex-row items-center gap-2 rounded-xl bg-green-50 px-3 py-2 dark:bg-green-900/20">
                <Feather name={activeItem.icon} color="#15803d" size={15} />
                <Text className="min-w-0 flex-1 font-sans text-xs font-bold text-green-700 dark:text-green-300" numberOfLines={1}>
                  {activeItem.label}
                </Text>
                <Pressable onPress={() => setSidebarOpen(true)}>
                  <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-300">Change</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <ScrollView className="relative z-0 flex-1" contentContainerClassName="px-4 py-6 sm:px-6">
            <View className="mx-auto w-full max-w-7xl gap-5">
              {lastUpdated && activeTab === 'dashboard' ? (
                <Text className="self-end font-sans text-xs text-gray-400 dark:text-slate-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </Text>
              ) : null}

              {activeTab === 'dashboard' ? (
                <Suspense fallback={<ActivityIndicator color="#16a34a" />}>
                  <AdminOverviewNative
                    stats={stats}
                    loading={statsLoading}
                    error={statsError}
                    onRetry={() => void loadStats()}
                  />
                </Suspense>
              ) : ActiveLazyAdminTab ? (
                <Suspense fallback={<ActivityIndicator color="#16a34a" />}>
                  <ActiveLazyAdminTab />
                </Suspense>
              ) : (
                <ComingSoonPanel item={activeItem} />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
