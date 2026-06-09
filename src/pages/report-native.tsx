import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useAppTranslation } from '@/i18n';
import { submitReport, type SubmitReportPayload } from '@/utils/native-api';

const categories = [
  'bug',
  'payment',
  'order',
  'seller',
  'product',
  'account',
  'content',
  'billing',
  'delivery',
  'safety',
  'suggestion',
  'other',
];

const priorities = [
  { value: 'low', cls: 'text-gray-600 dark:text-slate-400' },
  { value: 'medium', cls: 'text-blue-600 dark:text-blue-400' },
  { value: 'high', cls: 'text-orange-600 dark:text-orange-400' },
  { value: 'critical', cls: 'text-red-600 dark:text-red-400' },
];

const slaInfo = [
  { priority: 'critical', hours: '4', color: '#dc2626' },
  { priority: 'high', hours: '12', color: '#ea580c' },
  { priority: 'medium', hours: '48', color: '#2563eb' },
  { priority: 'low', hours: '120', color: '#64748b' },
];

const initialForm: SubmitReportPayload = {
  category: '',
  priority: 'medium',
  subject: '',
  description: '',
  related_order_id: '',
  related_url: '',
  guest_name: '',
  guest_email: '',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-1.5 font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
      {children}
    </Text>
  );
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <Text className="mt-1 font-sans text-xs text-red-500">{children}</Text>;
}

export function ReportNative() {
  const { t } = useAppTranslation();
  const [form, setForm] = useState<SubmitReportPayload>(initialForm);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [showContext, setShowContext] = useState(false);

  const tr = (key: string, options?: Record<string, unknown>) =>
    t(`subscription.report.${key}`, options);

  const update = (key: keyof SubmitReportPayload, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setGeneralError('');
  };

  const canSubmit =
    Boolean(form.category) &&
    form.subject.trim().length >= 5 &&
    form.description.trim().length >= 20 &&
    Boolean(form.guest_name?.trim()) &&
    Boolean(form.guest_email?.trim());

  const resetForm = () => {
    setTicketId('');
    setGeneralError('');
    setForm(initialForm);
    setShowContext(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setGeneralError('');

    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => String(value || '').trim())
      ) as SubmitReportPayload;
      const result = await submitReport(payload);
      setTicketId(result.ticketId);
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : tr('form.submit_error'));
    } finally {
      setLoading(false);
    }
  };

  if (ticketId) {
    return (
      <AppLayout>
        <View className="min-h-screen items-center justify-center bg-gray-50 px-4 py-16 dark:bg-slate-900">
          <View className="w-full max-w-md items-center rounded-2xl bg-white p-10 shadow-xl shadow-gray-200/70 dark:bg-slate-800 dark:shadow-slate-950/50">
            <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Feather name="check-circle" color="#16a34a" size={46} />
            </View>
            <Text className="mb-2 text-center font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
              {tr('success.title')}
            </Text>
            <Text className="mb-6 text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
              {tr('success.message')}
            </Text>

            <View className="mb-6 w-full rounded-2xl border border-green-200 bg-green-50 px-8 py-5 dark:border-green-800 dark:bg-green-900/20">
              <Text className="mb-2 text-center font-sans text-xs font-semibold uppercase tracking-widest text-green-700 dark:text-green-400">
                {tr('success.ticket_id')}
              </Text>
              <Text className="text-center font-mono text-2xl font-black tracking-widest text-green-800 dark:text-green-300">
                {ticketId}
              </Text>
            </View>

            <Text className="mb-6 text-center font-sans text-xs text-gray-400 dark:text-slate-500">
              {tr('success.email_notice')}
            </Text>

            <View className="w-full gap-3">
              <Link href="/my-reports" asChild>
                <Pressable className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 py-3">
                  <Feather name="inbox" color="#ffffff" size={16} />
                  <Text className="font-sans text-sm font-semibold text-white">
                    {tr('success.view_my_reports')}
                  </Text>
                  <Feather name="arrow-right" color="#ffffff" size={16} />
                </Pressable>
              </Link>
              <Pressable
                onPress={resetForm}
                className="rounded-xl border border-gray-300 py-3 dark:border-slate-600">
                <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {tr('success.submit_another')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}>
      <View className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-slate-900">
        <View className="mx-auto w-full max-w-4xl">
          <View className="mb-8 items-center">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
              <Feather name="inbox" color="#16a34a" size={28} />
            </View>
            <Text className="text-center font-sans text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl">
              {tr('title')}
            </Text>
            <Text className="mt-2 max-w-md text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
              {tr('subtitle')}
            </Text>
            <Link href="/my-reports" asChild>
              <Text className="mt-3 font-sans text-sm font-medium text-green-600 dark:text-green-400">
                {tr('my_reports_link')}
              </Text>
            </Link>
          </View>

          <View className="gap-6 lg:flex-row">
            <View className="min-w-0 flex-1 lg:flex-[2]">
              <View className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                {generalError ? (
                  <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <Feather name="alert-triangle" color="#dc2626" size={17} />
                    <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">
                      {generalError}
                    </Text>
                  </View>
                ) : null}

                <View className="gap-5">
                  <View className="gap-4 border-b border-gray-100 pb-5 dark:border-slate-700 sm:flex-row">
                    <View className="flex-1">
                      <FieldLabel>{tr('form.guest_name')} *</FieldLabel>
                      <TextInput
                        value={form.guest_name}
                        onChangeText={(value) => update('guest_name', value)}
                        placeholder={tr('form.guest_name_placeholder')}
                        placeholderTextColor="#9ca3af"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </View>
                    <View className="flex-1">
                      <FieldLabel>{tr('form.email')} *</FieldLabel>
                      <TextInput
                        value={form.guest_email}
                        onChangeText={(value) => update('guest_email', value)}
                        placeholder="your@email.com"
                        placeholderTextColor="#9ca3af"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </View>
                  </View>

                  <View>
                    <FieldLabel>{tr('form.category')} *</FieldLabel>
                    <View className="flex-row flex-wrap gap-2">
                      {categories.map((category) => {
                        const active = form.category === category;
                        return (
                          <Pressable
                            key={category}
                            onPress={() => update('category', category)}
                            className={`rounded-xl border px-3 py-2 ${
                              active
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                            }`}>
                            <Text
                              className={`font-sans text-xs font-semibold ${
                                active ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-slate-300'
                              }`}>
                              {tr(`categories.${category}`)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {form.category === 'safety' ? (
                      <View className="mt-2 flex-row items-start gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
                        <Feather name="alert-triangle" color="#dc2626" size={14} />
                        <Text className="min-w-0 flex-1 font-sans text-xs text-red-600 dark:text-red-400">
                          {tr('safety_warning')}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View>
                    <FieldLabel>{tr('form.priority')}</FieldLabel>
                    <View className="grid grid-cols-4 gap-2">
                      {priorities.map((priority) => {
                        const active = form.priority === priority.value;
                        return (
                          <Pressable
                            key={priority.value}
                            onPress={() => update('priority', priority.value)}
                            className={`rounded-xl border-2 py-2.5 ${
                              active
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                            }`}>
                            <Text className={`text-center font-sans text-xs font-semibold ${priority.cls}`}>
                              {tr(`priorities.${priority.value}`)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View>
                    <FieldLabel>{tr('form.subject')} *</FieldLabel>
                    <TextInput
                      value={form.subject}
                      onChangeText={(value) => update('subject', value)}
                      placeholder={tr('form.subject_placeholder')}
                      placeholderTextColor="#9ca3af"
                      maxLength={200}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <ErrorText>
                      {form.subject && form.subject.trim().length < 5
                        ? tr('form.subject_placeholder')
                        : undefined}
                    </ErrorText>
                  </View>

                  <View>
                    <FieldLabel>
                      {tr('form.description')} *{' '}
                      <Text className="font-normal text-gray-400 dark:text-slate-500">
                        {tr('form.description_min')}
                      </Text>
                    </FieldLabel>
                    <TextInput
                      value={form.description}
                      onChangeText={(value) => update('description', value)}
                      placeholder={tr('form.description_placeholder')}
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={6}
                      maxLength={5000}
                      className="min-h-36 rounded-xl border border-gray-300 bg-white px-4 py-3 align-top font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <Text className="mt-1 text-right font-sans text-xs text-gray-400 dark:text-slate-500">
                      {form.description.length}/5000
                    </Text>
                  </View>

                  <View className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <View className="mb-1 flex-row items-center gap-2">
                      <Feather name="paperclip" color="#64748b" size={15} />
                      <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
                        {tr('form.attachments')}
                      </Text>
                    </View>
                    <Text className="font-sans text-xs leading-5 text-gray-500 dark:text-slate-500">
                      {tr('form.attachments_hint')}
                    </Text>
                  </View>

                  <Pressable onPress={() => setShowContext((value) => !value)} className="self-start py-1">
                    <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                      {showContext ? '- ' : '+ '}
                      {tr('form.related_context')}
                    </Text>
                  </Pressable>

                  {showContext ? (
                    <View className="gap-3">
                      <TextInput
                        value={form.related_url}
                        onChangeText={(value) => update('related_url', value)}
                        placeholder={tr('form.related_url_placeholder')}
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <TextInput
                        value={form.related_order_id}
                        onChangeText={(value) => update('related_order_id', value)}
                        placeholder={tr('form.related_order_placeholder')}
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </View>
                  ) : null}

                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit || loading}
                    className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 opacity-100 disabled:opacity-50">
                    <Feather name={loading ? 'loader' : 'inbox'} color="#ffffff" size={17} />
                    <Text className="font-sans font-bold text-white">
                      {loading ? tr('form.submitting') : tr('form.submit')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="gap-4 lg:w-72">
              <View className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                <View className="mb-3 flex-row items-center gap-1.5">
                  <Feather name="clock" color="#16a34a" size={16} />
                  <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                    {tr('sidebar.response_times')}
                  </Text>
                </View>
                <View className="gap-2">
                  {slaInfo.map((item) => (
                    <View key={item.priority} className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View style={{ backgroundColor: item.color }} className="h-2 w-2 rounded-full" />
                        <Text className="font-sans text-xs font-semibold capitalize text-gray-700 dark:text-slate-300">
                          {tr(`priorities.${item.priority}`)}
                        </Text>
                      </View>
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                        {tr('sidebar.response_time_value', { hours: item.hours })}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                <Text className="mb-3 font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                  {tr('sidebar.what_happens_next')}
                </Text>
                <View className="gap-3">
                  {['ticket_id', 'email_confirm', 'team_reviews', 'resolution'].map((step, index) => (
                    <View key={step} className="flex-row items-start gap-2.5">
                      <View className="h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-400">
                          {index + 1}
                        </Text>
                      </View>
                      <Text className="min-w-0 flex-1 font-sans text-xs leading-5 text-gray-600 dark:text-slate-400">
                        {tr(`sidebar.step.${step}`)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Link href="/my-reports" asChild>
                <Pressable className="flex-row items-center justify-between rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans text-sm font-semibold text-green-800 dark:text-green-300">
                      {tr('my_reports.title')}
                    </Text>
                    <Text className="mt-0.5 font-sans text-xs text-green-700 dark:text-green-400">
                      {tr('my_reports.subtitle')}
                    </Text>
                  </View>
                  <Feather name="arrow-right" color="#16a34a" size={17} />
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}
