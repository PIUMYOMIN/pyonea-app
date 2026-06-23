import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useNativeAuth } from '@/context/native-auth';
import { useAppTranslation } from '@/i18n';
import { hasUserRole } from '@/utils/auth-routing';
import {
  fetchSellerSubscriptionOverview,
  fetchSubscriptionPlans,
  formatMMK,
  type SubscriptionPlan,
} from '@/utils/native-api';
import { SITE_PUBLIC_URL } from '@/config/native';

const SELLER_WEB_SUBSCRIPTION_URL = `${SITE_PUBLIC_URL}/seller/dashboard?tab=subscription`;

const staticPlans: SubscriptionPlan[] = [
  {
    id: 1,
    slug: 'basic',
    name: 'Basic',
    description: 'For small businesses getting started',
    price: formatMMK(0),
    priceValue: 0,
    billingCycle: 'monthly',
    productLimit: '20 products',
    productLimitValue: 20,
    productLimitLabel: '20',
    commission: '3% commission',
    commissionRate: 0.03,
    commissionPercent: '3%',
    features: [],
    highlighted: false,
    analyticsEnabled: false,
    bulkImportEnabled: false,
    prioritySupport: false,
    customStorefront: false,
  },
  {
    id: 2,
    slug: 'professional',
    name: 'Professional',
    description: 'For growing businesses',
    price: formatMMK(35000),
    priceValue: 35000,
    billingCycle: 'monthly',
    productLimit: '100 products',
    productLimitValue: 100,
    productLimitLabel: '100',
    commission: '2% commission',
    commissionRate: 0.02,
    commissionPercent: '2%',
    features: [],
    highlighted: true,
    analyticsEnabled: true,
    bulkImportEnabled: false,
    prioritySupport: true,
    customStorefront: false,
  },
  {
    id: 3,
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'For large businesses and wholesalers',
    price: formatMMK(65000),
    priceValue: 65000,
    billingCycle: 'monthly',
    productLimit: 'Unlimited products',
    productLimitValue: -1,
    productLimitLabel: 'Unlimited',
    commission: '1% commission',
    commissionRate: 0.01,
    commissionPercent: '1%',
    features: [],
    highlighted: false,
    analyticsEnabled: true,
    bulkImportEnabled: true,
    prioritySupport: true,
    customStorefront: true,
  },
];

const faqs = [
  { q: 'q_setup', a: 'a_setup' },
  { q: 'q_change_plans', a: 'a_change_plans' },
  { q: 'q_payment', a: 'a_payment' },
  { q: 'q_contract', a: 'a_contract' },
  { q: 'q_limit', a: 'a_limit' },
  { q: 'q_commission', a: 'a_commission' },
];

const planStyles: Record<
  string,
  {
    icon: keyof typeof Feather.glyphMap;
    border: string;
    accent: string;
    iconBg: string;
    button: string;
  }
> = {
  basic: {
    icon: 'shopping-bag',
    border: 'border-gray-200 dark:border-gray-700',
    accent: 'text-gray-700 dark:text-gray-200',
    iconBg: 'bg-gray-100 dark:bg-gray-700',
    button: 'bg-gray-800 dark:bg-gray-200',
  },
  professional: {
    icon: 'zap',
    border: 'border-green-500',
    accent: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    button: 'bg-green-600',
  },
  enterprise: {
    icon: 'briefcase',
    border: 'border-purple-500',
    accent: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    button: 'bg-purple-600',
  },
};

function PricingSkeleton() {
  return (
    <View className="mx-auto w-full max-w-5xl px-4 py-12">
      <View className="mx-auto mb-4 h-10 w-48 rounded-xl bg-gray-200 dark:bg-slate-800" />
      <View className="mx-auto mb-12 h-4 w-80 max-w-full rounded bg-gray-100 dark:bg-slate-800" />
      <View className="gap-6 md:flex-row">
        {Array.from({ length: 3 }).map((_, index) => (
          <View
            key={`pricing-skeleton-${index}`}
            className="h-96 flex-1 rounded-2xl bg-gray-100 dark:bg-slate-800"
          />
        ))}
      </View>
    </View>
  );
}

function FeatureRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <Feather name={ok ? 'check-circle' : 'x-circle'} color={ok ? '#22c55e' : '#cbd5e1'} size={17} />
      <Text
        className={`min-w-0 flex-1 font-sans text-sm ${
          ok ? 'text-gray-700 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'
        }`}>
        {label}
      </Text>
    </View>
  );
}

function PlanCard({ plan, onPress }: { plan: SubscriptionPlan; onPress: () => void }) {
  const { t, i18n } = useAppTranslation();
  const slug = plan.slug || 'basic';
  const styles = planStyles[slug] || planStyles.basic;
  const isFreePlan = plan.priceValue === 0;
  const planName = t(`pricing_page.plans.${slug}.name`, plan.name);
  const planDescription = t(`pricing_page.plans.${slug}.description`, plan.description);
  const price =
    plan.priceValue === 0
      ? t('pricing_page.format.free', 'Free')
      : t('pricing_page.format.price_mmk', {
          amount: plan.priceValue.toLocaleString(i18n.language),
          defaultValue: plan.price,
        });
  const featureRows = [
    {
      label: t('pricing_page.feature.products_with_count', {
        count: plan.productLimitLabel,
        defaultValue: `${plan.productLimitLabel} ${t('pricing_page.feature.products', 'Products')}`,
      }),
      ok: true,
    },
    {
      label: t('pricing_page.feature.commission_with_rate', {
        rate: plan.commissionPercent,
        defaultValue: `${plan.commissionPercent} ${t('pricing_page.feature.commission', 'Commission')}`,
      }),
      ok: true,
    },
    { label: t('pricing_page.feature.analytics_dashboard'), ok: plan.analyticsEnabled },
    { label: t('pricing_page.feature.bulk_import_export'), ok: plan.bulkImportEnabled },
    { label: t('pricing_page.feature.priority_support'), ok: plan.prioritySupport },
    { label: t('pricing_page.feature.custom_storefront'), ok: plan.customStorefront },
  ];
  const current = Boolean(plan.isCurrent);

  return (
    <View
      className={`relative flex-1 rounded-2xl border-2 bg-white shadow-lg shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-950/50 ${styles.border}`}>
      {plan.highlighted ? (
        <View className="absolute -top-4 inset-x-0 items-center">
          <View className="rounded-full bg-green-500 px-4 py-1 shadow">
            <Text className="font-sans text-xs font-bold text-white">
              {t('pricing_page.badge.most_popular')}
            </Text>
          </View>
        </View>
      ) : null}

      {current ? (
        <View className="absolute -top-4 inset-x-0 items-center">
          <View className="rounded-full bg-gray-800 px-4 py-1 shadow dark:bg-gray-200">
            <Text className="font-sans text-xs font-bold text-white dark:text-gray-900">
              {t('pricing_page.badge.current_plan')}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="flex-1 gap-5 p-6">
        <View>
          <View className="mb-2 flex-row items-center gap-2.5">
            <View className={`h-10 w-10 items-center justify-center rounded-xl ${styles.iconBg}`}>
              <Feather
                name={styles.icon}
                color={slug === 'enterprise' ? '#9333ea' : slug === 'professional' ? '#16a34a' : '#374151'}
                size={20}
              />
            </View>
            <Text className="min-w-0 flex-1 font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
              {planName}
            </Text>
          </View>
          <Text className="font-sans text-sm leading-5 text-gray-500 dark:text-slate-400">
            {planDescription}
          </Text>
          <Text className={`mt-4 font-sans text-3xl font-extrabold ${styles.accent}`}>
            {price}
            {!isFreePlan ? (
              <Text className="font-sans text-base font-normal text-gray-400">
                {t('pricing_page.format.per_month')}
              </Text>
            ) : null}
          </Text>
        </View>

        <View className="flex-1 gap-3">
          {featureRows.map((feature) => (
            <FeatureRow key={feature.label} label={feature.label} ok={feature.ok} />
          ))}
        </View>

        {current && plan.productsUsed != null ? (
          <View className="gap-1">
            <View className="flex-row justify-between">
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                {t('pricing_page.feature.products_used')}
              </Text>
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                {plan.productsUsed} /{' '}
                {plan.productLimitValue === -1
                  ? t('pricing_page.format.unlimited_symbol')
                  : plan.productLimitValue}
              </Text>
            </View>
            {plan.productLimitValue !== -1 ? (
              <View className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                <View
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${Math.min(100, (plan.productsUsed / plan.productLimitValue) * 100)}%`,
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onPress={current ? undefined : onPress}
          disabled={current}
          className={`h-12 flex-row items-center justify-center gap-2 rounded-xl ${
            current ? 'bg-gray-100 dark:bg-slate-700' : styles.button
          }`}>
          {current ? <Feather name="check-circle" color="#9ca3af" size={17} /> : null}
          <Text
            className={`font-sans text-sm font-semibold ${
              current
                ? 'text-gray-400 dark:text-slate-500'
                : slug === 'basic'
                  ? 'text-white dark:text-gray-900'
                  : 'text-white'
            }`}>
            {current
              ? t('pricing_page.cta.current_plan')
              : t('pricing_page.cta.get_started_free', 'Get Started')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PricingNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useNativeAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isSeller = isAuthenticated && hasUserRole(user, 'seller');

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();

    const loadPlans = async () => {
      setLoading(true);
      try {
        const nextPlans = isSeller
          ? (await fetchSellerSubscriptionOverview(controller.signal)).plans
          : await fetchSubscriptionPlans(controller.signal);
        if (!controller.signal.aborted) setPlans(nextPlans.length > 0 ? nextPlans : staticPlans);
      } catch {
        if (!controller.signal.aborted) setPlans(staticPlans);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadPlans();

    return () => controller.abort();
  }, [authLoading, isSeller]);

  const sortedPlans = useMemo(() => {
    const order = ['basic', 'professional', 'enterprise'];
    return [...plans].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  }, [plans]);

  const goSellerRegister = () =>
    isSeller
      ? void Linking.openURL(SELLER_WEB_SUBSCRIPTION_URL)
      : router.push('/register?role=seller');

  return (
    <AppLayout>
      <View className="bg-gray-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
        {loading ? (
          <PricingSkeleton />
        ) : (
          <View className="mx-auto w-full max-w-7xl gap-16">
            <View className="mx-auto max-w-2xl items-center gap-4">
              <View className="flex-row items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 dark:border-green-800 dark:bg-green-900/20">
                <Feather name="star" color="#16a34a" size={15} />
                <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                  {t('pricing_page.hero.badge_label')}
                </Text>
              </View>
              <Text className="text-center font-sans text-3xl font-extrabold text-gray-900 dark:text-slate-100 sm:text-4xl">
                {t('pricing_page.hero.title')}
              </Text>
              <Text className="text-center font-sans text-base leading-7 text-gray-500 dark:text-slate-400 sm:text-lg">
                {t('pricing_page.hero.subtitle')}
              </Text>
            </View>

            <View className="mx-auto w-full max-w-5xl gap-6 md:flex-row">
              {sortedPlans.map((plan) => (
                <PlanCard key={String(plan.id)} plan={plan} onPress={goSellerRegister} />
              ))}
            </View>

            <View className="mx-auto w-full max-w-3xl gap-4">
              <Text className="text-center font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
                {t('pricing_page.faq.title')}
              </Text>
              <View className="gap-2">
                {faqs.map((faq, index) => {
                  const open = openFaq === index;
                  return (
                    <View
                      key={faq.q}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                      <Pressable
                        onPress={() => setOpenFaq(open ? null : index)}
                        className="flex-row items-center justify-between gap-4 px-5 py-4">
                        <Text className="min-w-0 flex-1 font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {t(`pricing_page.faq.${faq.q}`)}
                        </Text>
                        <Feather
                          name={open ? 'minus' : 'plus'}
                          color="#9ca3af"
                          size={18}
                        />
                      </Pressable>
                      {open ? (
                        <View className="border-t border-gray-100 px-5 pb-4 pt-3 dark:border-slate-700">
                          <Text className="font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                            {t(`pricing_page.faq.${faq.a}`)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="mx-auto w-full max-w-2xl items-center gap-4 rounded-2xl bg-green-600 p-8 shadow-xl shadow-green-900/20">
              <Text className="text-center font-sans text-2xl font-bold text-white">
                {t('pricing_page.cta_banner.ready')}
              </Text>
              <Text className="text-center font-sans text-sm leading-6 text-green-100">
                {t('pricing_page.cta_banner.description')}
              </Text>
              <Pressable onPress={goSellerRegister} className="rounded-xl bg-white px-8 py-3">
                <Text className="font-sans text-sm font-bold text-green-700">
                  {t('pricing_page.cta_banner.cta')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </AppLayout>
  );
}
