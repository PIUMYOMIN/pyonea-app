import Head from 'expo-router/head';
import { useGlobalSearchParams, usePathname } from 'expo-router';
import { Platform } from 'react-native';

import { SITE_PUBLIC_URL, GOOGLE_SITE_VERIFICATION } from '@/config/native';
import { staticRouteSeoMy } from '@/utils/seo-localization';
import { BRAND_LOGO_BACKGROUND } from '@/constants/brand';
import { normalizeLanguage, useAppTranslation, type SupportedLanguage } from '@/i18n';

type SeoSchema = Record<string, unknown>;

type NativeSeoProps = {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  noindex?: boolean;
  schema?: SeoSchema | SeoSchema[];
};

type RouteSeo = {
  title: string;
  description: string;
  priority?: number;
  type?: NativeSeoProps['type'];
  noindex?: boolean;
};

const defaultTitle = 'Pyonea | Myanmar B2B Wholesale Marketplace & Suppliers';
const defaultDescription =
  'Pyonea connects Myanmar businesses with verified suppliers. Find wholesale products, MOQ pricing, bulk orders, and trusted sellers across Myanmar.';
const defaultImage = '/og-image.png';

const indexableRoutes: Record<string, RouteSeo> = {
  '/': {
    title: defaultTitle,
    description: defaultDescription,
    priority: 1,
  },
  '/products': {
    title: 'Wholesale Products in Myanmar | Pyonea',
    description:
      'Browse Myanmar wholesale products with MOQ pricing, seller details, local deals, and bulk order options on Pyonea.',
    priority: 0.9,
  },
  '/categories': {
    title: 'Myanmar Wholesale Categories | Pyonea',
    description:
      'Explore product categories for Myanmar wholesale buying, supplier discovery, and B2B sourcing on Pyonea.',
    priority: 0.9,
  },
  '/sellers': {
    title: 'Verified Myanmar Suppliers & Sellers | Pyonea',
    description:
      'Find verified Myanmar suppliers, seller profiles, business details, and wholesale product catalogs on Pyonea.',
    priority: 0.8,
  },
  '/bulk-order-tool': {
    title: 'Bulk Order Tool for Myanmar B2B Buyers | Pyonea',
    description:
      'Request and compare bulk order options from Myanmar suppliers using Pyonea’s B2B sourcing tool.',
    priority: 0.7,
  },
  '/local-deals': {
    title: 'Local Wholesale Deals in Myanmar | Pyonea',
    description:
      'Discover local wholesale deals, limited offers, and supplier promotions across Myanmar on Pyonea.',
    priority: 0.7,
  },
  '/blog': {
    title: 'Myanmar B2B Wholesale Blog | Pyonea',
    description:
      'Read Pyonea guides for Myanmar wholesale buying, selling online, logistics, supplier trust, and B2B growth.',
    type: 'article',
    priority: 0.8,
  },
  '/pricing': {
    title: 'Seller Pricing Plans | Pyonea',
    description:
      'Compare Pyonea seller plans for listing products, reaching buyers, and growing a Myanmar wholesale business.',
    priority: 0.7,
  },
  '/about-us': {
    title: 'About Pyonea | Myanmar B2B Wholesale Marketplace',
    description:
      'Learn how Pyonea helps Myanmar businesses connect with trusted wholesale suppliers and buyers.',
    priority: 0.6,
  },
  '/help': {
    title: 'Help Center | Pyonea',
    description:
      'Get help with buying, selling, bulk orders, shipping, payments, and account support on Pyonea.',
    priority: 0.6,
  },
  '/faq': {
    title: 'Frequently Asked Questions | Pyonea',
    description:
      'Find answers about Pyonea accounts, suppliers, wholesale orders, payments, shipping, and seller tools.',
    priority: 0.6,
  },
  '/shipping': {
    title: 'Shipping Information | Pyonea',
    description:
      'Review Pyonea shipping information for Myanmar wholesale orders, delivery options, fees, and timelines.',
    priority: 0.6,
  },
  '/contact': {
    title: 'Contact Pyonea | Myanmar B2B Marketplace Support',
    description:
      'Contact Pyonea for buyer support, seller support, partnership questions, and Myanmar marketplace assistance.',
    priority: 0.6,
  },
  '/seller-guidelines': {
    title: 'Seller Guidelines | Pyonea',
    description:
      'Read Pyonea seller guidelines for product listings, wholesale pricing, buyer communication, and marketplace quality.',
    priority: 0.6,
  },
  '/terms': {
    title: 'Terms of Service | Pyonea',
    description: 'Read the Pyonea terms of service for buyers, sellers, and marketplace users.',
    priority: 0.4,
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Pyonea',
    description: 'Learn how Pyonea collects, uses, protects, and manages marketplace user data.',
    priority: 0.4,
  },
  '/return-policy': {
    title: 'Return & Refund Policy | Pyonea',
    description:
      'Review Pyonea return and refund policy for Myanmar wholesale orders and marketplace purchases.',
    priority: 0.4,
  },
  '/legal': {
    title: 'Legal Information | Pyonea',
    description: 'Review legal information for Pyonea marketplace users, buyers, sellers, and partners.',
    priority: 0.4,
  },
  '/compare': {
    title: 'Product Comparison | Pyonea',
    description: 'Compare Myanmar wholesale products, pricing, sellers, and product details on Pyonea.',
    priority: 0.5,
  },
  '/report': {
    title: 'Report a Marketplace Issue | Pyonea',
    description: 'Report product, seller, order, or marketplace issues to Pyonea support.',
    priority: 0.3,
  },
};

const privatePrefixes = [
  '/admin',
  '/buyer',
  '/cart',
  '/checkout',
  '/wishlist',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/payment-success',
  '/my-reports',
  '/track-order',
  '/unsubscribe',
  '/newsletter-confirm',
  '/newsletter/confirm',
];

const ensureAbsolute = (value: string) =>
  value.startsWith('http') ? value : `${SITE_PUBLIC_URL}${value.startsWith('/') ? '' : '/'}${value}`;

const stripTrailingSlash = (value: string) => (value.length > 1 ? value.replace(/\/+$/, '') : value);

const withLang = (url: string, lang: SupportedLanguage) => {
  const parsed = new URL(url);
  parsed.searchParams.set('lang', lang);
  return parsed.toString();
};

const routeKeyFor = (pathname: string) => {
  const cleanPath = stripTrailingSlash(pathname || '/');
  if (cleanPath.startsWith('/products/')) return '/products';
  if (cleanPath.startsWith('/sellers/')) return '/sellers';
  if (cleanPath.startsWith('/blog/')) return '/blog';
  if (cleanPath.startsWith('/categories/')) return '/categories';
  return cleanPath;
};

const isPrivateRoute = (pathname: string) =>
  privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

function buildBaseSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Pyonea Marketplace',
        alternateName: ['Pyonea', 'Myanmar B2B Wholesale Marketplace'],
        url: SITE_PUBLIC_URL,
        logo: `${SITE_PUBLIC_URL}/logo.png`,
      },
      {
        '@type': 'WebSite',
        name: 'Pyonea Marketplace',
        alternateName: 'Myanmar B2B Wholesale Marketplace',
        url: SITE_PUBLIC_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_PUBLIC_URL}/products?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function NativeSeo({
  title,
  description,
  image,
  imageAlt,
  url,
  type,
  noindex,
  schema,
}: NativeSeoProps) {
  const pathname = usePathname() || '/';
  const params = useGlobalSearchParams<{ lang?: string }>();
  const { language } = useAppTranslation();
  const activeLanguage = normalizeLanguage(params.lang || language);
  const routeSeoBase = indexableRoutes[routeKeyFor(pathname)];
  const routeSeoMy = staticRouteSeoMy[routeKeyFor(pathname)];
  const routeSeo =
    activeLanguage === 'my' && routeSeoMy
      ? { ...routeSeoBase, ...routeSeoMy, priority: routeSeoBase?.priority }
      : routeSeoBase;
  const routePrivate = isPrivateRoute(pathname);
  const resolvedTitle = title || routeSeo?.title || defaultTitle;
  const resolvedDescription = description || routeSeo?.description || defaultDescription;
  const resolvedType = type || routeSeo?.type || 'website';
  const shouldNoindex = Boolean(noindex || routeSeo?.noindex || routePrivate);
  const canonicalBase = ensureAbsolute(url || pathname || '/');
  const canonicalUrl = withLang(canonicalBase, activeLanguage);
  const alternateEn = withLang(canonicalBase, 'en');
  const alternateMy = withLang(canonicalBase, 'my');
  const absoluteImage = ensureAbsolute(image || defaultImage);
  const locale = activeLanguage === 'my' ? 'my_MM' : 'en_US';
  const alternateLocale = activeLanguage === 'my' ? 'en_US' : 'my_MM';
  const customSchemaItems = schema ? (Array.isArray(schema) ? schema : [schema]) : [];
  const schemaItems = [buildBaseSchema(), ...customSchemaItems];

  if (Platform.OS !== 'web') return null;

  return (
    <Head>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {GOOGLE_SITE_VERIFICATION ? (
        <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION} />
      ) : null}
      <meta httpEquiv="content-language" content={activeLanguage} />
      <meta name="robots" content={shouldNoindex ? 'noindex,nofollow' : 'index,follow'} />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={alternateEn} />
      <link rel="alternate" hrefLang="my" href={alternateMy} />
      <link rel="alternate" hrefLang="x-default" href={alternateEn} />

      <meta property="og:type" content={resolvedType} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:secure_url" content={absoluteImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Pyonea" />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content={alternateLocale} />
      {imageAlt ? <meta property="og:image:alt" content={imageAlt} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@PyoneaMarket" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={absoluteImage} />
      {imageAlt ? <meta name="twitter:image:alt" content={imageAlt} /> : null}

      <meta name="theme-color" content={BRAND_LOGO_BACKGROUND} />
      <meta name="application-name" content="Pyonea" />
      <meta name="apple-mobile-web-app-title" content="Pyonea" />
      <meta name="format-detection" content="telephone=no" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, viewport-fit=cover"
      />
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />

      {schemaItems.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Head>
  );
}
