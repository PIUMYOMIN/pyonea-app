import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_CLASS } from '@/constants/layout';
import { useAppTranslation } from '@/i18n';

type HelpCategory = 'buying' | 'selling' | 'payments';

const faqCategories: Record<HelpCategory, string[]> = {
  buying: ['place_order', 'minimum_order', 'track_order'],
  selling: ['become_seller', 'seller_fees', 'receive_payments'],
  payments: ['payment_methods', 'payment_security', 'refund_time'],
};

const categoryIds = Object.keys(faqCategories) as HelpCategory[];
const supportCards = ['email', 'phone', 'chat'] as const;

function CategoryButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg px-6 py-3 ${
        active ? 'bg-blue-600' : 'bg-gray-100 dark:bg-slate-700'
      }`}>
      <Text
        className={`text-center font-sans text-sm font-semibold ${
          active ? 'text-white' : 'text-gray-800 dark:text-slate-200'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

function SupportCard({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <View className="rounded-lg border border-gray-200 p-4 dark:border-slate-600">
      <Text className="mb-2 font-sans font-semibold text-gray-950 dark:text-slate-100">
        {title}
      </Text>
      <Text className="mb-3 font-sans text-base text-gray-600 dark:text-slate-400">
        {primary}
      </Text>
      <Text className="font-sans text-sm text-gray-500 dark:text-slate-500">
        {secondary}
      </Text>
    </View>
  );
}

export function HelpCenterNative() {
  const { t } = useAppTranslation();
  const [activeCategory, setActiveCategory] = useState<HelpCategory>('buying');
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  return (
    <AppLayout>
      <View className="bg-gray-50 py-8 dark:bg-slate-950">
        <View className={SITE_CONTAINER_CLASS}>
          <Text className="mb-8 font-sans text-xl font-bold text-gray-950 dark:text-slate-100 sm:text-3xl">
            {t('helpCenter.page_title')}
          </Text>

          <View className="mb-8 rounded-lg bg-white p-6 shadow-md shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-900/50">
            <View className="mb-6 gap-4 md:flex-row">
              {categoryIds.map((category) => (
                <CategoryButton
                  key={category}
                  label={t(`helpCenter.categories.${category}`)}
                  active={activeCategory === category}
                  onPress={() => {
                    setActiveCategory(category);
                    setActiveQuestion(null);
                  }}
                />
              ))}
            </View>

            <View className="gap-4">
              {faqCategories[activeCategory].map((faqKey) => {
                const faqId = `${activeCategory}.${faqKey}`;
                const open = activeQuestion === faqId;

                return (
                  <View
                    key={faqId}
                    className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                    <Pressable
                      onPress={() => setActiveQuestion(open ? null : faqId)}
                      className="flex-row items-center justify-between gap-3 bg-gray-50 p-4 dark:bg-slate-700">
                      <Text className="min-w-0 flex-1 font-sans font-medium text-gray-900 dark:text-slate-100">
                        {t(`helpCenter.${activeCategory}.${faqKey}.question`)}
                      </Text>
                      <Feather
                        name={open ? 'chevron-up' : 'chevron-down'}
                        color="#94a3b8"
                        size={20}
                      />
                    </Pressable>

                    {open ? (
                      <View className="bg-white p-4 dark:bg-slate-800">
                        <Text className="font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
                          {t(`helpCenter.${activeCategory}.${faqKey}.answer`)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <View className="rounded-lg bg-white p-6 shadow-md shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-900/50">
            <Text className="mb-4 font-sans text-2xl font-bold text-gray-950 dark:text-slate-100">
              {t('helpCenter.support.title')}
            </Text>
            <Text className="mb-6 font-sans text-base leading-7 text-gray-700 dark:text-slate-300">
              {t('helpCenter.support.description')}
            </Text>

            <View className="gap-6 md:flex-row">
              {supportCards.map((card) => (
                <View key={card} className="md:flex-1">
                  <SupportCard
                    title={t(`helpCenter.support.${card}.title`)}
                    primary={t(
                      card === 'email'
                        ? 'helpCenter.support.email.email'
                        : card === 'phone'
                          ? 'helpCenter.support.phone.phone'
                          : 'helpCenter.support.chat.status'
                    )}
                    secondary={t(
                      card === 'email'
                        ? 'helpCenter.support.email.response_time'
                        : card === 'phone'
                          ? 'helpCenter.support.phone.hours'
                          : 'helpCenter.support.chat.alternative'
                    )}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
