import { SITE_PUBLIC_URL } from '@/config/native';
import type { SupportedLanguage } from '@/i18n';

export type SocialSharePayload = {
  url: string;
  title: string;
  text: string;
  description: string;
  imageUrl?: string;
  facebook: string;
  whatsapp: string;
  viber: string;
  telegram: string;
  twitter: string;
};

export function appendLangParam(url: string, language: SupportedLanguage): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}lang=${language}`;
}

export function buildPublicPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_PUBLIC_URL}${normalized}`;
}

export function buildSocialSharePayload(options: {
  path: string;
  title: string;
  text: string;
  description: string;
  language: SupportedLanguage;
  imageUrl?: string;
}): SocialSharePayload {
  const url = appendLangParam(buildPublicPath(options.path), options.language);
  const enc = encodeURIComponent;
  const fullText = `${options.text} ${url}`;

  return {
    url,
    title: options.title,
    text: options.text,
    description: options.description,
    imageUrl: options.imageUrl,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    whatsapp: `https://wa.me/?text=${enc(fullText)}`,
    viber: `viber://forward?text=${enc(fullText)}`,
    telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(options.text)}`,
    twitter: `https://x.com/intent/tweet?text=${enc(options.text)}&url=${enc(url)}`,
  };
}
