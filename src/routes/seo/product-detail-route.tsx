import { useLoaderData, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { NativeSeo } from '@/components/SEO/native-seo';
import { SITE_PUBLIC_URL } from '@/config/native';
import { ProductDetailNative } from '@/pages/product-detail-native';
import { fetchProductDetail, fetchProductList, type ProductDetail } from '@/utils/native-api';
import { shouldSkipDynamicSeoExport } from '@/utils/static-export';

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const compactText = (value: string | undefined, fallback: string, limit = 155) => {
  const cleanValue = (value || fallback).replace(/\s+/g, ' ').trim();
  return cleanValue.length > limit ? `${cleanValue.slice(0, limit - 1).trim()}...` : cleanValue;
};

const buildProductSchema = (product: ProductDetail) => {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: compactText(product.description, `${product.name} on Pyonea`, 300),
    image: product.images,
    sku: product.sku || String(product.id),
    category: product.categoryName,
    offers: {
      '@type': 'Offer',
      url: `${SITE_PUBLIC_URL}/products/${product.slug}`,
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
    const products = await fetchProductList({ perPage: 100 });
    return products
      .map((product) => product.slug || String(product.id))
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
    return await fetchProductDetail(slug);
  } catch {
    return null;
  }
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const productSlug = firstParam(slug) || '';

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-950">
      <View className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
        <View className="mx-auto w-full max-w-7xl gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Text className="font-sans text-sm font-semibold text-amber-800 dark:text-amber-200">
            Product data is refreshing. The page will load from the API.
          </Text>
          <Pressable onPress={retry} className="self-start rounded-lg bg-amber-600 px-3 py-2">
            <Text className="font-sans text-xs font-bold text-white">Retry loader</Text>
          </Pressable>
        </View>
      </View>
      <ProductDetailNative slug={productSlug} />
    </View>
  );
}

export default function ProductDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const productSlug = firstParam(slug);
  const initialProduct = useLoaderData<typeof loader>();
  const product = initialProduct || null;
  const resolvedSlug = product?.slug || productSlug || '';

  return (
    <>
      {product ? (
        <NativeSeo
          title={`${product.name} | Pyonea`}
          description={compactText(
            product.description,
            `Buy ${product.name} from verified Myanmar suppliers on Pyonea.`
          )}
          image={product.images[0]}
          imageAlt={product.name}
          url={`/products/${resolvedSlug}`}
          type="product"
          schema={buildProductSchema(product)}
        />
      ) : null}
      <ProductDetailNative slug={resolvedSlug} initialProduct={initialProduct} />
    </>
  );
}
