import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTranslation } from '@/i18n';
import {
  confirmAdminCodInvoicePayment,
  fetchAdminCodInvoices,
  formatMMK,
  waiveAdminCodInvoice,
  type AdminCodInvoice,
  type AdminCodInvoiceSummary,
} from '@/utils/native-api';

type InvoiceFilter = '' | 'outstanding' | 'overdue' | 'paid' | 'waived';
type ModalMode = 'confirm' | 'waive';

const STATUS_TONE: Record<string, { wrap: string; text: string; label: string }> = {
  outstanding: {
    label: 'Outstanding',
    wrap: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-300',
  },
  overdue: {
    label: 'Overdue',
    wrap: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-300',
  },
  paid: {
    label: 'Paid',
    wrap: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-300',
  },
  waived: {
    label: 'Waived',
    wrap: 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600',
    text: 'text-gray-600 dark:text-slate-400',
  },
};

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPaymentMethod(method: string) {
  return (method || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
  borderTone,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: keyof typeof Feather.glyphMap;
  borderTone: 'yellow' | 'red' | 'orange' | 'green';
}) {
  const tones = {
    yellow: 'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    red: 'border-l-red-400 bg-red-50 dark:bg-red-900/20',
    orange: 'border-l-orange-400 bg-orange-50 dark:bg-orange-900/20',
    green: 'border-l-green-400 bg-green-50 dark:bg-green-900/20',
  };

  return (
    <View className={`rounded-xl border-l-4 p-4 shadow-sm ${tones[borderTone]}`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {label}
          </Text>
          <Text className="mt-1 font-sans text-xl font-bold text-gray-900 dark:text-slate-100" numberOfLines={1}>
            {value}
          </Text>
          <Text className="mt-0.5 font-sans text-[11px] text-gray-500 dark:text-slate-400">{sub}</Text>
        </View>
        <Feather name={icon} size={24} color="#cbd5e1" />
      </View>
    </View>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const { t } = useAppTranslation();
  const tone = STATUS_TONE[status] || STATUS_TONE.outstanding;
  const label = t(`admin.codInvoiceManagement.status.${status}`, tone.label);

  return (
    <View className={`self-start rounded-full border px-2.5 py-1 ${tone.wrap}`}>
      <Text className={`font-sans text-[11px] font-semibold ${tone.text}`}>{label}</Text>
    </View>
  );
}

function ConfirmModal({
  visible,
  invoice,
  mode,
  submitting,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  invoice: AdminCodInvoice | null;
  mode: ModalMode;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (body: { admin_notes: string }) => void;
}) {
  const { t } = useAppTranslation();
  const [notes, setNotes] = useState('');
  const isConfirm = mode === 'confirm';

  useEffect(() => {
    if (visible) setNotes('');
  }, [visible, invoice?.id, mode]);

  if (!visible || !invoice) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">
              {isConfirm
                ? t('admin.codInvoiceManagement.modal.confirmTitle', 'Confirm COD Payment Receipt')
                : t('admin.codInvoiceManagement.modal.waiveTitle', 'Waive Invoice')}
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">{invoice.invoiceNumber}</Text>
          </View>

          <ScrollView className="px-5 py-4" contentContainerClassName="gap-4">
            <View className="gap-2 rounded-lg border border-gray-200 p-4 dark:border-slate-600">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('admin.codInvoiceManagement.modal.seller', 'Seller')}
                </Text>
                <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-200">
                  {invoice.sellerName || '—'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('admin.codInvoiceManagement.modal.order', 'Order')}
                </Text>
                <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-200">
                  {invoice.orderNumber}
                </Text>
              </View>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('admin.codInvoiceManagement.modal.commissionDue', 'Commission Due')}
                </Text>
                <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                  {invoice.commissionAmount}
                </Text>
              </View>
              {isConfirm && invoice.paymentReference ? (
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                    {t('admin.codInvoiceManagement.modal.paymentRef', 'Payment Ref')}
                  </Text>
                  <Text className="font-sans text-sm font-medium text-green-700 dark:text-green-400">
                    {invoice.paymentReference}
                  </Text>
                </View>
              ) : null}
              {isConfirm && invoice.paymentMethod ? (
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                    {t('admin.codInvoiceManagement.modal.method', 'Method')}
                  </Text>
                  <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-200">
                    {formatPaymentMethod(invoice.paymentMethod)}
                  </Text>
                </View>
              ) : null}
              {isConfirm && invoice.sellerNotes ? (
                <View className="border-t border-gray-100 pt-2 dark:border-slate-600">
                  <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                    {t('admin.codInvoiceManagement.modal.sellerNote', 'Seller Note:')}
                  </Text>
                  <Text className="mt-0.5 font-sans text-sm text-gray-700 dark:text-slate-300">{invoice.sellerNotes}</Text>
                </View>
              ) : null}
            </View>

            {!isConfirm ? (
              <View className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                <Text className="font-sans text-xs leading-relaxed text-yellow-800 dark:text-yellow-300">
                  {t(
                    'admin.codInvoiceManagement.modal.waiveWarning',
                    'Waiving removes the obligation — the seller will not need to pay this commission. Use only for disputes or refunds.',
                  )}
                </Text>
              </View>
            ) : null}

            <View>
              <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('admin.codInvoiceManagement.modal.adminNotes', 'Admin Notes')}
                {!isConfirm ? <Text className="text-red-500"> *</Text> : null}
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                editable={!submitting}
                multiline
                numberOfLines={3}
                placeholder={
                  isConfirm
                    ? t('admin.codInvoiceManagement.modal.adminNotesOptional', 'Optional notes for records...')
                    : t('admin.codInvoiceManagement.modal.adminNotesRequired', 'Reason for waiving (required)')
                }
                placeholderTextColor="#94a3b8"
                className="min-h-[88px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View className="flex-row justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-700">
            <Pressable
              disabled={submitting}
              onPress={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600">
              <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">
                {t('admin.codInvoiceManagement.cancel', 'Cancel')}
              </Text>
            </Pressable>
            <Pressable
              disabled={submitting || (!isConfirm && !notes.trim())}
              onPress={() => onConfirm({ admin_notes: notes.trim() })}
              className={`flex-row items-center gap-2 rounded-lg px-4 py-2 ${
                submitting || (!isConfirm && !notes.trim())
                  ? isConfirm
                    ? 'bg-green-600/50'
                    : 'bg-red-600/50'
                  : isConfirm
                    ? 'bg-green-600'
                    : 'bg-red-600'
              }`}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text className="font-sans text-sm font-medium text-white">
                {isConfirm
                  ? t('admin.codInvoiceManagement.modal.confirmReceipt', 'Confirm Receipt')
                  : t('admin.codInvoiceManagement.modal.waiveInvoice', 'Waive Invoice')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function CodInvoiceManagementNative() {
  const { t } = useAppTranslation();
  const [invoices, setInvoices] = useState<AdminCodInvoice[]>([]);
  const [summary, setSummary] = useState<AdminCodInvoiceSummary>({
    outstandingCount: 0,
    outstandingAmount: 0,
    overdueCount: 0,
    collectedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InvoiceFilter>('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ invoice: AdminCodInvoice; mode: ModalMode } | null>(null);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (status: InvoiceFilter = filter) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAdminCodInvoices(status);
      setInvoices(result.invoices);
      setSummary(result.summary);
    } catch {
      setError(t('admin.codInvoiceManagement.errors.load', 'Failed to load invoices.'));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFilterChange = (nextFilter: InvoiceFilter) => {
    setFilter(nextFilter);
    void load(nextFilter);
  };

  const handleConfirm = async (body: { admin_notes: string }) => {
    if (!modal) return;
    setActing(true);
    setError('');
    try {
      await confirmAdminCodInvoicePayment(modal.invoice.id, {
        admin_notes: body.admin_notes || undefined,
      });
      setMessage(
        t('admin.codInvoiceManagement.messages.confirmed', 'Payment confirmed. Seller wallet updated.'),
      );
      setModal(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.codInvoiceManagement.errors.action', 'Action failed.'),
      );
    } finally {
      setActing(false);
    }
  };

  const handleWaive = async (body: { admin_notes: string }) => {
    if (!modal) return;
    setActing(true);
    setError('');
    try {
      await waiveAdminCodInvoice(modal.invoice.id, { admin_notes: body.admin_notes });
      setMessage(t('admin.codInvoiceManagement.messages.waived', 'Invoice waived.'));
      setModal(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin.codInvoiceManagement.errors.action', 'Action failed.'),
      );
    } finally {
      setActing(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return invoices;
    return invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.sellerName.toLowerCase().includes(query) ||
        invoice.orderNumber.toLowerCase().includes(query),
    );
  }, [invoices, search]);

  const filterOptions: { value: InvoiceFilter; label: string }[] = [
    { value: '', label: t('admin.codInvoiceManagement.filters.all', 'All') },
    { value: 'outstanding', label: t('admin.codInvoiceManagement.filters.outstanding', 'Outstanding') },
    { value: 'overdue', label: t('admin.codInvoiceManagement.filters.overdue', 'Overdue') },
    { value: 'paid', label: t('admin.codInvoiceManagement.filters.paid', 'Paid') },
    { value: 'waived', label: t('admin.codInvoiceManagement.filters.waived', 'Waived') },
  ];

  if (loading && invoices.length === 0) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
          {t('admin.codInvoiceManagement.loading', 'Loading invoices...')}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <ConfirmModal
        visible={Boolean(modal)}
        invoice={modal?.invoice ?? null}
        mode={modal?.mode ?? 'confirm'}
        submitting={acting}
        onClose={() => setModal(null)}
        onConfirm={(body) => void (modal?.mode === 'confirm' ? handleConfirm(body) : handleWaive(body))}
      />

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t('admin.codInvoiceManagement.title', 'COD Commission Invoices')}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t(
              'admin.codInvoiceManagement.subtitle',
              'Track and confirm commission payments from sellers who received cash on delivery.',
            )}
          </Text>
        </View>
        <Pressable
          onPress={() => void load()}
          className="h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Feather name="refresh-cw" color="#64748b" size={16} />
        </Pressable>
      </View>

      {error ? (
        <Pressable
          onPress={() => setError('')}
          className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-circle" color="#dc2626" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Pressable onPress={() => void load()}>
            <Text className="font-sans text-xs font-semibold text-red-700 underline dark:text-red-300">
              {t('admin.orderManagement.retry', 'Retry')}
            </Text>
          </Pressable>
        </Pressable>
      ) : null}

      {message ? (
        <Pressable
          onPress={() => setMessage('')}
          className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" color="#15803d" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-800 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        <View className="w-[47%] lg:w-[23%]">
          <SummaryCard
            label={t('admin.codInvoiceManagement.summary.outstanding', 'Outstanding')}
            value={summary.outstandingCount}
            sub={formatMMK(summary.outstandingAmount)}
            icon="clock"
            borderTone="yellow"
          />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <SummaryCard
            label={t('admin.codInvoiceManagement.summary.overdue', 'Overdue')}
            value={summary.overdueCount}
            sub={t('admin.codInvoiceManagement.summary.overdueSub', 'Past due date')}
            icon="alert-triangle"
            borderTone="red"
          />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <SummaryCard
            label={t('admin.codInvoiceManagement.summary.totalOutstanding', 'Total Outstanding')}
            value={formatMMK(summary.outstandingAmount)}
            sub={t('admin.codInvoiceManagement.summary.totalOutstandingSub', 'To be collected')}
            icon="dollar-sign"
            borderTone="orange"
          />
        </View>
        <View className="w-[47%] lg:w-[23%]">
          <SummaryCard
            label={t('admin.codInvoiceManagement.summary.collectedThisMonth', 'Collected This Month')}
            value={formatMMK(summary.collectedThisMonth)}
            sub={t('admin.codInvoiceManagement.summary.collectedThisMonthSub', 'COD commissions')}
            icon="check-circle"
            borderTone="green"
          />
        </View>
      </View>

      <View className="gap-3">
        <View className="relative">
          <View className="absolute left-3 top-0 z-10 h-10 justify-center">
            <Feather name="search" size={16} color="#94a3b8" />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('admin.codInvoiceManagement.searchPlaceholder', 'Search invoice, seller, order…')}
            placeholderTextColor="#94a3b8"
            className="h-10 rounded-lg border border-gray-300 bg-white pl-9 pr-4 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </View>

        <View className="flex-row flex-wrap gap-2">
          {filterOptions.map((option) => {
            const active = filter === option.value;
            return (
              <Pressable
                key={option.value || 'all'}
                onPress={() => handleFilterChange(option.value)}
                className={`rounded-full border px-3 py-1.5 ${
                  active
                    ? 'border-green-600 bg-green-600'
                    : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}>
                <Text
                  className={`font-sans text-xs font-medium ${
                    active ? 'text-white' : 'text-gray-600 dark:text-slate-400'
                  }`}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#16a34a" size="large" />
          </View>
        ) : filteredInvoices.length === 0 ? (
          <View className="items-center px-6 py-14">
            <Feather name="file-text" color="#94a3b8" size={40} />
            <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
              {t('admin.codInvoiceManagement.empty', 'No invoices found.')}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[1120px]">
              <View className="flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                {[
                  { key: 'invoice', label: t('admin.codInvoiceManagement.columns.invoice', 'Invoice'), width: 'w-[130px]' },
                  { key: 'seller', label: t('admin.codInvoiceManagement.columns.seller', 'Seller'), width: 'w-[150px]' },
                  { key: 'order', label: t('admin.codInvoiceManagement.columns.order', 'Order'), width: 'w-[110px]' },
                  {
                    key: 'commission',
                    label: t('admin.codInvoiceManagement.columns.commission', 'Commission'),
                    width: 'w-[130px]',
                  },
                  { key: 'dueDate', label: t('admin.codInvoiceManagement.columns.dueDate', 'Due Date'), width: 'w-[110px]' },
                  { key: 'status', label: t('admin.codInvoiceManagement.columns.status', 'Status'), width: 'w-[170px]' },
                  { key: 'paymentRef', label: t('admin.codInvoiceManagement.columns.paymentRef', 'Payment Ref'), width: 'w-[120px]' },
                  { key: 'actions', label: t('admin.codInvoiceManagement.columns.actions', 'Actions'), width: 'w-[180px]' },
                ].map((column) => (
                  <View key={column.key} className={`${column.width} px-2`}>
                    <Text className="font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      {column.label}
                    </Text>
                  </View>
                ))}
              </View>

              {filteredInvoices.map((invoice) => {
                const pendingPayment = ['outstanding', 'overdue'].includes(invoice.status) && Boolean(invoice.paidAt);
                const canAct = ['outstanding', 'overdue'].includes(invoice.status);

                return (
                  <View
                    key={String(invoice.id)}
                    className="flex-row border-t border-gray-100 px-4 py-3 dark:border-slate-700">
                    <View className="w-[130px] justify-center px-2">
                      <Text className="font-sans text-xs font-semibold text-gray-800 dark:text-slate-100">
                        {invoice.invoiceNumber}
                      </Text>
                      <Text className="mt-0.5 font-sans text-[10px] text-gray-400 dark:text-slate-500">
                        {formatDate(invoice.createdAt)}
                      </Text>
                    </View>
                    <View className="w-[150px] justify-center px-2">
                      <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
                        {invoice.sellerName || '—'}
                      </Text>
                      {invoice.sellerEmail ? (
                        <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500" numberOfLines={1}>
                          {invoice.sellerEmail}
                        </Text>
                      ) : null}
                    </View>
                    <View className="w-[110px] justify-center px-2">
                      <Text className="font-sans text-xs text-gray-700 dark:text-slate-300">
                        {invoice.orderNumber || String(invoice.orderId)}
                      </Text>
                    </View>
                    <View className="w-[130px] justify-center px-2">
                      <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                        {invoice.commissionAmount}
                      </Text>
                      <Text className="font-sans text-[10px] text-gray-400 dark:text-slate-500">
                        {(invoice.commissionRate * 100).toFixed(1)}% commission
                      </Text>
                    </View>
                    <View className="w-[110px] justify-center px-2">
                      <Text
                        className={`font-sans text-sm ${
                          invoice.status === 'overdue'
                            ? 'font-semibold text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-slate-400'
                        }`}>
                        {formatDate(invoice.dueDate)}
                      </Text>
                    </View>
                    <View className="w-[170px] justify-center gap-1 px-2">
                      <InvoiceStatusBadge status={invoice.status} />
                      {pendingPayment ? (
                        <View className="self-start rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 dark:border-blue-800 dark:bg-blue-900/30">
                          <Text className="font-sans text-[10px] font-medium text-blue-700 dark:text-blue-300">
                            {t('admin.codInvoiceManagement.pendingConfirmation', 'Pending Confirmation')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="w-[120px] justify-center px-2">
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
                        {invoice.paymentReference || '—'}
                      </Text>
                    </View>
                    <View className="w-[180px] items-end justify-center gap-1.5 px-2">
                      {canAct ? (
                        <View className="flex-row flex-wrap justify-end gap-1.5">
                          <Pressable
                            onPress={() => setModal({ invoice, mode: 'confirm' })}
                            className="rounded-lg bg-green-600 px-3 py-1.5">
                            <Text className="font-sans text-[11px] font-medium text-white">
                              {t('admin.codInvoiceManagement.actions.confirm', 'Confirm')}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setModal({ invoice, mode: 'waive' })}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 dark:border-slate-600">
                            <Text className="font-sans text-[11px] font-medium text-gray-600 dark:text-slate-300">
                              {t('admin.codInvoiceManagement.actions.waive', 'Waive')}
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                      {invoice.status === 'paid' ? (
                        <Text className="font-sans text-[11px] text-gray-400 dark:text-slate-500">
                          {t('admin.codInvoiceManagement.actions.confirmedOn', 'Confirmed {{date}}', {
                            date: formatDate(invoice.confirmedAt),
                          })}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
