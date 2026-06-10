import { useGlobalSearchParams, useLoaderData } from 'expo-router';

import { NativeSeo } from '@/components/SEO/native-seo';
import { SITE_PUBLIC_URL } from '@/config/native';
import { BRAND_LOGO_PUBLIC_URL } from '@/constants/brand';
import { BlogDetailNative } from '@/pages/blog-detail-native';
import { fetchBlogDetail, type BlogPost } from '@/utils/native-api';
import {
  buildBilingualSeoContent,
  compactSeoText,
  resolveSeoLanguage,
  withPyoneaTitle,
} from '@/utils/seo-localization';
import { fetchAllBlogSlugs } from '@/utils/seo-export';
import { shouldSkipDynamicSeoExport } from '@/utils/static-export';

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const buildBlogSchema = (post: BlogPost, language: ReturnType<typeof resolveSeoLanguage>) => {
  const seo = buildBilingualSeoContent({
    language,
    titleEn: post.seoTitleEn || post.titleEn || post.title,
    titleMm: post.seoTitleMm || post.titleMm || post.title,
    descriptionEn: post.seoDescriptionEn || post.excerptEn || post.excerpt,
    descriptionMm: post.seoDescriptionMm || post.excerptMm || post.excerpt,
    fallbackTitle: post.title,
    fallbackDescription: `Read ${post.title} on Pyonea.`,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: seo.schemaName,
    ...(seo.alternateName ? { alternateName: seo.alternateName } : {}),
    description: compactSeoText(
      language === 'my'
        ? post.seoDescriptionMm || post.excerptMm || post.excerpt
        : post.seoDescriptionEn || post.excerptEn || post.excerpt,
      post.title,
      300
    ),
    image: post.imageUrl,
    author: {
      '@type': 'Person',
      name: post.author || 'Pyonea Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Pyonea',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_PUBLIC_URL}${BRAND_LOGO_PUBLIC_URL}`,
      },
    },
    mainEntityOfPage: `${SITE_PUBLIC_URL}/blog/${post.slug}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    articleSection: post.category,
    keywords: post.tags,
  };
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (shouldSkipDynamicSeoExport()) return [];

  try {
    const slugs = await fetchAllBlogSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function loader(_request: unknown, params: Record<string, string | string[]>) {
  const slug = firstParam(params.slug);
  if (!slug) return null;

  try {
    return await fetchBlogDetail(slug);
  } catch {
    return null;
  }
}

export default function BlogDetailRoute() {
  const initialDetail = useLoaderData<typeof loader>();
  const params = useGlobalSearchParams<{ lang?: string | string[] }>();
  const post = initialDetail?.post || null;
  const seoLanguage = resolveSeoLanguage(params.lang);
  const seo = post
    ? buildBilingualSeoContent({
        language: seoLanguage,
        titleEn: post.seoTitleEn || post.titleEn || post.title,
        titleMm: post.seoTitleMm || post.titleMm || post.title,
        descriptionEn: post.seoDescriptionEn || post.excerptEn || post.excerpt,
        descriptionMm: post.seoDescriptionMm || post.excerptMm || post.excerpt,
        fallbackTitle: post.title,
        fallbackDescription: `Read ${post.title} on Pyonea.`,
      })
    : null;

  return (
    <>
      {post && seo ? (
        <NativeSeo
          title={withPyoneaTitle(seo.title)}
          description={seo.description}
          image={post.imageUrl}
          imageAlt={seo.schemaName}
          url={`/blog/${post.slug}`}
          type="article"
          schema={buildBlogSchema(post, seoLanguage)}
        />
      ) : null}
      <BlogDetailNative initialDetail={initialDetail} />
    </>
  );
}
