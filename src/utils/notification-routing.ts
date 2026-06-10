import type { Href } from 'expo-router';

import type { NativeNotification } from '@/utils/native-api';

export const rfqDashboardHref = (userType?: string): Href => {
  if (userType === 'seller') return '/seller/dashboard?tab=rfq' as Href;
  if (userType === 'admin') return '/admin/dashboard?tab=rfq' as Href;
  return '/buyer/dashboard?tab=rfq' as Href;
};

export const notificationHref = (
  notification: NativeNotification,
  userType?: string
): Href | null => {
  if (notification.url) return notification.url as Href;

  const type = notification.type;
  const isSeller = userType === 'seller';
  const isAdmin = userType === 'admin';
  const isBuyer = userType === 'buyer' || (!isSeller && !isAdmin);

  if (type.startsWith('rfq_')) return rfqDashboardHref(userType);

  if (type === 'new_order') return '/seller/dashboard?tab=orders' as Href;
  if (type === 'product_review') return '/seller/dashboard?tab=reviews' as Href;
  if (type === 'product_limit_warning') return '/seller/dashboard?tab=products' as Href;
  if (type === 'seller_approved' || type === 'seller_rejected') {
    return '/seller/dashboard?tab=settings' as Href;
  }
  if (type.startsWith('subscription_')) {
    if (type === 'subscription_request' && isAdmin) {
      return '/admin/dashboard?tab=subscriptions' as Href;
    }
    return '/seller/dashboard?tab=subscription' as Href;
  }
  if (type === 'platform_logistics_requested' && isAdmin) {
    return '/admin/dashboard?tab=platform-logistics' as Href;
  }
  if (type === 'cod_invoice_warning' || type === 'cod_invoice_suspension') {
    return isSeller ? ('/seller/dashboard?tab=wallet' as Href) : null;
  }
  if (type === 'new_user_registered' && isAdmin) {
    return '/admin/dashboard?tab=overview' as Href;
  }

  if (
    notification.orderNumber &&
    (type.includes('delivery') ||
      type === 'self_delivery_completed' ||
      type === 'delivery_status_changed')
  ) {
    return `/track-order?order=${encodeURIComponent(notification.orderNumber)}` as Href;
  }

  if (notification.orderNumber || notification.orderId) {
    if (isSeller) return '/seller/dashboard?tab=orders' as Href;
    if (isBuyer) return '/buyer/dashboard?tab=orders' as Href;
  }

  if (
    type === 'order_placed' ||
    type === 'order_status_changed' ||
    type === 'order_payment_confirmed' ||
    type === 'order_delivered_thank_you'
  ) {
    return isSeller ? ('/seller/dashboard?tab=orders' as Href) : ('/buyer/dashboard?tab=orders' as Href);
  }

  return null;
};
