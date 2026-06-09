import { Feather } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppLayout } from "@/components/layout/app-layout";
import { useNativeAuth } from "@/context/native-auth";
import { useAppTranslation } from "@/i18n";
import { getPostLoginDestination } from "@/utils/auth-routing";
import { trackLogin, trackSignUp } from "@/utils/analytics";
import {
  ApiError,
  authenticateWithGoogleAccessToken,
  completeSocialAuth,
  resetUserPassword,
  sendPasswordResetLink,
  type AuthSession,
} from "@/utils/native-api";
import { preloadGoogleIdentityServices, requestGoogleAccessToken } from "@/utils/google-auth";
import { executeRecaptcha } from "@/utils/recaptcha";
import { supportsNativeGoogleSignIn } from "@/utils/expo-go";
import {
  clearSocialPending,
  hydrateSocialPending,
  setSocialPending,
  type SocialPendingPayload,
} from "@/utils/social-auth-pending";

type FeatherName = ComponentProps<typeof Feather>["name"];
type AuthMode = "login" | "register" | "forgot" | "reset";
type MessageTone = "error" | "success" | "info";
type RegisterUserType = "buyer" | "seller";

const logo = require("@/assets/images/logo.png");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanPhoneNumber = (phone: string) => phone.replace(/\D/g, "");

const normalizeMyanmarPhone = (phone: string) => {
  const cleanPhone = cleanPhoneNumber(phone);

  if (cleanPhone.startsWith("09")) return `+95${cleanPhone.substring(1)}`;
  if (cleanPhone.startsWith("9") && !cleanPhone.startsWith("95")) return `+95${cleanPhone}`;
  if (cleanPhone.startsWith("959")) return `+${cleanPhone}`;
  if (cleanPhone.startsWith("95")) return `+95${cleanPhone.substring(2)}`;
  if (phone.startsWith("+959")) return phone;
  if (phone.startsWith("+95")) return `+95${phone.substring(3)}`;

  return phone.startsWith("+") ? phone : `+${phone}`;
};

function isValidMyanmarPhone(phone: string) {
  const cleanPhone = cleanPhoneNumber(phone);
  const digitsOnly = cleanPhone.replace(/^(959|09|9|95)/, "");
  const hasValidPrefix =
    phone.startsWith("09") ||
    phone.startsWith("9") ||
    phone.startsWith("959") ||
    phone.startsWith("+959") ||
    phone.startsWith("+95");

  return hasValidPrefix && digitsOnly.length >= 7 && digitsOnly.length <= 9;
}

const getApiMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError || error instanceof Error ? error.message : fallback;

async function finishGoogleAuth(
  accessToken: string,
  applySession: (session: AuthSession) => Promise<void>,
  router: ReturnType<typeof useRouter>,
  returnTo?: string
) {
  const result = await authenticateWithGoogleAccessToken(accessToken);

  if ("status" in result) {
    setSocialPending({
      temp_token: result.pending.tempToken,
      provider: result.pending.provider,
      social_user: result.pending.socialUser,
      missing_fields: result.pending.missingFields,
    });
    router.replace("/social/role");
    return;
  }

  await applySession(result);
  trackLogin("google");
  router.replace(getPostLoginDestination(result.user, returnTo));
}

function useAuthCopy(mode: AuthMode) {
  const { t } = useAppTranslation();

  const copy = {
    login: {
      title: t("login.title", { defaultValue: "Sign in to your account" }),
      subtitle: t("login.subtitle", {
        defaultValue: "Welcome back to Pyonea marketplace",
      }),
    },
    register: {
      title: t("register.title", { defaultValue: "Create your account" }),
      subtitle: t("register.subtitle", {
        defaultValue: "Join Pyonea as a buyer or seller",
      }),
    },
    forgot: {
      title: t("forgot_password.title", { defaultValue: "Forgot password?" }),
      subtitle: t("forgot_password.subtitle", {
        defaultValue:
          "Enter your email or phone and we will send reset instructions.",
      }),
    },
    reset: {
      title: t("reset_password.title", { defaultValue: "Reset password" }),
      subtitle: t("reset_password.subtitle", {
        defaultValue: "Create a new secure password.",
      }),
    },
  };

  return { ...copy[mode], t };
}

function AuthLayout({
  mode,
  children,
  compact = false,
}: {
  mode: AuthMode;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { title, subtitle } = useAuthCopy(mode);
  return (
    <AppLayout>
      <KeyboardAvoidingView
        className="w-full flex-1 bg-emerald-50 dark:bg-slate-950"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
      >
        <View className="w-full px-4 py-4 sm:py-14">
          <View className="mx-auto w-full max-w-md">
            <View className="items-center">
              <Link href="/" asChild>
                <Pressable className="mx-auto mb-3 h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm dark:bg-slate-900 sm:mb-4 sm:h-14 sm:w-14">
                  <Image
                    source={logo}
                    style={{
                      width: Platform.OS !== "web" ? 52 : 60,
                      height: Platform.OS !== "web" ? 52 : 60,
                      borderRadius: 9999,
                    }}
                    resizeMode="contain"
                  />
                </Pressable>
              </Link>
              <Text className="text-center font-sans text-2xl font-extrabold text-gray-950 dark:text-slate-100 sm:text-3xl">
                {title}
              </Text>
              <Text className="mt-2 text-center font-sans text-sm leading-5 text-gray-600 dark:text-slate-400">
                {subtitle}
              </Text>
            </View>

            <View
              className={`mt-4 rounded-2xl bg-white shadow-lg shadow-emerald-900/10 dark:bg-slate-900 dark:shadow-slate-950/50 sm:mt-8 ${
                compact ? "p-6" : "p-4 sm:p-8"
              }`}
            >
              {children}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

function Message({ tone, children }: { tone: MessageTone; children: string }) {
  const styles = {
    error: {
      wrap: "border-red-500 bg-red-50 dark:bg-red-900/30",
      icon: "alert-circle" as FeatherName,
      color: "#ef4444",
      text: "text-red-700 dark:text-red-300",
    },
    success: {
      wrap: "border-green-500 bg-green-50 dark:bg-green-900/30",
      icon: "check-circle" as FeatherName,
      color: "#22c55e",
      text: "text-green-800 dark:text-green-200",
    },
    info: {
      wrap: "border-blue-500 bg-blue-50 dark:bg-blue-900/30",
      icon: "info" as FeatherName,
      color: "#3b82f6",
      text: "text-blue-700 dark:text-blue-300",
    },
  }[tone];

  return (
    <View className={`mb-4 flex-row rounded-md border-l-4 p-4 ${styles.wrap}`}>
      <Feather name={styles.icon} size={20} color={styles.color} />
      <Text
        className={`ml-3 flex-1 font-sans text-sm font-medium leading-5 ${styles.text}`}
      >
        {children}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = "default",
  autoCapitalize = "none",
  secureTextEntry,
  right,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View>
      <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">{label}</Text>
      <View
        className={`min-h-12 flex-row items-center rounded-md border bg-white dark:bg-slate-950 ${
          error ? "border-red-300 dark:border-red-500" : "border-gray-300 dark:border-slate-700"
        }`}
      >
        <TextInput
          className="min-h-12 flex-1 px-3 font-sans text-sm text-gray-950 dark:text-slate-100"
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
        />
        {right}
      </View>
      {error ? (
        <Text className="mt-1 font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
      ) : null}
    </View>
  );
}

function PhoneField({
  value,
  onChangeText,
  error,
  label,
  helper,
}: {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  label: string;
  helper: string;
}) {
  return (
    <View>
      <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">{label}</Text>
      <View className="min-h-12 flex-row overflow-hidden rounded-md border border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950">
        <View className="min-h-12 flex-row items-center border-r border-gray-300 bg-gray-50 px-3 dark:border-slate-700 dark:bg-slate-800">
          <Text className="font-sans text-sm font-medium text-gray-500 dark:text-slate-300">+95</Text>
        </View>
        <TextInput
          className="min-h-12 flex-1 px-3 font-sans text-sm text-gray-950 dark:text-slate-100"
          placeholder="912345678"
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
        />
      </View>
      <Text className="mt-1 font-sans text-xs leading-4 text-gray-500 dark:text-slate-500">{helper}</Text>
      {error ? (
        <Text className="mt-1 font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
      ) : null}
    </View>
  );
}

function PasswordField({
  label,
  placeholder,
  value,
  onChangeText,
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      label={label}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      error={error}
      secureTextEntry={!visible}
      right={
        <Pressable
          className="h-12 w-12 items-center justify-center"
          onPress={() => setVisible((current) => !current)}
        >
          <Feather
            name={visible ? "eye-off" : "eye"}
            size={20}
            color="#6b7280"
          />
        </Pressable>
      }
    />
  );
}

function Checkbox({
  checked,
  onPress,
  label,
  error,
}: {
  checked: boolean;
  onPress: () => void;
  label: React.ReactNode;
  error?: string;
}) {
  return (
    <View>
      <Pressable className="min-h-8 flex-row items-center" onPress={onPress}>
        <View
          className={`h-5 w-5 items-center justify-center rounded border-2 ${
            checked
              ? "border-green-600 bg-green-600"
              : error
                ? "border-red-400"
                : "border-gray-300 dark:border-slate-600"
          }`}
        >
          {checked ? <Feather name="check" size={14} color="#ffffff" /> : null}
        </View>
        <View className="ml-2 min-w-0 flex-1">
          {typeof label === "string" ? (
            <Text className="font-sans text-sm text-gray-900 dark:text-slate-300">
              {label}
            </Text>
          ) : (
            label
          )}
        </View>
      </Pressable>
      {error ? (
        <Text className="mt-1 pl-8 font-sans text-sm text-red-600 dark:text-red-400">{error}</Text>
      ) : null}
    </View>
  );
}

function PrimaryButton({
  label,
  loadingLabel,
  isLoading,
  onPress,
}: {
  label: string;
  loadingLabel: string;
  isLoading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`min-h-11 flex-row items-center justify-center rounded-lg px-4 ${
        isLoading ? "bg-green-400" : "bg-green-600"
      }`}
      disabled={isLoading}
      onPress={onPress}
    >
      {isLoading ? <Feather name="loader" size={18} color="#ffffff" /> : null}
      <Text
        className={`font-sans text-sm font-semibold text-white ${isLoading ? "ml-2" : ""}`}
      >
        {isLoading ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

function SocialDivider({
  label,
  isLoading,
  onGooglePress,
  showGoogle = true,
}: {
  label: string;
  isLoading?: boolean;
  onGooglePress: () => void;
  showGoogle?: boolean;
}) {
  const { t } = useAppTranslation();
  const [googleLoading, setGoogleLoading] = useState(Platform.OS === "web");
  const disabled = Boolean(isLoading);

  useEffect(() => {
    let mounted = true;

    if (!showGoogle || Platform.OS !== "web") {
      return;
    }

    preloadGoogleIdentityServices()
      .catch(() => {
        // Keep the button clickable so the submit handler can show the exact error.
      })
      .finally(() => {
        if (mounted) setGoogleLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [showGoogle]);

  if (!showGoogle) {
    return (
      <View className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
        <Text className="font-sans text-xs leading-5 text-amber-900 dark:text-amber-200">
          {t("login.googleExpoGoUnavailable", {
            defaultValue:
              "Google sign-in is not available in Expo Go. Use phone login here, or test Google sign-in in a development build.",
          })}
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-5">
      <View className="flex-row items-center">
        <View className="h-px flex-1 bg-gray-300 dark:bg-slate-700" />
        <Text className="px-3 font-sans text-sm text-gray-500 dark:text-slate-400">{label}</Text>
        <View className="h-px flex-1 bg-gray-300 dark:bg-slate-700" />
      </View>
      <Pressable
        className={`mt-4 min-h-11 flex-row items-center justify-center rounded-lg border border-gray-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-800 ${
          disabled ? "opacity-60" : ""
        }`}
        disabled={disabled}
        onPress={onGooglePress}
      >
        <View className="mr-2 h-5 w-5 items-center justify-center rounded-full bg-white">
          <Text className="font-sans text-sm font-extrabold text-blue-600">G</Text>
        </View>
        <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-200">
          {googleLoading ? "Google..." : "Google"}
        </Text>
      </Pressable>
    </View>
  );
}

export function LoginScreen() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const auth = useNativeAuth();
  const { applySession, login } = auth;
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const errors = useMemo(
    () => ({
      phone:
        phone && !isValidMyanmarPhone(phone)
          ? t("validation.invalidPhone", {
              defaultValue: "Please enter a valid Myanmar phone.",
            })
          : "",
      password:
        password && password.length < 6
          ? t("validation.minLength", {
              count: 6,
              defaultValue: "Must be at least 6 characters.",
            })
          : "",
    }),
    [password, phone, t],
  );

  useEffect(() => {
    if (!auth.isLoading && auth.user) {
      router.replace(getPostLoginDestination(auth.user, params.returnTo));
    }
  }, [auth.isLoading, auth.user, params.returnTo, router]);

  const handleSubmit = async () => {
    if (!phone || !password || errors.phone || errors.password) {
      setError(
        t("login.invalidCredentials", {
          defaultValue: "Please enter valid login details.",
        }),
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const recaptchaToken = await executeRecaptcha("login");
      const session = await login({
        phone: normalizeMyanmarPhone(phone),
        password,
        remember,
        recaptcha_token: recaptchaToken,
      });
      trackLogin("phone");
      router.replace(getPostLoginDestination(session.user, params.returnTo));
    } catch (submitError) {
      setError(
        getApiMessage(
          submitError,
          t("login.error", { defaultValue: "An error occurred during login." }),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const accessToken = await requestGoogleAccessToken();
      await finishGoogleAuth(accessToken, applySession, router, params.returnTo);
    } catch (submitError) {
      setError(
        getApiMessage(
          submitError,
          t("login.googleFailed", { defaultValue: "Google sign-in failed." }),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout mode="login">
      {error ? <Message tone="error">{error}</Message> : null}
      <View className="gap-3">
        <PhoneField
          label={t("login.phone.label", { defaultValue: "Phone number" })}
          helper={t("register.phone.examples", {
            defaultValue: "Examples: 912345678, 0912345678, +95912345678",
          })}
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
        />
        <PasswordField
          label={t("login.password.label", { defaultValue: "Password" })}
          placeholder={t("login.password.placeholder", {
            defaultValue: "Enter your password",
          })}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Checkbox
              checked={remember}
              onPress={() => setRemember((current) => !current)}
              label={
                <Text
                  className="font-sans text-sm text-gray-900 dark:text-slate-300"
                  numberOfLines={1}
                >
                  {t("login.remember", { defaultValue: "Remember me" })}
                </Text>
              }
            />
          </View>
          <Link href="/forgot-password" asChild>
            <Pressable className="min-h-8 flex-shrink-0 items-end justify-center">
              <Text
                className="font-sans text-sm font-medium text-green-600 dark:text-green-300"
                numberOfLines={1}
              >
                {t("login.forgotPassword", {
                  defaultValue: "Forgot password?",
                })}
              </Text>
            </Pressable>
          </Link>
        </View>

        <PrimaryButton
          label={t("login.signIn", { defaultValue: "Sign in" })}
          loadingLabel={t("login.signingIn", { defaultValue: "Signing in..." })}
          isLoading={isLoading}
          onPress={handleSubmit}
        />

        <View className="flex-row flex-wrap justify-center">
          <Text className="text-sm text-gray-600 dark:text-slate-400">
            {t("login.noAccount", {
              defaultValue: "Don't have an account?",
            })}{" "}
          </Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text className="text-sm font-medium text-green-600 dark:text-green-300">
                {t("login.register", { defaultValue: "Create account" })}
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
      <SocialDivider
        label={t("login.orContinue", { defaultValue: "Or continue with" })}
        isLoading={isLoading}
        showGoogle={supportsNativeGoogleSignIn()}
        onGooglePress={handleGoogleLogin}
      />
    </AuthLayout>
  );
}

export function RegisterScreen() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const auth = useNativeAuth();
  const { applySession, register } = auth;
  const params = useLocalSearchParams<{ type?: string; ref?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<RegisterUserType>(
    params.type === "seller" ? "seller" : "buyer",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [termsError, setTermsError] = useState("");

  const fieldErrors = useMemo(
    () => ({
      name:
        name && name.length < 2
          ? t("validation.minLength", {
              count: 2,
              defaultValue: "Must be at least 2 characters.",
            })
          : "",
      phone:
        phone && !isValidMyanmarPhone(phone)
          ? t("validation.invalidPhone", {
              defaultValue: "Please enter a valid Myanmar phone.",
            })
          : "",
      email:
        email && !emailPattern.test(email)
          ? t("validation.invalidEmail", {
              defaultValue: "Please enter a valid email address.",
            })
          : "",
      password:
        password && password.length < 6
          ? t("validation.minLength", {
              count: 6,
              defaultValue: "Must be at least 6 characters.",
            })
          : "",
      confirmPassword:
        confirmPassword && confirmPassword !== password
          ? t("validation.passwordMismatch", {
              defaultValue: "Passwords do not match.",
            })
          : "",
    }),
    [confirmPassword, email, name, password, phone, t],
  );

  useEffect(() => {
    if (!auth.isLoading && auth.user) {
      router.replace(getPostLoginDestination(auth.user));
    }
  }, [auth.isLoading, auth.user, router]);

  const handleSubmit = async () => {
    const hasEmptyField =
      !name || !phone || !email || !password || !confirmPassword;
    const hasFieldError = Object.values(fieldErrors).some(Boolean);

    if (!agreed) {
      setTermsError(
        t("register.terms_required", {
          defaultValue: "Please accept the terms.",
        }),
      );
      return;
    }

    setTermsError("");

    if (hasEmptyField || hasFieldError) {
      setError(
        t("register.error", {
          defaultValue: "Please check the registration form.",
        }),
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const recaptchaToken = await executeRecaptcha("register");
      const session = await register({
        name: name.trim(),
        phone: normalizeMyanmarPhone(phone),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
        type: userType,
        recaptcha_token: recaptchaToken,
        ...(params.ref ? { ref_code: String(params.ref) } : {}),
      });

      trackSignUp(userType);
      router.replace(getPostLoginDestination(session.user));
    } catch (submitError) {
      setError(
        getApiMessage(
          submitError,
          t("register.error", { defaultValue: "Please check the registration form." }),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const accessToken = await requestGoogleAccessToken();
      await finishGoogleAuth(accessToken, applySession, router);
    } catch (submitError) {
      setError(
        getApiMessage(
          submitError,
          t("login.googleFailed", { defaultValue: "Google sign-in failed." }),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout mode="register">
      {params.ref ? (
        <Message tone="success">
          {t("register.referred_by_suffix", {
            defaultValue: "Referral code applied.",
          })}
        </Message>
      ) : null}
      {error ? <Message tone="error">{error}</Message> : null}

      <View className="gap-4">
        <Field
          label={t("register.name.label", { defaultValue: "Full name" })}
          placeholder={t("register.name.placeholder", {
            defaultValue: "Enter your full name",
          })}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={fieldErrors.name}
        />
        <PhoneField
          label={t("register.phone.label", { defaultValue: "Phone number" })}
          helper={t("register.phone.examples", {
            defaultValue: "Examples: 912345678, 0912345678, +95912345678",
          })}
          value={phone}
          onChangeText={setPhone}
          error={fieldErrors.phone}
        />
        <Field
          label={t("register.email.label", { defaultValue: "Email address" })}
          placeholder={t("register.email.placeholder", {
            defaultValue: "you@example.com",
          })}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          error={fieldErrors.email}
        />

        <View>
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
            {t("register.accountType.label", { defaultValue: "Account type" })}
          </Text>
          <View className="flex-row gap-3">
            {(["buyer", "seller"] as const).map((type) => {
              const active = userType === type;
              return (
                <Pressable
                  key={type}
                  className={`min-h-12 flex-1 items-center justify-center rounded-md border px-4 ${
                    active
                      ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                      : "border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                  }`}
                  onPress={() => setUserType(type)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      active ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    {type === "buyer"
                      ? t("register.accountType.buyer", {
                          defaultValue: "Buyer",
                        })
                      : t("register.accountType.seller", {
                          defaultValue: "Seller",
                        })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-1 text-xs leading-4 text-gray-500 dark:text-slate-500">
            {userType === "buyer"
              ? t("register.accountType.buyerDescription", {
                  defaultValue: "Buy products and request wholesale deals.",
                })
              : t("register.accountType.sellerDescription", {
                  defaultValue: "Open a seller store and list your products.",
                })}
          </Text>
        </View>

        <PasswordField
          label={t("register.password.label", { defaultValue: "Password" })}
          placeholder={t("register.password.placeholder", {
            defaultValue: "Create a password",
          })}
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
        />
        <PasswordField
          label={t("register.confirmPassword.label", {
            defaultValue: "Confirm password",
          })}
          placeholder={t("register.confirmPassword.placeholder", {
            defaultValue: "Confirm your password",
          })}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={fieldErrors.confirmPassword}
        />

        <Checkbox
          checked={agreed}
          onPress={() => {
            setAgreed((current) => !current);
            setTermsError("");
          }}
          error={termsError}
          label={
            <Text className="text-sm leading-5 text-gray-600 dark:text-slate-400">
              {t("register.terms_agree_prefix", {
                defaultValue: "I agree to the",
              })}{" "}
              <Link href="/terms" asChild>
                <Text className="font-medium text-green-600 dark:text-green-300">
                  {t("register.terms", { defaultValue: "Terms" })}
                </Text>
              </Link>{" "}
              {t("register.and", { defaultValue: "and" })}{" "}
              <Link href="/privacy-policy" asChild>
                <Text className="font-medium text-green-600 dark:text-green-300">
                  {t("register.privacy_policy", {
                    defaultValue: "Privacy Policy",
                  })}
                </Text>
              </Link>
              {userType === "seller" ? (
                <>
                  {" "}
                  {t("register.and_the", { defaultValue: "and the" })}{" "}
                  <Link href="/seller-guidelines" asChild>
                    <Text className="font-medium text-green-600 dark:text-green-300">
                      {t("register.seller_guidelines", {
                        defaultValue: "Seller Guidelines",
                      })}
                    </Text>
                  </Link>
                </>
              ) : null}
            </Text>
          }
        />

        <PrimaryButton
          label={t("register.createAccount", {
            defaultValue: "Create account",
          })}
          loadingLabel={t("register.creatingAccount", {
            defaultValue: "Creating account...",
          })}
          isLoading={isLoading}
          onPress={handleSubmit}
        />

        <View className="flex-row justify-center">
          <Text className="text-sm text-gray-600 dark:text-slate-400">
            {t("register.hasAccount", {
              defaultValue: "Already have an account?",
            })}{" "}
          </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text className="text-sm font-medium text-green-600 dark:text-green-300">
                {t("register.signIn", { defaultValue: "Sign in" })}
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <SocialDivider
        label={t("login.orContinue", { defaultValue: "Or continue with" })}
        isLoading={isLoading}
        showGoogle={supportsNativeGoogleSignIn()}
        onGooglePress={handleGoogleLogin}
      />
    </AuthLayout>
  );
}

export function ForgotPasswordScreen() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [identity, setIdentity] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!identity.trim()) {
      setError(
        t("forgot_password.required_field", {
          defaultValue: "This field is required.",
        }),
      );
      return;
    }

    setIsLoading(true);

    try {
      const recaptchaToken = await executeRecaptcha("forgot_password");
      const trimmedIdentity = identity.trim();
      const normalizedIdentity = emailPattern.test(trimmedIdentity)
        ? trimmedIdentity
        : normalizeMyanmarPhone(trimmedIdentity);
      await sendPasswordResetLink(normalizedIdentity, recaptchaToken);
      setError("");
      setSuccess(true);
    } catch (submitError) {
      setError(
        getApiMessage(
          submitError,
          t("forgot_password.error", {
            defaultValue: "We could not send the reset link. Please try again.",
          }),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout mode="forgot" compact>
      {success ? (
        <View>
          <Message tone="success">
            {t("forgot_password.success_message", {
              defaultValue: "Password reset instructions have been sent.",
            })}
          </Message>
          <PrimaryButton
            label={t("forgot_password.back_to_login", {
              defaultValue: "Back to login",
            })}
            loadingLabel={t("forgot_password.back_to_login", {
              defaultValue: "Back to login",
            })}
            onPress={() => router.push("/login")}
          />
        </View>
      ) : (
        <View className="gap-4">
          {error ? <Message tone="error">{error}</Message> : null}
          <Field
            label={t("forgot_password.email_or_phone_label", {
              defaultValue: "Email or phone number",
            })}
            placeholder={t("forgot_password.email_or_phone_placeholder", {
              defaultValue: "Enter your email or phone",
            })}
            value={identity}
            onChangeText={setIdentity}
          />
          <PrimaryButton
            label={t("forgot_password.send_reset", {
              defaultValue: "Send reset link",
            })}
            loadingLabel={t("forgot_password.sending", {
              defaultValue: "Sending...",
            })}
            isLoading={isLoading}
            onPress={handleSubmit}
          />
          <Link href="/login" asChild>
            <Pressable className="items-center">
              <Text className="text-sm font-medium text-green-600 dark:text-green-300">
                {t("forgot_password.back_to_login", {
                  defaultValue: "Back to login",
                })}
              </Text>
            </Pressable>
          </Link>
        </View>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordScreen() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const hasValidLink = Boolean(params.token && params.email);

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      setError(
        t("validation.minLength", {
          count: 6,
          defaultValue: "Must be at least 6 characters.",
        }),
      );
      return;
    }
    if (confirmPassword !== password) {
      setError(
        t("validation.passwordMismatch", {
          defaultValue: "Passwords do not match.",
        }),
      );
      return;
    }

    setIsLoading(true);

    try {
      const recaptchaToken = await executeRecaptcha("reset_password");
      await resetUserPassword({
        token: String(params.token),
        email: String(params.email),
        password,
        password_confirmation: confirmPassword,
        recaptcha_token: recaptchaToken,
      });
      setError("");
      setSuccess(true);
    } catch (submitError) {
      setError(
        getApiMessage(
          submitError,
          t("reset_password.error", {
            defaultValue: "We could not reset your password. Please try again.",
          }),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout mode="reset" compact>
      {!hasValidLink ? (
        <View className="gap-4">
          <Message tone="error">
            {t("reset_password.invalid_link_message", {
              defaultValue: "This reset link is missing required information.",
            })}
          </Message>
          <PrimaryButton
            label={t("reset_password.request_new_link", {
              defaultValue: "Request a new link",
            })}
            loadingLabel={t("reset_password.request_new_link", {
              defaultValue: "Request a new link",
            })}
            onPress={() => router.push("/forgot-password")}
          />
        </View>
      ) : success ? (
        <View className="gap-4">
          <Message tone="success">
            {t("reset_password.success_message", {
              defaultValue: "Your password has been reset successfully.",
            })}
          </Message>
          <Message tone="info">
            {t("reset_password.redirecting", {
              defaultValue: "You can now sign in.",
            })}
          </Message>
          <PrimaryButton
            label={t("forgot_password.back_to_login", {
              defaultValue: "Back to login",
            })}
            loadingLabel={t("forgot_password.back_to_login", {
              defaultValue: "Back to login",
            })}
            onPress={() => router.push("/login")}
          />
        </View>
      ) : (
        <View className="gap-4">
          {error ? <Message tone="error">{error}</Message> : null}
          <PasswordField
            label={t("reset_password.new_password_label", {
              defaultValue: "New password",
            })}
            placeholder={t("reset_password.new_password_placeholder", {
              defaultValue: "Enter a new password",
            })}
            value={password}
            onChangeText={setPassword}
          />
          <PasswordField
            label={t("reset_password.confirm_password_label", {
              defaultValue: "Confirm password",
            })}
            placeholder={t("reset_password.confirm_password_placeholder", {
              defaultValue: "Confirm your new password",
            })}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <PrimaryButton
            label={t("reset_password.reset_button", {
              defaultValue: "Reset password",
            })}
            loadingLabel={t("reset_password.resetting", {
              defaultValue: "Resetting...",
            })}
            isLoading={isLoading}
            onPress={handleSubmit}
          />
        </View>
      )}
    </AuthLayout>
  );
}

export function SocialRoleSelectScreen() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const auth = useNativeAuth();
  const [payload, setPayload] = useState<SocialPendingPayload | null>(() => null);
  const [role, setRole] = useState<RegisterUserType>("buyer");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    void hydrateSocialPending().then((pending) => {
      if (mounted) setPayload(pending);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const name = payload?.social_user?.name || "New user";
  const email = payload?.social_user?.email || "";
  const provider = payload?.provider || "google";
  const tempToken = payload?.temp_token;
  const needsEmail = (payload?.missing_fields || []).includes("email");

  const handleComplete = async () => {
    if (!tempToken) {
      router.replace("/login");
      return;
    }

    const trimmedEmail = emailInput.trim();
    const normalizedPhone = normalizeMyanmarPhone(phoneInput);

    if (needsEmail && !trimmedEmail) {
      setError(
        t("register.email.required", {
          defaultValue: "Email is required to continue.",
        })
      );
      return;
    }

    if (!phoneInput.trim()) {
      setError(
        t("register.phone.required", {
          defaultValue: "Phone number is required to continue.",
        })
      );
      return;
    }

    if (!isValidMyanmarPhone(normalizedPhone)) {
      setError(
        t("validation.invalidPhone", {
          defaultValue: "Please enter a valid Myanmar phone.",
        })
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const session = await completeSocialAuth(provider, tempToken, {
        role,
        phone: normalizedPhone,
        ...(needsEmail ? { email: trimmedEmail } : {}),
      });

      clearSocialPending();
      await auth.applySession(session);
      trackSignUp("google");

      router.replace(getPostLoginDestination(session.user));
    } catch (submitError) {
      setError(
        getApiMessage(
          submitError,
          t("register.error", {
            defaultValue: "Failed to complete registration. Please try again.",
          })
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout mode="register" compact>
      {!payload || !tempToken ? (
        <View className="gap-4">
          <Message tone="error">
            {t("login.googleFailed", {
              defaultValue: "Google sign-in session expired. Please try again.",
            })}
          </Message>
          <PrimaryButton
            label={t("forgot_password.back_to_login", {
              defaultValue: "Back to login",
            })}
            loadingLabel={t("forgot_password.back_to_login", {
              defaultValue: "Back to login",
            })}
            onPress={() => router.replace("/login")}
          />
        </View>
      ) : (
        <View className="gap-4">
          <Message tone="info">
            {`Welcome, ${name}. Choose how you want to use Pyonea.`}
          </Message>
          {email ? (
            <Text className="text-center font-sans text-sm text-gray-600 dark:text-slate-400">
              {email}
            </Text>
          ) : null}
          {error ? <Message tone="error">{error}</Message> : null}

          {needsEmail ? (
            <Field
              label={t("register.email.label", { defaultValue: "Email address" })}
              placeholder={t("register.email.placeholder", {
                defaultValue: "you@example.com",
              })}
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
            />
          ) : null}

          <PhoneField
            label={t("register.phone.label", { defaultValue: "Phone number" })}
            helper={t("register.phone.examples", {
              defaultValue: "Examples: 912345678, 0912345678, +95912345678",
            })}
            value={phoneInput}
            onChangeText={setPhoneInput}
          />

          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
              {t("register.accountType.label", { defaultValue: "Account type" })}
            </Text>
            <View className="flex-row gap-3">
              {(["buyer", "seller"] as const).map((type) => {
                const active = role === type;
                return (
                  <Pressable
                    key={type}
                    className={`min-h-12 flex-1 items-center justify-center rounded-md border px-4 ${
                      active
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                        : "border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                    }`}
                    onPress={() => setRole(type)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        active
                          ? "text-green-700 dark:text-green-300"
                          : "text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      {type === "buyer"
                        ? t("register.accountType.buyer", { defaultValue: "Buyer" })
                        : t("register.accountType.seller", { defaultValue: "Seller" })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <PrimaryButton
            label={t("register.createAccount", { defaultValue: "Create account" })}
            loadingLabel={t("register.creatingAccount", {
              defaultValue: "Creating account...",
            })}
            isLoading={isLoading}
            onPress={handleComplete}
          />
        </View>
      )}
    </AuthLayout>
  );
}
