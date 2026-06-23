import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { BRAND_LOGO } from '@/constants/brand';

import { useTheme } from '@/context/theme';

import type { DashboardNavItem, DashboardNavVariant } from './types';

type DashboardSidebarProps = {
  navItems: DashboardNavItem[];
  activeTab: string;
  onTab: (tab: string) => void;
  navVariant?: DashboardNavVariant;
  brandSubtitle?: string;
  sidebarHeader?: ReactNode;
  sidebarFooter?: ReactNode;
  widthClassName?: string;
};

export function DashboardSidebar({
  navItems,
  activeTab,
  onTab,
  navVariant = 'list',
  brandSubtitle = 'Dashboard',
  sidebarHeader,
  sidebarFooter,
  widthClassName = 'w-64',
}: DashboardSidebarProps) {
  const { isDark } = useTheme();
  const isSeller = navVariant === 'seller';
  const isPill = navVariant === 'pill';

  return (
    <View
      className={`relative z-20 hidden ${widthClassName} border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex ${
        isSeller ? 'border-gray-200/60 bg-white/80 shadow-xl dark:border-slate-700/60 dark:bg-slate-800/80' : ''
      }`}>
      {!sidebarHeader && !isPill ? (
        <View className="border-b border-gray-100 px-5 py-5 dark:border-slate-800">
          <Link href="/" asChild>
            <Pressable className="flex-row items-center gap-3">
              <View className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <Image
                  source={BRAND_LOGO}
                  style={{ width: 40, height: 40 }}
                  contentFit="contain"
                />
              </View>
              <View>
                <Text
                  className="text-lg text-green-800 dark:text-green-300"
                  style={{ fontFamily: 'Torus-SemiBold' }}>
                  Pyonea
                </Text>
                <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                  {brandSubtitle}
                </Text>
              </View>
            </Pressable>
          </Link>
        </View>
      ) : null}

      {sidebarHeader ? <View className="px-4 pt-6">{sidebarHeader}</View> : null}

      <ScrollView
        className="flex-1"
        contentContainerClassName={isSeller ? 'gap-1 px-4 py-4' : 'gap-1 px-3 py-4'}>
        {navItems.map((item) => {
          const active = activeTab === item.id;
          const activeList = active && !isPill && !isSeller;
          const activePill = active && isPill;
          const activeSeller = active && isSeller;

          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (item.url) {
                  void Linking.openURL(item.url);
                  return;
                }
                onTab(item.id);
              }}
              className={
                isSeller
                  ? `mb-1 flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
                      activeSeller ? 'bg-green-500 dark:bg-emerald-500' : 'bg-transparent'
                    }`
                  : isPill
                    ? `flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
                        activePill ? 'bg-green-600' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`
                    : `flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                        activeList
                          ? 'bg-green-50 dark:bg-green-900/25'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`
              }>
              <Feather
                name={item.icon}
                color={
                  activePill || activeSeller
                    ? '#ffffff'
                    : activeList
                      ? '#15803d'
                      : isDark
                        ? '#cbd5e1'
                        : '#64748b'
                }
                size={18}
              />
              <Text
                className={`min-w-0 flex-1 font-sans text-sm font-semibold ${
                  activePill || activeSeller
                    ? 'text-white'
                    : activeList
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-600 dark:text-slate-300'
                }`}
                numberOfLines={1}>
                {item.label}
              </Text>
              {item.locked ? (
                <Feather
                  name="lock"
                  color={activePill || activeSeller ? '#ffffff' : isDark ? '#94a3b8' : '#9ca3af'}
                  size={13}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {sidebarFooter ? (
        <View className="border-t border-gray-100 p-4 dark:border-slate-800">{sidebarFooter}</View>
      ) : null}
    </View>
  );
}
