import { EmailVerificationNative } from '@/pages/email-verification-native';
import { resolveVerifyEmailPathParams } from '@/utils/route-params';
import { useLocalSearchParams } from 'expo-router';

export default function VerifyEmailLinkRoute() {
  const params = useLocalSearchParams<{ id?: string; hash?: string }>();
  const { id: linkId, hash: linkHash } = resolveVerifyEmailPathParams(params);

  return (
    <EmailVerificationNative
      linkId={linkId || undefined}
      linkHash={linkHash || undefined}
    />
  );
}
