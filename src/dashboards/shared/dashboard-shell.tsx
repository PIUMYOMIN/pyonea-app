import Feather from '@expo/vector-icons/Feather';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopNav } from '@/components/dashboard/dashboard-top-nav';

import { DashboardMobileDrawer } from './dashboard-mobile-drawer';
import { DashboardSidebar } from './dashboard-sidebar';
import type { DashboardShellProps } from './types';

export function DashboardShell({
  navItems = [],
  navVariant = 'list',
  activeTab,
  onTab,
  title,
  subtitle,
  dashboardHref,
  sidebarOpen,
  onSidebarOpen,
  searchTerm,
  onSearchChange,
  onRefresh,
  showBrand = false,
  brandSubtitle,
  sidebarHeader,
  sidebarFooter,
  drawerHeader,
  drawerFooter,
  sidebar,
  mobileDrawer,
  mobileTabBar = false,
  headerBelow,
  children,
}: DashboardShellProps) {
  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const shellClassName =
    navVariant === 'seller' || navVariant === 'pill'
      ? 'flex-1 bg-green-50 dark:bg-slate-950'
      : 'flex-1 bg-gray-50 dark:bg-slate-950';

  return (
    <SafeAreaView className={shellClassName}>
      <View className="relative flex-1 overflow-hidden md:flex-row">
        {sidebar ??
          (navItems.length > 0 ? (
            <DashboardSidebar
              navItems={navItems}
              activeTab={activeTab}
              onTab={onTab}
              navVariant={navVariant}
              brandSubtitle={brandSubtitle}
              sidebarHeader={sidebarHeader}
              sidebarFooter={sidebarFooter}
              widthClassName={navVariant === 'seller' ? 'w-80' : navVariant === 'pill' ? 'w-72' : 'w-64'}
            />
          ) : null)}

        {mobileDrawer ??
          (navItems.length > 0 ? (
            <DashboardMobileDrawer
              visible={sidebarOpen}
              navItems={navItems}
              activeTab={activeTab}
              onClose={() => onSidebarOpen(false)}
              onTab={onTab}
              navVariant={navVariant}
              brandSubtitle={brandSubtitle}
              drawerHeader={drawerHeader}
              drawerFooter={drawerFooter}
              widthClassName={navVariant === 'seller' ? 'w-80' : 'w-72'}
            />
          ) : null)}

        <View className="relative z-0 min-w-0 flex-1 overflow-hidden">
          <View className="relative z-30 bg-white shadow-sm shadow-slate-200/60 dark:bg-slate-900 dark:shadow-none">
            <DashboardTopNav
              title={title}
              subtitle={subtitle}
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              onRefresh={onRefresh}
              dashboardHref={dashboardHref}
              showBrand={showBrand}
              leadingAction={
                navItems.length > 0 ? (
                  <Pressable
                    onPress={() => onSidebarOpen(true)}
                    className="h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-950 md:hidden">
                    <Feather name="menu" color="#64748b" size={19} />
                  </Pressable>
                ) : undefined
              }
            />

            {headerBelow}

            {mobileTabBar && navItems.length > 0 ? (
              <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {navItems.map((item) => {
                      const active = activeTab === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => onTab(item.id)}
                          className={`flex-row items-center gap-2 rounded-full px-3 py-2 ${
                            active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-800'
                          }`}>
                          <Feather
                            name={item.icon}
                            color={active ? '#ffffff' : '#64748b'}
                            size={15}
                          />
                          <Text
                            className={`font-sans text-xs font-semibold ${
                              active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                            }`}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : activeItem && navVariant === 'list' ? (
              <View className="border-t border-gray-100 px-4 py-3 dark:border-slate-800 md:hidden">
                <View className="flex-row items-center gap-2 rounded-xl bg-green-50 px-3 py-2 dark:bg-green-900/20">
                  <Feather name={activeItem.icon} color="#15803d" size={15} />
                  <Text
                    className="min-w-0 flex-1 font-sans text-xs font-bold text-green-700 dark:text-green-300"
                    numberOfLines={1}>
                    {activeItem.label}
                  </Text>
                  <Pressable onPress={() => onSidebarOpen(true)}>
                    <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-300">
                      Change
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}
