import Feather from "@expo/vector-icons/Feather";
import { OptimizedImage as Image } from "@/components/ui/optimized-image";
import { Link, useLocalSearchParams, useRouter, type Href } from "expo-router";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NativeNotificationBell } from "@/components/notifications/native-notification-bell";
import { useNativeAuth } from "@/context/native-auth";
import { useTheme } from "@/context/theme";
import { supportedLanguages, useAppTranslation, type SupportedLanguage } from "@/i18n";
import {
  getRoleDestination,
  hasUserRole,
  needsEmailVerification,
} from "@/utils/auth-routing";
import { getSellerTierConfig } from "@/utils/seller-tier";
import {
  ApiError,
  fetchSellerDashboardOverview,
  fetchSellerSubscriptionOverview,
  fetchSellerWalletOverview,
  formatMMK,
  type SellerDashboardOverview,
  type SellerDashboardStats,
  type SellerSubscription,
  type SellerStoreSummary,
  type SellerWalletSummary,
} from "@/utils/native-api";

const ProductManagementNative = lazy(() =>
  import("@/components/seller/product-management-native").then((module) => ({
    default: module.ProductManagementNative,
  })),
);

const OrderManagementNative = lazy(() =>
  import("@/components/seller/order-management-native").then((module) => ({
    default: module.OrderManagementNative,
  })),
);

const RfqManagementNative = lazy(() =>
  import("@/components/seller/rfq-management-native").then((module) => ({
    default: module.RfqManagementNative,
  })),
);

const SellerSettingsNative = lazy(() =>
  import("@/components/seller/settings-native").then((module) => ({
    default: module.SellerSettingsNative,
  })),
);

const SellerNotificationsNative = lazy(() =>
  import("@/components/seller/notifications-native").then((module) => ({
    default: module.SellerNotificationsNative,
  })),
);

const DeliveryManagementNative = lazy(() =>
  import("@/components/seller/delivery-management-native").then((module) => ({
    default: module.DeliveryManagementNative,
  })),
);

const DeliveryZonesNative = lazy(() =>
  import("@/components/seller/delivery-zones-native").then((module) => ({
    default: module.DeliveryZonesNative,
  })),
);

const ReviewManagementNative = lazy(() =>
  import("@/components/seller/review-management-native").then((module) => ({
    default: module.ReviewManagementNative,
  })),
);

const SubscriptionNative = lazy(() =>
  import("@/components/seller/subscription-native").then((module) => ({
    default: module.SubscriptionNative,
  })),
);

const SellerWalletNative = lazy(() =>
  import("@/components/seller/wallet-native").then((module) => ({
    default: module.SellerWalletNative,
  })),
);

const BulkImportNative = lazy(() =>
  import("@/components/seller/bulk-import-native").then((module) => ({
    default: module.BulkImportNative,
  })),
);

const CustomersNative = lazy(() =>
  import("@/components/seller/customers-native").then((module) => ({
    default: module.CustomersNative,
  })),
);

const SalesReportsNative = lazy(() =>
  import("@/components/seller/sales-reports-native").then((module) => ({
    default: module.SalesReportsNative,
  })),
);

const FinancialReportsNative = lazy(() =>
  import("@/components/seller/financial-reports-native").then((module) => ({
    default: module.FinancialReportsNative,
  })),
);

const CouponsNative = lazy(() =>
  import("@/components/seller/coupons-native").then((module) => ({
    default: module.CouponsNative,
  })),
);

const DiscountsNative = lazy(() =>
  import("@/components/seller/discounts-native").then((module) => ({
    default: module.DiscountsNative,
  })),
);

type SellerTab =
  | "dashboard"
  | "notifications"
  | "my_store"
  | "orders"
  | "products"
  | "discounts"
  | "coupons"
  | "delivery_zones"
  | "rfq"
  | "sales"
  | "reviews"
  | "customers"
  | "delivery"
  | "subscription"
  | "bulk_import"
  | "financial_reports"
  | "wallet"
  | "settings";

type SellerNavItem = {
  id: SellerTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
};

type SellerFeatureFlag =
  | "analytics_enabled"
  | "bulk_import_enabled"
  | "priority_support"
  | "custom_storefront";

const sellerTabs: SellerNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "bar-chart-2" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "my_store", label: "My Store", icon: "home" },
  { id: "orders", label: "Orders", icon: "shopping-bag" },
  { id: "products", label: "Products", icon: "box" },
  { id: "discounts", label: "Discounts", icon: "tag" },
  { id: "coupons", label: "Coupons", icon: "percent" },
  { id: "delivery_zones", label: "Delivery Zones", icon: "map-pin" },
  { id: "rfq", label: "RFQ", icon: "clipboard" },
  { id: "sales", label: "Sales Reports", icon: "trending-up" },
  { id: "reviews", label: "Reviews", icon: "star" },
  { id: "customers", label: "Customers", icon: "users" },
  { id: "delivery", label: "Delivery", icon: "truck" },
  { id: "subscription", label: "Subscription", icon: "zap" },
  { id: "bulk_import", label: "Bulk Import", icon: "upload" },
  { id: "financial_reports", label: "Financial Reports", icon: "file-text" },
  { id: "wallet", label: "Wallet", icon: "credit-card" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const featureLabels: Record<SellerFeatureFlag, string> = {
  analytics_enabled: "Analytics Dashboard",
  bulk_import_enabled: "Bulk Import / Export",
  priority_support: "Priority Support",
  custom_storefront: "Custom Storefront",
};

const protectedSellerTabs: Partial<Record<SellerTab, SellerFeatureFlag>> = {
  sales: "analytics_enabled",
  financial_reports: "analytics_enabled",
  bulk_import: "bulk_import_enabled",
};

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const SELLER_HEADER_CONTROL_CLASS = "h-10 w-10";
const SELLER_HEADER_ICON_SIZE = 20;
const SELLER_HEADER_CONTROL_PX = 40;

const normalizeSellerTab = (value?: string): SellerTab => {
  const normalized = value?.toLowerCase().replaceAll("-", "_");
  if (normalized === "store_profile" || normalized === "edit_store")
    return "my_store";
  if (normalized === "profile") return "settings";
  if (normalized === "coupon" || normalized === "coupon_codes")
    return "coupons";
  if (normalized === "discount" || normalized === "discount_rules")
    return "discounts";
  return sellerTabs.some((tab) => tab.id === normalized)
    ? (normalized as SellerTab)
    : "dashboard";
};

function StoreAvatar({ store }: { store: SellerStoreSummary | null }) {
  if (store?.logoUrl) {
    return (
      <Image
        source={{ uri: store.logoUrl }}
        style={{ width: 48, height: 48 }}
        className="rounded-2xl border-2 border-green-200"
        contentFit="cover"
      />
    );
  }

  return (
    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-green-600">
      <Feather name="home" color="#ffffff" size={22} />
    </View>
  );
}

function SellerSidebar({
  activeTab,
  onTab,
  store,
  userName,
  userEmail,
  stats,
  subscription,
}: {
  activeTab: SellerTab;
  onTab: (tab: SellerTab) => void;
  store: SellerStoreSummary | null;
  userName: string;
  userEmail: string;
  stats: SellerDashboardStats;
  subscription: SellerSubscription | null;
}) {
  const { isDark } = useTheme();

  return (
    <View className="relative z-20 hidden w-80 border-r border-gray-200/60 bg-white/80 shadow-xl dark:border-slate-700/60 dark:bg-slate-800/80 md:flex">
      <ScrollView
        className="flex-1 px-4 pb-4 pt-8"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => onTab("dashboard")}
          className="mb-8 flex-row items-center gap-4 px-2"
        >
            <View className="relative">
              <StoreAvatar store={store} />
              <View className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-400 dark:border-slate-800" />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100"
                numberOfLines={1}
              >
                {store?.name || "Seller Center"}
              </Text>
              <Text
                className="font-sans text-sm font-medium text-green-600 dark:text-green-400"
                numberOfLines={1}
              >
                Seller Account
              </Text>
            </View>
        </Pressable>

        {sellerTabs.map((item) => {
          const active = activeTab === item.id;
          const feature = protectedSellerTabs[item.id];
          const locked = feature
            ? !sellerPlanHasFeature(subscription, feature)
            : false;
          return (
            <Pressable
              key={item.id}
              onPress={() => onTab(item.id)}
              className={`mb-1 flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
                active
                  ? "bg-green-500 dark:bg-emerald-500"
                  : "bg-transparent"
              }`}
            >
              <Feather
                name={item.icon}
                color={active ? "#ffffff" : isDark ? "#cbd5e1" : "#64748b"}
                size={18}
              />
              <Text
                className={`min-w-0 flex-1 font-sans text-sm font-semibold ${
                  active ? "text-white" : "text-gray-600 dark:text-slate-300"
                }`}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {locked ? (
                <Feather
                  name="lock"
                  color={active ? "#ffffff" : isDark ? "#94a3b8" : "#9ca3af"}
                  size={13}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="border-t border-gray-200/60 bg-white/50 p-6 dark:border-slate-700/60 dark:bg-slate-800/50">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-500 dark:bg-slate-700">
            <Text className="font-sans text-sm font-medium text-white">
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100"
              numberOfLines={1}
            >
              {userName}
            </Text>
            <Text
              className="font-sans text-xs text-gray-500 dark:text-slate-500"
              numberOfLines={1}
            >
              {userEmail}
            </Text>
          </View>
        </View>
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 items-center rounded-lg bg-green-50 p-2 dark:bg-green-900/20">
            <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-400">
              {stats.totalProducts}
            </Text>
            <Text className="font-sans text-xs text-gray-600 dark:text-slate-400">
              Products
            </Text>
          </View>
          <View className="flex-1 items-center rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
            <Text className="font-sans text-sm font-bold text-blue-700 dark:text-blue-400">
              {stats.totalOrders}
            </Text>
            <Text className="font-sans text-xs text-gray-600 dark:text-slate-400">
              Orders
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SellerMobileDrawer({
  visible,
  activeTab,
  onClose,
  onTab,
  store,
  subscription,
}: {
  visible: boolean;
  activeTab: SellerTab;
  onClose: () => void;
  onTab: (tab: SellerTab) => void;
  store: SellerStoreSummary | null;
  subscription: SellerSubscription | null;
}) {
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/45" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="h-full w-80 max-w-[86%] bg-white shadow-2xl dark:bg-slate-900"
        >
          <View className="border-b border-gray-100 px-5 py-5 dark:border-slate-800">
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <StoreAvatar store={store} />
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-sans text-base font-black text-gray-950 dark:text-slate-100"
                    numberOfLines={1}
                  >
                    {store?.name || "Seller Dashboard"}
                  </Text>
                  <Text
                    className="font-sans text-xs text-gray-500 dark:text-slate-400"
                    numberOfLines={1}
                  >
                    Seller workspace
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800"
              >
                <Feather
                  name="x"
                  color={isDark ? "#cbd5e1" : "#64748b"}
                  size={18}
                />
              </Pressable>
            </View>
          </View>
          <ScrollView className="flex-1 px-3 py-4">
            {sellerTabs.map((item) => {
              const active = activeTab === item.id;
              const feature = protectedSellerTabs[item.id];
              const locked = feature
                ? !sellerPlanHasFeature(subscription, feature)
                : false;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onTab(item.id)}
                  className={`mb-1 flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
                    active ? "bg-green-600" : ""
                  }`}
                >
                  <Feather
                    name={item.icon}
                    color={active ? "#ffffff" : isDark ? "#cbd5e1" : "#64748b"}
                    size={18}
                  />
                  <Text
                    className={`font-sans text-sm font-semibold ${
                      active
                        ? "text-white"
                        : "text-gray-600 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </Text>
                  {locked ? (
                    <Feather
                      name="lock"
                      color={active ? "#ffffff" : isDark ? "#94a3b8" : "#9ca3af"}
                      size={13}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  sub?: string;
}) {
  const { isDark } = useTheme();
  const lightAccents: Record<string, string> = {
    green: "#dcfce7",
    blue: "#dbeafe",
    amber: "#fef3c7",
    red: "#fee2e2",
    purple: "#ede9fe",
    teal: "#ccfbf1",
    gray: "#f1f5f9",
  };
  const darkAccents: Record<string, string> = {
    green: "#052e16",
    blue: "#172554",
    amber: "#451a03",
    red: "#450a0a",
    purple: "#2e1065",
    teal: "#042f2e",
    gray: "#1e293b",
  };
  const iconColors: Record<string, string> = {
    green: isDark ? "#4ade80" : "#16a34a",
    blue: isDark ? "#60a5fa" : "#2563eb",
    amber: isDark ? "#fbbf24" : "#d97706",
    red: isDark ? "#f87171" : "#dc2626",
    purple: isDark ? "#c084fc" : "#7c3aed",
    teal: isDark ? "#2dd4bf" : "#0f766e",
    gray: isDark ? "#cbd5e1" : "#64748b",
  };
  const accents = isDark ? darkAccents : lightAccents;

  return (
    <View
      className="w-full rounded-xl border-l-4 p-4 shadow-sm dark:shadow-none sm:w-[48%] lg:w-[31%] xl:w-[23%]"
      style={{
        backgroundColor: accents[accent] || accents.gray,
        borderLeftColor: iconColors[accent] || iconColors.gray,
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text
            className="font-sans text-xs font-medium text-gray-500 dark:text-slate-400"
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            className="mt-1 font-sans text-xl font-bold text-gray-900 dark:text-slate-100"
            numberOfLines={1}
          >
            {value}
          </Text>
          {sub ? (
            <Text
              className="mt-0.5 font-sans text-[11px] text-gray-500 dark:text-slate-400"
              numberOfLines={1}
            >
              {sub}
            </Text>
          ) : null}
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-900/60">
          <Feather
            name={icon}
            color={iconColors[accent] || iconColors.gray}
            size={18}
          />
        </View>
      </View>
    </View>
  );
}

function getProgressNumber(progress?: Record<string, unknown>) {
  const value = Number(progress?.percentage);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

function SetupChecklistPanel({
  store,
  onTab,
}: {
  store: SellerStoreSummary | null;
  onTab: (tab: SellerTab) => void;
}) {
  const progress = store?.setupProgress;
  const percent = getProgressNumber(progress);
  const rawItems = Array.isArray(progress?.items) ? progress?.items ?? [] : [];
  const items = rawItems.length
    ? rawItems.slice(0, 5).map((item) => {
        const record =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
        return {
          label: String(record.label || "Setup item"),
          complete: Boolean(record.complete),
          step: String(record.action_step || ""),
        };
      })
    : [
        {
          label: "Complete store profile",
          complete: Boolean(store),
          step: "my-store",
        },
        {
          label: "Set up delivery zones",
          complete: false,
          step: "delivery_zones",
        },
        { label: "Add products", complete: false, step: "products" },
      ];

  return (
    <View className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
      <View className="flex-row items-start gap-3">
        <Feather name="alert-triangle" color="#f59e0b" size={20} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-sans text-sm font-semibold text-amber-800 dark:text-amber-300">
              Store Setup
            </Text>
            <Text className="font-sans text-xs font-semibold text-amber-800 dark:text-amber-300">
              {Math.round(percent)}%
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950">
            <View
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${percent}%` }}
            />
          </View>
          <View className="mt-3 gap-1.5">
            {items.map((item) => (
              <View key={item.label} className="flex-row items-start gap-2">
                <View
                  className={`mt-1.5 h-1.5 w-1.5 rounded-full ${
                    item.complete ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                <Text className="min-w-0 flex-1 font-sans text-xs leading-4 text-amber-800 dark:text-amber-300">
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => onTab("my_store")}
            className="mt-3 flex-row items-center justify-center rounded-lg bg-amber-500 px-3 py-2"
          >
            <Text className="font-sans text-xs font-bold text-white">
              Continue Setup
            </Text>
            <Feather name="arrow-right" color="#ffffff" size={13} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TierCard({
  store,
  stats,
  subscription,
  onUpgrade,
}: {
  store: SellerStoreSummary | null;
  stats: SellerDashboardStats;
  subscription: SellerSubscription | null;
  onUpgrade: () => void;
}) {
  const { t } = useAppTranslation();
  const tierConfig = getSellerTierConfig(store?.sellerTier);
  const delivered = Math.max(
    0,
    store?.deliveredOrdersCount ||
      store?.completedOrdersCount ||
      stats.deliveredOrders ||
      0,
  );
  const promotedAt = store?.tierPromotedAt
    ? new Date(store.tierPromotedAt).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : null;

  const plan = subscription?.plan;
  const productsUsed = Math.max(
    0,
    subscription?.productsUsed ?? plan?.productsUsed ?? stats.totalProducts ?? 0,
  );
  const productLimit = plan?.productLimitValue ?? -1;
  const finiteProductLimit = productLimit !== -1;
  const productsRemaining = finiteProductLimit
    ? Math.max(0, productLimit - productsUsed)
    : null;
  const productProgress = finiteProductLimit
    ? Math.min(100, Math.round((productsUsed / Math.max(productLimit, 1)) * 100))
    : 0;
  const productNearLimit =
    finiteProductLimit && productsUsed >= Math.max(0, productLimit - 1);

  const tierProgress = tierConfig.threshold
    ? Math.min(100, Math.round((delivered / tierConfig.threshold) * 100))
    : 100;
  const ordersRemaining =
    tierConfig.threshold != null ? Math.max(0, tierConfig.threshold - delivered) : 0;

  return (
    <View
      className={`rounded-xl border p-5 ${tierConfig.borderClass} ${tierConfig.bgClass}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {t("seller.tier.your_tier", "Your Tier")}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-2xl">{tierConfig.emoji}</Text>
            <Text className={`font-sans text-xl font-bold ${tierConfig.textClass}`}>
              {tierConfig.label}
            </Text>
          </View>
          {promotedAt ? (
            <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500">
              {t("seller.tier.since", "Since")} {promotedAt}
            </Text>
          ) : null}
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
            {t("seller.tier.delivered_orders", "Delivered orders")}:{" "}
            <Text className="font-semibold text-gray-700 dark:text-slate-200">
              {delivered}
            </Text>
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
            {t("subscription.commission_rate", "Commission rate")}
          </Text>
          <Text className={`mt-1 font-sans text-2xl font-bold ${tierConfig.textClass}`}>
            {tierConfig.rate}
          </Text>
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
            {t("seller.tier.per_order", "per order")}
          </Text>
        </View>
      </View>

      {tierConfig.threshold ? (
        <View className="mt-4">
          <View className="mb-1.5 flex-row justify-between">
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {t("seller.tier.delivered_orders_count", "{{count}} delivered orders", {
                count: delivered,
              })}
            </Text>
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {t("seller.tier.threshold_for_next", "{{count}} for {{next}}", {
                count: tierConfig.threshold,
                next: tierConfig.next,
              })}
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-700">
            <View
              className={`h-full rounded-full ${tierConfig.progressClass}`}
              style={{ width: `${tierProgress}%` }}
            />
          </View>
          <Text className="mt-1.5 font-sans text-xs text-gray-400 dark:text-slate-500">
            {ordersRemaining > 0
              ? t(
                  "seller.tier.orders_to_next",
                  "{{count}} more delivered orders to reach {{next}}",
                  { count: ordersRemaining, next: tierConfig.next },
                )
              : t(
                  "seller.tier.ready_for_next",
                  "Ready to be promoted to {{next}}!",
                  { next: tierConfig.next },
                )}
          </Text>
        </View>
      ) : (
        <View className="mt-3 flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full bg-yellow-400" />
          <Text className="font-sans text-xs font-medium text-yellow-700 dark:text-yellow-300">
            {t(
              "seller.tier.highest_tier",
              "Highest tier — lowest commission rate",
            )}
          </Text>
        </View>
      )}

      {plan ? (
        <View className="mt-4 border-t border-gray-200/80 pt-4 dark:border-slate-600/80">
          <View className="mb-1.5 flex-row items-center justify-between gap-2">
            <Text className="font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
              {t("subscription.products_used", "Products used")}
            </Text>
            <Text
              className={`font-sans text-xs font-semibold ${
                productNearLimit
                  ? "text-red-500"
                  : "text-gray-600 dark:text-slate-300"
              }`}
            >
              {productsUsed} /{" "}
              {finiteProductLimit
                ? productLimit
                : t("pricing_page.format.unlimited_symbol", "∞")}
            </Text>
          </View>
          {finiteProductLimit ? (
            <View className="h-2 overflow-hidden rounded-full bg-white dark:bg-slate-700">
              <View
                className={`h-full rounded-full ${
                  productNearLimit ? "bg-red-500" : "bg-green-500"
                }`}
                style={{ width: `${productProgress}%` }}
              />
            </View>
          ) : null}
          <Text className="mt-1.5 font-sans text-xs text-gray-400 dark:text-slate-500">
            {finiteProductLimit
              ? productsRemaining === 0
                ? t(
                    "seller.product.limit_warning.reached_message",
                    "You have reached {{used}} of {{limit}} products on your {{plan}} plan. Upgrade to add more products.",
                    {
                      used: productsUsed,
                      limit: productLimit,
                      plan: plan.name,
                    },
                  )
                : t(
                    "seller.tier.products_remaining",
                    "{{count}} products remaining on your {{plan}} plan",
                    { count: productsRemaining ?? 0, plan: plan.name },
                  )
              : t(
                  "seller.tier.unlimited_products",
                  "Unlimited product listings on your {{plan}} plan",
                  { plan: plan.name },
                )}
          </Text>
          {productNearLimit && finiteProductLimit ? (
            <Pressable
              onPress={onUpgrade}
              className="mt-3 flex-row items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2"
            >
              <Feather name="arrow-up-circle" color="#ffffff" size={14} />
              <Text className="font-sans text-xs font-bold text-white">
                {t("seller.product.limit_warning.upgrade", "Upgrade plan")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
      {children}
    </Text>
  );
}

function DashboardLanguageSwitch() {
  const { i18n, language } = useAppTranslation();

  return (
    <View className="h-10 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-900">
      {supportedLanguages.map((code) => {
        const active = language === code;
        const label = code === "my" ? "MY" : "EN";
        return (
          <Pressable
            key={code}
            onPress={() => void i18n.changeLanguage(code as SupportedLanguage)}
            className={`h-8 w-10 items-center justify-center rounded-lg px-2 ${
              active ? "bg-green-600" : ""
            }`}
          >
            <Text
              className={`font-sans text-xs font-black ${
                active
                  ? "text-white"
                  : "text-gray-500 dark:text-slate-300"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SellerTopHeader({
  onMenu,
  onNotifications,
  onTab,
  onLogout,
  store,
  userName,
  userEmail,
}: {
  onMenu: () => void;
  onNotifications: () => void;
  onTab: (tab: SellerTab) => void;
  onLogout: () => void;
  store: SellerStoreSummary | null;
  userName: string;
  userEmail: string;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const initial = (userName || store?.name || "S").charAt(0).toUpperCase();
  const profileItems: {
    label: string;
    icon: keyof typeof Feather.glyphMap;
    action: () => void;
    danger?: boolean;
  }[] = [
    {
      label: "Profile & settings",
      icon: "user",
      action: () => onTab("settings"),
    },
    {
      label: "My Store",
      icon: "home",
      action: () => onTab("my_store"),
    },
    {
      label: "Products",
      icon: "box",
      action: () => onTab("products"),
    },
    {
      label: "Orders",
      icon: "shopping-bag",
      action: () => onTab("orders"),
    },
    {
      label: "Logout",
      icon: "log-out",
      action: onLogout,
      danger: true,
    },
  ];

  const runProfileAction = (action: () => void) => {
    setProfileOpen(false);
    action();
  };

  return (
    <View className="relative z-30 flex-shrink-0 border-b border-gray-200/60 bg-white/90 px-4 py-4 dark:border-slate-700/60 dark:bg-slate-800/90 sm:px-6">
      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          onPress={onMenu}
          className={`${SELLER_HEADER_CONTROL_CLASS} flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 md:hidden`}
        >
          <Feather name="menu" color="#64748b" size={SELLER_HEADER_ICON_SIZE} />
        </Pressable>
        <View className="hidden flex-1 md:flex" />
        <View className="flex-row flex-shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/" asChild>
            <Pressable className="hidden h-10 flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 dark:border-green-800 dark:bg-green-900/20 sm:flex">
              <Feather name="external-link" color="#16a34a" size={SELLER_HEADER_ICON_SIZE} />
              <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                Main site
              </Text>
            </Pressable>
          </Link>
          <Link href="/" asChild>
            <Pressable
              className={`${SELLER_HEADER_CONTROL_CLASS} items-center justify-center rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 sm:hidden`}
            >
              <Feather name="external-link" color="#16a34a" size={SELLER_HEADER_ICON_SIZE} />
            </Pressable>
          </Link>
          <DashboardLanguageSwitch />
          <NativeNotificationBell compact iconSize={SELLER_HEADER_ICON_SIZE} />
          <View className="hidden flex-row items-center gap-2 md:flex">
            <View className="h-2 w-2 rounded-full bg-green-400" />
            <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
              Store Active
            </Text>
          </View>
          <View className="relative flex-shrink-0">
            <Pressable
              onPress={() => setProfileOpen((open) => !open)}
              className={`h-10 flex-row items-center gap-1 rounded-xl border pl-0 pr-2 ${
                profileOpen
                  ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30"
                  : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {store?.logoUrl ? (
                <View
                  className={`${SELLER_HEADER_CONTROL_CLASS} overflow-hidden rounded-lg`}
                >
                  <Image
                    source={{ uri: store.logoUrl }}
                    style={{
                      width: SELLER_HEADER_CONTROL_PX,
                      height: SELLER_HEADER_CONTROL_PX,
                    }}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <View
                  className={`${SELLER_HEADER_CONTROL_CLASS} items-center justify-center rounded-lg bg-green-600`}
                >
                  <Text className="font-sans text-sm font-extrabold text-white">
                    {initial}
                  </Text>
                </View>
              )}
              <Feather
                name={profileOpen ? "chevron-up" : "chevron-down"}
                color="#64748b"
                size={SELLER_HEADER_ICON_SIZE}
              />
            </Pressable>

            {profileOpen ? (
              <>
                <Pressable
                  onPress={() => setProfileOpen(false)}
                  className="absolute inset-0 z-40 bg-transparent"
                />
                <View className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <View className="border-b border-gray-100 p-4 dark:border-slate-700">
                    <Text
                      className="font-sans text-base font-bold text-gray-900 dark:text-slate-100"
                      numberOfLines={1}
                    >
                      {store?.name || userName}
                    </Text>
                    <Text
                      className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400"
                      numberOfLines={1}
                    >
                      {userEmail}
                    </Text>
                  </View>

                  <Link href="/" asChild>
                    <Pressable
                      onPress={() => setProfileOpen(false)}
                      className="flex-row items-center gap-3 px-4 py-3"
                    >
                      <Feather name="external-link" color="#16a34a" size={17} />
                      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                        Main site
                      </Text>
                    </Pressable>
                  </Link>

                  {profileItems.map((item) => (
                    <Pressable
                      key={item.label}
                      onPress={() => runProfileAction(item.action)}
                      className="flex-row items-center gap-3 px-4 py-3"
                    >
                      <Feather
                        name={item.icon}
                        color={item.danger ? "#dc2626" : "#64748b"}
                        size={17}
                      />
                      <Text
                        className={`font-sans text-sm font-semibold ${
                          item.danger
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-700 dark:text-slate-200"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function SellerMobileTabBar({
  activeTab,
  onTab,
  subscription,
}: {
  activeTab: SellerTab;
  onTab: (tab: SellerTab) => void;
  subscription: SellerSubscription | null;
}) {
  return (
    <View className="mb-6 md:hidden">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="rounded-2xl bg-white/80 p-2 dark:bg-slate-800/80"
      >
        <View className="flex-row gap-2">
          {sellerTabs.map((item) => {
            const active = activeTab === item.id;
            const feature = protectedSellerTabs[item.id];
            const locked = feature
              ? !sellerPlanHasFeature(subscription, feature)
              : false;
            return (
              <Pressable
                key={item.id}
                onPress={() => onTab(item.id)}
                className={`min-w-24 items-center rounded-xl px-3 py-3 ${
                  active
                    ? "bg-green-500 dark:bg-emerald-500"
                    : ""
                }`}
              >
                <Feather
                  name={item.icon}
                  color={active ? "#ffffff" : "#64748b"}
                  size={20}
                />
                <Text
                  className={`mt-1 font-sans text-xs font-medium ${
                    active ? "text-white" : "text-gray-600 dark:text-slate-300"
                  }`}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {locked ? (
                  <Feather
                    name="lock"
                    color={active ? "#ffffff" : "#9ca3af"}
                    size={12}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const formatMemberSince = (value?: string) => {
  if (!value) return "New";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "New";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
};

const titleCase = (value?: string) => {
  if (!value) return "Not provided";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
};

function StatusPill({
  value,
  type,
}: {
  value: string;
  type: "status" | "verification";
}) {
  const active =
    value === "approved" || value === "active" || value === "verified";
  const pending = value === "pending";

  return (
    <View
      className={`rounded-full px-3 py-1 ${
        active
          ? type === "verification"
            ? "bg-blue-400"
            : "bg-green-400"
          : pending
            ? "bg-yellow-400"
            : "bg-gray-400"
      }`}
    >
      <Text className="font-sans text-sm font-medium text-white">
        {titleCase(value)}
      </Text>
    </View>
  );
}

function StoreInfoRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  link,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  link?: boolean;
}) {
  const content = (
    <View className="flex-row items-start gap-3">
      <View className="rounded-lg p-2" style={{ backgroundColor: iconBg }}>
        <Feather name={icon} color={iconColor} size={20} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
          {label}
        </Text>
        <Text
          className={`font-sans text-sm font-medium ${
            link
              ? "text-green-600 dark:text-green-400"
              : "text-gray-900 dark:text-slate-100"
          }`}
          numberOfLines={2}
        >
          {value || "Not provided"}
        </Text>
      </View>
    </View>
  );

  if (link && value) {
    return (
      <Pressable onPress={() => void Linking.openURL(value)}>
        {content}
      </Pressable>
    );
  }

  return content;
}

function StoreStatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  color: "green" | "blue" | "purple" | "orange";
}) {
  const styles = {
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-600 dark:text-green-400",
      sub: "text-green-800 dark:text-green-300",
      icon: "#16a34a",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      sub: "text-blue-800 dark:text-blue-300",
      icon: "#2563eb",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-600 dark:text-purple-400",
      sub: "text-purple-800 dark:text-purple-300",
      icon: "#7c3aed",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      text: "text-orange-600 dark:text-orange-400",
      sub: "text-orange-800 dark:text-orange-300",
      icon: "#ea580c",
    },
  }[color];

  return (
    <View
      className={`w-[48%] rounded-xl p-4 lg:w-[23%] ${styles.bg}`}
    >
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-950/30">
          <Feather name={icon} color={styles.icon} size={20} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className={`font-sans text-2xl font-black ${styles.text}`}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value}
          </Text>
          <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400" numberOfLines={2}>
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SellerMyStoreNative({
  overview,
  onTab,
}: {
  overview: SellerDashboardOverview | null;
  onTab: (tab: SellerTab) => void;
}) {
  const store = overview?.store || null;
  const stats = overview?.stats || {
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  };

  if (!store) {
    return (
      <View className="rounded-2xl bg-white p-4 dark:bg-slate-800 sm:p-6">
        <View className="items-center py-8">
          <ActivityIndicator color="#16a34a" />
          <Text className="mt-4 font-sans text-sm text-gray-600 dark:text-slate-400">
            Loading store information...
          </Text>
        </View>
      </View>
    );
  }

  const hasBanner = Boolean(store.bannerUrl);
  const memberSince = formatMemberSince(store.createdAt);
  const address = [store.address, store.city, store.state, store.country]
    .filter(Boolean)
    .join(", ");
  const quickActions: { label: string; tab: SellerTab }[] = [
    { label: "Edit store details", tab: "settings" },
    { label: "Store Settings", tab: "settings" },
    { label: "Manage Products", tab: "products" },
    { label: "View Orders", tab: "orders" },
  ];

  return (
    <View className="w-full gap-4 sm:gap-6">
      <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            My Store
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            Store profile summary
          </Text>
        </View>
        <Pressable
          onPress={() => onTab("settings")}
          className="min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2 sm:self-auto"
        >
          <Feather name="edit-2" color="#ffffff" size={16} />
          <Text className="font-sans text-sm font-medium text-white">
            Edit Store
          </Text>
        </Pressable>
      </View>

      <View className="overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
        {hasBanner ? (
          <View className="relative h-36 bg-green-600 sm:h-48">
            <Image
              source={{ uri: store.bannerUrl }}
              className="h-full w-full"
              contentFit="cover"
            />
            <View className="absolute inset-0 bg-black/20" />
          </View>
        ) : null}

        <View className={`p-4 sm:p-6 ${hasBanner ? "" : "bg-green-600"}`}>
          <View className="gap-4 sm:flex-row sm:items-center">
            <View className="h-16 w-16 overflow-hidden rounded-2xl border-4 border-white/20 sm:h-20 sm:w-20">
              {store.logoUrl ? (
                <Image
                  source={{ uri: store.logoUrl }}
                  className="h-full w-full"
                  contentFit="cover"
                />
              ) : (
                <View
                  className={`h-full w-full items-center justify-center ${hasBanner ? "bg-black/10" : "bg-white/20"}`}
                >
                  <Feather
                    name="home"
                    color={hasBanner ? "#6b7280" : "#ffffff"}
                    size={38}
                  />
                </View>
              )}
            </View>

            <View className="min-w-0 flex-1">
              <Text
                className={`font-sans text-xl font-bold sm:text-2xl ${hasBanner ? "text-gray-900 dark:text-slate-100" : "text-white"}`}
                numberOfLines={2}
              >
                {store.name}
              </Text>
              <Text
                className={`mt-1 font-sans text-sm ${hasBanner ? "text-gray-600 dark:text-slate-300" : "text-green-100"}`}
                numberOfLines={3}
              >
                {store.description || "No description provided"}
              </Text>
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <StatusPill value={store.status} type="status" />
                <StatusPill
                  value={store.verificationStatus || "unverified"}
                  type="verification"
                />
                <View className="flex-row items-center gap-1">
                  <Feather
                    name="calendar"
                    color={hasBanner ? "#64748b" : "#dcfce7"}
                    size={13}
                  />
                  <Text
                    className={`font-sans text-sm ${hasBanner ? "text-gray-600 dark:text-slate-300" : "text-green-100"}`}
                  >
                    Since {memberSince}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="border-t border-gray-200 p-4 dark:border-slate-700 sm:p-6">
          <Text className="mb-3 font-sans text-base font-semibold text-gray-900 dark:text-white sm:mb-4 sm:text-lg">
            Store Statistics
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <StoreStatCard
              label="Total Products"
              value={String(stats.totalProducts)}
              icon="shopping-bag"
              color="green"
            />
            <StoreStatCard
              label="Total Orders"
              value={String(stats.totalOrders)}
              icon="shopping-bag"
              color="blue"
            />
            <StoreStatCard
              label="Total Revenue"
              value={formatMMK(stats.totalRevenue)}
              icon="dollar-sign"
              color="purple"
            />
            <StoreStatCard
              label="Pending Orders"
              value={String(stats.pendingOrders)}
              icon="clock"
              color="orange"
            />
          </View>
        </View>
      </View>

      <View className="gap-4 lg:flex-row lg:gap-6">
        <View className="gap-4 lg:flex-[2] lg:gap-6">
          <View className="rounded-2xl bg-white p-4 dark:bg-slate-800 sm:p-6">
            <Text className="mb-4 font-sans text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              Contact Information
            </Text>
            <View className="gap-4 md:flex-row md:flex-wrap">
              <View className="w-full md:w-[48%]">
                <StoreInfoRow
                  icon="mail"
                  iconColor="#16a34a"
                  iconBg="#dcfce7"
                  label="Email"
                  value={store.email}
                />
              </View>
              <View className="w-full md:w-[48%]">
                <StoreInfoRow
                  icon="phone"
                  iconColor="#2563eb"
                  iconBg="#dbeafe"
                  label="Phone"
                  value={store.phone}
                />
              </View>
              {store.website ? (
                <View className="w-full md:w-[48%]">
                  <StoreInfoRow
                    icon="globe"
                    iconColor="#7c3aed"
                    iconBg="#ede9fe"
                    label="Website"
                    value={store.website}
                    link
                  />
                </View>
              ) : null}
            </View>
          </View>

          <View className="rounded-2xl bg-white p-4 dark:bg-slate-800 sm:p-6">
            <Text className="mb-4 font-sans text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              Location
            </Text>
            <StoreInfoRow
              icon="map-pin"
              iconColor="#dc2626"
              iconBg="#fee2e2"
              label="Store Address"
              value={address}
            />
          </View>

          <View className="rounded-2xl bg-white p-4 dark:bg-slate-800 sm:p-6">
            <Text className="mb-4 font-sans text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              Business Details
            </Text>
            <View className="gap-4 md:flex-row md:flex-wrap">
              {[
                ["Business Type", store.businessType],
                ["Registration Number", store.registrationNumber],
                ["Tax ID", store.taxId],
                ["Account Number", store.accountNumber],
              ].map(([label, value]) => (
                <View key={label} className="w-full md:w-[48%]">
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                    {label}
                  </Text>
                  <Text
                    className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100"
                    numberOfLines={2}
                  >
                    {value || "Not provided"}
                  </Text>
                </View>
              ))}
              {store.nrcFull ? (
                <View className="w-full">
                  <Text className="mb-1 font-sans text-sm text-gray-500 dark:text-slate-400">
                    National Identity Number (NRC)
                  </Text>
                  <View className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50 sm:self-start">
                    <Text
                      className="font-mono text-sm font-semibold tracking-wider text-gray-900 dark:text-slate-100"
                      numberOfLines={2}
                    >
                      {store.nrcFull}
                    </Text>
                    {store.nrcFullMm ? (
                      <Text
                        className="font-sans text-sm text-gray-500 dark:text-slate-400"
                        numberOfLines={2}
                      >
                        {store.nrcFullMm}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className="gap-4 lg:flex-1 lg:gap-6">
          <View className="rounded-2xl bg-white p-4 dark:bg-slate-800 sm:p-6">
            <Text className="mb-4 font-sans text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              Customer Rating
            </Text>
            <View className="items-center">
              <View className="mb-2 flex-row items-center gap-2">
                <View className="flex-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Feather
                      key={star}
                      name="star"
                      color={
                        star <= Math.round(store.rating) ? "#facc15" : "#cbd5e1"
                      }
                      size={22}
                    />
                  ))}
                </View>
                <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-white">
                  {store.rating.toFixed(1)}
                </Text>
              </View>
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                Based on {store.reviewCount}{" "}
                {store.reviewCount === 1 ? "review" : "reviews"}
              </Text>
            </View>
          </View>

          {store.socialFacebook ||
          store.socialInstagram ||
          store.socialTwitter ? (
            <View className="rounded-2xl bg-white p-4 dark:bg-slate-800 sm:p-6">
              <Text className="mb-4 font-sans text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                Social Media
              </Text>
              <View className="gap-3">
                {[
                  [
                    "Facebook",
                    store.socialFacebook,
                    "f",
                    "bg-blue-50 dark:bg-blue-900/20",
                    "bg-blue-500",
                  ],
                  [
                    "Instagram",
                    store.socialInstagram,
                    "IG",
                    "bg-pink-50 dark:bg-pink-900/20",
                    "bg-pink-500",
                  ],
                  [
                    "Twitter",
                    store.socialTwitter,
                    "X",
                    "bg-sky-50 dark:bg-sky-900/20",
                    "bg-sky-500",
                  ],
                ].map(([label, url, mark, rowBg, markBg]) =>
                  url ? (
                    <Pressable
                      key={label}
                      onPress={() => void Linking.openURL(String(url))}
                      className={`flex-row items-center gap-3 rounded-lg p-3 ${rowBg}`}
                    >
                      <View
                        className={`h-8 w-8 items-center justify-center rounded-lg ${markBg}`}
                      >
                        <Text className="font-sans text-xs font-bold text-white">
                          {mark}
                        </Text>
                      </View>
                      <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-200">
                        {label}
                      </Text>
                    </Pressable>
                  ) : null,
                )}
              </View>
            </View>
          ) : null}

          <View className="rounded-2xl bg-green-600 p-4 dark:bg-emerald-700 sm:p-6">
            <Text className="mb-4 font-sans text-base font-semibold text-white sm:text-lg">
              Quick Actions
            </Text>
            <View className="gap-3">
              {quickActions.map((action) => (
                <Pressable
                  key={action.label}
                  onPress={() => onTab(action.tab)}
                  className="rounded-xl bg-white/20 py-3"
                >
                  <Text className="text-center font-sans text-sm font-medium text-white">
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function SellerDashboardOverviewPanel({
  overview,
  wallet,
  subscription,
  onTab,
}: {
  overview: SellerDashboardOverview | null;
  wallet: SellerWalletSummary | null;
  subscription: SellerSubscription | null;
  onTab: (tab: SellerTab) => void;
}) {
  const { isDark } = useTheme();
  const store = overview?.store || null;
  const stats: SellerDashboardStats = overview?.stats || {
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  };
  const completionRate =
    stats.totalOrders > 0
      ? (
          (Math.max(0, stats.totalOrders - stats.pendingOrders) /
            stats.totalOrders) *
          100
        ).toFixed(1)
      : "0.0";
  const quickStats = [
    {
      label: "Order Completion Rate",
      value: `${completionRate}%`,
      color: "#16a34a",
    },
    {
      label: "Avg. Order Value",
      value: formatMMK(
        stats.totalOrders ? stats.totalRevenue / stats.totalOrders : 0,
      ),
      color: isDark ? "#f8fafc" : "#111827",
    },
    {
      label: "Low Stock Products",
      value: "0",
      color: isDark ? "#f8fafc" : "#111827",
    },
    {
      label: "Delivery Success Rate",
      value: "--",
      color: "#16a34a",
    },
    {
      label: "Escrow (Locked)",
      value: wallet?.escrowBalance || formatMMK(0),
      color: "#2563eb",
    },
    {
      label: "Available Payout",
      value: wallet?.availableBalance || formatMMK(0),
      color: "#059669",
    },
  ];

  return (
    <View className="gap-6">
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
            Overview
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            Dashboard summary
          </Text>
        </View>
        <Pressable
          onPress={() => onTab("dashboard")}
          className="flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2"
        >
          <Feather name="refresh-cw" color="#ffffff" size={15} />
          <Text className="font-sans text-sm font-medium text-white">
            Refresh
          </Text>
        </Pressable>
      </View>

      <SetupChecklistPanel store={store} onTab={onTab} />
      <TierCard
        store={store}
        stats={stats}
        subscription={subscription}
        onUpgrade={() => onTab("subscription")}
      />

      <View>
        <SectionTitle>Wallet & Earnings</SectionTitle>
        <View className="flex-row flex-wrap gap-3">
          <StatCard
            label="In Escrow"
            value={wallet?.escrowBalance || formatMMK(0)}
            icon="lock"
            sub="Held until delivery confirmed"
            accent="blue"
          />
          <StatCard
            label="Available Balance"
            value={wallet?.availableBalance || formatMMK(0)}
            icon="credit-card"
            sub="Ready to withdraw"
            accent="green"
          />
          <StatCard
            label="Total Earned"
            value={wallet?.totalEarned || formatMMK(stats.totalRevenue)}
            icon="dollar-sign"
            sub="Lifetime seller payout"
            accent="teal"
          />
          <StatCard
            label="COD Outstanding"
            value={wallet?.codCommissionOutstanding || formatMMK(0)}
            icon="file-text"
            sub="Commission owed to platform"
            accent={wallet?.codCommissionOutstandingValue ? "orange" : "gray"}
          />
        </View>
      </View>

      <View>
        <SectionTitle>Orders</SectionTitle>
        <View className="flex-row flex-wrap gap-3">
          <StatCard
            label="Total Revenue"
            value={formatMMK(stats.totalRevenue)}
            icon="dollar-sign"
            sub="Gross order value"
            accent="green"
          />
          <StatCard
            label="Delivered Orders"
            value={String(Math.max(0, stats.totalOrders - stats.pendingOrders))}
            icon="check-circle"
            sub={`${completionRate}% completion rate`}
            accent="green"
          />
          <StatCard
            label="Pending Orders"
            value={String(stats.pendingOrders)}
            icon="clock"
            sub="Awaiting confirmation"
            accent="amber"
          />
          <StatCard
            label="Processing"
            value="0"
            icon="shopping-bag"
            sub="Confirmed + Processing"
            accent="blue"
          />
          <StatCard
            label="Shipped"
            value="0"
            icon="truck"
            sub="Out for delivery"
            accent="purple"
          />
          <StatCard label="Cancelled" value="0" icon="x-circle" accent="red" />
        </View>
      </View>

      <View>
        <SectionTitle>Products & Performance</SectionTitle>
        <View className="flex-row flex-wrap gap-3">
          <StatCard
            label="Active Products"
            value={String(stats.totalProducts)}
            icon="star"
            sub={`${stats.totalProducts} total`}
            accent="green"
          />
          <StatCard
            label="Low Stock"
            value="0"
            icon="alert-triangle"
            sub="Restock soon"
            accent="gray"
          />
          <StatCard
            label="Avg. Order Value"
            value={formatMMK(
              stats.totalOrders ? stats.totalRevenue / stats.totalOrders : 0,
            )}
            icon="dollar-sign"
            sub="Per order"
            accent="teal"
          />
          <StatCard
            label="Commission Paid"
            value={wallet?.totalCommissionPaid || formatMMK(0)}
            icon="users"
            sub="To platform, all time"
            accent="gray"
          />
        </View>
      </View>

      <View className="flex-row flex-wrap gap-6">
        <View className="w-full rounded-lg bg-white p-6 shadow dark:bg-slate-800 dark:shadow-none lg:flex-[2]">
          <Text className="mb-4 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
            Recent Orders
          </Text>
          <View className="items-center py-8">
            <Feather name="shopping-bag" color="#cbd5e1" size={40} />
            <Text className="mt-2 font-sans text-sm text-gray-400 dark:text-slate-500">
              No recent orders
            </Text>
          </View>
        </View>
        <View className="w-full rounded-lg bg-white p-6 shadow dark:bg-slate-800 dark:shadow-none lg:flex-1">
          <Text className="mb-4 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
            Quick Stats
          </Text>
          <View className="gap-4">
            {quickStats.map((row) => (
              <View
                key={row.label}
                className="flex-row items-center justify-between gap-3"
              >
                <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                  {row.label}
                </Text>
                <Text
                  className="font-sans text-sm font-semibold"
                  style={{ color: row.color }}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function SellerComingSoonPanel({ item }: { item: SellerNavItem }) {
  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/25">
        <Feather name={item.icon} color="#16a34a" size={24} />
      </View>
      <Text className="mt-5 font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
        {item.label}
      </Text>
      <Text className="mt-2 max-w-2xl font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
        This seller component will be ported in the next step. The route and
        dashboard layout are ready, so each module can be added one by one.
      </Text>
    </View>
  );
}

function sellerPlanHasFeature(
  subscription: SellerSubscription | null,
  feature: SellerFeatureFlag,
) {
  const plan = subscription?.plan;
  if (!plan) return false;
  if (feature === "analytics_enabled") return plan.analyticsEnabled === true;
  if (feature === "bulk_import_enabled") return plan.bulkImportEnabled === true;
  if (feature === "priority_support") return plan.prioritySupport === true;
  return plan.customStorefront === true;
}

function SellerPlanFeatureGate({
  feature,
  subscription,
  loading,
  onUpgrade,
  children,
}: {
  feature: SellerFeatureFlag;
  subscription: SellerSubscription | null;
  loading: boolean;
  onUpgrade: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  if (sellerPlanHasFeature(subscription, feature)) {
    return <>{children}</>;
  }

  const featureLabel = featureLabels[feature];
  const currentPlan = subscription?.plan?.name || "Basic";

  return (
    <View className="items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20">
        <Feather name="star" color="#16a34a" size={32} />
      </View>
      <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
        {featureLabel} not available
      </Text>
      <Text className="mt-2 max-w-sm text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
        Your current <Text className="font-semibold text-gray-700 dark:text-slate-300">{currentPlan}</Text> plan does not include {featureLabel}. Upgrade to unlock this feature.
      </Text>
      <Pressable
        onPress={onUpgrade}
        className="mt-6 flex-row items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5"
      >
        <Feather name="zap" color="#ffffff" size={16} />
        <Text className="font-sans text-sm font-semibold text-white">
          View Upgrade Options
        </Text>
      </Pressable>
    </View>
  );
}

function DashboardContentLoader({ label = "Loading section..." }: { label?: string }) {
  return (
    <View className="min-h-[360px] items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-16 dark:border-slate-800 dark:bg-slate-900">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
      <Text className="mt-4 text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
        {label}
      </Text>
      <Text className="mt-1 text-center font-sans text-xs text-gray-500 dark:text-slate-500">
        The dashboard stays ready while this content loads.
      </Text>
    </View>
  );
}

export function SellerDashboardNative() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    logout,
  } = useNativeAuth();
  const tabParam = getParam(params.tab);
  const initialTab = normalizeSellerTab(tabParam);
  const lastSyncedTabParam = useRef(tabParam);
  const [activeTab, setActiveTab] = useState<SellerTab>(initialTab);
  const [overview, setOverview] = useState<SellerDashboardOverview | null>(
    null,
  );
  const [wallet, setWallet] = useState<SellerWalletSummary | null>(null);
  const [subscription, setSubscription] = useState<SellerSubscription | null>(
    null,
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSeller = hasUserRole(user, "seller");
  const dashboardStats = overview?.stats || {
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  };
  const activeItem = useMemo(
    () => sellerTabs.find((item) => item.id === activeTab) || sellerTabs[0],
    [activeTab],
  );

  useEffect(() => {
    if (tabParam === lastSyncedTabParam.current) return;
    lastSyncedTabParam.current = tabParam;
    const nextTab = normalizeSellerTab(tabParam);
    const timeout = setTimeout(() => {
      setActiveTab((current) => (current === nextTab ? current : nextTab));
    }, 0);
    return () => clearTimeout(timeout);
  }, [tabParam]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login?returnTo=/seller/dashboard" as Href);
      return;
    }
    if (user && needsEmailVerification(user)) {
      router.replace("/verify-email?returnTo=/seller/dashboard" as Href);
      return;
    }
    if (user && !isSeller) router.replace(getRoleDestination(user));
  }, [authLoading, isAuthenticated, isSeller, router, user]);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!isSeller) return;
      if (!silent) setLoading(true);
      setSubscriptionLoading(true);
      setError("");
      try {
        const [overviewResult, subscriptionResult, walletResult] = await Promise.allSettled([
          fetchSellerDashboardOverview(),
          fetchSellerSubscriptionOverview(),
          fetchSellerWalletOverview(),
        ]);

        if (overviewResult.status === "rejected") {
          throw overviewResult.reason;
        }

        setOverview(overviewResult.value);
        setWallet(walletResult.status === "fulfilled" ? walletResult.value.wallet : null);

        if (subscriptionResult.status === "fulfilled") {
          setSubscription(subscriptionResult.value.current);
        } else if (
          subscriptionResult.reason instanceof ApiError &&
          subscriptionResult.reason.status === 401
        ) {
          throw subscriptionResult.reason;
        } else {
          setSubscription(null);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await logout();
          router.replace("/login?returnTo=/seller/dashboard" as Href);
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Error loading seller dashboard.",
        );
      } finally {
        if (!silent) setLoading(false);
        setSubscriptionLoading(false);
      }
    },
    [isSeller, logout, router],
  );

  useEffect(() => {
    if (!isSeller) return;
    const timeout = setTimeout(() => void loadDashboard(), 0);
    return () => clearTimeout(timeout);
  }, [isSeller, loadDashboard]);

  useEffect(() => {
    if (!isSeller) return;
    const id = setInterval(() => void loadDashboard(true), 60_000);
    return () => clearInterval(id);
  }, [isSeller, loadDashboard]);

  const selectTab = (tab: SellerTab) => {
    const nextTabParam = tab === "dashboard" ? undefined : tab.replaceAll("_", "-");

    setActiveTab(tab);
    setSidebarOpen(false);
    lastSyncedTabParam.current = nextTabParam;

    if (typeof router.setParams === "function") {
      router.setParams({ tab: nextTabParam });
      return;
    }

    if (
      typeof window !== "undefined" &&
      typeof window.history?.replaceState === "function"
    ) {
      const nextPath =
        tab === "dashboard"
          ? "/seller/dashboard"
          : `/seller/dashboard?tab=${nextTabParam}`;
      window.history.replaceState(null, "", nextPath);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login" as Href);
  };

  if (authLoading || !isAuthenticated || !isSeller) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-green-50 dark:bg-slate-950">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-4 font-sans text-sm text-gray-500 dark:text-slate-400">
          Loading your seller dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-green-50 dark:bg-slate-950">
      <View className="relative flex-1 overflow-hidden md:flex-row">
        <SellerSidebar
          activeTab={activeTab}
          onTab={selectTab}
          store={overview?.store || null}
          userName={user?.name || "Seller User"}
          userEmail={user?.email || "Seller"}
          stats={dashboardStats}
          subscription={subscription}
        />
        <SellerMobileDrawer
          visible={sidebarOpen}
          activeTab={activeTab}
          onClose={() => setSidebarOpen(false)}
          onTab={selectTab}
          store={overview?.store || null}
          subscription={subscription}
        />

        <View className="relative z-0 min-w-0 flex-1 overflow-hidden">
          <SellerTopHeader
            onMenu={() => setSidebarOpen(true)}
            onNotifications={() => selectTab("notifications")}
            onTab={selectTab}
            onLogout={handleLogout}
            store={overview?.store || null}
            userName={user?.name || "Seller User"}
            userEmail={user?.email || "Seller"}
          />

          <ScrollView
            className="flex-1"
            contentContainerClassName="p-4 pb-10 sm:p-6"
            showsVerticalScrollIndicator={false}
          >
            <SellerMobileTabBar
              activeTab={activeTab}
              onTab={selectTab}
              subscription={subscription}
            />
            {error ? (
              <Pressable
                onPress={() => setError("")}
                className="mb-4 flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
              >
                <Feather name="alert-circle" color="#dc2626" size={18} />
                <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">
                  {error}
                </Text>
                <Feather name="x" color="#dc2626" size={16} />
              </Pressable>
            ) : null}

            {loading && !overview ? (
              <DashboardContentLoader label="Loading seller dashboard data..." />
            ) : activeTab === "dashboard" ? (
              <SellerDashboardOverviewPanel
                overview={overview}
                wallet={wallet}
                subscription={subscription}
                onTab={selectTab}
              />
            ) : activeTab === "my_store" ? (
              <SellerMyStoreNative overview={overview} onTab={selectTab} />
            ) : activeTab === "notifications" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading notifications..." />}>
                <SellerNotificationsNative />
              </Suspense>
            ) : activeTab === "orders" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading order management..." />}>
                <OrderManagementNative />
              </Suspense>
            ) : activeTab === "rfq" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading RFQ management..." />}>
                <RfqManagementNative />
              </Suspense>
            ) : activeTab === "products" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading product management..." />}>
                <ProductManagementNative />
              </Suspense>
            ) : activeTab === "discounts" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading discounts..." />}>
                <DiscountsNative />
              </Suspense>
            ) : activeTab === "coupons" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading coupons..." />}>
                <CouponsNative />
              </Suspense>
            ) : activeTab === "settings" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading seller settings..." />}>
                <SellerSettingsNative
                  overview={overview}
                  user={user}
                  onRefresh={() => loadDashboard(true)}
                  onLogout={handleLogout}
                />
              </Suspense>
            ) : activeTab === "delivery_zones" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading delivery zones..." />}>
                <DeliveryZonesNative onSaveSuccess={() => loadDashboard(true)} />
              </Suspense>
            ) : activeTab === "delivery" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading delivery management..." />}>
                <DeliveryManagementNative
                  onRefresh={() => loadDashboard(true)}
                />
              </Suspense>
            ) : activeTab === "reviews" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading reviews..." />}>
                <ReviewManagementNative />
              </Suspense>
            ) : activeTab === "subscription" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading subscription..." />}>
                <SubscriptionNative />
              </Suspense>
            ) : activeTab === "wallet" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading wallet..." />}>
                <SellerWalletNative onRefresh={() => loadDashboard(true)} />
              </Suspense>
            ) : activeTab === "customers" ? (
              <Suspense fallback={<DashboardContentLoader label="Loading customers..." />}>
                <CustomersNative />
              </Suspense>
            ) : activeTab === "bulk_import" ? (
              <SellerPlanFeatureGate
                feature="bulk_import_enabled"
                subscription={subscription}
                loading={subscriptionLoading}
                onUpgrade={() => selectTab("subscription")}
              >
                <Suspense fallback={<DashboardContentLoader label="Loading bulk import..." />}>
                  <BulkImportNative onImported={() => loadDashboard(true)} />
                </Suspense>
              </SellerPlanFeatureGate>
            ) : activeTab === "sales" ? (
              <SellerPlanFeatureGate
                feature="analytics_enabled"
                subscription={subscription}
                loading={subscriptionLoading}
                onUpgrade={() => selectTab("subscription")}
              >
                <Suspense fallback={<DashboardContentLoader label="Loading sales reports..." />}>
                  <SalesReportsNative />
                </Suspense>
              </SellerPlanFeatureGate>
            ) : activeTab === "financial_reports" ? (
              <SellerPlanFeatureGate
                feature="analytics_enabled"
                subscription={subscription}
                loading={subscriptionLoading}
                onUpgrade={() => selectTab("subscription")}
              >
                <Suspense fallback={<DashboardContentLoader label="Loading financial reports..." />}>
                  <FinancialReportsNative storeName={overview?.store?.name} />
                </Suspense>
              </SellerPlanFeatureGate>
            ) : (
              <SellerComingSoonPanel item={activeItem} />
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
