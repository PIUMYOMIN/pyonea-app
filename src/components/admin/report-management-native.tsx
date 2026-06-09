import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useNativeAuth } from '@/context/native-auth';
import { useTheme } from '@/context/theme';
import {
  addAdminReportComment,
  fetchAdminReportDetail,
  fetchAdminReports,
  updateAdminReport,
  type AdminReport,
  type AdminReportSummary,
} from '@/utils/native-api';

const STATUS_CONFIG: Record<string, { label: string; wrap: string; text: string }> = {
  open: { label: 'Open', wrap: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300' },
  in_review: { label: 'In Review', wrap: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' },
  waiting: { label: 'Waiting', wrap: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' },
  resolved: { label: 'Resolved', wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' },
  closed: { label: 'Closed', wrap: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-400' },
  rejected: { label: 'Rejected', wrap: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

const PRIORITY_CONFIG: Record<string, { text: string; bar: string }> = {
  critical: { text: 'text-red-600 dark:text-red-400 font-bold', bar: 'bg-red-500' },
  high: { text: 'text-orange-600 dark:text-orange-400', bar: 'bg-orange-500' },
  medium: { text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
  low: { text: 'text-gray-500 dark:text-slate-400', bar: 'bg-gray-300 dark:bg-slate-600' },
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  payment: 'Payment',
  order: 'Order',
  seller: 'Seller',
  product: 'Product',
  account: 'Account',
  content: 'Content',
  billing: 'Billing',
  delivery: 'Delivery',
  safety: 'Safety',
  suggestion: 'Suggestion',
  other: 'Other',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelative = (value?: string) => {
  if (!value) return '';
  const seconds = (Date.now() - new Date(value).getTime()) / 1000;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${config.wrap}`}>
      <Text className={`font-sans text-xs font-semibold ${config.text}`}>{config.label}</Text>
    </View>
  );
}

function SummaryCard({ label, value, borderClass }: { label: string; value: number; borderClass: string }) {
  return (
    <View className={`w-[48%] rounded-xl border-l-4 bg-white p-4 shadow-sm dark:bg-slate-800 lg:w-[23%] ${borderClass}`}>
      <Text className="font-sans text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</Text>
      <Text className="mt-1 font-sans text-3xl font-bold text-gray-900 dark:text-slate-100">{value}</Text>
    </View>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="min-w-[140px] flex-1 gap-1">
      <Text className="font-sans text-[11px] font-medium text-gray-500 dark:text-slate-400">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
        <Text className="font-sans text-sm text-gray-700 dark:text-slate-300" numberOfLines={1}>
          {selected?.label || label}
        </Text>
        <Feather name="chevron-down" size={14} color={isDark ? '#cbd5e1' : '#6b7280'} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[420px] md:rounded-2xl">
            <Text className="mb-4 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{label}</Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value || 'all'}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-2 rounded-xl border px-4 py-3 ${
                    value === option.value
                      ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}>
                  <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TicketDetailPanel({
  ticketId,
  onClose,
  onUpdated,
}: {
  ticketId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { user } = useNativeAuth();
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fields, setFields] = useState({
    status: 'open',
    priority: 'medium',
    resolution: '',
    admin_notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchAdminReportDetail(ticketId);
      setReport(next);
      setFields({
        status: next.status,
        priority: next.priority,
        resolution: next.resolution || '',
        admin_notes: next.adminNotes || '',
      });
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await updateAdminReport(ticketId, fields);
      await load();
      onUpdated();
    } finally {
      setUpdating(false);
    }
  };

  const handleReply = async () => {
    if (reply.trim().length < 2) return;
    setSending(true);
    try {
      await addAdminReportComment(ticketId, reply.trim(), isInternal);
      setReply('');
      await load();
      onUpdated();
    } finally {
      setSending(false);
    }
  };

  const handleAssignSelf = async () => {
    if (!user?.id) return;
    await updateAdminReport(ticketId, { assigned_to: user.id, status: 'in_review' });
    setFields((current) => ({ ...current, status: 'in_review' }));
    await load();
    onUpdated();
  };

  if (loading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  if (!report) {
    return (
      <View className="items-center py-8">
        <Text className="font-sans text-sm text-red-500">Not found.</Text>
      </View>
    );
  }

  const priority = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.medium;

  return (
    <ScrollView contentContainerClassName="gap-4 p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-mono text-lg font-bold text-green-600 dark:text-green-400">{report.ticketId}</Text>
            <StatusBadge status={report.status} />
            <Text className={`font-sans text-sm font-semibold uppercase ${priority.text}`}>{report.priority}</Text>
            {report.slaBreached ? (
              <View className="flex-row items-center gap-1">
                <Feather name="alert-triangle" size={12} color="#dc2626" />
                <Text className="font-sans text-xs font-bold text-red-600 dark:text-red-400">SLA Breached</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 font-sans text-base font-bold text-gray-900 dark:text-slate-100">{report.subject}</Text>
          <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
            {CATEGORY_LABELS[report.category] || report.category} · {formatDate(report.createdAt)}
            {report.reporter
              ? ` · ${report.reporter.name} (${report.reporter.email})`
              : report.guestName
                ? ` · ${report.guestName} (${report.guestEmail || 'no email'}) [guest]`
                : ''}
          </Text>
        </View>
        <Pressable onPress={onClose} className="rounded-lg p-2">
          <Feather name="x" size={20} color="#94a3b8" />
        </Pressable>
      </View>

      <View className="rounded-xl bg-gray-50 p-4 dark:bg-slate-900/50">
        <Text className="font-sans text-sm leading-relaxed text-gray-700 dark:text-slate-300">{report.description}</Text>
      </View>

      {report.attachments.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {report.attachments.map((attachment) => (
            <Pressable
              key={String(attachment.id)}
              onPress={() => void Linking.openURL(attachment.url)}
              className="flex-row items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-slate-700">
              <Feather name="eye" size={14} color="#64748b" />
              <Text className="font-sans text-xs text-gray-600 dark:text-slate-300">{attachment.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-4">
        {report.reporterIp ? <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">IP: {report.reporterIp}</Text> : null}
        {report.reporterLocale ? (
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">Locale: {report.reporterLocale}</Text>
        ) : null}
        {report.firstResponseAt ? (
          <Text className="font-sans text-xs text-green-600 dark:text-green-400">
            First response: {formatDate(report.firstResponseAt)}
          </Text>
        ) : (
          <Text className="font-sans text-xs text-orange-500">No response yet</Text>
        )}
      </View>

      <View className="gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <Text className="font-sans text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-slate-400">
          Admin Controls
        </Text>

        <View className="flex-row flex-wrap gap-3">
          <FilterSelect
            label="Status"
            value={fields.status}
            options={Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label }))}
            onChange={(status) => setFields((current) => ({ ...current, status }))}
          />
          <FilterSelect
            label="Priority"
            value={fields.priority}
            options={['low', 'medium', 'high', 'critical'].map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
            onChange={(priority) => setFields((current) => ({ ...current, priority }))}
          />
        </View>

        <View className="gap-1">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Resolution (shown to user)</Text>
          <TextInput
            value={fields.resolution}
            onChangeText={(resolution) => setFields((current) => ({ ...current, resolution }))}
            placeholder="Brief resolution summary…"
            placeholderTextColor="#94a3b8"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </View>

        <View className="gap-1">
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">Admin Notes (internal only)</Text>
          <TextInput
            value={fields.admin_notes}
            onChangeText={(admin_notes) => setFields((current) => ({ ...current, admin_notes }))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="Internal notes for admin team…"
            placeholderTextColor="#94a3b8"
            className="min-h-[80px] rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Pressable
            disabled={updating}
            onPress={() => void handleUpdate()}
            className={`flex-1 items-center rounded-lg bg-green-600 px-4 py-2.5 ${updating ? 'opacity-50' : ''}`}>
            <Text className="font-sans text-sm font-semibold text-white">{updating ? 'Saving…' : 'Save Changes'}</Text>
          </Pressable>
          {!report.assignee ? (
            <Pressable
              onPress={() => void handleAssignSelf()}
              className="rounded-lg border border-green-500 px-4 py-2.5">
              <Text className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">Assign to me</Text>
            </Pressable>
          ) : null}
        </View>

        {report.assignee ? (
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
            Assigned to <Text className="font-semibold">{report.assignee.name}</Text> on {formatDate(report.assignedAt)}
          </Text>
        ) : null}
      </View>

      {report.comments.length > 0 ? (
        <View className="gap-2">
          <Text className="font-sans text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-slate-400">
            Thread ({report.comments.length})
          </Text>
          {report.comments.map((comment) => (
            <View
              key={String(comment.id)}
              className={`rounded-xl px-4 py-3 ${
                comment.isInternal
                  ? 'border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                  : comment.authorType === 'reporter'
                    ? 'border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/50'
                    : 'border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
              }`}>
              <View className="mb-1 flex-row items-center justify-between gap-2">
                <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1">
                  {comment.isInternal ? <Feather name="lock" size={12} color="#d97706" /> : null}
                  <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
                    {comment.authorName}
                    {comment.isInternal ? ' (internal)' : ''}
                  </Text>
                </View>
                <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{formatRelative(comment.createdAt)}</Text>
              </View>
              <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">{comment.body}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-slate-400">Reply</Text>
          <View className="flex-row items-center gap-2">
            <Feather name="lock" size={12} color="#d97706" />
            <Text className="font-sans text-xs text-gray-600 dark:text-slate-400">Internal note</Text>
            <Switch value={isInternal} onValueChange={setIsInternal} />
          </View>
        </View>
        <TextInput
          value={reply}
          onChangeText={setReply}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholder={
            isInternal ? 'Write an internal note (not shown to reporter)…' : 'Write a reply to the reporter…'
          }
          placeholderTextColor="#94a3b8"
          className={`min-h-[96px] rounded-xl border bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:bg-slate-900 dark:text-slate-100 ${
            isInternal ? 'border-amber-300 dark:border-amber-700' : 'border-gray-300 dark:border-slate-600'
          }`}
        />
        <Pressable
          disabled={sending || reply.trim().length < 2}
          onPress={() => void handleReply()}
          className={`items-center rounded-xl px-4 py-2.5 disabled:opacity-50 ${
            isInternal ? 'bg-amber-600' : 'bg-blue-600'
          }`}>
          <Text className="font-sans text-sm font-semibold text-white">
            {sending ? 'Sending…' : isInternal ? 'Save Internal Note' : 'Send Reply to Reporter'}
          </Text>
        </Pressable>
      </View>

      <View>
        <Text className="mb-1 font-sans text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-slate-400">
          Admin Notes
        </Text>
        <View className="rounded-xl bg-gray-50 p-3 dark:bg-slate-900/50">
          <Text className="font-sans text-xs leading-5 text-gray-600 dark:text-slate-400">
            {report.adminNotes || '(none)'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

export function ReportManagementNative() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [summary, setSummary] = useState<AdminReportSummary>({
    open: 0,
    inReview: 0,
    critical: 0,
    slaBreached: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    search: '',
    assigned_to: '',
  });
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const result = await fetchAdminReports({ ...filters, page: nextPage });
      setReports(result.reports);
      setSummary(result.summary);
      setLastPage(result.lastPage);
      setPage(result.currentPage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load(1);
  }, [load]);

  const statusOptions = useMemo(
    () => [{ value: '', label: 'All Statuses' }, ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label }))],
    []
  );
  const priorityOptions = useMemo(
    () => [
      { value: '', label: 'All Priorities' },
      ...['critical', 'high', 'medium', 'low'].map((value) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
      })),
    ],
    []
  );
  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Categories' },
      ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
    ],
    []
  );
  const assignmentOptions = useMemo(
    () => [
      { value: '', label: 'All' },
      { value: 'me', label: 'Assigned to me' },
      { value: 'unassigned', label: 'Unassigned' },
    ],
    []
  );

  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <View className="flex-row items-center gap-2">
            <Feather name="flag" size={20} color="#16a34a" />
            <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">Report Management</Text>
          </View>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            Manage all user support tickets and system reports
          </Text>
        </View>
        <Pressable onPress={() => void load(page)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-700">
          {loading ? <ActivityIndicator color="#16a34a" size="small" /> : <Feather name="refresh-cw" color="#64748b" size={16} />}
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <SummaryCard label="Open" value={summary.open} borderClass="border-blue-500" />
        <SummaryCard label="In Review" value={summary.inReview} borderClass="border-purple-500" />
        <SummaryCard label="Critical" value={summary.critical} borderClass="border-red-500" />
        <SummaryCard label="SLA Breached" value={summary.slaBreached} borderClass="border-orange-500" />
      </View>

      <View className="gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <View className="relative">
          <Feather name="search" size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }} />
          <TextInput
            value={filters.search}
            onChangeText={(search) => setFilters((current) => ({ ...current, search }))}
            placeholder="Search ticket ID or subject…"
            placeholderTextColor="#94a3b8"
            className="rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </View>
        <View className="flex-row flex-wrap gap-3">
          <FilterSelect
            label="Status"
            value={filters.status}
            options={statusOptions}
            onChange={(status) => setFilters((current) => ({ ...current, status }))}
          />
          <FilterSelect
            label="Priority"
            value={filters.priority}
            options={priorityOptions}
            onChange={(priority) => setFilters((current) => ({ ...current, priority }))}
          />
          <FilterSelect
            label="Category"
            value={filters.category}
            options={categoryOptions}
            onChange={(category) => setFilters((current) => ({ ...current, category }))}
          />
          <FilterSelect
            label="Assignment"
            value={filters.assigned_to}
            options={assignmentOptions}
            onChange={(assigned_to) => setFilters((current) => ({ ...current, assigned_to }))}
          />
        </View>
      </View>

      {loading && reports.length === 0 ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#16a34a" size="large" />
        </View>
      ) : reports.length === 0 ? (
        <View className="items-center py-12">
          <Feather name="flag" color="#94a3b8" size={40} />
          <Text className="mt-3 font-sans text-sm text-gray-400 dark:text-slate-500">
            No reports match the current filters.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {reports.map((report) => {
            const priority = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.medium;
            const active = selected === report.ticketId;
            return (
              <Pressable
                key={String(report.id)}
                onPress={() => setSelected(report.ticketId)}
                className={`rounded-xl border p-4 ${
                  active
                    ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/10'
                    : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                }`}>
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <View className="mb-1 flex-row flex-wrap items-center gap-2">
                      <View className={`h-4 w-1.5 rounded-full ${priority.bar}`} />
                      <Text className="font-mono text-xs font-bold text-green-600 dark:text-green-400">{report.ticketId}</Text>
                      <StatusBadge status={report.status} />
                      {report.slaBreached ? (
                        <Text className="font-sans text-xs font-bold text-red-500">SLA</Text>
                      ) : null}
                    </View>
                    <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
                      {report.subject}
                    </Text>
                    <View className="mt-1 flex-row flex-wrap items-center gap-1">
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                        {CATEGORY_LABELS[report.category] || report.category}
                      </Text>
                      {report.reporter ? (
                        <>
                          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">·</Text>
                          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{report.reporter.name}</Text>
                        </>
                      ) : report.guestName ? (
                        <>
                          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">·</Text>
                          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{report.guestName} [guest]</Text>
                        </>
                      ) : null}
                      <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">·</Text>
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{formatRelative(report.createdAt)}</Text>
                      {report.comments.length > 0 ? (
                        <>
                          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">·</Text>
                          <View className="flex-row items-center gap-0.5">
                            <Feather name="message-circle" size={12} color="#94a3b8" />
                            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{report.comments.length}</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>
                  {report.assignee ? (
                    <View className="rounded-lg bg-gray-100 px-2 py-1 dark:bg-slate-700">
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{report.assignee.name}</Text>
                    </View>
                  ) : (
                    <Text className="font-sans text-xs font-semibold text-orange-500">Unassigned</Text>
                  )}
                </View>
              </Pressable>
            );
          })}

          {lastPage > 1 ? (
            <View className="flex-row flex-wrap justify-center gap-2 pt-2">
              {Array.from({ length: lastPage }, (_, index) => index + 1).map((pageNumber) => {
                const active = pageNumber === page;
                return (
                  <Pressable
                    key={pageNumber}
                    onPress={() => void load(pageNumber)}
                    className={`h-8 min-w-[32px] items-center justify-center rounded-lg px-2 ${
                      active
                        ? 'bg-green-600'
                        : 'border border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                    }`}>
                    <Text
                      className={`font-sans text-sm font-semibold ${
                        active ? 'text-white' : 'text-gray-600 dark:text-slate-400'
                      }`}>
                      {pageNumber}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      )}

      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 bg-white dark:bg-slate-900">
          {selected ? (
            <TicketDetailPanel
              ticketId={selected}
              onClose={() => setSelected(null)}
              onUpdated={() => void load(page)}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
