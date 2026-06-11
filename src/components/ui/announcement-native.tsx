import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';

import { SITE_CONTAINER_CLASS } from '@/constants/layout';
import { useNativeAuth } from '@/context/native-auth';
import { getThumbUrl } from '@/utils/image-thumbs';
import { fetchAnnouncements, type Announcement } from '@/utils/native-api';

const ANNOUNCEMENT_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedAnnouncements: Announcement[] | null = null;
let announcementCacheAt = 0;

/** Invalidate the public announcement cache (e.g. after an admin edit). */
export function clearAnnouncementCache() {
  cachedAnnouncements = null;
  announcementCacheAt = 0;
}

// AnnouncementNative remounts with every page navigation (it lives inside each
// page's AppLayout), so per-session state must live at module level. Otherwise
// popups reappear and dismissed banners come back on every navigation.
const sessionShownPopupIds = new Set<string | number>();
const sessionDismissedBannerIds = new Set<string | number>();

async function loadAnnouncements(signal?: AbortSignal) {
  if (cachedAnnouncements && Date.now() - announcementCacheAt < ANNOUNCEMENT_CACHE_TTL_MS) {
    return cachedAnnouncements;
  }

  const nextItems = await fetchAnnouncements(signal);
  cachedAnnouncements = nextItems;
  announcementCacheAt = Date.now();
  return nextItems;
}

const badgeColors: Record<string, string> = {
  green: 'bg-green-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

const aspectRatio = (value: string) => {
  if (value === '4:3') return 4 / 3;
  if (value === '3:1') return 3;
  if (value === '1:1') return 1;
  return 16 / 9;
};

const storage = {
  get(key: string) {
    try {
      return globalThis.localStorage?.getItem(key) || '';
    } catch {
      return '';
    }
  },
  set(key: string, value: string) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Announcements are non-critical.
    }
  },
};

const seenKey = (announcement: Announcement) =>
  `ann_seen_${announcement.id}_${new Date().toDateString()}`;

// Mirrors the backend scopeForAudience: guests see 'all' + 'guests',
// authenticated users see 'all' + their own type.
const isForAudience = (announcement: Announcement, userType?: string) => {
  if (announcement.targetAudience === 'all') return true;
  if (announcement.targetAudience === 'guests') return !userType;
  if (announcement.targetAudience === 'buyers') return userType === 'buyer';
  if (announcement.targetAudience === 'sellers') return userType === 'seller';
  return true;
};

function useOpenAnnouncementLink() {
  const router = useRouter();

  return (url?: string) => {
    if (!url) return;
    if (url.startsWith('http')) {
      void Linking.openURL(url);
      return;
    }
    router.push(url as Href);
  };
}

function AnnouncementBadge({
  announcement,
  inline = false,
}: {
  announcement: Announcement;
  inline?: boolean;
}) {
  if (!announcement.badgeLabel) return null;

  return (
    <View
      className={`${inline ? 'mb-3 self-start' : 'absolute left-3 top-3'} rounded-full px-2.5 py-1 ${
        badgeColors[announcement.badgeColor] || badgeColors.green
      }`}>
      <Text
        className={`font-sans text-xs font-black ${
          announcement.badgeColor === 'yellow' ? 'text-gray-900' : 'text-white'
        }`}>
        {announcement.badgeLabel}
      </Text>
    </View>
  );
}

function PageBanner({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: () => void;
}) {
  const openLink = useOpenAnnouncementLink();

  if (!announcement.imageUrl) return null;

  return (
    <View className="border-b border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-950">
      <View className={`${SITE_CONTAINER_CLASS} py-3`}>
        <Pressable
          onPress={() => openLink(announcement.bannerLinkUrl)}
          className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800"
          style={{ aspectRatio: aspectRatio(announcement.bannerAspectRatio) }}>
          <Image source={{ uri: getThumbUrl(announcement.imageUrl, 800) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          <AnnouncementBadge announcement={announcement} />
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onDismiss();
            }}
            accessibilityLabel="Dismiss announcement"
            className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-black/50">
            <Feather name="x" color="#ffffff" size={16} />
          </Pressable>
        </Pressable>
      </View>
    </View>
  );
}

function PopupContent({
  announcement,
  onClose,
}: {
  announcement: Announcement;
  onClose: () => void;
}) {
  const openLink = useOpenAnnouncementLink();
  const isBanner = announcement.displayStyle === 'popup_banner';
  const link = isBanner ? announcement.bannerLinkUrl : announcement.ctaUrl;

  if (isBanner && announcement.imageUrl) {
    return (
      <Pressable
        onPress={() => {
          onClose();
          openLink(link);
        }}
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900"
        style={{ aspectRatio: aspectRatio(announcement.bannerAspectRatio) }}>
        <Image source={{ uri: getThumbUrl(announcement.imageUrl, 800) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <AnnouncementBadge announcement={announcement} />
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/50">
          <Feather name="x" color="#ffffff" size={18} />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <View className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
      <Pressable
        onPress={onClose}
        className="absolute right-3 top-3 z-20 h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-slate-800/90">
        <Feather name="x" color="#64748b" size={18} />
      </Pressable>

      {announcement.imageUrl ? (
        <View className="relative h-56 bg-gray-100 dark:bg-slate-800">
          <Image source={{ uri: getThumbUrl(announcement.imageUrl, 480) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          <AnnouncementBadge announcement={announcement} />
        </View>
      ) : null}

      <View className="p-5 sm:p-6">
        {!announcement.imageUrl ? <AnnouncementBadge announcement={announcement} inline /> : null}
        <Text className="font-sans text-xl font-black text-gray-950 dark:text-slate-100">
          {announcement.title}
        </Text>
        {announcement.content ? (
          <Text className="mt-3 font-sans text-sm leading-6 text-gray-600 dark:text-slate-300">
            {announcement.content}
          </Text>
        ) : null}
        {announcement.ctaLabel && announcement.ctaUrl ? (
          <Pressable
            onPress={() => {
              onClose();
              openLink(announcement.ctaUrl);
            }}
            className={`mt-5 rounded-xl px-5 py-3 ${
              announcement.ctaStyle === 'outline'
                ? 'border border-green-600 bg-transparent'
                : 'bg-green-600'
            }`}>
            <Text
              className={`text-center font-sans text-sm font-bold ${
                announcement.ctaStyle === 'outline' ? 'text-green-700 dark:text-green-300' : 'text-white'
              }`}>
              {announcement.ctaLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function AnnouncementNative() {
  const { user } = useNativeAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<(string | number)[]>(() => [...sessionDismissedBannerIds]);
  const [popup, setPopup] = useState<Announcement | null>(null);
  const userType = user?.type || user?.roles?.[0];

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const nextItems = await loadAnnouncements(controller.signal);
        if (!controller.signal.aborted) setItems(nextItems);
      } catch {
        // Announcements should never block page rendering.
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  const eligible = useMemo(
    () =>
      items
        .filter((item) => item.isActive)
        .filter((item) => isForAudience(item, userType))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [items, userType]
  );

  const pageBanner = eligible.find(
    (item) =>
      item.displayStyle === 'page_banner' &&
      !dismissed.includes(item.id) &&
      !(item.showOnce && storage.get(seenKey(item)))
  );

  useEffect(() => {
    const nextPopup = eligible.find((item) => {
      if (item.displayStyle === 'page_banner') return false;
      if (sessionShownPopupIds.has(item.id)) return false;
      if (item.showOnce && storage.get(seenKey(item))) return false;
      return true;
    });

    if (!nextPopup) return;
    const timeout = setTimeout(() => {
      sessionShownPopupIds.add(nextPopup.id);
      setPopup(nextPopup);
    }, Math.max(nextPopup.delaySeconds, 0) * 1000);
    return () => clearTimeout(timeout);
  }, [eligible]);

  const dismissBanner = () => {
    if (!pageBanner) return;
    sessionDismissedBannerIds.add(pageBanner.id);
    setDismissed((current) => [...current, pageBanner.id]);
    if (pageBanner.showOnce) storage.set(seenKey(pageBanner), '1');
  };

  const closePopup = () => {
    if (popup?.showOnce) storage.set(seenKey(popup), '1');
    setPopup(null);
  };

  return (
    <>
      {pageBanner ? <PageBanner announcement={pageBanner} onDismiss={dismissBanner} /> : null}
      <Modal visible={Boolean(popup)} transparent animationType="fade" onRequestClose={closePopup}>
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          {popup ? <PopupContent announcement={popup} onClose={closePopup} /> : null}
        </View>
      </Modal>
    </>
  );
}
