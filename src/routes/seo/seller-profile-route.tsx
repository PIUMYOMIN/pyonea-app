import { useGlobalSearchParams, useLoaderData, useLocalSearchParams } from 'expo-router';

import { NativeSeo } from '@/components/SEO/native-seo';
import { SITE_PUBLIC_URL } from '@/config/native';
import { SellerProfileNative } from '@/pages/seller-profile-native';
import { fetchSellerProfile, type SellerProfile } from '@/utils/native-api';
import {
  buildSellerPageSeo,
  compactSeoText,
  resolveSeoLanguage,
} from '@/utils/seo-localization';
import { fetchAllSellerSlugs, loadSeoDataWithRetry } from '@/utils/seo-export';
import { shouldSkipDynamicSeoExport } from '@/utils/static-export';

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const buildSellerSchema = (seller: SellerProfile, language: ReturnType<typeof resolveSeoLanguage>) => {
  const seo = buildSellerPageSeo(
    {
      name: seller.name,
      businessName: seller.businessName,
      description: seller.description,
    },
    language,
  );

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: seo.schemaName,
    ...(seo.alternateName ? { alternateName: seo.alternateName } : {}),
    description: compactSeoText(seller.description, `${seller.name} seller profile on Pyonea`, 300),
    image: seller.bannerUrl || seller.imageUrl,
    logo: seller.imageUrl,
    url: `${SITE_PUBLIC_URL}/sellers/${seller.slug || seller.id}?lang=${language}`,
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
    const slugs = await fetchAllSellerSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loader(_request: unknown, params: Record<string, string | string[]>) {
  const slug = firstParam(params.slug);
  if (!slug) return null;

  return loadSeoDataWithRetry(`seller ${slug}`, () => fetchSellerProfile(slug));
}

export default function SellerProfileRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const params = useGlobalSearchParams<{ lang?: string | string[] }>();
  const sellerSlug = firstParam(slug);
  const initialProfile = useLoaderData<typeof loader>();
  const seller = initialProfile?.seller || null;
  const resolvedSlug = seller?.slug || sellerSlug || '';
  const seoLanguage = resolveSeoLanguage(params.lang);
  const seo = seller
    ? buildSellerPageSeo(
        {
          name: seller.name,
          businessName: seller.businessName,
          description: seller.description,
        },
        seoLanguage,
      )
    : null;

  return (
    <>
      {seller && seo ? (
        <NativeSeo
          title={seo.title}
          description={seo.description}
          image={seller.bannerUrl || seller.imageUrl}
          imageAlt={seo.schemaName}
          url={`/sellers/${resolvedSlug}`}
          type="profile"
          schema={buildSellerSchema(seller, seoLanguage)}
        />
      ) : null}
      <SellerProfileNative slug={resolvedSlug} initialProfile={initialProfile} />
    </>
  );
}
