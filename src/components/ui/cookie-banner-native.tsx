import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCookies, type CookiePreferences } from '@/context/cookies';
import { useAppTranslation } from '@/i18n';

type PreferenceKey = keyof CookiePreferences;

const categories: {
  key: PreferenceKey;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  titleMM: string;
  desc: string;
  descMM: string;
  locked?: boolean;
}[] = [
  {
    key: 'necessary',
    icon: 'lock',
    title: 'Necessary',
    titleMM: 'Necessary',
    desc: 'Required for the app to function. Cannot be disabled.',
    descMM: 'Required for the app to function. Cannot be disabled.',
    locked: true,
  },
  {
    key: 'functional',
    icon: 'settings',
    title: 'Functional',
    titleMM: 'Functional',
    desc: 'Remember preferences like language and cart items.',
    descMM: 'Remember preferences like language and cart items.',
  },
  {
    key: 'analytics',
    icon: 'bar-chart-2',
    title: 'Analytics',
    titleMM: 'Analytics',
    desc: 'Help us understand usage so we can improve Pyonea.',
    descMM: 'Help us understand usage so we can improve Pyonea.',
  },
  {
    key: 'marketing',
    icon: 'flag',
    title: 'Marketing',
    titleMM: 'Marketing',
    desc: 'Used for relevant promotions and announcements.',
    descMM: 'Used for relevant promotions and announcements.',
  },
];

function Toggle({
  checked,
  disabled,
  onPress,
}: {
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      className={`h-7 w-12 justify-center rounded-full px-1 ${
        checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
      } ${disabled ? 'opacity-60' : ''}`}>
      <View
        className={`h-5 w-5 rounded-full bg-white shadow-sm ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </Pressable>
  );
}

function PreferencesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { prefs, saveCustom } = useCookies();
  const { language } = useAppTranslation();
  const [local, setLocal] = useState<CookiePreferences>(prefs);
  const isMM = language === 'my';

  const toggle = (key: PreferenceKey) => {
    setLocal((current) => ({ ...current, [key]: !current[key], necessary: true }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
        <View className="max-h-[85%] w-full rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:max-w-lg sm:rounded-2xl">
          <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
            <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">
              {isMM ? 'Cookie Preferences' : 'Cookie Preferences'}
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800">
              <Feather name="x" color="#64748b" size={18} />
            </Pressable>
          </View>

          <ScrollView className="max-h-[60vh]">
            {categories.map((category) => (
              <View
                key={category.key}
                className="flex-row items-start gap-4 border-b border-gray-50 px-5 py-4 dark:border-slate-800">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/30">
                  <Feather name={category.icon} color="#15803d" size={18} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100">
                      {isMM ? category.titleMM : category.title}
                    </Text>
                    {category.locked ? (
                      <View className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 dark:border-green-800 dark:bg-green-900/30">
                        <Text className="font-sans text-[10px] font-bold uppercase text-green-700 dark:text-green-300">
                          Required
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                    {isMM ? category.descMM : category.desc}
                  </Text>
                </View>
                <Toggle
                  checked={category.locked ? true : local[category.key]}
                  disabled={category.locked}
                  onPress={() => toggle(category.key)}
                />
              </View>
            ))}
          </ScrollView>

          <View className="gap-3 bg-gray-50 px-5 py-4 dark:bg-slate-950 sm:flex-row">
            <Pressable
              onPress={onClose}
              className="rounded-xl border border-gray-300 px-4 py-3 dark:border-slate-700 sm:flex-1">
              <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                saveCustom(local);
                onClose();
              }}
              className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 sm:flex-1">
              <Feather name="check" color="#ffffff" size={16} />
              <Text className="text-center font-sans text-sm font-semibold text-white">
                Save Preferences
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function CookieBannerNative() {
  const { showBanner, acceptAll, declineAll } = useCookies();
  const { language } = useAppTranslation();
  const [showPrefs, setShowPrefs] = useState(false);
  const isMM = language === 'my';

  if (!showBanner) {
    return (
      <PreferencesModal visible={showPrefs} onClose={() => setShowPrefs(false)} />
    );
  }

  return (
    <>
      <SafeAreaView pointerEvents="box-none" className="absolute inset-x-0 bottom-0 z-[100] p-3 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-md">
        <View className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <View className="h-1 bg-green-500" />
          <View className="p-4 sm:p-5">
            <View className="mb-3 flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/30">
                <Feather name="shield" color="#16a34a" size={21} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100">
                  {isMM ? 'We use cookies' : 'We use cookies'}
                </Text>
                <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                  {isMM
                    ? 'We use cookies to enhance your experience and analyse site usage.'
                    : 'We use cookies to enhance your experience and analyse site usage.'}{' '}
                  <Link href="/privacy-policy" asChild>
                    <Text className="font-sans text-xs font-semibold text-green-700 dark:text-green-300">
                      {isMM ? 'Learn more' : 'Learn more'}
                    </Text>
                  </Link>
                </Text>
              </View>
            </View>

            <View className="gap-2 sm:flex-row">
              <Pressable onPress={acceptAll} className="rounded-xl bg-green-600 px-4 py-2.5 sm:flex-1">
                <Text className="text-center font-sans text-xs font-bold text-white">
                  {isMM ? 'Accept All' : 'Accept All'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowPrefs(true)}
                className="flex-row items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 dark:border-slate-700 sm:flex-1">
                <Feather name="sliders" color="#64748b" size={14} />
                <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-200">
                  {isMM ? 'Customize' : 'Customize'}
                </Text>
              </Pressable>
              <Pressable onPress={declineAll} className="rounded-xl px-4 py-2.5 sm:flex-1">
                <Text className="text-center font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">
                  {isMM ? 'Decline' : 'Decline'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
      <PreferencesModal visible={showPrefs} onClose={() => setShowPrefs(false)} />
    </>
  );
}
