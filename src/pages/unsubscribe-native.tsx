import Feather from '@expo/vector-icons/Feather';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTranslation } from '@/i18n';
import { unsubscribeNewsletter } from '@/utils/native-api';
import { useResolvedRouteParam } from '@/utils/route-params';

type UnsubscribeStatus = 'loading' | 'success' | 'error' | 'invalid';

function BrandLink() {
  return (
    <Link href="/" asChild>
      <Pressable className="items-center">
        <Text className="font-sans text-2xl font-extrabold tracking-tight text-green-600">
          Pyonea<Text className="text-gray-400">.com</Text>
        </Text>
      </Pressable>
    </Link>
  );
}

function StatusIcon({ status }: { status: UnsubscribeStatus }) {
  if (status === 'loading') {
    return (
      <View className="h-12 w-12 items-center justify-center">
        <ActivityIndicator color="#22c55e" size="large" />
      </View>
    );
  }

  const success = status === 'success';

  return (
    <View
      className={`h-16 w-16 items-center justify-center rounded-full ${
        success ? 'bg-green-100' : 'bg-red-50'
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
  const token = useResolvedRouteParam(params, 'token');
  const [status, setStatus] = useState<UnsubscribeStatus>(token ? 'loading' : 'invalid');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;

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
              ? t('unsubscribe_page.success_default', {
                  defaultValue: 'You have been unsubscribed.',
                })
              : t('unsubscribe_page.error_default', {
                  defaultValue: 'This unsubscribe link is invalid or has already been used.',
                }))
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus('error');
          setMessage(
            error instanceof Error
              ? error.message
              : t('unsubscribe_page.error_default', {
                  defaultValue: 'This unsubscribe link is invalid or has already been used.',
                })
          );
        }
      }
    };

    void unsubscribe();

    return () => controller.abort();
  }, [token, t]);

  const isSuccess = status === 'success';
  const title = isSuccess
    ? t('unsubscribe_page.success_title', { defaultValue: 'Unsubscribed' })
    : t('unsubscribe_page.error_title', { defaultValue: 'Link not valid' });
  const body =
    status === 'loading'
      ? t('unsubscribe_page.processing', { defaultValue: 'Processing your request...' })
      : status === 'invalid'
        ? t('unsubscribe_page.invalid_message', {
            defaultValue:
              'No unsubscribe token was found in this link. Please use the unsubscribe link from a Pyonea email.',
          })
        : message ||
          (isSuccess
            ? t('unsubscribe_page.success_default', {
                defaultValue: 'You have been unsubscribed.',
              })
            : t('unsubscribe_page.error_default', {
                defaultValue: 'This unsubscribe link is invalid or has already been used.',
              }));

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center px-4 py-10">
        <View className="w-full max-w-md">
          <View className="mb-8 text-center">
            <BrandLink />
          </View>

          <View className="items-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <StatusIcon status={status} />

            {status === 'loading' ? (
              <Text className="mt-4 text-center font-sans text-sm leading-6 text-gray-500">
                {body}
              </Text>
            ) : (
              <>
                <Text className="mt-4 text-center font-sans text-xl font-bold text-gray-900">
                  {title}
                </Text>
                <Text className="mt-4 text-center font-sans text-sm leading-relaxed text-gray-500">
                  {body}
                </Text>

                {isSuccess ? (
                  <Text className="mt-2 text-center font-sans text-xs leading-5 text-gray-400">
                    {t('unsubscribe_page.success_note', {
                      defaultValue:
                        'You will no longer receive marketing emails from Pyonea. Transactional emails such as order confirmations and password resets are not affected.',
                    })}
                  </Text>
                ) : null}

                <View className="w-full gap-2 pt-4">
                  <Pressable
                    onPress={() => router.push('/')}
                    className="rounded-xl bg-green-600 px-5 py-2.5">
                    <Text className="text-center font-sans text-sm font-semibold text-white">
                      {isSuccess
                        ? t('unsubscribe_page.back_home', { defaultValue: 'Back to Pyonea' })
                        : t('unsubscribe_page.go_home', { defaultValue: 'Go to Pyonea' })}
                    </Text>
                  </Pressable>

                  {isSuccess ? (
                    <Pressable
                      onPress={() => router.push('/')}
                      className="rounded-xl border border-gray-200 px-5 py-2.5">
                      <Text className="text-center font-sans text-sm text-gray-600">
                        {t('unsubscribe_page.resubscribe', {
                          defaultValue: 'Changed your mind? Re-subscribe',
                        })}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => Linking.openURL('mailto:support@pyonea.com')}
                      className="flex-row items-center justify-center gap-2 pt-1">
                      <Feather name="mail" color="#6b7280" size={16} />
                      <Text className="font-sans text-sm text-gray-500">
                        {t('unsubscribe_page.contact_support', { defaultValue: 'Contact support' })}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>

          <Text className="mt-6 text-center font-sans text-xs text-gray-400">
            {t('unsubscribe_page.footer', {
              year: new Date().getFullYear(),
              defaultValue: `© ${new Date().getFullYear()} Pyonea Marketplace · Yangon, Myanmar`,
            })}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
