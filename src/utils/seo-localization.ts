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
  '/compare': {
    title: 'Product Comparison | Pyonea',
    description: 'Myanmar wholesale products, pricing နှင့် sellers များကို Pyonea တွင် နှိုင်းယှဉ်ပါ.',
  },
};
