import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@/context/theme';
import {
  createAdminEmailCampaign,
  fetchAdminEmailCampaigns,
  fetchAdminNewsletterSubscribers,
  fetchAdminNewsletterSubscriberStats,
  previewAdminEmailCampaign,
  sendAdminEmailCampaign,
  updateAdminEmailCampaign,
  type AdminEmailCampaign,
  type AdminEmailCampaignFormPayload,
  type AdminNewsletterSubscriber,
} from '@/utils/native-api';

const AUDIENCE_LABELS: Record<string, string> = {
  newsletter_subscribers: '📧 Newsletter subscribers',
  all_buyers: '🛍️ All buyers',
  all_sellers: '🏪 All sellers',
  buyers_by_city: '📍 Buyers by city',
  sellers_by_tier: '⭐ Sellers by tier',
  custom_ids: '🎯 Custom list',
};

const STATUS_TONE: Record<string, { wrap: string; text: string }> = {
  draft: { wrap: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-600 dark:text-slate-300' },
  scheduled: { wrap: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  sending: { wrap: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  sent: { wrap: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  cancelled: { wrap: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
};

const AUDIENCE_OPTIONS = Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }));

const TIER_OPTIONS = [
  { value: 'bronze', label: '🥉 Bronze tier' },
  { value: 'silver', label: '🥈 Silver tier' },
  { value: 'gold', label: '🥇 Gold tier' },
];

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="gap-1">
      <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-400">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700">
        <Text className="min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100">{selected?.label || value}</Text>
        <Feather name="chevron-down" size={16} color={isDark ? '#cbd5e1' : '#6b7280'} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[520px] md:rounded-2xl">
            <Text className="mb-4 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{label}</Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-2 rounded-xl border px-4 py-3 ${
                    value === option.value
                      ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}>
                  <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CampaignForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: AdminEmailCampaign | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [subject, setSubject] = useState(initial?.subject || '');
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml || '');
  const [audience, setAudience] = useState(initial?.audience || 'newsletter_subscribers');
  const [city, setCity] = useState(String(initial?.audienceFilter?.city || ''));
  const [tier, setTier] = useState(String(initial?.audienceFilter?.tier || 'gold'));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');

  const audienceFilter = useMemo(() => {
    if (audience === 'buyers_by_city') return { city };
    if (audience === 'sellers_by_tier') return { tier };
    return {};
  }, [audience, city, tier]);

  const loadPreview = useCallback(async () => {
    if (!initial?.id || !subject.trim()) return;
    setPreviewLoading(true);
    try {
      const count = await previewAdminEmailCampaign(initial.id);
      setRecipientCount(count);
    } catch {
      setRecipientCount(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [initial?.id, subject]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview, audience, city, tier]);

  const save = async () => {
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
      setError('Name, subject and content are required.');
      return;
    }

    setSaving(true);
    setError('');
    const payload: AdminEmailCampaignFormPayload = {
      name: name.trim(),
      subject: subject.trim(),
      body_html: bodyHtml,
      audience,
      audience_filter: audienceFilter,
    };

    try {
      if (initial?.id) await updateAdminEmailCampaign(initial.id, payload);
      else await createAdminEmailCampaign(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-5 rounded-2xl border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100">
          {initial ? 'Edit Campaign' : 'New Campaign'}
        </Text>
        <Pressable onPress={onCancel}>
          <Feather name="x" size={20} color="#94a3b8" />
        </Pressable>
      </View>

      {error ? (
        <View className="flex-row items-center gap-2">
          <Feather name="alert-circle" size={16} color="#dc2626" />
          <Text className="font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
        </View>
      ) : null}

      <View className="gap-4 md:flex-row">
        <View className="flex-1 gap-1">
          <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-400">Campaign Name (internal)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. March Promo"
            placeholderTextColor="#94a3b8"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-400">Subject Line</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="What buyers will see in their inbox"
            placeholderTextColor="#94a3b8"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </View>
      </View>

      <SelectField label="Audience" value={audience} options={AUDIENCE_OPTIONS} onChange={setAudience} />

      {audience === 'buyers_by_city' ? (
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="City name (e.g. Yangon)"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      ) : null}

      {audience === 'sellers_by_tier' ? (
        <SelectField label="Seller Tier" value={tier} options={TIER_OPTIONS} onChange={setTier} />
      ) : null}

      {recipientCount !== null ? (
        <View className="flex-row items-center gap-1.5">
          <Feather name="users" size={14} color="#64748b" />
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
            {previewLoading
              ? 'Counting recipients…'
              : `Estimated ${recipientCount.toLocaleString()} recipient${recipientCount !== 1 ? 's' : ''}`}
          </Text>
        </View>
      ) : null}

      <View>
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="font-sans text-xs font-medium text-gray-600 dark:text-slate-400">Email Content (HTML supported)</Text>
          <Pressable
            onPress={() => setPreview((value) => !value)}
            className={`flex-row items-center gap-1 rounded-lg px-2 py-1 ${
              preview ? 'bg-green-100 dark:bg-green-900/30' : ''
            }`}>
            <Feather name="eye" size={14} color={preview ? '#15803d' : '#64748b'} />
            <Text className={`font-sans text-xs font-medium ${preview ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-slate-400'}`}>
              {preview ? 'Edit' : 'Preview'}
            </Text>
          </Pressable>
        </View>

        {preview ? (
          <View className="min-h-[200px] rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-700">
            <Text className="font-sans text-sm leading-relaxed text-gray-700 dark:text-slate-300">
              {stripHtml(bodyHtml) || 'No content yet.'}
            </Text>
          </View>
        ) : (
          <TextInput
            value={bodyHtml}
            onChangeText={setBodyHtml}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            placeholder={'<h2>Subject headline</h2><p>Your message here...</p>'}
            placeholderTextColor="#94a3b8"
            className="min-h-[220px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        )}
        <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">
          Tip: Use simple HTML. An unsubscribe link is added automatically for newsletter subscribers.
        </Text>
      </View>

      <View className="flex-row gap-3 pt-2">
        <Pressable disabled={saving} onPress={() => void save()} className={`rounded-xl px-5 py-2.5 ${saving ? 'bg-green-600/50' : 'bg-green-600'}`}>
          <Text className="font-sans text-sm font-medium text-white">
            {saving ? 'Saving…' : initial ? 'Update Campaign' : 'Create Campaign'}
          </Text>
        </Pressable>
        <Pressable disabled={saving} onPress={onCancel} className="rounded-xl border border-gray-200 px-5 py-2.5 dark:border-slate-600">
          <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.draft;
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${tone.wrap}`}>
      <Text className={`font-sans text-xs font-medium capitalize ${tone.text}`}>{status}</Text>
    </View>
  );
}

export function EmailCampaignsNative() {
  const [campaigns, setCampaigns] = useState<AdminEmailCampaign[]>([]);
  const [subscriberStats, setSubscriberStats] = useState({ total: 0, unconfirmed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [view, setView] = useState<'campaigns' | 'subscribers'>('campaigns');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminEmailCampaign | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<AdminNewsletterSubscriber[]>([]);
  const [subMeta, setSubMeta] = useState({ total: 0, unconfirmed: 0 });
  const [subSearch, setSubSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [campaignRows, stats] = await Promise.all([
        fetchAdminEmailCampaigns(),
        fetchAdminNewsletterSubscriberStats(),
      ]);
      setCampaigns(campaignRows);
      setSubscriberStats(stats);
    } catch {
      setError('Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubscribers = useCallback(async (search = subSearch) => {
    try {
      const result = await fetchAdminNewsletterSubscribers(search, 20);
      setSubscribers(result.subscribers);
      setSubMeta(result.meta);
    } catch {
      setSubscribers([]);
    }
  }, [subSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (view === 'subscribers') void loadSubscribers();
  }, [view, loadSubscribers]);

  const sendCampaign = (campaign: AdminEmailCampaign) => {
    const confirmSend = () => {
      setSendingId(campaign.id);
      void (async () => {
        try {
          const result = await sendAdminEmailCampaign(campaign.id);
          setMessage(result.message || 'Campaign sent!');
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Send failed.');
        } finally {
          setSendingId(null);
        }
      })();
    };

    Alert.alert('Send Campaign', 'Send this campaign now? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', style: 'destructive', onPress: confirmSend },
    ]);
  };

  if (loading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <View className="flex-row items-center gap-2">
            <Feather name="mail" size={20} color="#16a34a" />
            <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">Email Campaigns</Text>
          </View>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
            <Text className="font-semibold text-green-700 dark:text-green-400">
              {subscriberStats.total.toLocaleString()}
            </Text>{' '}
            active subscribers
            {subscriberStats.unconfirmed > 0 ? (
              <Text className="text-amber-600 dark:text-amber-400">
                {' '}
                ({subscriberStats.unconfirmed} pending confirmation)
              </Text>
            ) : null}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => setView((current) => (current === 'campaigns' ? 'subscribers' : 'campaigns'))}
            className="flex-row items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 dark:border-slate-600">
            <Feather name="users" size={16} color="#64748b" />
            <Text className="font-sans text-sm text-gray-600 dark:text-slate-300">
              {view === 'campaigns' ? 'View Subscribers' : 'View Campaigns'}
            </Text>
          </Pressable>
          {view === 'campaigns' && !showForm ? (
            <Pressable
              onPress={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="flex-row items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2">
              <Feather name="plus" size={16} color="#fff" />
              <Text className="font-sans text-sm font-medium text-white">New Campaign</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? (
        <Pressable onPress={() => setError('')} className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <Text className="font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
        </Pressable>
      ) : null}
      {message ? (
        <Pressable onPress={() => setMessage('')} className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-sm text-green-800 dark:text-green-300">{message}</Text>
        </Pressable>
      ) : null}

      {showForm ? (
        <CampaignForm
          initial={editing}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            setMessage('Campaign saved.');
            void load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      ) : null}

      {view === 'campaigns' && !showForm ? (
        <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
          {campaigns.length === 0 ? (
            <View className="items-center py-14">
              <Feather name="mail" color="#94a3b8" size={40} />
              <Text className="mt-3 font-sans text-sm text-gray-400 dark:text-slate-500">
                No campaigns yet. Create your first email campaign.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
              <View className="w-full min-w-[920px]">
                <View className="flex-row bg-gray-50 px-5 py-3 dark:bg-slate-900/50">
                  {[
                    { key: 'campaign', label: 'Campaign', width: 'w-[220px]' },
                    { key: 'audience', label: 'Audience', width: 'w-[180px]' },
                    { key: 'status', label: 'Status', width: 'w-[110px]' },
                    { key: 'recipients', label: 'Recipients', width: 'w-[130px]' },
                    { key: 'sent', label: 'Sent', width: 'w-[130px]' },
                    { key: 'actions', label: 'Actions', width: 'w-[150px]' },
                  ].map((column) => (
                    <View key={column.key} className={`${column.width} px-2`}>
                      <Text className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        {column.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {campaigns.map((campaign) => (
                  <View key={campaign.id} className="flex-row border-t border-gray-100 px-5 py-3 dark:border-slate-700">
                    <View className="w-[220px] px-2">
                      <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={1}>
                        {campaign.name}
                      </Text>
                      <Text className="font-sans text-xs text-gray-400 dark:text-slate-500" numberOfLines={1}>
                        {campaign.subject}
                      </Text>
                    </View>
                    <View className="w-[180px] justify-center px-2">
                      <Text className="font-sans text-xs text-gray-600 dark:text-slate-400">
                        {AUDIENCE_LABELS[campaign.audience] || campaign.audience}
                      </Text>
                    </View>
                    <View className="w-[110px] justify-center px-2">
                      <StatusBadge status={campaign.status} />
                    </View>
                    <View className="w-[130px] justify-center px-2">
                      <Text className="font-sans text-xs text-gray-600 dark:text-slate-400">
                        {campaign.recipientsCount > 0 ? campaign.recipientsCount.toLocaleString() : '—'}
                        {campaign.deliveredCount > 0 ? (
                          <Text className="text-green-600 dark:text-green-400">
                            {' '}
                            ({campaign.deliveredCount} delivered)
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                    <View className="w-[130px] justify-center px-2">
                      <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{formatDate(campaign.sentAt)}</Text>
                    </View>
                    <View className="w-[150px] flex-row items-center justify-end gap-1 px-2">
                      {['draft', 'scheduled'].includes(campaign.status) ? (
                        <>
                          <Pressable
                            onPress={() => {
                              setEditing(campaign);
                              setShowForm(true);
                            }}
                            className="rounded-lg p-1.5">
                            <Feather name="edit-2" size={16} color="#2563eb" />
                          </Pressable>
                          <Pressable
                            disabled={sendingId === campaign.id}
                            onPress={() => sendCampaign(campaign)}
                            className="flex-row items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5">
                            {sendingId === campaign.id ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Feather name="send" size={12} color="#fff" />
                            )}
                            <Text className="font-sans text-[11px] font-medium text-white">
                              {sendingId === campaign.id ? 'Sending…' : 'Send'}
                            </Text>
                          </Pressable>
                        </>
                      ) : null}
                      {campaign.status === 'sent' ? (
                        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                          👁 {campaign.openRate ?? 0}%
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}

      {view === 'subscribers' ? (
        <View className="gap-4">
          <TextInput
            value={subSearch}
            onChangeText={setSubSearch}
            placeholder="Search by email…"
            placeholderTextColor="#94a3b8"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 sm:max-w-xs"
          />
          <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
            {subscribers.length === 0 ? (
              <Text className="py-10 text-center font-sans text-sm text-gray-400 dark:text-slate-500">
                No subscribers found.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
                <View className="w-full min-w-[720px]">
                  <View className="flex-row bg-gray-50 px-5 py-3 dark:bg-slate-900/50">
                    {[
                      { key: 'email', label: 'Email', width: 'w-[220px]' },
                      { key: 'name', label: 'Name', width: 'w-[140px]' },
                      { key: 'source', label: 'Source', width: 'w-[120px]' },
                      { key: 'subscribed', label: 'Subscribed', width: 'w-[160px]' },
                    ].map((column) => (
                      <View key={column.key} className={`${column.width} px-2`}>
                        <Text className="font-sans text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                          {column.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {subscribers.map((subscriber) => (
                    <View key={subscriber.id} className="flex-row border-t border-gray-100 px-5 py-3 dark:border-slate-700">
                      <View className="w-[220px] justify-center px-2">
                        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">{subscriber.email}</Text>
                      </View>
                      <View className="w-[140px] justify-center px-2">
                        <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">{subscriber.name || '—'}</Text>
                      </View>
                      <View className="w-[120px] justify-center px-2">
                        <Text className="font-sans text-xs capitalize text-gray-400 dark:text-slate-500">{subscriber.source || '—'}</Text>
                      </View>
                      <View className="w-[160px] justify-center px-2">
                        <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">{formatDate(subscriber.confirmedAt)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
          <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
            {(subMeta.total || 0).toLocaleString()} active subscribers total
          </Text>
        </View>
      ) : null}
    </View>
  );
}
