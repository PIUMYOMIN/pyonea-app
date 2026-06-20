import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_CLASS } from '@/constants/layout';
import { GoogleCustomerReviewsOptIn } from '@/components/ui/google-customer-reviews-opt-in';
import { useAppTranslation } from '@/i18n';
import {
  fetchPaymentReceipt,
  type PaymentReceiptAddress,
  type PaymentReceiptCustomer,
  type PaymentReceiptOrder,
  type TrackedOrderItem,
} from '@/utils/native-api';
import { getThumbUrl } from '@/utils/image-thumbs';
import { useMergedRouteParams } from '@/utils/route-params';

import { BRAND_LOGO, BRAND_LOGO_PUBLIC_URL } from '@/constants/brand';

const placeholderProduct = require('@/assets/images/placeholder-product.png');

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const extractOrderId = (value: string | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return trimmed;

  try {
    const parsed = JSON.parse(trimmed) as { id?: string | number; order_id?: string | number; order_number?: string };
    return String(parsed.id || parsed.order_id || parsed.order_number || '');
  } catch {
    return trimmed;
  }
};

const parseOrderIds = (params: Record<string, string | string[] | undefined>) => {
  const fromList = getParam(params.order_ids);
  if (fromList) {
    return fromList
      .split(',')
      .map((entry) => extractOrderId(entry.trim()))
      .filter(Boolean);
  }

  const single = extractOrderId(
    getParam(params.order_id) || getParam(params.id) || getParam(params.order) || getParam(params.orderNumber),
  );

  return single ? [single] : [];
};

const isOrderPaid = (order: PaymentReceiptOrder) =>
  String(order.paymentStatus).toLowerCase() === 'paid';

const isCodPending = (order: PaymentReceiptOrder) =>
  order.paymentMethod === 'cash_on_delivery' &&
  ['pending', 'unpaid'].includes(String(order.paymentStatus).toLowerCase());

const formatReceiptDate = (value: string, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-MM', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatPaymentMethod = (value: string, fallback: string) => {
  if (!value) return fallback;
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

/** Renders the receipt markup to a high-quality PDF and opens the system share/save dialog. */
const generateReceiptPdf = async (css: string, bodyHtml: string, fileName: string) => {
  try {
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            ${css}
            @media print {
              body { margin: 0; padding: 0; background: #fff; }
              .pyo-slip .receipt { border: 0; border-radius: 0; box-shadow: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="pyo-slip">${bodyHtml}</div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: fileName,
    });
  } catch (error) {
    console.error('Failed to generate or share PDF:', error);
    throw error;
  }
};

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800 sm:w-[48%]">
      <Text className="font-sans text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-slate-400">
        {label}
      </Text>
      <Text className="mt-1 font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
        {value}
      </Text>
    </View>
  );
}

function InfoLine({ label, value }: { label?: string; value: string }) {
  if (!value) return null;

  return (
    <Text className="font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
      {label ? <Text className="font-semibold">{label}: </Text> : null}
      {value}
    </Text>
  );
}

function PersonBlock({
  title,
  customer,
  address,
  emptyValue,
}: {
  title: string;
  customer?: PaymentReceiptCustomer;
  address?: PaymentReceiptAddress;
  emptyValue: string;
}) {
  const lines = address
    ? [
        address.fullName,
        address.address,
        [address.township, address.city, address.state].filter(Boolean).join(', '),
        [address.postalCode, address.country].filter(Boolean).join(', '),
      ].filter(Boolean)
    : [];

  return (
    <View className="flex-1 rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <Text className="mb-3 font-sans text-sm font-bold text-gray-900 dark:text-slate-100">{title}</Text>
      {customer ? (
        <>
          <InfoLine value={customer.name || emptyValue} />
          <InfoLine value={customer.email || emptyValue} />
          <InfoLine value={customer.phone || emptyValue} />
        </>
      ) : (
        <>
          {lines.length > 0 ? (
            lines.map((line) => <InfoLine key={line} value={line} />)
          ) : (
            <InfoLine value={emptyValue} />
          )}
          <InfoLine value={address?.phone || ''} />
        </>
      )}
    </View>
  );
}

function ReceiptItem({ item, emptyValue }: { item: TrackedOrderItem; emptyValue: string }) {
  return (
    <View className="gap-3 border-b border-gray-100 py-4 last:border-b-0 dark:border-slate-800 sm:flex-row sm:items-center">
      <View className="flex-row flex-1 gap-3">
        <View className="h-14 w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
          <Image
            source={item.imageUrl ? { uri: getThumbUrl(item.imageUrl, 160) } : placeholderProduct}
            className="h-full w-full"
            contentFit="contain"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={2}>
            {item.productName}
          </Text>
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
            SKU: {item.productSku || emptyValue}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between gap-4 sm:w-64">
        <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">x{item.quantity}</Text>
        <Text className="font-sans text-xs text-gray-600 dark:text-slate-300">{item.price}</Text>
        <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">{item.subtotal}</Text>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text
        className={`font-sans ${
          strong
            ? 'text-base font-bold text-gray-950 dark:text-slate-100'
            : 'text-sm text-gray-600 dark:text-slate-400'
        }`}>
        {label}
      </Text>
      <Text
        className={`font-sans ${
          strong
            ? 'text-lg font-bold text-green-700 dark:text-green-300'
            : 'text-sm font-semibold text-gray-900 dark:text-slate-100'
        }`}>
        {value}
      </Text>
    </View>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Text className="mb-4 font-sans text-lg font-bold text-gray-950 dark:text-slate-100">{title}</Text>
      {children}
    </View>
  );
}

export function PaymentSuccessNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mergedParams = useMergedRouteParams(params as Record<string, string | string[] | undefined>);
  const orderIds = useMemo(() => parseOrderIds(mergedParams), [mergedParams]);
  const orderId = orderIds[0] || '';
  const relatedOrderIds = useMemo(() => orderIds.slice(1), [orderIds]);
  const [order, setOrder] = useState<PaymentReceiptOrder | null>(null);
  const [relatedOrders, setRelatedOrders] = useState<PaymentReceiptOrder[]>([]);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(orderId ? '' : t('payment_success.invalid_order'));
  const emptyValue = t('payment_success.not_available');

  useEffect(() => {
    if (!orderId) return;
    const controller = new AbortController();

    const loadOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const [primary, ...related] = await Promise.all([
          fetchPaymentReceipt(orderId, controller.signal),
          ...relatedOrderIds.map((id) => fetchPaymentReceipt(id, controller.signal)),
        ]);
        if (!controller.signal.aborted) {
          setOrder(primary);
          setRelatedOrders(related);
        }
      } catch {
        if (!controller.signal.aborted) setError(t('payment_success.load_failed'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadOrders();

    return () => controller.abort();
  }, [orderId, relatedOrderIds, t]);

  const handleShare = async () => {
    if (!order) return;
    const message = t('payment_success.share_text', { orderNumber: order.orderNumber });
    await Share.share({
      title: t('payment_success.share_title', { orderNumber: order.orderNumber }),
      message,
    });
  };

  const handleDownloadPaySlip = async () => {
    if (!order) return;

    const orderDate = formatReceiptDate(order.createdAt, emptyValue);
    const paymentDate = formatReceiptDate(order.paymentDate, emptyValue);
    const paymentMethod = formatPaymentMethod(order.paymentMethod, emptyValue);
    const taxLabel = t('payment_success.tax_with_rate', { rate: Math.round(order.taxRate * 100) });
    const paid = isOrderPaid(order);
    const codPending = isCodPending(order);
    const statusBadgeLabel = paid
      ? t('payment_success.paid')
      : codPending
        ? t('payment_success.order_confirmed')
        : t('payment_success.pending_payment', { defaultValue: 'Pending payment' });
    const statusMetaValue = paid
      ? t('payment_success.paid')
      : codPending
        ? t('payment_success.order_confirmed')
        : t('payment_success.pending_payment', { defaultValue: 'Pending payment' });
    const totalPaidLabel = paid
      ? t('payment_success.total_paid')
      : t('payment_success.order_total', { defaultValue: 'Order total' });

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      await handleShare();
      return;
    }

    setDownloading(true);

    const customerLines = [order.customer?.name, order.customer?.email, order.customer?.phone]
      .filter(Boolean)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('');
    const shippingLines = order.shippingAddress
      ? [
          order.shippingAddress.fullName,
          order.shippingAddress.address,
          [order.shippingAddress.township, order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', '),
          [order.shippingAddress.postalCode, order.shippingAddress.country].filter(Boolean).join(', '),
          order.shippingAddress.phone,
        ]
          .filter(Boolean)
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('')
      : '';
    const itemRows = order.items.length
      ? order.items
          .map(
            (item) => `
              <tr>
                <td>
                  <strong>${escapeHtml(item.productName)}</strong>
                  <span>SKU: ${escapeHtml(item.productSku || emptyValue)}</span>
                </td>
                <td>${escapeHtml(item.quantity)}</td>
                <td>${escapeHtml(item.price)}</td>
                <td>${escapeHtml(item.subtotal)}</td>
              </tr>
            `,
          )
          .join('')
      : `<tr><td colspan="4" class="empty">${escapeHtml(t('payment_success.no_items'))}</td></tr>`;

    const receiptCss = `
      .pyo-slip, .pyo-slip * { box-sizing: border-box; }
      .pyo-slip { color: #111827; font-family: Arial, "Noto Sans Myanmar", sans-serif; }
      .pyo-slip .receipt { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 23, 42, .08); }
      .pyo-slip .header { display: flex; justify-content: space-between; gap: 24px; padding: 24px 26px; border-bottom: 3px solid #16a34a; }
      .pyo-slip .brand { display: flex; gap: 12px; align-items: flex-start; }
      .pyo-slip .brand img { width: 58px; height: 58px; object-fit: contain; }
      .pyo-slip .brand h1 { margin: 2px 0 4px; font-size: 22px; font-weight: 800; }
      .pyo-slip .brand p, .pyo-slip .muted { margin: 0; color: #6b7280; font-size: 11px; line-height: 1.55; }
      .pyo-slip .title { text-align: right; min-width: 190px; }
      .pyo-slip .title h2 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
      .pyo-slip .paid { display: inline-block; margin-top: 10px; padding: 7px 13px; border-radius: 999px; background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .pyo-slip .body { padding: 24px 26px 22px; }
      .pyo-slip .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
      .pyo-slip .box { padding: 11px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb; }
      .pyo-slip .box span { display: block; color: #6b7280; font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
      .pyo-slip .box strong { display: block; margin-top: 5px; font-size: 12px; }
      .pyo-slip .parties { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
      .pyo-slip .party { min-height: 116px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; }
      .pyo-slip .party h3 { margin: 0 0 10px; font-size: 13px; }
      .pyo-slip .party p { margin: 4px 0; color: #374151; font-size: 12px; line-height: 1.45; }
      .pyo-slip table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
      .pyo-slip th { padding: 9px 8px; border-bottom: 1px solid #d1d5db; background: #f3f4f6; color: #374151; font-size: 10px; font-weight: 800; text-transform: uppercase; text-align: left; }
      .pyo-slip td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
      .pyo-slip td span { display: block; margin-top: 4px; color: #6b7280; font-size: 10px; }
      .pyo-slip th:nth-child(n+2), .pyo-slip td:nth-child(n+2) { text-align: right; white-space: nowrap; }
      .pyo-slip .empty { text-align: center !important; color: #6b7280; }
      .pyo-slip .summary { width: min(100%, 320px); margin: 20px 0 0 auto; }
      .pyo-slip .row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; color: #4b5563; font-size: 12px; }
      .pyo-slip .row strong { color: #111827; }
      .pyo-slip .total { margin-top: 8px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 15px; font-weight: 800; }
      .pyo-slip .total strong { color: #15803d; font-size: 17px; }
      .pyo-slip .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 10px; }
    `;

    const receiptBody = `
          <main class="receipt">
            <section class="header">
              <div class="brand">
                <img src="${BRAND_LOGO_PUBLIC_URL}" alt="Pyonea" />
                <div>
                  <h1>${escapeHtml(t('payment_success.platform_name'))}</h1>
                  <p>${escapeHtml(t('payment_success.platform_address'))}</p>
                </div>
              </div>
              <div class="title">
                <h2>${escapeHtml(t('payment_success.receipt_heading'))}</h2>
                <p class="muted">${escapeHtml(t('payment_success.generated_receipt'))}</p>
                <span class="paid">${escapeHtml(statusBadgeLabel)}</span>
              </div>
            </section>
            <section class="body">
              <div class="grid">
                <div class="box"><span>${escapeHtml(t('payment_success.order_number'))}</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
                <div class="box"><span>${escapeHtml(t('payment_success.order_date'))}</span><strong>${escapeHtml(orderDate)}</strong></div>
                <div class="box"><span>${escapeHtml(t('payment_success.payment_method'))}</span><strong>${escapeHtml(paymentMethod)}</strong></div>
                <div class="box"><span>${escapeHtml(t('payment_success.reference_id'))}</span><strong>${escapeHtml(order.paymentReference || emptyValue)}</strong></div>
                <div class="box"><span>${escapeHtml(t('payment_success.status'))}</span><strong>${escapeHtml(statusMetaValue)}</strong></div>
                <div class="box"><span>${escapeHtml(t('payment_success.payment_date'))}</span><strong>${escapeHtml(paymentDate)}</strong></div>
              </div>
              <div class="parties">
                <div class="party"><h3>${escapeHtml(t('payment_success.customer_information'))}</h3>${customerLines || `<p>${escapeHtml(emptyValue)}</p>`}</div>
                <div class="party"><h3>${escapeHtml(t('payment_success.shipping_address'))}</h3>${shippingLines || `<p>${escapeHtml(emptyValue)}</p>`}</div>
              </div>
              <h3>${escapeHtml(t('payment_success.order_items'))}</h3>
              <table>
                <thead><tr><th>${escapeHtml(t('payment_success.item'))}</th><th>${escapeHtml(t('payment_success.qty'))}</th><th>${escapeHtml(t('payment_success.price'))}</th><th>${escapeHtml(t('payment_success.total'))}</th></tr></thead>
                <tbody>${itemRows}</tbody>
              </table>
              <div class="summary">
                <div class="row"><span>${escapeHtml(t('payment_success.subtotal'))}</span><strong>${escapeHtml(order.subtotalAmount)}</strong></div>
                <div class="row"><span>${escapeHtml(t('payment_success.shipping'))}</span><strong>${escapeHtml(order.shippingFee)}</strong></div>
                <div class="row"><span>${escapeHtml(taxLabel)}</span><strong>${escapeHtml(order.taxAmount)}</strong></div>
                <div class="row total"><span>${escapeHtml(totalPaidLabel)}</span><strong>${escapeHtml(order.totalAmount)}</strong></div>
              </div>
              <div class="footer">
                <p>${escapeHtml(t('payment_success.footer_thanks'))}</p>
                <p>${escapeHtml(t('payment_success.support_line'))}</p>
              </div>
            </section>
          </main>
    `;

    try {
      await generateReceiptPdf(receiptCss, receiptBody, `pyonea-payment-slip-${order.orderNumber}.pdf`);
    } catch {
      // Fall back to the browser print dialog (user can still "Save as PDF" there).
      const printHtml = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>${escapeHtml(t('payment_success.receipt_title_with_order', { orderNumber: order.orderNumber }))}</title>
            <style>
              body { margin: 0; padding: 24px; background: #f3f4f6; }
              ${receiptCss}
              @media print { body { padding: 0; background: #fff; } .pyo-slip .receipt { border: 0; border-radius: 0; box-shadow: none; } }
            </style>
          </head>
          <body>
            <div class="pyo-slip">${receiptBody}</div>
            <script>window.addEventListener('load', function () { window.focus(); window.print(); });</script>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900');
      if (!printWindow) {
        window.alert(t('payment_success.pdf_failed'));
        return;
      }

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <View className="bg-gray-50 py-16 dark:bg-slate-950">
          <View className={`${SITE_CONTAINER_CLASS} gap-6`}>
            <View className="h-36 rounded-2xl bg-gray-200 dark:bg-slate-800" />
            <View className="gap-6 lg:flex-row">
              <View className="min-h-96 flex-1 rounded-2xl bg-gray-200 dark:bg-slate-800" />
              <View className="min-h-80 rounded-2xl bg-gray-200 dark:bg-slate-800 lg:w-[32%]" />
            </View>
            <Text className="text-center font-sans text-base text-gray-600 dark:text-slate-300">
              {t('payment_success.loading_details')}
            </Text>
          </View>
        </View>
      </AppLayout>
    );
  }

  if (error || !order) {
    return (
      <AppLayout>
        <View className="bg-gray-50 px-4 py-16 dark:bg-slate-950 sm:px-6 lg:px-8">
          <View className="mx-auto w-full max-w-xl items-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Feather name="alert-circle" color="#dc2626" size={34} />
            </View>
            <Text className="mt-5 text-center font-sans text-2xl font-bold text-gray-950 dark:text-slate-100">
              {t('payment_success.load_error_title')}
            </Text>
            <Text className="mt-2 text-center font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
              {error || t('payment_success.invalid_order')}
            </Text>
            <View className="mt-6 w-full gap-3 sm:flex-row">
              <Pressable
                onPress={() => router.push('/checkout')}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3">
                <Text className="text-center font-sans text-sm font-semibold text-white">
                  {t('payment_success.try_again')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/products')}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-3 dark:border-slate-700">
                <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {t('payment_success.continue_shopping')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </AppLayout>
    );
  }

  const orderDate = formatReceiptDate(order.createdAt, emptyValue);
  const paymentDate = formatReceiptDate(order.paymentDate, emptyValue);
  const paymentMethod = formatPaymentMethod(order.paymentMethod, emptyValue);
  const taxLabel = t('payment_success.tax_with_rate', { rate: Math.round(order.taxRate * 100) });
  const paid = isOrderPaid(order);
  const codPending = isCodPending(order);
  const statusBadgeLabel = paid
    ? t('payment_success.paid')
    : codPending
      ? t('payment_success.order_confirmed')
      : t('payment_success.pending_payment', { defaultValue: 'Pending payment' });
  const statusMetaValue = statusBadgeLabel;
  const totalPaidLabel = paid
    ? t('payment_success.total_paid')
    : t('payment_success.order_total', { defaultValue: 'Order total' });

  return (
    <AppLayout>
      <GoogleCustomerReviewsOptIn order={order} />
      <View className="bg-gray-50 dark:bg-slate-950">
        <View className="bg-green-700">
          <View className={`${SITE_CONTAINER_CLASS} items-center py-12 sm:py-16`}>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white/15">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
                <Feather name="check" color="#16a34a" size={34} />
              </View>
            </View>
            <Text className="mt-5 text-center font-sans text-3xl font-bold text-white sm:text-4xl">
              {t('payment_success.title')}
            </Text>
            <Text className="mt-3 max-w-2xl text-center font-sans text-base leading-7 text-green-100 sm:text-lg">
              {codPending
                ? t('payment_success.success_message_cod')
                : paid
                  ? t('payment_success.success_message_paid', {
                      defaultValue: t('payment_success.success_message'),
                    })
                  : t('payment_success.success_message_pending', {
                      defaultValue: 'Your order was created. Complete payment from My Orders when ready.',
                    })}
            </Text>
            <View className="mt-6 rounded-full border border-green-300 bg-white/10 px-5 py-2">
              <Text className="font-sans text-sm font-semibold text-white">
                {t('payment_success.order_number')}: {order.orderNumber}
              </Text>
            </View>
          </View>
        </View>

        <View className={`${SITE_CONTAINER_CLASS} gap-8 py-8 sm:py-12 lg:flex-row lg:items-start`}>
          <View className="min-w-0 flex-1">
            <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <View className="gap-4 border-b border-gray-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <View>
                  <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
                    {t('payment_success.receipt_title')}
                  </Text>
                  <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
                    {t('payment_success.receipt_title_with_order', { orderNumber: order.orderNumber })}
                  </Text>
                </View>
                <Pressable
                  onPress={handleDownloadPaySlip}
                  disabled={downloading}
                  className="flex-row items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-800 dark:bg-green-900/20">
                  {downloading ? (
                    <ActivityIndicator color="#15803d" />
                  ) : (
                    <Feather name="download" color="#15803d" size={16} />
                  )}
                  <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                    {downloading ? t('payment_success.downloading') : t('payment_success.download_pdf')}
                  </Text>
                </Pressable>
              </View>

              <View className="p-5 sm:p-6">
                <View className="items-center border-b border-gray-100 pb-6 dark:border-slate-800">
                  <Image source={BRAND_LOGO} className="h-20 w-20" contentFit="contain" />
                  <Text className="mt-2 font-brand text-2xl text-gray-950 dark:text-slate-100">
                    {t('payment_success.platform_name')}
                  </Text>
                  <Text className="mt-1 max-w-2xl text-center font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                    {t('payment_success.platform_address')}
                  </Text>
                </View>

                <View className="gap-4 border-b border-gray-100 py-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                  <View>
                    <Text className="font-sans text-2xl font-bold text-gray-950 dark:text-slate-100">
                      {t('payment_success.receipt_heading')}
                    </Text>
                    <Text className="mt-2 font-sans text-sm text-gray-500 dark:text-slate-400">
                      {t('payment_success.generated_receipt')}
                    </Text>
                  </View>
                  <View className="self-start rounded-full bg-green-100 px-4 py-2 dark:bg-green-900/30">
                    <Text className="font-sans text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-300">
                      {statusBadgeLabel}
                    </Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-3 border-b border-gray-100 py-6 dark:border-slate-800">
                  <MetaBox label={t('payment_success.order_number')} value={order.orderNumber} />
                  <MetaBox label={t('payment_success.order_date')} value={orderDate} />
                  <MetaBox label={t('payment_success.payment_method')} value={paymentMethod} />
                  <MetaBox
                    label={t('payment_success.reference_id')}
                    value={order.paymentReference || emptyValue}
                  />
                  <MetaBox label={t('payment_success.status')} value={statusMetaValue} />
                  <MetaBox label={t('payment_success.payment_date')} value={paymentDate} />
                </View>

                <View className="gap-4 border-b border-gray-100 py-6 dark:border-slate-800 sm:flex-row">
                  <PersonBlock
                    title={t('payment_success.customer_information')}
                    customer={order.customer}
                    emptyValue={emptyValue}
                  />
                  <PersonBlock
                    title={t('payment_success.shipping_address')}
                    address={order.shippingAddress}
                    emptyValue={emptyValue}
                  />
                </View>

                <View className="border-b border-gray-100 py-6 dark:border-slate-800">
                  <Text className="mb-2 font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
                    {t('payment_success.order_items')}
                  </Text>
                  {order.items.length > 0 ? (
                    order.items.map((item) => (
                      <ReceiptItem key={String(item.id)} item={item} emptyValue={emptyValue} />
                    ))
                  ) : (
                    <Text className="py-6 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                      {t('payment_success.no_items')}
                    </Text>
                  )}
                </View>

                <View className="ml-auto w-full gap-3 py-6 sm:max-w-sm">
                  <SummaryRow label={t('payment_success.subtotal')} value={order.subtotalAmount} />
                  <SummaryRow label={t('payment_success.shipping')} value={order.shippingFee} />
                  <SummaryRow label={taxLabel} value={order.taxAmount} />
                  <View className="border-t border-gray-200 pt-4 dark:border-slate-700">
                    <SummaryRow label={totalPaidLabel} value={order.totalAmount} strong />
                  </View>
                </View>

                <View className="items-center border-t border-gray-100 pt-5 dark:border-slate-800">
                  <Text className="text-center font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                    {t('payment_success.footer_thanks')}
                  </Text>
                  <Text className="mt-1 text-center font-sans text-xs text-gray-400 dark:text-slate-500">
                    {t('payment_success.support_line')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="w-full gap-5 lg:w-[32%]">
            {relatedOrders.length > 0 ? (
              <SideCard
                title={t('payment_success.related_orders', {
                  defaultValue: 'Other orders from this checkout',
                })}>
                <View className="gap-3">
                  {relatedOrders.map((related) => (
                    <Pressable
                      key={String(related.id)}
                      onPress={() =>
                        router.push({
                          pathname: '/payment-success',
                          params: { order_id: String(related.id) },
                        })
                      }
                      className="rounded-lg border border-gray-100 p-3 dark:border-slate-800">
                      <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100">
                        #{related.orderNumber}
                      </Text>
                      <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
                        {related.totalAmount}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </SideCard>
            ) : null}

            <SideCard title={t('payment_success.whats_next')}>
              <View className="gap-4">
                <View className="flex-row gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Feather name="package" color="#16a34a" size={20} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100">
                      {t('payment_success.order_processing')}
                    </Text>
                    <Text className="mt-1 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
                      {t('payment_success.order_processing_desc')}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Feather name="truck" color="#2563eb" size={20} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100">
                      {t('payment_success.shipping_updates')}
                    </Text>
                    <Text className="mt-1 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
                      {t('payment_success.shipping_updates_desc')}
                    </Text>
                  </View>
                </View>
              </View>
            </SideCard>

            <SideCard title={t('payment_success.quick_actions')}>
              <View className="gap-3">
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/track-order', params: { order: order.orderNumber } })
                  }
                  className="flex-row items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3">
                  <Feather name="truck" color="#ffffff" size={16} />
                  <Text className="font-sans text-sm font-semibold text-white">
                    {t('payment_success.track_order')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/products')}
                  className="flex-row items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 dark:border-slate-700">
                  <Feather name="shopping-bag" color="#15803d" size={16} />
                  <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                    {t('payment_success.continue_shopping')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/')}
                  className="flex-row items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 dark:border-slate-700">
                  <Feather name="home" color="#64748b" size={16} />
                  <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                    {t('payment_success.close')}
                  </Text>
                </Pressable>
              </View>
            </SideCard>

            <View className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
              <View className="mb-3 flex-row items-center gap-2">
                <Feather name="help-circle" color="#2563eb" size={20} />
                <Text className="font-sans text-lg font-bold text-blue-900 dark:text-blue-100">
                  {t('payment_success.need_help')}
                </Text>
              </View>
              <Text className="font-sans text-sm leading-6 text-blue-800 dark:text-blue-200">
                {t('payment_success.support_help')}
              </Text>
              <View className="mt-4 gap-1">
                <Text className="font-sans text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {t('payment_success.support_phone')}
                </Text>
                <Text className="font-sans text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {t('payment_success.support_email')}
                </Text>
                <Text className="font-sans text-xs text-blue-700 dark:text-blue-200">
                  {t('payment_success.support_hours')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
