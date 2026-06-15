import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { createElement, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useNativeAuth } from '@/context/native-auth';
import { useAppTranslation } from '@/i18n';
import { ApiError, formatApiErrorMessage, submitReportWithAttachments, type NativeUploadFile } from '@/utils/native-api';
import { executeRecaptcha } from '@/utils/recaptcha';

const CATEGORIES = [
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
] as const;

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

const SLA_INFO = [
  { priority: 'critical', hours: '4', dot: '🔴', tone: 'text-red-600 dark:text-red-400' },
  { priority: 'high', hours: '12', dot: '🟠', tone: 'text-orange-600 dark:text-orange-400' },
  { priority: 'medium', hours: '48', dot: '🔵', tone: 'text-blue-600 dark:text-blue-400' },
  { priority: 'low', hours: '120', dot: '⚪', tone: 'text-gray-500 dark:text-slate-400' },
] as const;

const inputClass =
  'rounded-xl border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

const emptyForm = () => ({
  category: '',
  priority: 'medium',
  subject: '',
  description: '',
  related_order_id: '',
  related_url: '',
  guest_name: '',
  guest_email: '',
});

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-1.5 font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
      {children}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text className="mt-1 font-sans text-xs text-red-500">{message}</Text>;
}

function ReportCategorySelect({
  value,
  onChange,
  error,
  tr,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  tr: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View>
        <FieldLabel>{`${tr('form.category')} *`}</FieldLabel>
        {createElement(
          'select',
          {
            value,
            onChange: (event: { target: { value: string } }) => onChange(event.target.value),
            className: `${inputClass} h-12 w-full outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20`,
            required: true,
          },
          createElement('option', { value: '' }, tr('form.category_placeholder')),
          ...CATEGORIES.map((category) =>
            createElement('option', { key: category, value: category }, tr(`categories.${category}`)),
          ),
        )}
        <FieldError message={error} />
      </View>
    );
  }

  return (
    <View>
      <FieldLabel>{`${tr('form.category')} *`}</FieldLabel>
      <Pressable
        onPress={() => setOpen(true)}
        className={`${inputClass} flex-row items-center justify-between`}>
        <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">
          {value ? tr(`categories.${value}`) : tr('form.category_placeholder')}
        </Text>
        <Feather name="chevron-down" color="#9ca3af" size={18} />
      </Pressable>
      <FieldError message={error} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/45" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-white dark:bg-slate-900">
            <ScrollView>
              {CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => {
                    onChange(category);
                    setOpen(false);
                  }}
                  className="border-b border-gray-100 px-4 py-3 dark:border-slate-800">
                  <Text
                    className={`font-sans text-sm ${
                      value === category
                        ? 'font-semibold text-green-700 dark:text-green-300'
                        : 'text-gray-700 dark:text-slate-200'
                    }`}>
                    {tr(`categories.${category}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ReportSuccess({
  ticketId,
  isAuthenticated,
  onReset,
  tr,
}: {
  ticketId: string;
  isAuthenticated: boolean;
  onReset: () => void;
  tr: (key: string) => string;
}) {
  return (
    <View className="min-h-[60vh] items-center justify-center px-4 py-16">
      <View className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl dark:bg-slate-800">
        <View className="mx-auto mb-5 h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Feather name="check-circle" color="#16a34a" size={48} />
        </View>
        <Text className="text-center font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
          {tr('success.title')}
        </Text>
        <Text className="mt-2 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
          {tr('success.message')}
        </Text>
        <View className="my-6 rounded-2xl border border-green-200 bg-green-50 px-8 py-5 dark:border-green-800 dark:bg-green-900/20">
          <Text className="text-center font-sans text-xs font-semibold uppercase tracking-widest text-green-700 dark:text-green-400">
            {tr('success.ticket_id')}
          </Text>
          <Text className="mt-2 text-center font-mono text-2xl font-black tracking-widest text-green-800 dark:text-green-300">
            {ticketId}
          </Text>
        </View>
        <Text className="mb-6 text-center font-sans text-xs text-gray-400 dark:text-slate-500">
          {tr('success.email_notice')}
        </Text>
        <View className="gap-3">
          {isAuthenticated ? (
            <Link href="/my-reports" asChild>
              <Pressable className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 py-3">
                <Feather name="file-text" color="#ffffff" size={16} />
                <Text className="font-sans text-sm font-semibold text-white">
                  {tr('success.view_my_reports')}
                </Text>
                <Feather name="arrow-right" color="#ffffff" size={16} />
              </Pressable>
            </Link>
          ) : null}
          <Pressable
            onPress={onReset}
            className="rounded-xl border border-gray-300 py-3 dark:border-slate-600">
            <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
              {tr('success.submit_another')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function ReportNative() {
  const { t } = useAppTranslation();
  const { isAuthenticated } = useNativeAuth();
  const tr = (key: string, options?: Record<string, unknown>) =>
    t(`subscription.report.${key}`, options);

  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<NativeUploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showContext, setShowContext] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(form.category && form.subject.trim() && form.description.trim()),
    [form.category, form.description, form.subject],
  );

  const setField = (key: keyof ReturnType<typeof emptyForm>) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const pickAttachments = async () => {
    if (Platform.OS === 'web') return;

    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: ['image/*', 'application/pdf'],
      });

      if (result.canceled) return;

      const nextFiles = result.assets.slice(0, 5).map((asset, index) => ({
        uri: asset.uri,
        name: asset.name || `attachment-${index + 1}`,
        type: asset.mimeType || 'application/octet-stream',
      }));

      setFiles(nextFiles);
    } catch {
      setErrors({ general: tr('form.submit_error') });
    }
  };

  const handleWebFiles = (event: { target: { files?: FileList | null } }) => {
    const selected = Array.from(event.target.files || []).slice(0, 5);
    setFiles(
      selected.map((file, index) => ({
        uri: URL.createObjectURL(file),
        name: file.name || `attachment-${index + 1}`,
        type: file.type || 'application/octet-stream',
      })),
    );
  };

  const mapApiErrors = (apiErrors: unknown) => {
    if (!apiErrors || typeof apiErrors !== 'object') return {};
    const mapped: Record<string, string> = {};
    Object.entries(apiErrors as Record<string, unknown>).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        mapped[key] = String(value[0]);
      } else if (typeof value === 'string') {
        mapped[key] = value;
      }
    });
    return mapped;
  };

  const handleSubmit = async () => {
    setErrors({});

    if (!canSubmit) return;
    if (!isAuthenticated && (!form.guest_name.trim() || !form.guest_email.trim())) {
      const nextErrors: Record<string, string> = {};
      if (!form.guest_name.trim()) nextErrors.guest_name = `${tr('form.guest_name')} *`;
      if (!form.guest_email.trim()) nextErrors.guest_email = `${tr('form.email')} *`;
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      let recaptchaToken: string;
      try {
        recaptchaToken = await executeRecaptcha('report');
      } catch {
        setErrors({ general: tr('form.recaptcha_error') });
        return;
      }
      const result = await submitReportWithAttachments(
        {
          category: form.category,
          priority: form.priority,
          subject: form.subject.trim(),
          description: form.description.trim(),
          related_order_id: form.related_order_id.trim() || undefined,
          related_url: form.related_url.trim() || undefined,
          guest_name: !isAuthenticated ? form.guest_name.trim() : undefined,
          guest_email: !isAuthenticated ? form.guest_email.trim() : undefined,
          recaptcha_token: recaptchaToken,
        },
        files,
      );
      setSuccess(result.ticketId);
      setForm(emptyForm());
      setFiles([]);
      setShowContext(false);
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        setErrors({
          ...mapApiErrors(error.errors),
          general: formatApiErrorMessage(error, tr('form.submit_error')),
        });
      } else {
        setErrors({
          general: formatApiErrorMessage(error, tr('form.submit_error')),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AppLayout>
        <View className="bg-gray-50 dark:bg-slate-900">
          <ReportSuccess
            ticketId={success}
            isAuthenticated={isAuthenticated}
            onReset={() => setSuccess(null)}
            tr={tr}
          />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}>
        <ScrollView
          className="bg-gray-50 dark:bg-slate-900"
          contentContainerClassName="px-4 py-12 sm:px-6">
          <View className="mx-auto w-full max-w-2xl">
            <View className="mb-8 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
                <Feather name="file-text" color="#16a34a" size={28} />
              </View>
              <Text className="text-center font-sans text-2xl font-bold text-gray-900 dark:text-slate-100 sm:text-3xl">
                {tr('title')}
              </Text>
              <Text className="mt-2 max-w-md text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                {tr('subtitle')}
              </Text>
              {isAuthenticated ? (
                <Link href="/my-reports" asChild>
                  <Pressable className="mt-3 flex-row items-center gap-1">
                    <Text className="font-sans text-sm font-medium text-green-600 dark:text-green-400">
                      {tr('my_reports_link')}
                    </Text>
                    <Feather name="arrow-right" color="#16a34a" size={14} />
                  </Pressable>
                </Link>
              ) : null}
            </View>

            <View className="gap-6 lg:flex-row lg:items-start">
              <View className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                {errors.general ? (
                  <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <Feather name="alert-triangle" color="#b91c1c" size={16} />
                    <Text className="flex-1 font-sans text-sm text-red-700 dark:text-red-300">
                      {errors.general}
                    </Text>
                  </View>
                ) : null}

                {!isAuthenticated ? (
                  <View className="mb-5 gap-4 border-b border-gray-100 pb-5 dark:border-slate-700 sm:flex-row">
                    <View className="flex-1">
                      <FieldLabel>{`${tr('form.guest_name')} *`}</FieldLabel>
                      <TextInput
                        value={form.guest_name}
                        onChangeText={setField('guest_name')}
                        placeholder={tr('form.guest_name_placeholder')}
                        placeholderTextColor="#9ca3af"
                        className={inputClass}
                      />
                      <FieldError message={errors.guest_name} />
                    </View>
                    <View className="flex-1">
                      <FieldLabel>{`${tr('form.email')} *`}</FieldLabel>
                      <TextInput
                        value={form.guest_email}
                        onChangeText={setField('guest_email')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="your@email.com"
                        placeholderTextColor="#9ca3af"
                        className={inputClass}
                      />
                      <FieldError message={errors.guest_email} />
                    </View>
                  </View>
                ) : null}

                <View className="gap-5">
                  <ReportCategorySelect
                    value={form.category}
                    onChange={setField('category')}
                    error={errors.category}
                    tr={tr}
                  />

                  {form.category === 'safety' ? (
                    <View className="flex-row items-start gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
                      <Feather name="alert-triangle" color="#dc2626" size={14} />
                      <Text className="flex-1 font-sans text-xs text-red-600 dark:text-red-400">
                        {tr('safety_warning')}
                      </Text>
                    </View>
                  ) : null}

                  <View>
                    <FieldLabel>{tr('form.priority')}</FieldLabel>
                    <View className="flex-row flex-wrap gap-2">
                      {PRIORITIES.map((priority) => {
                        const selected = form.priority === priority;
                        return (
                          <Pressable
                            key={priority}
                            onPress={() => setField('priority')(priority)}
                            className={`min-w-[22%] flex-1 rounded-xl border-2 px-2 py-2.5 ${
                              selected
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                            }`}>
                            <Text
                              className={`text-center font-sans text-xs font-semibold ${
                                priority === 'critical'
                                  ? 'text-red-600 dark:text-red-400'
                                  : priority === 'high'
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : priority === 'medium'
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-gray-600 dark:text-slate-400'
                              }`}>
                              {tr(`priorities.${priority}`)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View>
                    <FieldLabel>{`${tr('form.subject')} *`}</FieldLabel>
                    <TextInput
                      value={form.subject}
                      onChangeText={setField('subject')}
                      maxLength={200}
                      placeholder={tr('form.subject_placeholder')}
                      placeholderTextColor="#9ca3af"
                      className={inputClass}
                    />
                    <FieldError message={errors.subject} />
                  </View>

                  <View>
                    <FieldLabel>{`${tr('form.description')} * ${tr('form.description_min')}`}</FieldLabel>
                    <TextInput
                      value={form.description}
                      onChangeText={setField('description')}
                      multiline
                      numberOfLines={5}
                      maxLength={5000}
                      textAlignVertical="top"
                      placeholder={tr('form.description_placeholder')}
                      placeholderTextColor="#9ca3af"
                      className={`${inputClass} min-h-32`}
                    />
                    <View className="mt-1 flex-row justify-between">
                      <FieldError message={errors.description} />
                      <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                        {form.description.length}/5000
                      </Text>
                    </View>
                  </View>

                  <View>
                    <FieldLabel>{`${tr('form.attachments')} (${tr('form.attachments_hint')})`}</FieldLabel>
                    {Platform.OS === 'web' ? (
                      createElement('input', {
                        type: 'file',
                        multiple: true,
                        accept: 'image/*,.pdf',
                        onChange: handleWebFiles,
                        className:
                          'block w-full text-xs text-gray-500 file:mr-3 file:rounded-xl file:border-0 file:bg-green-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-green-700',
                      })
                    ) : (
                      <Pressable
                        onPress={() => void pickAttachments()}
                        className="flex-row items-center gap-2 self-start rounded-xl bg-green-50 px-4 py-2 dark:bg-green-900/20">
                        <Feather name="paperclip" color="#15803d" size={16} />
                        <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                          {tr('form.attachments')}
                        </Text>
                      </Pressable>
                    )}
                    {files.length > 0 ? (
                      <Text className="mt-1.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                        {files.length === 1
                          ? tr('form.files_selected_one', { count: files.length })
                          : tr('form.files_selected_other', { count: files.length })}
                      </Text>
                    ) : null}
                  </View>

                  <View>
                    <Pressable
                      onPress={() => setShowContext((current) => !current)}
                      className="py-1">
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                        {showContext ? '− ' : '+ '}
                        {tr('form.related_context')}
                      </Text>
                    </Pressable>
                    {showContext ? (
                      <View className="mt-3 gap-3">
                        <TextInput
                          value={form.related_url}
                          onChangeText={setField('related_url')}
                          autoCapitalize="none"
                          placeholder={tr('form.related_url_placeholder')}
                          placeholderTextColor="#9ca3af"
                          className={inputClass}
                        />
                        <TextInput
                          value={form.related_order_id}
                          onChangeText={setField('related_order_id')}
                          keyboardType="number-pad"
                          placeholder={tr('form.related_order_placeholder')}
                          placeholderTextColor="#9ca3af"
                          className={inputClass}
                        />
                      </View>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => void handleSubmit()}
                    disabled={loading || !canSubmit}
                    className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 disabled:opacity-50">
                    {loading ? (
                      <>
                        <ActivityIndicator color="#ffffff" />
                        <Text className="font-sans font-bold text-white">{tr('form.submitting')}</Text>
                      </>
                    ) : (
                      <>
                        <Feather name="send" color="#ffffff" size={16} />
                        <Text className="font-sans font-bold text-white">{tr('form.submit')}</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>

              <View className="w-full gap-4 lg:w-72">
                <View className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                  <View className="mb-3 flex-row items-center gap-1.5">
                    <Feather name="clock" color="#16a34a" size={16} />
                    <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                      {tr('sidebar.response_times')}
                    </Text>
                  </View>
                  <View className="gap-2">
                    {SLA_INFO.map((item) => (
                      <View key={item.priority} className="flex-row items-center justify-between">
                        <Text className={`font-sans text-xs font-semibold capitalize ${item.tone}`}>
                          {item.dot} {item.priority}
                        </Text>
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
                  {(['ticket_id', 'email_confirm', 'team_reviews', 'resolution'] as const).map(
                    (step, index) => (
                      <View key={step} className="mb-3 flex-row items-start gap-2.5">
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <Text className="font-sans text-xs font-bold text-green-700 dark:text-green-400">
                            {index + 1}
                          </Text>
                        </View>
                        <Text className="flex-1 font-sans text-xs leading-5 text-gray-600 dark:text-slate-400">
                          {tr(`sidebar.step.${step}`)}
                        </Text>
                      </View>
                    ),
                  )}
                </View>

                {isAuthenticated ? (
                  <Link href="/my-reports" asChild>
                    <Pressable className="flex-row items-center justify-between rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                      <View className="min-w-0 flex-1 pr-3">
                        <Text className="font-sans text-sm font-semibold text-green-800 dark:text-green-300">
                          {tr('my_reports.title')}
                        </Text>
                        <Text className="mt-0.5 font-sans text-xs text-green-700 dark:text-green-400">
                          {tr('my_reports.subtitle')}
                        </Text>
                      </View>
                      <Feather name="arrow-right" color="#16a34a" size={16} />
                    </Pressable>
                  </Link>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}
