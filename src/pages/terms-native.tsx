import { Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_4XL_CLASS } from '@/constants/layout';
import { useAppTranslation } from '@/i18n';

function Paragraphs({ content }: { content: string }) {
  return (
    <View className="gap-4">
      {content.split('\n\n').map((paragraph, index) => (
        <Text
          key={`${paragraph.slice(0, 18)}-${index}`}
          className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

export function TermsNative() {
  const { t } = useAppTranslation();

  return (
    <AppLayout>
      <View className="bg-gray-50 py-12 dark:bg-slate-950">
        <View className={SITE_CONTAINER_4XL_CLASS}>
          <Text className="mb-8 text-center font-sans text-2xl font-bold text-gray-950 dark:text-slate-100 sm:text-4xl">
            {t('legal.terms.title')}
          </Text>
          <Text className="mb-8 text-center font-sans text-base leading-6 text-gray-600 dark:text-slate-400">
            {t('legal.subtitle')}
          </Text>

          <View className="rounded-lg bg-white p-8 shadow-md shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-900/50">
            <Text className="mb-4 font-sans text-2xl font-bold text-gray-950 dark:text-slate-100">
              {t('legal.terms.title')}
            </Text>
            <Paragraphs content={t('legal.terms.content')} />
          </View>

          <View className="mt-8 rounded-lg bg-white p-6 shadow-md shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-900/50">
            <Text className="mb-4 font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
              {t('legal.contact.title')}
            </Text>
            <Text className="mb-4 font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
              {t('legal.contact.description')}
            </Text>
            <Text className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
              <Text className="font-bold">{t('legal.contact.emailLabel')}</Text>{' '}
              <Text className="text-blue-600 dark:text-blue-400">contact@pyonea.com</Text>
              {'\n'}
              <Text className="font-bold">{t('legal.contact.addressLabel')}</Text>{' '}
              {t('legal.contact.address')}
            </Text>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
