import type { Href } from 'expo-router';

export type AppRoute = {
  href: Href;
  label: string;
  title: string;
  description: string;
};

export const mainRoutes: AppRoute[] = [
  {
    href: '/',
    label: 'Home',
    title: 'Home',
    description: 'Myanmar B2B Marketplace home.',
  },
  {
    href: '/products',
    label: 'Products',
    title: 'Products',
    description: 'Browse wholesale products from verified Myanmar suppliers.',
  },
  {
    href: '/sellers',
    label: 'Sellers',
    title: 'Sellers',
    description: 'Discover verified Myanmar sellers and supplier stores.',
  },
  {
    href: '/categories',
    label: 'Categories',
    title: 'Categories',
    description: 'Browse product categories across the marketplace.',
  },
];

/** In-app utility routes kept in the mobile app shell. */
export const utilityRoutes: AppRoute[] = [
  {
    href: '/compare',
    label: 'Compare Product',
    title: 'Compare Product',
    description: 'Compare products before choosing the right supplier.',
  },
  {
    href: '/track-order',
    label: 'Track Order',
    title: 'Track Order',
    description: 'Track marketplace orders using order details.',
  },
  {
    href: '/cart',
    label: 'Cart',
    title: 'Cart',
    description: 'Review products added to your cart.',
  },
  {
    href: '/wishlist',
    label: 'Wishlist',
    title: 'Wishlist',
    description: 'Review products saved to your wishlist.',
  },
  {
    href: '/buyer',
    label: 'Buyer Dashboard',
    title: 'Buyer Dashboard',
    description: 'Manage buyer orders, cart, wishlist, and account settings.',
  },
  {
    href: '/checkout',
    label: 'Checkout',
    title: 'Checkout',
    description: 'Complete your purchase securely on Pyonea.',
  },
  {
    href: '/payment-success',
    label: 'Payment Success',
    title: 'Payment Success',
    description: 'View your payment confirmation and receipt.',
  },
  {
    href: '/login',
    label: 'Login',
    title: 'Login',
    description: 'Sign in to your Pyonea account.',
  },
  {
    href: '/register',
    label: 'Sign up',
    title: 'Sign up',
    description: 'Create a buyer or seller account on Pyonea.',
  },
  {
    href: '/forgot-password',
    label: 'Forgot Password',
    title: 'Forgot Password',
    description: 'Request a password reset link for your Pyonea account.',
  },
  {
    href: '/reset-password',
    label: 'Reset Password',
    title: 'Reset Password',
    description: 'Set a new password for your Pyonea account.',
  },
];

export const footerGroups = [
  {
    title: 'Discover',
    routes: utilityRoutes.filter((route) => String(route.href) === '/compare'),
  },
  {
    title: 'Help',
    routes: utilityRoutes.filter((route) => String(route.href) === '/track-order'),
  },
  {
    title: 'Legal',
    routes: [],
  },
];

export const allRoutes = [...mainRoutes, ...utilityRoutes];

export function getRouteByHref(href: Href) {
  return allRoutes.find((route) => route.href === href);
}
