import { Link, type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';

type PlaceholderPageProps = {
  title: string;
  description: string;
  primaryHref?: Href;
  primaryLabel?: string;
};

export function PlaceholderPage({
  title,
  description,
  primaryHref = '/',
  primaryLabel = 'Back to Home',
}: PlaceholderPageProps) {
  return (
    <AppLayout>
      <View className="bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
        <View className="mx-auto w-full max-w-4xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <Text className="text-3xl font-black text-gray-950 sm:text-4xl">{title}</Text>
          <Text className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">{description}</Text>
          <Link href={primaryHref} asChild>
            <Text className="mt-8 w-fit rounded-lg bg-green-600 px-5 py-3 text-sm font-bold text-white">
              {primaryLabel}
            </Text>
          </Link>
        </View>
      </View>
    </AppLayout>
  );
}
