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

export const utilityRoutes: AppRoute[] = [
  {
    href: '/local-deals',
    label: 'Local Deals',
    title: 'Local Deals',
    description: 'Browse active offers from verified local sellers.',
  },
  {
    href: '/compare',
    label: 'Compare Product',
    title: 'Compare Product',
    description: 'Compare products before choosing the right supplier.',
  },
  {
    href: '/bulk-order-tool',
    label: 'Bulk Order Tool',
    title: 'Bulk Order Tool',
    description: 'Plan larger purchases and wholesale order requests.',
  },
  {
    href: '/blog',
    label: 'Blog',
    title: 'Blog',
    description: 'Read marketplace news, guides, and seller resources.',
  },
  {
    href: '/help',
    label: 'Help Center',
    title: 'Help Center',
    description: 'Find help for buying, selling, shipping, and account issues.',
  },
  {
    href: '/faq',
    label: 'FAQ',
    title: 'FAQ',
    description: 'Answers to common Pyonea marketplace questions.',
  },
  {
    href: '/shipping',
    label: 'Shipping Info',
    title: 'Shipping Info',
    description: 'Learn about shipping options and delivery handling.',
  },
  {
    href: '/track-order',
    label: 'Track Order',
    title: 'Track Order',
    description: 'Track marketplace orders using order details.',
  },
  {
    href: '/return-policy',
    label: 'Returns & Refunds',
    title: 'Returns & Refunds',
    description: 'Review return, refund, and issue handling policies.',
  },
  {
    href: '/report',
    label: 'Report an Issue',
    title: 'Report an Issue',
    description: 'Report bugs, safety concerns, payment issues, or seller misconduct.',
  },
  {
    href: '/seller-guidelines',
    label: 'Seller Guidelines',
    title: 'Seller Guidelines',
    description: 'Learn how sellers can operate successfully on Pyonea.',
  },
  {
    href: '/pricing',
    label: 'Pricing',
    title: 'Pricing',
    description: 'Compare seller plans and marketplace subscription options.',
  },
  {
    href: '/about-us',
    label: 'About Us',
    title: 'About Us',
    description: 'Learn about Pyonea and our marketplace mission.',
  },
  {
    href: '/contact',
    label: 'Contact Us',
    title: 'Contact Us',
    description: 'Contact the Pyonea support and marketplace team.',
  },
  {
    href: '/terms',
    label: 'Terms of Service',
    title: 'Terms of Service',
    description: 'Review marketplace terms and usage conditions.',
  },
  {
    href: '/privacy-policy',
    label: 'Privacy Policy',
    title: 'Privacy Policy',
    description: 'Review how Pyonea handles privacy and personal data.',
  },
  {
    href: '/legal',
    label: 'Legal',
    title: 'Legal',
    description: 'Legal notices and marketplace compliance information.',
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
    href: '/unsubscribe',
    label: 'Unsubscribe',
    title: 'Unsubscribe',
    description: 'Manage newsletter email unsubscribe requests.',
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
    routes: utilityRoutes.filter((route) =>
      ['/local-deals', '/compare', '/bulk-order-tool', '/blog'].includes(String(route.href))
    ),
  },
  {
    title: 'Help',
    routes: utilityRoutes.filter((route) =>
      ['/help', '/faq', '/shipping', '/track-order', '/return-policy', '/report'].includes(
        String(route.href)
      )
    ),
  },
  {
    title: 'For Sellers',
    routes: utilityRoutes.filter((route) =>
      ['/seller-guidelines', '/pricing'].includes(String(route.href))
    ),
  },
  {
    title: 'Company',
    routes: utilityRoutes.filter((route) => ['/about-us', '/contact'].includes(String(route.href))),
  },
  {
    title: 'Legal',
    routes: utilityRoutes.filter((route) =>
      ['/terms', '/privacy-policy', '/legal'].includes(String(route.href))
    ),
  },
];

export const allRoutes = [...mainRoutes, ...utilityRoutes];

export function getRouteByHref(href: Href) {
  return allRoutes.find((route) => route.href === href);
}
