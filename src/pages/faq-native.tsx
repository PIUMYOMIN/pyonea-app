import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { ComponentProps, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useAppTranslation, useLocalizedHref } from '@/i18n';

type CategoryId = 'general' | 'buying' | 'selling' | 'payments' | 'shipping' | 'account';
type FeatherName = ComponentProps<typeof Feather>['name'];

const categoryIds: CategoryId[] = [
  'general',
  'buying',
  'selling',
  'payments',
  'shipping',
  'account',
];

const categoryFaqCounts: Record<CategoryId, number> = {
  general: 5,
  buying: 6,
  selling: 6,
  payments: 5,
  shipping: 5,
  account: 5,
};

const categoryIcons: Record<CategoryId, FeatherName> = {
  general: 'help-circle',
  buying: 'shopping-bag',
  selling: 'briefcase',
  payments: 'credit-card',
  shipping: 'truck',
  account: 'user',
};

const relatedLinks: {
  path: string;
  labelKey: string;
  descKey: string;
}[] = [
  {
    path: '/seller-guidelines',
    labelKey: 'faq_page.links.seller_guidelines_label',
    descKey: 'faq_page.links.seller_guidelines_desc',
  },
  {
    path: '/return-policy',
    labelKey: 'faq_page.links.return_policy_label',
    descKey: 'faq_page.links.return_policy_desc',
  },
  {
    path: '/pricing',
    labelKey: 'faq_page.links.pricing_label',
    descKey: 'faq_page.links.pricing_desc',
  },
];

function CategoryIcon({
  name,
  color,
  size = 18,
}: {
  name: FeatherName;
  color: string;
  size?: number;
}) {
  return <Feather name={name} color={color} size={size} />;
}

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between bg-white px-5 py-4 dark:bg-slate-800">
        <Text className="min-w-0 flex-1 pr-4 font-sans text-sm font-medium leading-6 text-gray-800 dark:text-slate-100 sm:text-base">
          {question}
        </Text>
        <Feather
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          color="#94a3b8"
          size={20}
        />
      </Pressable>
      {isOpen ? (
        <View className="border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
          <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
            {answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function FaqNative() {
  const { t } = useAppTranslation();
  const href = useLocalizedHref();
  const [activeCategory, setActiveCategory] = useState<CategoryId>('general');
  const [openItem, setOpenItem] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const categories = useMemo(
    () =>
      categoryIds.map((id) => ({
        id,
        label: t(`faq_page.categories.${id}`),
        icon: categoryIcons[id],
        count: categoryFaqCounts[id],
      })),
    [t]
  );

  const allFaqs = useMemo(
    () =>
      categoryIds.flatMap((category) =>
        Array.from({ length: categoryFaqCounts[category] }, (_, index) => ({
          category,
          q: t(`faq_page.${category}.q_${index}`),
          a: t(`faq_page.${category}.a_${index}`),
        }))
      ),
    [t]
  );

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (query) {
      return allFaqs.filter(
        (faq) =>
          faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query)
      );
    }

    return allFaqs.filter((faq) => faq.category === activeCategory);
  }, [activeCategory, allFaqs, search]);

  const activeCategoryData = categories.find((category) => category.id === activeCategory);
  const isSearching = search.trim().length > 0;

  const handleSearch = (value: string) => {
    setSearch(value);
    setOpenItem(null);
  };

  const handleCategory = (id: CategoryId) => {
    setActiveCategory(id);
    setSearch('');
    setOpenItem(null);
  };

  const questionCountLabel = (count: number) =>
    `${count} ${count === 1 ? t('faq_page.list.question') : t('faq_page.list.questions')}`;

  const resultsLabel = (count: number) =>
    `${count} ${
      count === 1 ? t('faq_page.list.results_for') : t('faq_page.list.results_for_pl')
    } "${search}"`;

  return (
    <AppLayout>
      <View className="bg-green-700">
        <View className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <View className="max-w-2xl">
            <Text className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-green-200">
              {t('faq_page.hero.label')}
            </Text>
            <Text className="font-sans text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {t('faq_page.hero.title')}
            </Text>
            <Text className="mt-4 max-w-xl font-sans text-base leading-7 text-green-100 sm:text-lg">
              {t('faq_page.hero.desc')}
            </Text>

            <View className={Platform.OS === 'web' ? 'mt-8 max-w-lg flex-row items-center rounded-xl border border-white/30 bg-white/15 px-4 py-3' : 'mt-6 max-w-lg flex-row items-center rounded-xl border border-white/30 bg-white/15 px-4 py-3'}>
              <Feather name="search" color="#86efac" size={20} />
              <TextInput
                value={search}
                onChangeText={handleSearch}
                placeholder={t('faq_page.hero.search_placeholder')}
                placeholderTextColor="#bbf7d0"
                className="ml-3 min-w-0 flex-1 font-sans text-sm text-white"
                selectionColor="#ffffff"
              />
            </View>
          </View>
        </View>
      </View>

      <View className="bg-gray-50 px-4 py-10 dark:bg-slate-950 sm:px-6 sm:py-14 lg:px-8">
        <View className="mx-auto w-full max-w-7xl gap-8 lg:flex-row lg:gap-12">
          <View className="hidden w-52 shrink-0 lg:block">
            <View className="sticky top-24">
              <Text className="mb-3 px-2 font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                {t('faq_page.sidebar.categories_label')}
              </Text>
              <View className="gap-1">
                {categories.map(({ id, label, icon, count }) => {
                  const active = !isSearching && activeCategory === id;

                  return (
                    <Pressable
                      key={id}
                      onPress={() => handleCategory(id)}
                      className={`flex-row items-center justify-between rounded-lg px-3 py-2 ${
                        active ? 'bg-green-50 dark:bg-green-900/30' : ''
                      }`}>
                      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                        <CategoryIcon
                          name={icon}
                          color={active ? '#15803d' : '#64748b'}
                          size={16}
                        />
                        <Text
                          className={`min-w-0 flex-1 font-sans text-sm ${
                            active
                              ? 'font-medium text-green-700 dark:text-green-400'
                              : 'text-gray-600 dark:text-slate-400'
                          }`}>
                          {label}
                        </Text>
                      </View>
                      <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                        {count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="mt-8 rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <Text className="mb-1 font-sans text-xs font-semibold text-green-800 dark:text-green-300">
                  {t('faq_page.sidebar.need_help_title')}
                </Text>
                <Text className="mb-3 font-sans text-xs leading-5 text-green-700 dark:text-green-400">
                  {t('faq_page.sidebar.need_help_desc')}
                </Text>
                <Link href={href('/contact')} asChild>
                  <Pressable>
                    <Text className="font-sans text-xs font-medium text-green-700 underline dark:text-green-400">
                      {t('faq_page.sidebar.contact_support')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>

          <View className="lg:hidden">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2 pb-2">
                {categories.map(({ id, label, icon }) => {
                  const active = !isSearching && activeCategory === id;

                  return (
                    <Pressable
                      key={id}
                      onPress={() => handleCategory(id)}
                      className={`shrink-0 flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                        active
                          ? 'border-green-600 bg-green-600'
                          : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                      }`}>
                      <CategoryIcon
                        name={icon}
                        color={active ? '#ffffff' : '#64748b'}
                        size={14}
                      />
                      <Text
                        className={`font-sans text-xs font-medium ${
                          active ? 'text-white' : 'text-gray-600 dark:text-slate-400'
                        }`}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View className="min-w-0 flex-1">
            {!isSearching && activeCategoryData ? (
              <View className="mb-6 flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CategoryIcon name={activeCategoryData.icon} color="#15803d" size={20} />
                </View>
                <View>
                  <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
                    {activeCategoryData.label}
                  </Text>
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                    {questionCountLabel(filteredFaqs.length)}
                  </Text>
                </View>
              </View>
            ) : null}

            {isSearching ? (
              <View className="mb-5 flex-row items-center justify-between gap-4">
                <Text className="min-w-0 flex-1 font-sans text-sm text-gray-600 dark:text-slate-400">
                  {filteredFaqs.length === 0
                    ? t('faq_page.list.no_results')
                    : resultsLabel(filteredFaqs.length)}
                </Text>
                <Pressable onPress={() => handleSearch('')}>
                  <Text className="font-sans text-xs text-green-600 dark:text-green-400">
                    {t('faq_page.list.clear_search')}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {filteredFaqs.length > 0 ? (
              <View className="gap-2">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem
                    key={`${faq.category}-${index}`}
                    question={faq.q}
                    answer={faq.a}
                    isOpen={openItem === index}
                    onToggle={() => setOpenItem(openItem === index ? null : index)}
                  />
                ))}
              </View>
            ) : (
              <View className="items-center py-16">
                <Feather name="help-circle" color="#cbd5e1" size={48} />
                <Text className="mt-4 font-sans font-medium text-gray-500 dark:text-slate-400">
                  {t('faq_page.list.no_questions')}
                </Text>
                <Text className="mt-1 text-center font-sans text-sm text-gray-400 dark:text-slate-500">
                  {t('faq_page.list.no_questions_sub')}
                </Text>
              </View>
            )}

            <View className="mt-12 rounded-xl bg-green-600 p-8">
              <View className="gap-6 sm:flex-row sm:items-center">
                <Feather name="message-circle" color="#bbf7d0" size={40} />
                <View className="min-w-0 flex-1">
                  <Text className="mb-1 font-sans text-lg font-bold text-white">
                    {t('faq_page.cta.title')}
                  </Text>
                  <Text className="font-sans text-sm leading-6 text-green-100">
                    {t('faq_page.cta.desc')}
                  </Text>
                </View>
                <View className="gap-3 sm:flex-row">
                  <Link href={href('/contact')} asChild>
                    <Pressable className="flex-row items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5">
                      <Text className="font-sans text-sm font-semibold text-green-700">
                        {t('faq_page.cta.contact_us')}
                      </Text>
                      <Feather name="arrow-right" color="#15803d" size={16} />
                    </Pressable>
                  </Link>
                  <Link href={href('/help')} asChild>
                    <Pressable className="flex-row items-center justify-center gap-2 rounded-lg border border-green-300 px-5 py-2.5">
                      <Text className="font-sans text-sm font-medium text-white">
                        {t('faq_page.cta.help_center')}
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </View>

            <View className="mt-8 gap-4 sm:flex-row">
              {relatedLinks.map(({ path, labelKey, descKey }) => (
                <Link key={path} href={href(path)} asChild>
                  <Pressable className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {t(labelKey)}
                    </Text>
                    <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                      {t(descKey)}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>

            <View className="mt-10 flex-row flex-wrap justify-center pb-2">
              <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                {t('faq_page.footer')}
              </Text>
              <Link href={href('/contact')} asChild>
                <Pressable>
                  <Text className="font-sans text-xs text-green-600 dark:text-green-400">
                    {t('faq_page.footer_suggest')}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
