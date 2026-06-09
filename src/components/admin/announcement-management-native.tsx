import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useEffect, useMemo, useState } from 'react';
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

import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  fetchAdminAnnouncements,
  toggleAdminAnnouncement,
  updateAdminAnnouncement,
  type Announcement,
  type AnnouncementDisplayStyle,
  type AnnouncementPayload,
} from '@/utils/native-api';

const types = ['announcement', 'promotion', 'newsletter', 'advertisement', 'sponsorship'];
const audiences = ['all', 'guests', 'buyers', 'sellers'];
const colors = ['green', 'red', 'blue', 'yellow', 'purple', 'orange'];
const displayStyles: AnnouncementDisplayStyle[] = ['popup_card', 'popup_banner', 'page_banner'];

type Draft = {
  title: string;
  content: string;
  type: string;
  displayStyle: AnnouncementDisplayStyle;
  ctaLabel: string;
  ctaUrl: string;
  ctaStyle: string;
  bannerLinkUrl: string;
  bannerAspectRatio: string;
  badgeLabel: string;
  badgeColor: string;
  targetAudience: string;
  isActive: boolean;
  showOnce: boolean;
  delaySeconds: string;
  startsAt: string;
  endsAt: string;
  sortOrder: string;
};

const emptyDraft: Draft = {
  title: '',
  content: '',
  type: 'announcement',
  displayStyle: 'popup_card',
  ctaLabel: '',
  ctaUrl: '',
  ctaStyle: 'primary',
  bannerLinkUrl: '',
  bannerAspectRatio: '16:9',
  badgeLabel: '',
  badgeColor: 'green',
  targetAudience: 'all',
  isActive: true,
  showOnce: true,
  delaySeconds: '1',
  startsAt: '',
  endsAt: '',
  sortOrder: '0',
};

const titleCase = (value: string) =>
  value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const toDraft = (announcement: Announcement): Draft => ({
  title: announcement.title,
  content: announcement.content,
  type: announcement.type || 'announcement',
  displayStyle: announcement.displayStyle,
  ctaLabel: announcement.ctaLabel,
  ctaUrl: announcement.ctaUrl,
  ctaStyle: announcement.ctaStyle || 'primary',
  bannerLinkUrl: announcement.bannerLinkUrl,
  bannerAspectRatio: announcement.bannerAspectRatio || '16:9',
  badgeLabel: announcement.badgeLabel,
  badgeColor: announcement.badgeColor || 'green',
  targetAudience: announcement.targetAudience || 'all',
  isActive: announcement.isActive,
  showOnce: announcement.showOnce,
  delaySeconds: String(announcement.delaySeconds || 0),
  startsAt: announcement.startsAt,
  endsAt: announcement.endsAt,
  sortOrder: String(announcement.sortOrder || 0),
});

const toPayload = (draft: Draft): AnnouncementPayload => ({
  title: draft.title.trim(),
  content: draft.content.trim(),
  type: draft.type,
  display_style: draft.displayStyle,
  cta_label: draft.ctaLabel.trim(),
  cta_url: draft.ctaUrl.trim(),
  cta_style: draft.ctaStyle,
  banner_link_url: draft.bannerLinkUrl.trim(),
  banner_aspect_ratio: draft.bannerAspectRatio,
  badge_label: draft.badgeLabel.trim(),
  badge_color: draft.badgeColor,
  target_audience: draft.targetAudience,
  is_active: draft.isActive,
  show_once: draft.showOnce,
  delay_seconds: Number(draft.delaySeconds) || 0,
  starts_at: draft.startsAt.trim(),
  ends_at: draft.endsAt.trim(),
  sort_order: Number(draft.sortOrder) || 0,
});

function PillSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View>
      <Text className="mb-2 font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={`rounded-full border px-3 py-2 ${
                active
                  ? 'border-green-600 bg-green-600'
                  : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}>
              <Text
                className={`font-sans text-xs font-bold ${
                  active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                }`}>
                {titleCase(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View>
      <Text className="mb-1 font-sans text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        className={`rounded-xl border border-gray-200 bg-white px-3 py-2 font-sans text-sm text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${
          multiline ? 'min-h-24 align-top' : ''
        }`}
      />
    </View>
  );
}

function AnnouncementForm({
  visible,
  editing,
  draft,
  saving,
  message,
  onClose,
  onSave,
  onDraft,
}: {
  visible: boolean;
  editing: Announcement | null;
  draft: Draft;
  saving: boolean;
  message: string;
  onClose: () => void;
  onSave: () => void;
  onDraft: (draft: Draft) => void;
}) {
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onDraft({ ...draft, [key]: value });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/60 p-4">
        <View className="mx-auto max-h-[92%] w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
            <View>
              <Text className="font-sans text-lg font-black text-gray-950 dark:text-slate-100">
                {editing ? 'Edit announcement' : 'Create announcement'}
              </Text>
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                Popup cards, image banners, and page banners.
              </Text>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
              <Feather name="x" color="#64748b" size={18} />
            </Pressable>
          </View>

          <ScrollView className="max-h-[70vh]" contentContainerClassName="gap-4 p-5">
            {message ? (
              <Text className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                {message}
              </Text>
            ) : null}

            <Field label="Title" value={draft.title} onChangeText={(value) => update('title', value)} />
            <Field label="Content" value={draft.content} multiline onChangeText={(value) => update('content', value)} />
            <PillSelect label="Type" value={draft.type} options={types} onChange={(value) => update('type', value)} />
            <PillSelect
              label="Display style"
              value={draft.displayStyle}
              options={displayStyles}
              onChange={(value) => update('displayStyle', value as AnnouncementDisplayStyle)}
            />
            <PillSelect label="Audience" value={draft.targetAudience} options={audiences} onChange={(value) => update('targetAudience', value)} />

            <View className="gap-4 sm:flex-row">
              <View className="min-w-0 flex-1">
                <Field label="Badge label" value={draft.badgeLabel} onChangeText={(value) => update('badgeLabel', value)} />
              </View>
              <View className="min-w-0 flex-1">
                <PillSelect label="Badge color" value={draft.badgeColor} options={colors} onChange={(value) => update('badgeColor', value)} />
              </View>
            </View>

            <View className="gap-4 sm:flex-row">
              <View className="min-w-0 flex-1">
                <Field label="CTA label" value={draft.ctaLabel} onChangeText={(value) => update('ctaLabel', value)} />
              </View>
              <View className="min-w-0 flex-1">
                <Field label="CTA URL" value={draft.ctaUrl} onChangeText={(value) => update('ctaUrl', value)} placeholder="/products or https://..." />
              </View>
            </View>

            <View className="gap-4 sm:flex-row">
              <View className="min-w-0 flex-1">
                <Field label="Banner link URL" value={draft.bannerLinkUrl} onChangeText={(value) => update('bannerLinkUrl', value)} />
              </View>
              <View className="min-w-0 flex-1">
                <PillSelect
                  label="Banner ratio"
                  value={draft.bannerAspectRatio}
                  options={['16:9', '4:3', '3:1', '1:1']}
                  onChange={(value) => update('bannerAspectRatio', value)}
                />
              </View>
            </View>

            <View className="gap-4 sm:flex-row">
              <View className="min-w-0 flex-1">
                <Field label="Delay seconds" value={draft.delaySeconds} onChangeText={(value) => update('delaySeconds', value)} />
              </View>
              <View className="min-w-0 flex-1">
                <Field label="Sort order" value={draft.sortOrder} onChangeText={(value) => update('sortOrder', value)} />
              </View>
            </View>

            <View className="gap-4 sm:flex-row">
              <View className="min-w-0 flex-1">
                <Field label="Starts at" value={draft.startsAt} onChangeText={(value) => update('startsAt', value)} placeholder="2026-06-07T10:00:00Z" />
              </View>
              <View className="min-w-0 flex-1">
                <Field label="Ends at" value={draft.endsAt} onChangeText={(value) => update('endsAt', value)} placeholder="2026-06-30T23:59:59Z" />
              </View>
            </View>

            <View className="gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <View className="flex-row items-center justify-between gap-4">
                <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-200">
                  Active
                </Text>
                <Switch value={draft.isActive} onValueChange={(value) => update('isActive', value)} />
              </View>
              <View className="flex-row items-center justify-between gap-4">
                <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-200">
                  Show once per day
                </Text>
                <Switch value={draft.showOnce} onValueChange={(value) => update('showOnce', value)} />
              </View>
            </View>
          </ScrollView>

          <View className="gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
            <Pressable onPress={onClose} className="rounded-xl border border-gray-200 px-5 py-3 dark:border-slate-700">
              <Text className="text-center font-sans text-sm font-bold text-gray-600 dark:text-slate-300">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saving}
              className={`rounded-xl px-5 py-3 ${saving ? 'bg-gray-300 dark:bg-slate-700' : 'bg-green-600'}`}>
              <Text className="text-center font-sans text-sm font-bold text-white">
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create announcement'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatusPill({ item }: { item: Announcement }) {
  const active = item.isActive;
  return (
    <View className={`rounded-full px-2.5 py-1 ${active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-800'}`}>
      <Text className={`font-sans text-xs font-bold ${active ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-slate-400'}`}>
        {active ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

export function AnnouncementManagementNative() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [message, setMessage] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const counts = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      banners: items.filter((item) => item.displayStyle === 'page_banner').length,
    }),
    [items]
  );

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      setItems(await fetchAdminAnnouncements());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setFormMessage('');
    setFormOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditing(item);
    setDraft(toDraft(item));
    setFormMessage('');
    setFormOpen(true);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      setFormMessage('Title is required.');
      return;
    }

    setSaving(true);
    setFormMessage('');
    try {
      if (editing) {
        await updateAdminAnnouncement(editing.id, toPayload(draft));
        setMessage('Announcement updated.');
      } else {
        await createAdminAnnouncement(toPayload(draft));
        setMessage('Announcement created.');
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: Announcement) => {
    setBusyId(item.id);
    try {
      await toggleAdminAnnouncement(item.id);
      setItems((current) =>
        current.map((next) => (next.id === item.id ? { ...next, isActive: !next.isActive } : next))
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to toggle announcement.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteAdminAnnouncement(deleteTarget.id);
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setMessage('Announcement deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete announcement.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="gap-5">
      <View className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <View className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-xl font-black text-gray-950 dark:text-slate-100">
              Announcement Center
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
              Manage popup cards, popup banners, and page-wide announcement banners.
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable onPress={() => void load()} className="h-11 w-11 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700">
              <Feather name="refresh-cw" color="#64748b" size={17} />
            </Pressable>
            <Pressable onPress={openCreate} className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3">
              <Feather name="plus" color="#ffffff" size={16} />
              <Text className="font-sans text-sm font-bold text-white">New</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-5 flex-row flex-wrap gap-3">
          {[
            ['Total', counts.total],
            ['Active', counts.active],
            ['Page banners', counts.banners],
          ].map(([label, value]) => (
            <View key={String(label)} className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-slate-950">
              <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">{label}</Text>
              <Text className="font-sans text-lg font-black text-gray-950 dark:text-slate-100">{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {message ? (
        <Text className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-sans text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          {message}
        </Text>
      ) : null}

      {loading ? (
        <View className="items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 dark:border-slate-800 dark:bg-slate-900">
          <ActivityIndicator color="#16a34a" size="large" />
          <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">Loading announcements...</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-900">
          <Feather name="volume-2" color="#94a3b8" size={36} />
          <Text className="mt-3 font-sans text-base font-bold text-gray-900 dark:text-slate-100">No announcements yet.</Text>
          <Text className="mt-1 text-center font-sans text-sm text-gray-500 dark:text-slate-400">Create your first campaign to show it on the marketplace.</Text>
        </View>
      ) : (
        <View className="gap-3">
          {items.map((item) => (
            <View key={String(item.id)} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <View className="gap-4 sm:flex-row sm:items-start">
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 96, height: 72, borderRadius: 12 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-18 w-24 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20">
                    <Feather name="volume-2" color="#16a34a" size={24} />
                  </View>
                )}
                <View className="min-w-0 flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="min-w-0 flex-1 font-sans text-base font-black text-gray-950 dark:text-slate-100" numberOfLines={1}>
                      {item.title || 'Untitled announcement'}
                    </Text>
                    <StatusPill item={item} />
                  </View>
                  <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400" numberOfLines={2}>
                    {item.content || 'No content'}
                  </Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {[titleCase(item.type), titleCase(item.displayStyle), titleCase(item.targetAudience)].map((label) => (
                      <View key={label} className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-slate-800">
                        <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-300">{label}</Text>
                      </View>
                    ))}
                    {item.badgeLabel ? (
                      <View className="rounded-full bg-green-100 px-2.5 py-1 dark:bg-green-900/30">
                        <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">{item.badgeLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row gap-2 sm:flex-col">
                  <Pressable
                    onPress={() => void toggle(item)}
                    disabled={busyId === item.id}
                    className="h-10 w-10 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700">
                    <Feather name={item.isActive ? 'pause' : 'play'} color="#64748b" size={16} />
                  </Pressable>
                  <Pressable onPress={() => openEdit(item)} className="h-10 w-10 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700">
                    <Feather name="edit-2" color="#64748b" size={16} />
                  </Pressable>
                  <Pressable onPress={() => setDeleteTarget(item)} className="h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <Feather name="trash-2" color="#ef4444" size={16} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <AnnouncementForm
        visible={formOpen}
        editing={editing}
        draft={draft}
        saving={saving}
        message={formMessage}
        onClose={() => setFormOpen(false)}
        onSave={() => void save()}
        onDraft={setDraft}
      />

      <Modal visible={Boolean(deleteTarget)} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-slate-900">
            <Text className="font-sans text-lg font-black text-gray-950 dark:text-slate-100">Delete announcement?</Text>
            <Text className="mt-2 font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
              This action cannot be undone.
            </Text>
            <View className="mt-5 gap-3 sm:flex-row">
              <Pressable onPress={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700">
                <Text className="text-center font-sans text-sm font-bold text-gray-600 dark:text-slate-300">Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void confirmDelete()} className="flex-1 rounded-xl bg-red-600 px-4 py-3">
                <Text className="text-center font-sans text-sm font-bold text-white">
                  {busyId === deleteTarget?.id ? 'Deleting...' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
