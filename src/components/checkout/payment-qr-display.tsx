import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { useAppTranslation } from '@/i18n';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

const mmqrLogo = require('@/assets/images/MMQR_Logo.png');

type PaymentQrDisplayProps = {
  qrImageUrl?: string;
  qrString?: string;
  size: number;
  loadingLabel: string;
};

const buildWebQrImageUrl = (qrString: string, size: number) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrString)}&ecc=M`;

const NativeQRCode =
  Platform.OS === 'web'
    ? null
    : (require('react-native-qrcode-svg').default as typeof import('react-native-qrcode-svg').default);

function QrImage({
  uri,
  size,
}: {
  uri: string;
  size: number;
}) {
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={0}
      priority="high"
      loading="eager"
    />
  );
}

export function PaymentQrDisplay({
  qrImageUrl,
  qrString,
  size,
  loadingLabel,
}: PaymentQrDisplayProps) {
  if (qrImageUrl) {
    return <QrImage uri={qrImageUrl} size={size} />;
  }

  if (qrString) {
    if (Platform.OS === 'web') {
      return <QrImage uri={buildWebQrImageUrl(qrString, size)} size={size} />;
    }

    if (!NativeQRCode) {
      return <QrImage uri={buildWebQrImageUrl(qrString, size)} size={size} />;
    }

    return (
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <NativeQRCode value={qrString} size={size - 8} />
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-700"
      style={{ width: size, height: size }}
    >
      <ActivityIndicator color="#16a34a" />
      <Text className="mt-3 px-4 text-center font-sans text-xs text-gray-500 dark:text-slate-400">
        {loadingLabel}
      </Text>
    </View>
  );
}

export function PaymentQrBadge({ paymentMethod }: { paymentMethod: string }) {
  const { t } = useAppTranslation();

  if (paymentMethod !== 'mmqr') return null;

  return (
    <View className="flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
      <Image
        source={mmqrLogo}
        style={{ height: 32, width: 96 }}
        contentFit="contain"
        transition={0}
        priority="high"
        loading="eager"
      />
      <Text className="font-sans text-xs font-semibold tracking-wide text-gray-600 dark:text-slate-300">
        {t('checkout.mmqr_official_badge', { defaultValue: 'Official MMQR payment' })}
      </Text>
    </View>
  );
}

export function PaymentMmqrPoweredBy({ paymentMethod }: { paymentMethod: string }) {
  const { t } = useAppTranslation();

  if (paymentMethod !== 'mmqr') return null;

  return (
    <Text className="text-center font-sans text-[11px] font-extrabold tracking-[0.16em] text-gray-700 dark:text-slate-200">
      {t('checkout.mmqr_powered_by', { defaultValue: 'PAYMENT POWERED BY MYANMYANPAY' })}
    </Text>
  );
}
