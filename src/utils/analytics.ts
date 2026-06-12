// Google Analytics 4 via react-ga4. Loaded on demand after cookie consent.

import { GA_MEASUREMENT_ID } from '@/config/native';

type ReactGAClient = typeof import('react-ga4').default;

let gaClient: ReactGAClient | null = null;
let initialised = false;
let initPromise: Promise<void> | null = null;

async function loadGA() {
  if (gaClient) return gaClient;
  const mod = await import('react-ga4');
  gaClient = mod.default;
  return gaClient;
}

export const initGA = () => {
  if (initialised || !GA_MEASUREMENT_ID) return;
  if (typeof window === 'undefined') return;

  if (!initPromise) {
    initPromise = loadGA()
      .then((ReactGA) => {
        (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
        ReactGA.initialize(GA_MEASUREMENT_ID, {
          gaOptions: { anonymize_ip: true },
          gtagOptions: { send_page_view: false },
        });
        initialised = true;
      })
      .catch(() => {
        initPromise = null;
      });
  }

  void initPromise;
};

export const disableGA = () => {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  }
  initialised = false;
  initPromise = null;
};

export const isInitialised = () => initialised;

export const trackPageView = (path: string, title?: string) => {
  if (!initialised || !gaClient) return;
  gaClient.send({
    hitType: 'pageview',
    page: path,
    title: title || (typeof document !== 'undefined' ? document.title : undefined),
  });
};

export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  if (!initialised || !gaClient) return;
  gaClient.event({ category, action, label, value });
};

export const trackViewItem = (product: {
  id: string | number;
  name_en?: string;
  name_mm?: string;
  name?: string;
  selling_price?: number;
  price?: number;
  category?: { name_en?: string; name_mm?: string };
  seller?: { store_name?: string; name?: string };
}) => {
  if (!initialised || !gaClient) return;
  gaClient.event('view_item', {
    currency: 'MMK',
    value: Number(product.selling_price ?? product.price ?? 0),
    items: [
      {
        item_id: String(product.id),
        item_name: product.name_en || product.name_mm || product.name,
        item_category: product.category?.name_en || product.category?.name_mm,
        item_brand: product.seller?.store_name || product.seller?.name,
        price: Number(product.selling_price ?? product.price ?? 0),
        quantity: 1,
      },
    ],
  });
};

export const trackAddToCart = (
  product: {
    id: string | number;
    name_en?: string;
    name_mm?: string;
    name?: string;
    selling_price?: number;
    price?: number;
    category?: { name_en?: string; name_mm?: string };
    seller?: { store_name?: string; name?: string };
  },
  quantity = 1
) => {
  if (!initialised || !gaClient) return;
  const price = Number(product.selling_price ?? product.price ?? 0);
  gaClient.event('add_to_cart', {
    currency: 'MMK',
    value: price * quantity,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name_en || product.name_mm || product.name,
        item_category: product.category?.name_en || product.category?.name_mm,
        item_brand: product.seller?.store_name || product.seller?.name,
        price,
        quantity,
      },
    ],
  });
};

export const trackRemoveFromCart = (item: {
  product_id?: string | number;
  id?: string | number;
  name?: string;
  price?: number;
  quantity?: number;
}) => {
  if (!initialised || !gaClient) return;
  gaClient.event('remove_from_cart', {
    currency: 'MMK',
    value: Number(item.price ?? 0) * (item.quantity ?? 1),
    items: [
      {
        item_id: String(item.product_id ?? item.id),
        item_name: item.name,
        price: Number(item.price ?? 0),
        quantity: item.quantity ?? 1,
      },
    ],
  });
};

export const trackBeginCheckout = (
  cartItems: Array<{
    product_id?: string | number;
    id?: string | number;
    name?: string;
    price?: number;
    quantity?: number;
  }>,
  subtotal?: number
) => {
  if (!initialised || !gaClient) return;
  gaClient.event('begin_checkout', {
    currency: 'MMK',
    value: Number(subtotal ?? 0),
    items: (cartItems ?? []).map((item) => ({
      item_id: String(item.product_id ?? item.id),
      item_name: item.name,
      price: Number(item.price ?? 0),
      quantity: item.quantity ?? 1,
    })),
  });
};

export const trackPurchase = (order: {
  order_number?: string;
  id?: string | number;
  total_amount?: number;
  shipping_fee?: number;
  tax_amount?: number;
  items?: Array<{
    product_id?: string | number;
    id?: string | number;
    product_name?: string;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
}) => {
  if (!initialised || !gaClient) return;
  gaClient.event('purchase', {
    transaction_id: order.order_number || String(order.id),
    currency: 'MMK',
    value: Number(order.total_amount ?? 0),
    shipping: Number(order.shipping_fee ?? 0),
    tax: Number(order.tax_amount ?? 0),
    items: (order.items ?? []).map((item) => ({
      item_id: String(item.product_id ?? item.id),
      item_name: item.product_name || item.name,
      price: Number(item.price ?? 0),
      quantity: item.quantity ?? 1,
    })),
  });
};

export const trackSignUp = (method = 'email') => {
  if (!initialised || !gaClient) return;
  gaClient.event('sign_up', { method });
};

export const trackLogin = (method = 'email') => {
  if (!initialised || !gaClient) return;
  gaClient.event('login', { method });
};

export const trackAddToWishlist = (product: {
  id: string | number;
  name_en?: string;
  name_mm?: string;
  name?: string;
  selling_price?: number;
  price?: number;
}) => {
  if (!initialised || !gaClient) return;
  gaClient.event('add_to_wishlist', {
    currency: 'MMK',
    value: Number(product.selling_price ?? product.price ?? 0),
    items: [
      {
        item_id: String(product.id),
        item_name: product.name_en || product.name_mm || product.name,
        price: Number(product.selling_price ?? product.price ?? 0),
        quantity: 1,
      },
    ],
  });
};

export const trackSearch = (searchTerm: string) => {
  if (!initialised || !gaClient) return;
  gaClient.event('search', { search_term: searchTerm });
};
