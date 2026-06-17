import { useGlobalSearchParams, useLoaderData } from "expo-router";

import { NativeSeo } from "@/components/SEO/native-seo";
import { SITE_PUBLIC_URL } from "@/config/native";
import { BlogDetailNative } from "@/pages/blog-detail-native";
import {
  fetchBlogDetail,
  fetchBlogPagePosts,
  type BlogPost,
} from "@/utils/native-api";
import { buildBlogPageSeo, resolveSeoLanguage } from "@/utils/seo-localization";
import { shouldSkipDynamicSeoExport } from "@/utils/static-export";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const buildBlogSchema = (
  post: BlogPost,
  language: ReturnType<typeof resolveSeoLanguage>,
) => {
  const seo = buildBlogPageSeo(
    {
      title: post.title,
      titleEn: post.titleEn,
      titleMm: post.titleMm,
      excerpt: post.excerpt,
      excerptEn: post.excerptEn,
      excerptMm: post.excerptMm,
      seoTitleEn: post.seoTitleEn,
      seoTitleMm: post.seoTitleMm,
      seoDescriptionEn: post.seoDescriptionEn,
      seoDescriptionMm: post.seoDescriptionMm,
    },
    language,
  );

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: seo.schemaName,
    description: seo.description,
    image: post.imageUrl,
    author: {
      "@type": "Person",
      name: post.author || "Pyonea Team",
    },
    publisher: {
      "@type": "Organization",
      name: "Pyonea",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_PUBLIC_URL}/logo.png`,
      },
    },
    mainEntityOfPage: `${SITE_PUBLIC_URL}/blog/${post.slug}?lang=${language}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    articleSection: post.category,
    keywords: post.tags,
  };
};

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

export async function loader(
  request?: { signal?: AbortSignal },
  params?: Record<string, string | string[]>,
) {
  const slug = firstParam(params?.slug);
  if (!slug) return null;

  try {
    return await fetchBlogDetail(slug, request?.signal);
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
    ? buildBlogPageSeo(
        {
          title: post.title,
          titleEn: post.titleEn,
          titleMm: post.titleMm,
          excerpt: post.excerpt,
          excerptEn: post.excerptEn,
          excerptMm: post.excerptMm,
          seoTitleEn: post.seoTitleEn,
          seoTitleMm: post.seoTitleMm,
          seoDescriptionEn: post.seoDescriptionEn,
          seoDescriptionMm: post.seoDescriptionMm,
        },
        seoLanguage,
      )
    : null;

  return (
    <>
      {post && seo ? (
        <NativeSeo
          title={seo.title}
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
