import Feather from "@expo/vector-icons/Feather";
import {
  Link,
  useGlobalSearchParams,
  usePathname,
  useRouter,
  type Href,
} from "expo-router";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Linking,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NativeNotificationBell } from "@/components/notifications/native-notification-bell";
import { AnnouncementNative } from "@/components/ui/announcement-native";
import { BrandLogo } from "@/components/ui/brand-logo";
import { FloatingCompareButtonNative } from "@/components/ui/floating-compare-button-native";
import { WebLoadMoreSentinel } from "@/components/ui/web-load-more-sentinel";
import { mainRoutes } from "@/constants/routes";
import { SITE_CONTAINER_CLASS } from "@/constants/layout";
import { Footer } from "@/components/layout/site-footer";
import { useNativeAuth } from "@/context/native-auth";
import { useTheme } from "@/context/theme";
import { useCartCount } from "@/context/cart-count-context";
import { useWishlist } from "@/context/wishlist-context";
import {
  mergeRouteLang,
  normalizeLanguage,
  useAppTranslation,
  useChangeLanguage,
} from "@/i18n";
import { getRoleDestination, hasUserRole } from "@/utils/auth-routing";
const headerRouteKeys: Record<string, string> = {
  "/": "header.home",
  "/products": "header.products",
  "/sellers": "header.sellers",
  "/categories": "header.categories",
};
const accountPaths = [
  "/account",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/buyer",
  "/buyer/dashboard",
  "/seller",
  "/seller/dashboard",
  "/admin/dashboard",
];

const languagePillActiveStyle = {
  ...Platform.select({
    web: {
      boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.08)",
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
  }),
} as const;

function HeaderAction({
  href,
  label,
  active,
}: {
  href: Href;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        className={`rounded-lg px-3 py-2 ${
          active ? "bg-green-50 dark:bg-green-900/30" : "bg-transparent"
        }`}
      >
        <Text
          className={`font-sans text-sm font-semibold ${
            active
              ? "text-green-700 dark:text-green-300"
              : "text-gray-600 dark:text-slate-300"
          }`}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

export function Header() {
  const { t, i18n } = useAppTranslation();
  const { isDark, toggleTheme } = useTheme();
  const auth = useNativeAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ search?: string; lang?: string }>();
  const routeSearch = typeof params.search === "string" ? params.search : "";
  const activeLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const changeLanguage = useChangeLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(routeSearch);
  const [mobileSearch, setMobileSearch] = useState(false);
  const { totalItems } = useCartCount();
  const { count: wishlistCount } = useWishlist();
  const user = auth.user;
  const isBuyer = !user || hasUserRole(user, "buyer");
  const dashboardHref = user
    ? (mergeRouteLang(String(getRoleDestination(user)), {}, activeLanguage) as Href)
    : (mergeRouteLang("/login", {}, activeLanguage) as Href);
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const userRole = user?.type || user?.roles?.[0] || "buyer";

  useEffect(() => {
    setSearchTerm(routeSearch);
  }, [routeSearch]);

  const navItems = useMemo(
    () =>
      mainRoutes.map((route) => ({
        ...route,
        href: mergeRouteLang(String(route.href), {}, activeLanguage) as Href,
        active:
          route.href === "/"
            ? pathname === "/"
            : pathname.startsWith(String(route.href)),
        translatedLabel: t(headerRouteKeys[String(route.href)] || route.label),
      })),
    [activeLanguage, pathname, t],
  );

  const submitSearch = () => {
    const term = searchTerm.trim();
    const href = term
      ? mergeRouteLang(
          '/products',
          { search: term },
          activeLanguage,
        )
      : mergeRouteLang('/products', {}, activeLanguage);
    router.push(href as Href);
    setMobileOpen(false);
    setMobileSearch(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (Platform.OS !== "web") return;
    if (!pathname.startsWith("/products")) return;

    const href = value.trim()
      ? mergeRouteLang('/products', { search: value.trim() }, activeLanguage)
      : mergeRouteLang('/products', {}, activeLanguage);
    router.replace(href as Href);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await auth.logout();
    router.replace(mergeRouteLang("/", {}, activeLanguage) as Href);
  };

  return (
    <SafeAreaView
      edges={["top"]}
      className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <View className={`${SITE_CONTAINER_CLASS} min-w-0`}>
        <View className="h-16 min-w-0 flex-row items-center justify-between gap-2 sm:gap-3">
          <Link href={mergeRouteLang("/", {}, activeLanguage) as Href} asChild>
            <Pressable className="shrink-0 flex-row items-center gap-2">
              <BrandLogo size={36} />
              <Text
                className="hidden text-xl text-green-800 dark:text-green-300 sm:flex"
                style={{ fontFamily: "Torus-SemiBold" }}
              >
                {t("header.logo_text")}
              </Text>
            </Pressable>
          </Link>

          <View className="hidden flex-row items-center gap-1 md:flex">
            {navItems.map((item) => (
              <HeaderAction
                key={String(item.href)}
                href={item.href}
                label={item.translatedLabel}
                active={item.active}
              />
            ))}
          </View>

          <View className="hidden min-w-0 max-w-sm flex-1 flex-row items-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950 lg:max-w-md sm:flex">
            <Feather
              name="search"
              color={isDark ? "#64748b" : "#9ca3af"}
              size={16}
            />
            <TextInput
              className="ml-2 min-w-0 flex-1 font-sans text-sm text-gray-900 outline-none dark:text-slate-100"
              placeholder={t("header.search_placeholder")}
              placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
              value={searchTerm}
              onChangeText={handleSearchChange}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
            />
          </View>

          <View className="min-w-0 shrink flex-row items-center gap-0.5 sm:gap-2">
            <Pressable
              onPress={toggleTheme}
              accessibilityLabel={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
              className="h-10 w-10 items-center justify-center rounded-lg hover:bg-green-50 dark:hover:bg-slate-800"
            >
              <Feather
                name={isDark ? "sun" : "moon"}
                color={isDark ? "#fde68a" : "#6b7280"}
                size={20}
              />
            </Pressable>

            <Pressable
              onPress={() => setMobileSearch((value) => !value)}
              accessibilityLabel={t("header.search")}
              className="h-10 w-10 items-center justify-center rounded-lg sm:hidden"
            >
              <Feather
                name="search"
                color={isDark ? "#cbd5e1" : "#6b7280"}
                size={20}
              />
            </Pressable>

            <View className="hidden flex-row items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-slate-800 sm:flex">
              {(["en", "my"] as const).map((code) => (
                <Pressable
                  key={code}
                  onPress={() => changeLanguage(code)}
                  className={
                    activeLanguage === code
                      ? "flex-row items-center gap-1 rounded-md bg-white px-2.5 py-1 dark:bg-slate-900"
                      : "flex-row items-center gap-1 rounded-md bg-transparent px-2.5 py-1"
                  }
                  style={activeLanguage === code ? languagePillActiveStyle : undefined}
                >
                  <Text
                    className={`font-sans text-xs font-bold ${
                      activeLanguage === code
                        ? "text-green-700 dark:text-green-300"
                        : "text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {code === "en" ? "EN" : t("header.burmese")}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isBuyer ? (
              <>
                <Link href={mergeRouteLang("/wishlist", {}, activeLanguage) as Href} asChild>
                  <Pressable
                    accessibilityLabel={t("buyer_dashboard.wishlist", "Wishlist")}
                    className="relative h-10 w-10 items-center justify-center rounded-lg"
                  >
                    <Feather
                      name="heart"
                      color={isDark ? "#cbd5e1" : "#4b5563"}
                      size={21}
                    />
                    {wishlistCount > 0 ? (
                      <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1">
                        <Text className="font-sans text-[10px] font-bold text-white">
                          {wishlistCount > 9 ? "9+" : wishlistCount}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                </Link>
                <Link href={mergeRouteLang("/cart", {}, activeLanguage) as Href} asChild>
                <Pressable
                  accessibilityLabel="Cart"
                  className="relative h-10 w-10 items-center justify-center rounded-lg"
                >
                  <Feather
                    name="shopping-cart"
                    color={isDark ? "#cbd5e1" : "#4b5563"}
                    size={21}
                  />
                  {totalItems > 0 ? (
                    <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1">
                      <Text className="font-sans text-[10px] font-bold text-white">
                        {totalItems > 9 ? "9+" : totalItems}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
                </Link>
              </>
            ) : null}

            {user ? <NativeNotificationBell compact /> : null}

            {user ? (
              <View className="relative">
                <Pressable
                  onPress={() => setUserMenuOpen((value) => !value)}
                  className="flex-row items-center gap-1.5 rounded-xl p-1"
                >
                  <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-green-200 bg-green-100 dark:border-green-700 dark:bg-green-900/40">
                    <Text className="text-sm font-semibold text-green-700 dark:text-green-300">
                      {userInitial}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-down"
                    color={isDark ? "#cbd5e1" : "#9ca3af"}
                    size={16}
                    className="hidden lg:flex"
                  />
                </Pressable>
                {userMenuOpen ? (
                  <View className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <View className="border-b border-gray-50 px-4 py-2 dark:border-slate-800">
                      <Text
                        className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100"
                        numberOfLines={1}
                      >
                        {user.name}
                      </Text>
                      <Text className="font-sans text-xs capitalize text-gray-400 dark:text-slate-500">
                        {userRole}
                      </Text>
                    </View>
                    <Link href={dashboardHref} asChild>
                      <Pressable onPress={() => setUserMenuOpen(false)}>
                        <Text className="px-4 py-2 font-sans text-sm text-gray-700 dark:text-slate-300">
                          {t("sidebar.dashboard")}
                        </Text>
                      </Pressable>
                    </Link>
                    <Pressable onPress={handleLogout}>
                      <Text className="px-4 py-2 font-sans text-sm text-red-600">
                        {t("header.logout")}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <Link href={mergeRouteLang("/login", {}, activeLanguage) as Href} asChild>
                <Pressable className="flex-row items-center gap-1.5 rounded-lg border border-green-300 px-3 py-2 dark:border-green-700">
                  <Feather name="user" color="#15803d" size={16} />
                  <Text className="hidden font-sans text-sm font-semibold text-green-700 dark:text-green-300 sm:flex">
                    {t("header.login")}
                  </Text>
                </Pressable>
              </Link>
            )}

            <Pressable
              onPress={() => setMobileOpen((value) => !value)}
              accessibilityLabel="Open menu"
              accessibilityState={{ expanded: mobileOpen }}
              className="h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 md:hidden"
            >
              <Feather
                name={mobileOpen ? "x" : "menu"}
                color={isDark ? "#e2e8f0" : "#374151"}
                size={20}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {mobileSearch && (
        <View className="border-t border-gray-100 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 sm:hidden">
          <View className="flex-row items-center gap-2">
            <View className="min-w-0 flex-1 flex-row items-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <Feather
                name="search"
                color={isDark ? "#64748b" : "#9ca3af"}
                size={16}
              />
              <TextInput
                className="ml-2 min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
                placeholder={t("header.search_placeholder")}
                placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                value={searchTerm}
                onChangeText={handleSearchChange}
                onSubmitEditing={submitSearch}
                returnKeyType="search"
              />
            </View>
            <Pressable
              onPress={submitSearch}
              className="rounded-lg bg-green-600 px-3 py-2"
            >
              <Text className="font-sans text-sm font-bold text-white">
                {t("header.search")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMobileSearch(false)}
              accessibilityLabel={t("header.close_search")}
              className="h-10 w-10 items-center justify-center rounded-lg"
            >
              <Feather
                name="x"
                color={isDark ? "#cbd5e1" : "#9ca3af"}
                size={20}
              />
            </Pressable>
          </View>
        </View>
      )}

      {mobileOpen && (
        <View className="relative z-50 border-t border-gray-100 bg-white px-3 pb-4 pt-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <View className="gap-1">
            {navItems.map((item) => (
              <Link key={String(item.href)} href={item.href} asChild>
                <Pressable
                  onPress={() => setMobileOpen(false)}
                  className={`rounded-xl px-4 py-3 ${
                    item.active
                      ? "border-l-4 border-green-500 bg-green-50 dark:bg-green-900/30"
                      : "bg-white dark:bg-slate-900"
                  }`}
                >
                  <Text
                    className={`font-sans text-base font-bold ${
                      item.active
                        ? "text-green-700 dark:text-green-300"
                        : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    {item.translatedLabel}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>

          <View className="mx-4 my-3 border-t border-gray-100 dark:border-slate-800" />

          <Text className="mb-2 px-4 font-sans text-xs font-bold uppercase text-gray-400 dark:text-slate-500">
            Language
          </Text>
          <View className="flex-row gap-2 px-4">
            {(["en", "my"] as const).map((code) => (
              <Pressable
                key={code}
                onPress={() => changeLanguage(code)}
                className={`flex-1 rounded-lg py-2 ${
                  activeLanguage === code
                    ? "bg-green-600"
                    : "bg-gray-100 dark:bg-slate-800"
                }`}
              >
                <Text
                  className={`text-center font-sans text-sm font-bold ${
                    activeLanguage === code
                      ? "text-white"
                      : "text-gray-600 dark:text-slate-300"
                  }`}
                >
                  {code === "en" ? "English" : t("header.burmese")}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="mx-4 my-3 border-t border-gray-100 dark:border-slate-800" />

          {user ? (
            <View className="mx-3 gap-2">
              <Link href={dashboardHref} asChild>
                <Pressable
                  onPress={() => setMobileOpen(false)}
                  className="rounded-xl bg-green-600 px-4 py-3"
                >
                  <Text className="text-center font-sans text-sm font-bold text-white">
                    {t("sidebar.dashboard")}
                  </Text>
                </Pressable>
              </Link>
              <Pressable
                onPress={handleLogout}
                className="rounded-xl border border-red-200 px-4 py-3 dark:border-red-800"
              >
                <Text className="text-center font-sans text-sm font-bold text-red-600">
                  {t("header.logout")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Link href={mergeRouteLang("/login", {}, activeLanguage) as Href} asChild>
                <Pressable
                  onPress={() => setMobileOpen(false)}
                  className="mx-3 rounded-xl bg-green-600 px-4 py-3"
                >
                  <Text className="text-center font-sans text-sm font-bold text-white">
                    {t("header.login")}
                  </Text>
                </Pressable>
              </Link>
              <Text className="mt-2 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                {t("header.new_user")}{" "}
                <Link href={mergeRouteLang("/register", {}, activeLanguage) as Href} asChild>
                  <Text className="font-sans font-bold text-green-600">
                    {t("header.sign_up")}
                  </Text>
                </Link>
              </Text>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

type AppLayoutProps = PropsWithChildren<{
  scrollEnabled?: boolean;
  showNativeBottomTabs?: boolean;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
}>;

function useBuyerCartCount() {
  return useCartCount().totalItems;
}

function NativeBottomTabs() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useNativeAuth();
  const { isDark } = useTheme();
  const totalItems = useBuyerCartCount();
  const accountHref = "/account" as Href;
  const activeColor = "#16a34a";
  const inactiveColor = isDark ? "#94a3b8" : "#64748b";
  const borderColor = isDark ? "#1e293b" : "#e5e7eb";
  const backgroundColor = isDark ? "#0f172a" : "#ffffff";

  const tabs = [
    {
      key: "home",
      label: t("header.home", "Home"),
      icon: "home" as const,
      href: "/" as Href,
      active: pathname === "/",
    },
    {
      key: "categories",
      label: t("header.categories", "Categories"),
      icon: "grid" as const,
      href: "/categories" as Href,
      active: pathname.startsWith("/categories"),
    },
    {
      key: "cart",
      label: t("cart.title", "Cart"),
      icon: "shopping-cart" as const,
      href: "/cart" as Href,
      active: pathname.startsWith("/cart") || pathname.startsWith("/checkout"),
      badge: totalItems,
    },
    {
      key: "account",
      label: t("buyer_dashboard.account", "Account"),
      icon: "user" as const,
      href: accountHref as Href,
      active: accountPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
    },
  ];

  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor }}>
      <View
        className="flex-row border-t px-2 pb-1 pt-2"
        style={{ borderTopColor: borderColor, backgroundColor }}
      >
        {tabs.map((tab) => {
          const color = tab.active ? activeColor : inactiveColor;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (tab.active) return;
                if (Platform.OS === "web") {
                  router.push(tab.href);
                  return;
                }
                router.replace(tab.href);
              }}
              className="min-h-14 flex-1 items-center justify-center rounded-xl px-1"
              accessibilityRole="button"
            >
              <View className="relative">
                <Feather name={tab.icon} color={color} size={21} />
                {tab.badge && tab.badge > 0 ? (
                  <View className="absolute -right-3 -top-2 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5">
                    <Text className="font-sans text-[10px] font-black leading-3 text-white">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                className="mt-1 text-center font-sans text-[11px] font-semibold"
                style={{ color }}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export function AppLayout({
  children,
  scrollEnabled = true,
  showNativeBottomTabs = true,
  onEndReached,
  onEndReachedThreshold = 320,
}: AppLayoutProps) {
  const endReachedRef = useRef(false);
  const isNative = Platform.OS !== "web";
  const useWebLoadMoreSentinel = Platform.OS === "web" && Boolean(onEndReached);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!onEndReached || useWebLoadMoreSentinel) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromEnd =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const isNearEnd = distanceFromEnd <= onEndReachedThreshold;

      if (isNearEnd && !endReachedRef.current) {
        endReachedRef.current = true;
        onEndReached();
      } else if (!isNearEnd && endReachedRef.current) {
        endReachedRef.current = false;
      }
    },
    [onEndReached, onEndReachedThreshold, useWebLoadMoreSentinel],
  );

  if (!scrollEnabled) {
    return (
      <View className="min-w-0 flex-1 bg-gray-50 dark:bg-slate-950">
        {!isNative ? <Header /> : null}
        {isNative ? (
          <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50 dark:bg-slate-950">
            {children}
          </SafeAreaView>
        ) : (
          children
        )}
        {isNative && showNativeBottomTabs ? <NativeBottomTabs /> : null}
        {isNative ? <FloatingCompareButtonNative /> : null}
      </View>
    );
  }

  if (isNative) {
    return (
      <View className="min-w-0 flex-1 bg-gray-50 dark:bg-slate-950">
        <SafeAreaView edges={["top"]} className="min-w-0 flex-1 bg-gray-50 dark:bg-slate-950">
          <ScrollView
            className="min-w-0 flex-1"
            contentContainerClassName={showNativeBottomTabs ? "min-w-0 grow pb-24" : "min-w-0 grow"}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            {...(useWebLoadMoreSentinel
              ? {}
              : { onScroll: handleScroll, scrollEventThrottle: 16 as const })}
            showsVerticalScrollIndicator
          >
            <AnnouncementNative />
            {children}
            {useWebLoadMoreSentinel && onEndReached ? (
              <WebLoadMoreSentinel
                onVisible={onEndReached}
                rootMargin={`${onEndReachedThreshold}px`}
              />
            ) : null}
          </ScrollView>
        </SafeAreaView>
        {showNativeBottomTabs ? <NativeBottomTabs /> : null}
        <FloatingCompareButtonNative />
      </View>
    );
  }

  return (
    <View className="min-w-0 flex-1 bg-gray-50 dark:bg-slate-950">
      <Header />
      <ScrollView
        className="min-w-0 flex-1"
        contentContainerClassName="min-w-0 grow"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        {...(useWebLoadMoreSentinel
          ? {}
          : { onScroll: handleScroll, scrollEventThrottle: 16 as const })}
        showsVerticalScrollIndicator
      >
        <AnnouncementNative />
        {children}
        {useWebLoadMoreSentinel && onEndReached ? (
          <WebLoadMoreSentinel
            onVisible={onEndReached}
            rootMargin={`${onEndReachedThreshold}px`}
          />
        ) : null}
        <Footer />
      </ScrollView>
      <FloatingCompareButtonNative />
    </View>
  );
}
