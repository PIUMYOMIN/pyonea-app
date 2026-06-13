import { localizeBilingualName, normalizeLanguage, type SupportedLanguage } from '@/i18n';

export function resolveSeoLanguage(lang?: string | string[] | null): SupportedLanguage {
  const value = Array.isArray(lang) ? lang[0] : lang;
  return normalizeLanguage(value || 'en');
}

export function compactSeoText(value: string | undefined, fallback: string, limit = 155) {
  const cleanValue = (value || fallback).replace(/\s+/g, ' ').trim();
  return cleanValue.length > limit ? `${cleanValue.slice(0, limit - 1).trim()}…` : cleanValue;
}

type BilingualSeoInput = {
  language: SupportedLanguage;
  titleEn?: string;
  titleMm?: string;
  descriptionEn?: string;
  descriptionMm?: string;
  fallbackTitle: string;
  fallbackDescription: string;
};

export function buildBilingualSeoContent({
  language,
  titleEn,
  titleMm,
  descriptionEn,
  descriptionMm,
  fallbackTitle,
  fallbackDescription,
}: BilingualSeoInput) {
  const localizedTitle = localizeBilingualName(language, titleEn, titleMm, fallbackTitle);
  const primaryDescription =
    language === 'my'
      ? descriptionMm || descriptionEn || fallbackDescription
      : descriptionEn || descriptionMm || fallbackDescription;

  return {
    title: localizedTitle,
    description: compactSeoText(primaryDescription, fallbackDescription),
    schemaName: localizedTitle,
    alternateName:
      language === 'my'
        ? titleEn && titleEn !== localizedTitle
          ? titleEn
          : undefined
        : titleMm && titleMm !== localizedTitle
          ? titleMm
          : undefined,
  };
}

export function withPyoneaTitle(title: string) {
  return title.includes('| Pyonea') ? title : `${title} | Pyonea`;
}

export const productSeoTemplates = {
  en: {
    title: '{{title}} | Wholesale Myanmar | Pyonea',
    description:
      '{{title}} wholesale in Myanmar. Check MOQ {{moq}}, bulk price, supplier details, and secure ordering on Pyonea.',
  },
  my: {
    title: '{{title}} | မြန်မာ လက်ကား | Pyonea',
    description:
      '{{title}} ကို မြန်မာနိုင်ငံတွင် လက်ကားဝယ်ယူရန်။ အနည်းဆုံးမှာယူရမည့် အရေအတွက် {{moq}}၊ လက်ကားဈေး၊ ရောင်းချသူအချက်အလက်နှင့် လုံခြုံသော မှာယူမှုများကို Pyonea တွင် ကြည့်ရှုပါ။',
  },
} as const;

export const sellerSeoTemplates = {
  en: {
    title: '{{name}} | Verified Myanmar Supplier | Pyonea',
    description: 'View {{name}} products, business details, and wholesale seller profile on Pyonea.',
  },
  my: {
    title: '{{name}} | Verified Myanmar Supplier | Pyonea',
    description:
      '{{name}} ၏ ကုန်ပစ္စည်းများ၊ လုပ်ငန်းအချက်အလက်များနှင့် လက်ကားရောင်းချသူ profile ကို Pyonea တွင် ကြည့်ရှုပါ။',
  },
} as const;

export const blogSeoTemplates = {
  en: {
    titleSuffix: ' | Pyonea Blog',
    descriptionFallback: 'Read {{title}} on Pyonea.',
  },
  my: {
    titleSuffix: ' | Pyonea Blog',
    descriptionFallback: '{{title}} ကို Pyonea တွင် ဖတ်ရှုပါ။',
  },
} as const;

type ProductSeoInput = {
  name: string;
  nameEn?: string;
  nameMm?: string;
  descriptionEn?: string;
  descriptionMm?: string;
  moq?: number;
};

export function buildProductPageSeo(product: ProductSeoInput, language: SupportedLanguage) {
  const bilingual = buildBilingualSeoContent({
    language,
    titleEn: product.nameEn,
    titleMm: product.nameMm,
    descriptionEn: product.descriptionEn,
    descriptionMm: product.descriptionMm,
    fallbackTitle: product.name,
    fallbackDescription: `Buy ${product.name} from verified Myanmar suppliers on Pyonea.`,
  });
  const template = productSeoTemplates[language];
  const displayName = bilingual.title;
  const moq = String(product.moq ?? 1);

  return {
    ...bilingual,
    title: template.title.replace('{{title}}', displayName),
    description: compactSeoText(
      template.description.replace('{{title}}', displayName).replace('{{moq}}', moq),
      bilingual.description,
      155,
    ),
  };
}

type SellerSeoInput = {
  name: string;
  businessName?: string;
  description?: string;
};

export function buildSellerPageSeo(seller: SellerSeoInput, language: SupportedLanguage) {
  const bilingual = buildBilingualSeoContent({
    language,
    titleEn: seller.businessName || seller.name,
    titleMm: seller.name,
    descriptionEn: seller.description,
    descriptionMm: seller.description,
    fallbackTitle: seller.businessName || seller.name,
    fallbackDescription: `View ${seller.name} products and wholesale seller profile on Pyonea.`,
  });
  const template = sellerSeoTemplates[language];
  const displayName = bilingual.title;

  return {
    ...bilingual,
    title: template.title.replace('{{name}}', displayName),
    description: compactSeoText(
      template.description.replace('{{name}}', displayName),
      bilingual.description,
      155,
    ),
  };
}

type BlogSeoInput = {
  title: string;
  titleEn?: string;
  titleMm?: string;
  excerpt?: string;
  excerptEn?: string;
  excerptMm?: string;
  seoTitleEn?: string;
  seoTitleMm?: string;
  seoDescriptionEn?: string;
  seoDescriptionMm?: string;
};

export function buildBlogPageSeo(post: BlogSeoInput, language: SupportedLanguage) {
  const bilingual = buildBilingualSeoContent({
    language,
    titleEn: post.seoTitleEn || post.titleEn,
    titleMm: post.seoTitleMm || post.titleMm,
    descriptionEn: post.seoDescriptionEn || post.excerptEn || post.excerpt,
    descriptionMm: post.seoDescriptionMm || post.excerptMm || post.excerpt,
    fallbackTitle: post.title,
    fallbackDescription: blogSeoTemplates[language].descriptionFallback.replace('{{title}}', post.title),
  });
  const template = blogSeoTemplates[language];

  return {
    ...bilingual,
    title: `${bilingual.title}${template.titleSuffix}`,
    description: compactSeoText(bilingual.description, template.descriptionFallback.replace('{{title}}', bilingual.title), 155),
  };
}

const ROUTE_SEO_I18N_KEYS: Record<string, { title: string; description: string }> = {
  '/': { title: 'seo.home.title', description: 'seo.home.description' },
  '/products': { title: 'seo.products.title', description: 'seo.products.description' },
  '/categories': { title: 'seo.categories.title', description: 'seo.categories.description' },
  '/sellers': { title: 'seo.sellers.title', description: 'seo.sellers.description' },
  '/local-deals': { title: 'seo.local_deals.title', description: 'seo.local_deals.description' },
  '/blog': { title: 'seo.blog.title', description: 'seo.blog.description' },
  '/bulk-order-tool': { title: 'seo.bulk_order_tool.title', description: 'seo.bulk_order_tool.description' },
  '/pricing': { title: 'seo.pricing.title', description: 'seo.pricing.description' },
  '/about-us': { title: 'seo.about_us.title', description: 'seo.about_us.description' },
  '/help': { title: 'seo.help.title', description: 'seo.help.description' },
  '/faq': { title: 'seo.faq.title', description: 'seo.faq.description' },
  '/shipping': { title: 'seo.shipping.title', description: 'seo.shipping.description' },
  '/contact': { title: 'seo.contact.title', description: 'seo.contact.description' },
  '/seller-guidelines': {
    title: 'seo.seller_guidelines.title',
    description: 'seo.seller_guidelines.description',
  },
  '/terms': { title: 'seo.terms.title', description: 'seo.terms.description' },
  '/privacy-policy': { title: 'seo.privacy_policy.title', description: 'seo.privacy_policy.description' },
  '/return-policy': { title: 'seo.return_policy.title', description: 'seo.return_policy.description' },
  '/legal': { title: 'seo.legal.title', description: 'seo.legal.description' },
  '/compare': { title: 'seo.compare.title', description: 'seo.compare.description' },
  '/report': { title: 'seo.report.title', description: 'seo.report.description' },
};

export function resolveStaticRouteSeo(
  routeKey: string,
  _language: SupportedLanguage,
  t: (key: string) => string,
  englishFallback: { title: string; description: string },
): { title: string; description: string } {
  const i18nKeys = ROUTE_SEO_I18N_KEYS[routeKey];
  if (i18nKeys) {
    return {
      title: t(i18nKeys.title),
      description: t(i18nKeys.description),
    };
  }

  return englishFallback;
}
