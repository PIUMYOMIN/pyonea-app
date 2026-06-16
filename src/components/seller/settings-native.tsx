import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  isNrcInputComplete,
  NrcInputNative,
  nrcValueFromSeller,
  type NrcInputValue,
} from "@/components/seller/nrc-input-native";
import { MyanmarRegionPicker } from "@/components/ui/myanmar-region-picker-native";
import { NativeDateField } from "@/components/ui/native-date-field";
import { OptimizedImage as Image } from "@/components/ui/optimized-image";
import { SelectPickerNative } from "@/components/ui/select-picker-native";
import { useAppTranslation } from "@/i18n";
import {
  DEFAULT_SELLER_BUSINESS_HOURS,
  deleteSellerAccount,
  fetchAdminBusinessTypes,
  fetchSellerSettings,
  formatApiErrorMessage,
  submitSellerDocumentsForVerification,
  updateSellerPassword,
  updateSellerProfile,
  updateSellerSettings,
  updateSellerStoreIdentity,
  updateSellerStoreProfile,
  uploadSellerStoreBanner,
  uploadSellerStoreLogo,
  uploadSellerVerificationDocument,
  type AdminBusinessType,
  type NativeUploadFile,
  type NativeUser,
  type SellerBusinessHours,
  type SellerDashboardOverview,
  type SellerDocumentType,
  type SellerSettingsPayload,
  type SellerStoreIdentityPayload,
  type SellerStoreSummary,
} from "@/utils/native-api";
import {
  getUploadNameFromUri,
  pickImageFromCamera,
  pickImagesFromLibrary,
} from "@/utils/native-image-picker";

type SettingsTab =
  | "personal"
  | "store"
  | "brand"
  | "general"
  | "payment"
  | "notifications"
  | "security"
  | "account";
type Message = { type: "success" | "error"; text: string } | null;
type DocumentPickerAsset = import("expo-document-picker").DocumentPickerAsset;

type SettingsForm = Required<
  Pick<
    SellerSettingsPayload,
    | "email_notifications"
    | "order_notifications"
    | "inventory_alerts"
    | "review_notifications"
    | "auto_withdrawal"
    | "withdrawal_threshold"
    | "preferred_payment_method"
    | "is_active"
    | "vacation_mode"
    | "vacation_message"
    | "vacation_start_date"
    | "vacation_end_date"
    | "two_factor_auth"
    | "login_notifications"
    | "show_sold_out"
    | "show_reviews"
    | "show_inventory_count"
    | "currency"
    | "business_hours_enabled"
  >
> & {
  return_policy: string;
  shipping_policy: string;
  warranty_policy: string;
  privacy_policy: string;
  terms_of_service: string;
  business_hours: SellerBusinessHours;
};

type StoreForm = {
  store_name: string;
  store_description: string;
  business_type: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  business_registration_number: string;
  tax_id: string;
  account_number: string;
};

type IdentityForm = Required<SellerStoreIdentityPayload>;

const ENGLISH_STORE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s&.,'()/-]*$/;

const isEnglishStoreName = (value: string) =>
  ENGLISH_STORE_NAME_PATTERN.test(value.trim());

const SETTINGS_TABS: {
  key: SettingsTab;
  labelKey: string;
  descriptionKey: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  {
    key: "personal",
    labelKey: "sellerSettings.tabs.personal.label",
    descriptionKey: "sellerSettings.tabs.personal.description",
    icon: "user",
  },
  {
    key: "store",
    labelKey: "sellerSettings.tabs.store.label",
    descriptionKey: "sellerSettings.tabs.store.description",
    icon: "shopping-bag",
  },
  {
    key: "brand",
    labelKey: "sellerSettings.tabs.brand.label",
    descriptionKey: "sellerSettings.tabs.brand.description",
    icon: "image",
  },
  {
    key: "general",
    labelKey: "sellerSettings.tabs.general.label",
    descriptionKey: "sellerSettings.tabs.general.description",
    icon: "settings",
  },
  {
    key: "payment",
    labelKey: "sellerSettings.tabs.payment.label",
    descriptionKey: "sellerSettings.tabs.payment.description",
    icon: "credit-card",
  },
  {
    key: "notifications",
    labelKey: "sellerSettings.tabs.notifications.label",
    descriptionKey: "sellerSettings.tabs.notifications.description",
    icon: "bell",
  },
  {
    key: "security",
    labelKey: "sellerSettings.tabs.security.label",
    descriptionKey: "sellerSettings.tabs.security.description",
    icon: "key",
  },
  {
    key: "account",
    labelKey: "sellerSettings.tabs.account.label",
    descriptionKey: "sellerSettings.tabs.account.description",
    icon: "shield",
  },
];

const BUSINESS_DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
] as const;

const SETTINGS_TAB_FIELDS: Partial<
  Record<SettingsTab, Array<keyof SettingsForm>>
> = {
  general: [
    "return_policy",
    "shipping_policy",
    "warranty_policy",
    "privacy_policy",
    "terms_of_service",
    "show_sold_out",
    "show_reviews",
    "show_inventory_count",
    "business_hours_enabled",
    "business_hours",
  ],
  payment: [
    "withdrawal_threshold",
    "currency",
    "preferred_payment_method",
    "auto_withdrawal",
  ],
  notifications: [
    "email_notifications",
    "order_notifications",
    "inventory_alerts",
    "review_notifications",
  ],
  security: ["two_factor_auth", "login_notifications"],
  account: [
    "is_active",
    "vacation_mode",
    "vacation_message",
    "vacation_start_date",
    "vacation_end_date",
  ],
};

const normalizeBusinessHours = (value: unknown): SellerBusinessHours => {
  const merged: SellerBusinessHours = { ...DEFAULT_SELLER_BUSINESS_HOURS };
  if (!value || typeof value !== "object") {
    return merged;
  }

  const record = value as Record<string, unknown>;
  for (const day of Object.keys(DEFAULT_SELLER_BUSINESS_HOURS)) {
    const entry = record[day];
    if (!entry || typeof entry !== "object") continue;
    const hour = entry as Record<string, unknown>;
    merged[day] = {
      open: typeof hour.open === "string" ? hour.open : merged[day].open,
      close: typeof hour.close === "string" ? hour.close : merged[day].close,
      closed:
        typeof hour.closed === "boolean" ? hour.closed : merged[day].closed,
    };
  }

  return merged;
};

const mergeSettingsForm = (
  store: SellerStoreSummary | null,
  remote?: SellerSettingsPayload | null,
): SettingsForm => ({
  ...initialSettingsForm(store),
  ...(remote
    ? {
        return_policy: remote.return_policy ?? store?.returnPolicy ?? "",
        shipping_policy: remote.shipping_policy ?? store?.shippingPolicy ?? "",
        warranty_policy: remote.warranty_policy ?? store?.warrantyPolicy ?? "",
        privacy_policy: remote.privacy_policy ?? store?.privacyPolicy ?? "",
        terms_of_service:
          remote.terms_of_service ?? store?.termsOfService ?? "",
        email_notifications: remote.email_notifications !== false,
        order_notifications: remote.order_notifications !== false,
        inventory_alerts: remote.inventory_alerts !== false,
        review_notifications: remote.review_notifications !== false,
        auto_withdrawal: Boolean(remote.auto_withdrawal),
        withdrawal_threshold:
          remote.withdrawal_threshold ?? store?.withdrawalThreshold ?? 100000,
        preferred_payment_method:
          remote.preferred_payment_method ||
          store?.preferredPaymentMethod ||
          "bank_transfer",
        is_active: remote.is_active !== false,
        vacation_mode: Boolean(remote.vacation_mode),
        vacation_message:
          remote.vacation_message ?? store?.vacationMessage ?? "",
        vacation_start_date:
          remote.vacation_start_date ?? store?.vacationStartDate ?? "",
        vacation_end_date:
          remote.vacation_end_date ?? store?.vacationEndDate ?? "",
        two_factor_auth: Boolean(remote.two_factor_auth),
        login_notifications: remote.login_notifications !== false,
        show_sold_out: remote.show_sold_out !== false,
        show_reviews: remote.show_reviews !== false,
        show_inventory_count: Boolean(remote.show_inventory_count),
        currency: remote.currency || store?.currency || "MMK",
        business_hours_enabled: Boolean(
          remote.business_hours_enabled ?? store?.businessHoursEnabled,
        ),
        business_hours: normalizeBusinessHours(
          remote.business_hours || store?.businessHours,
        ),
      }
    : {}),
});

const buildTabSettingsPayload = (
  tab: SettingsTab,
  settings: SettingsForm,
): SellerSettingsPayload => {
  if (tab === "personal" || tab === "brand" || tab === "store") {
    return {};
  }

  const fields = SETTINGS_TAB_FIELDS[tab];
  if (!fields?.length) {
    return {};
  }
  const payload: SellerSettingsPayload = {};

  for (const field of fields) {
    const value = settings[field];
    if (field === "withdrawal_threshold") {
      payload.withdrawal_threshold = Number(value) || 0;
      continue;
    }
    if (field === "business_hours") {
      payload.business_hours = value as SellerBusinessHours;
      continue;
    }
    (payload as Record<string, unknown>)[field] = value;
  }

  return payload;
};

const initialSettingsForm = (
  store: SellerStoreSummary | null,
): SettingsForm => ({
  return_policy: store?.returnPolicy || "",
  shipping_policy: store?.shippingPolicy || "",
  warranty_policy: store?.warrantyPolicy || "",
  privacy_policy: store?.privacyPolicy || "",
  terms_of_service: store?.termsOfService || "",
  email_notifications: store?.emailNotifications !== false,
  order_notifications: store?.orderNotifications !== false,
  inventory_alerts: store?.inventoryAlerts !== false,
  review_notifications: store?.reviewNotifications !== false,
  auto_withdrawal: Boolean(store?.autoWithdrawal),
  withdrawal_threshold: store?.withdrawalThreshold || 100000,
  preferred_payment_method: store?.preferredPaymentMethod || "bank_transfer",
  is_active: store?.isActive !== false,
  vacation_mode: Boolean(store?.vacationMode),
  vacation_message: store?.vacationMessage || "",
  vacation_start_date: store?.vacationStartDate || "",
  vacation_end_date: store?.vacationEndDate || "",
  two_factor_auth: Boolean(store?.twoFactorAuth),
  login_notifications: store?.loginNotifications !== false,
  show_sold_out: store?.showSoldOut !== false,
  show_reviews: store?.showReviews !== false,
  show_inventory_count: Boolean(store?.showInventoryCount),
  currency: store?.currency || "MMK",
  business_hours_enabled: Boolean(store?.businessHoursEnabled),
  business_hours: normalizeBusinessHours(store?.businessHours),
});

const initialProfileForm = (user: NativeUser | null) => ({
  name: user?.name || "",
  email: user?.email || "",
  phone: user?.phone || "",
  address: user?.address || "",
  city: user?.city || "",
  state: user?.state || "",
  country: user?.country || "Myanmar",
  postal_code: user?.postalCode || "",
  date_of_birth: user?.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
});

const initialStoreForm = (store: SellerStoreSummary | null): StoreForm => ({
  store_name: store?.name || "",
  store_description: store?.description || "",
  business_type: store?.businessType || "",
  contact_email: store?.email || "",
  contact_phone: store?.phone || "",
  website: store?.website || "",
  address: store?.address || "",
  city: store?.city || "",
  state: store?.state || "",
  country: store?.country || "Myanmar",
  postal_code: "",
  business_registration_number: store?.registrationNumber || "",
  tax_id: store?.taxId || "",
  account_number: store?.accountNumber || "",
});

const initialIdentityForm = (
  store: SellerStoreSummary | null,
): IdentityForm => ({
  business_registration_number: store?.registrationNumber || "",
  tax_id: store?.taxId || "",
  website: store?.website || "",
  account_number: store?.accountNumber || "",
  nrc_division: store?.nrcDivision || "",
  nrc_township_code: store?.nrcTownshipCode || "",
  nrc_township_mm: store?.nrcTownshipMm || "",
  nrc_type: store?.nrcType || "",
  nrc_number: store?.nrcNumber || "",
});

function StatusToast({
  message,
  onClose,
}: {
  message: Message;
  onClose: () => void;
}) {
  if (!message) return null;
  const success = message.type === "success";
  return (
    <Pressable
      onPress={onClose}
      className={`mb-4 flex-row items-start gap-3 rounded-xl border p-4 ${
        success
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      }`}
    >
      <Feather
        name={success ? "check-circle" : "alert-triangle"}
        color={success ? "#16a34a" : "#dc2626"}
        size={18}
      />
      <Text
        className={`min-w-0 flex-1 font-sans text-sm ${
          success
            ? "text-green-700 dark:text-green-300"
            : "text-red-700 dark:text-red-300"
        }`}
      >
        {message.text}
      </Text>
      <Feather name="x" color={success ? "#16a34a" : "#dc2626"} size={16} />
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  multiline,
  keyboardType,
  required,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  required?: boolean;
}) {
  return (
    <View className="min-w-0 flex-1">
      <Text className="mb-1 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        secureTextEntry={secure}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType}
        className={`rounded-xl border border-gray-300 bg-white px-4 py-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${
          multiline ? "min-h-28" : "h-12"
        }`}
      />
    </View>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
          {title}
        </Text>
        <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
          {description}
        </Text>
      </View>
      <Pressable
        onPress={() => onValueChange(!value)}
        className={`h-7 w-12 justify-center rounded-full px-1 ${value ? "items-end bg-green-600" : "items-start bg-gray-300 dark:bg-slate-600"}`}
      >
        <View className="h-5 w-5 rounded-full bg-white" />
      </Pressable>
    </View>
  );
}

function BusinessHoursEditor({
  hours,
  onChange,
}: {
  hours: SellerBusinessHours;
  onChange: (
    day: string,
    field: "open" | "close" | "closed",
    value: string | boolean,
  ) => void;
}) {
  return (
    <View className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
      {BUSINESS_DAYS.map(([day, label], index) => {
        const entry = hours[day] || DEFAULT_SELLER_BUSINESS_HOURS[day];
        return (
          <View
            key={day}
            className={`gap-3 p-4 ${index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-900/40"} ${
              index < BUSINESS_DAYS.length - 1
                ? "border-b border-gray-100 dark:border-slate-700"
                : ""
            }`}
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="w-10 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                {label}
              </Text>
              <Pressable
                onPress={() => onChange(day, "closed", !entry.closed)}
                className={`h-7 w-12 justify-center rounded-full px-1 ${
                  !entry.closed
                    ? "items-end bg-green-600"
                    : "items-start bg-gray-300 dark:bg-slate-600"
                }`}
              >
                <View className="h-5 w-5 rounded-full bg-white" />
              </Pressable>
              <Text className="min-w-0 flex-1 font-sans text-xs text-gray-500 dark:text-slate-400">
                {entry.closed ? "Closed" : "Open"}
              </Text>
            </View>
            {!entry.closed ? (
              <View className="flex-row gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="mb-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                    Opens
                  </Text>
                  <TextInput
                    value={entry.open}
                    onChangeText={(value) => onChange(day, "open", value)}
                    placeholder="09:00"
                    placeholderTextColor="#9ca3af"
                    className="h-11 rounded-xl border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="mb-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                    Closes
                  </Text>
                  <TextInput
                    value={entry.close}
                    onChangeText={(value) => onChange(day, "close", value)}
                    placeholder="18:00"
                    placeholderTextColor="#9ca3af"
                    className="h-11 rounded-xl border border-gray-300 bg-white px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function SectionHeading({
  tab,
  t,
}: {
  tab: (typeof SETTINGS_TABS)[number];
  t: (key: string, fallback: string) => string;
}) {
  return (
    <View className="mb-6 border-b border-gray-100 pb-5 dark:border-slate-700">
      <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
        {t(tab.labelKey, tab.key)}
      </Text>
      <Text className="mt-1 font-sans text-xl font-bold text-gray-900 dark:text-white">
        {t(tab.labelKey, tab.key)}{" "}
        {t("sellerSettings.settingsSuffix", "Settings")}
      </Text>
      <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
        {t(tab.descriptionKey, "")}
      </Text>
    </View>
  );
}

function MediaUploadCard({
  title,
  description,
  imageUrl,
  icon,
  wide,
  uploading,
  onGalleryUpload,
  onCameraUpload,
}: {
  title: string;
  description: string;
  imageUrl?: string;
  icon: keyof typeof Feather.glyphMap;
  wide?: boolean;
  uploading: boolean;
  onGalleryUpload: () => void;
  onCameraUpload: () => void;
}) {
  return (
    <View className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <View
        className={`${wide ? "aspect-[3/1]" : "aspect-square"} items-center justify-center bg-gray-100 dark:bg-slate-900`}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="h-full w-full"
            resizeMode={wide ? "cover" : "contain"}
          />
        ) : (
          <View className="items-center gap-2">
            <Feather name={icon} color="#94a3b8" size={32} />
            <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
              No file uploaded
            </Text>
          </View>
        )}
      </View>
      <View className="gap-3 p-4">
        <View>
          <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
            {title}
          </Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
            {description}
          </Text>
        </View>
        <View className="gap-2 sm:flex-row">
          <Pressable
            onPress={onGalleryUpload}
            disabled={uploading}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 disabled:opacity-60"
          >
            {uploading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Feather name="folder" color="#ffffff" size={15} />
            )}
            <Text className="font-sans text-sm font-bold text-white">
              {uploading ? "Uploading..." : "Gallery"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onCameraUpload}
            disabled={uploading}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 disabled:opacity-60 dark:border-slate-600"
          >
            <Feather name="camera" color="#64748b" size={15} />
            <Text className="font-sans text-sm font-bold text-gray-700 dark:text-slate-200">
              Camera
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const isPreviewImageUrl = (url?: string) =>
  Boolean(url && /\.(png|jpe?g|webp|gif)(?:\?|#|$)/i.test(url));

const getDocumentName = (url?: string) => {
  if (!url) return "";
  const path = url.split("?")[0].split("#")[0];
  const fileName = path.split("/").filter(Boolean).pop() || "Uploaded document";
  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
};

function DocumentUploadRow({
  title,
  description,
  fileUrl,
  required,
  uploading,
  onUpload,
}: {
  title: string;
  description: string;
  fileUrl?: string;
  required: boolean;
  uploading: boolean;
  onUpload: () => void;
}) {
  const uploaded = Boolean(fileUrl);
  const imagePreview = isPreviewImageUrl(fileUrl);
  const documentName = getDocumentName(fileUrl);

  const openDocument = () => {
    if (fileUrl) void Linking.openURL(fileUrl);
  };

  return (
    <View className="gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <View className="gap-3 md:flex-row md:items-start md:justify-between">
        <View className="min-w-0 flex-1 flex-row items-start gap-3">
          <View
            className={`h-10 w-10 items-center justify-center rounded-full ${uploaded ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-slate-700"}`}
          >
            <Feather
              name={uploaded ? "check-circle" : "file-text"}
              color={uploaded ? "#16a34a" : "#64748b"}
              size={18}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
              {title}
            </Text>
            <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
              {description}
            </Text>
            <Text
              className={`mt-2 font-sans text-xs font-semibold ${
                uploaded
                  ? "text-green-600 dark:text-green-400"
                  : required
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500 dark:text-slate-400"
              }`}
            >
              {uploaded ? "Uploaded" : required ? "Required" : "Optional"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onUpload}
          disabled={uploading}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 dark:border-slate-600 disabled:opacity-60"
        >
          {uploading ? (
            <ActivityIndicator color="#16a34a" />
          ) : (
            <Feather name="upload-cloud" color="#16a34a" size={15} />
          )}
          <Text className="font-sans text-sm font-bold text-gray-700 dark:text-slate-200">
            {uploading ? "Uploading..." : uploaded ? "Replace" : "Upload"}
          </Text>
        </Pressable>
      </View>

      {fileUrl ? (
        <View className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900">
          {imagePreview ? (
            <Image
              source={{ uri: fileUrl }}
              className="h-40 w-full bg-gray-100 dark:bg-slate-950"
              resizeMode="cover"
            />
          ) : (
            <View className="h-28 items-center justify-center gap-2 bg-gray-100 dark:bg-slate-950">
              <Feather name="file-text" color="#16a34a" size={28} />
              <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-300">
                Uploaded file
              </Text>
            </View>
          )}
          <View className="gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 font-sans text-xs font-medium text-gray-600 dark:text-slate-300"
            >
              {documentName}
            </Text>
            <Pressable
              onPress={openDocument}
              className="flex-row items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2"
            >
              <Feather name="external-link" color="#ffffff" size={14} />
              <Text className="font-sans text-xs font-bold text-white">
                Preview
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function SellerSettingsNative({
  overview,
  user,
  onRefresh,
  onLogout,
}: {
  overview: SellerDashboardOverview | null;
  user: NativeUser | null;
  onRefresh: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const store = overview?.store || null;
  const { t } = useAppTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("personal");
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [storeSaving, setStoreSaving] = useState(false);
  const [nrcSaving, setNrcSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsForm>(() =>
    initialSettingsForm(store),
  );
  const [profile, setProfile] = useState(() => initialProfileForm(user));
  const [storeForm, setStoreForm] = useState<StoreForm>(() =>
    initialStoreForm(store),
  );
  const [identity, setIdentity] = useState<IdentityForm>(() =>
    initialIdentityForm(store),
  );
  const [nrcValue, setNrcValue] = useState<NrcInputValue>(() =>
    nrcValueFromSeller(store || {}),
  );
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [businessTypes, setBusinessTypes] = useState<AdminBusinessType[]>([]);
  const [businessTypesLoading, setBusinessTypesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateSettings = async () => {
      setSettingsLoading(true);
      try {
        const remote = await fetchSellerSettings();
        if (cancelled) return;
        setSettings(mergeSettingsForm(store, remote));
      } catch {
        if (cancelled) return;
        setSettings(mergeSettingsForm(store));
      } finally {
        if (!cancelled) {
          setSettingsLoading(false);
        }
      }
    };

    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadBusinessTypes = async () => {
      setBusinessTypesLoading(true);
      try {
        const types = await fetchAdminBusinessTypes();
        if (!cancelled) setBusinessTypes(types);
      } catch (error) {
        if (!cancelled) {
          setMessage({
            type: "error",
            text: formatApiErrorMessage(
              error,
              "Failed to load business types.",
            ),
          });
        }
      } finally {
        if (!cancelled) setBusinessTypesLoading(false);
      }
    };

    void loadBusinessTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setProfile(initialProfileForm(user));
  }, [user?.id]);

  useEffect(() => {
    if (store?.id) {
      setStoreForm(initialStoreForm(store));
      setIdentity(initialIdentityForm(store));
      setNrcValue(nrcValueFromSeller(store));
    }
  }, [store?.id]);

  const activeSettings = useMemo(
    () =>
      SETTINGS_TABS.find((tab) => tab.key === activeTab) || SETTINGS_TABS[0],
    [activeTab],
  );
  const businessTypeOptions = useMemo(
    () =>
      businessTypes.map((type) => ({
        value: type.slug,
        label: type.name,
        description: type.description || undefined,
        icon: type.icon || undefined,
      })),
    [businessTypes],
  );
  const selectedBusinessType = useMemo(
    () =>
      businessTypes.find(
        (type) =>
          type.slug === storeForm.business_type ||
          type.name.toLowerCase() === storeForm.business_type.toLowerCase(),
      ) || null,
    [businessTypes, storeForm.business_type],
  );

  const setSetting = <K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const setBusinessHour = (
    day: string,
    field: "open" | "close" | "closed",
    value: string | boolean,
  ) => {
    setSettings((current) => ({
      ...current,
      business_hours: {
        ...current.business_hours,
        [day]: {
          ...(current.business_hours[day] ||
            DEFAULT_SELLER_BUSINESS_HOURS[day]),
          [field]: value,
        },
      },
    }));
  };

  const setIdentityField = <K extends keyof IdentityForm>(
    key: K,
    value: IdentityForm[K],
  ) => {
    setIdentity((current) => ({ ...current, [key]: value }));
  };

  const setStoreField = <K extends keyof StoreForm>(
    key: K,
    value: StoreForm[K],
  ) => {
    setStoreForm((current) => ({ ...current, [key]: value }));
  };

  const fileFromDocumentAsset = (
    asset: DocumentPickerAsset,
  ): NativeUploadFile => ({
    uri: asset.uri,
    name: asset.name || getUploadNameFromUri(asset.uri, "seller-document"),
    type: asset.mimeType || "application/octet-stream",
  });

  const pickDocument = async () => {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return null;
      return fileFromDocumentAsset(result.assets[0]);
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(
          error,
          "Document picker is not available. Please restart Expo Go.",
        ),
      });
      return null;
    }
  };

  const uploadStoreMedia = async (
    kind: "logo" | "banner",
    source: "gallery" | "camera",
  ) => {
    const result =
      source === "camera"
        ? await pickImageFromCamera({ allowsEditing: kind === "logo" })
        : await pickImagesFromLibrary({ allowsEditing: kind === "logo" });
    const file = result.accepted[0];
    if (!file) return;
    if (result.rejected > 0) {
      setMessage({
        type: "error",
        text: "Some images were rejected. Use JPEG, PNG, or WebP under 5 MB.",
      });
    }
    setUploading(kind);
    setMessage(null);
    try {
      if (kind === "logo") {
        await uploadSellerStoreLogo(file);
      } else {
        await uploadSellerStoreBanner(file);
      }
      await onRefresh();
      setMessage({
        type: "success",
        text: kind === "logo" ? "Store logo updated." : "Store banner updated.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(error, "Upload failed."),
      });
    } finally {
      setUploading(null);
    }
  };

  const uploadDocument = async (documentType: SellerDocumentType) => {
    const file = await pickDocument();
    if (!file) return;
    setUploading(documentType);
    setMessage(null);
    try {
      await uploadSellerVerificationDocument(documentType, file);
      await onRefresh();
      setMessage({ type: "success", text: "Verification document uploaded." });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(error, "Document upload failed."),
      });
    } finally {
      setUploading(null);
    }
  };

  const submitForVerification = async () => {
    if (!allRequiredDocumentsUploaded) {
      setMessage({
        type: "error",
        text: "Upload all required documents before submitting for verification.",
      });
      return;
    }

    setSubmittingVerification(true);
    setMessage(null);
    try {
      const result = await submitSellerDocumentsForVerification();
      await onRefresh();
      setMessage({
        type: "success",
        text: `${result.message} Review usually takes 1–3 business days.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(
          error,
          "Failed to submit documents for verification.",
        ),
      });
    } finally {
      setSubmittingVerification(false);
    }
  };

  const saveIdentity = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateSellerStoreIdentity(identity);
      await onRefresh();
      setMessage({
        type: "success",
        text: "Business and identity details updated.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(
          error,
          "Failed to update business details.",
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!profile.name.trim() || !profile.phone.trim()) {
      setMessage({ type: "error", text: "Full name and phone are required." });
      return;
    }
    setProfileSaving(true);
    setMessage(null);
    try {
      await updateSellerProfile(profile);
      await onRefresh();
      setMessage({ type: "success", text: "Profile updated!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(error, "Update failed."),
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const saveStoreProfile = async () => {
    if (!storeForm.store_name.trim()) {
      setMessage({ type: "error", text: "Store name is required." });
      return;
    }
    if (!isEnglishStoreName(storeForm.store_name)) {
      setMessage({
        type: "error",
        text: "Store name must be written in English letters, numbers, spaces, or common punctuation.",
      });
      return;
    }
    if (!storeForm.business_type.trim()) {
      setMessage({ type: "error", text: "Please select a business type." });
      return;
    }

    setStoreSaving(true);
    setMessage(null);
    try {
      await updateSellerStoreProfile(storeForm);
      await onRefresh();
      setMessage({ type: "success", text: "Store profile updated." });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(error, "Failed to update store profile."),
      });
    } finally {
      setStoreSaving(false);
    }
  };

  const saveNrc = async () => {
    if (!isNrcInputComplete(nrcValue)) {
      setMessage({
        type: "error",
        text: "Complete all NRC fields before saving.",
      });
      return;
    }

    setNrcSaving(true);
    setMessage(null);
    try {
      await updateSellerStoreIdentity(nrcValue);
      setIdentity((current) => ({ ...current, ...nrcValue }));
      await onRefresh();
      setMessage({
        type: "success",
        text: "National identity number updated.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(
          error,
          "Failed to update national identity number.",
        ),
      });
    } finally {
      setNrcSaving(false);
    }
  };

  const saveSettings = async () => {
    const payload = buildTabSettingsPayload(activeTab, settings);
    if (Object.keys(payload).length === 0) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await updateSellerSettings(payload);
      const refreshed = await fetchSellerSettings();
      setSettings(mergeSettingsForm(store, refreshed));
      await onRefresh();
      setMessage({
        type: "success",
        text: "Store settings updated successfully!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(error, "Failed to update store settings."),
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setSaving(true);
    setMessage(null);

    if (password.next !== password.confirm) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setSaving(false);
      return;
    }
    if (password.next.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      setSaving(false);
      return;
    }

    try {
      await updateSellerPassword(
        password.current,
        password.next,
        password.confirm,
      );
      setPassword({ current: "", next: "", confirm: "" });
      setMessage({ type: "success", text: "Password changed successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(error, "Failed to change password."),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteText !== "DELETE" || !user) {
      setMessage({ type: "error", text: "Please type DELETE to confirm" });
      return;
    }

    setDeleting(true);
    try {
      await deleteSellerAccount(user.id);
      await onLogout();
    } catch (error) {
      setMessage({
        type: "error",
        text: formatApiErrorMessage(error, "Failed to delete account."),
      });
      setDeleting(false);
    }
  };

  const individualStore = (store?.businessType || "")
    .toLowerCase()
    .includes("individual");
  const documentItems = [
    {
      type: "identity_document_front" as const,
      title: "Front of Identity Document",
      description:
        "Clear photo of the front side of your ID card, passport, or driving license.",
      fileUrl: store?.identityDocumentFrontUrl,
      required: true,
    },
    {
      type: "identity_document_back" as const,
      title: "Back of Identity Document",
      description: "Clear photo of the back side of your ID card or passport.",
      fileUrl: store?.identityDocumentBackUrl,
      required: true,
    },
    {
      type: "business_registration_document" as const,
      title: "Business Registration Certificate",
      description:
        "Official business registration certificate from the government authority.",
      fileUrl: store?.businessRegistrationDocumentUrl,
      required: !individualStore,
    },
    {
      type: "tax_registration_document" as const,
      title: "Tax Registration Document",
      description:
        "Tax certificate or tax registration document, if required for your business type.",
      fileUrl: store?.taxRegistrationDocumentUrl,
      required: !individualStore,
    },
    {
      type: "business_certificate" as const,
      title: "Business Certificate",
      description:
        "Additional business certificate or supporting verification document.",
      fileUrl: store?.businessCertificateUrl,
      required: false,
    },
  ];
  const requiredDocumentCount = documentItems.filter(
    (item) => item.required,
  ).length;
  const uploadedRequiredDocumentCount = documentItems.filter(
    (item) => item.required && item.fileUrl,
  ).length;
  const allRequiredDocumentsUploaded =
    uploadedRequiredDocumentCount === requiredDocumentCount;
  const verificationStatus = (store?.verificationStatus || "").toLowerCase();
  const documentsSubmitted = Boolean(store?.documentsSubmitted);
  const isVerified = verificationStatus === "verified";
  const isRejected =
    verificationStatus === "rejected" || store?.documentStatus === "rejected";
  const isUnderReview =
    documentsSubmitted &&
    !isVerified &&
    !isRejected &&
    (verificationStatus === "under_review" ||
      verificationStatus === "pending" ||
      !verificationStatus);
  const canSubmitForVerification =
    allRequiredDocumentsUploaded &&
    !documentsSubmitted &&
    !isVerified &&
    !isUnderReview;
  const verificationStatusLabel = isVerified
    ? "Verified"
    : isRejected
      ? "Rejected"
      : isUnderReview
        ? "Under admin review"
        : documentsSubmitted
          ? "Submitted"
          : allRequiredDocumentsUploaded
            ? "Ready to submit"
            : "Documents incomplete";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View className="mx-auto w-full max-w-6xl gap-6">
        <View className="rounded-2xl bg-white p-6 dark:bg-slate-800">
          <View className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <View>
              <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-white">
                Store Settings
              </Text>
              <Text className="mt-1 font-sans text-sm text-gray-600 dark:text-slate-400">
                Manage your store preferences and account settings
              </Text>
            </View>
            <View className="self-start rounded-full bg-green-100 px-3 py-1 dark:bg-green-900/30">
              <Text className="font-sans text-sm font-medium capitalize text-green-800 dark:text-green-300">
                {store?.status || "active"}
              </Text>
            </View>
          </View>
        </View>

        <StatusToast message={message} onClose={() => setMessage(null)} />

        <View className="overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
          <View className="border-b border-gray-200 p-2 dark:border-slate-700">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-1"
            >
              {SETTINGS_TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    className={`flex-row items-center gap-2 rounded-xl px-4 py-2.5 ${
                      active ? "bg-green-600" : "bg-transparent"
                    }`}
                  >
                    <Feather
                      name={tab.icon}
                      color={active ? "#ffffff" : "#64748b"}
                      size={16}
                    />
                    <Text
                      className={`font-sans text-sm font-semibold ${
                        active
                          ? "text-white"
                          : "text-gray-500 dark:text-slate-400"
                      }`}
                    >
                      {t(tab.labelKey, tab.key)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View className="p-6">
            <SectionHeading tab={activeSettings} t={t} />

            {settingsLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#16a34a" />
                <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
                  Loading store settings...
                </Text>
              </View>
            ) : null}

            {!settingsLoading && activeTab === "personal" ? (
              <View className="max-w-3xl gap-4">
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Full name"
                    required
                    value={profile.name}
                    onChangeText={(value) =>
                      setProfile((p) => ({ ...p, name: value }))
                    }
                  />
                  <Field
                    label="Phone"
                    required
                    keyboardType="phone-pad"
                    value={profile.phone}
                    onChangeText={(value) =>
                      setProfile((p) => ({ ...p, phone: value }))
                    }
                  />
                </View>
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Email"
                    keyboardType="email-address"
                    value={profile.email}
                    onChangeText={(value) =>
                      setProfile((p) => ({ ...p, email: value }))
                    }
                  />
                  <NativeDateField
                    label="Date of birth"
                    value={profile.date_of_birth}
                    maximumDate={new Date().toISOString().slice(0, 10)}
                    onChange={(value) =>
                      setProfile((p) => ({ ...p, date_of_birth: value }))
                    }
                  />
                </View>
                <Field
                  label="Address"
                  value={profile.address}
                  onChangeText={(value) =>
                    setProfile((p) => ({ ...p, address: value }))
                  }
                />
                <View className="gap-4 md:flex-row">
                  <Field
                    label="City"
                    value={profile.city}
                    onChangeText={(value) =>
                      setProfile((p) => ({ ...p, city: value }))
                    }
                  />
                  <Field
                    label="State / region"
                    value={profile.state}
                    onChangeText={(value) =>
                      setProfile((p) => ({ ...p, state: value }))
                    }
                  />
                </View>
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Country"
                    value={profile.country}
                    onChangeText={(value) =>
                      setProfile((p) => ({ ...p, country: value }))
                    }
                  />
                  <Field
                    label="Postal code"
                    value={profile.postal_code}
                    onChangeText={(value) =>
                      setProfile((p) => ({ ...p, postal_code: value }))
                    }
                  />
                </View>
                <View className="items-end">
                  <Pressable
                    onPress={saveProfile}
                    disabled={profileSaving}
                    className="flex-row items-center gap-2 rounded-xl bg-green-500 px-6 py-3 disabled:opacity-60"
                  >
                    {profileSaving ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Feather name="save" color="#ffffff" size={16} />
                    )}
                    <Text className="font-sans text-sm font-medium text-white">
                      {profileSaving ? "Saving..." : "Save changes"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {!settingsLoading && activeTab === "store" ? (
              <View className="max-w-4xl gap-6">
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Store name"
                    required
                    value={storeForm.store_name}
                    onChangeText={(value) => setStoreField("store_name", value)}
                  />
                  <SelectPickerNative
                    label="Business type"
                    required
                    value={storeForm.business_type}
                    options={businessTypeOptions}
                    placeholder={
                      businessTypesLoading
                        ? "Loading business types..."
                        : "Select business type"
                    }
                    disabled={businessTypesLoading || storeSaving}
                    onChange={(value) => setStoreField("business_type", value)}
                  />
                </View>
                <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                  Store name accepts English letters, numbers, spaces, and
                  common punctuation only.
                </Text>
                {selectedBusinessType ? (
                  <View className="flex-row items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800/40">
                      <Feather
                        name={
                          selectedBusinessType.icon === "user"
                            ? "user"
                            : selectedBusinessType.icon === "truck"
                              ? "truck"
                              : selectedBusinessType.icon === "users"
                                ? "users"
                                : "briefcase"
                        }
                        color="#2563eb"
                        size={17}
                      />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {selectedBusinessType.name}
                      </Text>
                      {selectedBusinessType.description ? (
                        <Text className="mt-0.5 font-sans text-xs leading-5 text-blue-700 dark:text-blue-300">
                          {selectedBusinessType.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
                <Field
                  label="Store description"
                  multiline
                  value={storeForm.store_description}
                  onChangeText={(value) =>
                    setStoreField("store_description", value)
                  }
                />
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Contact email"
                    keyboardType="email-address"
                    value={storeForm.contact_email}
                    onChangeText={(value) =>
                      setStoreField("contact_email", value)
                    }
                  />
                  <Field
                    label="Contact phone"
                    keyboardType="phone-pad"
                    value={storeForm.contact_phone}
                    onChangeText={(value) =>
                      setStoreField("contact_phone", value)
                    }
                  />
                </View>
                <Field
                  label="Website"
                  value={storeForm.website}
                  onChangeText={(value) => setStoreField("website", value)}
                />
                <Field
                  label="Address"
                  value={storeForm.address}
                  onChangeText={(value) => setStoreField("address", value)}
                />
                <View className="gap-4 md:flex-row">
                  <MyanmarRegionPicker
                    label="State / region"
                    value={storeForm.state}
                    onChange={(value) => setStoreField("state", value)}
                  />
                  <Field
                    label="City"
                    value={storeForm.city}
                    onChangeText={(value) => setStoreField("city", value)}
                  />
                </View>
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Country"
                    value={storeForm.country}
                    onChangeText={(value) => setStoreField("country", value)}
                  />
                  <Field
                    label="Postal code"
                    value={storeForm.postal_code}
                    onChangeText={(value) =>
                      setStoreField("postal_code", value)
                    }
                  />
                </View>
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Business registration number"
                    value={storeForm.business_registration_number}
                    onChangeText={(value) =>
                      setStoreField("business_registration_number", value)
                    }
                  />
                  <Field
                    label="Tax ID"
                    value={storeForm.tax_id}
                    onChangeText={(value) => setStoreField("tax_id", value)}
                  />
                </View>
                <Field
                  label="Account number"
                  value={storeForm.account_number}
                  onChangeText={(value) =>
                    setStoreField("account_number", value)
                  }
                />

                <View className="gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                  <View>
                    <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">
                      National Identity Number (NRC)
                    </Text>
                    <Text className="mt-1 font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                      Current NRC: {store?.nrcFull || "Not provided"}
                      {store?.nrcVerificationStatus
                        ? ` - ${store.nrcVerificationStatus}`
                        : ""}
                    </Text>
                  </View>
                  <NrcInputNative
                    value={nrcValue}
                    onChange={setNrcValue}
                    disabled={nrcSaving}
                  />
                  <View className="items-end">
                    <Pressable
                      onPress={saveNrc}
                      disabled={nrcSaving}
                      className="flex-row items-center gap-2 rounded-xl border border-green-600 px-6 py-3 disabled:opacity-60"
                    >
                      {nrcSaving ? (
                        <ActivityIndicator color="#16a34a" />
                      ) : (
                        <Feather name="credit-card" color="#16a34a" size={16} />
                      )}
                      <Text className="font-sans text-sm font-bold text-green-700 dark:text-green-300">
                        {nrcSaving ? "Saving..." : "Save NRC"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View className="items-end">
                  <Pressable
                    onPress={saveStoreProfile}
                    disabled={storeSaving}
                    className="flex-row items-center gap-2 rounded-xl bg-green-600 px-6 py-3 disabled:opacity-60"
                  >
                    {storeSaving ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Feather name="save" color="#ffffff" size={16} />
                    )}
                    <Text className="font-sans text-sm font-bold text-white">
                      {storeSaving ? "Saving..." : "Save store profile"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {!settingsLoading && activeTab === "brand" ? (
              <View className="gap-6">
                <View className="gap-4 md:flex-row">
                  <MediaUploadCard
                    title="Store logo"
                    description="Used on seller cards, product pages, and your public store profile."
                    imageUrl={store?.logoUrl}
                    icon="image"
                    uploading={uploading === "logo"}
                    onGalleryUpload={() =>
                      void uploadStoreMedia("logo", "gallery")
                    }
                    onCameraUpload={() =>
                      void uploadStoreMedia("logo", "camera")
                    }
                  />
                  <MediaUploadCard
                    title="Store banner"
                    description="Wide cover image shown at the top of your seller profile."
                    imageUrl={store?.bannerUrl}
                    icon="layout"
                    wide
                    uploading={uploading === "banner"}
                    onGalleryUpload={() =>
                      void uploadStoreMedia("banner", "gallery")
                    }
                    onCameraUpload={() =>
                      void uploadStoreMedia("banner", "camera")
                    }
                  />
                </View>

                <View className="gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                  <View>
                    <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">
                      Business details
                    </Text>
                    <Text className="mt-1 font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                      Keep registration, tax, payout, and national identity
                      details up to date for verification review.
                    </Text>
                  </View>
                  <View className="gap-4 md:flex-row">
                    <Field
                      label="Business registration number"
                      value={identity.business_registration_number}
                      onChangeText={(value) =>
                        setIdentityField("business_registration_number", value)
                      }
                    />
                    <Field
                      label="Tax ID"
                      value={identity.tax_id}
                      onChangeText={(value) =>
                        setIdentityField("tax_id", value)
                      }
                    />
                  </View>
                  <View className="gap-4 md:flex-row">
                    <Field
                      label="Website"
                      value={identity.website}
                      onChangeText={(value) =>
                        setIdentityField("website", value)
                      }
                    />
                    <Field
                      label="Account number"
                      value={identity.account_number}
                      onChangeText={(value) =>
                        setIdentityField("account_number", value)
                      }
                    />
                  </View>
                  <View className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <View className="mb-4 flex-row items-start gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <Feather name="credit-card" color="#16a34a" size={18} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                          National Identity Number (NRC)
                        </Text>
                        <Text className="mt-1 font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                          Current NRC: {store?.nrcFull || "Not provided"}
                          {store?.nrcVerificationStatus
                            ? ` - ${store.nrcVerificationStatus}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                    <View className="gap-4 md:flex-row">
                      <Field
                        label="Division"
                        value={identity.nrc_division}
                        onChangeText={(value) =>
                          setIdentityField("nrc_division", value)
                        }
                      />
                      <Field
                        label="Township code"
                        value={identity.nrc_township_code}
                        onChangeText={(value) =>
                          setIdentityField("nrc_township_code", value)
                        }
                      />
                    </View>
                    <View className="mt-4 gap-4 md:flex-row">
                      <Field
                        label="Township MM"
                        value={identity.nrc_township_mm}
                        onChangeText={(value) =>
                          setIdentityField("nrc_township_mm", value)
                        }
                      />
                      <Field
                        label="Type"
                        value={identity.nrc_type}
                        onChangeText={(value) =>
                          setIdentityField("nrc_type", value)
                        }
                      />
                      <Field
                        label="Number"
                        keyboardType="numeric"
                        value={identity.nrc_number}
                        onChangeText={(value) =>
                          setIdentityField("nrc_number", value)
                        }
                      />
                    </View>
                  </View>
                  <View className="items-end">
                    <Pressable
                      onPress={saveIdentity}
                      disabled={saving}
                      className="flex-row items-center gap-2 rounded-xl bg-green-600 px-6 py-3 disabled:opacity-60"
                    >
                      {saving ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Feather name="save" color="#ffffff" size={16} />
                      )}
                      <Text className="font-sans text-sm font-bold text-white">
                        {saving ? "Saving..." : "Save business details"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View className="gap-4">
                  <View>
                    <Text className="font-sans text-base font-bold text-gray-900 dark:text-slate-100">
                      Verification documents
                    </Text>
                    <Text className="mt-1 font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                      Upload identity and business files for admin verification.
                      PDF, JPG, PNG, and WEBP are supported.
                    </Text>
                  </View>
                  <View
                    className={`rounded-xl border p-4 ${
                      allRequiredDocumentsUploaded
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                        : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                    }`}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full ${
                          allRequiredDocumentsUploaded
                            ? "bg-green-100 dark:bg-green-900/40"
                            : "bg-amber-100 dark:bg-amber-900/40"
                        }`}
                      >
                        <Feather
                          name={
                            allRequiredDocumentsUploaded
                              ? "check-circle"
                              : "alert-circle"
                          }
                          color={
                            allRequiredDocumentsUploaded ? "#16a34a" : "#d97706"
                          }
                          size={18}
                        />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          className={`font-sans text-sm font-bold ${
                            allRequiredDocumentsUploaded
                              ? "text-green-800 dark:text-green-200"
                              : "text-amber-800 dark:text-amber-200"
                          }`}
                        >
                          Required documents: {uploadedRequiredDocumentCount}/
                          {requiredDocumentCount} uploaded
                        </Text>
                        <Text
                          className={`mt-1 font-sans text-xs leading-5 ${
                            allRequiredDocumentsUploaded
                              ? "text-green-700 dark:text-green-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {allRequiredDocumentsUploaded
                            ? "All required verification files are available for review."
                            : "Upload the missing required files so admins can verify the store without delay."}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {documentItems.map((item) => (
                    <DocumentUploadRow
                      key={item.type}
                      title={item.title}
                      description={item.description}
                      fileUrl={item.fileUrl}
                      required={item.required}
                      uploading={uploading === item.type}
                      onUpload={() => void uploadDocument(item.type)}
                    />
                  ))}

                  <View
                    className={`rounded-xl border p-4 ${
                      isVerified
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                        : isRejected
                          ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                          : isUnderReview
                            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                            : "border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/40"
                    }`}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full ${
                          isVerified
                            ? "bg-green-100 dark:bg-green-900/40"
                            : isRejected
                              ? "bg-red-100 dark:bg-red-900/40"
                              : isUnderReview
                                ? "bg-blue-100 dark:bg-blue-900/40"
                                : "bg-gray-100 dark:bg-slate-700"
                        }`}
                      >
                        <Feather
                          name={
                            isVerified
                              ? "award"
                              : isRejected
                                ? "x-circle"
                                : isUnderReview
                                  ? "clock"
                                  : "send"
                          }
                          color={
                            isVerified
                              ? "#16a34a"
                              : isRejected
                                ? "#dc2626"
                                : isUnderReview
                                  ? "#2563eb"
                                  : "#64748b"
                          }
                          size={18}
                        />
                      </View>
                      <View className="min-w-0 flex-1 gap-2">
                        <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
                          Verification status: {verificationStatusLabel}
                        </Text>
                        {store?.documentsSubmittedAt ? (
                          <Text className="font-sans text-xs leading-5 text-gray-500 dark:text-slate-400">
                            Submitted{" "}
                            {new Date(
                              store.documentsSubmittedAt,
                            ).toLocaleString()}
                          </Text>
                        ) : null}
                        {isRejected && store?.documentRejectionReason ? (
                          <Text className="font-sans text-xs leading-5 text-red-700 dark:text-red-300">
                            Rejection reason: {store.documentRejectionReason}
                          </Text>
                        ) : null}
                        {isUnderReview ? (
                          <Text className="font-sans text-xs leading-5 text-blue-700 dark:text-blue-300">
                            Your documents are in the admin verification queue.
                            You will be notified when review is complete.
                          </Text>
                        ) : null}
                        {canSubmitForVerification ? (
                          <Text className="font-sans text-xs leading-5 text-gray-600 dark:text-slate-300">
                            All required files are uploaded. Submit them to
                            admin for KYC review.
                          </Text>
                        ) : null}
                        {!canSubmitForVerification &&
                        !isUnderReview &&
                        !isVerified &&
                        !isRejected &&
                        !allRequiredDocumentsUploaded ? (
                          <Text className="font-sans text-xs leading-5 text-gray-600 dark:text-slate-300">
                            Complete the required uploads above, then submit for
                            verification.
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {canSubmitForVerification ? (
                      <Pressable
                        onPress={() => void submitForVerification()}
                        disabled={submittingVerification}
                        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 disabled:opacity-60"
                      >
                        {submittingVerification ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Feather name="send" color="#ffffff" size={16} />
                        )}
                        <Text className="font-sans text-sm font-bold text-white">
                          {submittingVerification
                            ? "Submitting..."
                            : "Submit for verification"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}

            {!settingsLoading && activeTab === "general" ? (
              <View className="gap-5">
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Return policy"
                    multiline
                    value={settings.return_policy}
                    onChangeText={(value) => setSetting("return_policy", value)}
                  />
                  <Field
                    label="Shipping policy"
                    multiline
                    value={settings.shipping_policy}
                    onChangeText={(value) =>
                      setSetting("shipping_policy", value)
                    }
                  />
                </View>
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Warranty policy"
                    multiline
                    value={settings.warranty_policy}
                    onChangeText={(value) =>
                      setSetting("warranty_policy", value)
                    }
                  />
                  <Field
                    label="Privacy policy"
                    multiline
                    value={settings.privacy_policy}
                    onChangeText={(value) =>
                      setSetting("privacy_policy", value)
                    }
                  />
                </View>
                <Field
                  label="Terms of service"
                  multiline
                  value={settings.terms_of_service}
                  onChangeText={(value) =>
                    setSetting("terms_of_service", value)
                  }
                />
                <ToggleRow
                  title="Show sold out products"
                  description="Keep unavailable products visible on your store."
                  value={settings.show_sold_out}
                  onValueChange={(value) => setSetting("show_sold_out", value)}
                />
                <ToggleRow
                  title="Show reviews"
                  description="Display customer ratings and reviews on public pages."
                  value={settings.show_reviews}
                  onValueChange={(value) => setSetting("show_reviews", value)}
                />
                <ToggleRow
                  title="Show inventory count"
                  description="Let buyers see remaining stock quantity."
                  value={settings.show_inventory_count}
                  onValueChange={(value) =>
                    setSetting("show_inventory_count", value)
                  }
                />
                <ToggleRow
                  title="Business hours enabled"
                  description="Use business hours on your public profile."
                  value={settings.business_hours_enabled}
                  onValueChange={(value) =>
                    setSetting("business_hours_enabled", value)
                  }
                />
                {settings.business_hours_enabled ? (
                  <View className="gap-3">
                    <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                      Weekly business hours
                    </Text>
                    <BusinessHoursEditor
                      hours={settings.business_hours}
                      onChange={setBusinessHour}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            {!settingsLoading && activeTab === "payment" ? (
              <View className="max-w-3xl gap-5">
                <View className="gap-4 md:flex-row">
                  <Field
                    label="Withdrawal threshold"
                    keyboardType="numeric"
                    value={String(settings.withdrawal_threshold)}
                    onChangeText={(value) =>
                      setSetting("withdrawal_threshold", Number(value) || 0)
                    }
                  />
                  <Field
                    label="Currency"
                    value={settings.currency}
                    onChangeText={(value) => setSetting("currency", value)}
                  />
                </View>
                <View>
                  <Text className="mb-2 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                    Preferred payment method
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[
                      ["bank_transfer", "Bank transfer"],
                      ["wave_money", "Wave Money"],
                      ["kbz_pay", "KBZ Pay"],
                      ["mpu", "MPU"],
                      ["visa_master", "Visa / Mastercard"],
                    ].map(([key, label]) => {
                      const active = settings.preferred_payment_method === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() =>
                            setSetting("preferred_payment_method", key)
                          }
                          className={`rounded-xl border px-4 py-3 ${
                            active
                              ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                              : "border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800"
                          }`}
                        >
                          <Text
                            className={`font-sans text-sm font-semibold ${active ? "text-green-700 dark:text-green-300" : "text-gray-600 dark:text-slate-300"}`}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <ToggleRow
                  title="Auto withdrawal"
                  description="Automatically request payout when your balance reaches the threshold."
                  value={settings.auto_withdrawal}
                  onValueChange={(value) =>
                    setSetting("auto_withdrawal", value)
                  }
                />
              </View>
            ) : null}

            {!settingsLoading && activeTab === "notifications" ? (
              <View className="gap-4">
                <ToggleRow
                  title="Email notifications"
                  description="Receive general account and marketplace updates."
                  value={settings.email_notifications}
                  onValueChange={(value) =>
                    setSetting("email_notifications", value)
                  }
                />
                <ToggleRow
                  title="Order notifications"
                  description="Get notified when new orders are placed."
                  value={settings.order_notifications}
                  onValueChange={(value) =>
                    setSetting("order_notifications", value)
                  }
                />
                <ToggleRow
                  title="Inventory alerts"
                  description="Receive alerts when products are running low."
                  value={settings.inventory_alerts}
                  onValueChange={(value) =>
                    setSetting("inventory_alerts", value)
                  }
                />
                <ToggleRow
                  title="Review notifications"
                  description="Get alerts when buyers leave reviews."
                  value={settings.review_notifications}
                  onValueChange={(value) =>
                    setSetting("review_notifications", value)
                  }
                />
              </View>
            ) : null}

            {!settingsLoading && activeTab === "security" ? (
              <View className="gap-5">
                <ToggleRow
                  title="Two-Factor Authentication"
                  description="Add an extra layer of security to your account."
                  value={settings.two_factor_auth}
                  onValueChange={(value) =>
                    setSetting("two_factor_auth", value)
                  }
                />
                <ToggleRow
                  title="Login notifications"
                  description="Get notified when someone logs into your account."
                  value={settings.login_notifications}
                  onValueChange={(value) =>
                    setSetting("login_notifications", value)
                  }
                />
                <View className="mt-3 border-t border-gray-200 pt-6 dark:border-slate-700">
                  <Text className="mb-4 font-sans text-base font-medium text-gray-900 dark:text-white">
                    Change Password
                  </Text>
                  <View className="max-w-3xl gap-4">
                    <Field
                      label="Current Password"
                      secure
                      value={password.current}
                      onChangeText={(value) =>
                        setPassword((p) => ({ ...p, current: value }))
                      }
                    />
                    <Field
                      label="New Password"
                      secure
                      value={password.next}
                      onChangeText={(value) =>
                        setPassword((p) => ({ ...p, next: value }))
                      }
                    />
                    <Field
                      label="Confirm New Password"
                      secure
                      value={password.confirm}
                      onChangeText={(value) =>
                        setPassword((p) => ({ ...p, confirm: value }))
                      }
                    />
                    <View className="items-end">
                      <Pressable
                        onPress={changePassword}
                        disabled={saving}
                        className="flex-row items-center gap-2 rounded-xl bg-green-500 px-6 py-3 disabled:opacity-60"
                      >
                        {saving ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Feather name="key" color="#ffffff" size={16} />
                        )}
                        <Text className="font-sans text-sm font-medium text-white">
                          {saving ? "Changing..." : "Change Password"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {!settingsLoading && activeTab === "account" ? (
              <View className="gap-5">
                <ToggleRow
                  title="Store Active"
                  description="Enable or disable your store temporarily."
                  value={settings.is_active}
                  onValueChange={(value) => setSetting("is_active", value)}
                />
                <ToggleRow
                  title="Vacation Mode"
                  description="Pause orders and show vacation message."
                  value={settings.vacation_mode}
                  onValueChange={(value) => setSetting("vacation_mode", value)}
                />
                {settings.vacation_mode ? (
                  <View className="gap-4">
                    <Field
                      label="Vacation Message"
                      multiline
                      value={settings.vacation_message}
                      onChangeText={(value) =>
                        setSetting("vacation_message", value)
                      }
                    />
                    <View className="gap-4 md:flex-row">
                      <NativeDateField
                        label="Start Date"
                        value={settings.vacation_start_date}
                        onChange={(value) =>
                          setSetting("vacation_start_date", value)
                        }
                      />
                      <NativeDateField
                        label="End Date"
                        value={settings.vacation_end_date}
                        minimumDate={settings.vacation_start_date || undefined}
                        onChange={(value) =>
                          setSetting("vacation_end_date", value)
                        }
                      />
                    </View>
                  </View>
                ) : null}
                <View className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                  <View className="flex-row items-start gap-3">
                    <Feather name="trash-2" color="#ef4444" size={20} />
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans text-lg font-medium text-red-800 dark:text-red-300">
                        Delete Account
                      </Text>
                      <Text className="mt-1 font-sans text-sm leading-6 text-red-700 dark:text-red-400">
                        This will permanently delete your seller account and all
                        associated data. This action cannot be undone.
                      </Text>
                      <Pressable
                        onPress={() => setDeleteOpen(true)}
                        className="mt-4 self-start rounded-lg bg-red-600 px-4 py-2"
                      >
                        <Text className="font-sans text-sm font-medium text-white">
                          Delete My Account
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {!settingsLoading &&
            activeTab !== "personal" &&
            activeTab !== "brand" ? (
              <View className="mt-8 flex-row justify-end gap-3 border-t border-gray-200 pt-6 dark:border-slate-700">
                <Pressable
                  onPress={() => setActiveTab("personal")}
                  className="rounded-xl border border-gray-300 px-6 py-2.5 dark:border-slate-600"
                >
                  <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                    Back to Personal
                  </Text>
                </Pressable>
                <Pressable
                  onPress={saveSettings}
                  disabled={saving}
                  className="flex-row items-center gap-2 rounded-xl bg-green-500 px-6 py-2.5 disabled:opacity-60"
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Feather name="save" color="#ffffff" size={16} />
                  )}
                  <Text className="font-sans text-sm font-medium text-white">
                    {saving
                      ? "Saving..."
                      : `Save ${t(activeSettings.labelKey, activeSettings.key)} Settings`}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <Modal
          visible={deleteOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteOpen(false)}
        >
          <View className="flex-1 bg-black/60 px-4 py-12">
            <View className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <View className="items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                  <Feather name="trash-2" color="#dc2626" size={24} />
                </View>
                <Text className="mt-3 font-sans text-lg font-medium text-gray-900 dark:text-white">
                  Delete Account
                </Text>
                <Text className="mt-2 text-center font-sans text-sm leading-6 text-gray-500 dark:text-slate-400">
                  This will permanently delete your seller account, store,
                  products, and all associated data.
                </Text>
                <Text className="mt-2 font-sans text-sm font-medium text-red-600 dark:text-red-400">
                  This action cannot be undone!
                </Text>
              </View>
              <View className="mt-4">
                <Text className="mb-2 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                  Type DELETE to confirm
                </Text>
                <TextInput
                  value={deleteText}
                  onChangeText={setDeleteText}
                  className="h-12 rounded-xl border border-red-300 bg-white px-4 font-sans text-sm text-gray-900 dark:border-red-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Type DELETE here"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View className="mt-6 flex-row gap-4">
                <Pressable
                  onPress={() => {
                    setDeleteOpen(false);
                    setDeleteText("");
                  }}
                  className="flex-1 rounded-xl bg-gray-100 px-4 py-3 dark:bg-slate-700"
                >
                  <Text className="text-center font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={deleteAccount}
                  disabled={deleting || deleteText !== "DELETE"}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 disabled:opacity-50"
                >
                  <Text className="text-center font-sans text-sm font-medium text-white">
                    {deleting ? "Deleting..." : "Delete Account"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}
