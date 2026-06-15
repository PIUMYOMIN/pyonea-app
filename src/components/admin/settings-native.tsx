import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useNativeAuth } from '@/context/native-auth';
import { useTheme } from '@/context/theme';
import { NativeDateField } from '@/components/ui/native-date-field';
import {
  fetchAdminPaymentSettings,
  updateAdminPaymentMethod,
  updateSellerPassword,
  updateSellerProfile,
  type AdminPaymentMethod,
  type NativeUser,
  type SellerProfilePayload,

  formatApiErrorMessage,
} from '@/utils/native-api';

type Message = { type: 'success' | 'error'; text: string } | null;

type PaymentMethodMeta = {
  label: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  alwaysOn?: boolean;
};

const PAYMENT_METHOD_META: Record<string, PaymentMethodMeta> = {
  cash_on_delivery: {
    label: 'Cash on Delivery',
    desc: 'Pay when the order arrives — always available as platform default.',
    icon: 'truck',
    iconColor: '#f97316',
    alwaysOn: true,
  },
  mmqr: {
    label: 'MMQR Payment',
    desc: 'Scan QR code with any Myanmar mobile banking app (KBZPay, WavePay, AYA Pay, CB Pay).',
    icon: 'grid',
    iconColor: '#3b82f6',
  },
  kbz_pay: {
    label: 'KBZ Pay',
    desc: 'Deep-link payment via the KBZ Pay mobile wallet.',
    icon: 'smartphone',
    iconColor: '#9333ea',
  },
  wave_pay: {
    label: 'Wave Pay',
    desc: 'Deep-link payment via the Wave Money mobile wallet.',
    icon: 'smartphone',
    iconColor: '#14b8a6',
  },
  cb_pay: {
    label: 'CB Pay',
    desc: 'Payment via the CB Bank mobile wallet.',
    icon: 'smartphone',
    iconColor: '#ef4444',
  },
  aya_pay: {
    label: 'AYA Pay',
    desc: 'Payment via the AYA Bank mobile wallet.',
    icon: 'smartphone',
    iconColor: '#16a34a',
  },
};

const initialProfileForm = (user: NativeUser | null): SellerProfilePayload => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  address: user?.address || '',
  city: user?.city || '',
  state: user?.state || '',
  country: user?.country || '',
  postal_code: user?.postalCode || '',
  date_of_birth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
});

function StatusToast({ message, onClose }: { message: Message; onClose: () => void }) {
  if (!message) return null;
  const success = message.type === 'success';
  return (
    <Pressable
      onPress={onClose}
      className={`mb-4 flex-row items-start gap-3 rounded-xl border p-4 ${
        success
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      }`}>
      <Feather name={success ? 'check-circle' : 'alert-triangle'} color={success ? '#16a34a' : '#dc2626'} size={18} />
      <Text
        className={`min-w-0 flex-1 font-sans text-sm ${
          success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
        }`}>
        {message.text}
      </Text>
      <Feather name="x" color={success ? '#16a34a' : '#dc2626'} size={16} />
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  required?: boolean;
}) {
  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#9ca3af"
        secureTextEntry={secure}
        keyboardType={keyboardType}
        className="h-12 rounded-xl border border-gray-300 bg-white px-4 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
      />
    </View>
  );
}

function SettingsCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <View className="mb-4 flex-row items-center gap-3">
        <Feather name={icon} size={20} color="#16a34a" />
        <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</Text>
      </View>
      {subtitle ? (
        <Text className="mb-5 font-sans text-sm text-gray-500 dark:text-slate-400">{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

function ProfileSettingsPanel({
  user,
  onSaved,
}: {
  user: NativeUser | null;
  onSaved: () => Promise<unknown>;
}) {
  const [profile, setProfile] = useState<SellerProfilePayload>(() => initialProfileForm(user));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    setProfile(initialProfileForm(user));
  }, [user]);

  const saveProfile = async () => {
    if (!profile.name.trim() || !profile.phone.trim()) {
      setMessage({ type: 'error', text: 'Full name and phone are required.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateSellerProfile(profile);
      await onSaved();
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: formatApiErrorMessage(error, 'Profile update failed.'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon="shield" title="Personal Information">
      <StatusToast message={message} onClose={() => setMessage(null)} />
      <View className="gap-4">
        <View className="gap-4 md:flex-row">
          <Field
            label="Full Name"
            required
            value={profile.name}
            onChangeText={(value) => setProfile((current) => ({ ...current, name: value }))}
          />
          <Field
            label="Phone"
            required
            keyboardType="phone-pad"
            value={profile.phone}
            onChangeText={(value) => setProfile((current) => ({ ...current, phone: value }))}
          />
        </View>
        <View className="gap-4 md:flex-row">
          <Field
            label="Email"
            keyboardType="email-address"
            value={profile.email || ''}
            onChangeText={(value) => setProfile((current) => ({ ...current, email: value }))}
          />
          <NativeDateField
            label="Date of Birth"
            value={profile.date_of_birth || ''}
            maximumDate={new Date().toISOString().slice(0, 10)}
            onChange={(value) => setProfile((current) => ({ ...current, date_of_birth: value }))}
          />
        </View>
        <Field
          label="Address"
          value={profile.address || ''}
          onChangeText={(value) => setProfile((current) => ({ ...current, address: value }))}
        />
        <View className="gap-4 md:flex-row">
          <Field
            label="City"
            value={profile.city || ''}
            onChangeText={(value) => setProfile((current) => ({ ...current, city: value }))}
          />
          <Field
            label="State"
            value={profile.state || ''}
            onChangeText={(value) => setProfile((current) => ({ ...current, state: value }))}
          />
        </View>
        <View className="gap-4 md:flex-row">
          <Field
            label="Country"
            value={profile.country || ''}
            onChangeText={(value) => setProfile((current) => ({ ...current, country: value }))}
          />
          <Field
            label="Postal Code"
            value={profile.postal_code || ''}
            onChangeText={(value) => setProfile((current) => ({ ...current, postal_code: value }))}
          />
        </View>
        <View className="items-end">
          <Pressable
            disabled={saving}
            onPress={() => void saveProfile()}
            className={`rounded-xl bg-green-600 px-5 py-2.5 ${saving ? 'opacity-50' : ''}`}>
            <Text className="font-sans text-sm font-medium text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SettingsCard>
  );
}

function PaymentMethodsPanel() {
  const { isDark } = useTheme();
  const [methods, setMethods] = useState<AdminPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMethod, setSavingMethod] = useState<string | null>(null);
  const [toast, setToast] = useState<Message>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const nextMethods = await fetchAdminPaymentSettings();
      setMethods(nextMethods);
    } catch {
      showToast('error', 'Failed to load payment settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleToggle = async (method: AdminPaymentMethod, enabled: boolean) => {
    setMethods((current) =>
      current.map((item) => (item.method === method.method ? { ...item, enabled } : item)),
    );
    setSavingMethod(method.method);
    try {
      const updated = await updateAdminPaymentMethod(method.method, enabled);
      setMethods((current) =>
        current.map((item) => (item.method === method.method ? updated : item)),
      );
      showToast('success', `${updated.label} has been ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      setMethods((current) =>
        current.map((item) =>
          item.method === method.method ? { ...item, enabled: !enabled } : item,
        ),
      );
      showToast(
        'error',
        formatApiErrorMessage(error, 'Failed to update payment method.'),
      );
    } finally {
      setSavingMethod(null);
    }
  };

  return (
    <SettingsCard
      icon="credit-card"
      title="Payment Methods"
      subtitle="Enable or disable which payment options buyers see at checkout. Cash on Delivery is always available as the platform default and cannot be turned off.">
      <StatusToast message={toast} onClose={() => setToast(null)} />

      {loading ? (
        <View className="gap-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700" />
          ))}
        </View>
      ) : (
        <View className="divide-y divide-gray-100 dark:divide-slate-700">
          {methods.map((method) => {
            const meta = PAYMENT_METHOD_META[method.method] || {
              label: method.label,
              desc: '',
              icon: 'credit-card' as const,
              iconColor: isDark ? '#94a3b8' : '#6b7280',
            };
            const isAlwaysOn = Boolean(meta.alwaysOn);
            const isSaving = savingMethod === method.method;

            return (
              <View key={method.method} className="flex-row items-center gap-4 py-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
                  <Feather name={meta.icon} size={18} color={meta.iconColor} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                      {meta.label}
                    </Text>
                    {isAlwaysOn ? (
                      <View className="rounded bg-orange-100 px-1.5 py-0.5 dark:bg-orange-900/30">
                        <Text className="font-sans text-[10px] font-medium text-orange-700 dark:text-orange-300">
                          Default
                        </Text>
                      </View>
                    ) : null}
                    {isSaving ? <ActivityIndicator color="#16a34a" size="small" /> : null}
                  </View>
                  {meta.desc ? (
                    <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                      {meta.desc}
                    </Text>
                  ) : null}
                </View>
                <Switch
                  value={method.enabled}
                  disabled={isAlwaysOn || isSaving}
                  onValueChange={(value) => void handleToggle(method, value)}
                  trackColor={{ false: isDark ? '#475569' : '#d1d5db', true: '#16a34a' }}
                  thumbColor="#ffffff"
                />
              </View>
            );
          })}
        </View>
      )}
    </SettingsCard>
  );
}

function ChangePasswordPanel() {
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const changePassword = async () => {
    setSaving(true);
    setMessage(null);

    if (password.next !== password.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      setSaving(false);
      return;
    }
    if (password.next.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      setSaving(false);
      return;
    }

    try {
      await updateSellerPassword(password.current, password.next, password.confirm);
      setPassword({ current: '', next: '', confirm: '' });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: formatApiErrorMessage(error, 'Failed to change password.'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon="key" title="Change Password">
      <StatusToast message={message} onClose={() => setMessage(null)} />
      <View className="max-w-xl gap-4">
        <Field
          label="Current Password"
          secure
          value={password.current}
          onChangeText={(value) => setPassword((current) => ({ ...current, current: value }))}
        />
        <Field
          label="New Password"
          secure
          value={password.next}
          onChangeText={(value) => setPassword((current) => ({ ...current, next: value }))}
        />
        <Field
          label="Confirm New Password"
          secure
          value={password.confirm}
          onChangeText={(value) => setPassword((current) => ({ ...current, confirm: value }))}
        />
        <View className="items-end">
          <Pressable
            disabled={saving}
            onPress={() => void changePassword()}
            className={`rounded-xl bg-green-600 px-5 py-2.5 ${saving ? 'opacity-50' : ''}`}>
            <Text className="font-sans text-sm font-medium text-white">
              {saving ? 'Changing...' : 'Change Password'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SettingsCard>
  );
}

export function AdminSettingsNative() {
  const { user, refreshUser } = useNativeAuth();
  const roleLabel = user?.type || user?.role || 'Admin';

  return (
    <View className="mx-auto w-full max-w-3xl gap-6">
      <View>
        <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">Settings</Text>
        <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-500">
          Manage your admin profile, account, and platform payment options.
        </Text>
      </View>

      <ProfileSettingsPanel user={user} onSaved={refreshUser} />

      <SettingsCard icon="user" title="Account">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Role</Text>
          <Text className="font-sans text-sm capitalize text-gray-900 dark:text-slate-100">{roleLabel}</Text>
        </View>
      </SettingsCard>

      <PaymentMethodsPanel />
      <ChangePasswordPanel />
    </View>
  );
}
