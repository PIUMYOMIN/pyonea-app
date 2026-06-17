import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  formatAdminDateTime,
  getSellerDocumentUrl,
  isImageUrl,
  isPdfUrl,
  NRC_STATUS_CFG,
  STORE_STATUS_OPTS,
  VERIFICATION_STATUS_CFG,
} from "@/components/admin/admin-seller-shared";
import {
  isNrcInputComplete,
  NrcInputNative,
  nrcValueFromSeller,
  type NrcInputValue,
} from "@/components/seller/nrc-input-native";
import { OptimizedImage as Image } from "@/components/ui/optimized-image";
import { useTheme } from "@/context/theme";
import { useAppTranslation } from "@/i18n";
import {
  ApiError,
  fetchAdminVerificationReview,
  formatApiErrorMessage,
  getNativeImageUrl,
  rejectAdminSellerVerification,
  setAdminSellerQuickStatus,
  updateAdminSellerNrcDetails,
  verifyAdminSeller,
  verifyAdminSellerNrc,
  type AdminVerificationSeller,
} from "@/utils/native-api";

type ReviewTab = "info" | "nrc" | "documents" | "verify";
type ConfirmKind = "approve" | "reject" | null;

function StatusPill({
  label,
  value,
  config,
}: {
  label: string;
  value: string;
  config?: { wrap: string; text: string };
}) {
  const tone = config || {
    wrap: "bg-gray-100 dark:bg-slate-700",
    text: "text-gray-700 dark:text-slate-300",
  };
  return (
    <View className={`rounded-xl p-3 ${tone.wrap}`}>
      <Text className="font-sans text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </Text>
      <Text
        className={`mt-0.5 font-sans text-sm font-bold capitalize ${tone.text}`}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function DocCard({
  label,
  url,
  onPreview,
  notUploaded,
  open,
  preview,
  pdf,
  document,
}: {
  label: string;
  url?: string;
  onPreview?: (url: string, title: string) => void;
  notUploaded: string;
  open: string;
  preview: string;
  pdf: string;
  document: string;
}) {
  if (!url) {
    return (
      <View className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-800/50">
        <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">
          {label}
        </Text>
        <Text className="mt-1 font-sans text-xs text-gray-400 dark:text-slate-500">
          {notUploaded}
        </Text>
      </View>
    );
  }

  const isPdf = isPdfUrl(url);
  const image = isImageUrl(url);

  return (
    <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {image ? (
        <Pressable onPress={() => onPreview?.(url, label)}>
          <Image
            source={{ uri: url }}
            className="h-36 w-full"
            contentFit="cover"
          />
        </Pressable>
      ) : (
        <View className="h-24 items-center justify-center bg-gray-50 dark:bg-slate-900/40">
          <Feather
            name={isPdf ? "file-text" : "file"}
            size={28}
            color="#6366f1"
          />
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
            {isPdf ? pdf : document}
          </Text>
        </View>
      )}
      <View className="gap-2 border-t border-gray-100 p-3 dark:border-slate-700">
        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
          {label}
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => void Linking.openURL(url)}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2"
          >
            <Feather name="external-link" size={14} color="#ffffff" />
            <Text className="font-sans text-xs font-semibold text-white">
              {open}
            </Text>
          </Pressable>
          {image ? (
            <Pressable
              onPress={() => onPreview?.(url, label)}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-600"
            >
              <Feather name="maximize-2" size={14} color="#64748b" />
              <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-300">
                {preview}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function OptionPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="gap-1">
      <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700"
      >
        <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">
          {selected?.label || value}
        </Text>
        <Feather
          name="chevron-down"
          size={16}
          color={isDark ? "#cbd5e1" : "#6b7280"}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[420px] md:rounded-2xl">
            <Text className="mb-4 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {label}
            </Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-2 rounded-xl border px-4 py-3 ${
                    value === option.value
                      ? "border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-slate-700"
                  }`}
                >
                  <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NrcCard({
  seller,
  statusLabel,
  title,
  notSubmittedLabel,
  verifiedOnLabel,
}: {
  seller: AdminVerificationSeller;
  statusLabel: string;
  title: string;
  notSubmittedLabel: string;
  verifiedOnLabel: string;
}) {
  const hasNrc =
    seller.nrcDivision &&
    seller.nrcTownshipCode &&
    seller.nrcType &&
    seller.nrcNumber;
  const nrcStatus =
    NRC_STATUS_CFG[seller.nrcVerificationStatus] || NRC_STATUS_CFG.unverified;
  const displayNrc =
    seller.nrcFull ||
    (hasNrc
      ? `${seller.nrcDivision}/${seller.nrcTownshipCode}(${seller.nrcType})${seller.nrcNumber}`
      : "");

  return (
    <View className="overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-800">
      <View className="flex-row items-center justify-between bg-indigo-600 px-4 py-3 dark:bg-indigo-700">
        <View className="flex-row items-center gap-2">
          <Feather name="credit-card" size={18} color="#ffffff" />
          <Text className="font-sans text-sm font-bold uppercase tracking-wide text-white">
            {title}
          </Text>
        </View>
        <View className={`rounded-full px-2.5 py-1 ${nrcStatus.wrap}`}>
          <Text className={`font-sans text-xs font-semibold ${nrcStatus.text}`}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <View className="bg-indigo-50/60 p-4 dark:bg-indigo-950/20">
        {hasNrc ? (
          <>
            <Text className="font-mono text-xl font-bold tracking-widest text-indigo-900 dark:text-indigo-100">
              {displayNrc}
            </Text>
            {seller.nrcFullMm ? (
              <Text className="mt-1 font-sans text-base text-indigo-700 dark:text-indigo-300">
                {seller.nrcFullMm}
              </Text>
            ) : null}
          </>
        ) : (
          <Text className="font-sans text-sm italic text-gray-400 dark:text-slate-500">
            {notSubmittedLabel}
          </Text>
        )}
        {seller.nrcVerifiedAt ? (
          <Text className="mt-3 font-sans text-xs text-indigo-600 dark:text-indigo-400">
            {verifiedOnLabel}
            {seller.nrcVerificationNotes
              ? ` — ${seller.nrcVerificationNotes}`
              : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function SellerVerificationManagementNative() {
  const { t } = useAppTranslation();
  const { isDark } = useTheme();
  const [sellers, setSellers] = useState<AdminVerificationSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeller, setSelectedSeller] =
    useState<AdminVerificationSeller | null>(null);
  const [activeTab, setActiveTab] = useState<ReviewTab>("info");
  const [verificationData, setVerificationData] = useState({
    verificationLevel: "verified",
    badgeType: "verified",
    notes: "",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [confirmModal, setConfirmModal] = useState<ConfirmKind>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(
    null,
  );
  const [nrcPanel, setNrcPanel] = useState<{
    seller: AdminVerificationSeller;
    status: string;
    notes: string;
  } | null>(null);
  const [statusPanel, setStatusPanel] = useState<{
    seller: AdminVerificationSeller;
    status: string;
    reason: string;
  } | null>(null);
  const [nrcDraft, setNrcDraft] = useState<NrcInputValue>({
    nrc_division: "",
    nrc_township_code: "",
    nrc_township_mm: "",
    nrc_type: "",
    nrc_number: "",
  });
  const [nrcSaving, setNrcSaving] = useState(false);

  const nrcStatusLabel = useCallback(
    (status: string) =>
      t(
        `admin.sellerVerification.nrcStatus.${status}`,
        NRC_STATUS_CFG[status]?.label || status,
      ),
    [t],
  );

  const docLabels = useMemo(
    () => ({
      notUploaded: t(
        "admin.sellerVerification.docs.notUploaded",
        "Not uploaded",
      ),
      open: t("admin.sellerVerification.docs.open", "Open"),
      preview: t("admin.sellerVerification.docs.preview", "Preview"),
      pdf: t("admin.sellerVerification.docs.pdf", "PDF document"),
      document: t("admin.sellerVerification.docs.document", "Document"),
    }),
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAdminVerificationReview({ perPage: 50 });
      setSellers(result.sellers);
    } catch (err) {
      setError(
        formatApiErrorMessage(
          err,
          t("admin.sellerVerification.errors.load", "Failed to load queue"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedSeller) {
      setActiveTab("info");
      setNrcDraft(nrcValueFromSeller(selectedSeller));
    }
  }, [selectedSeller?.id]);

  const filteredSellers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sellers;
    return sellers.filter(
      (seller) =>
        seller.storeName.toLowerCase().includes(query) ||
        seller.contactEmail.toLowerCase().includes(query) ||
        seller.user?.name?.toLowerCase().includes(query),
    );
  }, [searchTerm, sellers]);

  const stats = useMemo(
    () => ({
      pending: sellers.filter(
        (seller) => seller.verificationStatus === "pending",
      ).length,
      underReview: sellers.filter(
        (seller) => seller.verificationStatus === "under_review",
      ).length,
      verified: sellers.filter(
        (seller) => seller.verificationStatus === "verified",
      ).length,
      rejected: sellers.filter(
        (seller) => seller.verificationStatus === "rejected",
      ).length,
    }),
    [sellers],
  );

  const formatActionError = (err: unknown) => {
    if (err instanceof ApiError) {
      const missingFields =
        err.errors && typeof err.errors === "object"
          ? Object.values(err.errors).flat()
          : [];
      if (missingFields.length)
        return `${err.message}: ${missingFields.join(", ")}`;
      return err.message;
    }
    return formatApiErrorMessage(
      err,
      t("admin.sellerVerification.errors.action", "Action failed"),
    );
  };

  const handleApprove = async () => {
    if (!selectedSeller) return;
    setActionLoading(true);
    setActionError("");
    try {
      await verifyAdminSeller(selectedSeller.id, {
        verificationLevel: verificationData.verificationLevel,
        badgeType: verificationData.badgeType,
        notes:
          verificationData.notes.trim() ||
          `Seller approved by admin on ${new Date().toLocaleDateString()}`,
      });
      setConfirmModal(null);
      setSelectedSeller(null);
      setVerificationData({
        verificationLevel: "verified",
        badgeType: "verified",
        notes: "",
      });
      setActionSuccess(
        t(
          "admin.sellerVerification.messages.verified",
          "{{name}} has been verified.",
          { name: selectedSeller.storeName },
        ),
      );
      await load();
    } catch (err) {
      setActionError(formatActionError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSeller || !rejectReason.trim()) {
      setActionError(
        t(
          "admin.sellerVerification.errors.rejectReason",
          "Please provide a rejection reason.",
        ),
      );
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      await rejectAdminSellerVerification(
        selectedSeller.id,
        rejectReason.trim(),
      );
      setConfirmModal(null);
      setSelectedSeller(null);
      setRejectReason("");
      setActionSuccess(
        t(
          "admin.sellerVerification.messages.rejected",
          "{{name}} has been rejected.",
          { name: selectedSeller.storeName },
        ),
      );
      await load();
    } catch (err) {
      setActionError(formatActionError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNrc = async () => {
    if (!selectedSeller) return;
    if (!isNrcInputComplete(nrcDraft)) {
      setActionError(
        t(
          "admin.sellerVerification.errors.nrcIncomplete",
          "Please complete all NRC fields.",
        ),
      );
      return;
    }

    setNrcSaving(true);
    setActionError("");
    try {
      const updated = await updateAdminSellerNrcDetails(selectedSeller.id, {
        nrcDivision: nrcDraft.nrc_division,
        nrcTownshipCode: nrcDraft.nrc_township_code,
        nrcTownshipMm: nrcDraft.nrc_township_mm,
        nrcType: nrcDraft.nrc_type,
        nrcNumber: nrcDraft.nrc_number,
      });

      const patch = {
        nrcDivision: updated.nrcDivision,
        nrcTownshipCode: updated.nrcTownshipCode,
        nrcTownshipMm: updated.nrcTownshipMm,
        nrcType: updated.nrcType,
        nrcNumber: updated.nrcNumber,
        nrcFull: updated.nrcFull,
        nrcFullMm: updated.nrcFullMm,
        nrcVerificationStatus: updated.nrcVerificationStatus,
      };

      setSelectedSeller((current) =>
        current ? { ...current, ...patch } : current,
      );
      setSellers((current) =>
        current.map((seller) =>
          seller.id === selectedSeller.id ? { ...seller, ...patch } : seller,
        ),
      );
      setActionSuccess(
        t("admin.sellerVerification.messages.nrcSaved", "NRC details saved."),
      );
    } catch (err) {
      setActionError(formatActionError(err));
    } finally {
      setNrcSaving(false);
    }
  };

  const handleNrcVerify = async () => {
    if (!nrcPanel) return;
    setActionLoading(true);
    setActionError("");
    try {
      await verifyAdminSellerNrc(nrcPanel.seller.id, {
        nrcVerificationStatus: nrcPanel.status,
        nrcVerificationNotes: nrcPanel.notes.trim() || undefined,
      });
      setNrcPanel(null);
      setActionSuccess(
        t(
          "admin.sellerVerification.messages.nrcUpdated",
          "NRC verification status updated.",
        ),
      );
      await load();
      if (selectedSeller?.id === nrcPanel.seller.id) {
        setSelectedSeller((current) =>
          current
            ? { ...current, nrcVerificationStatus: nrcPanel.status }
            : current,
        );
        setSellers((current) =>
          current.map((seller) =>
            seller.id === nrcPanel.seller.id
              ? { ...seller, nrcVerificationStatus: nrcPanel.status }
              : seller,
          ),
        );
      }
    } catch (err) {
      setActionError(formatActionError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetStatus = async () => {
    if (!statusPanel) return;
    setActionLoading(true);
    setActionError("");
    try {
      await setAdminSellerQuickStatus(
        statusPanel.seller.id,
        statusPanel.status,
        statusPanel.reason,
      );
      setStatusPanel(null);
      setActionSuccess(
        t(
          "admin.sellerVerification.messages.statusUpdated",
          "Seller status changed to {{status}}.",
          {
            status: statusPanel.status,
          },
        ),
      );
      await load();
    } catch (err) {
      setActionError(formatActionError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const reviewTabs: {
    id: ReviewTab;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }[] = [
    {
      id: "info",
      label: t("admin.sellerVerification.tabs.info", "Seller Info"),
      icon: "user",
    },
    {
      id: "nrc",
      label: t("admin.sellerVerification.tabs.nrc", "National ID"),
      icon: "credit-card",
    },
    {
      id: "documents",
      label: t("admin.sellerVerification.tabs.documents", "Documents"),
      icon: "file-text",
    },
    {
      id: "verify",
      label: t("admin.sellerVerification.tabs.verify", "Verify / Reject"),
      icon: "shield",
    },
  ];

  return (
    <View className="gap-5">
      {actionSuccess ? (
        <Pressable onPress={() => setActionSuccess("")}>
          <View className="flex-row items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <Feather name="check-circle" size={18} color="#16a34a" />
            <Text className="flex-1 font-sans text-sm text-green-800 dark:text-green-300">
              {actionSuccess}
            </Text>
            <Feather name="x" size={16} color="#16a34a" />
          </View>
        </Pressable>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        {[
          {
            label: t(
              "admin.sellerVerification.stats.pending",
              "Pending Review",
            ),
            value: stats.pending,
            color: "text-yellow-600",
          },
          {
            label: t(
              "admin.sellerVerification.stats.underReview",
              "Under Review",
            ),
            value: stats.underReview,
            color: "text-blue-600",
          },
          {
            label: t("admin.sellerVerification.stats.verified", "Verified"),
            value: stats.verified,
            color: "text-green-600",
          },
          {
            label: t("admin.sellerVerification.stats.rejected", "Rejected"),
            value: stats.rejected,
            color: "text-red-600",
          },
        ].map((item) => (
          <View
            key={item.label}
            className="min-w-[46%] flex-1 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 lg:min-w-[22%]"
          >
            <Text className={`font-sans text-3xl font-extrabold ${item.color}`}>
              {item.value}
            </Text>
            <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <View className="gap-3 border-b border-gray-200 p-4 dark:border-slate-700">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
                {t(
                  "admin.sellerVerification.queueTitle",
                  "Pending applications",
                )}
              </Text>
              <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-slate-400">
                {t(
                  "admin.sellerVerification.queueSubtitle",
                  "Review documents and national ID, then approve or reject",
                )}
              </Text>
            </View>
            <Pressable onPress={() => void load()} className="rounded-lg p-2">
              <Feather
                name="refresh-cw"
                size={18}
                color={isDark ? "#94a3b8" : "#6b7280"}
              />
            </Pressable>
          </View>
          <View className="relative">
            <Feather
              name="search"
              size={16}
              color="#9ca3af"
              style={{ position: "absolute", left: 12, top: 14, zIndex: 1 }}
            />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder={t(
                "admin.sellerVerification.search",
                "Search sellers…",
              )}
              placeholderTextColor="#9ca3af"
              className="h-12 rounded-xl border border-gray-300 bg-white pl-10 pr-4 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </View>
        </View>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#6366f1" size="large" />
          </View>
        ) : error ? (
          <View className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <Text className="font-sans text-sm text-red-700 dark:text-red-300">
              {error}
            </Text>
            <Pressable
              onPress={() => void load()}
              className="mt-3 self-start rounded-lg bg-red-600 px-3 py-1.5"
            >
              <Text className="font-sans text-xs font-semibold text-white">
                {t("admin.sellerVerification.retry", "Retry")}
              </Text>
            </Pressable>
          </View>
        ) : filteredSellers.length === 0 ? (
          <View className="items-center px-6 py-12">
            <Feather name="shield" size={36} color="#94a3b8" />
            <Text className="mt-3 font-sans text-sm font-semibold text-gray-500 dark:text-slate-400">
              {t(
                "admin.sellerVerification.empty",
                "No sellers in verification queue",
              )}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View className="min-w-full">
              <View className="min-w-[980px] flex-row border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                {[
                  t("admin.sellerVerification.columns.store", "Store"),
                  t("admin.sellerVerification.columns.owner", "Owner"),
                  t("admin.sellerVerification.columns.status", "Status"),
                  t("admin.sellerVerification.columns.nrc", "NRC"),
                  t("admin.sellerVerification.columns.docs", "Docs"),
                  t("admin.sellerVerification.columns.action", "Action"),
                ].map((heading) => (
                  <Text
                    key={heading}
                    className="w-40 pr-4 font-sans text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500"
                  >
                    {heading}
                  </Text>
                ))}
              </View>
              {filteredSellers.map((seller) => {
                const nrcStatus =
                  NRC_STATUS_CFG[seller.nrcVerificationStatus] ||
                  NRC_STATUS_CFG.unverified;
                const verificationTone =
                  VERIFICATION_STATUS_CFG[seller.verificationStatus];
                const docCount = [
                  seller.identityDocumentFront,
                  seller.identityDocumentBack,
                  seller.businessRegistrationDocument,
                  seller.taxRegistrationDocument,
                ].filter(Boolean).length;

                return (
                  <View
                    key={seller.id}
                    className="min-w-[980px] flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-slate-700"
                  >
                    <View className="w-40 pr-4">
                      <Text
                        className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100"
                        numberOfLines={1}
                      >
                        {seller.storeName}
                      </Text>
                      <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                        {seller.storeId || "—"}
                      </Text>
                    </View>
                    <Text
                      className="w-40 pr-4 font-sans text-sm text-gray-700 dark:text-slate-300"
                      numberOfLines={1}
                    >
                      {seller.user?.name || "Unknown"}
                    </Text>
                    <View className="w-40 pr-4">
                      <View
                        className={`self-start rounded-full px-2 py-1 ${verificationTone?.wrap || "bg-gray-100"}`}
                      >
                        <Text
                          className={`font-sans text-xs font-semibold capitalize ${verificationTone?.text || "text-gray-700"}`}
                        >
                          {seller.verificationStatus.replace(/_/g, " ")}
                        </Text>
                      </View>
                    </View>
                    <View className="w-40 pr-4">
                      <View
                        className={`self-start rounded-full px-2 py-1 ${nrcStatus.wrap}`}
                      >
                        <Text
                          className={`font-sans text-xs font-semibold ${nrcStatus.text}`}
                        >
                          {nrcStatusLabel(seller.nrcVerificationStatus)}
                        </Text>
                      </View>
                    </View>
                    <Text className="w-40 pr-4 font-sans text-sm text-gray-600 dark:text-slate-400">
                      {docCount}/4
                    </Text>
                    <View className="w-40 pr-4">
                      <Pressable
                        onPress={() => setSelectedSeller(seller)}
                        className="self-start rounded-lg bg-indigo-600 px-3 py-1.5"
                      >
                        <Text className="font-sans text-xs font-semibold text-white">
                          {t("admin.sellerVerification.review", "Review")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      <Modal
        visible={Boolean(selectedSeller)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSeller(null)}
      >
        {selectedSeller ? (
          <View className="flex-1 bg-black/50">
            <View className="mt-8 max-h-[92%] flex-1 overflow-hidden rounded-t-3xl bg-white dark:bg-slate-900 md:mx-auto md:mt-10 md:max-w-5xl md:rounded-2xl">
              <View className="flex-row items-center justify-between bg-indigo-600 px-5 py-4">
                <View className="min-w-0 flex-1">
                  <Text className="font-sans text-lg font-bold text-white">
                    {selectedSeller.storeName}
                  </Text>
                  <Text className="font-sans text-xs text-indigo-100">
                    Store ID: {selectedSeller.storeId || "—"} ·{" "}
                    {selectedSeller.user?.name || "Unknown"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedSeller(null)}
                  className="rounded-lg p-1"
                >
                  <Feather name="x" size={22} color="#ffffff" />
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="border-b border-gray-200 dark:border-slate-700"
              >
                <View className="flex-row px-2">
                  {reviewTabs.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <Pressable
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        className={`mx-1 flex-row items-center gap-2 border-b-2 px-4 py-3 ${
                          active ? "border-indigo-600" : "border-transparent"
                        }`}
                      >
                        <Feather
                          name={tab.icon}
                          size={15}
                          color={active ? "#4f46e5" : "#94a3b8"}
                        />
                        <Text
                          className={`font-sans text-sm font-semibold ${active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-slate-400"}`}
                        >
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <ScrollView
                className="flex-1 p-5"
                contentContainerClassName="pb-8"
              >
                {actionError ? (
                  <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <Text className="font-sans text-sm text-red-700 dark:text-red-300">
                      {actionError}
                    </Text>
                  </View>
                ) : null}

                {activeTab === "info" ? (
                  <View className="gap-4">
                    {[
                      [
                        t("admin.sellerVerification.fields.owner", "Owner"),
                        selectedSeller.user?.name || "Unknown",
                      ],
                      [
                        t(
                          "admin.sellerVerification.fields.email",
                          "Contact Email",
                        ),
                        selectedSeller.contactEmail,
                      ],
                      [
                        t(
                          "admin.sellerVerification.fields.phone",
                          "Contact Phone",
                        ),
                        selectedSeller.contactPhone || "—",
                      ],
                      [
                        t(
                          "admin.sellerVerification.fields.businessType",
                          "Business Type",
                        ),
                        selectedSeller.businessType || "—",
                      ],
                      [
                        t("admin.sellerVerification.fields.address", "Address"),
                        `${selectedSeller.address || "—"}, ${selectedSeller.city || "—"}, ${selectedSeller.state || ""} ${selectedSeller.country || "Myanmar"}`.trim(),
                      ],
                    ].map(([label, value]) => (
                      <View
                        key={String(label)}
                        className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/60"
                      >
                        <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                          {label}
                        </Text>
                        <Text className="mt-1 font-sans text-sm font-medium text-gray-900 dark:text-slate-100">
                          {value}
                        </Text>
                      </View>
                    ))}
                    <View className="flex-row flex-wrap gap-3">
                      <StatusPill
                        label={t(
                          "admin.sellerVerification.fields.profileStatus",
                          "Profile Status",
                        )}
                        value={selectedSeller.status}
                      />
                      <StatusPill
                        label={t(
                          "admin.sellerVerification.fields.verificationStatus",
                          "Verification Status",
                        )}
                        value={selectedSeller.verificationStatus}
                        config={
                          VERIFICATION_STATUS_CFG[
                            selectedSeller.verificationStatus
                          ]
                        }
                      />
                      <StatusPill
                        label={t(
                          "admin.sellerVerification.fields.documentStatus",
                          "Document Status",
                        )}
                        value={selectedSeller.documentStatus}
                      />
                      <StatusPill
                        label={t(
                          "admin.sellerVerification.fields.docsSubmitted",
                          "Docs Submitted",
                        )}
                        value={
                          selectedSeller.documentsSubmitted
                            ? t("admin.sellerVerification.fields.yes", "Yes")
                            : t("admin.sellerVerification.fields.no", "No")
                        }
                      />
                    </View>
                    {selectedSeller.documentsSubmittedAt ? (
                      <View className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                        <Text className="font-sans text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                          {t(
                            "admin.sellerVerification.fields.submittedAt",
                            "Documents Submitted",
                          )}
                        </Text>
                        <Text className="mt-1 font-sans text-sm text-blue-800 dark:text-blue-300">
                          {formatAdminDateTime(
                            selectedSeller.documentsSubmittedAt,
                          )}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {activeTab === "nrc" ? (
                  <View className="gap-4">
                    <NrcCard
                      seller={selectedSeller}
                      statusLabel={nrcStatusLabel(
                        selectedSeller.nrcVerificationStatus,
                      )}
                      title={t(
                        "admin.sellerVerification.nrc.cardTitle",
                        "Myanmar NRC",
                      )}
                      notSubmittedLabel={t(
                        "admin.sellerVerification.nrc.notSubmitted",
                        "NRC number not submitted",
                      )}
                      verifiedOnLabel={t(
                        "admin.sellerVerification.nrc.verifiedOn",
                        "Verified on {{date}}",
                        {
                          date: formatAdminDateTime(
                            selectedSeller.nrcVerifiedAt,
                          ),
                        },
                      )}
                    />

                    <View className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
                      <Text className="mb-3 font-sans text-sm font-semibold text-gray-800 dark:text-slate-200">
                        {t(
                          "admin.sellerVerification.nrc.editTitle",
                          "Review / correct NRC number",
                        )}
                      </Text>
                      <Text className="mb-4 font-sans text-xs text-gray-500 dark:text-slate-400">
                        {t(
                          "admin.sellerVerification.nrc.editHint",
                          "Compare the structured NRC below with the uploaded ID photos, then save before setting verification status.",
                        )}
                      </Text>
                      <NrcInputNative
                        value={nrcDraft}
                        onChange={setNrcDraft}
                        disabled={nrcSaving || actionLoading}
                      />
                      <Pressable
                        disabled={nrcSaving || actionLoading}
                        onPress={() => void handleSaveNrc()}
                        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 disabled:opacity-50"
                      >
                        {nrcSaving ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <>
                            <Feather name="save" size={16} color="#ffffff" />
                            <Text className="font-sans text-sm font-semibold text-white">
                              {t(
                                "admin.sellerVerification.nrc.saveDetails",
                                "Save NRC details",
                              )}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>

                    <View className="gap-3 md:flex-row">
                      <View className="flex-1">
                        <DocCard
                          label={t(
                            "admin.sellerVerification.docs.front",
                            "NRC Front Side",
                          )}
                          url={getSellerDocumentUrl(
                            selectedSeller,
                            "identity_document_front",
                            selectedSeller.identityDocumentFront,
                          )}
                          onPreview={(url, title) => setPreview({ url, title })}
                          {...docLabels}
                        />
                      </View>
                      <View className="flex-1">
                        <DocCard
                          label={t(
                            "admin.sellerVerification.docs.back",
                            "NRC Back Side",
                          )}
                          url={getSellerDocumentUrl(
                            selectedSeller,
                            "identity_document_back",
                            selectedSeller.identityDocumentBack,
                          )}
                          onPreview={(url, title) => setPreview({ url, title })}
                          {...docLabels}
                        />
                      </View>
                    </View>
                    <View className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/60">
                      <Text className="mb-3 font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                        {t(
                          "admin.sellerVerification.nrc.setStatus",
                          "Set NRC Verification Status",
                        )}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {["verified", "mismatch", "rejected", "pending"].map(
                          (status) => {
                            const cfg =
                              NRC_STATUS_CFG[status] ||
                              NRC_STATUS_CFG.unverified;
                            return (
                              <Pressable
                                key={status}
                                onPress={() =>
                                  setNrcPanel({
                                    seller: selectedSeller,
                                    status,
                                    notes: "",
                                  })
                                }
                                className={`rounded-xl px-3 py-2 ${cfg.wrap}`}
                              >
                                <Text
                                  className={`font-sans text-xs font-bold ${cfg.text}`}
                                >
                                  {nrcStatusLabel(status)}
                                </Text>
                              </Pressable>
                            );
                          },
                        )}
                      </View>
                      <Text className="mt-3 font-sans text-xs text-gray-400 dark:text-slate-500">
                        {t(
                          "admin.sellerVerification.nrc.statusHint",
                          "Save NRC details first, then choose a verification verdict.",
                        )}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {activeTab === "documents" ? (
                  <View className="gap-4">
                    <Text className="font-sans text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-slate-100">
                      {t(
                        "admin.sellerVerification.docs.identity",
                        "Identity Documents",
                      )}
                    </Text>
                    <View className="gap-3 md:flex-row">
                      <View className="flex-1">
                        <DocCard
                          label={t(
                            "admin.sellerVerification.docs.idFront",
                            "ID / NRC Front",
                          )}
                          url={getSellerDocumentUrl(
                            selectedSeller,
                            "identity_document_front",
                            selectedSeller.identityDocumentFront,
                          )}
                          onPreview={(url, title) => setPreview({ url, title })}
                          {...docLabels}
                        />
                      </View>
                      <View className="flex-1">
                        <DocCard
                          label={t(
                            "admin.sellerVerification.docs.idBack",
                            "ID / NRC Back",
                          )}
                          url={getSellerDocumentUrl(
                            selectedSeller,
                            "identity_document_back",
                            selectedSeller.identityDocumentBack,
                          )}
                          onPreview={(url, title) => setPreview({ url, title })}
                          {...docLabels}
                        />
                      </View>
                    </View>
                    <Text className="font-sans text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-slate-100">
                      {t(
                        "admin.sellerVerification.docs.business",
                        "Business Documents",
                      )}
                    </Text>
                    <View className="gap-3 md:flex-row">
                      <View className="flex-1">
                        <DocCard
                          label={t(
                            "admin.sellerVerification.docs.registration",
                            "Business Registration",
                          )}
                          url={getSellerDocumentUrl(
                            selectedSeller,
                            "business_registration_document",
                            selectedSeller.businessRegistrationDocument,
                          )}
                          onPreview={(url, title) => setPreview({ url, title })}
                          {...docLabels}
                        />
                      </View>
                      <View className="flex-1">
                        <DocCard
                          label={t(
                            "admin.sellerVerification.docs.tax",
                            "Tax Registration",
                          )}
                          url={getSellerDocumentUrl(
                            selectedSeller,
                            "tax_registration_document",
                            selectedSeller.taxRegistrationDocument,
                          )}
                          onPreview={(url, title) => setPreview({ url, title })}
                          {...docLabels}
                        />
                      </View>
                    </View>
                    {selectedSeller.businessCertificate ? (
                      <DocCard
                        label={t(
                          "admin.sellerVerification.docs.certificate",
                          "Business Certificate",
                        )}
                        url={getSellerDocumentUrl(
                          selectedSeller,
                          "business_certificate",
                          selectedSeller.businessCertificate,
                        )}
                        onPreview={(url, title) => setPreview({ url, title })}
                        {...docLabels}
                      />
                    ) : null}
                    {selectedSeller.additionalDocuments.map((doc, index) => (
                      <DocCard
                        key={`${doc.name}-${index}`}
                        label={doc.name}
                        url={doc.url || getNativeImageUrl(doc.path)}
                        onPreview={(url, title) => setPreview({ url, title })}
                        {...docLabels}
                      />
                    ))}
                  </View>
                ) : null}

                {activeTab === "verify" ? (
                  <View className="gap-6 md:flex-row">
                    <View className="flex-1 gap-4">
                      <OptionPicker
                        label={t(
                          "admin.sellerVerification.verify.level",
                          "Verification Level",
                        )}
                        value={verificationData.verificationLevel}
                        options={[
                          {
                            value: "basic",
                            label: t(
                              "admin.sellerVerification.verify.levels.basic",
                              "Basic",
                            ),
                          },
                          {
                            value: "verified",
                            label: t(
                              "admin.sellerVerification.verify.levels.verified",
                              "Verified",
                            ),
                          },
                          {
                            value: "premium",
                            label: t(
                              "admin.sellerVerification.verify.levels.premium",
                              "Premium",
                            ),
                          },
                        ]}
                        onChange={(value) =>
                          setVerificationData((current) => ({
                            ...current,
                            verificationLevel: value,
                          }))
                        }
                      />
                      <OptionPicker
                        label={t(
                          "admin.sellerVerification.verify.badge",
                          "Badge Type",
                        )}
                        value={verificationData.badgeType}
                        options={[
                          {
                            value: "verified",
                            label: t(
                              "admin.sellerVerification.verify.badges.verified",
                              "Verified",
                            ),
                          },
                          {
                            value: "premium",
                            label: t(
                              "admin.sellerVerification.verify.badges.premium",
                              "Premium",
                            ),
                          },
                          {
                            value: "featured",
                            label: t(
                              "admin.sellerVerification.verify.badges.featured",
                              "Featured",
                            ),
                          },
                          {
                            value: "top_rated",
                            label: t(
                              "admin.sellerVerification.verify.badges.top_rated",
                              "Top Rated",
                            ),
                          },
                        ]}
                        onChange={(value) =>
                          setVerificationData((current) => ({
                            ...current,
                            badgeType: value,
                          }))
                        }
                      />
                      <View className="gap-1">
                        <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-400">
                          {t(
                            "admin.sellerVerification.verify.notes",
                            "Approval Notes",
                          )}
                        </Text>
                        <TextInput
                          value={verificationData.notes}
                          onChangeText={(value) =>
                            setVerificationData((current) => ({
                              ...current,
                              notes: value,
                            }))
                          }
                          multiline
                          textAlignVertical="top"
                          placeholder={t(
                            "admin.sellerVerification.verify.notesPlaceholder",
                            "Optional notes for the seller…",
                          )}
                          placeholderTextColor="#9ca3af"
                          className="min-h-24 rounded-xl border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                      </View>
                      <Pressable
                        disabled={actionLoading}
                        onPress={() => {
                          setActionError("");
                          setConfirmModal("approve");
                        }}
                        className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 disabled:opacity-50"
                      >
                        <Feather
                          name="check-circle"
                          size={18}
                          color="#ffffff"
                        />
                        <Text className="font-sans text-sm font-semibold text-white">
                          {t(
                            "admin.sellerVerification.verify.submit",
                            "Verify Seller",
                          )}
                        </Text>
                      </Pressable>
                    </View>

                    <View className="flex-1 gap-4">
                      <Text className="font-sans text-sm font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
                        {t(
                          "admin.sellerVerification.reject.title",
                          "Rejection",
                        )}
                      </Text>
                      <TextInput
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        multiline
                        textAlignVertical="top"
                        placeholder={t(
                          "admin.sellerVerification.reject.placeholder",
                          "Explain clearly why this seller is being rejected…",
                        )}
                        placeholderTextColor="#9ca3af"
                        className="min-h-32 rounded-xl border border-red-200 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-red-800 dark:bg-slate-700 dark:text-slate-100"
                      />
                      <Pressable
                        disabled={actionLoading}
                        onPress={() => {
                          if (!rejectReason.trim()) {
                            setActionError(
                              t(
                                "admin.sellerVerification.errors.rejectReason",
                                "Please provide a rejection reason.",
                              ),
                            );
                            return;
                          }
                          setActionError("");
                          setConfirmModal("reject");
                        }}
                        className="flex-row items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 disabled:opacity-50"
                      >
                        <Feather name="x-circle" size={18} color="#ffffff" />
                        <Text className="font-sans text-sm font-semibold text-white">
                          {t(
                            "admin.sellerVerification.reject.submit",
                            "Reject Verification",
                          )}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          setStatusPanel({
                            seller: selectedSeller,
                            status: selectedSeller.status || "pending",
                            reason: "",
                          })
                        }
                        className="flex-row items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3"
                      >
                        <Feather name="sliders" size={18} color="#ffffff" />
                        <Text className="font-sans text-sm font-semibold text-white">
                          {t(
                            "admin.sellerVerification.status.change",
                            "Change Store Status",
                          )}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </Modal>

      <Modal
        visible={Boolean(preview)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        {preview ? (
          <View className="flex-1 bg-black/90 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="min-w-0 flex-1 font-sans text-sm font-medium text-white/90">
                {preview.title}
              </Text>
              <Pressable
                onPress={() => setPreview(null)}
                className="rounded-lg bg-white/10 px-3 py-1.5"
              >
                <Text className="font-sans text-sm font-semibold text-white">
                  {t("admin.sellerVerification.close", "Close")}
                </Text>
              </Pressable>
            </View>
            <Image
              source={{ uri: preview.url }}
              className="h-[80%] w-full"
              contentFit="contain"
            />
          </View>
        ) : null}
      </Modal>

      <Modal
        visible={Boolean(confirmModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-900">
            <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
              {confirmModal === "approve"
                ? t(
                    "admin.sellerVerification.confirm.approveTitle",
                    "Confirm Verification",
                  )
                : t(
                    "admin.sellerVerification.confirm.rejectTitle",
                    "Confirm Rejection",
                  )}
            </Text>
            <Text className="mt-2 font-sans text-sm text-gray-600 dark:text-slate-300">
              {confirmModal === "approve"
                ? t(
                    "admin.sellerVerification.confirm.approveBody",
                    "Verify {{name}} as {{level}}?",
                    {
                      name: selectedSeller?.storeName || "seller",
                      level: verificationData.verificationLevel,
                    },
                  )
                : t(
                    "admin.sellerVerification.confirm.rejectBody",
                    "Reject verification for {{name}}?",
                    {
                      name: selectedSeller?.storeName || "seller",
                    },
                  )}
            </Text>
            {actionError ? (
              <Text className="mt-3 font-sans text-sm text-red-600 dark:text-red-400">
                {actionError}
              </Text>
            ) : null}
            <View className="mt-6 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setConfirmModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600"
              >
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                  {t("admin.sellerVerification.cancel", "Cancel")}
                </Text>
              </Pressable>
              <Pressable
                disabled={actionLoading}
                onPress={() =>
                  void (confirmModal === "approve"
                    ? handleApprove()
                    : handleReject())
                }
                className={`rounded-lg px-4 py-2 ${confirmModal === "approve" ? "bg-green-600" : "bg-red-600"} disabled:opacity-50`}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="font-sans text-sm font-semibold text-white">
                    {confirmModal === "approve"
                      ? t(
                          "admin.sellerVerification.confirm.approveAction",
                          "Verify Seller",
                        )
                      : t(
                          "admin.sellerVerification.confirm.rejectAction",
                          "Reject Verification",
                        )}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(nrcPanel)}
        transparent
        animationType="fade"
        onRequestClose={() => setNrcPanel(null)}
      >
        {nrcPanel ? (
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
                {t(
                  "admin.sellerVerification.nrc.confirmTitle",
                  "Confirm NRC Status",
                )}
              </Text>
              <Text className="mt-2 font-sans text-sm text-gray-600 dark:text-slate-300">
                {t(
                  "admin.sellerVerification.nrc.confirmBody",
                  "Set NRC status to {{status}} for {{name}}?",
                  {
                    status: nrcStatusLabel(nrcPanel.status),
                    name: nrcPanel.seller.storeName,
                  },
                )}
              </Text>
              <TextInput
                value={nrcPanel.notes}
                onChangeText={(value) =>
                  setNrcPanel((current) =>
                    current ? { ...current, notes: value } : current,
                  )
                }
                placeholder={t(
                  "admin.sellerVerification.nrc.notesPlaceholder",
                  "Optional notes…",
                )}
                placeholderTextColor="#9ca3af"
                className="mt-4 min-h-20 rounded-xl border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                multiline
              />
              <View className="mt-6 flex-row justify-end gap-3">
                <Pressable
                  onPress={() => setNrcPanel(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600"
                >
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                    {t("admin.sellerVerification.cancel", "Cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={actionLoading}
                  onPress={() => void handleNrcVerify()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="font-sans text-sm font-semibold text-white">
                      {t("admin.sellerVerification.save", "Save")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>

      <Modal
        visible={Boolean(statusPanel)}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusPanel(null)}
      >
        {statusPanel ? (
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
              <Text className="font-sans text-lg font-bold text-gray-900 dark:text-slate-100">
                {t(
                  "admin.sellerVerification.status.title",
                  "Change Store Status",
                )}
              </Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {STORE_STATUS_OPTS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setStatusPanel((current) =>
                        current
                          ? { ...current, status: option.value }
                          : current,
                      )
                    }
                    className={`rounded-xl border px-3 py-2 ${
                      statusPanel.status === option.value
                        ? "border-indigo-500 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-slate-700"
                    }`}
                  >
                    <Text className="font-sans text-xs font-semibold text-gray-800 dark:text-slate-200">
                      {t(
                        `admin.sellerVerification.status.options.${option.value}`,
                        option.label,
                      )}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={statusPanel.reason}
                onChangeText={(value) =>
                  setStatusPanel((current) =>
                    current ? { ...current, reason: value } : current,
                  )
                }
                placeholder={t(
                  "admin.sellerVerification.status.reasonPlaceholder",
                  "Reason for status change…",
                )}
                placeholderTextColor="#9ca3af"
                className="mt-4 min-h-20 rounded-xl border border-gray-300 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                multiline
              />
              <View className="mt-6 flex-row justify-end gap-3">
                <Pressable
                  onPress={() => setStatusPanel(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 dark:border-slate-600"
                >
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                    {t("admin.sellerVerification.cancel", "Cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={actionLoading}
                  onPress={() => void handleSetStatus()}
                  className="rounded-lg bg-amber-500 px-4 py-2 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="font-sans text-sm font-semibold text-white">
                      {t(
                        "admin.sellerVerification.status.apply",
                        "Apply Status",
                      )}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
