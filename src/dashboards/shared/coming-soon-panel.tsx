import Feather from '@expo/vector-icons/Feather';
import { Text, View } from 'react-native';

import type { DashboardNavItem } from './types';

type ComingSoonPanelProps = {
  item: Pick<DashboardNavItem, 'label' | 'icon'>;
  description?: string;
};

export function ComingSoonPanel({
  item,
  description = 'This module will be ported in a future update. The route and dashboard shell are ready, so each heavy module can be added one at a time.',
}: ComingSoonPanelProps) {
  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/25">
        <Feather name={item.icon} color="#16a34a" size={24} />
      </View>
      <Text className="mt-5 font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
        {item.label}
      </Text>
      <Text className="mt-2 max-w-2xl font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
        {description}
      </Text>
    </View>
  );
}
