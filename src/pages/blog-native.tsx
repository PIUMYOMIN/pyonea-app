import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useGlobalSearchParams, useRouter, type Href } from 'expo-router';
import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { NativeSeo } from '@/components/SEO/native-seo';
import { useTheme } from '@/context/theme';
import { chunkMarketplaceItems } from '@/components/marketplace/marketplace-grid';
import { BLOG_POST_GRID_CLASS } from '@/constants/layout';
import { SITE_PUBLIC_URL } from '@/config/native';
import { mergeRouteLang, normalizeLanguage, useAppTranslation } from '@/i18n';
import { fetchBlogPagePosts, type BlogPost } from '@/utils/native-api';

const fallbackImage = require('@/assets/images/og-image.png');
const blogSearchInputClass =
  'h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 font-sans text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const blogFilterSelectClass =
  'h-11 w-full rounded-lg border border-gray-200 bg-white px-3 font-sans text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:min-w-[220px]';
const blogCardSurfaceClass =
  'h-full w-full min-w-0 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const blogCardHoverClass =
  'web:transition web:hover:-translate-y-0.5 web:hover:shadow-md';
const isWeb = Platform.OS === 'web';

const readParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return typeof value === 'string' ? value : '';
};

function useBlogGridColumns() {
  const { width } = useWindowDimensions();
  return useMemo(() => (width >= 1024 ? 3 : width >= 768 ? 2 : 1), [width]);
}

const BLOG_CARD_ROW_CLASS = 'min-w-0 flex-1 self-stretch';

function BlogGridRow({ columns, children }: { columns: number; children: ReactNode }) {
  const cells = useMemo(() => {
    const list = Array.isArray(children) ? children : children != null ? [children] : [];
    return list.filter((cell) => cell != null && cell !== false);
  }, [children]);
  const emptySlots = Math.max(0, columns - cells.length);

  return (
    <View className="mb-6 flex-row items-stretch gap-6">
      {cells.map((child, index) => (
        <View key={`blog-grid-cell-${index}`} className={BLOG_CARD_ROW_CLASS}>
          {child}
        </View>
      ))}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <View
          key={`blog-grid-filler-${index}`}
          className={`${BLOG_CARD_ROW_CLASS} opacity-0`}
          pointerEvents="none"
        />
      ))}
    </View>
  );
}

function BlogPostGrid({ children }: { children: ReactNode }) {
  const columns = useBlogGridColumns();
  const cells = useMemo(() => {
    const list = Array.isArray(children) ? children : children != null ? [children] : [];
    return list.filter((cell) => cell != null && cell !== false);
  }, [children]);
  const rows = useMemo(() => chunkMarketplaceItems(cells, columns), [cells, columns]);

  if (isWeb) {
    return <View className={BLOG_POST_GRID_CLASS}>{children}</View>;
  }

  return (
    <>
      {rows.map((row, rowIndex) => (
        <BlogGridRow key={`blog-grid-row-${rowIndex}`} columns={columns}>
          {row}
        </BlogGridRow>
      ))}
    </>
  );
}

function BlogSkeleton() {
  return (
    <BlogPostGrid>
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={`blog-skeleton-${index}`}
          className="h-80 animate-pulse rounded-lg bg-white dark:bg-slate-900"
        />
      ))}
    </BlogPostGrid>
  );
}

function BlogSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const iconColor = isDark ? '#94a3b8' : '#9ca3af';
  const placeholderColor = isDark ? '#64748b' : '#9ca3af';
  const placeholder = t('blog_page.search_placeholder');

  if (isWeb) {
    return (
      <View className="relative min-w-0 flex-1">
        <View className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
          <Feather name="search" color={iconColor} size={20} />
        </View>
        {createElement('input', {
          id: 'blog-search',
          type: 'text',
          name: 'search',
          value,
          autoComplete: 'off',
          'aria-label': placeholder,
          onChange: (event: { target: { value: string } }) => onChange(event.target.value),
          placeholder,
          className: blogSearchInputClass,
        })}
      </View>
    );
  }

  return (
    <View className="relative min-w-0 flex-1 flex-row items-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      <View className="pointer-events-none absolute left-3 z-10">
        <Feather name="search" color={iconColor} size={20} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        className="h-11 min-w-0 flex-1 border-0 bg-transparent pl-10 pr-3 font-sans text-sm text-gray-900 outline-none dark:text-white"
      />
    </View>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  const { t, language } = useAppTranslation();
  const title =
    language === 'my' ? post.titleMm || post.titleEn || post.title : post.titleEn || post.titleMm || post.title;
  const excerpt =
    language === 'my'
      ? post.excerptMm || post.excerptEn || post.excerpt
      : post.excerptEn || post.excerptMm || post.excerpt;

  return (
    <Link href={`/blog/${post.slug}` as Href} asChild>
      <Pressable className={`group ${blogCardSurfaceClass} ${blogCardHoverClass}`}>
        <View className="aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-slate-800">
          <Image
            source={post.imageUrl ? { uri: post.imageUrl } : fallbackImage}
            className="h-full w-full web:transition web:duration-300 web:group-hover:scale-105"
            contentFit="cover"
          />
        </View>
        <View className="flex-1 gap-3 p-5">
          <View className="flex-row flex-wrap items-center gap-2">
            {post.category ? (
              <View className="rounded-full bg-green-50 px-2.5 py-1 dark:bg-green-900/30">
                <Text className="font-sans text-xs font-medium text-green-700 dark:text-green-300">
                  {post.category}
                </Text>
              </View>
            ) : null}
            <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
              {post.readMinutes} {t('blog_page.min_read')}
            </Text>
          </View>
          <Text
            className="font-sans text-lg font-semibold leading-6 text-gray-950 dark:text-white web:group-hover:text-green-700 dark:web:group-hover:text-green-300"
            numberOfLines={2}>
            {title}
          </Text>
          <Text
            className="font-sans text-sm leading-6 text-gray-600 dark:text-slate-400"
            numberOfLines={3}>
            {excerpt}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
              {t('blog_page.read_article')}
            </Text>
            <Feather name="arrow-right" color="#15803d" size={15} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function FeaturedPost({ post }: { post: BlogPost }) {
  const { t, language } = useAppTranslation();
  const title =
    language === 'my' ? post.titleMm || post.titleEn || post.title : post.titleEn || post.titleMm || post.title;
  const excerpt =
    language === 'my'
      ? post.excerptMm || post.excerptEn || post.excerpt
      : post.excerptEn || post.excerptMm || post.excerpt;

  return (
    <View className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Link href={`/blog/${post.slug}` as Href} asChild>
        <Pressable
          className={
            isWeb ? 'grid gap-0 lg:grid-cols-[1.05fr_0.95fr]' : 'flex-col lg:flex-row'
          }>
          <View className="aspect-[16/10] bg-gray-100 dark:bg-slate-800 lg:aspect-auto lg:flex-1">
            <Image
              source={post.imageUrl ? { uri: post.imageUrl } : fallbackImage}
              className="h-full w-full"
              contentFit="cover"
            />
          </View>
          <View className="flex-col justify-center p-6 sm:p-8 lg:flex-1">
            <View className="w-fit self-start rounded-full bg-green-50 px-3 py-1 dark:bg-green-900/30">
              <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                {post.category || t('blog_page.featured')}
              </Text>
            </View>
            <Text className="mt-4 font-sans text-2xl font-bold leading-8 text-gray-950 dark:text-white sm:text-3xl">
              {title}
            </Text>
            <Text
              className="mt-4 font-sans text-sm leading-7 text-gray-600 dark:text-slate-400"
              numberOfLines={4}>
              {excerpt}
            </Text>
            <View className="mt-5 flex-row items-center gap-1">
              <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                {t('blog_page.read_article')}
              </Text>
              <Feather name="arrow-right" color="#15803d" size={15} />
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

function BlogCategorySelect({
  value,
  categories,
  onChange,
}: {
  value: string;
  categories: string[];
  onChange: (value: string) => void;
}) {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);

  if (isWeb) {
    return (
      <View className="w-full sm:w-auto sm:min-w-[220px]">
        {createElement(
          'select',
          {
            id: 'blog-category',
            name: 'category',
            value,
            'aria-label': t('blog_page.all_categories'),
            onChange: (event: { target: { value: string } }) => onChange(event.target.value),
            className: blogFilterSelectClass,
          },
          createElement('option', { value: '' }, t('blog_page.all_categories')),
          ...categories.map((item) => createElement('option', { key: item, value: item }, item)),
        )}
      </View>
    );
  }

  const label = value || t('blog_page.all_categories');

  return (
    <View className="w-full sm:w-auto sm:min-w-[220px]">
      <Pressable
        onPress={() => setOpen(true)}
        className="h-11 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
        <Text className="font-sans text-sm text-gray-900 dark:text-white" numberOfLines={1}>
          {label}
        </Text>
        <Feather name="chevron-down" color="#9ca3af" size={18} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/45" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-white dark:bg-slate-900">
            <Pressable
              onPress={() => {
                onChange('');
                setOpen(false);
              }}
              className="border-b border-gray-100 px-4 py-3 dark:border-slate-800">
              <Text className="font-sans text-sm text-gray-700 dark:text-slate-200">
                {t('blog_page.all_categories')}
              </Text>
            </Pressable>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                className="border-b border-gray-100 px-4 py-3 dark:border-slate-800">
                <Text
                  className={`font-sans text-sm ${
                    value === item
                      ? 'font-semibold text-green-700 dark:text-green-300'
                      : 'text-gray-700 dark:text-slate-200'
                  }`}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function BlogNative() {
  const { t, language } = useAppTranslation();
  const router = useRouter();
  const params = useGlobalSearchParams<{
    search?: string | string[];
    category?: string | string[];
    lang?: string | string[];
  }>();
  const routeSearch = readParam(params.search);
  const routeCategory = readParam(params.category);
  const routeLang = readParam(params.lang);
  const lastSyncedHref = useRef<string | null>(null);
  const [search, setSearch] = useState(() => routeSearch);
  const [category, setCategory] = useState(() => routeCategory);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextSearch = search.trim();
    const nextCategory = category;
    const currentSearch = routeSearch.trim();
    const currentCategory = routeCategory;
    const currentLang = routeLang ? normalizeLanguage(routeLang) : null;

    const query: Record<string, string | string[] | undefined> = {};
    if (nextSearch) query.search = nextSearch;
    if (nextCategory) query.category = nextCategory;

    const targetHref = mergeRouteLang('/blog', query, language);
    const filtersMatch = nextSearch === currentSearch && nextCategory === currentCategory;
    const langMatches = !currentLang || currentLang === language;

    if (filtersMatch && langMatches) {
      lastSyncedHref.current = targetHref;
      return;
    }

    if (lastSyncedHref.current === targetHref) return;

    lastSyncedHref.current = targetHref;
    router.replace(targetHref as Href);
  }, [category, language, routeCategory, routeLang, routeSearch, router, search]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPosts = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchBlogPagePosts(
          { search: search.trim(), category, perPage: 24 },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setPosts(result.posts);
          setCategories(result.categories.length > 0 ? result.categories : deriveCategories(result.posts));
        }
      } catch {
        if (!controller.signal.aborted) {
          setPosts([]);
          setError(t('blog_page.fetch_error'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadPosts();

    return () => controller.abort();
  }, [category, search, t]);

  const featured = useMemo(() => posts.find((post) => post.featured) || posts[0], [posts]);
  const remaining = featured
    ? posts.filter((post) => String(post.id) !== String(featured.id))
    : posts;
  const hasActiveFilters = Boolean(search.trim() || category);
  const seoUrl = useMemo(() => {
    const query: Record<string, string | string[] | undefined> = {};
    if (search.trim()) query.search = search.trim();
    if (category) query.category = category;
    return mergeRouteLang('/blog', query, language);
  }, [category, language, search]);

  return (
    <>
      <NativeSeo
        title={t('blog_page.seo.title')}
        description={t('blog_page.seo.description')}
        url={seoUrl}
        type="website"
        noindex={hasActiveFilters}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: t('blog_page.seo.title'),
          description: t('blog_page.seo.description'),
          url: `${SITE_PUBLIC_URL}/blog`,
        }}
      />
      <AppLayout>
      <View className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <View className="border-b border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <View className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <View className="max-w-3xl">
              <Text className="font-sans text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                {t('blog_page.label')}
              </Text>
              <Text className="mt-3 font-sans text-3xl font-bold text-gray-950 dark:text-white sm:text-4xl">
                {t('blog_page.title')}
              </Text>
              <Text className="mt-4 font-sans text-base leading-7 text-gray-600 dark:text-slate-400">
                {t('blog_page.subtitle')}
              </Text>
            </View>

            <View className="mt-8 flex-col gap-3 sm:flex-row">
              <BlogSearchField value={search} onChange={setSearch} />
              <BlogCategorySelect value={category} categories={categories} onChange={setCategory} />
            </View>
          </View>
        </View>

        <View className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {error ? (
            <View className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <BlogSkeleton />
          ) : posts.length === 0 ? (
            <View className="items-center rounded-lg border border-dashed border-gray-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-900">
              <Text className="text-center font-sans text-lg font-semibold text-gray-950 dark:text-white">
                {t('blog_page.empty_title')}
              </Text>
              <Text className="mt-2 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                {t('blog_page.empty_subtitle')}
              </Text>
            </View>
          ) : (
            <View className="gap-10">
              {featured ? <FeaturedPost post={featured} /> : null}
              <BlogPostGrid>
                {remaining.map((post) => (
                  <BlogCard key={String(post.id)} post={post} />
                ))}
              </BlogPostGrid>
            </View>
          )}
        </View>
      </View>
    </AppLayout>
    </>
  );
}

function deriveCategories(posts: BlogPost[]) {
  return [...new Set(posts.map((post) => post.category).filter(Boolean))] as string[];
}
