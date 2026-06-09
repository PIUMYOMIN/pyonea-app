import Feather from '@expo/vector-icons/Feather';
import { Link, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { useAppTranslation } from '@/i18n';
import {
  addReportComment,
  fetchMyReportDetail,
  fetchMyReports,
  type UserReport,
} from '@/utils/native-api';

const statusConfig: Record<string, { label: string; cls: string; dot: string }> = {
  open: {
    label: 'Open',
    cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  in_review: {
    label: 'In Review',
    cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  waiting: {
    label: 'Waiting',
    cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
  resolved: {
    label: 'Resolved',
    cls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    dot: 'bg-green-500',
  },
  closed: {
    label: 'Closed',
    cls: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400',
    dot: 'bg-gray-400',
  },
  rejected: {
    label: 'Rejected',
    cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    dot: 'bg-red-400',
  },
};

const priorityConfig: Record<string, { label: string; cls: string }> = {
  low: { label: 'Low', cls: 'text-gray-500 dark:text-slate-400' },
  medium: { label: 'Medium', cls: 'text-blue-600 dark:text-blue-400' },
  high: { label: 'High', cls: 'text-orange-600 dark:text-orange-400' },
  critical: { label: 'Critical', cls: 'text-red-600 dark:text-red-400 font-bold' },
};

const filters = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_review', label: 'In Review' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' },
];

const closedStatuses = ['resolved', 'closed', 'rejected'];

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatRelative = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function useReportLabels() {
  const { t } = useAppTranslation();

  return {
    category: (key: string) => t(`subscription.report.categories.${key}`, key),
    priority: (key: string) =>
      t(`subscription.report.priorities.${key}`, priorityConfig[key]?.label || key),
  };
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.open;

  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${config.cls}`}>
      <View className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <Text className="font-sans text-xs font-semibold">{config.label}</Text>
    </View>
  );
}

function TicketCard({ report, onPress }: { report: UserReport; onPress: () => void }) {
  const labels = useReportLabels();
  const priority = priorityConfig[report.priority] || priorityConfig.medium;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-950/40">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row flex-wrap items-center gap-2">
            <Text className="font-mono text-xs font-bold text-green-600 dark:text-green-400">
              {report.ticketId}
            </Text>
            <StatusBadge status={report.status} />
            <Text className={`font-sans text-xs ${priority.cls}`}>
              {labels.priority(report.priority)}
            </Text>
          </View>
          <Text
            className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100"
            numberOfLines={1}>
            {report.subject}
          </Text>
          <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {labels.category(report.category)}
            </Text>
            <Text className="font-sans text-xs text-gray-300 dark:text-slate-600">.</Text>
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {formatRelative(report.createdAt)}
            </Text>
            {report.comments.length > 0 ? (
              <>
                <Text className="font-sans text-xs text-gray-300 dark:text-slate-600">.</Text>
                <View className="flex-row items-center gap-1">
                  <Feather name="message-circle" color="#94a3b8" size={13} />
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                    {report.comments.length}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
        <Feather name="chevron-right" color="#9ca3af" size={18} style={{ marginTop: 4 }} />
      </View>
      {report.resolution ? (
        <View className="mt-2 rounded-lg bg-green-50 px-3 py-1.5 dark:bg-green-900/20">
          <Text className="font-sans text-xs text-green-700 dark:text-green-400">
            {report.resolution}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function LoadingState() {
  return (
    <View className="items-center py-16">
      <Feather name="loader" color="#9ca3af" size={30} />
    </View>
  );
}

export function MyReportsNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const loadReports = async (page = 1) => {
    setLoading(true);
    try {
      const result = await fetchMyReports(page);
      setReports(result.reports);
      setCurrentPage(result.currentPage);
      setLastPage(result.lastPage);
    } catch {
      setReports([]);
      setCurrentPage(1);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadInitialReports = async () => {
      try {
        const result = await fetchMyReports(1, controller.signal);
        if (!controller.signal.aborted) {
          setReports(result.reports);
          setCurrentPage(result.currentPage);
          setLastPage(result.lastPage);
        }
      } catch {
        if (!controller.signal.aborted) {
          setReports([]);
          setCurrentPage(1);
          setLastPage(1);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadInitialReports();

    return () => controller.abort();
  }, []);

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? reports
        : filter === 'resolved'
          ? reports.filter((report) => ['resolved', 'closed'].includes(report.status))
          : reports.filter((report) => report.status === filter),
    [filter, reports]
  );

  const counts = useMemo(
    () => ({
      all: reports.length,
      open: reports.filter((report) => report.status === 'open').length,
      in_review: reports.filter((report) => report.status === 'in_review').length,
      waiting: reports.filter((report) => report.status === 'waiting').length,
      resolved: reports.filter((report) => ['resolved', 'closed'].includes(report.status)).length,
      rejected: reports.filter((report) => report.status === 'rejected').length,
    }),
    [reports]
  );

  return (
    <AppLayout>
      <View className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-slate-900">
        <View className="mx-auto w-full max-w-2xl">
          <View className="mb-6 gap-4 sm:flex-row sm:items-center sm:justify-between">
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Feather name="inbox" color="#16a34a" size={24} />
                <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {t('subscription.report.my_reports.title')}
                </Text>
              </View>
              <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
                {t('subscription.report.my_reports.subtitle')}
              </Text>
            </View>
            <Link href="/report" asChild>
              <Pressable className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2">
                <Feather name="plus" color="#ffffff" size={16} />
                <Text className="font-sans text-sm font-semibold text-white">
                  {t('subscription.report.title')}
                </Text>
              </Pressable>
            </Link>
          </View>

          <View className="mb-4 flex-row flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            {filters.map((item) => {
              const active = filter === item.key;
              const count = counts[item.key as keyof typeof counts];
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  className={`flex-row items-center gap-1.5 rounded-lg px-3 py-1.5 ${
                    active ? 'bg-green-600' : 'bg-transparent'
                  }`}>
                  <Text
                    className={`font-sans text-xs font-semibold ${
                      active ? 'text-white' : 'text-gray-600 dark:text-slate-400'
                    }`}>
                    {item.label}
                  </Text>
                  {count > 0 ? (
                    <View
                      className={`rounded-full px-1.5 py-0.5 ${
                        active ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-700'
                      }`}>
                      <Text
                        className={`font-sans text-[10px] ${
                          active ? 'text-white' : 'text-gray-500 dark:text-slate-400'
                        }`}>
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <View className="items-center rounded-2xl border border-gray-200 bg-white px-5 py-16 dark:border-slate-700 dark:bg-slate-800">
              <Feather name="inbox" color="#cbd5e1" size={48} />
              <Text className="mt-3 text-center font-sans text-base font-semibold text-gray-700 dark:text-slate-300">
                {filter === 'all' ? 'No reports yet' : `No ${filter.replace('_', ' ')} tickets`}
              </Text>
              <Text className="mt-1 text-center font-sans text-sm text-gray-400 dark:text-slate-500">
                {t('subscription.report.subtitle')}
              </Text>
              <Link href="/report" asChild>
                <Pressable className="mt-4 rounded-xl bg-green-600 px-5 py-2">
                  <Text className="font-sans text-sm font-semibold text-white">
                    {t('subscription.report.form.submit')}
                  </Text>
                </Pressable>
              </Link>
            </View>
          ) : (
            <View className="gap-3">
              {filtered.map((report) => (
                <TicketCard
                  key={String(report.id)}
                  report={report}
                  onPress={() => router.push(`/my-reports/${report.ticketId}` as Href)}
                />
              ))}
            </View>
          )}

          {lastPage > 1 ? (
            <View className="mt-4 flex-row items-center justify-center gap-2">
              <Pressable
                onPress={() => void loadReports(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 opacity-100 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800">
                <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">Prev</Text>
              </Pressable>
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                Page {currentPage} of {lastPage}
              </Text>
              <Pressable
                onPress={() => void loadReports(currentPage + 1)}
                disabled={currentPage >= lastPage || loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 opacity-100 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800">
                <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">Next</Text>
              </Pressable>
            </View>
          ) : null}

          <View className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <View className="mb-2 flex-row items-center gap-1.5">
              <Feather name="clock" color="#1d4ed8" size={16} />
              <Text className="font-sans text-sm font-semibold text-blue-800 dark:text-blue-300">
                {t('subscription.report.sidebar.response_times')}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-x-4 gap-y-1">
              <Text className="font-sans text-xs text-blue-700 dark:text-blue-400">Critical - 4 hours</Text>
              <Text className="font-sans text-xs text-blue-700 dark:text-blue-400">High - 12 hours</Text>
              <Text className="font-sans text-xs text-blue-700 dark:text-blue-400">Medium - 48 hours</Text>
              <Text className="font-sans text-xs text-blue-700 dark:text-blue-400">Low - 5 days</Text>
            </View>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}

export function MyReportDetailNative({ ticketId }: { ticketId: string }) {
  const [report, setReport] = useState<UserReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const labels = useReportLabels();

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMyReportDetail(ticketId);
      setReport(result);
    } catch {
      setReport(null);
      setError('Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadInitialReport = async () => {
      try {
        const result = await fetchMyReportDetail(ticketId, controller.signal);
        if (!controller.signal.aborted) setReport(result);
      } catch {
        if (!controller.signal.aborted) {
          setReport(null);
          setError('Failed to load ticket.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadInitialReport();

    return () => controller.abort();
  }, [ticketId]);

  const sendReply = async () => {
    if (reply.trim().length < 5) return;
    setSending(true);
    setError('');
    try {
      await addReportComment(ticketId, reply.trim());
      setReply('');
      await loadReport();
    } catch {
      setError('Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <View className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-slate-900">
          <View className="mx-auto w-full max-w-2xl">
            <LoadingState />
          </View>
        </View>
      </AppLayout>
    );
  }

  if (!report) {
    return (
      <AppLayout>
        <View className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-slate-900">
          <View className="mx-auto w-full max-w-2xl items-center">
            <Feather name="alert-circle" color="#ef4444" size={42} />
            <Text className="mt-3 text-center font-sans text-base text-red-500">
              {error || 'Ticket not found.'}
            </Text>
            <Link href="/my-reports" asChild>
              <Pressable className="mt-5 flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2">
                <Feather name="arrow-left" color="#ffffff" size={16} />
                <Text className="font-sans text-sm font-semibold text-white">Back to my reports</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </AppLayout>
    );
  }

  const priority = priorityConfig[report.priority] || priorityConfig.medium;
  const isClosed = closedStatuses.includes(report.status);

  return (
    <AppLayout>
      <View className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-slate-900">
        <View className="mx-auto w-full max-w-2xl gap-5">
          <Link href="/my-reports" asChild>
            <Pressable className="flex-row items-center gap-1.5 self-start">
              <Feather name="arrow-left" color="#64748b" size={16} />
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                Back to my reports
              </Text>
            </Pressable>
          </Link>

          <View className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <View className="mb-2 flex-row flex-wrap items-center gap-2">
              <Text className="font-mono font-bold text-green-600 dark:text-green-400">
                {report.ticketId}
              </Text>
              <StatusBadge status={report.status} />
              <Text className={`font-sans text-xs font-semibold ${priority.cls}`}>
                {labels.priority(report.priority)} priority
              </Text>
              <Text className="ml-auto font-sans text-xs text-gray-400 dark:text-slate-500">
                {formatDate(report.createdAt)}
              </Text>
            </View>
            <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {report.subject}
            </Text>
            <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
              {labels.category(report.category)}
              {report.slaHours ? ` . SLA: ${report.slaHours}h response target` : ''}
              {report.slaBreached ? ' . SLA breached' : ''}
            </Text>

            <View className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-slate-900/50">
              <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
                {report.description}
              </Text>
            </View>

            {report.resolution ? (
              <View className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                <View className="mb-1 flex-row items-center gap-1">
                  <Feather name="check-circle" color="#15803d" size={16} />
                  <Text className="font-sans text-sm font-semibold text-green-800 dark:text-green-300">
                    Resolution
                  </Text>
                </View>
                <Text className="font-sans text-sm text-green-700 dark:text-green-400">
                  {report.resolution}
                </Text>
              </View>
            ) : null}

            {report.attachments.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {report.attachments.map((attachment) => (
                  <Pressable
                    key={String(attachment.id)}
                    onPress={() => void Linking.openURL(attachment.url)}
                    className="flex-row items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-slate-700">
                    <Feather name="paperclip" color="#64748b" size={14} />
                    <Text className="font-sans text-xs text-gray-600 dark:text-slate-300">
                      {attachment.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {report.comments.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-1.5">
                <Feather name="message-circle" color="#64748b" size={16} />
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                  Conversation ({report.comments.length})
                </Text>
              </View>
              {report.comments.map((comment) => {
                const reporter = comment.authorType === 'reporter';
                const admin = comment.authorType === 'admin';
                return (
                  <View
                    key={String(comment.id)}
                    className={`flex-row gap-3 ${reporter ? 'justify-end' : 'justify-start'}`}>
                    <View className={`max-w-[80%] ${reporter ? 'items-end' : 'items-start'}`}>
                      <View
                        className={`rounded-2xl px-4 py-3 ${
                          reporter
                            ? 'bg-green-600'
                            : admin
                              ? 'border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                              : 'bg-gray-100 dark:bg-slate-700'
                        }`}>
                        <Text
                          className={`font-sans text-sm leading-6 ${
                            reporter ? 'text-white' : 'text-gray-800 dark:text-slate-200'
                          }`}>
                          {comment.body}
                        </Text>
                      </View>
                      <Text className="mt-1 px-1 font-sans text-xs text-gray-400 dark:text-slate-500">
                        {admin ? 'Support Team' : reporter ? 'You' : 'System'} .{' '}
                        {formatRelative(comment.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {!isClosed ? (
            <View className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <Text className="mb-2 font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
                Add a reply
              </Text>
              <TextInput
                value={reply}
                onChangeText={setReply}
                multiline
                numberOfLines={4}
                placeholder="Provide additional information, updates, or questions..."
                placeholderTextColor="#9ca3af"
                className="min-h-24 rounded-xl border border-gray-200 bg-white px-3 py-2.5 align-top font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              {error ? <Text className="mt-1 font-sans text-xs text-red-500">{error}</Text> : null}
              <View className="mt-2 items-end">
                <Pressable
                  onPress={sendReply}
                  disabled={sending || reply.trim().length < 5}
                  className="rounded-xl bg-green-600 px-5 py-2 opacity-100 disabled:opacity-50">
                  <Text className="font-sans text-sm font-semibold text-white">
                    {sending ? 'Sending...' : 'Send Reply'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text className="py-4 text-center font-sans text-sm text-gray-400 dark:text-slate-500">
              This ticket is {report.status}. Open a new report if you need further assistance.
            </Text>
          )}
        </View>
      </View>
    </AppLayout>
  );
}
