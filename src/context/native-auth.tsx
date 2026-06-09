import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from '@/utils/native-push-notifications';
import {
  fetchCurrentUser,
  getStoredAuthToken,
  hydrateStoredAuthToken,
  loginWithGoogleAccessToken,
  loginUser,
  logoutUser,
  registerUser,
  setStoredAuthToken,
  type AuthSession,
  type LoginPayload,
  type NativeUser,
  type RegisterPayload,
} from '@/utils/native-api';

type AuthContextValue = {
  user: NativeUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  loginWithGoogle: (accessToken: string) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<AuthSession>;
  applySession: (session: AuthSession) => Promise<void>;
  refreshUser: () => Promise<NativeUser | null>;
  logout: () => Promise<void>;
};

const NativeAuthContext = createContext<AuthContextValue | null>(null);

export function NativeAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<NativeUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const currentToken = await hydrateStoredAuthToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      return null;
    }

    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      setToken(currentToken);
      return currentUser;
    } catch {
      await setStoredAuthToken(null);
      setUser(null);
      setToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      await refreshUser();
      if (mounted) setIsLoading(false);
    };

    const timeout = setTimeout(() => {
      void bootstrap();
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!user || !token) return;
    const timeout = setTimeout(() => {
      void registerForPushNotifications().catch(() => undefined);
    }, 500);

    return () => clearTimeout(timeout);
  }, [token, user]);

  const login = useCallback(async (payload: LoginPayload) => {
    const session = await loginUser(payload);
    setUser(session.user);
    setToken(session.token);
    return session;
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    const session = await loginWithGoogleAccessToken(accessToken);
    setUser(session.user);
    setToken(session.token);
    return session;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const session = await registerUser(payload);
    setUser(session.user);
    setToken(session.token);
    return session;
  }, []);

  const applySession = useCallback(async (session: AuthSession) => {
    await setStoredAuthToken(session.token);
    setUser(session.user);
    setToken(session.token);
  }, []);

  const logout = useCallback(async () => {
    try {
      await unregisterPushNotifications().catch(() => undefined);
      await logoutUser();
    } finally {
      setUser(null);
      setToken(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      loginWithGoogle,
      register,
      applySession,
      refreshUser,
      logout,
    }),
    [applySession, isLoading, login, loginWithGoogle, logout, refreshUser, register, token, user]
  );

  return <NativeAuthContext.Provider value={value}>{children}</NativeAuthContext.Provider>;
}

export function useNativeAuth() {
  const value = useContext(NativeAuthContext);
  if (!value) throw new Error('useNativeAuth must be used inside NativeAuthProvider');
  return value;
}
