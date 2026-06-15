import { type Href } from 'expo-router';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
  ADMIN_DASHBOARD_PATH,
  adminTabs,
  normalizeAdminTab,
  type AdminTab,
} from '@/dashboards/admin/config';
import {
  ComingSoonPanel,
  DashboardLoading,
  DashboardShell,
  useDashboardGuard,
  useDashboardTabs,
} from '@/dashboards/shared';
import {
  ApiError,
  fetchAdminStats,
  type AdminStats,

  formatApiErrorMessage,
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
const AdminOrderManagementNative = lazy(() =>
  import('@/components/admin/order-management-native').then((module) => ({
    default: module.OrderManagementNative,
  })),
);
const AdminProductManagementNative = lazy(() =>
  import('@/components/admin/product-management-native').then((module) => ({
    default: module.ProductManagementNative,
  })),
);
const AdminUserManagementNative = lazy(() =>
  import('@/components/admin/user-management-native').then((module) => ({
    default: module.UserManagementNative,
  })),
);
const AdminSellersManagementNative = lazy(() =>
  import('@/components/admin/admin-seller-center-native').then((module) => ({
    default: module.AdminSellerCenterNative,
  })),
);
const AdminPlatformLogisticsNative = lazy(() =>
  import('@/components/admin/platform-logistics-native').then((module) => ({
    default: module.PlatformLogisticsNative,
  })),
);
const AdminDeliveryFeeManagementNative = lazy(() =>
  import('@/components/admin/delivery-fee-management-native').then((module) => ({
    default: module.DeliveryFeeManagementNative,
  })),
);
const AdminCodInvoiceManagementNative = lazy(() =>
  import('@/components/admin/cod-invoice-management-native').then((module) => ({
    default: module.CodInvoiceManagementNative,
  })),
);
const AdminCommissionRulesManagementNative = lazy(() =>
  import('@/components/admin/commission-rules-management-native').then((module) => ({
    default: module.CommissionRulesManagementNative,
  })),
);
const AdminCategoryManagementNative = lazy(() =>
  import('@/components/admin/category-management-native').then((module) => ({
    default: module.CategoryManagementNative,
  })),
);
const AdminBusinessTypeManagementNative = lazy(() =>
  import('@/components/admin/business-type-management-native').then((module) => ({
    default: module.BusinessTypeManagementNative,
  })),
);
const AdminEmailCampaignsNative = lazy(() =>
  import('@/components/admin/email-campaigns-native').then((module) => ({
    default: module.EmailCampaignsNative,
  })),
);
const AdminAnalyticsManagementNative = lazy(() =>
  import('@/components/admin/analytics-management-native').then((module) => ({
    default: module.AnalyticsManagementNative,
  })),
);
const AdminRfqNative = lazy(() =>
  import('@/components/admin/admin-rfq-native').then((module) => ({
    default: module.AdminRfqNative,
  })),
);
const AdminReportManagementNative = lazy(() =>
  import('@/components/admin/report-management-native').then((module) => ({
    default: module.ReportManagementNative,
  })),
);
const AdminFinancialReportsNative = lazy(() =>
  import('@/components/admin/financial-reports-native').then((module) => ({
    default: module.AdminFinancialReportsNative,
  })),
);
const AdminBlogManagementNative = lazy(() =>
  import('@/components/admin/blog-management-native').then((module) => ({
    default: module.BlogManagementNative,
  })),
);
const AdminDeliveryFeeReviewNative = lazy(() =>
  import('@/components/admin/delivery-fee-review-native').then((module) => ({
    default: module.DeliveryFeeReviewNative,
  })),
);
const AdminSettingsNative = lazy(() =>
  import('@/components/admin/settings-native').then((module) => ({
    default: module.AdminSettingsNative,
  })),
);
const AdminContactMessagesNative = lazy(() =>
  import('@/components/admin/contact-messages-management-native').then((module) => ({
    default: module.ContactMessagesManagementNative,
  })),
);
const AdminNotificationsNative = lazy(() =>
  import('@/components/admin/admin-notifications-native').then((module) => ({
    default: module.AdminNotificationsNative,
  })),
);

const lazyAdminTabs: Partial<Record<AdminTab, LazyExoticComponent<ComponentType>>> = {
  announcements: AdminAnnouncementsNative,
  orders: AdminOrderManagementNative,
  products: AdminProductManagementNative,
  users: AdminUserManagementNative,
  sellers: AdminSellersManagementNative,
  'platform-logistics': AdminPlatformLogisticsNative,
  'delivery-fees': AdminDeliveryFeeManagementNative,
  'delivery-fee-review': AdminDeliveryFeeReviewNative,
  'cod-invoices': AdminCodInvoiceManagementNative,
  'commission-rules': AdminCommissionRulesManagementNative,
  categories: AdminCategoryManagementNative,
  'business-types': AdminBusinessTypeManagementNative,
  'email-campaigns': AdminEmailCampaignsNative,
  analytics: AdminAnalyticsManagementNative,
  rfq: AdminRfqNative,
  reports: AdminReportManagementNative,
  'financial-reports': AdminFinancialReportsNative,
  blog: AdminBlogManagementNative,
  subscriptions: AdminSubscriptionManagementNative,
  reviews: AdminReviewManagementNative,
  settings: AdminSettingsNative,
  'contact-messages': AdminContactMessagesNative,
  notifications: AdminNotificationsNative,
};

export function AdminDashboardNative() {
  const { user, isReady, handleUnauthorized } = useDashboardGuard({
    role: 'admin',
    returnTo: ADMIN_DASHBOARD_PATH,
  });
  const { activeTab, selectTab } = useDashboardTabs<AdminTab>({
    basePath: ADMIN_DASHBOARD_PATH,
    defaultTab: 'dashboard',
    normalizeTab: normalizeAdminTab,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeItem = useMemo(
    () => adminTabs.find((item) => item.id === activeTab) || adminTabs[0],
    [activeTab],
  );
  const ActiveLazyAdminTab = lazyAdminTabs[activeTab];
  const userName = user?.name || 'Admin User';
  const userEmail = user?.email || 'Administrator';

  const loadStats = useCallback(
    async (silent = false) => {
      if (!isReady) return;
      if (!silent) setStatsLoading(true);
      setStatsError('');
      try {
        const nextStats = await fetchAdminStats();
        setStats(nextStats);
        setLastUpdated(new Date());
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await handleUnauthorized();
          return;
        }
        setStatsError(formatApiErrorMessage(error, 'Error loading admin dashboard.'));
      } finally {
        if (!silent) setStatsLoading(false);
      }
    },
    [handleUnauthorized, isReady],
  );

  useEffect(() => {
    if (!isReady) return;
    const timeout = setTimeout(() => void loadStats(), 0);
    return () => clearTimeout(timeout);
  }, [isReady, loadStats]);

  useEffect(() => {
    if (!isReady || activeTab !== 'dashboard') return;
    const id = setInterval(() => void loadStats(true), 30_000);
    return () => clearInterval(id);
  }, [activeTab, isReady, loadStats]);

  const handleSelectTab = (tab: string) => {
    selectTab(tab as AdminTab);
    setSidebarOpen(false);
  };

  if (!isReady) {
    return <DashboardLoading message="Checking admin access..." />;
  }

  return (
    <DashboardShell
      navItems={adminTabs}
      navVariant="list"
      activeTab={activeTab}
      onTab={handleSelectTab}
      title={activeItem.label}
      subtitle="Manage users, products, orders, sellers, and marketplace operations."
      dashboardHref={ADMIN_DASHBOARD_PATH as Href}
      sidebarOpen={sidebarOpen}
      onSidebarOpen={setSidebarOpen}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onRefresh={() => void loadStats()}
      showBrand={false}
      brandSubtitle="Admin Console"
      sidebarFooter={
        <View>
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100" numberOfLines={1}>
                {userName}
              </Text>
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-500" numberOfLines={1}>
                {userEmail}
              </Text>
            </View>
          </View>
        </View>
      }>
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
    </DashboardShell>
  );
}
