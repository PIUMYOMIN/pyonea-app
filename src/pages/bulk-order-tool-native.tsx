import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
import { SITE_CONTAINER_CLASS } from '@/constants/layout';
import { NativeDateField } from '@/components/ui/native-date-field';
import { useNativeAuth } from '@/context/native-auth';
import { useAppTranslation } from '@/i18n';
import { hasUserRole } from '@/utils/auth-routing';
import {
  addProductToCart,
  apiPost,
  fetchProductDetail,
  formatMMK,
  searchBulkOrderProducts,
  type BulkOrderProduct,
  type CartResult,
  type ProductVariant,
} from '@/utils/native-api';
import { emitCartCountChanged } from '@/utils/native-cart-events';

type BulkLine = BulkOrderProduct & {
  key: string;
  quantity: string;
  variantOptions: ProductVariant[];
  variantsLoading: boolean;
  selectedVariantId: string | number | null;
};

const STORAGE_KEY = 'pyonea_bulk_order_lines_v1';

const lineKey = () => `ln-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toPositiveInt = (value: unknown, fallback = 1) => {
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseQty = (value: unknown) => {
  const parsed = parseInt(String(value).replace(/\D/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const snapQuantity = (value: unknown, moq: number, step: number) => {
  const safeMoq = toPositiveInt(moq, 1);
  const safeStep = Math.max(toPositiveInt(step, safeMoq), safeMoq);
  let quantity = parseQty(value);
  if (quantity < safeMoq) quantity = safeMoq;
  const remainder = (quantity - safeMoq) % safeStep;
  return remainder === 0 ? quantity : quantity + (safeStep - remainder);
};

const minRfqDeadline = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const defaultRfqDeadline = () => {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date.toISOString().slice(0, 10);
};

const isWebStorageAvailable = () => Platform.OS === 'web' && typeof localStorage !== 'undefined';

const getVariantLabel = (variant: ProductVariant, fallback: string) =>
  variant.sku || `${fallback} #${String(variant.id)}`;

const getSavedBulkLines = (): BulkLine[] => {
  if (!isWebStorageAvailable()) return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as BulkLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((line) => ({
      ...line,
      key: line.key || lineKey(),
      moq: toPositiveInt(line.moq, 1),
      quantityStep: toPositiveInt(line.quantityStep, toPositiveInt(line.moq, 1)),
      quantity: String(line.quantity || line.moq || 1),
      variantOptions: Array.isArray(line.variantOptions) ? line.variantOptions : [],
      variantsLoading: false,
      selectedVariantId: line.selectedVariantId ?? null,
    }));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

function SearchResultCard({
  product,
  alreadyAdded,
  onAdd,
}: {
  product: BulkOrderProduct;
  alreadyAdded: boolean;
  onAdd: () => void;
}) {
  const { t } = useAppTranslation();

  return (
    <View className="flex-row gap-3 rounded-xl border border-gray-100 p-3 dark:border-slate-600">
      <View className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
        <Image
          source={product.imageUrl ? { uri: product.imageUrl } : require('@/assets/images/placeholder-product.png')}
          className="h-full w-full"
          contentFit="cover"
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-sm font-medium text-gray-900 dark:text-white" numberOfLines={2}>
          {product.name}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1">
          <Feather name="briefcase" color="#94a3b8" size={13} />
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
            {product.sellerLabel}
          </Text>
        </View>
        <Text className="mt-1 font-sans text-xs font-medium text-green-700 dark:text-green-400">
          {product.price} - {t('bulk_order.moq_label')} {product.moq}
          {product.quantityStep > 1 ? ` - ${t('bulk_order.step_label')} ${product.quantityStep}` : ''}
        </Text>
        {product.hasVariants ? (
          <Text className="mt-0.5 font-sans text-xs text-amber-600 dark:text-amber-400">
            {t('bulk_order.variants_label')}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onAdd}
        className={`self-center rounded-lg px-3 py-2 ${
          alreadyAdded ? 'bg-green-100 dark:bg-green-900/40' : 'bg-green-600'
        }`}>
        <View className="flex-row items-center gap-1">
          <Feather name="plus" color={alreadyAdded ? '#15803d' : '#ffffff'} size={15} />
          <Text
            className={`font-sans text-xs font-semibold ${
              alreadyAdded ? 'text-green-700 dark:text-green-300' : 'text-white'
            }`}>
            {alreadyAdded ? t('bulk_order.add_more') : t('bulk_order.add')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function BulkLineCard({
  line,
  quantityNum,
  unitPrice,
  subtotal,
  activeDiscount,
  onVariant,
  onQty,
  onSnap,
  onRemove,
}: {
  line: BulkLine;
  quantityNum: number;
  unitPrice: number;
  subtotal: number;
  activeDiscount: number;
  onVariant: (variantId: string | number | null) => void;
  onQty: (value: string) => void;
  onSnap: () => void;
  onRemove: () => void;
}) {
  const { t } = useAppTranslation();

  return (
    <View className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <View className="flex-row gap-3">
        <View className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-700">
          <Image
            source={line.imageUrl ? { uri: line.imageUrl } : require('@/assets/images/placeholder-product.png')}
            className="h-full w-full"
            contentFit="cover"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-white" numberOfLines={2}>
            {line.name}
          </Text>
          <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
            {line.sellerLabel}
          </Text>
          {line.slug ? (
            <Link href={`/products/${line.slug}`} asChild>
              <Text className="mt-1 font-sans text-[11px] text-green-600 dark:text-green-400">
                {t('bulk_order.view_product')}
              </Text>
            </Link>
          ) : null}
        </View>
        <Pressable onPress={onRemove} className="h-9 w-9 items-center justify-center rounded-lg">
          <Feather name="trash-2" color="#ef4444" size={17} />
        </Pressable>
      </View>

      {line.hasVariants ? (
        <View className="mt-3 rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
          {line.variantsLoading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#d97706" />
              <Text className="font-sans text-xs text-amber-700 dark:text-amber-300">
                {t('bulk_order.loading_variants')}
              </Text>
            </View>
          ) : line.variantOptions.length === 0 ? (
            <Text className="font-sans text-xs text-red-600 dark:text-red-400">
              {t('bulk_order.variants_unavailable')}
            </Text>
          ) : (
            <View>
              <Text className="mb-2 font-sans text-xs font-semibold text-amber-800 dark:text-amber-200">
                {t('bulk_order.col_variant')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => onVariant(null)}
                  className={`rounded-lg border px-3 py-1.5 ${
                    line.selectedVariantId == null
                      ? 'border-amber-400 bg-white dark:bg-slate-700'
                      : 'border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                  }`}>
                  <Text className="font-sans text-xs text-amber-800 dark:text-amber-200">
                    {t('bulk_order.select_variant')}
                  </Text>
                </Pressable>
                {line.variantOptions.map((variant) => {
                  const selected = String(line.selectedVariantId) === String(variant.id);
                  const disabled = variant.quantity <= 0;
                  return (
                    <Pressable
                      key={String(variant.id)}
                      disabled={disabled}
                      onPress={() => onVariant(variant.id)}
                      className={`rounded-lg border px-3 py-1.5 ${
                        selected
                          ? 'border-green-500 bg-green-50 dark:border-green-500 dark:bg-green-900/30'
                          : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-700'
                      } ${disabled ? 'opacity-40' : 'opacity-100'}`}>
                      <Text
                        className={`font-sans text-xs ${
                          selected
                            ? 'font-semibold text-green-700 dark:text-green-300'
                            : 'text-gray-700 dark:text-slate-200'
                        }`}>
                        {getVariantLabel(variant, t('bulk_order.col_variant'))}
                        {disabled ? ` (${t('bulk_order.out_of_stock')})` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      ) : null}

      <View className="mt-4 gap-3 sm:flex-row sm:items-end">
        <View className="flex-1">
          <Text className="mb-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
            {t('bulk_order.col_price')}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-white">
              {formatMMK(unitPrice)}
            </Text>
            {activeDiscount > 0 ? (
              <View className="rounded bg-green-100 px-1.5 py-0.5 dark:bg-green-900/40">
                <Text className="font-sans text-[10px] font-semibold text-green-700 dark:text-green-300">
                  -{activeDiscount}%
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View className="w-full sm:w-32">
          <Text className="mb-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
            {t('bulk_order.col_qty')}
          </Text>
          <TextInput
            value={line.quantity}
            onChangeText={onQty}
            onBlur={onSnap}
            keyboardType="number-pad"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <Text className="mt-0.5 font-sans text-[10px] text-gray-400">
            {t('bulk_order.moq_label')} {line.moq}
            {line.quantityStep > 1 ? ` - ${t('bulk_order.step_label')} ${line.quantityStep}` : ''}{' '}
            {line.unitLabel}
          </Text>
        </View>
        <View className="flex-1 sm:items-end">
          <Text className="mb-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
            {t('bulk_order.col_line')}
          </Text>
          <Text className="font-sans text-base font-bold text-gray-900 dark:text-white">
            {formatMMK(subtotal)}
          </Text>
          <Text className="font-sans text-[10px] text-gray-400">
            {quantityNum} {line.unitLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function BulkOrderToast({
  message,
  onClose,
}: {
  message: { type: 'success' | 'error'; text: string } | null;
  onClose: () => void;
}) {
  if (!message) return null;

  const isSuccess = message.type === 'success';

  return (
    <View className="pointer-events-box-none absolute left-0 right-0 top-4 z-50 items-center px-4">
      <View
        className={`w-full max-w-xl flex-row items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
          isSuccess
            ? 'border-green-200 bg-white dark:border-green-800 dark:bg-slate-900'
            : 'border-red-200 bg-white dark:border-red-800 dark:bg-slate-900'
        }`}>
        <View
          className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${
            isSuccess ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}>
          <Feather
            name={isSuccess ? 'check-circle' : 'alert-triangle'}
            color={isSuccess ? '#16a34a' : '#dc2626'}
            size={18}
          />
        </View>
        <Text
          className={`min-w-0 flex-1 font-sans text-sm leading-5 ${
            isSuccess ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
          }`}>
          {message.text}
        </Text>
        <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full">
          <Feather name="x" color={isSuccess ? '#15803d' : '#b91c1c'} size={16} />
        </Pressable>
      </View>
    </View>
  );
}

export function BulkOrderToolNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useNativeAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<BulkOrderProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [lines, setLines] = useState<BulkLine[]>(getSavedBulkLines);
  const [deadline, setDeadline] = useState(defaultRfqDeadline());
  const [buyerNotes, setBuyerNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cartSubmitting, setCartSubmitting] = useState(false);

  const isBuyer = hasUserRole(user, 'buyer');

  useEffect(() => {
    if (!isWebStorageAvailable()) return;
    if (!lines.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.map((line) => ({ ...line, variantsLoading: false }))));
  }, [lines]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const term = search.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const load = async () => {
        if (!term) {
          setResults([]);
          return;
        }
        setSearchLoading(true);
        try {
          const products = await searchBulkOrderProducts(term, controller.signal);
          if (!controller.signal.aborted) setResults(products);
        } catch {
          if (!controller.signal.aborted) setResults([]);
        } finally {
          if (!controller.signal.aborted) setSearchLoading(false);
        }
      };

      void load();
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const validatedLines = useMemo(
    () =>
      lines.map((line) => {
        const quantityNum = snapQuantity(line.quantity, line.moq, line.quantityStep);
        const tier = [...line.wholesaleTiers]
          .sort((a, b) => b.minQty - a.minQty)
          .find((item) => quantityNum >= item.minQty);
        const unitPrice = tier?.priceValue || line.basePrice;
        const subtotal = quantityNum * unitPrice;
        return {
          ...line,
          quantityNum,
          unitPrice,
          subtotal,
          activeDiscount: tier?.discountPct || 0,
          valid: Boolean(line.sellerId && line.categoryId),
        };
      }),
    [lines]
  );

  const total = validatedLines.reduce((sum, line) => sum + line.subtotal, 0);
  const bySeller = useMemo(() => {
    const map = new Map<string, { sellerId: string | number; sellerLabel: string; count: number }>();
    validatedLines.forEach((line) => {
      if (!line.sellerId) return;
      const key = String(line.sellerId);
      const existing = map.get(key);
      map.set(key, {
        sellerId: line.sellerId,
        sellerLabel: line.sellerLabel,
        count: (existing?.count || 0) + 1,
      });
    });
    return [...map.values()];
  }, [validatedLines]);

  const loadProductVariants = async (key: string, slug: string) => {
    if (!slug) return;
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, variantsLoading: true } : line))
    );

    try {
      const detail = await fetchProductDetail(slug);
      setLines((current) =>
        current.map((line) =>
          line.key === key
            ? {
                ...line,
                variantOptions: detail.variants || [],
                variantsLoading: false,
              }
            : line
        )
      );
    } catch {
      setLines((current) =>
        current.map((line) =>
          line.key === key ? { ...line, variantOptions: [], variantsLoading: false } : line
        )
      );
    }
  };

  const addProduct = (product: BulkOrderProduct) => {
    setMessage(null);
    let variantLoadKey = '';
    setLines((current) => {
      const existing = current.find((line) => String(line.id) === String(product.id));
      if (existing) {
        if (existing.hasVariants && existing.variantOptions.length === 0 && !existing.variantsLoading) {
          variantLoadKey = existing.key;
        }
        return current.map((line) =>
          String(line.id) === String(product.id)
            ? {
                ...line,
                quantity: String(parseQty(line.quantity) + line.quantityStep),
              }
            : line
        );
      }
      const key = lineKey();
      if (product.hasVariants) variantLoadKey = key;
      return [
        ...current,
        {
          ...product,
          key,
          quantity: String(product.moq),
          variantOptions: [],
          variantsLoading: product.hasVariants,
          selectedVariantId: null,
        },
      ];
    });
    if (variantLoadKey) void loadProductVariants(variantLoadKey, product.slug);
  };

  const updateVariant = (key: string, variantId: string | number | null) => {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        if (variantId == null) return { ...line, selectedVariantId: null };
        const variant = line.variantOptions.find((item) => String(item.id) === String(variantId));
        if (!variant) return { ...line, selectedVariantId: null };
        const moq = toPositiveInt(variant.moq, line.moq);
        const quantityStep = toPositiveInt(variant.quantityStep, line.quantityStep || moq);
        return {
          ...line,
          selectedVariantId: variantId,
          moq,
          quantityStep,
          basePrice: variant.priceValue || line.basePrice,
          price: variant.price || formatMMK(variant.priceValue || line.basePrice),
          imageUrl: variant.imageUrl || line.imageUrl,
          quantity: String(moq),
        };
      })
    );
  };

  const requireBuyer = (messageKey: 'bulk_order.cart_buyers_only' | 'bulk_order.rfq_buyers_only') => {
    if (!isAuthenticated) {
      router.push('/login?returnTo=/bulk-order-tool');
      return false;
    }
    if (!isBuyer) {
      setMessage({ type: 'error', text: t(messageKey) });
      return false;
    }
    return true;
  };

  const addLinesToCart = async () => {
    if (!validatedLines.length || !requireBuyer('bulk_order.cart_buyers_only')) return;
    const needsVariant = validatedLines.filter((line) => line.hasVariants && !line.selectedVariantId);
    if (needsVariant.length > 0) {
      setMessage({
        type: 'error',
        text: t('bulk_order.variant_required', { names: needsVariant.map((line) => line.name).join(', ') }),
      });
      return;
    }

    setCartSubmitting(true);
    setMessage(null);
    let added = 0;
    let lastCart: CartResult | undefined;
    try {
      for (const line of validatedLines) {
        const result = await addProductToCart(line.id, line.quantityNum, {
          variantId: line.selectedVariantId,
        });
        added += 1;
        lastCart = result.cart;
      }
      if (lastCart) {
        emitCartCountChanged({ cart: lastCart });
      }
      setMessage({ type: 'success', text: t('bulk_order.cart_added', { count: added }) });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : t('bulk_order.cart_partial'),
      });
    } finally {
      setCartSubmitting(false);
    }
  };

  const buildSummaryText = () => {
    const head = t('bulk_order.summary_head', { deadline });
    const body = validatedLines
      .map(
        (line) =>
          `${line.name}\t${line.quantityNum}\t${line.unitLabel}\t${line.unitPrice}\t${line.subtotal}\t${line.sellerLabel}`
      )
      .join('\n');
    const totals = t('bulk_order.summary_total', { total: formatMMK(total) });
    const notes = buyerNotes ? t('bulk_order.summary_notes', { notes: buyerNotes }) : '';
    return `${head}${t('bulk_order.summary_columns')}${body}${totals}${notes}`;
  };

  const shareSummary = async () => {
    const text = buildSummaryText();

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setMessage({ type: 'success', text: t('bulk_order.copied') });
        return;
      } catch {
        setMessage({ type: 'error', text: t('bulk_order.copy_failed') });
        return;
      }
    }

    await Share.share({ message: text, title: t('bulk_order.title') });
    setMessage({ type: 'success', text: t('bulk_order.copied') });
  };

  const exportCsv = async () => {
    const rows = [
      [
        t('bulk_order.csv_product_id'),
        t('bulk_order.csv_product_name'),
        t('bulk_order.csv_quantity'),
        t('bulk_order.csv_unit'),
        t('bulk_order.csv_moq'),
        t('bulk_order.csv_unit_price'),
        t('bulk_order.csv_line_total'),
        t('bulk_order.csv_seller'),
        t('bulk_order.csv_has_variants'),
      ],
      ...validatedLines.map((line) => [
        line.id,
        `"${line.name.replace(/"/g, '""')}"`,
        line.quantityNum,
        line.unitLabel,
        line.moq,
        line.unitPrice,
        line.subtotal,
        `"${line.sellerLabel.replace(/"/g, '""')}"`,
        line.hasVariants ? t('bulk_order.yes') : t('bulk_order.no'),
      ]),
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pyonea-bulk-order-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: t('bulk_order.csv_saved') });
      return;
    }

    await Share.share({ message: csv, title: t('bulk_order.export_csv') });
    setMessage({ type: 'success', text: t('bulk_order.csv_saved') });
  };

  const sendRfqs = async () => {
    if (!validatedLines.length) return;
    if (!requireBuyer('bulk_order.rfq_buyers_only')) return;
    const groups = new Map<string, typeof validatedLines>();
    validatedLines.forEach((line) => {
      if (!line.sellerId || !line.categoryId) return;
      const key = String(line.sellerId);
      groups.set(key, [...(groups.get(key) || []), line]);
    });

    if (groups.size === 0) {
      setMessage({ type: 'error', text: t('bulk_order.rfq_no_groups') });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    let sent = 0;

    try {
      for (const group of groups.values()) {
        const spec = group
          .map((line) =>
            t('bulk_order.spec_line', {
              name: line.name,
              id: line.id,
              qty: line.quantityNum,
              unit: line.unitLabel,
              price: formatMMK(line.unitPrice),
              subtotal: formatMMK(line.subtotal),
            })
          )
          .join('\n');
        await apiPost('/rfq', {
          product_name: t('bulk_order.rfq_product_name', { count: group.length }),
          category_id: group[0].categoryId,
          quantity: group.reduce((sum, line) => sum + line.quantityNum, 0),
          unit: group[0].unitLabel || 'piece',
          specifications: `${spec}${buyerNotes ? t('bulk_order.rfq_buyer_notes', { notes: buyerNotes }) : ''}`.slice(
            0,
            5000
          ),
          deadline: `${deadline}T23:59:59`,
          currency: 'MMK',
          broadcast: false,
          seller_ids: [group[0].sellerId],
        });
        sent += 1;
      }

      setMessage({ type: 'success', text: t('bulk_order.rfq_sent', { n: sent }) });
      setLines([]);
      if (isWebStorageAvailable()) localStorage.removeItem(STORAGE_KEY);
    } catch {
      setMessage({ type: 'error', text: t('bulk_order.rfq_failed') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}>
      <View className="relative min-h-screen bg-gray-50 py-8 dark:bg-slate-900 sm:py-12">
        <BulkOrderToast message={message} onClose={() => setMessage(null)} />
        <View className={SITE_CONTAINER_CLASS}>
          <View className="mb-8">
            <Text className="font-sans text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t('bulk_order.title')}
            </Text>
            <Text className="mt-2 max-w-3xl font-sans text-sm leading-6 text-gray-600 dark:text-slate-400 sm:text-base">
              {t('bulk_order.subtitle')}
            </Text>
          </View>

          <View className="gap-6 xl:flex-row">
            <View className="xl:w-[40%]">
              <View className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <View className="mb-4 flex-row items-center gap-2">
                  <Feather name="search" color="#16a34a" size={20} />
                  <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-white">
                    {t('bulk_order.search_title')}
                  </Text>
                </View>
                <View className="flex-row items-center rounded-xl border border-gray-200 bg-white px-3 dark:border-slate-600 dark:bg-slate-900">
                  <Feather name="search" color="#9ca3af" size={18} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t('bulk_order.search_placeholder')}
                    placeholderTextColor="#9ca3af"
                    className="min-w-0 flex-1 px-3 py-3 font-sans text-sm text-gray-900 dark:text-white"
                    returnKeyType="search"
                  />
                </View>
                <Text className="mt-2 font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t('bulk_order.search_hint')}
                </Text>

                <View className="mt-4 gap-3">
                  {searchLoading ? (
                    <View className="items-center py-8">
                      <Feather name="loader" color="#9ca3af" size={28} />
                    </View>
                  ) : search.trim() && results.length === 0 ? (
                    <Text className="py-8 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                      {t('bulk_order.no_results')}
                    </Text>
                  ) : (
                    results.map((product) => (
                      <SearchResultCard
                        key={String(product.id)}
                        product={product}
                        alreadyAdded={lines.some((line) => String(line.id) === String(product.id))}
                        onAdd={() => addProduct(product)}
                      />
                    ))
                  )}
                </View>
              </View>
            </View>

            <View className="min-w-0 flex-1 gap-4">
              <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <View className="flex-row items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                  <View className="flex-row items-center gap-2">
                    <Feather name="package" color="#6366f1" size={20} />
                    <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-white">
                      {t('bulk_order.list_title')} ({lines.length})
                    </Text>
                  </View>
                  {lines.length > 0 ? (
                    <Pressable
                      onPress={() => {
                        setLines([]);
                        if (isWebStorageAvailable()) localStorage.removeItem(STORAGE_KEY);
                        setMessage({ type: 'success', text: t('bulk_order.cleared') });
                      }}>
                      <Text className="font-sans text-xs text-red-600 dark:text-red-400">
                        {t('bulk_order.clear')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {lines.length === 0 ? (
                  <Text className="px-5 py-16 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                    {t('bulk_order.empty')}
                  </Text>
                ) : (
                  <View className="gap-3 p-4">
                    {validatedLines.map((line) => (
                      <BulkLineCard
                        key={line.key}
                        line={line}
                        quantityNum={line.quantityNum}
                        unitPrice={line.unitPrice}
                        subtotal={line.subtotal}
                        activeDiscount={line.activeDiscount}
                        onVariant={(variantId) => updateVariant(line.key, variantId)}
                        onQty={(value) =>
                          setLines((current) =>
                            current.map((item) => (item.key === line.key ? { ...item, quantity: value } : item))
                          )
                        }
                        onSnap={() =>
                          setLines((current) =>
                            current.map((item) =>
                              item.key === line.key ? { ...item, quantity: String(line.quantityNum) } : item
                            )
                          )
                        }
                        onRemove={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      />
                    ))}
                  </View>
                )}

                {lines.length > 0 ? (
                  <View className="gap-3 border-t border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
                    <Text className="font-sans text-base font-semibold text-gray-900 dark:text-white">
                      {t('bulk_order.estimated_total')}: {formatMMK(total)}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <Pressable
                        onPress={exportCsv}
                        className="flex-row items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 dark:border-slate-600">
                        <Feather name="download" color="#475569" size={16} />
                        <Text className="font-sans text-sm font-medium text-gray-800 dark:text-slate-200">
                          {t('bulk_order.export_csv')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={shareSummary}
                        className="flex-row items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 dark:border-slate-600">
                        <Feather name="clipboard" color="#475569" size={16} />
                        <Text className="font-sans text-sm font-medium text-gray-800 dark:text-slate-200">
                          {t('bulk_order.copy')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={addLinesToCart}
                        disabled={cartSubmitting}
                        className="flex-row items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 disabled:opacity-50">
                        {cartSubmitting ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Feather name="shopping-cart" color="#ffffff" size={16} />
                        )}
                        <Text className="font-sans text-sm font-semibold text-white">
                          {t('bulk_order.add_cart')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>

              <View className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <Text className="font-sans text-base font-semibold text-gray-900 dark:text-white">
                  {t('bulk_order.rfq_title')}
                </Text>
                <Text className="mt-2 font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
                  {t('bulk_order.rfq_help')}
                </Text>

                <View className="mt-4 gap-4 sm:flex-row">
                  <NativeDateField
                    label={t('bulk_order.deadline')}
                    value={deadline}
                    placeholder={minRfqDeadline()}
                    minimumDate={minRfqDeadline()}
                    onChange={setDeadline}
                  />
                  <View className="flex-1">
                    <Text className="mb-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                      {t('bulk_order.notes')}
                    </Text>
                    <TextInput
                      value={buyerNotes}
                      onChangeText={setBuyerNotes}
                      multiline
                      numberOfLines={3}
                      placeholder={t('bulk_order.notes_ph')}
                      placeholderTextColor="#9ca3af"
                      className="min-h-20 rounded-xl border border-gray-200 bg-white px-3 py-2 align-top font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    />
                  </View>
                </View>

                {bySeller.length > 0 ? (
                  <View className="mt-4 rounded-xl border border-gray-100 p-3 dark:border-slate-600">
                    <Text className="mb-2 font-sans text-xs font-semibold text-gray-800 dark:text-slate-200">
                      {t('bulk_order.rfq_preview', { n: bySeller.length })}
                    </Text>
                    {bySeller.map((seller) => (
                      <Text key={String(seller.sellerId)} className="font-sans text-xs text-gray-600 dark:text-slate-400">
                        {t('bulk_order.rfq_preview_line', {
                          seller: seller.sellerLabel,
                          count: seller.count,
                        })}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View className="mt-4 gap-2 sm:flex-row sm:items-center">
                  <Pressable
                    onPress={sendRfqs}
                    disabled={submitting || !lines.length}
                    className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 opacity-100 disabled:opacity-50">
                    <Feather name="send" color="#ffffff" size={18} />
                    <Text className="font-sans font-semibold text-white">
                      {submitting ? t('bulk_order.sending') : t('bulk_order.send_rfq')}
                    </Text>
                  </Pressable>
                  {!isAuthenticated ? (
                    <Link href="/login?returnTo=/bulk-order-tool" asChild>
                      <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                        {t('bulk_order.login')} {t('bulk_order.login_suffix')}
                      </Text>
                    </Link>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}
