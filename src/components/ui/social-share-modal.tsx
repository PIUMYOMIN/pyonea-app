import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, Share, Text, View } from 'react-native';

import type { SocialSharePayload } from '@/utils/social-share';

type PlatformLabels = {
  facebook: string;
  whatsapp: string;
  viber: string;
  telegram: string;
  x: string;
};

export type SocialShareModalLabels = {
  heading: string;
  shareOn: string;
  copyLink: string;
  copied: string;
  close: string;
  shareFacebook: string;
  shareWhatsapp: string;
  shareViber: string;
  shareTelegram: string;
  shareX: string;
};

type SocialShareModalProps = {
  open: boolean;
  payload: SocialSharePayload;
  onClose: () => void;
  labels: SocialShareModalLabels;
};

const shareLinks = (payload: SocialSharePayload, platformLabels: PlatformLabels) => [
  { label: 'Facebook', icon: 'f', url: payload.facebook, hint: platformLabels.facebook },
  { label: 'WhatsApp', icon: 'W', url: payload.whatsapp, hint: platformLabels.whatsapp },
  { label: 'Viber', icon: 'V', url: payload.viber, hint: platformLabels.viber },
  { label: 'Telegram', icon: 'T', url: payload.telegram, hint: platformLabels.telegram },
  { label: 'X', icon: 'X', url: payload.twitter, hint: platformLabels.x },
];

export function SocialShareModal({ open, payload, onClose, labels }: SocialShareModalProps) {
  const [copied, setCopied] = useState(false);
  const links = shareLinks(payload, {
    facebook: labels.shareFacebook,
    whatsapp: labels.shareWhatsapp,
    viber: labels.shareViber,
    telegram: labels.shareTelegram,
    x: labels.shareX,
  });

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const copyLink = async () => {
    try {
      await globalThis.navigator?.clipboard?.writeText(payload.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      void Share.share({
        title: payload.title,
        message: payload.url,
        url: payload.url,
      });
    }
  };

  const shareNative = () => {
    void Share.share({
      title: payload.title,
      message: `${payload.text}\n${payload.url}`,
      url: payload.url,
    });
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center p-4">
        <Pressable
          onPress={onClose}
          accessibilityLabel={labels.close}
          className="absolute inset-0 bg-black/50"
        />
        <View className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
            <View className="min-w-0 flex-1 flex-row items-center gap-2 pr-3">
              <Feather name="share-2" color="#16a34a" size={18} />
              <Text className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
                {labels.heading}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel={labels.close}
              className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
              <Feather name="x" color="#64748b" size={18} />
            </Pressable>
          </View>

          <View className="flex-row items-start gap-3 px-4 py-4">
            {payload.imageUrl ? (
              <View className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">
                <Image source={{ uri: payload.imageUrl }} className="h-full w-full" contentFit="cover" />
              </View>
            ) : null}
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-sm font-semibold leading-snug text-gray-900 dark:text-slate-100" numberOfLines={2}>
                {payload.title}
              </Text>
              <Text className="mt-1 font-sans text-xs leading-snug text-gray-500 dark:text-slate-400" numberOfLines={2}>
                {payload.text}
              </Text>
              <Text className="mt-1 font-sans text-[11px] text-gray-400 dark:text-slate-500" numberOfLines={1}>
                {payload.url}
              </Text>
            </View>
          </View>

          <View className="border-t border-gray-100 px-4 py-4 dark:border-slate-700">
            <Text className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              {labels.shareOn}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {links.map((link) => (
                <Pressable
                  key={link.label}
                  onPress={() => {
                    onClose();
                    void Linking.openURL(link.url);
                  }}
                  accessibilityLabel={`${labels.shareOn} ${link.label}`}
                  className="min-h-10 flex-row items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-700">
                    <Text className="font-sans text-[11px] font-bold text-gray-800 dark:text-slate-100">{link.icon}</Text>
                  </View>
                  <View className="min-w-0">
                    <Text className="font-sans text-sm font-semibold text-gray-800 dark:text-slate-100">{link.label}</Text>
                    <Text className="font-sans text-[11px] text-gray-500 dark:text-slate-400" numberOfLines={1}>
                      {link.hint}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => void copyLink()}
                className="min-h-10 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800">
                <Feather name={copied ? 'check' : 'link'} color={copied ? '#16a34a' : '#475569'} size={16} />
                <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {copied ? labels.copied : labels.copyLink}
                </Text>
              </Pressable>
              <Pressable
                onPress={shareNative}
                className="min-h-10 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 dark:border-green-900 dark:bg-green-950/40">
                <Feather name="share" color="#15803d" size={16} />
                <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                  {labels.shareOn}
                </Text>
              </Pressable>
            </View>

            {payload.description ? (
              <Text className="mt-3 font-sans text-xs leading-snug text-gray-400 dark:text-slate-500">
                {payload.description}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function buildShareModalLabels(options: {
  heading: string;
  shareOn: string;
  copyLink: string;
  copied: string;
  close: string;
  shareFacebook: string;
  shareWhatsapp: string;
  shareViber: string;
  shareTelegram: string;
  shareX: string;
}): SocialShareModalLabels {
  return options;
}
