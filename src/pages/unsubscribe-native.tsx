import Feather from '@expo/vector-icons/Feather';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTranslation } from '@/i18n';
import { unsubscribeNewsletter } from '@/utils/native-api';

type UnsubscribeStatus = 'loading' | 'success' | 'error' | 'invalid';

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function BrandLink() {
  return (
    <Link href="/" asChild>
      <Pressable className="items-center">
        <Text className="font-brand text-3xl text-green-600">
          Pyonea<Text className="font-sans text-gray-400 dark:text-slate-500">.com</Text>
        </Text>
      </Pressable>
    </Link>
  );
}

function StatusIcon({ status }: { status: UnsubscribeStatus }) {
  if (status === 'loading') {
    return (
      <View className="h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  const success = status === 'success';

  return (
    <View
      className={`h-16 w-16 items-center justify-center rounded-full ${
        success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'
      }`}>
      <Feather
        name={success ? 'check-circle' : 'alert-circle'}
        color={success ? '#16a34a' : '#ef4444'}
        size={34}
      />
    </View>
  );
}

export function UnsubscribeNative() {
  const { t } = useAppTranslation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const token = useMemo(() => getParam(params.token)?.trim() || '', [params.token]);
  const [status, setStatus] = useState<UnsubscribeStatus>(token ? 'loading' : 'invalid');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    const unsubscribe = async () => {
      setStatus('loading');
      setMessage('');
      try {
        const result = await unsubscribeNewsletter(token, controller.signal);
        if (controller.signal.aborted) return;

        setStatus(result.success ? 'success' : 'error');
        setMessage(
          result.message ||
            (result.success
              ? t('unsubscribe_page.success_default')
              : t('unsubscribe_page.error_default'))
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : t('unsubscribe_page.error_default'));
        }
      }
    };

    void unsubscribe();

    return () => controller.abort();
  }, [token, t]);

  const isSuccess = status === 'success';
  const title = isSuccess ? t('unsubscribe_page.success_title') : t('unsubscribe_page.error_title');
  const body =
    status === 'loading'
      ? t('unsubscribe_page.processing')
      : status === 'invalid'
        ? t('unsubscribe_page.invalid_message')
        : message || (isSuccess ? t('unsubscribe_page.success_default') : t('unsubscribe_page.error_default'));

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950">
      <View className="flex-1 items-center justify-center px-4 py-10">
        <View className="w-full max-w-md">
          <View className="mb-8">
            <BrandLink />
          </View>

          <View className="items-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <StatusIcon status={status} />

            {status === 'loading' ? (
              <Text className="mt-5 text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                {body}
              </Text>
            ) : (
              <>
                <Text className="mt-5 text-center font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
                  {title}
                </Text>
                <Text className="mt-3 text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                  {body}
                </Text>

                {isSuccess ? (
                  <Text className="mt-3 text-center font-sans text-xs leading-5 text-gray-400 dark:text-slate-500">
                    {t('unsubscribe_page.success_note')}
                  </Text>
                ) : null}

                <View className="mt-6 w-full gap-3">
                  <Pressable
                    onPress={() => router.push('/')}
                    className="rounded-xl bg-green-600 px-5 py-3">
                    <Text className="text-center font-sans text-sm font-semibold text-white">
                      {isSuccess ? t('unsubscribe_page.back_home') : t('unsubscribe_page.go_home')}
                    </Text>
                  </Pressable>

                  {isSuccess ? (
                    <Pressable
                      onPress={() => router.push('/')}
                      className="rounded-xl border border-gray-200 px-5 py-3 dark:border-slate-700">
                      <Text className="text-center font-sans text-sm text-gray-600 dark:text-slate-300">
                        {t('unsubscribe_page.resubscribe')}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => Linking.openURL('mailto:support@pyonea.com')}
                      className="flex-row items-center justify-center gap-2 pt-1">
                      <Feather name="mail" color="#6b7280" size={16} />
                      <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                        {t('unsubscribe_page.contact_support')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>

          <Text className="mt-6 text-center font-sans text-xs text-gray-400 dark:text-slate-500">
            {t('unsubscribe_page.footer', { year: new Date().getFullYear() })}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
