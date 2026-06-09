import { useLoaderData } from 'expo-router';

import { NativeSeo } from '@/components/SEO/native-seo';
import { SITE_PUBLIC_URL } from '@/config/native';
import { BlogDetailNative } from '@/pages/blog-detail-native';
import { fetchBlogDetail, fetchBlogPagePosts, type BlogPost } from '@/utils/native-api';
import { shouldSkipDynamicSeoExport } from '@/utils/static-export';

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const compactText = (value: string | undefined, fallback: string, limit = 155) => {
  const cleanValue = (value || fallback).replace(/\s+/g, ' ').trim();
  return cleanValue.length > limit ? `${cleanValue.slice(0, limit - 1).trim()}...` : cleanValue;
};

const buildBlogSchema = (post: BlogPost) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.seoTitleEn || post.titleEn || post.title,
  description: compactText(post.seoDescriptionEn || post.excerptEn || post.excerpt, post.title, 300),
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
      url: `${SITE_PUBLIC_URL}/logo.png`,
    },
  },
  mainEntityOfPage: `${SITE_PUBLIC_URL}/blog/${post.slug}`,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt || post.publishedAt,
  articleSection: post.category,
  keywords: post.tags,
});

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (shouldSkipDynamicSeoExport()) return [];

  try {
    const { posts } = await fetchBlogPagePosts({ perPage: 100 });
    return posts
      .map((post) => post.slug)
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
    return await fetchBlogDetail(slug);
  } catch {
    return null;
  }
}

export default function BlogDetailRoute() {
  const initialDetail = useLoaderData<typeof loader>();
  const post = initialDetail?.post || null;

  return (
    <>
      {post ? (
        <NativeSeo
          title={`${post.seoTitleEn || post.titleEn || post.title} | Pyonea`}
          description={compactText(
            post.seoDescriptionEn || post.excerptEn || post.excerpt,
            `Read ${post.title} on Pyonea.`
          )}
          image={post.imageUrl}
          imageAlt={post.title}
          url={`/blog/${post.slug}`}
          type="article"
          schema={buildBlogSchema(post)}
        />
      ) : null}
      <BlogDetailNative initialDetail={initialDetail} />
    </>
  );
}
