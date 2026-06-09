import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import {
  fetchSellerCodInvoices,
  fetchSellerWalletOverview,
  submitSellerCodInvoicePayment,
  type SellerCodInvoice,
  type SellerWalletOverview,
  type SellerWalletTransaction,
} from '@/utils/native-api';

const invoiceStatuses = ['', 'outstanding', 'overdue', 'paid', 'waived'];

const paymentMethods = [
  { value: 'kbz_pay', label: 'KBZ Pay' },
  { value: 'wave_pay', label: 'Wave Pay' },
  { value: 'cb_pay', label: 'CB Pay' },
  { value: 'aya_pay', label: 'AYA Pay' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

const emptyOverview: SellerWalletOverview = {
  wallet: {
    escrowBalanceValue: 0,
    escrowBalance: '0 MMK',
    availableBalanceValue: 0,
    availableBalance: '0 MMK',
    totalEarnedValue: 0,
    totalEarned: '0 MMK',
    totalCommissionPaidValue: 0,
    totalCommissionPaid: '0 MMK',
    codCommissionOutstandingValue: 0,
    codCommissionOutstanding: '0 MMK',
    codOverdueCount: 0,
  },
  recentTransactions: [],
  invoices: [],
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const titleCase = (value: string) =>
  value
    ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'All';

function statusTone(status: string) {
  if (status === 'paid') return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/25';
  if (status === 'overdue') return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/25';
  if (status === 'waived') return 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800';
  return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/25';
}

function statusText(status: string) {
  if (status === 'paid') return 'text-green-700 dark:text-green-300';
  if (status === 'overdue') return 'text-red-700 dark:text-red-300';
  if (status === 'waived') return 'text-gray-600 dark:text-slate-300';
  return 'text-amber-700 dark:text-amber-300';
}

function txTone(type: string) {
  if (type.includes('release') || type.includes('payment')) return '#16a34a';
  if (type.includes('hold')) return '#2563eb';
  if (type.includes('refund')) return '#dc2626';
  if (type.includes('withdraw')) return '#9333ea';
  if (type.includes('invoice')) return '#f97316';
  return '#64748b';
}

function Toast({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  if (!message) return null;
  const success = tone === 'success';
  return (
    <View className={`flex-row items-center gap-2 rounded-xl px-4 py-3 ${success ? 'bg-green-600' : 'bg-red-600'}`}>
      <Feather name={success ? 'check-circle' : 'alert-circle'} color="#fff" size={17} />
      <Text className="min-w-0 flex-1 font-sans text-sm font-bold text-white">{message}</Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  sub: string;
  accent: 'green' | 'blue' | 'orange' | 'red';
}) {
  const config = {
    green: { border: '#22c55e', bg: 'bg-green-50 dark:bg-green-900/20', color: '#16a34a' },
    blue: { border: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20', color: '#2563eb' },
    orange: { border: '#f97316', bg: 'bg-orange-50 dark:bg-orange-900/20', color: '#f97316' },
    red: { border: '#ef4444', bg: 'bg-red-50 dark:bg-red-900/20', color: '#dc2626' },
  }[accent];

  return (
    <View className={`rounded-xl p-5 ${config.bg}`} style={{ borderLeftWidth: 4, borderLeftColor: config.border }}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">{label}</Text>
          <Text className="mt-1 font-sans text-xl font-bold text-gray-950 dark:text-slate-100" numberOfLines={1}>{value}</Text>
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">{sub}</Text>
        </View>
        <Feather name={icon} color={config.color} size={28} />
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4">
      <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">{title}</Text>
      {children}
    </View>
  );
}

function TransactionRow({ tx }: { tx: SellerWalletTransaction }) {
  const positive = tx.amountValue > 0;
  return (
    <View className="gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-slate-800 md:flex-row md:items-center">
      <View className="min-w-0 flex-1 flex-row items-start gap-3">
        <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
          <Feather name="repeat" color={txTone(tx.type)} size={15} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">{tx.typeLabel || titleCase(tx.type)}</Text>
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500" numberOfLines={1}>
            {tx.notes || (tx.orderNumber ? `Order ${tx.orderNumber}` : 'Wallet ledger entry')}
          </Text>
        </View>
      </View>
      <View className="items-start md:items-end">
        <Text className={`font-sans text-sm font-bold ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {positive ? '+' : ''}{tx.amount}
        </Text>
        <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{formatDate(tx.createdAt)}</Text>
      </View>
    </View>
  );
}

function InvoiceCard({
  invoice,
  onPay,
}: {
  invoice: SellerCodInvoice;
  onPay: (invoice: SellerCodInvoice) => void;
}) {
  const canPay = ['outstanding', 'overdue'].includes(invoice.status) && !invoice.paidAt;
  const pendingConfirmation = ['outstanding', 'overdue'].includes(invoice.status) && Boolean(invoice.paidAt);

  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <View className="gap-4 lg:flex-row lg:items-start lg:justify-between">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100">{invoice.invoiceNumber}</Text>
            <View className={`rounded-full border px-2 py-0.5 ${statusTone(invoice.status)}`}>
              <Text className={`font-sans text-xs font-bold ${statusText(invoice.status)}`}>{titleCase(invoice.status)}</Text>
            </View>
            {pendingConfirmation ? (
              <View className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 dark:border-blue-800 dark:bg-blue-900/25">
                <Text className="font-sans text-xs font-bold text-blue-700 dark:text-blue-300">Awaiting Admin Confirmation</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
            Order: <Text className="font-bold">{invoice.orderNumber || invoice.orderId}</Text> - Due: {formatDate(invoice.dueDate)}
          </Text>
          {invoice.paymentReference ? (
            <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">Ref: {invoice.paymentReference}</Text>
          ) : null}
        </View>

        <View className="items-start lg:items-end">
          <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">{invoice.commissionAmount}</Text>
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
            {(invoice.commissionRate * 100).toFixed(1)}% of {invoice.orderSubtotal}
          </Text>
          {canPay ? (
            <Pressable onPress={() => onPay(invoice)} className="mt-3 rounded-lg bg-green-600 px-4 py-2">
              <Text className="font-sans text-xs font-bold text-white">Pay Now</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PaymentModal({
  invoice,
  loading,
  onClose,
  onSubmit,
}: {
  invoice: SellerCodInvoice;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { paymentReference: string; paymentMethod: string; sellerNotes: string }) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState('kbz_pay');
  const [paymentReference, setPaymentReference] = useState('');
  const [sellerNotes, setSellerNotes] = useState('');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
          <View className="border-b border-gray-100 p-5 dark:border-slate-800">
            <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">Submit COD Commission Payment</Text>
            <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">Invoice {invoice.invoiceNumber}</Text>
          </View>

          <View className="gap-4 p-5">
            <View className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/25">
              <Text className="font-sans text-sm font-bold text-orange-800 dark:text-orange-300">Amount Due</Text>
              <Text className="mt-1 font-sans text-2xl font-bold text-orange-900 dark:text-orange-200">{invoice.commissionAmount}</Text>
              <Text className="mt-1 font-sans text-xs text-orange-700 dark:text-orange-400">Due by {formatDate(invoice.dueDate)}</Text>
            </View>

            <View className="gap-2">
              <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Payment Method</Text>
              <View className="flex-row flex-wrap gap-2">
                {paymentMethods.map((method) => {
                  const active = paymentMethod === method.value;
                  return (
                    <Pressable
                      key={method.value}
                      onPress={() => setPaymentMethod(method.value)}
                      className={`rounded-lg border px-3 py-2 ${active ? 'border-green-600 bg-green-600' : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}
                    >
                      <Text className={`font-sans text-xs font-bold ${active ? 'text-white' : 'text-gray-600 dark:text-slate-300'}`}>{method.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="gap-2">
              <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Transaction Reference *</Text>
              <TextInput
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="e.g. TXN-20260405-001"
                placeholderTextColor="#94a3b8"
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </View>

            <View className="gap-2">
              <Text className="font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Notes</Text>
              <TextInput
                value={sellerNotes}
                onChangeText={setSellerNotes}
                placeholder="Any additional info for admin"
                placeholderTextColor="#94a3b8"
                multiline
                className="min-h-20 rounded-xl border border-gray-200 bg-white px-3 py-3 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </View>

            <Text className="font-sans text-xs leading-5 text-gray-400 dark:text-slate-500">
              After submitting, the platform admin will verify and confirm your payment. Status will update once confirmed.
            </Text>
          </View>

          <View className="flex-row gap-3 border-t border-gray-100 p-5 dark:border-slate-800">
            <Pressable disabled={loading} onPress={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700 disabled:opacity-50">
              <Text className="text-center font-sans text-sm font-bold text-gray-700 dark:text-slate-200">Cancel</Text>
            </Pressable>
            <Pressable
              disabled={loading || !paymentReference.trim()}
              onPress={() => onSubmit({ paymentMethod, paymentReference, sellerNotes })}
              className="flex-1 rounded-xl bg-green-600 px-4 py-3 disabled:opacity-50"
            >
              <Text className="text-center font-sans text-sm font-bold text-white">{loading ? 'Submitting...' : 'Submit Payment'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SellerWalletNative({ onRefresh }: { onRefresh?: () => void | Promise<void> }) {
  const { width } = useWindowDimensions();
  const [overview, setOverview] = useState<SellerWalletOverview>(emptyOverview);
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payModal, setPayModal] = useState<SellerCodInvoice | null>(null);
  const [txExpanded, setTxExpanded] = useState(false);
  const [toast, setToast] = useState({ message: '', tone: 'success' as 'success' | 'error' });

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
    setTimeout(() => setToast({ message: '', tone }), 4000);
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      setOverview(await fetchSellerWalletOverview(invoiceFilter, signal));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load wallet data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [invoiceFilter, showToast]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => void load(controller.signal), 0);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [load]);

  const handleFilterChange = async (status: string) => {
    setInvoiceFilter(status);
    setInvoiceLoading(true);
    try {
      const invoices = await fetchSellerCodInvoices(status);
      setOverview((current) => ({ ...current, invoices }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load invoices.', 'error');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleSubmitPayment = async (payload: { paymentReference: string; paymentMethod: string; sellerNotes: string }) => {
    if (!payModal) return;
    setSubmitting(true);
    try {
      const response = await submitSellerCodInvoicePayment(payModal.id, payload);
      showToast(response.message);
      setPayModal(null);
      await load();
      await onRefresh?.();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Submission failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const hasOutstanding = overview.wallet.codCommissionOutstandingValue > 0;
  const visibleTransactions = useMemo(
    () => (txExpanded ? overview.recentTransactions : overview.recentTransactions.slice(0, 8)),
    [overview.recentTransactions, txExpanded]
  );
  const statCardWidth = width >= 1180 ? '23.5%' : width >= 760 ? '48%' : '100%';

  if (loading) {
    return (
      <View className="items-center justify-center rounded-2xl border border-gray-200 bg-white p-10 dark:border-slate-800 dark:bg-slate-900">
        <ActivityIndicator color="#16a34a" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View className="mx-auto w-full max-w-5xl gap-6">
      <Toast message={toast.message} tone={toast.tone} />

      <View className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <View>
          <Text className="font-sans text-2xl font-bold text-gray-950 dark:text-slate-100">My Wallet</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">Track your earnings, escrow, and COD commission invoices.</Text>
        </View>
        <Pressable onPress={() => void load()} className="flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900">
          <Feather name="refresh-cw" color="#64748b" size={16} />
          <Text className="font-sans text-sm font-bold text-gray-600 dark:text-slate-300">Refresh</Text>
        </Pressable>
      </View>

      {hasOutstanding ? (
        <View className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="alert-triangle" color="#ef4444" size={20} />
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-sm font-bold text-red-800 dark:text-red-300">COD Commission Outstanding</Text>
            <Text className="mt-1 font-sans text-sm leading-5 text-red-700 dark:text-red-400">
              You owe {overview.wallet.codCommissionOutstanding} in COD commission to the platform. Please settle outstanding invoices below.
            </Text>
          </View>
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-4">
        {[
          { icon: 'lock' as const, label: 'In Escrow', value: overview.wallet.escrowBalance, sub: 'Held until delivery confirmed', accent: 'blue' as const },
          { icon: 'dollar-sign' as const, label: 'Available Balance', value: overview.wallet.availableBalance, sub: 'Released after delivery', accent: 'green' as const },
          { icon: 'download' as const, label: 'Total Earned', value: overview.wallet.totalEarned, sub: 'Lifetime seller payout', accent: 'green' as const },
          { icon: 'file-text' as const, label: 'COD Outstanding', value: overview.wallet.codCommissionOutstanding, sub: 'Commission owed to platform', accent: hasOutstanding ? 'red' as const : 'orange' as const },
        ].map((card) => (
          <View key={card.label} style={{ width: statCardWidth, minWidth: width >= 760 ? 240 : undefined }}>
            <StatCard {...card} />
          </View>
        ))}
      </View>

      <View className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <Text className="font-sans text-sm font-bold text-amber-900 dark:text-amber-300">Platform Commission Policy</Text>
        <Text className="mt-2 font-sans text-xs leading-5 text-amber-800 dark:text-amber-400">
          Digital payments are held in escrow until delivery is confirmed. COD sellers collect full payment from buyers, then pay platform commission through COD invoices.
        </Text>
      </View>

      <Section title="Wallet Transactions">
        {overview.recentTransactions.length === 0 ? (
          <View className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">No transactions yet.</Text>
          </View>
        ) : (
          <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {visibleTransactions.map((transaction) => <TransactionRow key={transaction.id} tx={transaction} />)}
            {overview.recentTransactions.length > 8 ? (
              <Pressable onPress={() => setTxExpanded((current) => !current)} className="flex-row items-center justify-center gap-1 border-t border-gray-100 px-4 py-3 dark:border-slate-800">
                <Feather name={txExpanded ? 'chevron-up' : 'chevron-down'} color="#16a34a" size={16} />
                <Text className="font-sans text-sm font-bold text-green-600 dark:text-green-400">
                  {txExpanded ? 'Show less' : `Show all ${overview.recentTransactions.length} transactions`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </Section>

      <Section title="COD Commission Invoices">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {invoiceStatuses.map((status) => {
            const active = invoiceFilter === status;
            return (
              <Pressable
                key={status || 'all'}
                onPress={() => void handleFilterChange(status)}
                className={`rounded-full border px-3 py-2 ${active ? 'border-green-600 bg-green-600' : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
              >
                <Text className={`font-sans text-xs font-bold ${active ? 'text-white' : 'text-gray-600 dark:text-slate-300'}`}>{status ? titleCase(status) : 'All'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {invoiceLoading ? (
          <View className="rounded-xl border border-gray-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <ActivityIndicator color="#16a34a" />
          </View>
        ) : overview.invoices.length === 0 ? (
          <View className="items-center rounded-xl border border-gray-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <Feather name="file-text" color="#94a3b8" size={30} />
            <Text className="mt-2 font-sans text-sm text-gray-500 dark:text-slate-400">No COD invoices found.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {overview.invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onPay={setPayModal} />)}
          </View>
        )}
      </Section>

      {payModal ? (
        <PaymentModal invoice={payModal} loading={submitting} onClose={() => setPayModal(null)} onSubmit={handleSubmitPayment} />
      ) : null}
    </View>
  );
}
