import { useGlobalSearchParams, useLoaderData, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';

import { NativeSeo } from '@/components/SEO/native-seo';
import { SITE_PUBLIC_URL } from '@/config/native';
import { ProductDetailNative } from '@/pages/product-detail-native';
import { fetchProductDetail, type ProductDetail } from '@/utils/native-api';
import {
  buildProductPageSeo,
  compactSeoText,
  resolveSeoLanguage,
} from '@/utils/seo-localization';
import { fetchAllProductSlugs, loadSeoDataWithRetry } from '@/utils/seo-export';
import { shouldSkipDynamicSeoExport } from '@/utils/static-export';

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const buildProductSchema = (
  product: ProductDetail,
  language: ReturnType<typeof resolveSeoLanguage>
) => {
  const seo = buildProductPageSeo(
    {
      name: product.name,
      nameEn: product.nameEn,
      nameMm: product.nameMm,
      descriptionEn: product.descriptionEn,
      descriptionMm: product.descriptionMm,
      moq: product.moq,
    },
    language,
  );

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: seo.schemaName,
    ...(seo.alternateName ? { alternateName: seo.alternateName } : {}),
    description: compactSeoText(
      language === 'my'
        ? product.descriptionMm || product.descriptionEn
        : product.descriptionEn || product.descriptionMm,
      `${product.name} on Pyonea`,
      300
    ),
    image: product.images,
    sku: product.sku || String(product.id),
    category: product.categoryName,
    offers: {
      '@type': 'Offer',
      url: `${SITE_PUBLIC_URL}/products/${product.slug}?lang=${language}`,
      priceCurrency: 'MMK',
      price: product.priceValue,
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: product.seller
        ? {
            '@type': 'Organization',
            name: product.seller.name,
            url: `${SITE_PUBLIC_URL}/sellers/${product.seller.slug}`,
          }
        : undefined,
    },
  };

  if (product.rating > 0 && product.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    };
  }

  return schema;
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (shouldSkipDynamicSeoExport()) return [];

  try {
    const slugs = await fetchAllProductSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loader(_request: unknown, params: Record<string, string | string[]>) {
  const slug = firstParam(params.slug);
  if (!slug) return null;

  return loadSeoDataWithRetry(`product ${slug}`, () => fetchProductDetail(slug));
}

export function ErrorBoundary(_props: ErrorBoundaryProps) {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const productSlug = firstParam(slug) || '';

  // SEO loader failed during export/navigation — render the page normally from the API.
  return <ProductDetailNative slug={productSlug} />;
}

export default function ProductDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const params = useGlobalSearchParams<{ lang?: string | string[] }>();
  const productSlug = firstParam(slug);
  const initialProduct = useLoaderData<typeof loader>();
  const product = initialProduct || null;
  const resolvedSlug = product?.slug || productSlug || '';
  const seoLanguage = resolveSeoLanguage(params.lang);
  const seo = product
    ? buildProductPageSeo(
        {
          name: product.name,
          nameEn: product.nameEn,
          nameMm: product.nameMm,
          descriptionEn: product.descriptionEn,
          descriptionMm: product.descriptionMm,
          moq: product.moq,
        },
        seoLanguage,
      )
    : null;

  return (
    <>
      {product && seo ? (
        <NativeSeo
          title={seo.title}
          description={seo.description}
          image={product.images[0]}
          imageAlt={seo.schemaName}
          url={`/products/${resolvedSlug}`}
          type="product"
          schema={buildProductSchema(product, seoLanguage)}
        />
      ) : null}
      <ProductDetailNative slug={resolvedSlug} initialProduct={initialProduct} />
    </>
  );
}
