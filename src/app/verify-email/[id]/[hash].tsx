import { useLocalSearchParams } from 'expo-router';

import { EmailVerificationNative } from '@/pages/email-verification-native';

export default function VerifyEmailLinkRoute() {
  const params = useLocalSearchParams<{ id?: string; hash?: string }>();
  const linkId = typeof params.id === 'string' ? params.id : undefined;
  const linkHash = typeof params.hash === 'string' ? params.hash : undefined;

  return <EmailVerificationNative linkId={linkId} linkHash={linkHash} />;
}
