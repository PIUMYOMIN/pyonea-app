import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

function parseResetPasswordParams(url: string) {
  const parsed = Linking.parse(url);
  const path = `${parsed.hostname || ''}/${parsed.path || ''}`.replace(/^\/+/, '');

  if (!path.includes('reset-password')) return null;

  const token = parsed.queryParams?.token;
  const email = parsed.queryParams?.email;
  if (!token || !email) return null;

  return {
    token: String(Array.isArray(token) ? token[0] : token),
    email: String(Array.isArray(email) ? email[0] : email),
  };
}

export function AuthDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = (url: string) => {
      const params = parseResetPasswordParams(url);
      if (!params) return;

      router.replace({
        pathname: '/reset-password',
        params,
      });
    };

    void Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}
