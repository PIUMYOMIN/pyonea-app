import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useAppTranslation } from '@/i18n';

function PageShell({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      <View className="bg-gray-50 px-4 py-10 dark:bg-slate-950 sm:px-6 sm:py-12 lg:px-8">
        <View className="mx-auto w-full max-w-5xl">{children}</View>
      </View>
    </AppLayout>
  );
}

function Panel({
  children,
  className = '',
  padding = 'p-6',
}: {
  children: ReactNode;
  className?: string;
  padding?: 'p-6' | 'p-8';
}) {
  return (
    <View
      className={`rounded-lg border border-gray-100 bg-white ${padding} shadow-md shadow-gray-200/70 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50 ${className}`}>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-6 font-sans text-2xl font-bold text-gray-950 dark:text-slate-100">
      {children}
    </Text>
  );
}

function Paragraph({ children, last = false }: { children: ReactNode; last?: boolean }) {
  return (
    <Text
      className={`font-sans text-base leading-7 text-gray-700 dark:text-slate-300 ${
        last ? '' : 'mb-6'
      }`}>
      {children}
    </Text>
  );
}

function BulletPoint({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row gap-3">
      <Text className="mt-0.5 font-sans text-base font-bold text-green-600 dark:text-green-400">
        {'\u2022'}
      </Text>
      <Text className="min-w-0 flex-1 font-sans text-base leading-6 text-gray-700 dark:text-slate-300">
        {children}
      </Text>
    </View>
  );
}

export function AboutNative() {
  const { t } = useAppTranslation();
  const buyerKeys = ['point1', 'point2', 'point3', 'point4', 'point5'] as const;
  const sellerKeys = ['point1', 'point2', 'point3', 'point4', 'point5'] as const;

  return (
    <PageShell>
      <Text className="mb-8 text-center font-sans text-2xl font-bold text-gray-950 dark:text-slate-100 sm:text-4xl">
        {t('about.title')}
      </Text>

      <Panel className="mb-12" padding="p-8">
        <SectionTitle>{t('about.mission.title')}</SectionTitle>
        <Paragraph>{t('about.mission.paragraph1')}</Paragraph>
        <Paragraph>{t('about.mission.paragraph2')}</Paragraph>
        <Paragraph last>{t('about.mission.paragraph3')}</Paragraph>
      </Panel>

      <View className="mb-12 gap-8 md:flex-row md:items-stretch">
        <Panel className="w-full md:w-0 md:flex-1">
          <Text className="mb-4 font-sans text-xl font-semibold text-gray-950 dark:text-slate-100">
            {t('about.buyers.title')}
          </Text>
          <View className="gap-3">
            {buyerKeys.map((key) => (
              <BulletPoint key={key}>{t(`about.buyers.${key}`)}</BulletPoint>
            ))}
          </View>
        </Panel>

        <Panel className="w-full md:w-0 md:flex-1">
          <Text className="mb-4 font-sans text-xl font-semibold text-gray-950 dark:text-slate-100">
            {t('about.sellers.title')}
          </Text>
          <View className="gap-3">
            {sellerKeys.map((key) => (
              <BulletPoint key={key}>{t(`about.sellers.${key}`)}</BulletPoint>
            ))}
          </View>
        </Panel>
      </View>

      <Panel padding="p-8">
        <SectionTitle>{t('about.vision.title')}</SectionTitle>
        <Paragraph>{t('about.vision.paragraph1')}</Paragraph>
        <Paragraph>{t('about.vision.paragraph2')}</Paragraph>
        <Paragraph last>{t('about.vision.paragraph3')}</Paragraph>
      </Panel>
    </PageShell>
  );
}
