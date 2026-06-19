import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, type Href } from 'expo-router';
import { useCallback, useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';


import { AppLayout } from '@/components/layout/app-layout';
import { useNativeAuth } from '@/context/native-auth';
import { useTheme } from '@/context/theme';
import {
  mergeRouteLang,
  normalizeLanguage,
  useAppTranslation,
  useLocalizedHref,
  type SupportedLanguage,
} from '@/i18n';
import { getRoleDestination, hasUserRole } from '@/utils/auth-routing';

const TELEGRAM_CHAT_URL = 'https://t.me/Pyonea';
const WHATSAPP_CHAT_URL = 'https://wa.me/959792115547';

/** NativeWind shadow-* on conditional Pressable classNames breaks Expo Router nav context. */
const languagePillActiveStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
} as const;

type AccountRowProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  onPress?: () => void;
  href?: Href;
  destructive?: boolean;
  trailing?: ReactNode;
  showChevron?: boolean;
};

function AccountSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 font-sans text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {children}
      </View>
    </View>
  );
}

function AccountDivider() {
  return <View className="ml-14 h-px bg-gray-100 dark:bg-slate-800" />;
}

function AccountRow({
  icon,
  label,
  description,
  onPress,
  href,
  destructive = false,
  trailing,
  showChevron = true,
}: AccountRowProps) {
  const { isDark } = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (href) {
      if (Platform.OS === 'web') router.push(href);
      else router.replace(href);
    }
  };

  const iconColor = destructive ? '#dc2626' : isDark ? '#94a3b8' : '#64748b';
  const labelColor = destructive
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-900 dark:text-slate-100';

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress && !href}
      className="min-h-[56px] flex-row items-center gap-3 px-4 py-3 active:bg-gray-50 dark:active:bg-slate-800/80">
      <View
        className={`h-9 w-9 items-center justify-center rounded-xl ${
          destructive ? 'bg-red-50 dark:bg-red-950/40' : 'bg-gray-100 dark:bg-slate-800'
        }`}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className={`font-sans text-sm font-semibold ${labelColor}`}>{label}</Text>
        {description ? (
          <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (showChevron && (onPress || href) ? (
          <Feather name="chevron-right" size={18} color={isDark ? '#64748b' : '#9ca3af'} />
        ) : null)}
    </Pressable>
  );
}

function ChatRow({
  icon,
  iconColor,
  label,
  description,
  onPress,
}: {
  icon: 'telegram' | 'whatsapp';
  iconColor: string;
  label: string;
  description: string;
  onPress: () => void;
}) {
  const { isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      className="min-h-[56px] flex-row items-center gap-3 px-4 py-3 active:bg-gray-50 dark:active:bg-slate-800/80">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800">
        <FontAwesome name={icon} size={18} color={iconColor} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">{label}</Text>
        <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
          {description}
        </Text>
      </View>
      <Feather name="external-link" size={18} color={isDark ? '#64748b' : '#9ca3af'} />
    </Pressable>
  );
}

export function AccountNative() {
  const { t, i18n } = useAppTranslation();
  const href = useLocalizedHref();
  const auth = useNativeAuth();
  const { isDark, toggleTheme } = useTheme();
  const activeLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const changeLanguage = useCallback(
    (nextLanguage: SupportedLanguage) => {
      void i18n.changeLanguage(nextLanguage);
    },
    [i18n],
  );

  const user = auth.user;
  const dashboardHref = user ? getRoleDestination(user) : null;

  const authHref = (path: string) =>
    mergeRouteLang(
      '/login',
      { returnTo: mergeRouteLang(path, {}, activeLanguage) },
      activeLanguage,
    ) as Href;

  const handleSignOut = () => {
    const runLogout = () => {
      void auth.logout().then(() => {
        router.replace(href('/account'));
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('account_page.sign_out_confirm', { defaultValue: 'Sign out of your account?' }))) {
        runLogout();
      }
      return;
    }

    Alert.alert(
      t('account_page.sign_out', { defaultValue: 'Sign Out' }),
      t('account_page.sign_out_confirm', { defaultValue: 'Sign out of your account?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        { text: t('account_page.sign_out', { defaultValue: 'Sign Out' }), style: 'destructive', onPress: runLogout },
      ],
    );
  };

  const accountLinks = useMemo(() => {
    if (!user) return [];

    const links: Array<{
      key: string;
      icon: keyof typeof Feather.glyphMap;
      label: string;
      description?: string;
      href: Href;
    }> = [
      {
        key: 'dashboard',
        icon: 'grid',
        label: t('account_page.dashboard', { defaultValue: 'Dashboard' }),
        description: t('account_page.dashboard_hint', {
          defaultValue: 'Orders, listings, and business tools',
        }),
        href: dashboardHref as Href,
      },
    ];

    if (hasUserRole(user, 'buyer')) {
      links.push(
        {
          key: 'orders',
          icon: 'shopping-bag',
          label: t('account_page.my_orders', { defaultValue: 'My Orders' }),
          href: '/buyer/dashboard?tab=orders' as Href,
        },
        {
          key: 'wishlist',
          icon: 'heart',
          label: t('account_page.wishlist', { defaultValue: 'Wishlist' }),
          href: '/wishlist' as Href,
        },
        {
          key: 'settings',
          icon: 'settings',
          label: t('account_page.settings', { defaultValue: 'Account Settings' }),
          description: t('account_page.settings_hint', {
            defaultValue: 'Profile, password, and preferences',
          }),
          href: '/buyer/dashboard?tab=settings' as Href,
        },
      );
    }

    if (hasUserRole(user, 'seller')) {
      links.push({
        key: 'wallet',
        icon: 'credit-card',
        label: t('account_page.seller_wallet', { defaultValue: 'Seller Wallet' }),
        href: '/seller/wallet' as Href,
      });
    }

    return links;
  }, [dashboardHref, t, user]);

  return (
    <AppLayout>
      <View className="bg-gray-50 dark:bg-gray-900">
        <View className="mx-auto w-full max-w-lg gap-6 px-4 py-4">
          {Platform.OS !== 'ios' ? (
            <View className="gap-1 px-1">
              <Text
                className="font-sans text-2xl font-bold text-gray-950 dark:text-slate-50"
                style={{ lineHeight: 40 }}
              >
                {t('account_page.title', { defaultValue: 'Account' })}
              </Text>
              <Text
                className="font-sans text-sm leading-6 text-gray-500 dark:text-slate-400"
                style={{ lineHeight: 24 }}
              >
                {user
                  ? t('account_page.subtitle_signed_in', {
                      defaultValue: 'Manage your account and app settings',
                    })
                  : t('account_page.subtitle_guest', {
                      defaultValue: 'Sign in to manage orders and preferences',
                    })}
              </Text>
            </View>
          ) : null}

        {auth.isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#16a34a" />
          </View>
        ) : null}

        {!auth.isLoading && !user ? (
          <View className="gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
            <Text className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
              {t('account_page.guest_prompt', {
                defaultValue: 'Sign in to access your dashboard, orders, and saved items.',
              })}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => router.push(authHref('/account'))}
                className="flex-1 items-center rounded-xl bg-green-600 px-4 py-3 active:bg-green-700">
                <Text className="font-sans text-sm font-bold text-white">
                  {t('account_page.sign_in', { defaultValue: 'Sign In' })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(href('/register'))}
                className="flex-1 items-center rounded-xl border border-green-600 px-4 py-3 active:bg-green-50 dark:active:bg-green-950/20">
                <Text className="font-sans text-sm font-bold text-green-600">
                  {t('account_page.create_account', { defaultValue: 'Create Account' })}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!auth.isLoading && user && accountLinks.length > 0 ? (
          <AccountSection title={t('account_page.section_account', { defaultValue: 'My Account' })}>
            {accountLinks.map((link, index) => (
              <View key={link.key}>
                {index > 0 ? <AccountDivider /> : null}
                <AccountRow
                  icon={link.icon}
                  label={link.label}
                  description={link.description}
                  href={link.href}
                />
              </View>
            ))}
          </AccountSection>
        ) : null}

        <AccountSection title={t('account_page.section_shopping', { defaultValue: 'Shopping' })}>
          <AccountRow
            icon="package"
            label={t('account_page.track_order', { defaultValue: 'Track Order' })}
            href={href('/track-order')}
          />
          <AccountDivider />
          <AccountRow
            icon="shuffle"
            label={t('account_page.compare', { defaultValue: 'Compare Products' })}
            href={href('/compare')}
          />
          <AccountDivider />
          <AccountRow
            icon="tag"
            label={t('account_page.local_deals', { defaultValue: 'Local Deals' })}
            description={t('account_page.local_deals_hint', {
              defaultValue: 'Coupon offers from verified sellers',
            })}
            href={href('/local-deals')}
          />
          {!user ? (
            <>
              <AccountDivider />
              <AccountRow
                icon="heart"
                label={t('account_page.wishlist', { defaultValue: 'Wishlist' })}
                href={authHref('/wishlist')}
              />
            </>
          ) : null}
        </AccountSection>

        <AccountSection title={t('account_page.section_preferences', { defaultValue: 'Preferences' })}>
          <AccountRow
            icon={isDark ? 'moon' : 'sun'}
            label={t('account_page.appearance', { defaultValue: 'Appearance' })}
            description={
              isDark
                ? t('account_page.theme_dark', { defaultValue: 'Dark mode' })
                : t('account_page.theme_light', { defaultValue: 'Light mode' })
            }
            showChevron={false}
            trailing={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#d1d5db', true: '#16a34a' }}
                thumbColor="#ffffff"
              />
            }
          />
          <AccountDivider />
          <View className="flex-row items-center gap-3 px-4 py-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800">
              <Feather name="globe" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                {t('account_page.language', { defaultValue: 'Language' })}
              </Text>
            </View>
            <View className="flex-row rounded-lg bg-gray-100 p-0.5 dark:bg-slate-800">
              {(['en', 'my'] as const).map((code) => {
                const active = activeLanguage === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => changeLanguage(code)}
                    className={
                      active
                        ? 'rounded-md bg-white px-3 py-1.5 dark:bg-slate-900'
                        : 'rounded-md px-3 py-1.5'
                    }
                    style={active ? languagePillActiveStyle : undefined}>
                    <Text
                      className={`font-sans text-xs font-bold ${
                        active ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-slate-400'
                      }`}>
                      {code === 'en' ? 'EN' : 'MY'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </AccountSection>

        <AccountSection title={t('account_page.section_live_chat', { defaultValue: 'Live Chat' })}>
          <ChatRow
            icon="telegram"
            iconColor="#229ED9"
            label={t('account_page.telegram_chat', { defaultValue: 'Telegram' })}
            description="@Pyonea"
            onPress={() => void Linking.openURL(TELEGRAM_CHAT_URL)}
          />
          <AccountDivider />
          <ChatRow
            icon="whatsapp"
            iconColor="#25D366"
            label={t('account_page.whatsapp_chat', { defaultValue: 'WhatsApp' })}
            description="+95 979 211 5547"
            onPress={() => void Linking.openURL(WHATSAPP_CHAT_URL)}
          />
        </AccountSection>

        <AccountSection title={t('account_page.section_support', { defaultValue: 'Support & Contact' })}>
          <AccountRow
            icon="mail"
            label={t('account_page.email_support', { defaultValue: 'Email Support' })}
            description="contact@pyonea.com"
            onPress={() => void Linking.openURL('mailto:contact@pyonea.com')}
          />
          <AccountDivider />
          <AccountRow
            icon="phone"
            label={t('account_page.phone_support', { defaultValue: 'Phone Support' })}
            description="+95 979 211 5547"
            onPress={() => void Linking.openURL('tel:+959792115547')}
          />
          <AccountDivider />
          <AccountRow
            icon="external-link"
            label={t('account_page.contact_us', { defaultValue: 'Contact Page' })}
            onPress={() => router.push(href('/contact'))}
          />
        </AccountSection>

        <AccountSection title={t('account_page.section_legal', { defaultValue: 'Legal' })}>
          <AccountRow
            icon="file-text"
            label={t('account_page.terms', { defaultValue: 'Terms of Service' })}
            onPress={() => router.push(href('/terms'))}
          />
          <AccountDivider />
          <AccountRow
            icon="shield"
            label={t('account_page.privacy', { defaultValue: 'Privacy Policy' })}
            onPress={() => router.push(href('/privacy-policy'))}
          />
        </AccountSection>

        {user ? (
          <AccountSection title={t('account_page.section_session', { defaultValue: 'Session' })}>
            <AccountRow
              icon="log-out"
              label={t('account_page.sign_out', { defaultValue: 'Sign Out' })}
              onPress={handleSignOut}
              destructive
              showChevron={false}
            />
          </AccountSection>
        ) : null}

        <Text className="px-1 text-center font-sans text-xs text-gray-400 dark:text-slate-500">
          Pyonea · {t('footer.rights_reserved', { defaultValue: 'All rights reserved.' })}
        </Text>
      </View>
    </View>
    </AppLayout>
  );
}
