import Feather from "@expo/vector-icons/Feather";
import { OptimizedImage as Image } from "@/components/ui/optimized-image";
import { Link, useGlobalSearchParams, usePathname, useRouter, type Href } from "expo-router";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import { NativeNotificationBell } from "@/components/notifications/native-notification-bell";
import { BRAND_LOGO } from "@/constants/brand";
import { useNativeAuth } from "@/context/native-auth";
import { useTheme } from "@/context/theme";
import {
  mergeRouteLang,
  normalizeLanguage,
  useAppTranslation,
  type SupportedLanguage,
} from "@/i18n";

type DashboardTopNavProps = {
  title: string;
  subtitle?: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  dashboardHref: Href;
  leadingAction?: ReactNode;
  showBrand?: boolean;
};

const languages: SupportedLanguage[] = ["en", "my"];

const languageLabels: Record<SupportedLanguage, string> = {
  en: "English",
  my: "မြန်မာ",
};

function initials(name?: string | null) {
  const parts = String(name || "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (parts[0]?.[0] || "U").toUpperCase();
}

export function DashboardTopNav({
  title,
  subtitle,
  searchTerm,
  onSearchChange,
  onRefresh,
  dashboardHref,
  leadingAction,
  showBrand = true,
}: DashboardTopNavProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const params = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const { user, logout } = useNativeAuth();
  const { isDark } = useTheme();
  const { i18n, language, t } = useAppTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const canSearch = typeof searchTerm === "string" && Boolean(onSearchChange);
  const activeLanguage = normalizeLanguage(language);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace("/");
  };

  const changeLanguage = (nextLanguage: SupportedLanguage) => {
    void i18n.changeLanguage(nextLanguage);
    if (Platform.OS === "web") {
      router.replace(
        mergeRouteLang(pathname, params, nextLanguage) as Href,
      );
    }
    setLanguageOpen(false);
  };

  return (
    <View className="relative z-40 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            {leadingAction}
            {showBrand ? (
              <Link href="/" asChild>
                <Pressable className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-white shadow-sm shadow-gray-200/70 dark:border-slate-700 dark:bg-slate-950 dark:shadow-none">
                  <Image
                    source={BRAND_LOGO}
                    style={{ width: 30, height: 30 }}
                    contentFit="contain"
                  />
                </Pressable>
              </Link>
            ) : null}
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-[11px] font-bold uppercase tracking-wide text-green-700 dark:text-green-300">
                {t("dashboard.nav.label", { defaultValue: "Pyonea Dashboard" })}
              </Text>
              <Text
                className="font-sans text-xl font-black text-gray-950 dark:text-slate-100"
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400"
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          {canSearch ? (
            <View className="hidden min-h-10 min-w-0 flex-1 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3 dark:border-slate-700 dark:bg-slate-950 md:flex xl:max-w-md">
              <Feather name="search" color="#94a3b8" size={16} />
              <TextInput
                value={searchTerm}
                onChangeText={onSearchChange}
                placeholder={t("search.placeholder", {
                  defaultValue: "Search...",
                })}
                placeholderTextColor="#94a3b8"
                className="ml-2 min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
              />
            </View>
          ) : null}

          <View className="flex-row items-center gap-2">
            {onRefresh ? (
              <Pressable
                onPress={onRefresh}
                className="h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-950"
              >
                <Feather
                  name="refresh-cw"
                  color={isDark ? "#cbd5e1" : "#475569"}
                  size={17}
                />
              </Pressable>
            ) : null}

            <NativeNotificationBell compact />

            <View className="relative">
              <Pressable
                onPress={() => {
                  setLanguageOpen((current) => !current);
                  setMenuOpen(false);
                }}
                className="hidden h-10 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 dark:border-slate-700 dark:bg-slate-950 sm:flex"
              >
                <Text className="font-sans text-xs font-black uppercase text-gray-700 dark:text-slate-200">
                  {activeLanguage}
                </Text>
                <Feather
                  name="chevron-down"
                  color={isDark ? "#cbd5e1" : "#64748b"}
                  size={14}
                />
              </Pressable>

              {languageOpen ? (
                <View className="absolute right-0 top-12 z-50 w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
                  {languages.map((code) => {
                    const active = activeLanguage === code;
                    return (
                      <Pressable
                        key={code}
                        onPress={() => changeLanguage(code)}
                        className={`flex-row items-center justify-between rounded-lg px-3 py-2 ${
                          active ? "bg-green-50 dark:bg-green-900/20" : ""
                        }`}
                      >
                        <Text
                          className={`font-sans text-sm font-semibold ${
                            active
                              ? "text-green-700 dark:text-green-300"
                              : "text-gray-700 dark:text-slate-200"
                          }`}
                        >
                          {languageLabels[code]}
                        </Text>
                        {active ? (
                          <Feather name="check" color="#16a34a" size={15} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View className="relative">
              <Pressable
                onPress={() => {
                  setMenuOpen((current) => !current);
                  setLanguageOpen(false);
                }}
                className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-1.5 pr-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <View className="h-8 w-8 items-center justify-center rounded-full bg-green-600">
                  <Text className="font-sans text-xs font-black text-white">
                    {initials(user?.name)}
                  </Text>
                </View>
                <Feather
                  name={menuOpen ? "chevron-up" : "chevron-down"}
                  color={isDark ? "#cbd5e1" : "#64748b"}
                  size={15}
                />
              </Pressable>

              {menuOpen ? (
                <View className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
                  <View className="flex-row items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-950">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-green-600">
                      <Text className="font-sans text-sm font-black text-white">
                        {initials(user?.name)}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100"
                        numberOfLines={1}
                      >
                        {user?.name || "User"}
                      </Text>
                      <Text
                        className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400"
                        numberOfLines={1}
                      >
                        {user?.email || "Signed in"}
                      </Text>
                    </View>
                  </View>

                  <View className="my-2 h-px bg-gray-100 dark:bg-slate-800" />

                  <Link href={dashboardHref} asChild>
                    <Pressable
                      onPress={() => setMenuOpen(false)}
                      className="flex-row items-center gap-3 rounded-lg px-3 py-2.5"
                    >
                      <Feather name="layout" color="#15803d" size={16} />
                      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                        {t("dashboard.nav.dashboard", {
                          defaultValue: "Dashboard",
                        })}
                      </Text>
                    </Pressable>
                  </Link>
                  <Link href="/" asChild>
                    <Pressable
                      onPress={() => setMenuOpen(false)}
                      className="flex-row items-center gap-3 rounded-lg px-3 py-2.5"
                    >
                      <Feather name="shopping-bag" color="#64748b" size={16} />
                      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                        {t("dashboard.nav.marketplace", {
                          defaultValue: "Marketplace",
                        })}
                      </Text>
                    </Pressable>
                  </Link>
                  <Pressable
                    onPress={handleLogout}
                    className="mt-1 flex-row items-center gap-3 rounded-lg px-3 py-2.5"
                  >
                    <Feather name="log-out" color="#dc2626" size={16} />
                    <Text className="font-sans text-sm font-semibold text-red-600 dark:text-red-300">
                      {t("header.logout", { defaultValue: "Logout" })}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className="gap-2 xl:flex-row xl:items-center xl:justify-between">
          {canSearch ? (
            <View className="min-h-11 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3 dark:border-slate-700 dark:bg-slate-950 md:hidden">
              <Feather name="search" color="#94a3b8" size={16} />
              <TextInput
                value={searchTerm}
                onChangeText={onSearchChange}
                placeholder={t("search.placeholder", {
                  defaultValue: "Search...",
                })}
                placeholderTextColor="#94a3b8"
                className="ml-2 min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
              />
            </View>
          ) : null}

          <View className="flex-row items-center justify-end gap-2 sm:hidden">
            {languages.map((code) => {
              const active = activeLanguage === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => changeLanguage(code)}
                  className={`rounded-lg px-2.5 py-1.5 ${active ? "bg-green-600" : "bg-gray-100 dark:bg-slate-800"}`}
                >
                  <Text
                    className={`font-sans text-xs font-bold uppercase ${active ? "text-white" : "text-gray-500 dark:text-slate-400"}`}
                  >
                    {code}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
