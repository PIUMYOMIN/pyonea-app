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

export const staticRouteSeoMy: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Pyonea | မြန်မာ B2B လက်ကားဈေးကွက်',
    description:
      'Pyonea သည် Myanmar လုပ်ငန်းများကို verified suppliers များနှင့် ချိတ်ဆက်ပေးပါသည်။ လက်ကားပစ္စည်းများ၊ MOQ စျေးနှုန်းများနှင့် bulk order များကို ရှာဖွေပါ။',
  },
  '/products': {
    title: 'Myanmar လက်ကားပစ္စည်းများ | Pyonea',
    description:
      'Myanmar လက်ကားပစ္စည်းများ၊ MOQ စျေးနှုန်းများ၊ seller အချက်အလက်များနှင့် bulk order ရွေးချယ်မှုများကို Pyonea တွင် ရှာဖွေပါ။',
  },
  '/categories': {
    title: 'Myanmar လက်ကားအမျိုးအစားများ | Pyonea',
    description:
      'Myanmar B2B buying၊ supplier discovery နှင့် sourcing အတွက် product categories များကို Pyonea တွင် ရှာဖွေပါ။',
  },
  '/sellers': {
    title: 'Verified Myanmar Suppliers | Pyonea',
    description:
      'Verified Myanmar suppliers၊ seller profiles နှင့် wholesale catalogs များကို Pyonea တွင် ရှာဖွေပါ။',
  },
  '/bulk-order-tool': {
    title: 'Bulk Order Tool | Pyonea',
    description:
      'Myanmar suppliers များထံမှ bulk order ရွေးချယ်မှုများကို Pyonea B2B sourcing tool ဖြင့် တောင်းဆိုပါ။',
  },
  '/local-deals': {
    title: 'Local Wholesale Deals | Pyonea',
    description: 'Myanmar အတွင်း local wholesale deals နှင့် supplier promotions များကို Pyonea တွင် ရှာပါ။',
  },
  '/blog': {
    title: 'Myanmar B2B Blog | Pyonea',
    description:
      'Myanmar wholesale buying၊ online selling၊ logistics နှင့် B2B growth အတွက် Pyonea guides များကို ဖတ်ပါ။',
  },
  '/compare': {
    title: 'Product Comparison | Pyonea',
    description: 'Myanmar wholesale products, pricing နှင့် sellers များကို Pyonea တွင် နှိုင်းယှဉ်ပါ.',
  },
  '/pricing': {
    title: 'Seller Pricing Plans | Pyonea',
    description: 'Pyonea seller plans များကို နှိုင်းယှဉ်ပြီး Myanmar wholesale business ကို grow လုပ်ပါ။',
  },
  '/about-us': {
    title: 'Pyonea အကြောင်း | Myanmar B2B Marketplace',
    description:
      'Pyonea သည် Myanmar businesses များကို trusted wholesale suppliers နှင့် buyers များနှင့် ဘယ်လို ချိတ်ဆက်ပေးသလဲ ဆိုတာ လေ့လာပါ။',
  },
  '/help': {
    title: 'Help Center | Pyonea',
    description:
      'Buying၊ selling၊ bulk orders၊ shipping၊ payments နှင့် account support အတွက် Pyonea Help Center ကို သုံးပါ။',
  },
  '/faq': {
    title: 'FAQ | Pyonea',
    description:
      'Pyonea accounts၊ suppliers၊ wholesale orders၊ payments၊ shipping နှင့် seller tools အကြောင်း FAQ များ။',
  },
  '/shipping': {
    title: 'Shipping Information | Pyonea',
    description:
      'Myanmar wholesale orders အတွက် Pyonea shipping options၊ fees နှင့် delivery timelines ကို review လုပ်ပါ။',
  },
  '/contact': {
    title: 'Contact Pyonea | Myanmar B2B Support',
    description:
      'Buyer support၊ seller support၊ partnerships နှင့် marketplace assistance အတွက် Pyonea ကို ဆက်သွယ်ပါ။',
  },
  '/seller-guidelines': {
    title: 'Seller Guidelines | Pyonea',
    description:
      'Product listings၊ wholesale pricing နှင့် marketplace quality အတွက် Pyonea seller guidelines ကို ဖတ်ပါ။',
  },
  '/terms': {
    title: 'Terms of Service | Pyonea',
    description: 'Pyonea marketplace buyers, sellers and users အတွက် Terms of Service.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Pyonea',
    description: 'Pyonea သည် user data ကို ဘယ်လို collect, use နှင့် protect လုပ်သလဲ ဆိုတာ လေ့လာပါ.',
  },
  '/return-policy': {
    title: 'Return & Refund Policy | Pyonea',
    description: 'Myanmar wholesale orders အတွက် Pyonea return နှင့် refund policy ကို review လုပ်ပါ.',
  },
  '/legal': {
    title: 'Legal Information | Pyonea',
    description: 'Pyonea marketplace users, buyers, sellers နှင့် partners အတွက် legal information.',
  },
  '/report': {
    title: 'Report a Marketplace Issue | Pyonea',
    description:
      'Report product, seller, order, payment, or safety issues to Pyonea support and receive a ticket ID.',
  },
};
