import { Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_4XL_CLASS } from '@/constants/layout';
import { useAppTranslation } from '@/i18n';

const listSections = ['dataCollection', 'dataUsage', 'dataSharing', 'userRights'] as const;
const textSections = ['dataSecurity', 'cookies', 'changes'] as const;

function BulletList({ items }: { items: string[] }) {
  return (
    <View className="gap-1">
      {items.map((item, index) => (
        <View key={`${item.slice(0, 18)}-${index}`} className="flex-row gap-2">
          <Text className="mt-0.5 font-sans text-base leading-6 text-gray-700 dark:text-slate-300">
            {'\u2022'}
          </Text>
          <Text className="min-w-0 flex-1 font-sans text-base leading-6 text-gray-700 dark:text-slate-300">
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PolicySection({
  title,
  text,
  items,
}: {
  title: string;
  text: string;
  items?: string[];
}) {
  return (
    <View>
      <Text className="mb-3 font-sans text-xl font-semibold text-gray-950 dark:text-slate-100">
        {title}
      </Text>
      <Text className={items && items.length > 0 ? 'mb-2 font-sans text-base leading-7 text-gray-700 dark:text-slate-300' : 'font-sans text-base leading-7 text-gray-700 dark:text-slate-300'}>
        {text}
      </Text>
      {items && items.length > 0 ? <BulletList items={items} /> : null}
    </View>
  );
}

export function PrivacyPolicyNative() {
  const { t } = useAppTranslation();
  const lastUpdated = new Date().toLocaleDateString('en-GB');
  const getItems = (key: string) => {
    const value = t(key, { returnObjects: true }) as unknown;
    return Array.isArray(value) ? value.map(String) : [];
  };

  return (
    <AppLayout>
      <View className="bg-gray-50 py-12 dark:bg-slate-950">
        <View className={SITE_CONTAINER_4XL_CLASS}>
          <Text className="mb-2 text-center font-sans text-2xl font-bold text-gray-950 dark:text-slate-100 sm:text-3xl">
            {t('privacyPolicy.title')}
          </Text>
          <Text className="mb-8 text-center font-sans text-base leading-6 text-gray-600 dark:text-slate-400">
            {t('privacyPolicy.subtitle')}
          </Text>

          <View className="mb-8 gap-8 rounded-lg bg-white p-6 shadow-md shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-900/50">
            <Text className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
              {t('privacyPolicy.intro')}
            </Text>

            {listSections.slice(0, 3).map((section) => (
              <PolicySection
                key={section}
                title={t(`privacyPolicy.${section}.title`)}
                text={t(`privacyPolicy.${section}.text`)}
                items={getItems(`privacyPolicy.${section}.items`)}
              />
            ))}

            <PolicySection
              title={t('privacyPolicy.dataSecurity.title')}
              text={t('privacyPolicy.dataSecurity.text')}
            />

            <PolicySection
              title={t('privacyPolicy.userRights.title')}
              text={t('privacyPolicy.userRights.text')}
              items={getItems('privacyPolicy.userRights.items')}
            />

            {textSections.slice(1).map((section) => (
              <PolicySection
                key={section}
                title={t(`privacyPolicy.${section}.title`)}
                text={t(`privacyPolicy.${section}.text`)}
              />
            ))}

            <View>
              <Text className="mb-3 font-sans text-xl font-semibold text-gray-950 dark:text-slate-100">
                {t('privacyPolicy.contact.title')}
              </Text>
              <Text className="mb-2 font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
                {t('privacyPolicy.contact.text')}
              </Text>
              <Text className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
                <Text className="font-bold">{t('contact.info.email')}:</Text>{' '}
                <Text className="text-blue-600 dark:text-blue-400">
                  {t('privacyPolicy.contact.email')}
                </Text>
                {'\n'}
                <Text className="font-bold">{t('contact.info.phone')}:</Text>{' '}
                {t('privacyPolicy.contact.phone')}
                {'\n'}
                <Text className="font-bold">{t('contact.info.address')}:</Text>{' '}
                {t('privacyPolicy.contact.address')}
              </Text>
            </View>
          </View>

          <View className="border-t border-gray-200 pt-6 dark:border-slate-700">
            <Text className="text-center font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('privacyPolicy.lastUpdated', { date: lastUpdated })}
            </Text>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
