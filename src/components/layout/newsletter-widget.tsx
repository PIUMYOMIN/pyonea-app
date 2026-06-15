import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAppTranslation } from '@/i18n';
import { subscribeNewsletter ,
  formatApiErrorMessage,
} from '@/utils/native-api';

type NewsletterWidgetProps = {
  variant?: 'default' | 'footer';
  source?: string;
};

export function NewsletterWidget({ variant = 'default', source = 'website' }: NewsletterWidgetProps) {
  const { t } = useAppTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showName, setShowName] = useState(false);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('loading');
    setMessage('');

    try {
      const result = await subscribeNewsletter(trimmed, source, name.trim() || undefined);
      setStatus(result.success ? 'success' : 'error');
      setMessage(
        result.message ||
          (result.success
            ? t('footer.newsletter_confirm_message')
            : t('footer.newsletter_error_message')),
      );
      if (result.success) {
        setEmail('');
        setName('');
      } else {
        setTimeout(() => setStatus('idle'), 4000);
      }
    } catch (error) {
      setStatus('error');
      setMessage(formatApiErrorMessage(error, t('footer.newsletter_error_message')));
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  if (status === 'success') {
    return (
      <View
        className={`flex-row items-center gap-3 ${
          variant === 'footer'
            ? ''
            : 'rounded-xl border border-green-200 bg-green-50 p-4 text-green-700'
        }`}>
        <Text className="text-2xl">✉️</Text>
        <View className="min-w-0 flex-1">
          <Text
            className={`font-sans text-sm font-semibold ${
              variant === 'footer' ? 'text-white' : 'text-green-700'
            }`}>
            {t('footer.newsletter_success_title')}
          </Text>
          <Text
            className={`mt-0.5 font-sans text-xs ${
              variant === 'footer' ? 'text-green-200' : 'text-green-600'
            }`}>
            {message}
          </Text>
        </View>
      </View>
    );
  }

  if (variant === 'footer') {
    return (
      <View className="gap-2">
        <Text className="font-sans text-sm font-semibold text-white">
          {t('footer.newsletter_title')}
        </Text>
        <Text className="font-sans text-xs text-green-200">{t('footer.newsletter_subtitle')}</Text>
        <View className="mt-3 flex-row gap-2">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('footer.newsletter_email_placeholder')}
            placeholderTextColor="#bbf7d0"
            keyboardType="email-address"
            autoCapitalize="none"
            className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-sans text-sm text-white"
          />
          <Pressable
            onPress={() => void submit()}
            disabled={status === 'loading'}
            className="shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2 disabled:opacity-60">
            <Text className="whitespace-nowrap font-sans text-sm font-semibold text-green-700">
              {status === 'loading' ? '…' : t('footer.newsletter_subscribe')}
            </Text>
          </Pressable>
        </View>
        {status === 'error' && message ? (
          <Text className="font-sans text-xs text-red-300">{message}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 p-6 text-white sm:p-8">
      <Text className="font-sans text-xl font-bold text-white">{t('footer.newsletter_card_title')}</Text>
      <Text className="mt-1 mb-5 font-sans text-sm text-green-100">{t('footer.newsletter_card_subtitle')}</Text>
      <View className="gap-3">
        {showName ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('footer.newsletter_name_placeholder')}
            placeholderTextColor="#bbf7d0"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-sans text-sm text-white"
          />
        ) : null}
        <View className="flex-row gap-2">
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (!showName && value.includes('@')) setShowName(true);
            }}
            placeholder={t('footer.newsletter_email_input')}
            placeholderTextColor="#bbf7d0"
            keyboardType="email-address"
            autoCapitalize="none"
            className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-sans text-sm text-white"
          />
          <Pressable
            onPress={() => void submit()}
            disabled={status === 'loading'}
            className="shrink-0 items-center justify-center rounded-xl bg-white px-5 py-2.5 disabled:opacity-60">
            <Text className="whitespace-nowrap font-sans text-sm font-semibold text-green-700">
              {status === 'loading' ? t('footer.newsletter_subscribing') : t('footer.newsletter_subscribe')}
            </Text>
          </Pressable>
        </View>
        {status === 'error' && message ? (
          <Text className="font-sans text-xs text-red-300">{message}</Text>
        ) : null}
        <Text className="font-sans text-xs text-green-200">{t('footer.newsletter_privacy_note')}</Text>
      </View>
    </View>
  );
}
