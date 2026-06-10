import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useGlobalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { BLOG_POST_GRID_CLASS, SITE_CONTAINER_CLASS } from '@/constants/layout';
import { useAppTranslation } from '@/i18n';
import { fetchBlogPagePosts, type BlogPost } from '@/utils/native-api';

import { BRAND_LOGO } from '@/constants/brand';

function BlogSkeleton() {
  return (
    <View className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={`blog-skeleton-${index}`}
          className="h-80 rounded-lg bg-white dark:bg-slate-900"
        />
      ))}
    </View>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  const { t, language } = useAppTranslation();
  const title = language === 'my' ? post.titleMm || post.titleEn || post.title : post.titleEn || post.titleMm || post.title;
  const excerpt =
    language === 'my'
      ? post.excerptMm || post.excerptEn || post.excerpt
      : post.excerptEn || post.excerptMm || post.excerpt;

  return (
    <Link href={`/blog/${post.slug}` as Href} asChild>
      <Pressable className="w-full min-w-0 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm shadow-gray-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
        <View className="aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-slate-800">
          <Image
            source={post.imageUrl ? { uri: post.imageUrl } : BRAND_LOGO}
            className="h-full w-full"
            contentFit={post.imageUrl ? 'cover' : 'contain'}
          />
        </View>
        <View className="gap-3 p-5">
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
            className="font-sans text-lg font-semibold leading-6 text-gray-950 dark:text-white"
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
  const title = language === 'my' ? post.titleMm || post.titleEn || post.title : post.titleEn || post.titleMm || post.title;
  const excerpt =
    language === 'my'
      ? post.excerptMm || post.excerptEn || post.excerpt
      : post.excerptEn || post.excerptMm || post.excerpt;

  return (
    <Link href={`/blog/${post.slug}` as Href} asChild>
      <Pressable className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm shadow-gray-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40 lg:flex-row">
        <View className="aspect-[16/10] bg-gray-100 dark:bg-slate-800 lg:aspect-auto lg:flex-1">
          <Image
            source={post.imageUrl ? { uri: post.imageUrl } : BRAND_LOGO}
            className="h-full w-full"
            contentFit={post.imageUrl ? 'cover' : 'contain'}
          />
        </View>
        <View className="justify-center p-6 sm:p-8 lg:flex-1">
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
  );
}

function BlogSearchBar({
  initialValue,
  onSubmit,
}: {
  initialValue: string;
  onSubmit: (value: string) => void;
}) {
  const { t } = useAppTranslation();
  const [draftSearch, setDraftSearch] = useState(initialValue);

  return (
    <View className="mt-8 gap-3 sm:flex-row">
      <View className="min-w-0 flex-1 flex-row items-center rounded-lg border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
        <Feather name="search" color="#9ca3af" size={20} />
        <TextInput
          value={draftSearch}
          onChangeText={setDraftSearch}
          onSubmitEditing={() => onSubmit(draftSearch)}
          placeholder={t('blog_page.search_placeholder')}
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          className="min-w-0 flex-1 px-3 py-3 font-sans text-sm text-gray-900 dark:text-white"
        />
        {draftSearch ? (
          <Pressable
            onPress={() => {
              setDraftSearch('');
              onSubmit('');
            }}
            className="h-8 w-8 items-center justify-center rounded-full">
            <Feather name="x" color="#9ca3af" size={17} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={() => onSubmit(draftSearch)}
        className="items-center justify-center rounded-lg bg-green-600 px-5 py-3">
        <Text className="font-sans text-sm font-semibold text-white">{t('header.search')}</Text>
      </Pressable>
    </View>
  );
}

export function BlogNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const params = useGlobalSearchParams<{ search?: string; category?: string }>();
  const search = typeof params.search === 'string' ? params.search : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadPosts = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchBlogPagePosts({ search, category, perPage: 24 }, controller.signal);
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

  const featured = useMemo(
    () => posts.find((post) => post.featured) || posts[0],
    [posts]
  );
  const remaining = featured
    ? posts.filter((post) => String(post.id) !== String(featured.id))
    : posts;

  const pushFilters = (next: { search?: string; category?: string }) => {
    const query = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextCategory = next.category ?? category;
    if (nextSearch.trim()) query.set('search', nextSearch.trim());
    if (nextCategory) query.set('category', nextCategory);
    const queryString = query.toString();
    router.replace(queryString ? (`/blog?${queryString}` as Href) : '/blog');
  };

  return (
    <AppLayout>
      <View className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <View className="border-b border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <View className={`${SITE_CONTAINER_CLASS} py-12`}>
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

            <BlogSearchBar
              key={search}
              initialValue={search}
              onSubmit={(value) => pushFilters({ search: value })}
            />

            <View className="mt-4 flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => pushFilters({ category: '' })}
                className={`rounded-full px-3 py-1.5 ${
                  !category ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-800'
                }`}>
                <Text
                  className={`font-sans text-xs font-semibold ${
                    !category ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                  }`}>
                  {t('blog_page.all_categories')}
                </Text>
              </Pressable>
              {categories.map((item) => {
                const active = category === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => pushFilters({ category: active ? '' : item })}
                    className={`rounded-full px-3 py-1.5 ${
                      active ? 'bg-green-600' : 'bg-gray-100 dark:bg-slate-800'
                    }`}>
                    <Text
                      className={`font-sans text-xs font-semibold ${
                        active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                      }`}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View className={`${SITE_CONTAINER_CLASS} py-10`}>
          {error ? (
            <View className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <Text className="font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <BlogSkeleton />
          ) : posts.length === 0 ? (
            <View className="rounded-lg border border-dashed border-gray-200 bg-white p-10 items-center dark:border-slate-700 dark:bg-slate-900">
              <Feather name="file-text" color="#cbd5e1" size={42} />
              <Text className="mt-4 text-center font-sans text-lg font-semibold text-gray-950 dark:text-white">
                {t('blog_page.empty_title')}
              </Text>
              <Text className="mt-2 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                {t('blog_page.empty_subtitle')}
              </Text>
            </View>
          ) : (
            <View className="gap-10">
              {featured ? <FeaturedPost post={featured} /> : null}
              <View className={BLOG_POST_GRID_CLASS}>
                {remaining.map((post) => (
                  <BlogCard key={String(post.id)} post={post} />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </AppLayout>
  );
}

function deriveCategories(posts: BlogPost[]) {
  return [...new Set(posts.map((post) => post.category).filter(Boolean))];
}
