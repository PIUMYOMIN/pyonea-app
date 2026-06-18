import { OptimizedImage as Image } from "@/components/ui/optimized-image";
import { ProductThumb } from "@/components/ui/product-image";
import Feather from "@expo/vector-icons/Feather";
import { Link, router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTranslation } from "@/i18n";
import {
  approveAdminProduct,
  deleteAdminProduct,
  fetchAdminProductDetail,
  fetchAdminProducts,
  formatApiErrorMessage,
  rejectAdminProduct,
  updateAdminProductActive,
  updateAdminProductFeatured,
  type AdminManagedProduct,
  type AdminProductDetail,
  type AdminProductFilters,
} from "@/utils/native-api";

const placeholderProduct = require("@/assets/images/placeholder-product.png");

type ApprovalFilter = "all" | "approved" | "pending" | "rejected";
type ActiveFilter = "all" | "active" | "inactive";
type BulkAction =
  | ""
  | "activate"
  | "deactivate"
  | "approve"
  | "reject"
  | "delete";

const PRODUCTS_PER_PAGE = 10;

const approvalTone: Record<string, { wrap: string; text: string }> = {
  approved: {
    wrap: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
  },
  pending: {
    wrap: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-300",
  },
  rejected: {
    wrap: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
  },
};

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-MM", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  tone: "blue" | "green" | "yellow" | "red";
}) {
  const colors = {
    blue: ["bg-blue-50 dark:bg-blue-900/20", "#2563eb"],
    green: ["bg-green-50 dark:bg-green-900/20", "#16a34a"],
    yellow: ["bg-yellow-50 dark:bg-yellow-900/20", "#ca8a04"],
    red: ["bg-red-50 dark:bg-red-900/20", "#dc2626"],
  } as const;
  const [bg, color] = colors[tone];

  return (
    <View className={`w-[48%] rounded-xl p-4 lg:w-[23%] ${bg}`}>
      <Feather name={icon} color={color} size={22} />
      <Text className="mt-3 font-sans text-2xl font-black text-gray-950 dark:text-slate-100">
        {value}
      </Text>
      <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">
        {label}
      </Text>
    </View>
  );
}

function ActionIconButton({
  icon,
  label,
  onPress,
  disabled,
  tone = "neutral",
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "neutral" | "indigo" | "green" | "red";
}) {
  const tones = {
    neutral: ["bg-gray-50 dark:bg-slate-700", "#64748b"],
    indigo: ["bg-indigo-50 dark:bg-indigo-900/20", "#4f46e5"],
    green: ["bg-green-50 dark:bg-green-900/20", "#16a34a"],
    red: ["bg-red-50 dark:bg-red-900/20", "#dc2626"],
  } as const;
  const [bg, color] = tones[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`h-9 w-9 items-center justify-center rounded-lg ${bg} ${disabled ? "opacity-50" : ""}`}
    >
      <Feather name={icon} color={color} size={16} />
    </Pressable>
  );
}

function ApprovalBadge({
  status,
  rejectionReason,
}: {
  status: string;
  rejectionReason?: string;
}) {
  const { t } = useAppTranslation();
  const tone = approvalTone[status] || approvalTone.pending;
  return (
    <View className="gap-1">
      <View className={`self-start rounded-full px-2.5 py-1 ${tone.wrap}`}>
        <Text
          className={`font-sans text-xs font-semibold capitalize ${tone.text}`}
        >
          {t(`admin.productManagement.table.${status}`, status)}
        </Text>
      </View>
      {rejectionReason ? (
        <Text
          className="max-w-[160px] font-sans text-[11px] text-red-600 dark:text-red-400"
          numberOfLines={2}
        >
          ↳ {rejectionReason}
        </Text>
      ) : null}
    </View>
  );
}

function StockBadge({ product }: { product: AdminManagedProduct }) {
  const { t } = useAppTranslation();
  const out = !product.inStock;
  const low =
    product.inStock && product.totalStock > 0 && product.totalStock <= 5;

  return (
    <Text
      className={`font-sans text-xs font-medium ${
        out
          ? "text-red-700 dark:text-red-300"
          : low
            ? "text-amber-700 dark:text-amber-300"
            : "text-green-700 dark:text-green-300"
      }`}
    >
      {out
        ? t("admin.productManagement.table.outOfStock", "Out of stock")
        : low
          ? t("admin.productManagement.table.lowStock", "Low stock")
          : `${product.totalStock.toLocaleString()} units`}
    </Text>
  );
}

function ProductRow({
  product,
  busyId,
  selected,
  onToggleSelect,
  onPreview,
  onToggleActive,
  onToggleFeatured,
  onApprove,
  onReject,
  onDelete,
}: {
  product: AdminManagedProduct;
  busyId: string | number | null;
  selected: boolean;
  onToggleSelect: () => void;
  onPreview: (product: AdminManagedProduct) => void;
  onToggleActive: (product: AdminManagedProduct) => void;
  onToggleFeatured: (product: AdminManagedProduct) => void;
  onApprove: (product: AdminManagedProduct) => void;
  onReject: (product: AdminManagedProduct) => void;
  onDelete: (product: AdminManagedProduct) => void;
}) {
  const { t } = useAppTranslation();
  const busy = busyId === product.id;
  const editHref = `/admin/products/${product.id}/edit` as Href;

  return (
    <View className="min-h-[84px] w-full flex-row items-center border-b border-gray-100 bg-white px-4 py-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-800">
      <Pressable onPress={onToggleSelect} className="w-10 pr-3">
        <Feather
          name={selected ? "check-square" : "square"}
          color="#64748b"
          size={16}
        />
      </Pressable>

      <View className="w-72 flex-row gap-3 pr-4">
        <ProductThumb imageUrl={product.imageUrl} size={56} />
        <View className="min-w-0 flex-1">
          <Text
            className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100"
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <Text
            className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400"
            numberOfLines={1}
          >
            {product.sellerName || "—"}
          </Text>
        </View>
      </View>

      <View className="w-28 pr-4">
        <Text
          className="font-sans text-xs text-gray-700 dark:text-slate-300"
          numberOfLines={1}
        >
          {product.sku || t("admin.productManagement.table.na", "N/A")}
        </Text>
      </View>

      <View className="w-36 pr-4">
        <Text
          className="font-sans text-xs font-semibold text-gray-900 dark:text-slate-100"
          numberOfLines={1}
        >
          {product.categoryName ||
            t("admin.productManagement.table.uncategorized", "Uncategorized")}
        </Text>
      </View>

      <View className="w-32 pr-4">
        {product.isOnSale ? (
          <>
            <Text
              className="font-sans text-sm font-bold text-red-600 dark:text-red-400"
              numberOfLines={1}
            >
              {product.salePrice}
            </Text>
            <Text
              className="font-sans text-xs text-gray-400 line-through dark:text-slate-500"
              numberOfLines={1}
            >
              {product.price}
            </Text>
          </>
        ) : (
          <Text
            className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100"
            numberOfLines={1}
          >
            {product.price}
          </Text>
        )}
      </View>

      <View className="w-28 pr-4">
        <StockBadge product={product} />
      </View>

      <View className="w-24 pr-4">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300">
          {product.discountPercentage > 0
            ? `${product.discountPercentage}%`
            : product.isOnSale
              ? t("admin.productManagement.sale", "Sale")
              : "—"}
        </Text>
      </View>

      <View className="w-24 pr-4">
        <Text className="font-sans text-xs text-gray-700 dark:text-slate-300">
          {product.moq}
        </Text>
      </View>

      <View className="w-28 pr-4">
        <Pressable
          disabled={busy}
          onPress={() => onToggleFeatured(product)}
          className={`self-start rounded-full border px-2.5 py-1 ${
            product.isFeatured
              ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30"
              : "border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <Text
            className={`font-sans text-[11px] font-semibold ${
              product.isFeatured
                ? "text-amber-700 dark:text-amber-300"
                : "text-gray-600 dark:text-slate-300"
            }`}
          >
            {product.isFeatured
              ? t("admin.productManagement.featured", "Featured")
              : t("admin.productManagement.feature", "Feature")}
          </Text>
        </Pressable>
      </View>

      <View className="w-36 pr-4">
        <ApprovalBadge
          status={product.approvalStatus}
          rejectionReason={product.rejectionReason}
        />
      </View>

      <View className="w-28 pr-4">
        <Pressable
          onPress={() => onToggleActive(product)}
          disabled={busy}
          className={`self-start rounded-full px-2.5 py-1 ${
            product.isActive
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-gray-100 dark:bg-slate-700"
          }`}
        >
          <Text
            className={`font-sans text-xs font-medium ${
              product.isActive
                ? "text-green-800 dark:text-green-300"
                : "text-gray-800 dark:text-slate-300"
            }`}
          >
            {product.isActive
              ? t("admin.productManagement.table.active", "Active")
              : t("admin.productManagement.table.inactive", "Inactive")}
          </Text>
        </Pressable>
      </View>

      <View className="w-28 pr-4">
        <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
          {formatDate(product.createdAt)}
        </Text>
      </View>

      <View className="w-72 flex-row flex-wrap items-center gap-1.5">
        <ActionIconButton
          icon="eye"
          label={t(
            "admin.productManagement.buttons.preview",
            "Preview Product",
          )}
          onPress={() => onPreview(product)}
          disabled={busy}
        />
        <ActionIconButton
          icon="edit-2"
          label={t("admin.productManagement.buttons.edit", "Edit Product")}
          onPress={() => router.push(editHref)}
          disabled={busy}
          tone="indigo"
        />
        <ActionIconButton
          icon="trash-2"
          label={t("admin.productManagement.buttons.delete", "Delete Product")}
          onPress={() => onDelete(product)}
          disabled={busy}
          tone="red"
        />
        {product.approvalStatus === "pending" ? (
          <>
            <ActionIconButton
              icon="check"
              label={t("admin.productManagement.buttons.approve", "Approve")}
              onPress={() => onApprove(product)}
              disabled={busy}
              tone="green"
            />
            <ActionIconButton
              icon="x"
              label={t("admin.productManagement.buttons.reject", "Reject")}
              onPress={() => onReject(product)}
              disabled={busy}
              tone="red"
            />
          </>
        ) : product.approvalStatus === "rejected" ? (
          <Pressable
            disabled={busy}
            onPress={() => onApprove(product)}
            className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 dark:border-green-800 dark:bg-green-900/20"
          >
            <Text className="font-sans text-[11px] font-semibold text-green-700 dark:text-green-300">
              {t("admin.productManagement.table.reApprove", "Re-approve")}
            </Text>
          </Pressable>
        ) : null}
        {product.approvalStatus === "approved" ? (
          <Pressable
            disabled={busy}
            onPress={() => onToggleActive(product)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700"
          >
            <Text className="font-sans text-[11px] font-semibold text-gray-700 dark:text-slate-300">
              {product.isActive
                ? t("admin.productManagement.table.inactive", "Inactive")
                : t("admin.productManagement.table.active", "Active")}
            </Text>
          </Pressable>
        ) : null}
        <Link href={`/products/${product.slug || product.id}` as Href} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t(
              "admin.productManagement.buttons.preview",
              "Preview Product",
            )}
            className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20"
          >
            <Feather name="external-link" color="#2563eb" size={16} />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
  danger = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  const { t } = useAppTranslation();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
          <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
            {title}
          </Text>
          <Text className="mt-2 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
            {message}
          </Text>
          <View className="mt-6 flex-row justify-end gap-3">
            <Pressable
              onPress={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 dark:border-slate-700"
            >
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                {t("admin.productManagement.modals.cancel", "Cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className={`rounded-lg px-4 py-2 ${danger ? "bg-red-600" : "bg-green-600"}`}
            >
              <Text className="font-sans text-sm font-semibold text-white">
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RejectModal({
  visible,
  productName,
  reason,
  onChangeReason,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  productName: string;
  reason: string;
  onChangeReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useAppTranslation();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 p-4">
        <View className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
          <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
            {t(
              "admin.productManagement.modals.rejectProduct",
              "Reject Product",
            )}
          </Text>
          <Text
            className="mt-1 font-sans text-sm font-semibold text-red-600 dark:text-red-400"
            numberOfLines={1}
          >
            {productName}
          </Text>
          <Text className="mt-3 font-sans text-sm text-gray-600 dark:text-slate-400">
            {t(
              "admin.productManagement.modals.rejectReason",
              "Optionally provide a reason for the seller:",
            )}
          </Text>
          <TextInput
            value={reason}
            onChangeText={onChangeReason}
            multiline
            numberOfLines={3}
            placeholder={t(
              "admin.productManagement.modals.rejectionReasonPlaceholder",
              "Rejection reason (optional)",
            )}
            placeholderTextColor="#94a3b8"
            className="mt-3 min-h-[88px] rounded-xl border border-gray-200 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <View className="mt-6 flex-row justify-end gap-3">
            <Pressable
              onPress={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 dark:border-slate-700"
            >
              <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                {t("admin.productManagement.modals.cancel", "Cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="rounded-lg bg-red-600 px-4 py-2"
            >
              <Text className="font-sans text-sm font-semibold text-white">
                {t("admin.productManagement.modals.reject", "Reject Product")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const IMAGE_TILE_WIDTH = 160;
const IMAGE_TILE_GAP = 12;

function ProductImageSlider({
  images,
}: {
  images: Array<{ url: string; isPrimary: boolean }>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < images.length - 1;

  const scrollTo = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * (IMAGE_TILE_WIDTH + IMAGE_TILE_GAP),
      animated: true,
    });
    setActiveIndex(index);
  };

  return (
    <View className="relative mb-4">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <View className="flex-row gap-3">
          {images.map((image, index) => (
            <View
              key={`${image.url}-${index}`}
              className={`h-40 w-40 overflow-hidden rounded-xl border-2 ${
                image.isPrimary
                  ? "border-green-400"
                  : "border-gray-200 dark:border-slate-600"
              }`}
            >
              <Image
                source={{ uri: image.url }}
                className="h-full w-full"
                contentFit="cover"
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {canPrev ? (
        <Pressable
          onPress={() => scrollTo(activeIndex - 1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/40 active:bg-black/60"
        >
          <Feather name="chevron-left" color="#ffffff" size={18} />
        </Pressable>
      ) : null}

      {canNext ? (
        <Pressable
          onPress={() => scrollTo(activeIndex + 1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/40 active:bg-black/60"
        >
          <Feather name="chevron-right" color="#ffffff" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ProductPreviewModal({
  product,
  loading,
  onClose,
  onApprove,
  onReject,
}: {
  product: AdminProductDetail | null;
  loading: boolean;
  onClose: () => void;
  onApprove: (product: AdminProductDetail) => void;
  onReject: (product: AdminProductDetail) => void;
}) {
  const { t, i18n } = useAppTranslation();
  if (!product) return null;

  const description =
    i18n.language === "my" && product.descriptionMm
      ? product.descriptionMm
      : product.descriptionEn || product.description;
  const images =
    product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [{ url: product.imageUrl, isPrimary: true }]
        : [];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="max-h-[90%] w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
          <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
            <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
              {t(
                "admin.productManagement.modals.productPreview",
                "Product Preview",
              )}
            </Text>
            <View className="flex-row items-center gap-2">
              {product.approvalStatus === "pending" ? (
                <>
                  <Pressable
                    onPress={() => onApprove(product)}
                    className="rounded-lg bg-green-600 px-3 py-1.5"
                  >
                    <Text className="font-sans text-xs font-semibold text-white">
                      {t("admin.productManagement.buttons.approve", "Approve")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onReject(product)}
                    className="rounded-lg bg-red-600 px-3 py-1.5"
                  >
                    <Text className="font-sans text-xs font-semibold text-white">
                      {t("admin.productManagement.buttons.reject", "Reject")}
                    </Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable onPress={onClose} className="rounded-lg p-2">
                <Feather name="x" color="#64748b" size={20} />
              </Pressable>
            </View>
          </View>

          <ScrollView className="max-h-[720px] px-5 py-4">
            {loading ? (
              <View className="mb-4 flex-row items-center justify-center py-2">
                <ActivityIndicator color="#16a34a" size="small" />
                <Text className="ml-2 font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t(
                    "admin.productManagement.modals.loadingFullDetails",
                    "Loading full details…",
                  )}
                </Text>
              </View>
            ) : null}

            {images.length > 0 ? (
              <ProductImageSlider images={images} />
            ) : (
              <View className="mb-4 h-48 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800">
                <Text className="font-sans text-sm text-gray-400 dark:text-slate-500">
                  {t("admin.productManagement.modals.noImage", "No image")}
                </Text>
              </View>
            )}

            <View className="mb-4 flex-row flex-wrap gap-2">
              <ApprovalBadge
                status={product.approvalStatus}
                rejectionReason={product.rejectionReason}
              />
              <View
                className={`rounded-full px-2.5 py-1 ${
                  product.isActive
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                <Text
                  className={`font-sans text-xs font-semibold ${
                    product.isActive
                      ? "text-green-800 dark:text-green-300"
                      : "text-red-800 dark:text-red-300"
                  }`}
                >
                  {product.isActive
                    ? t("admin.productManagement.table.active", "Active")
                    : t("admin.productManagement.table.inactive", "Inactive")}
                </Text>
              </View>
              {product.productType ? (
                <View className="rounded-full bg-blue-100 px-2.5 py-1 dark:bg-blue-900/30">
                  <Text className="font-sans text-xs font-semibold text-blue-800 dark:text-blue-300">
                    {product.productType}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
              {product.name}
            </Text>

            {description ? (
              <View className="mt-4">
                <Text className="font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t(
                    "admin.productManagement.modals.description",
                    "Description",
                  )}
                </Text>
                <Text className="mt-1 font-sans text-sm leading-6 text-gray-700 dark:text-slate-300">
                  {description}
                </Text>
              </View>
            ) : null}

            <View className="mt-4 flex-row flex-wrap gap-4">
              {[
                [
                  t("admin.productManagement.modals.sku", "SKU"),
                  product.sku || "—",
                ],
                [
                  t("admin.productManagement.modals.category", "Category"),
                  product.categoryName || "—",
                ],
                [
                  t("admin.productManagement.modals.price", "Price"),
                  product.isOnSale ? product.salePrice : product.price,
                ],
                [
                  t("admin.productManagement.modals.stock", "Stock"),
                  String(product.totalStock),
                ],
                [
                  t("admin.productManagement.modals.moq", "MOQ"),
                  String(product.moq),
                ],
                [
                  t("admin.productManagement.modals.seller", "Seller"),
                  product.sellerName || "—",
                ],
              ].map(([label, value]) => (
                <View key={String(label)} className="min-w-[140px]">
                  <Text className="font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    {label}
                  </Text>
                  <Text className="mt-1 font-sans text-sm text-gray-900 dark:text-slate-100">
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            {product.rejectionReason ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <Text className="font-sans text-xs font-semibold text-red-700 dark:text-red-300">
                  {t(
                    "admin.productManagement.modals.rejectionReason",
                    "Rejection Reason",
                  )}
                </Text>
                <Text className="mt-1 font-sans text-sm text-red-700 dark:text-red-300">
                  {product.rejectionReason}
                </Text>
              </View>
            ) : null}

            {product.variants.length > 0 ? (
              <View className="mt-4">
                <Text className="font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t("admin.productManagement.modals.variants", "Variants")} (
                  {product.variants.length})
                </Text>
                {product.variants.map((variant) => (
                  <View
                    key={String(variant.id)}
                    className="mt-2 flex-row items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-700"
                  >
                    <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                      {variant.optionLabel}
                    </Text>
                    <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                      {t("admin.productManagement.modals.qty", "Qty")}:{" "}
                      {variant.quantity}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function ProductManagementNative() {
  const { t } = useAppTranslation();
  const [products, setProducts] = useState<AdminManagedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [approveTarget, setApproveTarget] =
    useState<AdminManagedProduct | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminManagedProduct | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminManagedProduct | null>(
    null,
  );
  const [previewProduct, setPreviewProduct] =
    useState<AdminProductDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filters = useMemo<AdminProductFilters>(
    () => ({
      search: search.trim() || undefined,
      approvalStatus: approvalFilter,
      activeStatus: activeFilter,
    }),
    [activeFilter, approvalFilter, search],
  );

  const loadProducts = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError("");
      try {
        setProducts(await fetchAdminProducts(filters));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t(
                "admin.productManagement.errors.failedLoadProducts",
                "Failed to load products.",
              ),
        );
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [filters, t],
  );

  useEffect(() => {
    const timeout = setTimeout(() => void loadProducts(true), 0);
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => products.some((product) => product.id === id)),
    );
  }, [products]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, approvalFilter, activeFilter]);

  const lastPage = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return products.slice(start, start + PRODUCTS_PER_PAGE);
  }, [currentPage, products]);

  useEffect(() => {
    if (currentPage > lastPage) {
      setCurrentPage(lastPage);
    }
  }, [currentPage, lastPage]);

  const stats = useMemo(
    () => ({
      total: products.length,
      pending: products.filter(
        (product) => product.approvalStatus === "pending",
      ).length,
      approved: products.filter(
        (product) => product.approvalStatus === "approved",
      ).length,
      inactive: products.filter((product) => !product.isActive).length,
    }),
    [products],
  );

  const allSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((product) => selectedIds.includes(product.id));

  const toggleSelectAll = () => {
    const pageIds = paginatedProducts.map((product) => product.id);
    if (allSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !pageIds.includes(id)),
      );
      return;
    }
    setSelectedIds((current) => [...new Set([...current, ...pageIds])]);
  };

  const toggleSelect = (productId: string | number) => {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadProducts(false);
    setRefreshing(false);
  };

  const patchProduct = (next: AdminManagedProduct) => {
    setProducts((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    );
  };

  const removeProduct = (productId: string | number) => {
    setProducts((current) => current.filter((item) => item.id !== productId));
  };

  const openPreview = async (product: AdminManagedProduct) => {
    setPreviewProduct({
      ...product,
      descriptionEn: product.description,
      descriptionMm: "",
      productType: "",
      images: [],
      variants: [],
    });
    setPreviewLoading(true);
    try {
      const detail = await fetchAdminProductDetail(product.id);
      setPreviewProduct(detail);
    } catch {
      setError(
        t(
          "admin.productManagement.errors.failedLoadProducts",
          "Failed to load products.",
        ),
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleActive = async (product: AdminManagedProduct) => {
    const nextActive = !product.isActive;
    setBusyId(product.id);
    patchProduct({ ...product, isActive: nextActive });
    try {
      await updateAdminProductActive(product.id, nextActive);
      setMessage(
        t(
          "admin.productManagement.notifications.statusUpdated",
          "Status updated",
        ),
      );
      await loadProducts(false);
    } catch (err) {
      patchProduct(product);
      setError(
        formatApiErrorMessage(
          err,
          t("admin.productManagement.errors.unknownError", "Unknown error"),
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const toggleFeatured = async (product: AdminManagedProduct) => {
    const nextFeatured = !product.isFeatured;
    setBusyId(product.id);
    patchProduct({ ...product, isFeatured: nextFeatured });
    try {
      await updateAdminProductFeatured(product.id, nextFeatured);
      setMessage(
        nextFeatured
          ? t("admin.productManagement.featured", "Featured")
          : t(
              "admin.productManagement.notifications.statusUpdated",
              "Status updated",
            ),
      );
    } catch (err) {
      patchProduct(product);
      setError(
        formatApiErrorMessage(
          err,
          t("admin.productManagement.errors.unknownError", "Unknown error"),
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    const product = approveTarget;
    setApproveTarget(null);
    setPreviewProduct(null);
    setBusyId(product.id);
    try {
      await approveAdminProduct(product.id);
      setMessage(
        t("admin.productManagement.notifications.approved", "Product approved"),
      );
      await loadProducts(false);
    } catch (err) {
      setError(
        formatApiErrorMessage(
          err,
          t("admin.productManagement.errors.unknownError", "Unknown error"),
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const product = rejectTarget;
    const reason = rejectReason.trim();
    setRejectTarget(null);
    setRejectReason("");
    setPreviewProduct(null);
    setBusyId(product.id);
    try {
      await rejectAdminProduct(product.id, reason);
      setMessage(
        t("admin.productManagement.notifications.rejected", "Product rejected"),
      );
      await loadProducts(false);
    } catch (err) {
      setError(
        formatApiErrorMessage(
          err,
          t("admin.productManagement.errors.unknownError", "Unknown error"),
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const product = deleteTarget;
    setDeleteTarget(null);
    setBusyId(product.id);
    removeProduct(product.id);
    try {
      await deleteAdminProduct(product.id);
      setMessage(
        t("admin.productManagement.notifications.deleted", "Product deleted"),
      );
      await loadProducts(false);
    } catch (err) {
      setError(
        formatApiErrorMessage(
          err,
          t("admin.productManagement.errors.unknownError", "Unknown error"),
        ),
      );
      await loadProducts(false);
    } finally {
      setBusyId(null);
    }
  };

  const executeBulk = async () => {
    setShowBulkModal(false);
    if (!bulkAction || selectedIds.length === 0) return;

    setBusyId("bulk");
    setError("");
    try {
      await Promise.all(
        selectedIds.map(async (productId) => {
          if (bulkAction === "delete") return deleteAdminProduct(productId);
          if (bulkAction === "activate")
            return updateAdminProductActive(productId, true);
          if (bulkAction === "deactivate")
            return updateAdminProductActive(productId, false);
          if (bulkAction === "approve") return approveAdminProduct(productId);
          if (bulkAction === "reject") return rejectAdminProduct(productId);
        }),
      );
      setMessage(
        t(
          "admin.productManagement.notifications.bulkSuccessMsg",
          "{{count}} product(s) updated.",
          {
            count: selectedIds.length,
            action: bulkAction,
          },
        ),
      );
      setSelectedIds([]);
      setBulkAction("");
      await loadProducts(false);
    } catch (err) {
      setError(
        formatApiErrorMessage(
          err,
          t(
            "admin.productManagement.errors.failedBulkAction",
            "Bulk action failed",
          ),
        ),
      );
      await loadProducts(false);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
        <Text className="mt-3 font-sans text-sm text-gray-500 dark:text-slate-400">
          {t("admin.productManagement.loading", "Loading products...")}
        </Text>
      </View>
    );
  }

  const bulkOptions: Array<{ id: BulkAction; label: string }> = [
    {
      id: "activate",
      label: t(
        "admin.productManagement.bulkActions.activateSelected",
        "Activate Selected",
      ),
    },
    {
      id: "deactivate",
      label: t(
        "admin.productManagement.bulkActions.deactivateSelected",
        "Deactivate Selected",
      ),
    },
    {
      id: "approve",
      label: t(
        "admin.productManagement.bulkActions.approveSelected",
        "Approve Selected",
      ),
    },
    {
      id: "reject",
      label: t(
        "admin.productManagement.bulkActions.rejectSelected",
        "Reject Selected",
      ),
    },
    {
      id: "delete",
      label: t(
        "admin.productManagement.bulkActions.deleteSelected",
        "Delete Selected",
      ),
    },
  ];

  return (
    <View className="gap-5">
      <ConfirmModal
        visible={Boolean(approveTarget)}
        title={t(
          "admin.productManagement.modals.approveProduct",
          "Approve Product",
        )}
        message={t(
          "admin.productManagement.modals.approveConfirm",
          "Are you sure you want to approve this product? It will become visible to buyers immediately.",
        )}
        confirmLabel={t("admin.productManagement.modals.approve", "Approve")}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => void confirmApprove()}
      />
      <RejectModal
        visible={Boolean(rejectTarget)}
        productName={rejectTarget?.name || ""}
        reason={rejectReason}
        onChangeReason={setRejectReason}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        onConfirm={() => void confirmReject()}
      />
      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title={t(
          "admin.productManagement.modals.deleteProduct",
          "Delete Product",
        )}
        message={t(
          "admin.productManagement.modals.deleteConfirm",
          "Are you sure you want to delete this product? This cannot be undone.",
        )}
        confirmLabel={t("admin.productManagement.modals.delete", "Delete")}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        danger
      />
      <ConfirmModal
        visible={showBulkModal}
        title={t(
          "admin.productManagement.modals.confirmBulkAction",
          "Confirm Bulk Action",
        )}
        message={t(
          "admin.productManagement.modals.bulkConfirm",
          "Apply {{action}} to {{count}} product(s)?",
          {
            action: bulkAction,
            count: selectedIds.length,
          },
        )}
        confirmLabel={t("admin.productManagement.modals.confirm", "Confirm")}
        onClose={() => setShowBulkModal(false)}
        onConfirm={() => void executeBulk()}
        danger={bulkAction === "delete" || bulkAction === "reject"}
      />
      <ProductPreviewModal
        product={previewProduct}
        loading={previewLoading}
        onClose={() => setPreviewProduct(null)}
        onApprove={(product) => {
          setPreviewProduct(null);
          setApproveTarget(product);
        }}
        onReject={(product) => {
          setPreviewProduct(null);
          setRejectTarget(product);
          setRejectReason("");
        }}
      />

      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-950 dark:text-slate-100">
            {t("admin.productManagement.title", "Product Management")}
          </Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">
            {t(
              "admin.productManagement.subtitle",
              "Manage all products in your marketplace",
            )}
          </Text>
        </View>
        <Pressable
          onPress={() => void refresh()}
          className="flex-row items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
        >
          <Feather name="refresh-cw" color="#64748b" size={15} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
            {refreshing
              ? t("admin.productManagement.loading", "Loading products...")
              : t("admin.orderManagement.refresh", "Refresh")}
          </Text>
        </Pressable>
      </View>

      {selectedIds.length > 0 ? (
        <View className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <Text className="font-sans text-sm font-semibold text-green-800 dark:text-green-300">
            {t(
              "admin.productManagement.messages.productsSelected",
              "{{count}} product(s) selected",
              {
                count: selectedIds.length,
              },
            )}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
          >
            <View className="flex-row flex-wrap gap-2">
              {bulkOptions.map((option) => {
                const active = bulkAction === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setBulkAction(option.id)}
                    className={`rounded-full px-3 py-1.5 ${
                      active ? "bg-green-600" : "bg-white dark:bg-slate-800"
                    }`}
                  >
                    <Text
                      className={`font-sans text-xs font-semibold ${
                        active
                          ? "text-white"
                          : "text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                disabled={!bulkAction || busyId === "bulk"}
                onPress={() => setShowBulkModal(true)}
                className="rounded-full bg-green-700 px-4 py-1.5 disabled:opacity-50"
              >
                <Text className="font-sans text-xs font-semibold text-white">
                  {t("admin.productManagement.bulkActions.apply", "Apply")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelectedIds([]);
                  setBulkAction("");
                }}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 dark:border-slate-600 dark:bg-slate-800"
              >
                <Text className="font-sans text-xs font-semibold text-gray-700 dark:text-slate-300">
                  {t(
                    "admin.productManagement.bulkActions.clearSelection",
                    "Clear Selection",
                  )}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      ) : null}

      {message ? (
        <Pressable
          onPress={() => setMessage("")}
          className="flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
        >
          <Feather name="check-circle" color="#15803d" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-green-800 dark:text-green-300">
            {message}
          </Text>
        </Pressable>
      ) : null}

      {error ? (
        <Pressable
          onPress={() => setError("")}
          className="flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
        >
          <Feather name="alert-circle" color="#dc2626" size={16} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">
            {error}
          </Text>
        </Pressable>
      ) : null}

      <View className="gap-3 sm:flex-row sm:items-center">
        <View className="min-w-0 flex-1 w-full flex-row items-center rounded-xl border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
          <Feather name="search" color="#94a3b8" size={16} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t(
              "admin.productManagement.filters.searchPlaceholder",
              "Search by name, SKU...",
            )}
            placeholderTextColor="#94a3b8"
            className="min-w-0 flex-1 py-2.5 pl-2 font-sans text-sm text-gray-900 dark:text-slate-100"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-1"
      >
        <View className="flex-row gap-2 px-1">
          {(["all", "approved", "pending", "rejected"] as ApprovalFilter[]).map(
            (filter) => {
              const active = approvalFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setApprovalFilter(filter)}
                  className={`rounded-full px-4 py-2 ${active ? "bg-green-600" : "bg-gray-100 dark:bg-slate-800"}`}
                >
                  <Text
                    className={`font-sans text-sm font-semibold capitalize ${
                      active
                        ? "text-white"
                        : "text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    {filter === "all"
                      ? t(
                          "admin.productManagement.filters.allStatuses",
                          "All Statuses",
                        )
                      : t(`admin.productManagement.table.${filter}`, filter)}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-1"
      >
        <View className="flex-row gap-2 px-1">
          {(["all", "active", "inactive"] as ActiveFilter[]).map((filter) => {
            const active = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2 ${active ? "bg-slate-800 dark:bg-slate-600" : "bg-gray-100 dark:bg-slate-800"}`}
              >
                <Text
                  className={`font-sans text-sm font-semibold capitalize ${
                    active ? "text-white" : "text-gray-700 dark:text-slate-300"
                  }`}
                >
                  {filter === "all"
                    ? t("admin.productManagement.filters.all", "All")
                    : t(`admin.productManagement.table.${filter}`, filter)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="flex-row flex-wrap gap-3">
        <SummaryCard
          label={t("admin.productManagement.total", "Total")}
          value={stats.total}
          icon="box"
          tone="blue"
        />
        <SummaryCard
          label={t("admin.productManagement.pending", "Pending")}
          value={stats.pending}
          icon="clock"
          tone="yellow"
        />
        <SummaryCard
          label={t("admin.productManagement.approved", "Approved")}
          value={stats.approved}
          icon="check-circle"
          tone="green"
        />
        <SummaryCard
          label={t("admin.productManagement.table.inactive", "Inactive")}
          value={stats.inactive}
          icon="slash"
          tone="red"
        />
      </View>

      <View className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {products.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerClassName="min-w-full"
          >
            <View className="w-full min-w-[1560px]">
              <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                <Pressable onPress={toggleSelectAll} className="w-10 pr-3">
                  <Feather
                    name={allSelected ? "check-square" : "square"}
                    color="#64748b"
                    size={16}
                  />
                </Pressable>
                {[
                  {
                    label: t("admin.productManagement.table.name", "Name"),
                    width: "w-72",
                  },
                  {
                    label: t("admin.productManagement.table.sku", "SKU"),
                    width: "w-28",
                  },
                  {
                    label: t(
                      "admin.productManagement.table.category",
                      "Category",
                    ),
                    width: "w-36",
                  },
                  {
                    label: t("admin.productManagement.table.price", "Price"),
                    width: "w-32",
                  },
                  {
                    label: t("admin.productManagement.table.stock", "Stock"),
                    width: "w-28",
                  },
                  {
                    label: t(
                      "admin.productManagement.table.discount",
                      "Discount",
                    ),
                    width: "w-24",
                  },
                  {
                    label: t("admin.productManagement.table.moq", "MOQ"),
                    width: "w-24",
                  },
                  {
                    label: t("admin.productManagement.featured", "Featured"),
                    width: "w-28",
                  },
                  {
                    label: t(
                      "admin.productManagement.table.approvalStatus",
                      "Approval",
                    ),
                    width: "w-36",
                  },
                  {
                    label: t(
                      "admin.productManagement.table.activeInactive",
                      "Active",
                    ),
                    width: "w-28",
                  },
                  {
                    label: t(
                      "admin.productManagement.table.created",
                      "Created",
                    ),
                    width: "w-28",
                  },
                  {
                    label: t(
                      "admin.productManagement.table.actions",
                      "Actions",
                    ),
                    width: "w-72",
                  },
                ].map((heading) => (
                  <Text
                    key={heading.label}
                    className={`${heading.width} pr-4 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400`}
                  >
                    {heading.label}
                  </Text>
                ))}
              </View>
              {paginatedProducts.map((product) => (
                <ProductRow
                  key={String(product.id)}
                  product={product}
                  busyId={busyId}
                  selected={selectedIds.includes(product.id)}
                  onToggleSelect={() => toggleSelect(product.id)}
                  onPreview={(item) => void openPreview(item)}
                  onToggleActive={(item) => void toggleActive(item)}
                  onToggleFeatured={(item) => void toggleFeatured(item)}
                  onApprove={setApproveTarget}
                  onReject={(item) => {
                    setRejectTarget(item);
                    setRejectReason("");
                  }}
                  onDelete={setDeleteTarget}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className="items-center py-12">
            <Feather name="box" color="#cbd5e1" size={56} />
            <Text className="mt-3 font-sans text-base font-semibold text-gray-900 dark:text-white">
              {t(
                "admin.productManagement.noProductsFound",
                "No products found matching your criteria",
              )}
            </Text>
          </View>
        )}
        {products.length > 0 ? (
          <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-700/50">
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
              {t("admin.productManagement.showing", "Showing")}{" "}
              {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–
              {Math.min(currentPage * PRODUCTS_PER_PAGE, products.length)}{" "}
              {t("admin.productManagement.of", "of")} {products.length}{" "}
              {t("admin.productManagement.products", "products")}
            </Text>
            {lastPage > 1 ? (
              <View className="flex-row items-center gap-2">
                <Pressable
                  disabled={currentPage <= 1}
                  onPress={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600"
                >
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                    {t("admin.verifiedSellers.pagination.previous", "Previous")}
                  </Text>
                </Pressable>
                <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                  {t(
                    "admin.verifiedSellers.pagination.page",
                    "Page {{current}} of {{last}}",
                    {
                      current: currentPage,
                      last: lastPage,
                    },
                  )}
                </Text>
                <Pressable
                  disabled={currentPage >= lastPage}
                  onPress={() => setCurrentPage((page) => page + 1)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600"
                >
                  <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">
                    {t("admin.verifiedSellers.pagination.next", "Next")}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
