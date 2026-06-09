import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useState } from 'react';
import { Linking, Pressable, Share, Text, View } from 'react-native';

import type { SocialSharePayload } from '@/utils/social-share';

type PlatformLabels = {
  facebook: string;
  whatsapp: string;
  viber: string;
  telegram: string;
  x: string;
};

type SocialSharePanelProps = {
  payload: SocialSharePayload;
  heading: string;
  shareOnLabel: string;
  copyLinkLabel: string;
  copiedLabel: string;
  platformLabels: PlatformLabels;
  className?: string;
};

const shareLinks = (payload: SocialSharePayload, platformLabels: PlatformLabels) => [
  { label: 'Facebook', icon: 'f', url: payload.facebook, hint: platformLabels.facebook },
  { label: 'WhatsApp', icon: 'W', url: payload.whatsapp, hint: platformLabels.whatsapp },
  { label: 'Viber', icon: 'V', url: payload.viber, hint: platformLabels.viber },
  { label: 'Telegram', icon: 'T', url: payload.telegram, hint: platformLabels.telegram },
  { label: 'X', icon: 'X', url: payload.twitter, hint: platformLabels.x },
];

export function SocialSharePanel({
  payload,
  heading,
  shareOnLabel,
  copyLinkLabel,
  copiedLabel,
  platformLabels,
  className = '',
}: SocialSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const links = shareLinks(payload, platformLabels);

  const shareNative = () => {
    void Share.share({
      title: payload.title,
      message: `${payload.text}\n${payload.url}`,
      url: payload.url,
    });
  };

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

  return (
    <View
      className={`rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/60 ${className}`}>
      <View className="flex-row items-start gap-3">
        {payload.imageUrl ? (
          <View className="h-16 w-16 overflow-hidden rounded-lg bg-white dark:bg-slate-800">
            <Image source={{ uri: payload.imageUrl }} className="h-full w-full" contentFit="cover" />
          </View>
        ) : null}
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Feather name="share-2" color="#475569" size={16} />
            <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
              {heading}
            </Text>
          </View>
          <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
            {payload.description}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {links.map((link) => (
          <Pressable
            key={link.label}
            onPress={() => void Linking.openURL(link.url)}
            accessibilityLabel={`${shareOnLabel} ${link.label}`}
            className="h-9 flex-row items-center gap-2 rounded-md border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
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
          onPress={() => void copyLink()}
          className="h-9 flex-row items-center gap-2 rounded-md border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
          <Feather name={copied ? 'check' : 'link'} color="#475569" size={16} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
            {copied ? copiedLabel : copyLinkLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={shareNative}
          className="h-9 flex-row items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 dark:border-green-900 dark:bg-green-950/40">
          <Feather name="share" color="#15803d" size={16} />
          <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
            {shareOnLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
