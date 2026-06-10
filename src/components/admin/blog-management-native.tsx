import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/context/theme';
import {
  adminBlogQuickAction,
  createAdminBlogPost,
  deleteAdminBlogPost,
  fetchAdminBlogPosts,
  updateAdminBlogPost,
  type AdminBlogFormPayload,
  type AdminManagedBlogPost,
} from '@/utils/native-api';

const BLANK_FORM: AdminBlogFormPayload = {
  title_en: '',
  title_mm: '',
  slug: '',
  excerpt_en: '',
  excerpt_mm: '',
  content_en: '',
  content_mm: '',
  featured_image: '',
  category: 'Business Guides',
  tags: [],
  status: 'draft',
  is_featured: false,
  published_at: null,
  seo_title_en: '',
  seo_title_mm: '',
  seo_description_en: '',
  seo_description_mm: '',
};

const INPUT_CLASS =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const LABEL_CLASS =
  'mb-1 font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400';

const formatForInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const formatPublishedDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
};

type FormDraft = AdminBlogFormPayload & { tagsText: string };

const toDraft = (post: AdminManagedBlogPost | null): FormDraft => {
  if (!post) {
    return { ...BLANK_FORM, tagsText: '' };
  }

  return {
    title_en: post.titleEn,
    title_mm: post.titleMm,
    slug: post.slug,
    excerpt_en: post.excerptEn,
    excerpt_mm: post.excerptMm,
    content_en: post.contentEn,
    content_mm: post.contentMm,
    featured_image: post.featuredImage,
    category: post.category,
    tags: post.tags,
    tagsText: post.tags.join(', '),
    status: post.status,
    is_featured: post.isFeatured,
    published_at: formatForInput(post.publishedAt) || null,
    seo_title_en: post.seoTitleEn,
    seo_title_mm: post.seoTitleMm,
    seo_description_en: post.seoDescriptionEn,
    seo_description_mm: post.seoDescriptionMm,
  };
};

const toPayload = (draft: FormDraft): AdminBlogFormPayload => ({
  title_en: draft.title_en.trim(),
  title_mm: draft.title_mm.trim(),
  slug: draft.slug.trim(),
  excerpt_en: draft.excerpt_en.trim(),
  excerpt_mm: draft.excerpt_mm.trim(),
  content_en: draft.content_en.trim(),
  content_mm: draft.content_mm.trim(),
  featured_image: draft.featured_image.trim(),
  category: draft.category.trim(),
  tags: draft.tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean),
  status: draft.status,
  is_featured: !!draft.is_featured,
  published_at: draft.published_at || null,
  seo_title_en: draft.seo_title_en.trim(),
  seo_title_mm: draft.seo_title_mm.trim(),
  seo_description_en: draft.seo_description_en.trim(),
  seo_description_mm: draft.seo_description_mm.trim(),
});

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === 'published'
      ? 'bg-green-50 dark:bg-green-900/30'
      : status === 'archived'
        ? 'bg-gray-100 dark:bg-slate-800'
        : 'bg-amber-50 dark:bg-amber-900/30';
  const text =
    status === 'published'
      ? 'text-green-700 dark:text-green-300'
      : status === 'archived'
        ? 'text-gray-600 dark:text-slate-300'
        : 'text-amber-700 dark:text-amber-300';

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${cfg}`}>
      <Text className={`font-sans text-xs font-semibold capitalize ${text}`}>{status}</Text>
    </View>
  );
}

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={`${INPUT_CLASS} min-w-[140px] flex-row items-center justify-between sm:max-w-44`}>
        <Text className="font-sans text-sm text-gray-700 dark:text-slate-300" numberOfLines={1}>
          {selected?.label || 'Status'}
        </Text>
        <Feather name="chevron-down" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/45 px-4" onPress={() => setOpen(false)}>
          <Pressable className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-white dark:bg-slate-800">
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`border-b border-gray-100 px-4 py-3 dark:border-slate-700 ${
                  option.value === value ? 'bg-green-50 dark:bg-green-900/20' : ''
                }`}>
                <Text
                  className={`font-sans text-sm ${
                    option.value === value
                      ? 'font-semibold text-green-700 dark:text-green-300'
                      : 'text-gray-700 dark:text-slate-300'
                  }`}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines = 1,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  required?: boolean;
}) {
  return (
    <View>
      <Text className={LABEL_CLASS}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`${INPUT_CLASS}${multiline ? ' min-h-[72px]' : ''}`}
        {...(required ? { accessibilityRequired: true } : {})}
      />
    </View>
  );
}

export function BlogManagementNative() {
  const { isDark } = useTheme();
  const [posts, setPosts] = useState<AdminManagedBlogPost[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminManagedBlogPost | null>(null);
  const [form, setForm] = useState<FormDraft>(() => toDraft(null));
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminManagedBlogPost | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | number | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminBlogPosts({ page, perPage: 15, status, search });
      setPosts(result.posts);
      setMeta({
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        total: result.total,
      });
    } catch {
      setMessage({ type: 'error', text: 'Blog posts could not be loaded.' });
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const startCreate = () => {
    setEditing(null);
    setForm(toDraft(null));
    setMessage(null);
  };

  const startEdit = (post: AdminManagedBlogPost) => {
    setEditing(post);
    setForm(toDraft(post));
    setMessage(null);
  };

  const setField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const savePayload = useMemo(() => toPayload(form), [form]);

  const save = async () => {
    if (!form.title_en.trim() || !form.content_en.trim()) {
      setMessage({ type: 'error', text: 'English title and content are required.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (editing) {
        await updateAdminBlogPost(editing.id, savePayload);
        setMessage({ type: 'success', text: 'Blog post updated.' });
      } else {
        await createAdminBlogPost(savePayload);
        setMessage({ type: 'success', text: 'Blog post created.' });
      }
      startCreate();
      await loadPosts();
    } catch (requestError) {
      setMessage({
        type: 'error',
        text: requestError instanceof Error ? requestError.message : 'Could not save blog post.',
      });
    } finally {
      setSaving(false);
    }
  };

  const quickAction = async (post: AdminManagedBlogPost, action: 'publish' | 'archive' | 'delete') => {
    if (action === 'delete') {
      setDeleteTarget(post);
      return;
    }

    setActionBusyId(post.id);
    setMessage(null);
    try {
      await adminBlogQuickAction(post.id, action);
      await loadPosts();
    } catch {
      setMessage({ type: 'error', text: 'Action failed. Please try again.' });
    } finally {
      setActionBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionBusyId(deleteTarget.id);
    setMessage(null);
    try {
      await deleteAdminBlogPost(deleteTarget.id);
      if (editing?.id === deleteTarget.id) startCreate();
      setDeleteTarget(null);
      await loadPosts();
    } catch {
      setMessage({ type: 'error', text: 'Action failed. Please try again.' });
    } finally {
      setActionBusyId(null);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  const formStatusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <View className="gap-6">
      <View className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-white">
            Blog Management
          </Text>
          <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
            Create SEO guides for buyers, sellers, and Myanmar wholesale search traffic.
          </Text>
        </View>
        <Pressable
          onPress={startCreate}
          className="flex-row items-center gap-2 self-start rounded-lg bg-green-600 px-4 py-2">
          <Feather name="plus" size={16} color="#ffffff" />
          <Text className="font-sans text-sm font-semibold text-white">New Post</Text>
        </Pressable>
      </View>

      {message ? (
        <Pressable onPress={() => setMessage(null)}>
          <View
            className={`rounded-lg border p-3 ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}>
            <Text
              className={`font-sans text-sm ${
                message.type === 'success'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
              {message.text}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View className="gap-6 xl:grid xl:grid-cols-[1fr_420px]">
        <View className="overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <View className="gap-3 border-b border-gray-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center">
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => {
                setPage(1);
                void loadPosts();
              }}
              placeholder="Search title or slug..."
              placeholderTextColor="#9ca3af"
              returnKeyType="search"
              className={`${INPUT_CLASS} min-w-0 flex-1`}
            />
            <FilterSelect
              value={status}
              options={statusOptions}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />
            <Pressable
              onPress={() => void loadPosts()}
              className="items-center justify-center rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-700">
              <Feather name="refresh-cw" size={16} color={isDark ? '#cbd5e1' : '#374151'} />
            </Pressable>
          </View>

          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#16a34a" />
              <Text className="mt-2 font-sans text-sm text-gray-500 dark:text-slate-400">
                Loading blog posts...
              </Text>
            </View>
          ) : posts.length === 0 ? (
            <View className="items-center py-10">
              <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                No blog posts found.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View className="min-w-full">
                <View className="min-w-[760px] flex-row border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  {['Title', 'Status', 'Category', 'Published', 'Actions'].map((heading) => (
                    <Text
                      key={heading}
                      className={`font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 ${
                        heading === 'Title'
                          ? 'min-w-[220px] flex-1'
                          : heading === 'Actions'
                            ? 'w-44 text-right'
                            : heading === 'Category'
                              ? 'w-36'
                              : heading === 'Published'
                                ? 'w-28'
                                : 'w-28'
                      }`}>
                      {heading}
                    </Text>
                  ))}
                </View>

                {posts.map((post) => (
                  <View
                    key={String(post.id)}
                    className="min-w-[760px] flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-slate-800">
                    <View className="min-w-[220px] flex-1 pr-4">
                      <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-white">
                        {post.titleEn || 'Untitled'}
                      </Text>
                      <Text className="font-sans text-xs text-gray-500">/{post.slug}</Text>
                    </View>
                    <View className="w-28 pr-4">
                      <StatusBadge status={post.status} />
                    </View>
                    <Text
                      className="w-36 pr-4 font-sans text-sm text-gray-600 dark:text-slate-300"
                      numberOfLines={1}>
                      {post.category || '—'}
                    </Text>
                    <Text className="w-28 pr-4 font-sans text-sm text-gray-500">
                      {formatPublishedDate(post.publishedAt)}
                    </Text>
                    <View className="w-44 flex-row items-center justify-end gap-1">
                      <Pressable
                        onPress={() => startEdit(post)}
                        className="rounded-lg p-2">
                        <Feather name="edit-2" size={16} color={isDark ? '#94a3b8' : '#6b7280'} />
                      </Pressable>
                      {post.status !== 'published' ? (
                        <Pressable
                          disabled={actionBusyId === post.id}
                          onPress={() => void quickAction(post, 'publish')}
                          className="rounded-lg px-2 py-1">
                          <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                            Publish
                          </Text>
                        </Pressable>
                      ) : null}
                      {post.status !== 'archived' ? (
                        <Pressable
                          disabled={actionBusyId === post.id}
                          onPress={() => void quickAction(post, 'archive')}
                          className="rounded-lg px-2 py-1">
                          <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-300">
                            Archive
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        disabled={actionBusyId === post.id}
                        onPress={() => void quickAction(post, 'delete')}
                        className="rounded-lg p-2">
                        <Feather name="trash-2" size={16} color="#f87171" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {meta.lastPage > 1 ? (
            <View className="flex-row items-center justify-between border-t border-gray-100 p-4 dark:border-slate-800">
              <Text className="font-sans text-sm text-gray-500">
                Page {meta.currentPage} of {meta.lastPage} · {meta.total} posts
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  disabled={page <= 1}
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50 dark:border-slate-700">
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-200">Prev</Text>
                </Pressable>
                <Pressable
                  disabled={page >= meta.lastPage}
                  onPress={() => setPage((current) => Math.min(meta.lastPage, current + 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50 dark:border-slate-700">
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-200">Next</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View className="rounded-lg border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-sans text-base font-semibold text-gray-950 dark:text-white">
              {editing ? 'Edit Blog Post' : 'Create Blog Post'}
            </Text>
            {editing ? (
              <Pressable onPress={startCreate} className="rounded-lg p-1">
                <Feather name="x" size={20} color={isDark ? '#94a3b8' : '#9ca3af'} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView contentContainerClassName="gap-4" showsVerticalScrollIndicator={false}>
            <FormField
              label="English title"
              value={form.title_en}
              onChangeText={(value) => setField('title_en', value)}
              required
            />
            <FormField
              label="Myanmar title"
              value={form.title_mm}
              onChangeText={(value) => setField('title_mm', value)}
            />
            <FormField
              label="Slug"
              value={form.slug}
              onChangeText={(value) => setField('slug', value)}
              placeholder="auto-generated if empty"
            />

            <View className="gap-4 sm:flex-row">
              <View className="min-w-0 flex-1">
                <FormField
                  label="Category"
                  value={form.category}
                  onChangeText={(value) => setField('category', value)}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className={LABEL_CLASS}>Status</Text>
                <FilterSelect
                  value={form.status}
                  options={formStatusOptions}
                  onChange={(value) => setField('status', value)}
                />
              </View>
            </View>

            <FormField
              label="Featured image URL"
              value={form.featured_image}
              onChangeText={(value) => setField('featured_image', value)}
            />
            <FormField
              label="Tags"
              value={form.tagsText}
              onChangeText={(value) => setField('tagsText', value)}
              placeholder="wholesale, supplier, myanmar"
            />
            <FormField
              label="English excerpt"
              value={form.excerpt_en}
              onChangeText={(value) => setField('excerpt_en', value)}
              multiline
              numberOfLines={2}
            />
            <FormField
              label="Myanmar excerpt"
              value={form.excerpt_mm}
              onChangeText={(value) => setField('excerpt_mm', value)}
              multiline
              numberOfLines={2}
            />
            <FormField
              label="English content"
              value={form.content_en}
              onChangeText={(value) => setField('content_en', value)}
              multiline
              numberOfLines={8}
              required
            />
            <FormField
              label="Myanmar content"
              value={form.content_mm}
              onChangeText={(value) => setField('content_mm', value)}
              multiline
              numberOfLines={8}
            />
            <FormField
              label="SEO description EN"
              value={form.seo_description_en}
              onChangeText={(value) => setField('seo_description_en', value)}
              multiline
              numberOfLines={2}
            />

            <View className="flex-row items-center gap-2">
              <Switch
                value={!!form.is_featured}
                onValueChange={(value) => setField('is_featured', value)}
                trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                thumbColor={form.is_featured ? '#16a34a' : '#f8fafc'}
              />
              <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                Feature on blog page
              </Text>
            </View>

            <Pressable
              disabled={saving}
              onPress={() => void save()}
              className="items-center rounded-lg bg-green-600 px-4 py-2 disabled:opacity-60">
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="font-sans text-sm font-semibold text-white">
                  {editing ? 'Update Post' : 'Create Post'}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable className="flex-1 items-center justify-center bg-black/45 px-4" onPress={() => setDeleteTarget(null)}>
          <Pressable className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-800">
            <Text className="font-sans text-lg font-bold text-gray-950 dark:text-white">Delete blog post?</Text>
            <Text className="mt-2 font-sans text-sm text-gray-600 dark:text-slate-400">
              Delete &quot;{deleteTarget?.titleEn}&quot;? This cannot be undone.
            </Text>
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable onPress={() => setDeleteTarget(null)} className="rounded-lg px-4 py-2">
                <Text className="font-sans text-sm font-semibold text-gray-600 dark:text-slate-300">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!!actionBusyId}
                onPress={() => void confirmDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 disabled:opacity-60">
                {actionBusyId ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="font-sans text-sm font-semibold text-white">Delete</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
