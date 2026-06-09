import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/context/theme';

import type { DashboardNavItem, DashboardNavVariant } from './types';

type DashboardMobileDrawerProps = {
  visible: boolean;
  navItems: DashboardNavItem[];
  activeTab: string;
  onClose: () => void;
  onTab: (tab: string) => void;
  navVariant?: DashboardNavVariant;
  brandSubtitle?: string;
  drawerHeader?: ReactNode;
  drawerFooter?: ReactNode;
  widthClassName?: string;
};

export function DashboardMobileDrawer({
  visible,
  navItems,
  activeTab,
  onClose,
  onTab,
  navVariant = 'list',
  brandSubtitle = 'Dashboard',
  drawerHeader,
  drawerFooter,
  widthClassName = 'w-72',
}: DashboardMobileDrawerProps) {
  const { isDark, toggleTheme } = useTheme();
  const isSeller = navVariant === 'seller';

  const handleTab = (tab: string) => {
    onTab(tab);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="relative z-50 flex-1 md:hidden">
        <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />
        <View
          className={`relative z-10 h-full ${widthClassName} bg-white shadow-2xl dark:bg-slate-900 ${
            isSeller ? 'max-w-[86%]' : ''
          }`}>
          {drawerHeader ? (
            <View className="border-b border-gray-100 px-4 py-5 dark:border-slate-800">
              {drawerHeader}
            </View>
          ) : (
            <View className="border-b border-gray-100 px-4 py-5 dark:border-slate-800">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Image
                    source={require('@/assets/images/logo.png')}
                    style={{ width: 38, height: 38, borderRadius: 10 }}
                    contentFit="contain"
                  />
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
                </View>
                <Pressable
                  onPress={onClose}
                  className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                  <Feather name="x" color="#64748b" size={18} />
                </Pressable>
              </View>
            </View>
          )}

          <ScrollView className="flex-1" contentContainerClassName="gap-1 px-3 py-4">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleTab(item.id)}
                  className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                    active
                      ? isSeller
                        ? 'bg-green-500 dark:bg-emerald-500'
                        : 'bg-green-50 dark:bg-green-900/25'
                      : ''
                  }`}>
                  <Feather
                    name={item.icon}
                    color={
                      active && isSeller ? '#ffffff' : active ? '#15803d' : isDark ? '#cbd5e1' : '#64748b'
                    }
                    size={18}
                  />
                  <Text
                    className={`min-w-0 flex-1 font-sans text-sm font-semibold ${
                      active && isSeller
                        ? 'text-white'
                        : active
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-gray-600 dark:text-slate-300'
                    }`}
                    numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.locked ? (
                    <Feather
                      name="lock"
                      color={active && isSeller ? '#ffffff' : isDark ? '#94a3b8' : '#9ca3af'}
                      size={13}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {drawerFooter ? (
            <View className="border-t border-gray-100 p-4 dark:border-slate-800">{drawerFooter}</View>
          ) : null}
          {navVariant === 'list' ? (
            <View
              className={`${drawerFooter ? 'border-t border-gray-100 p-4 dark:border-slate-800' : 'p-4 pt-0'}`}>
              <Pressable
                onPress={toggleTheme}
                className="flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 dark:border-slate-700">
                <Feather name={isDark ? 'sun' : 'moon'} color={isDark ? '#fde68a' : '#64748b'} size={16} />
                <Text className="font-sans text-sm font-semibold text-gray-600 dark:text-slate-300">
                  {isDark ? 'Light mode' : 'Dark mode'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
