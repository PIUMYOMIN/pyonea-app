import { useGlobalSearchParams, useLoaderData, useLocalSearchParams } from 'expo-router';

import { NativeSeo } from '@/components/SEO/native-seo';
import { SITE_PUBLIC_URL } from '@/config/native';
import { CategoryDetailNative } from '@/pages/category-detail-native';
import { fetchCategoryDetail, type CategoryDetail } from '@/utils/native-api';
import {
  buildBilingualSeoContent,
  resolveSeoLanguage,
  withPyoneaTitle,
} from '@/utils/seo-localization';
import { fetchAllCategorySlugs } from '@/utils/seo-export';
import { shouldSkipDynamicSeoExport } from '@/utils/static-export';

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const buildCategorySchema = (category: CategoryDetail, language: ReturnType<typeof resolveSeoLanguage>) => {
  const seo = buildBilingualSeoContent({
    language,
    titleEn: category.nameEn,
    titleMm: category.nameMm,
    descriptionEn: category.descriptionEn,
    descriptionMm: category.descriptionMm,
    fallbackTitle: category.name,
    fallbackDescription: `Browse ${category.name} wholesale products on Pyonea.`,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seo.schemaName,
    ...(seo.alternateName ? { alternateName: seo.alternateName } : {}),
    description: seo.description,
    url: `${SITE_PUBLIC_URL}/categories/${category.canonicalSlug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: category.productCount,
    },
  };
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (shouldSkipDynamicSeoExport()) return [];

  try {
    const slugs = await fetchAllCategorySlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loader(_request: unknown, params: Record<string, string | string[]>) {
  const slug = firstParam(params.slug);
  if (!slug) return null;

  try {
    return await fetchCategoryDetail(slug);
  } catch {
    return null;
  }
}

export default function CategoryDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const params = useGlobalSearchParams<{ lang?: string | string[] }>();
  const categorySlug = firstParam(slug);
  const initialCategory = useLoaderData<typeof loader>();
  const category = initialCategory || null;
  const resolvedSlug = category?.canonicalSlug || categorySlug || '';
  const seoLanguage = resolveSeoLanguage(params.lang);

  const seo = category
    ? buildBilingualSeoContent({
        language: seoLanguage,
        titleEn: category.nameEn,
        titleMm: category.nameMm,
        descriptionEn: category.descriptionEn,
        descriptionMm: category.descriptionMm,
        fallbackTitle: category.name,
        fallbackDescription: `Browse ${category.name} wholesale products from verified Myanmar suppliers on Pyonea.`,
      })
    : null;

  return (
    <>
      {category && seo ? (
        <NativeSeo
          title={withPyoneaTitle(seo.title)}
          description={seo.description}
          image={category.imageUrl}
          imageAlt={seo.schemaName}
          url={`/categories/${resolvedSlug}`}
          schema={buildCategorySchema(category, seoLanguage)}
        />
      ) : null}
      <CategoryDetailNative slug={resolvedSlug} initialCategory={initialCategory} />
    </>
  );
}
