import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useNativeAuth } from '@/context/native-auth';
import { useAppTranslation } from '@/i18n';
import {
  getPostAuthDestination,
  hasUserRole,
  needsEmailVerification,
} from '@/utils/auth-routing';
import {
  resendBuyerVerificationEmail,
  verifyEmailWithCode,
  verifyEmailWithLink,
} from '@/utils/native-api';
import { useMergedRouteParams } from '@/utils/route-params';

function EmailCodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || '');

  const focusInput = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(index, 5))]?.focus();
  };

  const handleDigitChange = (text: string, index: number) => {
    const cleanValue = text.replace(/\D/g, '');

    if (cleanValue.length > 1) {
      onChange(cleanValue.slice(0, 6));
      focusInput(Math.min(cleanValue.length, 6) - 1);
      return;
    }

    const nextDigits = value.split('');
    nextDigits[index] = cleanValue;
    onChange(nextDigits.join('').slice(0, 6));

    if (cleanValue && index < 5) {
      focusInput(index + 1);
    }
  };

  return (
    <View className="flex-row justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <TextInput
          key={`email-code-${index}`}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          value={digit}
          onChangeText={(text) => handleDigitChange(text, index)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
              focusInput(index - 1);
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          className={`h-14 w-11 rounded-xl border-2 text-center font-sans text-2xl font-bold sm:h-16 sm:w-12 ${
            disabled
              ? 'border-gray-200 bg-gray-50 text-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600'
              : 'border-gray-300 bg-white text-gray-900 focus:border-green-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100'
          }`}
        />
      ))}
    </View>
  );
}

type LinkStatus = 'idle' | 'verifying' | 'success' | 'error';
type CodeStatus = 'idle' | 'loading' | 'success' | 'error';

export function EmailVerificationNative({
  linkId,
  linkHash,
}: {
  linkId?: string;
  linkHash?: string;
}) {
  const { t } = useAppTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string;
    expires?: string;
    signature?: string;
  }>();
  const mergedParams = useMergedRouteParams(params);
  const auth = useNativeAuth();
  const { user, isLoading: authLoading, refreshUser, logout } = auth;

  const [code, setCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle');
  const [codeMessage, setCodeMessage] = useState('');
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(
    linkId && linkHash ? 'verifying' : 'idle'
  );
  const [linkMessage, setLinkMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const linkSuccessKeyRef = useRef<string | null>(null);

  const returnTo = mergedParams.returnTo || undefined;
  const expires = typeof mergedParams.expires === 'string' ? mergedParams.expires : '';
  const signature = typeof mergedParams.signature === 'string' ? mergedParams.signature : '';

  const redirectAfterSuccess = useCallback(() => {
    if (user) {
      router.replace(getPostAuthDestination(user, returnTo));
      return;
    }
    router.replace('/products');
  }, [returnTo, router, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setResendCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!auth.user) {
      router.replace('/login');
    }
  }, [auth.user, authLoading, router]);

  useEffect(() => {
    if (!linkId || !linkHash) return;

    const paramsKey = `${linkId}|${linkHash}|${expires}|${signature}`;
    if (linkSuccessKeyRef.current === paramsKey) return;

    if (!expires || !signature) {
      setLinkStatus('error');
      setLinkMessage(
        t('email_verification.link_failed_desc', {
          message: 'This verification link is incomplete or malformed.',
        })
      );
      return;
    }

    setLinkStatus('verifying');
    const controller = new AbortController();

    void verifyEmailWithLink(linkId, linkHash, expires, signature, controller.signal)
      .then(async (result) => {
        await refreshUser().catch(() => undefined);
        linkSuccessKeyRef.current = paramsKey;
        setLinkStatus('success');
        setLinkMessage(
          result.message || t('email_verification.success_default_msg')
        );
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setLinkStatus('error');
        setLinkMessage(
          error instanceof Error
            ? error.message
            : t('email_verification.link_failed_desc', {
                message: 'Verification failed. The link may be invalid or expired.',
              })
        );
      });

    return () => controller.abort();
  }, [expires, linkHash, linkId, refreshUser, signature, t]);

  const submitCode = useCallback(async () => {
    if (code.replace(/\s/g, '').length !== 6) return;

    setCodeStatus('loading');
    setCodeMessage('');

    try {
      const result = await verifyEmailWithCode(code);
      await refreshUser().catch(() => undefined);
      setCodeStatus('success');
      setCodeMessage(result.message || t('email_verification.success_default_msg'));
      setLinkStatus('success');
    } catch (error) {
      setCodeStatus('error');
      setCodeMessage(
        error instanceof Error
          ? error.message
          : t('email_verification.resend_failed')
      );
    }
  }, [code, refreshUser, t]);

  useEffect(() => {
    if (code.replace(/\s/g, '').length === 6 && codeStatus === 'idle') {
      void submitCode();
    }
  }, [code, codeStatus, submitCode]);

  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
    if (codeStatus === 'error') {
      setCodeStatus('idle');
      setCodeMessage('');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setResendMsg('');

    try {
      await resendBuyerVerificationEmail();
      setResendMsg(t('email_verification.resend_success'));
      setCode('');
      setCodeStatus('idle');
      setCodeMessage('');
      setResendCooldown(60);
    } catch (error) {
      setResendMsg(
        error instanceof Error
          ? error.message
          : t('email_verification.resend_failed')
      );
    } finally {
      setResending(false);
    }
  };

  const isSuccess = linkStatus === 'success' || codeStatus === 'success';

  useEffect(() => {
    if (authLoading || !user || isSuccess || linkStatus === 'verifying') return;
    if (!needsEmailVerification(user)) {
      redirectAfterSuccess();
    }
  }, [authLoading, isSuccess, linkStatus, redirectAfterSuccess, user]);

  if (authLoading || !user) {
    return (
      <AppLayout>
        <View className="min-h-[50vh] items-center justify-center">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      </AppLayout>
    );
  }

  const alreadyVerified = Boolean(user.emailVerifiedAt) && linkStatus !== 'verifying';

  if (alreadyVerified) {
    return (
      <AppLayout>
        <View className="items-center px-4 py-12">
          <View className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <View className="mb-4 items-center">
              <Feather name="check-circle" color="#22c55e" size={56} />
            </View>
            <Text className="text-center font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
              {t('email_verification.already_verified_title')}
            </Text>
            <Text className="mt-2 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('email_verification.already_verified_desc')}
            </Text>
            <Pressable
              onPress={redirectAfterSuccess}
              className="mt-6 rounded-xl bg-green-600 px-5 py-3">
              <Text className="text-center font-sans text-sm font-semibold text-white">
                {hasUserRole(user, 'admin')
                  ? t('email_verification.go_admin')
                  : hasUserRole(user, 'seller')
                    ? t('email_verification.go_seller')
                    : t('email_verification.start_shopping')}
              </Text>
            </Pressable>
          </View>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View className="items-center px-4 py-8 sm:py-12">
        <View className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {linkStatus === 'verifying' ? (
            <View className="items-center gap-4 py-6">
              <ActivityIndicator size="large" color="#16a34a" />
              <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                {t('email_verification.verifying_title')}
              </Text>
              <Text className="text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                {t('email_verification.verifying_desc')}
              </Text>
            </View>
          ) : null}

          {isSuccess ? (
            <View className="items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <Feather name="check-circle" color="#16a34a" size={36} />
              </View>
              <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
                {t('email_verification.success_title')}
              </Text>
              <Text className="text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                {linkMessage || codeMessage || t('email_verification.success_default_msg')}
              </Text>
              <Pressable
                onPress={redirectAfterSuccess}
                className="w-full rounded-xl bg-green-600 px-5 py-3">
                <Text className="text-center font-sans text-sm font-semibold text-white">
                  {hasUserRole(user, 'admin')
                    ? t('email_verification.go_admin')
                    : hasUserRole(user, 'seller')
                      ? t('email_verification.go_seller')
                      : t('email_verification.start_shopping')}
                </Text>
              </Pressable>
              <Pressable onPress={() => router.replace('/')}>
                <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">
                  {t('email_verification.back_home')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!isSuccess && linkStatus !== 'verifying' ? (
            <View className="gap-6">
              <View className="items-center">
                <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/30">
                  <Feather name="mail" color="#16a34a" size={28} />
                </View>
                <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                  {t('email_verification.check_email_title')}
                </Text>
                <Text className="mt-2 text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                  {t('email_verification.check_email_desc', {
                    email: user.email || 'your email address',
                  })}
                </Text>
              </View>

              {linkStatus === 'error' ? (
                <View className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/30">
                  <Text className="font-sans text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('email_verification.link_failed_title')}
                  </Text>
                  <Text className="mt-1 font-sans text-xs text-amber-700 dark:text-amber-300">
                    {t('email_verification.link_failed_desc', { message: linkMessage })}
                  </Text>
                </View>
              ) : null}

              <View className="gap-3">
                <Text className="text-center font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t('email_verification.enter_6_digit')}
                </Text>
                <EmailCodeInput
                  value={code}
                  onChange={handleCodeChange}
                  disabled={codeStatus === 'loading'}
                />
                {codeStatus === 'loading' ? (
                  <View className="flex-row items-center justify-center gap-2">
                    <ActivityIndicator size="small" color="#64748b" />
                    <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                      {t('email_verification.verifying')}
                    </Text>
                  </View>
                ) : null}
                {codeStatus === 'error' ? (
                  <Text className="text-center font-sans text-sm text-red-600 dark:text-red-400">
                    {codeMessage}
                  </Text>
                ) : null}
              </View>

              {codeStatus !== 'loading' ? (
                <Pressable
                  onPress={() => void submitCode()}
                  disabled={code.replace(/\s/g, '').length < 6}
                  className={`flex-row items-center justify-center gap-2 rounded-xl px-5 py-3 ${
                    code.replace(/\s/g, '').length < 6
                      ? 'bg-green-400/70'
                      : 'bg-green-600'
                  }`}>
                  <Feather name="key" color="#ffffff" size={16} />
                  <Text className="font-sans text-sm font-semibold text-white">
                    {t('email_verification.verify_email_btn')}
                  </Text>
                </Pressable>
              ) : null}

              <View className="relative py-1">
                <View className="absolute inset-0 items-center justify-center">
                  <View className="h-px w-full bg-gray-100 dark:bg-slate-800" />
                </View>
                <Text className="self-center bg-white px-2 font-sans text-xs text-gray-400 dark:bg-slate-900 dark:text-slate-500">
                  {t('email_verification.didnt_get')}
                </Text>
              </View>

              <View className="items-center gap-2">
                <Pressable
                  onPress={() => void handleResend()}
                  disabled={resending || resendCooldown > 0}
                  className="flex-row items-center gap-1.5">
                  <Feather
                    name="refresh-cw"
                    color={resending || resendCooldown > 0 ? '#9ca3af' : '#16a34a'}
                    size={16}
                  />
                  <Text
                    className={`font-sans text-sm font-medium ${
                      resending || resendCooldown > 0
                        ? 'text-gray-400 dark:text-slate-500'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                    {resending
                      ? t('email_verification.resend_sending')
                      : resendCooldown > 0
                        ? t('email_verification.resend_in', { seconds: resendCooldown })
                        : t('email_verification.resend_code')}
                  </Text>
                </Pressable>
                {resendMsg ? (
                  <Text
                    className={`font-sans text-xs ${
                      resendMsg.toLowerCase().includes('sent')
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-500 dark:text-red-400'
                    }`}>
                    {resendMsg}
                  </Text>
                ) : null}
                <Text className="text-center font-sans text-xs text-gray-400 dark:text-slate-500">
                  {t('email_verification.check_spam')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <Text className="mt-4 text-center font-sans text-xs text-gray-400 dark:text-slate-500">
          {t('email_verification.wrong_account')}{' '}
          <Text
            onPress={() => {
              void logout().finally(() => router.replace('/login'));
            }}
            className="font-sans text-xs text-green-600 dark:text-green-400">
            {t('email_verification.sign_out')}
          </Text>
        </Text>
      </View>
    </AppLayout>
  );
}
