// src/utils/analytics.jsx
// Google Analytics 4 integration via react-ga4.
// All tracking is gated on the user's cookie consent — GA is never
// initialised and no data is sent until analytics cookies are accepted.

import ReactGA from 'react-ga4';

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

let _initialised = false;

// ── Initialise ─────────────────────────────────────────────────────────────────

/**
 * Call once when the user has granted analytics consent.
 * Safe to call multiple times — only initialises once per session.
 */
export const initGA = () => {
  if (_initialised || !MEASUREMENT_ID) return;
  if (typeof window !== 'undefined') {
    // Re-enable tracking in case consent was previously revoked.
    window[`ga-disable-${MEASUREMENT_ID}`] = false;
  }
  ReactGA.initialize(MEASUREMENT_ID, {
    gaOptions: {
      // Anonymise IP for GDPR compliance
      anonymize_ip: true,
    },
    gtagOptions: {
      // Do not send any data before user consent
      send_page_view: false,
    },
  });
  _initialised = true;
};

/**
 * Disable GA and stop sending data (called when consent is revoked).
 */
export const disableGA = () => {
  if (!MEASUREMENT_ID) return;
  if (typeof window !== 'undefined') {
    // GA respects this window property to suppress all tracking
    window[`ga-disable-${MEASUREMENT_ID}`] = true;
  }
  _initialised = false;
};

export const isInitialised = () => _initialised;

// ── Page views ─────────────────────────────────────────────────────────────────

/**
 * Track a page view. Call this on every route change when consent is granted.
 * @param {string} path  — e.g. '/products/my-product'
 * @param {string} title — page title (optional; defaults to document.title)
 */
export const trackPageView = (path, title) => {
  if (!_initialised) return;
  ReactGA.send({
    hitType: 'pageview',
    page:    path,
    title:   title || document.title,
  });
};

// ── Custom events ──────────────────────────────────────────────────────────────

/**
 * Generic event tracker.
 * @param {string} category  — e.g. 'Product', 'Cart', 'Order'
 * @param {string} action    — e.g. 'view', 'add_to_cart', 'purchase'
 * @param {string} [label]   — optional description
 * @param {number} [value]   — optional numeric value (e.g. price)
 */
export const trackEvent = (category, action, label, value) => {
  if (!_initialised) return;
  ReactGA.event({ category, action, label, value });
};

// ── Ecommerce events (GA4 recommended events) ──────────────────────────────────

/** Fired when a buyer views a product detail page */
export const trackViewItem = (product) => {
  if (!_initialised) return;
  ReactGA.event('view_item', {
    currency: 'MMK',
    value:    Number(product.selling_price ?? product.price ?? 0),
    items: [{
      item_id:       String(product.id),
      item_name:     product.name_en || product.name_mm || product.name,
      item_category: product.category?.name_en || product.category?.name_mm,
      item_brand:    product.seller?.store_name || product.seller?.name,
      price:         Number(product.selling_price ?? product.price ?? 0),
      quantity:      1,
    }],
  });
};

/** Fired when a product is added to cart */
export const trackAddToCart = (product, quantity = 1) => {
  if (!_initialised) return;
  const price = Number(product.selling_price ?? product.price ?? 0);
  ReactGA.event('add_to_cart', {
    currency: 'MMK',
    value:    price * quantity,
    items: [{
      item_id:       String(product.id),
      item_name:     product.name_en || product.name_mm || product.name,
      item_category: product.category?.name_en || product.category?.name_mm,
      item_brand:    product.seller?.store_name || product.seller?.name,
      price,
      quantity,
    }],
  });
};

/** Fired when a product is removed from cart */
export const trackRemoveFromCart = (item) => {
  if (!_initialised) return;
  ReactGA.event('remove_from_cart', {
    currency: 'MMK',
    value:    Number(item.price ?? 0) * (item.quantity ?? 1),
    items: [{
      item_id:   String(item.product_id ?? item.id),
      item_name: item.name,
      price:     Number(item.price ?? 0),
      quantity:  item.quantity ?? 1,
    }],
  });
};

/** Fired when the buyer reaches the checkout page */
export const trackBeginCheckout = (cartItems, subtotal) => {
  if (!_initialised) return;
  ReactGA.event('begin_checkout', {
    currency: 'MMK',
    value:    Number(subtotal ?? 0),
    items: (cartItems ?? []).map(item => ({
      item_id:   String(item.product_id ?? item.id),
      item_name: item.name,
      price:     Number(item.price ?? 0),
      quantity:  item.quantity ?? 1,
    })),
  });
};

/** Fired when an order is successfully placed */
export const trackPurchase = (order) => {
  if (!_initialised) return;
  ReactGA.event('purchase', {
    transaction_id: order.order_number || String(order.id),
    currency:       'MMK',
    value:          Number(order.total_amount ?? 0),
    shipping:       Number(order.shipping_fee ?? 0),
    tax:            Number(order.tax_amount ?? 0),
    items: (order.items ?? []).map(item => ({
      item_id:   String(item.product_id ?? item.id),
      item_name: item.product_name || item.name,
      price:     Number(item.price ?? 0),
      quantity:  item.quantity ?? 1,
    })),
  });
};

/** Fired when a user registers */
export const trackSignUp = (method = 'email') => {
  if (!_initialised) return;
  ReactGA.event('sign_up', { method });
};

/** Fired when a user logs in */
export const trackLogin = (method = 'email') => {
  if (!_initialised) return;
  ReactGA.event('login', { method });
};

/** Fired when a product is added to wishlist */
export const trackAddToWishlist = (product) => {
  if (!_initialised) return;
  ReactGA.event('add_to_wishlist', {
    currency: 'MMK',
    value:    Number(product.selling_price ?? product.price ?? 0),
    items: [{
      item_id:   String(product.id),
      item_name: product.name_en || product.name_mm || product.name,
      price:     Number(product.selling_price ?? product.price ?? 0),
      quantity:  1,
    }],
  });
};

/** Fired when a user searches */
export const trackSearch = (searchTerm) => {
  if (!_initialised) return;
  ReactGA.event('search', { search_term: searchTerm });
};
