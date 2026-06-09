import { useLoaderData, useLocalSearchParams } from 'expo-router';

import { NativeSeo } from '@/components/SEO/native-seo';
import { SITE_PUBLIC_URL } from '@/config/native';
import { SellerProfileNative } from '@/pages/seller-profile-native';
import { fetchSellerProfile, fetchSellers, type SellerProfile } from '@/utils/native-api';
import { shouldSkipDynamicSeoExport } from '@/utils/static-export';

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const compactText = (value: string | undefined, fallback: string, limit = 155) => {
  const cleanValue = (value || fallback).replace(/\s+/g, ' ').trim();
  return cleanValue.length > limit ? `${cleanValue.slice(0, limit - 1).trim()}...` : cleanValue;
};

const buildSellerSchema = (seller: SellerProfile) => {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: seller.businessName || seller.name,
    description: compactText(seller.description, `${seller.name} seller profile on Pyonea`, 300),
    image: seller.bannerUrl || seller.imageUrl,
    logo: seller.imageUrl,
    url: `${SITE_PUBLIC_URL}/sellers/${seller.slug || seller.id}`,
    telephone: seller.phone,
    email: seller.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: seller.address,
      addressLocality: seller.city,
      addressRegion: seller.state,
      addressCountry: seller.country || 'MM',
    },
  };

  const ratingValue = Number.parseFloat(seller.rating);
  if (ratingValue > 0 && seller.reviews > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount: seller.reviews,
    };
  }

  return schema;
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (shouldSkipDynamicSeoExport()) return [];

  try {
    const sellers = await fetchSellers();
    return sellers
      .map((seller) => seller.slug || String(seller.id))
      .filter(Boolean)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loader(_request: unknown, params: Record<string, string | string[]>) {
  const slug = firstParam(params.slug);
  if (!slug) return null;

  try {
    return await fetchSellerProfile(slug);
  } catch {
    return null;
  }
}

export default function SellerProfileRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const sellerSlug = firstParam(slug);
  const initialProfile = useLoaderData<typeof loader>();
  const seller = initialProfile?.seller || null;
  const resolvedSlug = seller?.slug || sellerSlug || '';

  return (
    <>
      {seller ? (
        <NativeSeo
          title={`${seller.businessName || seller.name} | Pyonea Seller`}
          description={compactText(
            seller.description,
            `View ${seller.name} products, business details, and wholesale seller profile on Pyonea.`
          )}
          image={seller.bannerUrl || seller.imageUrl}
          imageAlt={seller.businessName || seller.name}
          url={`/sellers/${resolvedSlug}`}
          type="profile"
          schema={buildSellerSchema(seller)}
        />
      ) : null}
      <SellerProfileNative slug={resolvedSlug} initialProfile={initialProfile} />
    </>
  );
}
