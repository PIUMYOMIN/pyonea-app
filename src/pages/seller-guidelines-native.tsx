import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useAppTranslation } from '@/i18n';

type IconName = keyof typeof Feather.glyphMap;

const sections: { id: string; key: string; icon: IconName }[] = [
  { id: 'eligibility', key: 'eligibility', icon: 'shield' },
  { id: 'products', key: 'products', icon: 'package' },
  { id: 'pricing', key: 'pricing', icon: 'dollar-sign' },
  { id: 'shipping', key: 'shipping', icon: 'truck' },
  { id: 'communication', key: 'communication', icon: 'message-circle' },
  { id: 'documents', key: 'documents', icon: 'file-text' },
  { id: 'prohibited', key: 'prohibited', icon: 'alert-triangle' },
  { id: 'performance', key: 'performance', icon: 'star' },
];

const faqKeys = ['0', '1', '2', '3', '4', '5'];

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-6 flex-row items-start gap-4">
      <View className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
        <Feather name={icon} color="#15803d" size={20} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100 sm:text-2xl">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 font-sans text-sm leading-5 text-gray-500 dark:text-slate-400">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ContentCard({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <View
      className={`rounded-xl border bg-white p-6 shadow-sm shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-950/40 sm:p-8 ${
        danger ? 'border-red-100 dark:border-red-900/50' : 'border-gray-200 dark:border-slate-700'
      }`}>
      {children}
    </View>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-start gap-3">
      <Feather name="check-circle" color="#22c55e" size={18} style={{ marginTop: 2 }} />
      <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
        {children}
      </Text>
    </View>
  );
}

function XItem({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-start gap-2.5">
      <Feather name="x-circle" color="#f87171" size={17} style={{ marginTop: 2 }} />
      <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
        {children}
      </Text>
    </View>
  );
}

function InfoBox({
  tone,
  label,
  children,
}: {
  tone: 'blue' | 'amber' | 'green' | 'gray';
  label: string;
  children: React.ReactNode;
}) {
  const classes = {
    blue: 'border-blue-100 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
    amber:
      'border-amber-100 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300',
    green:
      'border-green-100 bg-green-50 dark:border-green-800 dark:bg-green-900/20 text-green-800 dark:text-green-300',
    gray: 'border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300',
  };

  return (
    <View className={`rounded-lg border p-4 ${classes[tone]}`}>
      <Text className="font-sans text-sm leading-6">
        <Text className="font-semibold">{label}</Text> {children}
      </Text>
    </View>
  );
}

function AccordionItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between gap-4 bg-white px-5 py-4 dark:bg-slate-800">
        <Text className="min-w-0 flex-1 font-sans text-sm font-medium text-gray-800 dark:text-slate-100">
          {question}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} color="#9ca3af" size={20} />
      </Pressable>
      {open ? (
        <View className="border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
          <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
            {answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function SellerGuidelinesNative() {
  const { t } = useAppTranslation();
  const [activeSection, setActiveSection] = useState('eligibility');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const eligibilityRequirements = [0, 1, 2, 3, 4].map((index) =>
    t(`seller_guidelines.eligibility.req_${index}`)
  );
  const productDos = [0, 1, 2, 3, 4, 5].map((index) =>
    t(`seller_guidelines.products.do_${index}`)
  );
  const productDonts = [0, 1, 2, 3, 4, 5].map((index) =>
    t(`seller_guidelines.products.dont_${index}`)
  );
  const shippingRules = [0, 1, 2, 3, 4, 5].map((index) =>
    t(`seller_guidelines.shipping.rule_${index}`)
  );
  const prohibitedCategories = [0, 1, 2, 3, 4, 5, 6, 7].map((index) => ({
    name: t(`seller_guidelines.prohibited.item_${index}_name`),
    detail: t(`seller_guidelines.prohibited.item_${index}_detail`),
  }));
  const documents = [0, 1, 2, 3, 4, 5].map((index) => ({
    title: t(`seller_guidelines.documents.doc_${index}_title`),
    detail: t(`seller_guidelines.documents.doc_${index}_detail`),
    required: index < 4,
  }));
  const performanceMetrics = [0, 1, 2, 3, 4].map((index) => ({
    label: t(`seller_guidelines.performance.metric_${index}_label`),
    target: t(`seller_guidelines.performance.metric_${index}_target`),
    description: t(`seller_guidelines.performance.metric_${index}_description`),
  }));
  const fees = [
    {
      plan: t('seller_guidelines.pricing.plan_basic'),
      listing: t('seller_guidelines.pricing.listings_basic'),
      commission: t('seller_guidelines.pricing.commission_basic'),
      monthly: t('seller_guidelines.pricing.monthly_basic'),
      badge: '',
    },
    {
      plan: t('seller_guidelines.pricing.plan_professional'),
      listing: t('seller_guidelines.pricing.listings_professional'),
      commission: t('seller_guidelines.pricing.commission_professional'),
      monthly: t('seller_guidelines.pricing.monthly_professional'),
      badge: t('seller_guidelines.pricing.badge_popular'),
    },
    {
      plan: t('seller_guidelines.pricing.plan_enterprise'),
      listing: t('seller_guidelines.pricing.listings_enterprise'),
      commission: t('seller_guidelines.pricing.commission_enterprise'),
      monthly: t('seller_guidelines.pricing.monthly_enterprise'),
      badge: '',
    },
  ];
  const communicationCards = [
    {
      label: t('seller_guidelines.communication.card_first_response_label'),
      value: t('seller_guidelines.communication.card_first_response_value'),
      bg: 'border-green-100 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      valueText: 'text-green-800 dark:text-green-200',
    },
    {
      label: t('seller_guidelines.communication.card_order_updates_label'),
      value: t('seller_guidelines.communication.card_order_updates_value'),
      bg: 'border-blue-100 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-300',
      valueText: 'text-blue-800 dark:text-blue-200',
    },
    {
      label: t('seller_guidelines.communication.card_dispute_reply_label'),
      value: t('seller_guidelines.communication.card_dispute_reply_value'),
      bg: 'border-amber-100 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      valueText: 'text-amber-800 dark:text-amber-200',
    },
  ];

  return (
    <AppLayout>
      <View className="bg-gray-50 dark:bg-slate-950">
        <View className="bg-green-700">
          <View className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <View className="max-w-3xl">
              <Text className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-green-200">
                {t('seller_guidelines.hero.for_sellers')}
              </Text>
              <Text className="font-sans text-3xl font-bold leading-tight text-white sm:text-5xl">
                {t('seller_guidelines.hero.title')}
              </Text>
              <Text className="mt-4 max-w-2xl font-sans text-base leading-7 text-green-100 sm:text-lg">
                {t('seller_guidelines.hero.subtitle')}
              </Text>
              <View className="mt-8 flex-row flex-wrap gap-3">
                <Link href="/register" asChild>
                  <Pressable className="flex-row items-center gap-2 rounded-lg bg-white px-5 py-2.5">
                    <Text className="font-sans text-sm font-semibold text-green-700">
                      {t('seller_guidelines.hero.become_seller')}
                    </Text>
                    <Feather name="arrow-right" color="#15803d" size={16} />
                  </Pressable>
                </Link>
                <Pressable
                  onPress={() => setActiveSection('eligibility')}
                  className="rounded-lg border border-green-400 px-5 py-2.5">
                  <Text className="font-sans text-sm font-medium text-white">
                    {t('seller_guidelines.hero.read_guidelines')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <View className="gap-8 lg:flex-row lg:gap-12">
            <View className="lg:w-56 lg:flex-shrink-0">
              <View className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 lg:sticky lg:top-24">
                <Text className="mb-3 px-2 font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                  {t('seller_guidelines.sidebar.contents')}
                </Text>
                <View className="gap-1">
                  {sections.map((section) => {
                    const active = activeSection === section.id;
                    return (
                      <Pressable
                        key={section.id}
                        onPress={() => setActiveSection(section.id)}
                        className={`flex-row items-center gap-2.5 rounded-lg px-3 py-2 ${
                          active ? 'bg-green-50 dark:bg-green-900/30' : ''
                        }`}>
                        <Feather
                          name={section.icon}
                          color={active ? '#15803d' : '#94a3b8'}
                          size={16}
                        />
                        <Text
                          className={`min-w-0 flex-1 font-sans text-sm ${
                            active
                              ? 'font-medium text-green-700 dark:text-green-300'
                              : 'text-gray-600 dark:text-slate-400'
                          }`}>
                          {t(`seller_guidelines.sections.${section.key}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-6 rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <Text className="font-sans text-xs font-semibold text-green-800 dark:text-green-300">
                    {t('seller_guidelines.sidebar.need_help')}
                  </Text>
                  <Text className="mt-1 font-sans text-xs leading-5 text-green-700 dark:text-green-400">
                    {t('seller_guidelines.sidebar.support_hours')}
                  </Text>
                  <Link href="/contact" asChild>
                    <Text className="mt-3 font-sans text-xs font-medium text-green-700 underline dark:text-green-400">
                      {t('seller_guidelines.sidebar.contact_support')}
                    </Text>
                  </Link>
                </View>
              </View>
            </View>

            <View className="min-w-0 flex-1 gap-12">
              <ContentCard>
                <SectionHeader
                  icon="shield"
                  title={t('seller_guidelines.eligibility.title')}
                  subtitle={t('seller_guidelines.eligibility.subtitle')}
                />
                <View className="gap-3">
                  {eligibilityRequirements.map((item) => (
                    <CheckItem key={item}>{item}</CheckItem>
                  ))}
                </View>
                <View className="mt-6">
                  <InfoBox tone="blue" label={t('seller_guidelines.eligibility.note_label')}>
                    {t('seller_guidelines.eligibility.note_text')}
                  </InfoBox>
                </View>
              </ContentCard>

              <ContentCard>
                <SectionHeader
                  icon="package"
                  title={t('seller_guidelines.products.title')}
                  subtitle={t('seller_guidelines.products.subtitle')}
                />
                <View className="gap-6 sm:flex-row">
                  <View className="flex-1">
                    <View className="mb-3 flex-row items-center gap-1.5">
                      <Feather name="check-circle" color="#15803d" size={16} />
                      <Text className="font-sans text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                        {t('seller_guidelines.products.required_heading')}
                      </Text>
                    </View>
                    <View className="gap-2.5">
                      {productDos.map((item) => (
                        <CheckItem key={item}>{item}</CheckItem>
                      ))}
                    </View>
                  </View>
                  <View className="flex-1">
                    <View className="mb-3 flex-row items-center gap-1.5">
                      <Feather name="x-circle" color="#dc2626" size={16} />
                      <Text className="font-sans text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                        {t('seller_guidelines.products.not_allowed_heading')}
                      </Text>
                    </View>
                    <View className="gap-2.5">
                      {productDonts.map((item) => (
                        <XItem key={item}>{item}</XItem>
                      ))}
                    </View>
                  </View>
                </View>
              </ContentCard>

              <ContentCard>
                <SectionHeader
                  icon="dollar-sign"
                  title={t('seller_guidelines.pricing.title')}
                  subtitle={t('seller_guidelines.pricing.subtitle')}
                />
                <View className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                  <View className="hidden border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70 sm:flex-row">
                    {[
                      t('seller_guidelines.pricing.col_plan'),
                      t('seller_guidelines.pricing.col_monthly'),
                      t('seller_guidelines.pricing.col_commission'),
                      t('seller_guidelines.pricing.col_listings'),
                    ].map((heading) => (
                      <Text
                        key={heading}
                        className="flex-1 font-sans text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                        {heading}
                      </Text>
                    ))}
                  </View>
                  {fees.map((fee) => (
                    <View
                      key={fee.plan}
                      className={`gap-2 border-b border-gray-100 p-4 last:border-b-0 dark:border-slate-700 sm:flex-row sm:items-center ${
                        fee.badge ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-slate-800'
                      }`}>
                      <View className="flex-1 flex-row flex-wrap items-center gap-2">
                        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {fee.plan}
                        </Text>
                        {fee.badge ? (
                          <View className="rounded bg-green-600 px-1.5 py-0.5">
                            <Text className="font-sans text-[10px] font-bold uppercase text-white">
                              {fee.badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="flex-1 font-sans text-sm text-gray-700 dark:text-slate-300">
                        {fee.monthly}
                      </Text>
                      <Text className="flex-1 font-sans text-sm text-gray-700 dark:text-slate-300">
                        {fee.commission}
                      </Text>
                      <Text className="flex-1 font-sans text-sm text-gray-700 dark:text-slate-300">
                        {fee.listing}
                      </Text>
                    </View>
                  ))}
                </View>
                <View className="mt-4 flex-row flex-wrap">
                  <Text className="font-sans text-xs leading-5 text-gray-500 dark:text-slate-500">
                    {t('seller_guidelines.pricing.footnote')}{' '}
                  </Text>
                  <Link href="/pricing" asChild>
                    <Text className="font-sans text-xs leading-5 text-green-600 underline dark:text-green-400">
                      {t('seller_guidelines.pricing.view_full_pricing')}
                    </Text>
                  </Link>
                </View>
                <View className="mt-5">
                  <InfoBox tone="amber" label={t('seller_guidelines.pricing.payment_policy_label')}>
                    {t('seller_guidelines.pricing.payment_policy_text')}
                  </InfoBox>
                </View>
              </ContentCard>

              <ContentCard>
                <SectionHeader
                  icon="truck"
                  title={t('seller_guidelines.shipping.title')}
                  subtitle={t('seller_guidelines.shipping.subtitle')}
                />
                <View className="gap-3">
                  {shippingRules.map((rule, index) => (
                    <View key={rule} className="flex-row items-start gap-3">
                      <View className="h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-400">
                          {index + 1}
                        </Text>
                      </View>
                      <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
                        {rule}
                      </Text>
                    </View>
                  ))}
                </View>
              </ContentCard>

              <ContentCard>
                <SectionHeader
                  icon="message-circle"
                  title={t('seller_guidelines.communication.title')}
                  subtitle={t('seller_guidelines.communication.subtitle')}
                />
                <Text className="font-sans text-sm leading-7 text-gray-700 dark:text-slate-300">
                  {t('seller_guidelines.communication.para1')}
                </Text>
                <View className="mt-4 gap-4 sm:flex-row">
                  {communicationCards.map((card) => (
                    <View key={card.label} className={`flex-1 rounded-lg border p-4 ${card.bg}`}>
                      <Text className={`font-sans text-xs font-semibold uppercase tracking-wide ${card.text}`}>
                        {card.label}
                      </Text>
                      <Text className={`mt-1 font-sans text-lg font-bold ${card.valueText}`}>
                        {card.value}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="mt-4 font-sans text-sm leading-7 text-gray-700 dark:text-slate-300">
                  {t('seller_guidelines.communication.para2')}
                </Text>
              </ContentCard>

              <ContentCard>
                <SectionHeader
                  icon="file-text"
                  title={t('seller_guidelines.documents.title')}
                  subtitle={t('seller_guidelines.documents.subtitle')}
                />
                <View className="flex-row flex-wrap gap-4">
                  {documents.map((document) => (
                    <View
                      key={document.title}
                      className="w-full flex-row items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/50 sm:w-[48%]">
                      <Feather name="file-text" color="#94a3b8" size={20} style={{ marginTop: 2 }} />
                      <View className="min-w-0 flex-1">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="font-sans text-sm font-medium text-gray-800 dark:text-slate-100">
                            {document.title}
                          </Text>
                          <Text
                            className={`font-sans text-[10px] font-bold uppercase ${
                              document.required
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-400 dark:text-slate-500'
                            }`}>
                            {document.required
                              ? t('seller_guidelines.documents.required_label')
                              : t('seller_guidelines.documents.optional_label')}
                          </Text>
                        </View>
                        <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                          {document.detail}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ContentCard>

              <ContentCard danger>
                <SectionHeader
                  icon="alert-triangle"
                  title={t('seller_guidelines.prohibited.title')}
                  subtitle={t('seller_guidelines.prohibited.subtitle')}
                />
                <View className="flex-row flex-wrap gap-3">
                  {prohibitedCategories.map((item) => (
                    <View
                      key={item.name}
                      className="w-full flex-row items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-3.5 dark:border-red-800 dark:bg-red-900/20 sm:w-[48%]">
                      <Feather name="x-circle" color="#f87171" size={20} style={{ marginTop: 2 }} />
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans text-sm font-semibold text-red-800 dark:text-red-300">
                          {item.name}
                        </Text>
                        <Text className="mt-0.5 font-sans text-xs leading-5 text-red-600 dark:text-red-400">
                          {item.detail}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View className="mt-5 flex-row flex-wrap">
                  <Text className="font-sans text-xs leading-5 text-gray-500 dark:text-slate-500">
                    {t('seller_guidelines.prohibited.footnote')}{' '}
                  </Text>
                  <Link href="/contact" asChild>
                    <Text className="font-sans text-xs leading-5 text-green-600 underline dark:text-green-400">
                      {t('seller_guidelines.prohibited.contact_unsure')}
                    </Text>
                  </Link>
                </View>
              </ContentCard>

              <ContentCard>
                <SectionHeader
                  icon="star"
                  title={t('seller_guidelines.performance.title')}
                  subtitle={t('seller_guidelines.performance.subtitle')}
                />
                <View className="gap-3">
                  {performanceMetrics.map((metric) => (
                    <View
                      key={metric.label}
                      className="gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/50 sm:flex-row sm:items-center">
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {metric.label}
                        </Text>
                        <Text className="mt-0.5 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                          {metric.description}
                        </Text>
                      </View>
                      <View className="self-start rounded-full bg-green-100 px-3 py-1 dark:bg-green-900/30 sm:self-center">
                        <Text className="font-sans text-sm font-bold text-green-800 dark:text-green-300">
                          {metric.target}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/50">
                  <Text className="mb-1 font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {t('seller_guidelines.performance.consequence_title')}
                  </Text>
                  <View className="gap-1">
                    {[0, 1, 2].map((index) => (
                      <Text
                        key={index}
                        className="font-sans text-xs leading-5 text-gray-600 dark:text-slate-400">
                        {index + 1}. {t(`seller_guidelines.performance.consequence_${index}`)}
                      </Text>
                    ))}
                  </View>
                </View>
              </ContentCard>

              <View>
                <Text className="mb-5 font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                  {t('seller_guidelines.faqs.title')}
                </Text>
                <View className="gap-2">
                  {faqKeys.map((key, index) => (
                    <AccordionItem
                      key={key}
                      question={t(`seller_guidelines.faqs.q_${key}`)}
                      answer={t(`seller_guidelines.faqs.a_${key}`)}
                      open={openFaq === index}
                      onToggle={() => setOpenFaq(openFaq === index ? null : index)}
                    />
                  ))}
                </View>
              </View>

              <View className="items-center rounded-xl bg-green-600 p-8">
                <Text className="text-center font-sans text-2xl font-bold text-white">
                  {t('seller_guidelines.cta.title')}
                </Text>
                <Text className="mt-2 max-w-xl text-center font-sans text-sm leading-6 text-green-100">
                  {t('seller_guidelines.cta.subtitle')}
                </Text>
                <View className="mt-6 flex-row flex-wrap justify-center gap-3">
                  <Link href="/register" asChild>
                    <Pressable className="flex-row items-center gap-2 rounded-lg bg-white px-6 py-3">
                      <Text className="font-sans text-sm font-semibold text-green-700">
                        {t('seller_guidelines.cta.create_account')}
                      </Text>
                      <Feather name="arrow-right" color="#15803d" size={16} />
                    </Pressable>
                  </Link>
                  <Link href="/contact" asChild>
                    <Pressable className="rounded-lg border border-green-300 px-6 py-3">
                      <Text className="font-sans text-sm font-medium text-white">
                        {t('seller_guidelines.cta.talk_support')}
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              </View>

              <View className="mb-4 flex-row flex-wrap justify-center">
                <Text className="font-sans text-center text-xs text-gray-400 dark:text-slate-500">
                  {t('seller_guidelines.footer.last_updated')}{' '}
                </Text>
                <Link href="/contact" asChild>
                  <Text className="font-sans text-center text-xs text-green-600 dark:text-green-400">
                    {t('seller_guidelines.footer.contact_us')}
                  </Text>
                </Link>
              </View>
            </View>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
