import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  ApiError,
  approveAdminSubscriptionRequest,
  assignAdminSubscriptionPlan,
  fetchAdminSubscriptionPlans,
  fetchAdminSubscriptions,
  rejectAdminSubscriptionRequest,
  updateAdminSubscriptionPlan,
  type AdminSubscriptionsMeta,
  type SellerSubscription,
  type SubscriptionPlan,

  formatApiErrorMessage,
} from '@/utils/native-api';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pending_payment', label: 'Pending Payment' },
];

const defaultMeta: AdminSubscriptionsMeta = {
  currentPage: 1,
  lastPage: 1,
  total: 0,
  perPage: 20,
};

const money = (value: number) => (value === 0 ? 'Free' : `${Number(value || 0).toLocaleString()} MMK`);

const dateLabel = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const paymentMethodLabel = (method: string) =>
  ({
    mmqr: 'MMQR',
    kbz_pay: 'KBZ Pay',
    wave_pay: 'Wave Money',
    cb_pay: 'CB Pay',
    aya_pay: 'AYA Pay',
    bank_transfer: 'Bank Transfer',
  })[method] || method.replaceAll('_', ' ') || '-';

const statusTone = (status: string) => {
  if (status === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300';
  if (status === 'expired') return 'bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-300';
  if (status === 'pending_payment') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-300';
  return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
};

const planTone = (slug?: string) => {
  if (slug === 'professional') return 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300';
  if (slug === 'enterprise') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/35 dark:text-purple-300';
  return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
};

function Toast({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  if (!message) return null;
  const success = tone === 'success';
  return (
    <View
      className={`flex-row items-center gap-2 rounded-xl border px-4 py-3 ${
        success
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/25'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/25'
      }`}
    >
      <Feather name={success ? 'check-circle' : 'alert-circle'} color={success ? '#15803d' : '#dc2626'} size={17} />
      <Text className={`min-w-0 flex-1 font-sans text-sm font-semibold ${success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
        {message}
      </Text>
    </View>
  );
}

function SelectPills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value || 'all'}
            onPress={() => onChange(option.value)}
            className={`rounded-xl border px-3 py-2 ${
              active
                ? 'border-green-600 bg-green-600'
                : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <Text className={`font-sans text-xs font-bold ${active ? 'text-white' : 'text-gray-600 dark:text-slate-300'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">{label}</Text>
      <Text className="min-w-0 flex-1 text-right font-sans text-sm font-bold text-gray-800 dark:text-slate-200" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 py-2 last:border-b-0 dark:border-slate-800">
      <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">{label}</Text>
      <Feather name={enabled ? 'check-circle' : 'x-circle'} color={enabled ? '#16a34a' : '#94a3b8'} size={17} />
    </View>
  );
}

function SubscriptionStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${statusTone(status)}`}>
      <Text className="font-sans text-[11px] font-semibold capitalize">{label}</Text>
    </View>
  );
}

function SubscriptionPlanBadge({ slug, name }: { slug?: string; name: string }) {
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${planTone(slug)}`}>
      <Text className="font-sans text-[11px] font-semibold">{name}</Text>
    </View>
  );
}

function SubscriptionTableRow({
  subscription,
  saving,
  onApprove,
  onReject,
  onOverride,
}: {
  subscription: SellerSubscription;
  saving: boolean;
  onApprove: (subscription: SellerSubscription) => void;
  onReject: (subscription: SellerSubscription) => void;
  onOverride: (subscription: SellerSubscription) => void;
}) {
  const sellerName = subscription.seller?.store || subscription.seller?.name || '—';
  const sellerEmail = subscription.seller?.email || `User #${subscription.userId}`;
  const isPending = subscription.status === 'pending_payment';
  const expiresSoon =
    subscription.daysRemaining != null && subscription.daysRemaining <= 7 && Boolean(subscription.endsAt);

  return (
    <View className="flex-row border-t border-gray-100 px-4 py-3 dark:border-slate-700">
      <View className="w-[160px] justify-center px-2">
        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {sellerName}
        </Text>
        <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500" numberOfLines={1}>
          {sellerEmail}
        </Text>
      </View>
      <View className="w-[120px] justify-center px-2">
        <SubscriptionPlanBadge slug={subscription.plan?.slug} name={subscription.plan?.name || '—'} />
      </View>
      <View className="w-[120px] justify-center px-2">
        <SubscriptionStatusBadge
          status={subscription.status}
          label={subscription.statusLabel || subscription.status.replaceAll('_', ' ')}
        />
      </View>
      <View className="w-[110px] justify-center px-2">
        <Text className="font-sans text-xs text-gray-600 dark:text-slate-400">{dateLabel(subscription.startsAt)}</Text>
      </View>
      <View className="w-[130px] justify-center px-2">
        {subscription.endsAt ? (
          <Text
            className={`font-sans text-xs ${
              expiresSoon ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-slate-400'
            }`}>
            {dateLabel(subscription.endsAt)}
            {expiresSoon ? ` (${subscription.daysRemaining}d)` : ''}
          </Text>
        ) : (
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">No expiry</Text>
        )}
      </View>
      <View className="w-[110px] justify-center px-2">
        <Text className="font-sans text-xs font-medium text-gray-700 dark:text-slate-200">
          {money(subscription.amountPaidValue)}
        </Text>
      </View>
      <View className="w-[110px] justify-center px-2">
        <Text className="font-sans text-xs capitalize text-gray-600 dark:text-slate-400">
          {paymentMethodLabel(subscription.paymentMethod)}
        </Text>
      </View>
      <View className="w-[120px] justify-center px-2">
        <Text className="font-sans text-[10px] text-gray-600 dark:text-slate-400" numberOfLines={1}>
          {subscription.paymentReference || '—'}
        </Text>
      </View>
      <View className="w-[200px] flex-row flex-wrap items-center justify-end gap-1.5 px-2">
        {isPending ? (
          <>
            <Pressable
              disabled={saving}
              onPress={() => onApprove(subscription)}
              className="flex-row items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 disabled:opacity-50">
              <Feather name="shield" color="#fff" size={12} />
              <Text className="font-sans text-[11px] font-medium text-white">Approve</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => onReject(subscription)}
              className="flex-row items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-900/20 disabled:opacity-50">
              <Feather name="x-circle" color="#dc2626" size={12} />
              <Text className="font-sans text-[11px] font-medium text-red-700 dark:text-red-300">Reject</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          onPress={() => onOverride(subscription)}
          className="flex-row items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-slate-800">
          <Feather name="edit-2" color="#475569" size={12} />
          <Text className="font-sans text-[11px] font-medium text-gray-700 dark:text-slate-200">Override</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PlanCard({ plan, onEdit }: { plan: SubscriptionPlan; onEdit: (plan: SubscriptionPlan) => void }) {
  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:flex-1">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">{plan.name}</Text>
          <Text className="mt-1 font-sans text-sm leading-5 text-gray-500 dark:text-slate-400">{plan.description}</Text>
        </View>
        <View className={`rounded-full px-2 py-1 ${plan.isCurrent ? 'bg-green-100 dark:bg-green-900/35' : 'bg-gray-100 dark:bg-slate-800'}`}>
          <Text className={`font-sans text-xs font-bold ${plan.isCurrent ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-slate-400'}`}>
            {plan.isCurrent ? 'Active' : 'Plan'}
          </Text>
        </View>
      </View>

      <View className="my-4 h-px bg-gray-100 dark:bg-slate-800" />
      <View className="gap-2">
        <MetricRow label="Price" value={`${plan.price}/mo`} />
        <MetricRow label="Products" value={plan.productLimitValue === -1 ? 'Unlimited' : String(plan.productLimitLabel)} />
        <MetricRow label="Commission" value={plan.commissionPercent} />
      </View>

      <View className="mt-4">
        <FeatureRow label="Analytics" enabled={plan.analyticsEnabled} />
        <FeatureRow label="Bulk Import" enabled={plan.bulkImportEnabled} />
        <FeatureRow label="Priority Support" enabled={plan.prioritySupport} />
        <FeatureRow label="Custom Storefront" enabled={plan.customStorefront} />
      </View>

      <Pressable onPress={() => onEdit(plan)} className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 dark:bg-slate-800">
        <Feather name="settings" color="#475569" size={16} />
        <Text className="font-sans text-sm font-bold text-gray-700 dark:text-slate-200">Edit Plan</Text>
      </Pressable>
    </View>
  );
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">{children}</View>
      </View>
    </Modal>
  );
}

function OverrideModal({
  subscription,
  plans,
  saving,
  onClose,
  onSave,
}: {
  subscription: SellerSubscription;
  plans: SubscriptionPlan[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { planSlug: string; endsAt: string; notes: string }) => void;
}) {
  const [planSlug, setPlanSlug] = useState(subscription.plan?.slug || plans[0]?.slug || 'basic');
  const [endsAt, setEndsAt] = useState(subscription.endsAt || '');
  const [notes, setNotes] = useState('');

  return (
    <ModalShell onClose={onClose}>
      <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
        Override Plan for {subscription.seller?.store || subscription.seller?.name || `Seller #${subscription.userId}`}
      </Text>
      <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">Choose a plan and optional expiry date.</Text>

      <View className="mt-4 gap-3">
        <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Plan</Text>
        <SelectPills options={plans.map((plan) => ({ value: plan.slug, label: `${plan.name} - ${plan.price}/mo` }))} value={planSlug} onChange={setPlanSlug} />
        <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Expires On</Text>
        <TextInput
          value={endsAt}
          onChangeText={setEndsAt}
          placeholder="YYYY-MM-DD (blank for indefinite)"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-gray-200 bg-white px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Admin Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Complimentary upgrade for 3 months"
          placeholderTextColor="#94a3b8"
          multiline
          className="min-h-20 rounded-xl border border-gray-200 bg-white px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable disabled={saving} onPress={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700 disabled:opacity-50">
          <Text className="text-center font-sans text-sm font-bold text-gray-700 dark:text-slate-200">Cancel</Text>
        </Pressable>
        <Pressable disabled={saving} onPress={() => onSave({ planSlug, endsAt, notes })} className="flex-1 rounded-xl bg-green-600 px-4 py-3 disabled:opacity-50">
          <Text className="text-center font-sans text-sm font-bold text-white">{saving ? 'Saving...' : 'Apply Plan'}</Text>
        </Pressable>
      </View>
    </ModalShell>
  );
}

function RejectModal({
  subscription,
  saving,
  onClose,
  onSave,
}: {
  subscription: SellerSubscription;
  saving: boolean;
  onClose: () => void;
  onSave: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <ModalShell onClose={onClose}>
      <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">Reject {subscription.plan?.name} Request</Text>
      <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
        Seller: {subscription.seller?.store || subscription.seller?.email || `User #${subscription.userId}`}
      </Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Explain why the payment/request is rejected..."
        placeholderTextColor="#94a3b8"
        multiline
        className="mt-4 min-h-24 rounded-xl border border-gray-200 bg-white px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      <View className="mt-5 flex-row gap-3">
        <Pressable disabled={saving} onPress={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700 disabled:opacity-50">
          <Text className="text-center font-sans text-sm font-bold text-gray-700 dark:text-slate-200">Cancel</Text>
        </Pressable>
        <Pressable disabled={saving || !reason.trim()} onPress={() => onSave(reason)} className="flex-1 rounded-xl bg-red-600 px-4 py-3 disabled:opacity-50">
          <Text className="text-center font-sans text-sm font-bold text-white">{saving ? 'Rejecting...' : 'Reject Request'}</Text>
        </Pressable>
      </View>
    </ModalShell>
  );
}

function PlanEditorModal({
  plan,
  saving,
  onClose,
  onSave,
}: {
  plan: SubscriptionPlan;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    description: string;
    priceValue: number;
    productLimitValue: number;
    commissionRate: number;
    analyticsEnabled: boolean;
    bulkImportEnabled: boolean;
    prioritySupport: boolean;
    customStorefront: boolean;
  }) => void;
}) {
  const [description, setDescription] = useState(plan.description);
  const [price, setPrice] = useState(String(plan.priceValue));
  const [productLimit, setProductLimit] = useState(String(plan.productLimitValue));
  const [commission, setCommission] = useState(String(Math.round(plan.commissionRate * 100)));
  const [analytics, setAnalytics] = useState(plan.analyticsEnabled);
  const [bulkImport, setBulkImport] = useState(plan.bulkImportEnabled);
  const [prioritySupport, setPrioritySupport] = useState(plan.prioritySupport);
  const [customStorefront, setCustomStorefront] = useState(plan.customStorefront);

  const toggleRows = [
    { label: 'Analytics Dashboard', value: analytics, setValue: setAnalytics },
    { label: 'Bulk Import / Export', value: bulkImport, setValue: setBulkImport },
    { label: 'Priority Support', value: prioritySupport, setValue: setPrioritySupport },
    { label: 'Custom Storefront', value: customStorefront, setValue: setCustomStorefront },
  ];

  return (
    <ModalShell onClose={onClose}>
      <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">Edit {plan.name} Plan</Text>
      <View className="mt-4 gap-3">
        <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Price (MMK/mo)" className="rounded-xl border border-gray-200 px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
        <TextInput value={productLimit} onChangeText={setProductLimit} keyboardType="numeric" placeholder="Product Limit (-1 = unlimited)" className="rounded-xl border border-gray-200 px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
        <TextInput value={commission} onChangeText={setCommission} keyboardType="numeric" placeholder="Commission Rate (%)" className="rounded-xl border border-gray-200 px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
        <TextInput value={description} onChangeText={setDescription} placeholder="Description" className="rounded-xl border border-gray-200 px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
      </View>
      <View className="mt-4 rounded-xl border border-gray-100 px-3 dark:border-slate-800">
        {toggleRows.map((row) => (
          <Pressable key={row.label} onPress={() => row.setValue(!row.value)} className="flex-row items-center justify-between border-b border-gray-100 py-3 last:border-b-0 dark:border-slate-800">
            <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">{row.label}</Text>
            <View className={`h-6 w-11 justify-center rounded-full px-1 ${row.value ? 'items-end bg-green-500' : 'items-start bg-gray-300 dark:bg-slate-700'}`}>
              <View className="h-4 w-4 rounded-full bg-white" />
            </View>
          </Pressable>
        ))}
      </View>
      <View className="mt-5 flex-row gap-3">
        <Pressable disabled={saving} onPress={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700 disabled:opacity-50">
          <Text className="text-center font-sans text-sm font-bold text-gray-700 dark:text-slate-200">Cancel</Text>
        </Pressable>
        <Pressable
          disabled={saving}
          onPress={() =>
            onSave({
              description,
              priceValue: Number(price || 0),
              productLimitValue: Number(productLimit || 0),
              commissionRate: Number(commission || 0) / 100,
              analyticsEnabled: analytics,
              bulkImportEnabled: bulkImport,
              prioritySupport,
              customStorefront,
            })
          }
          className="flex-1 rounded-xl bg-green-600 px-4 py-3 disabled:opacity-50"
        >
          <Text className="text-center font-sans text-sm font-bold text-white">{saving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
      </View>
    </ModalShell>
  );
}

export function AdminSubscriptionManagementNative() {
  const [tab, setTab] = useState<'subscriptions' | 'plans'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<SellerSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [meta, setMeta] = useState(defaultMeta);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [overrideSub, setOverrideSub] = useState<SellerSubscription | null>(null);
  const [rejectSub, setRejectSub] = useState<SellerSubscription | null>(null);
  const [planModal, setPlanModal] = useState<SubscriptionPlan | null>(null);
  const [toast, setToast] = useState({ message: '', tone: 'success' as 'success' | 'error' });

  const planOptions = useMemo(
    () => [{ value: '', label: 'All Plans' }, ...plans.map((plan) => ({ value: plan.slug, label: plan.name }))],
    [plans]
  );

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
    setTimeout(() => setToast({ message: '', tone }), 3500);
  }, []);

  const loadPlans = useCallback(async (signal?: AbortSignal) => {
    setPlansLoading(true);
    try {
      setPlans(await fetchAdminSubscriptionPlans(signal));
    } catch (error) {
      showToast(formatApiErrorMessage(error, 'Failed to load plan settings.'), 'error');
    } finally {
      setPlansLoading(false);
    }
  }, [showToast]);

  const loadSubscriptions = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetchAdminSubscriptions({ page, perPage: 20, search, status, planSlug: planFilter }, signal);
      setSubscriptions(response.subscriptions);
      setMeta(response.meta);
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to load subscriptions.');
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, planFilter, search, showToast, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => void loadPlans(controller.signal), 0);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [loadPlans]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => void loadSubscriptions(controller.signal), 0);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [loadSubscriptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const refreshAll = async () => {
    await Promise.all([loadSubscriptions(), loadPlans()]);
  };

  const handleApprove = async (subscription: SellerSubscription) => {
    setSaving(true);
    try {
      const response = await approveAdminSubscriptionRequest(subscription.id);
      showToast(response.message);
      await loadSubscriptions();
    } catch (error) {
      showToast(formatApiErrorMessage(error, 'Failed to approve subscription request.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectSub) return;
    setSaving(true);
    try {
      const response = await rejectAdminSubscriptionRequest(rejectSub.id, reason);
      setRejectSub(null);
      showToast(response.message);
      await loadSubscriptions();
    } catch (error) {
      showToast(formatApiErrorMessage(error, 'Failed to reject subscription request.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = async (payload: { planSlug: string; endsAt: string; notes: string }) => {
    if (!overrideSub) return;
    setSaving(true);
    try {
      const response = await assignAdminSubscriptionPlan(overrideSub.userId, payload);
      setOverrideSub(null);
      showToast(response.message);
      await loadSubscriptions();
    } catch (error) {
      showToast(formatApiErrorMessage(error, 'Failed to update plan.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePlanSave = async (payload: {
    description: string;
    priceValue: number;
    productLimitValue: number;
    commissionRate: number;
    analyticsEnabled: boolean;
    bulkImportEnabled: boolean;
    prioritySupport: boolean;
    customStorefront: boolean;
  }) => {
    if (!planModal) return;
    setSaving(true);
    try {
      const response = await updateAdminSubscriptionPlan(planModal.id, payload);
      setPlanModal(null);
      showToast(response.message);
      await loadPlans();
    } catch (error) {
      showToast(formatApiErrorMessage(error, 'Failed to save plan.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = subscriptions.filter((subscription) => subscription.status === 'pending_payment').length;

  return (
    <View className="gap-5">
      <View className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">Subscription Management</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">Manage seller plans, billing, and payment approvals.</Text>
        </View>
        <View className="flex-row gap-2">
          {[
            { key: 'subscriptions' as const, label: 'All Subscriptions' },
            { key: 'plans' as const, label: 'Plan Settings' },
          ].map((item) => {
            const active = tab === item.key;
            return (
              <Pressable key={item.key} onPress={() => setTab(item.key)} className={`rounded-xl px-4 py-2.5 ${active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-800'}`}>
                <Text className={`font-sans text-sm font-bold ${active ? 'text-white' : 'text-gray-700 dark:text-slate-200'}`}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Toast message={toast.message} tone={toast.tone} />

      {tab === 'subscriptions' ? (
        <View className="gap-4">
          <View className="gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <View className="gap-3 md:flex-row md:items-center">
              <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
                <Feather name="search" color="#94a3b8" size={17} />
                <TextInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Search seller name or email..."
                  placeholderTextColor="#94a3b8"
                  className="min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
                />
              </View>
              <Pressable onPress={() => void refreshAll()} className="h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                <Feather name="refresh-cw" color="#64748b" size={17} />
              </Pressable>
            </View>
            <SelectPills options={statusOptions} value={status} onChange={(next) => { setStatus(next); setPage(1); }} />
            <SelectPills options={planOptions} value={planFilter} onChange={(next) => { setPlanFilter(next); setPage(1); }} />
          </View>

          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
            {meta.total} subscription{meta.total === 1 ? '' : 's'} found{pendingCount ? ` - ${pendingCount} payment approval${pendingCount === 1 ? '' : 's'} waiting` : ''}
          </Text>

          {loading ? (
            <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <View className="items-center px-6 py-14">
                <ActivityIndicator color="#16a34a" />
              </View>
            </View>
          ) : subscriptions.length === 0 ? (
            <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-14 dark:border-slate-800 dark:bg-slate-900">
              <Feather name="inbox" color="#94a3b8" size={28} />
              <Text className="mt-3 font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">No subscriptions found.</Text>
            </View>
          ) : (
            <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
                <View className="w-full min-w-[1260px]">
                  <View className="flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900/50">
                    {[
                      { key: 'seller', label: 'Seller', width: 'w-[160px]' },
                      { key: 'plan', label: 'Plan', width: 'w-[120px]' },
                      { key: 'status', label: 'Status', width: 'w-[120px]' },
                      { key: 'started', label: 'Started', width: 'w-[110px]' },
                      { key: 'expires', label: 'Expires', width: 'w-[130px]' },
                      { key: 'paid', label: 'Paid (MMK)', width: 'w-[110px]' },
                      { key: 'method', label: 'Method', width: 'w-[110px]' },
                      { key: 'paymentRef', label: 'Payment Ref', width: 'w-[120px]' },
                      { key: 'actions', label: 'Actions', width: 'w-[200px]' },
                    ].map((column) => (
                      <View key={column.key} className={`${column.width} px-2`}>
                        <Text className="font-sans text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                          {column.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {subscriptions.map((subscription) => (
                    <SubscriptionTableRow
                      key={String(subscription.id)}
                      subscription={subscription}
                      saving={saving}
                      onApprove={handleApprove}
                      onReject={setRejectSub}
                      onOverride={setOverrideSub}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {meta.lastPage > 1 ? (
            <View className="flex-row items-center justify-between">
              <Pressable disabled={page <= 1 || loading} onPress={() => setPage((current) => Math.max(1, current - 1))} className="flex-row items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-700 disabled:opacity-40">
                <Feather name="chevron-left" color="#64748b" size={16} />
                <Text className="font-sans text-sm font-bold text-gray-600 dark:text-slate-300">Prev</Text>
              </Pressable>
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">Page {meta.currentPage} of {meta.lastPage}</Text>
              <Pressable disabled={page >= meta.lastPage || loading} onPress={() => setPage((current) => Math.min(meta.lastPage, current + 1))} className="flex-row items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-700 disabled:opacity-40">
                <Text className="font-sans text-sm font-bold text-gray-600 dark:text-slate-300">Next</Text>
                <Feather name="chevron-right" color="#64748b" size={16} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View className="gap-4 md:flex-row">
          {plansLoading ? (
            <View className="flex-1 rounded-2xl border border-gray-200 bg-white p-10 dark:border-slate-800 dark:bg-slate-900">
              <ActivityIndicator color="#16a34a" />
            </View>
          ) : (
            plans.map((plan) => <PlanCard key={plan.id} plan={plan} onEdit={setPlanModal} />)
          )}
        </View>
      )}

      {overrideSub ? <OverrideModal subscription={overrideSub} plans={plans} saving={saving} onClose={() => setOverrideSub(null)} onSave={handleOverride} /> : null}
      {rejectSub ? <RejectModal subscription={rejectSub} saving={saving} onClose={() => setRejectSub(null)} onSave={handleReject} /> : null}
      {planModal ? <PlanEditorModal plan={planModal} saving={saving} onClose={() => setPlanModal(null)} onSave={handlePlanSave} /> : null}
    </View>
  );
}
