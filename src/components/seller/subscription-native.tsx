import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, Text, View } from 'react-native';

import { PaymentQrBadge, PaymentMmqrPoweredBy, PaymentQrDisplay } from '@/components/checkout/payment-qr-display';
import { useAppTranslation } from '@/i18n';
import {
  createSellerSubscriptionPaymentSession,
  fetchSellerSubscriptionOverview,
  formatMMK,
  upgradeSellerSubscription,
  verifySellerSubscriptionPayment,
  type SellerSubscription,
  type SellerSubscriptionPaymentSession,
  type SubscriptionPlan,
} from '@/utils/native-api';

const planIcon = (slug?: string) => {
  if (slug === 'professional') return 'zap';
  if (slug === 'enterprise') return 'award';
  return 'briefcase';
};

const planTone = (slug?: string) => {
  if (slug === 'professional') {
    return {
      border: 'border-green-300 dark:border-green-700',
      badge: 'bg-green-100 dark:bg-green-900/30',
      badgeText: 'text-green-700 dark:text-green-300',
      accent: 'text-green-600 dark:text-green-400',
      button: 'bg-green-600',
      icon: 'zap' as const,
    };
  }
  if (slug === 'enterprise') {
    return {
      border: 'border-purple-300 dark:border-purple-700',
      badge: 'bg-purple-100 dark:bg-purple-900/30',
      badgeText: 'text-purple-700 dark:text-purple-300',
      accent: 'text-purple-600 dark:text-purple-400',
      button: 'bg-purple-600',
      icon: 'award' as const,
    };
  }
  return {
    border: 'border-gray-200 dark:border-slate-700',
    badge: 'bg-gray-100 dark:bg-slate-700',
    badgeText: 'text-gray-700 dark:text-slate-300',
    accent: 'text-gray-700 dark:text-slate-300',
    button: 'bg-slate-700',
    icon: 'briefcase' as const,
  };
};

const paymentMethodLabel = (method: string) => {
  if (method === 'mmqr') return 'MMQR';
  if (method === 'kbz_pay') return 'KBZ Pay';
  if (method === 'wave_pay') return 'Wave Pay';
  return method.replaceAll('_', ' ');
};

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function PlanFeatureRow({
  label,
  value,
  enabled = true,
}: {
  label: string;
  value?: string;
  enabled?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Feather name={enabled ? 'check-circle' : 'x-circle'} color={enabled ? '#16a34a' : '#94a3b8'} size={16} />
      <Text
        className={`min-w-0 flex-1 font-sans text-sm ${
          enabled ? 'text-gray-700 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'
        }`}
      >
        {label}
      </Text>
      {value ? (
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">{value}</Text>
      ) : null}
    </View>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const percent = limit === -1 ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const danger = percent >= 90;
  const warning = percent >= 70 && !danger;

  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-400">
          Products used
        </Text>
        <Text
          className={`font-sans text-xs font-medium ${
            danger ? 'text-red-500' : warning ? 'text-yellow-500' : 'text-gray-600 dark:text-slate-400'
          }`}
        >
          {limit === -1 ? `${used} / Unlimited` : `${used} / ${limit}`}
        </Text>
      </View>
      {limit !== -1 ? (
        <View className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
          <View
            className={`h-full rounded-full ${danger ? 'bg-red-500' : warning ? 'bg-yellow-400' : 'bg-green-500'}`}
            style={{ width: `${percent}%` }}
          />
        </View>
      ) : null}
      {danger ? (
        <View className="flex-row items-center gap-1">
          <Feather name="alert-triangle" color="#ef4444" size={13} />
          <Text className="font-sans text-xs text-red-500">You are close to your product limit.</Text>
        </View>
      ) : null}
    </View>
  );
}

function PaymentModal({
  plan,
  methods,
  upgrading,
  onCancel,
  onConfirm,
}: {
  plan: SubscriptionPlan;
  methods: string[];
  upgrading: boolean;
  onCancel: () => void;
  onConfirm: (reference: string, method: string) => Promise<void>;
}) {
  const activeMethods = methods;
  const [method, setMethod] = useState(activeMethods[0] || '');
  const [session, setSession] = useState<SellerSubscriptionPaymentSession | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [paymentDetected, setPaymentDetected] = useState(false);

  useEffect(() => {
    if (!session?.reference || !method || paymentDetected) return undefined;
    let cancelled = false;
    const timer = setInterval(() => {
      verifySellerSubscriptionPayment(method, session.reference)
        .then((paid) => {
          if (!paid || cancelled) return;
          setPaymentDetected(true);
          void onConfirm(session.reference, method);
        })
        .catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [method, onConfirm, paymentDetected, session?.reference]);

  const generatePayment = async () => {
    setGenerating(true);
    setError('');
    setSession(null);
    try {
      const nextSession = await createSellerSubscriptionPaymentSession(plan.slug, method);
      setSession(nextSession);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Could not generate payment. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const resetMethod = (nextMethod: string) => {
    setMethod(nextMethod);
    setSession(null);
    setError('');
    setPaymentDetected(false);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Feather name={planIcon(plan.slug)} color={plan.slug === 'enterprise' ? '#9333ea' : '#16a34a'} size={23} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
                Upgrade to {plan.name}
              </Text>
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                {formatMMK(plan.priceValue)} per month
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
            <Feather name="info" color="#d97706" size={16} />
            <Text className="min-w-0 flex-1 font-sans text-sm leading-5 text-amber-800 dark:text-amber-300">
              Pay {formatMMK(plan.priceValue)} with your selected wallet, then submit the payment reference for admin approval.
            </Text>
          </View>

          <View className="mt-4">
            <Text className="mb-2 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
              Payment method
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {activeMethods.length ? activeMethods.map((item) => {
                const active = method === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => resetMethod(item)}
                    disabled={generating || upgrading}
                    className={`rounded-xl border px-3 py-2 ${
                      active
                        ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                        : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <Text
                      className={`font-sans text-sm font-semibold ${
                        active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {paymentMethodLabel(item)}
                    </Text>
                  </Pressable>
                );
              }) : (
                <View className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">No online payment methods are enabled.</Text>
                </View>
              )}
            </View>
          </View>

          {error ? (
            <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
              <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
            </View>
          ) : null}

          {session ? (
            <View className="mt-4 gap-4 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <View className="flex-row items-center justify-between gap-3">
                <View>
                  <Text className="font-sans text-xs font-bold uppercase text-green-700 dark:text-green-300">
                    Amount to pay
                  </Text>
                  <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
                    {formatMMK(session.amount || plan.priceValue)}
                  </Text>
                </View>
                <View className="rounded-full bg-white px-3 py-1 dark:bg-slate-800">
                  <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-300">
                    {paymentMethodLabel(method)}
                  </Text>
                </View>
              </View>

              {(session.qrImageUrl || session.qrString || method === 'mmqr') ? (
                <View className="items-center gap-2">
                  <PaymentQrBadge paymentMethod={method} />
                  <View className="h-48 w-48 items-center justify-center rounded-2xl border-4 border-white bg-white p-2 shadow-sm dark:border-slate-700">
                    <PaymentQrDisplay
                      qrImageUrl={session.qrImageUrl || undefined}
                      qrString={session.qrString || undefined}
                      size={176}
                      loadingLabel="QR code is being generated."
                    />
                  </View>
                  <PaymentMmqrPoweredBy paymentMethod={method} />
                  <Text className="text-center font-sans text-xs leading-4 text-gray-500 dark:text-slate-400">
                    Scan this QR code with your payment app, enter your PIN there, then return here.
                  </Text>
                </View>
              ) : null}

              {session.deeplinkUrl || session.checkoutUrl ? (
                <Pressable
                  onPress={() => void Linking.openURL(session.deeplinkUrl || session.checkoutUrl)}
                  className="items-center rounded-xl bg-green-600 px-4 py-2.5"
                >
                  <Text className="font-sans text-sm font-bold text-white">Open payment app</Text>
                </Pressable>
              ) : null}

              <View className="rounded-lg bg-white/80 px-3 py-2 dark:bg-slate-800/80">
                <Text className="font-sans text-xs font-medium text-gray-700 dark:text-slate-200">
                  Reference: <Text className="font-mono">{session.reference}</Text>
                </Text>
              </View>

              <View className="flex-row items-center justify-center gap-2">
                <View className="h-2 w-2 rounded-full bg-green-500" />
                <Text className="font-sans text-xs text-green-700 dark:text-green-300">
                  {paymentDetected ? 'Payment detected. Submitting request...' : 'Waiting for payment confirmation...'}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={onCancel}
              disabled={upgrading || generating}
              className="flex-1 items-center rounded-xl border border-gray-300 px-4 py-2.5 dark:border-slate-600"
            >
              <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Cancel</Text>
            </Pressable>
            {session ? (
              <Pressable
                onPress={() => onConfirm(session.reference, method)}
                disabled={upgrading || paymentDetected || !session.reference}
                className="flex-1 items-center rounded-xl bg-green-600 px-4 py-2.5"
              >
                <Text className="font-sans text-sm font-bold text-white">
                  {upgrading || paymentDetected ? 'Processing...' : 'I have paid'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={generatePayment}
                disabled={generating || upgrading || !method}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5"
              >
                <Feather name={method === 'mmqr' ? 'grid' : 'smartphone'} color="#ffffff" size={16} />
                <Text className="font-sans text-sm font-bold text-white">
                  {generating ? 'Generating...' : 'Pay Now'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CurrentPlanCard({ current, onRefresh }: { current: SellerSubscription | null; onRefresh: () => void }) {
  const slug = current?.plan?.slug || 'basic';
  const tone = planTone(slug);
  const plan = current?.plan;

  return (
    <View className={`gap-4 rounded-2xl border-2 bg-white p-6 shadow-sm dark:bg-slate-800 ${tone.border}`}>
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className={`h-12 w-12 items-center justify-center rounded-full ${tone.badge}`}>
            <Feather name={tone.icon} color={slug === 'enterprise' ? '#9333ea' : slug === 'professional' ? '#16a34a' : '#475569'} size={24} />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                {plan?.name || 'Basic'} Plan
              </Text>
              <View className={`rounded-full px-2 py-0.5 ${tone.badge}`}>
                <Text className={`font-sans text-xs font-bold ${tone.badgeText}`}>
                  {current?.statusLabel || 'Active'}
                </Text>
              </View>
            </View>
            <Text className={`mt-1 font-sans text-sm font-medium ${tone.accent}`}>
              {formatMMK(plan?.priceValue || 0)} {(plan?.priceValue || 0) > 0 ? 'per month' : 'no charge'}
            </Text>
          </View>
        </View>
        <Pressable onPress={onRefresh} className="h-9 w-9 items-center justify-center rounded-lg">
          <Feather name="refresh-cw" color="#94a3b8" size={17} />
        </Pressable>
      </View>

      {current?.endsAt ? (
        <View className="flex-row flex-wrap gap-4">
          <View className="flex-row items-center gap-1.5">
            <Feather name="calendar" color="#64748b" size={16} />
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
              Renews <Text className="font-medium text-gray-700 dark:text-slate-200">{formatDate(current.nextBillingAt || current.endsAt)}</Text>
            </Text>
          </View>
          {current.daysRemaining !== null ? (
            <View className="flex-row items-center gap-1.5">
              <Feather name="zap" color={current.daysRemaining <= 7 ? '#d97706' : '#64748b'} size={16} />
              <Text className={`font-sans text-sm ${current.daysRemaining <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-slate-400'}`}>
                {current.daysRemaining} days remaining
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">Free plan does not expire.</Text>
      )}

      {plan ? (
        <View className="border-t border-gray-100 pt-3 dark:border-slate-700">
          <UsageBar used={current?.productsUsed || plan.productsUsed || 0} limit={plan.productLimitValue} />
        </View>
      ) : null}

      {plan ? (
        <View className="grid grid-cols-1 gap-2 border-t border-gray-100 pt-3 dark:border-slate-700 md:grid-cols-2">
          <PlanFeatureRow label="Commission rate" value={plan.commissionPercent} />
          <PlanFeatureRow label="Product limit" value={plan.productLimitLabel} />
          <PlanFeatureRow label="Analytics" enabled={plan.analyticsEnabled} />
          <PlanFeatureRow label="Bulk import" enabled={plan.bulkImportEnabled} />
          <PlanFeatureRow label="Priority support" enabled={plan.prioritySupport} />
          <PlanFeatureRow label="Custom storefront" enabled={plan.customStorefront} />
        </View>
      ) : null}
    </View>
  );
}

function PlanCard({
  plan,
  current,
  pendingRequest,
  upgrading,
  onSelect,
}: {
  plan: SubscriptionPlan;
  current: SellerSubscription | null;
  pendingRequest: SellerSubscription | null;
  upgrading: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
}) {
  const isCurrent = plan.isCurrent || current?.plan?.slug === plan.slug;
  const isPending = plan.isPending || pendingRequest?.plan?.slug === plan.slug;
  const showPopular = plan.slug === 'professional' && !isCurrent;
  const tone = planTone(plan.slug);
  const isDowngrade = plan.priceValue < (current?.plan?.priceValue || 0);

  return (
    <View className={`relative z-0 flex-1 gap-4 overflow-visible rounded-2xl border-2 bg-white p-5 shadow-sm dark:bg-slate-800 ${isCurrent ? tone.border : 'border-gray-200 dark:border-slate-700'}`}>
      {isCurrent || isPending || showPopular ? (
        <View className="absolute -top-3 left-0 right-0 items-center">
          <View className={`rounded-full px-3 py-1 shadow-sm ${isPending && !isCurrent ? 'bg-amber-500' : showPopular ? 'bg-green-500' : tone.badge}`}>
            <Text className={`font-sans text-xs font-bold ${isPending && !isCurrent ? 'text-white' : showPopular ? 'text-white' : tone.badgeText}`}>
              {isCurrent ? 'Current Plan' : isPending ? 'Pending' : 'Most Popular'}
            </Text>
          </View>
        </View>
      ) : null}

      <View>
        <View className="mb-1 flex-row items-center gap-2">
          <Feather name={planIcon(plan.slug)} color={plan.slug === 'enterprise' ? '#9333ea' : plan.slug === 'professional' ? '#16a34a' : '#475569'} size={24} />
          <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{plan.name}</Text>
        </View>
        <Text className="font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">{plan.description}</Text>
        <Text className={`mt-2 font-sans text-2xl font-extrabold ${tone.accent}`}>
          {formatMMK(plan.priceValue)}
          {plan.priceValue > 0 ? <Text className="text-sm font-normal text-gray-400"> /mo</Text> : null}
        </Text>
      </View>

      <View className="flex-1 gap-2.5">
        <PlanFeatureRow label={`${plan.productLimitLabel} products`} />
        <PlanFeatureRow label={`${plan.commissionPercent} commission`} />
        <PlanFeatureRow label="Analytics" enabled={plan.analyticsEnabled} />
        <PlanFeatureRow label="Bulk import" enabled={plan.bulkImportEnabled} />
        <PlanFeatureRow label="Priority support" enabled={plan.prioritySupport} />
        <PlanFeatureRow label="Custom storefront" enabled={plan.customStorefront} />
      </View>

      <Pressable
        onPress={() => onSelect(plan)}
        disabled={isCurrent || isPending || upgrading}
        className={`w-full flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
          isCurrent ? 'bg-gray-100 dark:bg-slate-700' : tone.button
        }`}
      >
        <Feather name={isCurrent ? 'check-circle' : isDowngrade ? 'arrow-down-circle' : 'arrow-up-circle'} color={isCurrent ? '#94a3b8' : '#ffffff'} size={16} />
        <Text className={`font-sans text-sm font-bold ${isCurrent ? 'text-gray-400 dark:text-slate-500' : 'text-white'}`}>
          {isCurrent ? 'Your Current Plan' : isPending ? 'Waiting Approval' : upgrading ? 'Processing...' : isDowngrade ? 'Downgrade' : `Upgrade to ${plan.name}`}
        </Text>
      </Pressable>
    </View>
  );
}

export function SubscriptionNative() {
  const { t } = useAppTranslation();
  const [current, setCurrent] = useState<SellerSubscription | null>(null);
  const [pendingRequest, setPendingRequest] = useState<SellerSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [modalPlan, setModalPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchSellerSubscriptionOverview(controller.signal)
      .then((overview) => {
        setCurrent(overview.current);
        setPendingRequest(overview.pendingRequest);
        setPlans(overview.plans);
        setPaymentMethods(overview.paymentMethods);
        setError('');
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load subscription details.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const reload = () => {
    setLoading(true);
    setRefreshKey((currentKey) => currentKey + 1);
  };

  const handleUpgrade = async (plan: SubscriptionPlan, reference = '', method = '') => {
    setUpgrading(true);
    setError('');
    setSuccess('');
    try {
      const result = await upgradeSellerSubscription(plan.slug, reference, method);
      setSuccess(
        plan.priceValue === 0
          ? `Downgraded to ${plan.name}.`
          : result.message || `${plan.name} request submitted for approval.`,
      );
      setModalPlan(null);
      reload();
    } catch (upgradeError) {
      setError(upgradeError instanceof Error ? upgradeError.message : 'Subscription update failed. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const openPlan = (plan: SubscriptionPlan) => {
    if (plan.priceValue <= 0) {
      void handleUpgrade(plan);
      return;
    }
    setModalPlan(plan);
  };

  const currentPlanSlug = current?.plan?.slug || 'basic';
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.priceValue - b.priceValue),
    [plans],
  );

  if (loading) {
    return (
      <View className="gap-4">
        <View className="h-40 rounded-2xl bg-gray-100 dark:bg-slate-800" />
        <View className="gap-4 md:flex-row">
          {[0, 1, 2].map((item) => (
            <View key={item} className="h-64 flex-1 rounded-2xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="gap-6">
      {error ? (
        <Pressable
          onPress={() => setError('')}
          className="flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20"
        >
          <Feather name="alert-triangle" color="#ef4444" size={17} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
        </Pressable>
      ) : null}

      {success ? (
        <Pressable
          onPress={() => setSuccess('')}
          className="flex-row items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20"
        >
          <Feather name="check-circle" color="#16a34a" size={17} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-700 dark:text-green-300">{success}</Text>
        </Pressable>
      ) : null}

      {pendingRequest ? (
        <View className="flex-row items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <Feather name="alert-triangle" color="#d97706" size={17} />
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-sm font-bold text-amber-800 dark:text-amber-300">
              Pending subscription request
            </Text>
            <Text className="mt-1 font-sans text-sm leading-5 text-amber-800 dark:text-amber-300">
              Your {pendingRequest.plan?.name || 'paid plan'} request is waiting for admin approval.
              {pendingRequest.paymentMethod ? ` Payment method: ${paymentMethodLabel(pendingRequest.paymentMethod)}.` : ''}
              {pendingRequest.paymentReference ? ` Reference: ${pendingRequest.paymentReference}` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      <CurrentPlanCard current={current} onRefresh={reload} />

      <View>
        <View className="mb-4 flex-row items-center gap-2">
          <Feather name="star" color={currentPlanSlug === 'enterprise' ? '#9333ea' : '#16a34a'} size={20} />
          <Text className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100">
            Available Plans
          </Text>
        </View>
        <View className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={current}
              pendingRequest={pendingRequest}
              upgrading={upgrading}
              onSelect={openPlan}
            />
          ))}
        </View>
      </View>

      <View className="gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
        <View className="flex-row items-center gap-2">
          <Feather name="info" color="#3b82f6" size={17} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            How billing works
          </Text>
        </View>
        {[
          'Paid plans are billed monthly.',
          'Upgrades are submitted for admin approval after payment confirmation.',
          'Downgrades to Basic apply immediately.',
          `Current plan status: ${current?.statusLabel || t('subscription.status.active', 'Active')}.`,
        ].map((item) => (
          <Text key={item} className="font-sans text-sm leading-5 text-gray-500 dark:text-slate-400">
            - {item}
          </Text>
        ))}
      </View>

      {upgrading && !modalPlan ? (
        <View className="absolute inset-0 items-center justify-center bg-white/60 dark:bg-slate-950/60">
          <ActivityIndicator color="#16a34a" />
        </View>
      ) : null}

      {modalPlan ? (
        <PaymentModal
          plan={modalPlan}
          methods={paymentMethods}
          upgrading={upgrading}
          onCancel={() => setModalPlan(null)}
          onConfirm={(reference, method) => handleUpgrade(modalPlan, reference, method)}
        />
      ) : null}
    </View>
  );
}
