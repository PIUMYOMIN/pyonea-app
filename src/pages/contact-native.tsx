import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_4XL_CLASS } from '@/constants/layout';
import { useAppTranslation } from '@/i18n';

type FeatherName = ComponentProps<typeof Feather>['name'];

const phoneNumber = '+95 9 792 115 547';
const emailAddress = 'contact@pyonea.com';
const officeAddress = 'Bet 59-60, 19 Street, Aungmyaetharsan Township, Mandalay, Myanmar';

function PageShell({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}>
        <View className="bg-gray-50 py-10 dark:bg-slate-950 sm:py-12">
          <View className={SITE_CONTAINER_4XL_CLASS}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`rounded-lg border border-gray-100 bg-white p-6 shadow-md shadow-gray-200/70 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50 ${className}`}>
      {children}
    </View>
  );
}

function ContactInfoItem({
  icon,
  title,
  children,
}: {
  icon: FeatherName;
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <Feather name={icon} color="#16a34a" size={24} />
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-base font-medium text-gray-950 dark:text-white">{title}</Text>
        <Text className="mt-0.5 font-sans text-base leading-6 text-gray-600 dark:text-gray-400">
          {children}
        </Text>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  multiline = false,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  prefix?: string;
}) {
  return (
    <View>
      <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Text>
      <View
        className={`flex-row rounded border bg-white dark:bg-gray-700 ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}>
        {prefix ? (
          <View className="justify-center pl-3">
            <Text className="font-sans text-base text-gray-500 dark:text-gray-400">{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          className={`min-h-11 flex-1 px-2 py-2 font-sans text-base text-gray-900 dark:text-white ${
            multiline ? 'min-h-28 text-top' : ''
          }`}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholderTextColor="#9ca3af"
        />
      </View>
      {error ? (
        <Text className="mt-1 font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
      ) : null}
    </View>
  );
}

export function ContactNative() {
  const { t } = useAppTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = t('contact.validation.name_required');
    if (!email.trim()) {
      nextErrors.email = t('contact.validation.email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = t('contact.validation.email_invalid');
    }
    if (phone.trim() && !/^[0-9]{7,10}$/.test(phone.trim())) {
      nextErrors.phone = t('contact.validation.phone_invalid');
    }
    if (!subject.trim()) nextErrors.subject = t('contact.validation.subject_required');
    if (!message.trim()) nextErrors.message = t('contact.validation.message_required');

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    setSubmitSuccess(false);
    setSubmitError('');

    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    }, 450);
  };

  return (
    <PageShell>
      <Text className="mb-2 text-center font-sans text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
        {t('contact.title')}
      </Text>
      <Text className="mb-8 text-center font-sans text-base leading-6 text-gray-600 dark:text-gray-400">
        {t('contact.subtitle')}
      </Text>

      <View className="gap-8 md:flex-row md:items-start">
        <Panel className="w-full md:w-0 md:flex-1">
          <Text className="mb-4 font-sans text-xl font-semibold text-gray-900 dark:text-white">
            {t('contact.info.title')}
          </Text>
          <View className="gap-4">
            <ContactInfoItem icon="phone" title={t('contact.info.phone')}>
              {phoneNumber}
            </ContactInfoItem>
            <ContactInfoItem icon="mail" title={t('contact.info.email')}>
              {emailAddress}
            </ContactInfoItem>
            <ContactInfoItem icon="map-pin" title={t('contact.info.address')}>
              {officeAddress}
            </ContactInfoItem>
          </View>

          <View className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <Text className="mb-2 font-sans text-base font-medium text-gray-900 dark:text-white">
              {t('contact.info.hours')}
            </Text>
            <Text className="font-sans text-base leading-6 text-gray-600 dark:text-gray-400">
              {t('contact.info.mon_fri')}
            </Text>
            <Text className="font-sans text-base leading-6 text-gray-600 dark:text-gray-400">
              {t('contact.info.sat')}
            </Text>
            <Text className="font-sans text-base leading-6 text-gray-600 dark:text-gray-400">
              {t('contact.info.sun')}
            </Text>
          </View>
        </Panel>

        <Panel className="w-full md:w-0 md:flex-1">
          <Text className="mb-4 font-sans text-xl font-semibold text-gray-900 dark:text-white">
            {t('contact.form.title')}
          </Text>

          {submitSuccess ? (
            <View className="mb-4 border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-900/30">
              <Text className="font-sans text-sm text-green-700 dark:text-green-300">
                {t('contact.form.success')}
              </Text>
            </View>
          ) : null}

          {submitError ? (
            <View className="mb-4 border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-900/30">
              <Text className="font-sans text-sm text-red-700 dark:text-red-300">
                {submitError}
              </Text>
            </View>
          ) : null}

          <View className="gap-4">
            <Field
              label={`${t('contact.form.name')} *`}
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
            <Field
              label={`${t('contact.form.email')} *`}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              error={errors.email}
            />
            <Field
              label={t('contact.form.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              prefix="+95"
              error={errors.phone}
            />
            <Field
              label={`${t('contact.form.subject')} *`}
              value={subject}
              onChangeText={setSubject}
              error={errors.subject}
            />
            <Field
              label={`${t('contact.form.message')} *`}
              value={message}
              onChangeText={setMessage}
              multiline
              error={errors.message}
            />

            <Pressable
              className="min-h-11 flex-row items-center justify-center rounded bg-green-600 py-2 disabled:opacity-50 dark:bg-green-700"
              disabled={isSubmitting}
              onPress={handleSubmit}>
              {isSubmitting ? <Feather name="loader" color="#ffffff" size={18} /> : null}
              <Text className={`font-sans text-base font-semibold text-white ${isSubmitting ? 'ml-2' : ''}`}>
                {isSubmitting ? t('contact.form.submitting') : t('contact.form.submit')}
              </Text>
            </Pressable>
          </View>
        </Panel>
      </View>
    </PageShell>
  );
}
