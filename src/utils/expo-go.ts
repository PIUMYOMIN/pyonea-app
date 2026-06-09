import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** True when running inside the Expo Go client (not a dev/production build). */
export function isExpoGo() {
  return Platform.OS !== 'web' && Constants.appOwnership === 'expo';
}

/** Google OAuth redirects require a custom app scheme; unavailable in Expo Go. */
export function supportsNativeGoogleSignIn() {
  return Platform.OS === 'web' || !isExpoGo();
}
