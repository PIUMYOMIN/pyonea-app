import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  Share,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { chunkMarketplaceItems } from '@/components/marketplace/marketplace-grid';
import { BLOG_RELATED_GRID_CLASS } from '@/constants/layout';
import { SITE_PUBLIC_URL } from '@/config/native';
import { useAppTranslation } from '@/i18n';
import { fetchBlogDetail, type BlogDetail, type BlogPost } from '@/utils/native-api';

const fallbackImage = require('@/assets/images/og-image.png');

const paragraphize = (text = '') =>
  String(text)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

function BlogDetailSkeleton() {
  return (
    <AppLayout>
      <View className="bg-white px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
        <View className="mx-auto w-full max-w-4xl">
          <View className="h-5 w-32 rounded bg-gray-200 dark:bg-slate-800" />
          <View className="mt-8 h-5 w-52 rounded bg-gray-200 dark:bg-slate-800" />
          <View className="mt-4 h-12 w-full rounded bg-gray-200 dark:bg-slate-800" />
          <View className="mt-8 aspect-[16/7] rounded-lg bg-gray-200 dark:bg-slate-800" />
          <View className="mt-10 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <View
                key={`blog-detail-skeleton-${index}`}
                className="h-4 rounded bg-gray-100 dark:bg-slate-800"
                style={{ width: `${index % 2 === 0 ? 100 : 82}%` }}
              />
            ))}
          </View>
        </View>
      </View>
    </AppLayout>
  );
}

const RELATED_CARD_ROW_CLASS = 'min-w-0 flex-1 self-stretch';

function useRelatedGridColumns() {
  const { width } = useWindowDimensions();
  return useMemo(() => (width >= 768 ? 3 : 1), [width]);
}

function RelatedPostGrid({ children }: { children: ReactNode }) {
  const columns = useRelatedGridColumns();
  const cells = useMemo(() => {
    const list = Array.isArray(children) ? children : children != null ? [children] : [];
    return list.filter((cell) => cell != null && cell !== false);
  }, [children]);
  const rows = useMemo(() => chunkMarketplaceItems(cells, columns), [cells, columns]);

  if (Platform.OS === 'web') {
    return <View className={BLOG_RELATED_GRID_CLASS}>{children}</View>;
  }

  return (
    <>
      {rows.map((row, rowIndex) => {
        const emptySlots = Math.max(0, columns - row.length);
        return (
          <View key={`related-grid-row-${rowIndex}`} className="mb-5 flex-row items-stretch gap-5">
            {row.map((child, cellIndex) => (
              <View key={`related-grid-cell-${rowIndex}-${cellIndex}`} className={RELATED_CARD_ROW_CLASS}>
                {child}
              </View>
            ))}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <View
                key={`related-grid-filler-${rowIndex}-${index}`}
                className={`${RELATED_CARD_ROW_CLASS} opacity-0`}
                pointerEvents="none"
              />
            ))}
          </View>
        );
      })}
    </>
  );
}

function RelatedCard({ post }: { post: BlogPost }) {
  const { t, language } = useAppTranslation();
  const title =
    language === 'my' ? post.titleMm || post.titleEn || post.title : post.titleEn || post.titleMm || post.title;

  return (
    <Link href={`/blog/${post.slug}` as Href} asChild>
      <Pressable className="h-full w-full min-w-0 rounded-lg border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
          {post.category || t('blog_page.label')}
        </Text>
        <Text
          className="mt-2 font-sans text-base font-semibold leading-6 text-gray-950 dark:text-white"
          numberOfLines={2}>
          {title}
        </Text>
        <View className="mt-4 flex-row items-center gap-1">
          <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
            {t('blog_page.read_article')}
          </Text>
          <Feather name="arrow-right" color="#15803d" size={15} />
        </View>
      </Pressable>
    </Link>
  );
}

export function BlogDetailNative({ initialDetail }: { initialDetail?: BlogDetail | null }) {
  const { t, language } = useAppTranslation();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const [post, setPost] = useState<BlogPost | null>(initialDetail?.post || null);
  const [related, setRelated] = useState<BlogPost[]>(initialDetail?.related || []);
  const [loading, setLoading] = useState(!initialDetail?.post);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasInitialPost = Boolean(initialDetail?.post);

  useEffect(() => {
    const controller = new AbortController();

    const loadPost = async () => {
      if (!hasInitialPost) setLoading(true);
      setError(false);
      try {
        const result = await fetchBlogDetail(slug, controller.signal);
        if (!controller.signal.aborted) {
          setPost(result.post);
          setRelated(result.related);
        }
      } catch {
        if (!controller.signal.aborted) {
          setPost(null);
          setRelated([]);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (slug) void loadPost();

    return () => controller.abort();
  }, [hasInitialPost, slug]);

  const localized = useMemo(() => {
    if (!post) {
      return {
        title: '',
        seoTitle: '',
        description: '',
        content: '',
        paragraphs: [] as string[],
      };
    }

    const title =
      language === 'my'
        ? post.titleMm || post.titleEn || post.title
        : post.titleEn || post.titleMm || post.title;
    const seoTitle =
      language === 'my'
        ? post.seoTitleMm || post.seoTitleEn || title
        : post.seoTitleEn || post.seoTitleMm || title;
    const description =
      language === 'my'
        ? post.seoDescriptionMm || post.excerptMm || post.seoDescriptionEn || post.excerptEn || post.excerpt
        : post.seoDescriptionEn || post.excerptEn || post.seoDescriptionMm || post.excerptMm || post.excerpt;
    const content =
      language === 'my'
        ? post.contentMm || post.contentEn || post.excerptMm || post.excerptEn
        : post.contentEn || post.contentMm || post.excerptEn || post.excerptMm;

    return {
      title,
      seoTitle,
      description,
      content,
      paragraphs: paragraphize(content),
    };
  }, [language, post]);

  if (!slug || error || (!loading && !post)) {
    return (
      <AppLayout>
        <View className="bg-white px-4 py-20 dark:bg-slate-950">
          <View className="mx-auto w-full max-w-3xl items-center">
            <Feather name="file-text" color="#cbd5e1" size={48} />
            <Text className="mt-4 text-center font-sans text-2xl font-bold text-gray-950 dark:text-white">
              {t('blog_page.not_found')}
            </Text>
            <Text className="mt-3 text-center font-sans text-base leading-6 text-gray-600 dark:text-slate-400">
              {t('blog_page.not_found_subtitle')}
            </Text>
            <Link href="/blog" asChild>
              <Pressable className="mt-6 flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2">
                <Feather name="arrow-left" color="#ffffff" size={16} />
                <Text className="font-sans text-sm font-semibold text-white">
                  {t('blog_page.back_to_blog')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </AppLayout>
    );
  }

  if (loading || !post) return <BlogDetailSkeleton />;

  const articleUrl = `${SITE_PUBLIC_URL}/blog/${post.slug}`;
  const shareText = t('blog_page.share_text', { title: localized.title });
  const shareLinks = [
    {
      label: 'Facebook',
      icon: 'f',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
    },
    {
      label: 'WhatsApp',
      icon: 'W',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${articleUrl}`)}`,
    },
    {
      label: 'Telegram',
      icon: 'T',
      url: `https://t.me/share/url?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      label: 'LinkedIn',
      icon: 'in',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`,
    },
    {
      label: 'X',
      icon: 'X',
      url: `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(articleUrl)}`,
    },
  ];

  const shareNative = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(articleUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
        return;
      } catch {
        // fall through to share sheet
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: localized.title,
          text: shareText,
          url: articleUrl,
        });
        return;
      } catch {
        // user cancelled
      }
    }

    void Share.share({
      title: localized.title,
      message: `${shareText} ${articleUrl}`,
      url: articleUrl,
    });
  };

  return (
    <AppLayout>
      <View className="bg-white dark:bg-slate-950">
        <View className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/blog" asChild>
            <Pressable className="flex-row items-center gap-2 self-start">
              <Feather name="arrow-left" color="#15803d" size={16} />
              <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                {t('blog_page.back_to_blog')}
              </Text>
            </Pressable>
          </Link>

          <View className="mt-8">
            <View className="flex-row flex-wrap items-center gap-2">
              {post.category ? (
                <View className="rounded-full bg-green-50 px-3 py-1 dark:bg-green-900/30">
                  <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                    {post.category}
                  </Text>
                </View>
              ) : null}
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                {post.readMinutes} {t('blog_page.min_read')}
              </Text>
              {post.publishedAt ? (
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                  {post.publishedAt}
                </Text>
              ) : null}
            </View>

            <Text className="mb-2 mt-4 font-sans text-3xl font-bold leading-tight text-gray-950 dark:text-white sm:text-5xl">
              {localized.title}
            </Text>
          </View>
        </View>

        <View className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <View className="aspect-[16/7] overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">
            <Image
              source={post.imageUrl ? { uri: post.imageUrl } : fallbackImage}
              className="h-full w-full"
              contentFit={post.imageUrl ? 'cover' : 'contain'}
            />
          </View>
        </View>

        <View className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <View className="mb-8 gap-3 border-b border-gray-100 pb-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <View className="flex-row items-center gap-2">
              <Feather name="share-2" color="#475569" size={16} />
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                {t('blog_page.share_article')}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {shareLinks.map((link) => (
                <Pressable
                  key={link.label}
                  onPress={() => void Linking.openURL(link.url)}
                  accessibilityLabel={`${t('blog_page.share_on')} ${link.label}`}
                  className="h-9 flex-row items-center gap-2 rounded-md border border-gray-200 px-3 dark:border-slate-700">
                  <View className="h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1 dark:bg-slate-700">
                    <Text className="font-sans text-[10px] font-bold text-gray-800 dark:text-slate-100">
                      {link.icon}
                    </Text>
                  </View>
                  <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                    {link.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={shareNative}
                className="h-9 flex-row items-center gap-2 rounded-md border border-gray-200 px-3 dark:border-slate-700">
                <Feather name={copied ? 'check' : 'link'} color={copied ? '#16a34a' : '#475569'} size={16} />
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {copied ? t('blog_page.copied') : t('blog_page.copy_link')}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="gap-5">
            {localized.paragraphs.map((paragraph, index) => (
              <Text
                key={`${paragraph.slice(0, 18)}-${index}`}
                className="font-sans text-base leading-8 text-gray-700 dark:text-slate-300">
                {paragraph}
              </Text>
            ))}
          </View>

          {post.tags.length > 0 ? (
            <View className="mt-10 flex-row flex-wrap gap-2 border-t border-gray-100 pt-6 dark:border-slate-800">
              {post.tags.map((tag) => (
                <View key={tag} className="rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800">
                  <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-300">
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {related.length > 0 ? (
          <View className="border-t border-gray-100 bg-gray-50 py-10 dark:border-slate-800 dark:bg-slate-900/60">
            <View className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <Text className="font-sans text-xl font-bold text-gray-950 dark:text-white">
                {t('blog_page.related')}
              </Text>
              <View className="mt-5">
                <RelatedPostGrid>
                  {related.map((item) => (
                    <RelatedCard key={String(item.id)} post={item} />
                  ))}
                </RelatedPostGrid>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </AppLayout>
  );
}
