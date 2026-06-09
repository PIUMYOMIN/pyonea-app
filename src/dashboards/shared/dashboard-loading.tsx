import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DashboardLoadingProps = {
  message?: string;
  className?: string;
};

export function DashboardLoading({
  message = 'Loading dashboard...',
  className = 'flex-1 items-center justify-center bg-gray-50 dark:bg-slate-950',
}: DashboardLoadingProps) {
  return (
    <SafeAreaView className={className}>
      <ActivityIndicator color="#16a34a" size="large" />
      <Text className="mt-4 font-sans text-sm text-gray-500 dark:text-slate-400">
        {message}
      </Text>
    </SafeAreaView>
  );
}
