import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { createElement, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { NativeSeo } from '@/components/SEO/native-seo';
import { mergeRouteLang, useAppTranslation, useLocalizedHref } from '@/i18n';

type Tone = 'blue' | 'green' | 'purple' | 'amber';

const toneClasses: Record<Tone, { bg: string; border: string; text: string; icon: string }> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-100 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: '#2563eb',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-100 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: '#16a34a',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-100 dark:border-purple-800',
    text: 'text-purple-800 dark:text-purple-200',
    icon: '#9333ea',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-100 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: '#d97706',
  },
};

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
      {children}
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
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
          <Text className="mt-1 font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function AccordionItem({
  question,
  answer,
  open,
  onPress,
}: {
  question: string;
  answer: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <View className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between gap-4 bg-white px-5 py-4 dark:bg-slate-800">
        <Text className="min-w-0 flex-1 font-sans text-sm font-semibold text-gray-800 dark:text-slate-100 sm:text-base">
          {question}
        </Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} color="#94a3b8" size={20} />
      </Pressable>
      {open ? (
        <View className="border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
          <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">{answer}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MethodCard({
  icon,
  name,
  desc,
  details,
  tone,
}: {
  icon: keyof typeof Feather.glyphMap;
  name: string;
  desc: string;
  details: string[];
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <View className={`w-full rounded-xl border p-5 sm:w-[48%] ${classes.bg} ${classes.border}`}>
      <View className="mb-3 flex-row items-center gap-3">
        <Feather name={icon} color={classes.icon} size={24} />
        <Text className={`min-w-0 flex-1 font-sans text-sm font-semibold ${classes.text}`}>
          {name}
        </Text>
      </View>
      <Text className="mb-3 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
        {desc}
      </Text>
      <View className="gap-2">
        {details.map((detail) => (
          <View key={detail} className="flex-row items-start gap-2">
            <Feather name="check-circle" color="#22c55e" size={14} />
            <Text className="min-w-0 flex-1 font-sans text-xs leading-5 text-gray-600 dark:text-slate-400">
              {detail}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type DeliveryZoneRow = {
  zone: string;
  areas: string;
  standard: string;
  express: string;
  freight: string;
};

function DeliveryZonesTable({
  zones,
  notAvailable,
  labels,
}: {
  zones: DeliveryZoneRow[];
  notAvailable: string;
  labels: {
    zone: string;
    areas: string;
    standard: string;
    express: string;
    freight: string;
  };
}) {
  if (Platform.OS === 'web') {
    return createElement(
      'div',
      { className: 'overflow-x-auto -mx-2 px-2' },
      createElement(
        'table',
        { className: 'w-full text-sm' },
        createElement(
          'thead',
          null,
          createElement(
            'tr',
            { className: 'border-b border-gray-200 dark:border-slate-600' },
            [
              ['zone', 'min-w-[140px]'],
              ['areas', 'min-w-[180px]'],
              ['standard', ''],
              ['express', ''],
              ['freight', ''],
            ].map(([key, widthClass]) =>
              createElement(
                'th',
                {
                  key,
                  className: `py-3 pr-4 text-left font-semibold text-gray-700 dark:text-slate-300 ${widthClass}`,
                },
                labels[key as keyof typeof labels],
              ),
            ),
          ),
        ),
        createElement(
          'tbody',
          { className: 'divide-y divide-gray-100 dark:divide-slate-700' },
          ...zones.map((row) =>
            createElement(
              'tr',
              {
                key: row.zone,
                className: 'transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30',
              },
              createElement(
                'td',
                { className: 'py-3 pr-4 font-medium text-gray-900 dark:text-slate-100' },
                row.zone,
              ),
              createElement(
                'td',
                { className: 'py-3 pr-4 text-xs text-gray-500 dark:text-slate-400' },
                row.areas,
              ),
              createElement(
                'td',
                { className: 'py-3 pr-4' },
                createElement(
                  'span',
                  {
                    className:
                      'inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400',
                  },
                  createElement(
                    'svg',
                    {
                      xmlns: 'http://www.w3.org/2000/svg',
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      strokeWidth: 1.5,
                      stroke: 'currentColor',
                      className: 'h-3.5 w-3.5',
                    },
                    createElement('path', {
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      d: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
                    }),
                  ),
                  row.standard,
                ),
              ),
              createElement(
                'td',
                { className: 'py-3 pr-4' },
                row.express === notAvailable
                  ? createElement(
                      'span',
                      {
                        className:
                          'inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500',
                      },
                      createElement(
                        'svg',
                        {
                          xmlns: 'http://www.w3.org/2000/svg',
                          fill: 'none',
                          viewBox: '0 0 24 24',
                          strokeWidth: 1.5,
                          stroke: 'currentColor',
                          className: 'h-3.5 w-3.5',
                        },
                        createElement('path', {
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                          d: 'm9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
                        }),
                      ),
                      notAvailable,
                    )
                  : createElement(
                      'span',
                      {
                        className:
                          'inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400',
                      },
                      createElement(
                        'svg',
                        {
                          xmlns: 'http://www.w3.org/2000/svg',
                          fill: 'none',
                          viewBox: '0 0 24 24',
                          strokeWidth: 1.5,
                          stroke: 'currentColor',
                          className: 'h-3.5 w-3.5',
                        },
                        createElement('path', {
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                          d: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
                        }),
                      ),
                      row.express,
                    ),
              ),
              createElement(
                'td',
                { className: 'py-3 text-xs text-gray-500 dark:text-slate-400' },
                row.freight,
              ),
            ),
          ),
        ),
      ),
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator className="-mx-2 px-2">
      <View className="min-w-[720px]">
        <View className="flex-row border-b border-gray-200 pb-3 dark:border-slate-600">
          <Text className="w-36 pr-4 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {labels.zone}
          </Text>
          <Text className="w-44 pr-4 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {labels.areas}
          </Text>
          <Text className="w-28 pr-4 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {labels.standard}
          </Text>
          <Text className="w-28 pr-4 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {labels.express}
          </Text>
          <Text className="w-28 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {labels.freight}
          </Text>
        </View>
        {zones.map((row) => {
          const expressAvailable = row.express !== notAvailable;
          return (
            <View
              key={row.zone}
              className="flex-row border-b border-gray-100 py-3 dark:border-slate-700">
              <Text className="w-36 pr-4 font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                {row.zone}
              </Text>
              <Text className="w-44 pr-4 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                {row.areas}
              </Text>
              <View className="w-28 flex-row items-start gap-1 pr-4">
                <Feather name="check-circle" color="#15803d" size={14} />
                <Text className="min-w-0 flex-1 font-sans text-xs font-medium text-green-700 dark:text-green-400">
                  {row.standard}
                </Text>
              </View>
              <View className="w-28 flex-row items-start gap-1 pr-4">
                <Feather
                  name={expressAvailable ? 'check-circle' : 'x-circle'}
                  color={expressAvailable ? '#2563eb' : '#94a3b8'}
                  size={14}
                />
                <Text
                  className={`min-w-0 flex-1 font-sans text-xs ${
                    expressAvailable
                      ? 'font-medium text-blue-700 dark:text-blue-400'
                      : 'text-gray-400 dark:text-slate-500'
                  }`}>
                  {row.express}
                </Text>
              </View>
              <Text className="w-28 font-sans text-xs text-gray-500 dark:text-slate-400">{row.freight}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function ShippingNative() {
  const { t, language } = useAppTranslation();
  const href = useLocalizedHref();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const seoUrl = mergeRouteLang('/shipping', {}, language);

  const shippingMethods = [
    {
      icon: 'truck' as const,
      name: t('shipping_page.methods.standard_name'),
      desc: t('shipping_page.methods.standard_desc'),
      details: [
        t('shipping_page.methods.standard_d0'),
        t('shipping_page.methods.standard_d1'),
        t('shipping_page.methods.standard_d2'),
      ],
      tone: 'blue' as const,
    },
    {
      icon: 'clock' as const,
      name: t('shipping_page.methods.express_name'),
      desc: t('shipping_page.methods.express_desc'),
      details: [
        t('shipping_page.methods.express_d0'),
        t('shipping_page.methods.express_d1'),
        t('shipping_page.methods.express_d2'),
      ],
      tone: 'green' as const,
    },
    {
      icon: 'package' as const,
      name: t('shipping_page.methods.freight_name'),
      desc: t('shipping_page.methods.freight_desc'),
      details: [
        t('shipping_page.methods.freight_d0'),
        t('shipping_page.methods.freight_d1'),
        t('shipping_page.methods.freight_d2'),
      ],
      tone: 'purple' as const,
    },
    {
      icon: 'globe' as const,
      name: t('shipping_page.methods.intl_name'),
      desc: t('shipping_page.methods.intl_desc'),
      details: [
        t('shipping_page.methods.intl_d0'),
        t('shipping_page.methods.intl_d1'),
        t('shipping_page.methods.intl_d2'),
      ],
      tone: 'amber' as const,
    },
  ];

  const stats = [
    {
      label: t('shipping_page.stats.handling_label'),
      value: t('shipping_page.stats.handling_value'),
      sub: t('shipping_page.stats.handling_sub'),
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: t('shipping_page.stats.tracking_label'),
      value: t('shipping_page.stats.tracking_value'),
      sub: t('shipping_page.stats.tracking_sub'),
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: t('shipping_page.stats.coverage_label'),
      value: t('shipping_page.stats.coverage_value'),
      sub: t('shipping_page.stats.coverage_sub'),
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: t('shipping_page.stats.dispute_label'),
      value: t('shipping_page.stats.dispute_value'),
      sub: t('shipping_page.stats.dispute_sub'),
      color: 'text-amber-600 dark:text-amber-400',
    },
  ];

  const zones = [0, 1, 2, 3, 4].map((index) => ({
    zone: t(`shipping_page.zones.zone_${index}_zone`),
    areas: t(`shipping_page.zones.zone_${index}_areas`),
    standard: t(`shipping_page.zones.zone_${index}_standard`),
    express: t(`shipping_page.zones.zone_${index}_express`),
    freight: t(`shipping_page.zones.zone_${index}_freight`),
  }));

  const handlingCards = [
    {
      label: t('shipping_page.handling.standard_label'),
      value: t('shipping_page.handling.standard_value'),
      desc: t('shipping_page.handling.standard_desc'),
      tone: 'green' as const,
    },
    {
      label: t('shipping_page.handling.express_label'),
      value: t('shipping_page.handling.express_value'),
      desc: t('shipping_page.handling.express_desc'),
      tone: 'blue' as const,
    },
    {
      label: t('shipping_page.handling.bulk_label'),
      value: t('shipping_page.handling.bulk_value'),
      desc: t('shipping_page.handling.bulk_desc'),
      tone: 'purple' as const,
    },
  ];

  const packagingRules = [0, 1, 2, 3, 4, 5].map((index) =>
    t(`shipping_page.packaging.rule_${index}`)
  );
  const lostSteps = [0, 1, 2, 3].map((index) => ({
    step: t(`shipping_page.lost.step_${index}_step`),
    desc: t(`shipping_page.lost.step_${index}_desc`),
  }));
  const sellerItems = [0, 1, 2, 3, 4, 5, 6, 7].map((index) =>
    t(`shipping_page.seller_resp.item_${index}`)
  );
  const faqs = [0, 1, 2, 3, 4, 5].map((index) => ({
    q: t(`shipping_page.faq.q_${index}`),
    a: t(`shipping_page.faq.a_${index}`),
  }));
  const relatedLinks = [
    {
      label: t('shipping_page.links.return_policy_label'),
      href: href('/return-policy'),
      desc: t('shipping_page.links.return_policy_desc'),
    },
    {
      label: t('shipping_page.links.seller_guidelines_label'),
      href: href('/seller-guidelines'),
      desc: t('shipping_page.links.seller_guidelines_desc'),
    },
    {
      label: t('shipping_page.links.faq_label'),
      href: href('/faq'),
      desc: t('shipping_page.links.faq_desc'),
    },
  ];
  const notAvailable = t('shipping_page.zones.not_available');

  return (
    <>
      <NativeSeo
        title={t('seo.shipping.title')}
        description={t('seo.shipping.description')}
        url={seoUrl}
      />
      <AppLayout>
      <View className="bg-gray-50 dark:bg-slate-950">
        <View className="bg-green-700">
          <View className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <View className="max-w-3xl">
              <Text className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-green-200">
                {t('shipping_page.hero.label')}
              </Text>
              <Text className="font-sans text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                {t('shipping_page.hero.title')}
              </Text>
              <Text className="mt-4 max-w-2xl font-sans text-base leading-7 text-green-100 sm:text-lg">
                {t('shipping_page.hero.desc')}
              </Text>
              <View className={Platform.OS === 'web' ? 'mt-8 flex-row flex-wrap gap-3' : 'mt-6 flex-row flex-wrap gap-3'}>
                <Link href={href('/track-order')} asChild>
                  <Pressable className="flex-row items-center gap-2 rounded-lg bg-white px-5 py-2.5">
                    <Text className="font-sans text-sm font-semibold text-green-700">
                      {t('shipping_page.hero.track_order')}
                    </Text>
                    <Feather name="arrow-right" color="#15803d" size={16} />
                  </Pressable>
                </Link>
                <Link href={href('/contact')} asChild>
                  <Pressable className="rounded-lg border border-green-400 px-5 py-2.5">
                    <Text className="font-sans text-sm font-semibold text-white">
                      {t('shipping_page.hero.contact_support')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </View>

        <View className="mx-auto w-full max-w-7xl gap-12 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <View className="flex-row flex-wrap gap-4">
            {stats.map((stat) => (
              <View
                key={stat.label}
                className="w-[47%] flex-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:w-[23%]">
                <Text className={`text-center font-sans text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </Text>
                <Text className="mt-1 text-center font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">
                  {stat.label}
                </Text>
                <Text className="mt-0.5 text-center font-sans text-xs text-gray-500 dark:text-slate-400">
                  {stat.sub}
                </Text>
              </View>
            ))}
          </View>

          <SectionCard>
            <SectionHeader
              icon="truck"
              title={t('shipping_page.methods.title')}
              subtitle={t('shipping_page.methods.subtitle')}
            />
            <View className="flex-row flex-wrap gap-5">
              {shippingMethods.map((method) => (
                <MethodCard key={method.name} {...method} />
              ))}
            </View>
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon="map-pin"
              title={t('shipping_page.zones.title')}
              subtitle={t('shipping_page.zones.subtitle')}
            />
            <DeliveryZonesTable
              zones={zones}
              notAvailable={notAvailable}
              labels={{
                zone: t('shipping_page.zones.col_zone'),
                areas: t('shipping_page.zones.col_areas'),
                standard: t('shipping_page.zones.col_standard'),
                express: t('shipping_page.zones.col_express'),
                freight: t('shipping_page.zones.col_freight'),
              }}
            />
            <Text className="mt-4 font-sans text-xs leading-5 text-gray-500 dark:text-slate-500">
              {t('shipping_page.zones.footnote')}
            </Text>
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon="clock"
              title={t('shipping_page.handling.title')}
              subtitle={t('shipping_page.handling.subtitle')}
            />
            <View className="mb-6 gap-4 sm:flex-row">
              {handlingCards.map((card) => {
                const tone = toneClasses[card.tone];
                return (
                  <View key={card.label} className={`flex-1 rounded-xl border p-4 ${tone.bg} ${tone.border}`}>
                    <Text className="font-sans text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                      {card.label}
                    </Text>
                    <Text className={`mt-1 font-sans text-base font-bold ${tone.text}`}>{card.value}</Text>
                    <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                      {card.desc}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View className="rounded-lg border border-amber-100 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <Text className="font-sans text-sm leading-6 text-amber-800 dark:text-amber-300">
                <Text className="font-semibold">{t('shipping_page.handling.obligation_label')} </Text>
                {t('shipping_page.handling.obligation')}
              </Text>
            </View>
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon="package"
              title={t('shipping_page.packaging.title')}
              subtitle={t('shipping_page.packaging.subtitle')}
            />
            <View className="gap-3">
              {packagingRules.map((rule, index) => (
                <View key={rule} className="flex-row items-start gap-3">
                  <View className="h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-300">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
                    {rule}
                  </Text>
                </View>
              ))}
            </View>
            <View className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <Text className="font-sans text-sm leading-6 text-blue-800 dark:text-blue-300">
                <Text className="font-semibold">{t('shipping_page.packaging.buyer_note_label')} </Text>
                {t('shipping_page.packaging.buyer_note')}
              </Text>
            </View>
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon="alert-triangle"
              title={t('shipping_page.lost.title')}
              subtitle={t('shipping_page.lost.subtitle')}
            />
            <View className="mb-6 flex-row flex-wrap gap-4">
              {lostSteps.map((step, index) => (
                <View
                  key={step.step}
                  className="w-full flex-1 items-center rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/50 sm:w-[48%] lg:w-[23%]">
                  <View className="mb-3 h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="mb-1 text-center font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {step.step}
                  </Text>
                  <Text className="text-center font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                    {step.desc}
                  </Text>
                </View>
              ))}
            </View>
            <View className="gap-4 sm:flex-row">
              <EligibilityBox
                positive
                title={t('shipping_page.lost.eligible_title')}
                items={[0, 1, 2, 3].map((index) => t(`shipping_page.lost.eligible_${index}`))}
              />
              <EligibilityBox
                title={t('shipping_page.lost.not_eligible_title')}
                items={[0, 1, 2, 3].map((index) => t(`shipping_page.lost.not_eligible_${index}`))}
              />
            </View>
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon="shield"
              title={t('shipping_page.seller_resp.title')}
              subtitle={t('shipping_page.seller_resp.subtitle')}
            />
            <View className="flex-row flex-wrap gap-3">
              {sellerItems.map((item) => (
                <View
                  key={item}
                  className="w-full flex-row items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-600 dark:bg-slate-700/50 sm:w-[48%]">
                  <Feather name="check-circle" color="#22c55e" size={16} />
                  <Text className="min-w-0 flex-1 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>

          <View>
            <Text className="mb-5 font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
              {t('shipping_page.faq.title')}
            </Text>
            <View className="gap-2">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.q}
                  question={faq.q}
                  answer={faq.a}
                  open={openFaq === index}
                  onPress={() => setOpenFaq(openFaq === index ? null : index)}
                />
              ))}
            </View>
          </View>

          <View className="rounded-xl bg-green-700 p-8">
            <View className="gap-6 sm:flex-row sm:items-center">
              <Feather name="truck" color="#bbf7d0" size={40} />
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-lg font-bold text-white">{t('shipping_page.cta.title')}</Text>
                <Text className="mt-1 font-sans text-sm leading-6 text-green-100">
                  {t('shipping_page.cta.desc')}
                </Text>
              </View>
              <View className="gap-3 sm:flex-row">
                <Link href={href('/contact')} asChild>
                  <Pressable className="flex-row items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5">
                    <Text className="font-sans text-sm font-semibold text-green-700">
                      {t('shipping_page.cta.contact_support')}
                    </Text>
                    <Feather name="arrow-right" color="#15803d" size={16} />
                  </Pressable>
                </Link>
                <Link href={href('/track-order')} asChild>
                  <Pressable className="items-center rounded-lg border border-green-300 px-5 py-2.5">
                    <Text className="font-sans text-sm font-semibold text-white">
                      {t('shipping_page.cta.track_order')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>

          <View className="gap-4 sm:flex-row">
            {relatedLinks.map((link) => (
              <Link key={String(link.href)} href={link.href} asChild>
                <Pressable className="flex-1 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {link.label}
                  </Text>
                  <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                    {link.desc}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>

          <View className="items-center pb-2">
            <Text className="text-center font-sans text-xs text-gray-400 dark:text-slate-500">
              {t('shipping_page.footer')}
            </Text>
            <Link href={href('/contact')} asChild>
              <Pressable>
                <Text className="font-sans text-xs font-semibold text-green-600 dark:text-green-400">
                  {t('shipping_page.footer_contact')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </AppLayout>
    </>
  );
}

function EligibilityBox({
  title,
  items,
  positive,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-lg border p-4 ${
        positive
          ? 'border-green-100 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-red-100 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      }`}>
      <View className="mb-2 flex-row items-center gap-2">
        <Feather name={positive ? 'check-circle' : 'x-circle'} color={positive ? '#16a34a' : '#ef4444'} size={16} />
        <Text
          className={`font-sans text-sm font-semibold ${
            positive ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
          }`}>
          {title}
        </Text>
      </View>
      <View className="gap-1">
        {items.map((item) => (
          <Text
            key={item}
            className={`font-sans text-xs leading-5 ${
              positive ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
            }`}>
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}
