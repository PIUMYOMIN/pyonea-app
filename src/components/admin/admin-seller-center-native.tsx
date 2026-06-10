import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  SELLER_CENTER_SECTIONS,
  type SellerCenterSection,
} from '@/components/admin/admin-seller-shared';
import { SellersManagementNative } from '@/components/admin/sellers-management-native';
import { SellerVerificationManagementNative } from '@/components/admin/seller-verification-management-native';
import { VerifiedSellerListNative } from '@/components/admin/verified-seller-list-native';
import { useAppTranslation } from '@/i18n';

export function AdminSellerCenterNative() {
  const { t } = useAppTranslation();
  const [section, setSection] = useState<SellerCenterSection>('directory');
  const meta = useMemo(
    () => SELLER_CENTER_SECTIONS.find((item) => item.id === section) ?? SELLER_CENTER_SECTIONS[0],
    [section],
  );

  return (
    <View className="gap-5">
      <View>
        <Text className="font-sans text-xl font-bold text-gray-900 dark:text-slate-100">
          {t('admin.sellerCenter.title', 'Sellers')}
        </Text>
        <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-500">
          {t(
            'admin.sellerCenter.subtitle',
            'Directory, document verification, and verified-seller reporting in one place.',
          )}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {SELLER_CENTER_SECTIONS.map((item) => {
          const active = section === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSection(item.id)}
              className={`flex-row items-center gap-2 rounded-xl border px-4 py-2.5 ${
                active
                  ? 'border-green-200 bg-white shadow-sm dark:border-green-800 dark:bg-slate-700'
                  : 'border-transparent bg-gray-100/80 dark:bg-slate-800/80'
              }`}>
              <Feather name={item.icon} size={16} color={active ? '#15803d' : '#64748b'} />
              <Text
                className={`font-sans text-sm font-semibold ${
                  active ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-slate-400'
                }`}>
                {t(`admin.sellerCenter.sections.${item.id}.label`, item.label)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="-mt-2 font-sans text-xs text-gray-500 dark:text-slate-500">
        {t(`admin.sellerCenter.sections.${meta.id}.description`, meta.description)}
      </Text>

      <View className="min-h-[320px]">
        {section === 'directory' ? <SellersManagementNative /> : null}
        {section === 'verification' ? <SellerVerificationManagementNative /> : null}
        {section === 'verified' ? <VerifiedSellerListNative /> : null}
      </View>
    </View>
  );
}
