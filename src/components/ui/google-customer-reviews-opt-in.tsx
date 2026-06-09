import { useEffect } from 'react';
import { Platform } from 'react-native';

import { GOOGLE_MERCHANT_ID } from '@/config/native';
import type { PaymentReceiptOrder } from '@/utils/native-api';

const SCRIPT_ID = 'google-customer-reviews-platform';
const CALLBACK_NAME = 'renderOptIn';
const DEFAULT_DELIVERY_DAYS = 7;

type GoogleSurveyOptInPayload = {
  merchant_id: number;
  order_id: string;
  email: string;
  delivery_country: string;
  estimated_delivery_date: string;
  products?: { gtin: string }[];
};

type GoogleSurveyOptInApi = {
  render: (payload: GoogleSurveyOptInPayload) => void;
};

type GoogleApi = {
  load: (module: string, callback: () => void) => void;
  surveyoptin: GoogleSurveyOptInApi;
};

type GoogleReviewsWindow = Window & {
  gapi?: GoogleApi;
  renderOptIn?: () => void;
};

type LooseOrderRecord = Record<string, unknown>;

export type GoogleReviewsOrderInput = PaymentReceiptOrder | LooseOrderRecord | null | undefined;

const isRecord = (value: unknown): value is LooseOrderRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const parseAddress = (value: unknown): LooseOrderRecord => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(value) ? value : {};
};

const toGoogleDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const fallbackDeliveryDate = (createdAt?: string) => {
  const base = new Date(createdAt || Date.now());
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() + DEFAULT_DELIVERY_DAYS);
  return toGoogleDate(base.toISOString());
};

const normalizeCountryCode = (value?: string) => {
  if (!value) return 'MM';
  const country = String(value).trim();
  if (/^(myanmar|burma)$/i.test(country)) return 'MM';
  if (/^[a-z]{2}$/i.test(country)) return country.toUpperCase();
  return 'MM';
};

const getOrderId = (order: LooseOrderRecord) =>
  getString(order.orderNumber || order.order_number || order.id);

const getEmail = (order: LooseOrderRecord, shippingAddress: LooseOrderRecord) =>
  getString(
    order.customer_email ||
      order.customerEmail ||
      (isRecord(order.buyer) ? order.buyer.email : undefined) ||
      (isRecord(order.user) ? order.user.email : undefined) ||
      (isRecord(order.customer) ? order.customer.email : undefined) ||
      shippingAddress.email
  );

const getEstimatedDeliveryDate = (order: LooseOrderRecord) => {
  const delivery = isRecord(order.delivery) ? order.delivery : {};

  return (
    toGoogleDate(
      getString(
        order.estimatedDelivery ||
          order.estimated_delivery ||
          order.estimated_delivery_date ||
          delivery.estimated_delivery_date ||
          delivery.estimated_delivery
      )
    ) || fallbackDeliveryDate(getString(order.createdAt || order.created_at))
  );
};

const getProductsWithGtin = (items: unknown[]) =>
  items
    .filter(isRecord)
    .map((item) => {
      const product = isRecord(item.product) ? item.product : undefined;
      return getString(item.gtin || item.product_gtin || product?.gtin);
    })
    .filter(Boolean)
    .map((gtin) => ({ gtin }));

const buildPayload = (order: GoogleReviewsOrderInput): GoogleSurveyOptInPayload | null => {
  if (!order || !isRecord(order)) return null;

  const record = order as LooseOrderRecord;
  const shippingAddress = parseAddress(record.shippingAddress || record.shipping_address);
  const orderId = getOrderId(order);
  const email = getEmail(order, shippingAddress);
  const deliveryCountry = normalizeCountryCode(
    getString(
      record.delivery_country ||
        record.deliveryCountry ||
        shippingAddress.country_code ||
        shippingAddress.country
    )
  );
  const estimatedDeliveryDate = getEstimatedDeliveryDate(order);
  const items = Array.isArray(record.items) ? record.items : [];

  if (!orderId || !email || !deliveryCountry || !estimatedDeliveryDate) {
    return null;
  }

  const products = getProductsWithGtin(items);

  return {
    merchant_id: GOOGLE_MERCHANT_ID,
    order_id: orderId,
    email,
    delivery_country: deliveryCountry,
    estimated_delivery_date: estimatedDeliveryDate,
    ...(products.length > 0 ? { products } : {}),
  };
};

export function GoogleCustomerReviewsOptIn({ order }: { order: GoogleReviewsOrderInput }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !order || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const payload = buildPayload(order);
    if (!payload) return;

    const win = window as GoogleReviewsWindow;
    const sessionKey = `google-customer-reviews-opt-in:${payload.order_id}`;
    if (win.sessionStorage?.getItem(sessionKey)) {
      return;
    }

    const renderOptIn = () => {
      if (!win.gapi?.load) return;

      win.gapi.load('surveyoptin', () => {
        win.gapi?.surveyoptin.render(payload);
        win.sessionStorage?.setItem(sessionKey, '1');
      });
    };

    win[CALLBACK_NAME] = renderOptIn;

    if (win.gapi?.load) {
      renderOptIn();
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', renderOptIn, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://apis.google.com/js/platform.js?onload=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [order]);

  return null;
}
