import Feather from "@expo/vector-icons/Feather";
import { OptimizedImage as Image } from "@/components/ui/optimized-image";
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
import { footerGroups, mainRoutes } from "@/constants/routes";
import { useCookies } from "@/context/cookies";
import { useNativeAuth } from "@/context/native-auth";
import { useTheme } from "@/context/theme";
import {
  normalizeLanguage,
  useAppTranslation,
  type SupportedLanguage,
} from "@/i18n";
import { getRoleDestination, hasUserRole } from "@/utils/auth-routing";
import { fetchCart, subscribeNewsletter } from "@/utils/native-api";
import { subscribeCartCountChanged } from "@/utils/native-cart-events";

const socialLinks = [
  { key: "facebook", url: "https://facebook.com/PyoneaOfficial" },
  { key: "twitter", url: "https://twitter.com/PyoneaOfficial" },
  { key: "linkedin", url: "https://linkedin.com/company/pyoneaofficial" },
  { key: "instagram", url: "https://instagram.com/PyoneaOfficial" },
  { key: "threads", url: "https://www.threads.com/@PyoneaOfficial" },
];
const headerRouteKeys: Record<string, string> = {
  "/": "header.home",
  "/products": "header.products",
  "/sellers": "header.sellers",
  "/categories": "header.categories",
};
const footerGroupKeys: Record<string, string> = {
  Discover: "footer.section_discover",
  Help: "footer.section_help",
  "For Sellers": "footer.section_sell",
  Company: "footer.section_company",
  Legal: "footer.section_legal",
};
const footerRouteKeys: Record<string, string> = {
  "/local-deals": "footer.local_deals",
  "/compare": "footer.compare_product",
  "/bulk-order-tool": "footer.bulk_order_tool",
  "/blog": "footer.blog",
  "/help": "footer.help_center",
  "/faq": "footer.faq",
  "/shipping": "footer.shipping",
  "/track-order": "footer.track_order",
  "/return-policy": "footer.returns",
  "/report": "footer.report_issue",
  "/seller-guidelines": "footer.seller_guidelines",
  "/pricing": "footer.pricing",
  "/about-us": "footer.about",
  "/contact": "footer.contact",
  "/terms": "footer.terms",
  "/privacy-policy": "footer.privacy",
  "/legal": "footer.legal",
};

const accountPaths = [
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
  const activeLanguage = normalizeLanguage(
    typeof params.lang === "string"
      ? params.lang
      : i18n.resolvedLanguage || i18n.language,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(routeSearch);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const user = auth.user;
  const isBuyer = !user || hasUserRole(user, "buyer");
  const dashboardHref = user ? getRoleDestination(user) : "/login";
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const userRole = user?.type || user?.roles?.[0] || "buyer";

  const navItems = useMemo(
    () =>
      mainRoutes.map((route) => ({
        ...route,
        active:
          route.href === "/"
            ? pathname === "/"
            : pathname.startsWith(String(route.href)),
        translatedLabel: t(headerRouteKeys[String(route.href)] || route.label),
      })),
    [pathname, t],
  );

  const refreshCartCount = useCallback(
    async (signal?: AbortSignal) => {
      if (!user || !hasUserRole(user, "buyer")) {
        setTotalItems(0);
        return;
      }

      try {
        const cart = await fetchCart(signal);
        setTotalItems(cart.totalItems);
      } catch {
        if (!signal?.aborted) setTotalItems(0);
      }
    },
    [user],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void refreshCartCount(controller.signal);
    }, 0);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [refreshCartCount]);

  useEffect(
    () =>
      subscribeCartCountChanged((event) => {
        if (typeof event === "number") {
          setTotalItems(Math.max(0, event));
          return;
        }
        if (typeof event?.count === "number") {
          setTotalItems(Math.max(0, event.count));
          return;
        }
        if (typeof event?.delta === "number") {
          const delta = event.delta;
          setTotalItems((current) => Math.max(0, current + delta));
          void refreshCartCount();
          return;
        }
        void refreshCartCount();
      }),
    [refreshCartCount],
  );

  const submitSearch = () => {
    const term = searchTerm.trim();
    const href = term
      ? (`/products?search=${encodeURIComponent(term)}` as Href)
      : "/products";
    router.push(href);
    setMobileOpen(false);
    setMobileSearch(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (!pathname.startsWith("/products")) return;

    const href = value.trim()
      ? (`/products?search=${encodeURIComponent(value.trim())}` as Href)
      : "/products";
    router.replace(href);
  };

  const changeLanguage = (nextLanguage: SupportedLanguage) => {
    void i18n.changeLanguage(nextLanguage);
    router.replace(`${pathname}?lang=${nextLanguage}` as Href);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await auth.logout();
    router.replace("/");
  };

  return (
    <SafeAreaView
      edges={["top"]}
      className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <View className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <View className="h-16 flex-row items-center justify-between gap-3">
          <Link href="/" asChild>
            <Pressable className="flex-shrink-0 flex-row items-center gap-2">
              <Image
                source={require("@/assets/images/logo.png")}
                style={{ width: 36, height: 36, borderRadius: 9 }}
                contentFit="contain"
              />
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

          <View className="flex-row items-center gap-1 sm:gap-2">
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
                  className={`flex-row items-center gap-1 rounded-md px-2.5 py-1 ${
                    activeLanguage === code
                      ? "bg-white shadow-sm dark:bg-slate-900"
                      : "bg-transparent"
                  }`}
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
              <Link href="/cart" asChild>
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
              <Link href="/login" asChild>
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
              <Link href="/login" asChild>
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
                <Link href="/register" asChild>
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

export function Footer() {
  const { t } = useAppTranslation();
  const { openBanner } = useCookies();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [newsletterMessage, setNewsletterMessage] = useState("");

  const handleNewsletterSubmit = useCallback(async () => {
    const email = newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterStatus("error");
      setNewsletterMessage(t("footer.newsletter_error_message"));
      return;
    }

    setNewsletterStatus("loading");
    setNewsletterMessage("");

    try {
      const result = await subscribeNewsletter(email, "footer");
      setNewsletterStatus(result.success ? "success" : "error");
      setNewsletterMessage(
        result.message ||
          (result.success ? t("footer.newsletter_confirm_message") : t("footer.newsletter_error_message"))
      );
      if (result.success) setNewsletterEmail("");
    } catch (error) {
      setNewsletterStatus("error");
      setNewsletterMessage(error instanceof Error ? error.message : t("footer.newsletter_error_message"));
    }
  }, [newsletterEmail, t]);

  return (
    <View className="border-t border-white/5 bg-gray-950 px-4 pb-8 pt-12 sm:px-6 lg:px-8">
      <View className="mx-auto w-full max-w-7xl">
        <View className="gap-4 border-b border-white/10 pb-10 sm:flex-row sm:items-center sm:justify-between">
          <View className="w-fit flex-row items-center gap-2.5">
            <Image
              source={require("@/assets/images/logo.png")}
              style={{ width: 36, height: 36, borderRadius: 9 }}
              contentFit="contain"
            />
            <View className="flex-1">
              <Text
                className="text-lg text-white"
                style={{ fontFamily: "Torus-SemiBold" }}
              >
                {t("header.logo_text")}
              </Text>
              <Text className="mt-0.5 max-w-md font-sans text-sm leading-5 text-gray-500">
                {t("footer.tagline")}
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-x-8 gap-y-10 pt-10 sm:flex-row sm:flex-wrap xl:flex-nowrap">
          {footerGroups.map((group) => (
            <View key={group.title} className="min-w-40 flex-1 gap-1.5">
              <Text className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-gray-500">
                {t(footerGroupKeys[group.title] || group.title)}
              </Text>
              {group.routes.map((route) => (
                <Link key={String(route.href)} href={route.href} asChild>
                  <Text className="py-0.5 font-sans text-sm text-gray-400">
                    {t(footerRouteKeys[String(route.href)] || route.label)}
                  </Text>
                </Link>
              ))}
            </View>
          ))}
        </View>

        <View className="mt-12 gap-10 border-t border-white/10 pt-10 lg:flex-row lg:items-start">
          <View className="flex-1 gap-8">
            <View>
              <Text className="mb-3 font-sans text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("footer.contact_info")}
              </Text>
              <Text className="font-sans text-sm text-gray-400">
                {t("footer.phone")}
              </Text>
              <Text className="mt-2 font-sans text-sm text-gray-400">
                {t("footer.email")}
              </Text>
              <Text className="mt-2 max-w-sm font-sans text-sm leading-6 text-gray-500">
                {t("footer.address")}
              </Text>
            </View>

            <View>
              <Text className="mb-3 font-sans text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("footer.follow_us")}
              </Text>
              <View className="flex-row flex-wrap gap-x-5 gap-y-2">
                {socialLinks.map((link) => (
                  <Pressable
                    key={link.key}
                    onPress={() => void Linking.openURL(link.url)}
                    accessibilityRole="link"
                  >
                    <Text className="font-sans text-sm text-gray-400">
                      {t(`footer.${link.key}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View className="w-full max-w-lg gap-2">
            <Text className="font-sans text-sm font-semibold text-white">
              {t("footer.newsletter_title")}
            </Text>
            <Text className="font-sans text-xs leading-5 text-green-200">
              {t("footer.newsletter_subtitle")}
            </Text>
            <View className="mt-1 flex-row gap-2">
              <TextInput
                value={newsletterEmail}
                onChangeText={setNewsletterEmail}
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-sans text-sm text-white"
                placeholder={t("footer.newsletter_email_placeholder")}
                placeholderTextColor="#bbf7d0"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Pressable
                disabled={newsletterStatus === "loading"}
                onPress={handleNewsletterSubmit}
                className="rounded-lg bg-white px-4 py-2 disabled:opacity-60">
                <Text className="font-sans text-sm font-semibold text-green-700">
                  {newsletterStatus === "loading" ? t("footer.newsletter_subscribing") : t("footer.newsletter_subscribe")}
                </Text>
              </Pressable>
            </View>
            {newsletterMessage ? (
              <Text
                className={`font-sans text-xs leading-5 ${
                  newsletterStatus === "success" ? "text-green-200" : "text-red-200"
                }`}>
                {newsletterMessage}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="mt-10 gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Text className="font-sans text-sm text-gray-500">
            {t("footer.copyright_label", { year: new Date().getFullYear() })}{" "}
            <Text
              className="text-gray-400"
              style={{ fontFamily: "Torus-SemiBold" }}
            >
              {t("header.logo_text")}
            </Text>
          </Text>
          <Text className="max-w-md font-sans text-sm text-gray-500 sm:text-right">
            {t("footer.copyright")}
          </Text>
          <Pressable onPress={openBanner} className="self-start sm:self-auto">
            <Text className="font-sans text-sm font-semibold text-gray-400">
              {t("footer.cookie_settings")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function useBuyerCartCount() {
  const auth = useNativeAuth();
  const [totalItems, setTotalItems] = useState(0);
  const user = auth.user;

  const refreshCartCount = useCallback(
    async (signal?: AbortSignal) => {
      if (!user || !hasUserRole(user, "buyer")) {
        setTotalItems(0);
        return;
      }

      try {
        const cart = await fetchCart(signal);
        setTotalItems(cart.totalItems);
      } catch {
        if (!signal?.aborted) setTotalItems(0);
      }
    },
    [user],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void refreshCartCount(controller.signal);
    }, 0);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [refreshCartCount]);

  useEffect(
    () =>
      subscribeCartCountChanged((event) => {
        if (typeof event === "number") {
          setTotalItems(Math.max(0, event));
          return;
        }
        if (typeof event?.count === "number") {
          setTotalItems(Math.max(0, event.count));
          return;
        }
        if (typeof event?.delta === "number") {
          const delta = event.delta;
          setTotalItems((current) => Math.max(0, current + delta));
          void refreshCartCount();
          return;
        }
        void refreshCartCount();
      }),
    [refreshCartCount],
  );

  return totalItems;
}

function NativeBottomTabs() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useNativeAuth();
  const { isDark } = useTheme();
  const totalItems = useBuyerCartCount();
  const accountHref = auth.user ? getRoleDestination(auth.user) : "/login";
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
              onPress={() => router.push(tab.href)}
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

type AppLayoutProps = PropsWithChildren<{
  scrollEnabled?: boolean;
  showNativeBottomTabs?: boolean;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
}>;

export function AppLayout({
  children,
  scrollEnabled = true,
  showNativeBottomTabs = true,
  onEndReached,
  onEndReachedThreshold = 320,
}: AppLayoutProps) {
  const [endReached, setEndReached] = useState(false);
  const isNative = Platform.OS !== "web";

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!onEndReached) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromEnd =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const isNearEnd = distanceFromEnd <= onEndReachedThreshold;

      if (isNearEnd && !endReached) {
        setEndReached(true);
        onEndReached();
      } else if (!isNearEnd && endReached) {
        setEndReached(false);
      }
    },
    [endReached, onEndReached, onEndReachedThreshold],
  );

  if (!scrollEnabled) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-slate-950">
        {!isNative ? <Header /> : null}
        {isNative ? (
          <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50 dark:bg-slate-950">
            {children}
          </SafeAreaView>
        ) : (
          children
        )}
        {isNative && showNativeBottomTabs ? <NativeBottomTabs /> : null}
      </View>
    );
  }

  if (isNative) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-slate-950">
        <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50 dark:bg-slate-950">
          <ScrollView
            className="flex-1"
            contentContainerClassName={showNativeBottomTabs ? "grow pb-24" : "grow"}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator
          >
            <AnnouncementNative />
            {children}
          </ScrollView>
        </SafeAreaView>
        {showNativeBottomTabs ? <NativeBottomTabs /> : null}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-950">
      <Header />
      <ScrollView
        className="flex-1"
        contentContainerClassName="grow"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
      >
        <AnnouncementNative />
        {children}
        <Footer />
      </ScrollView>
    </View>
  );
}
