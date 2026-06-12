import Feather from '@expo/vector-icons/Feather';
import { OptimizedImage as Image } from '@/components/ui/optimized-image';
import { Link, useRouter } from 'expo-router';
import { createElement, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppLayout } from '@/components/layout/app-layout';
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
  type ProductVariant,
} from '@/utils/native-api';
import { emitCartCountChanged } from '@/utils/native-cart-events';

type BulkLine = BulkOrderProduct & {
  key: string;
  quantity: string;
  variantOptions: ProductVariant[];
  variantsLoading: boolean;
  selectedVariantId: string | number | null;
  unitPrice?: number;
};

type ValidatedBulkLine = BulkLine & {
  quantityNum: number;
  unitPrice: number;
  subtotal: number;
  activeTier: BulkOrderProduct['wholesaleTiers'][number] | null;
  valid: boolean;
};

type SellerGroup = {
  sellerId: string | number;
  sellerLabel: string;
  lines: ValidatedBulkLine[];
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

const resolveQuantityStep = (rawStep: unknown, moq: number) => {
  const safeMoq = toPositiveInt(moq, 1);
  const parsedStep = toPositiveInt(rawStep, safeMoq);
  return parsedStep > 1 ? parsedStep : safeMoq;
};

const snapQuantityToStep = (value: unknown, moq: number, step: number) => {
  const safeMoq = toPositiveInt(moq, 1);
  const safeStep = resolveQuantityStep(step, safeMoq);
  let quantity = parseQty(value);
  if (quantity < safeMoq) quantity = safeMoq;
  if (safeStep <= 1) return quantity;
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
  variant.label || variant.sku || `${fallback} #${String(variant.id)}`;

const unitPriceAtMoq = (product: Pick<BulkOrderProduct, 'moq' | 'basePrice' | 'wholesaleTiers'>) => {
  const tiers = Array.isArray(product.wholesaleTiers) ? product.wholesaleTiers : [];
  const activeTier = tiers.length
    ? [...tiers].sort((a, b) => b.minQty - a.minQty).find((tier) => product.moq >= tier.minQty)
    : null;
  return activeTier?.priceValue ?? product.basePrice;
};

const getSavedBulkLines = (): BulkLine[] => {
  if (!isWebStorageAvailable()) return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((line) => {
      const moq = toPositiveInt(line.moq, 1);
      const id = line.id ?? line.productId;
      const sellerId = line.sellerId ?? line.sellerUserId;
      const imageUrl = line.imageUrl ?? line.image;
      return {
        ...line,
        id,
        sellerId,
        imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
        key: typeof line.key === 'string' ? line.key : lineKey(),
        moq,
        quantityStep: resolveQuantityStep(line.quantityStep, moq),
        quantity: String(line.quantity || moq || 1),
        variantOptions: Array.isArray(line.variantOptions) ? (line.variantOptions as ProductVariant[]) : [],
        variantsLoading: false,
        selectedVariantId: (line.selectedVariantId as string | number | null) ?? null,
      } as BulkLine;
    });
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
    <View className="flex-row gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:border-green-300 dark:border-slate-600 dark:hover:border-green-700">
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
          <Feather name="home" color="#94a3b8" size={13} />
          <Text className="font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
            {product.sellerLabel}
          </Text>
        </View>
        <Text className="mt-1 font-sans text-xs font-medium text-green-700 dark:text-green-400">
          {formatMMK(product.basePrice)} - {t('bulk_order.moq_label')} {product.moq}
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

function BulkOrderLineRow({
  line,
  quantityNum,
  unitPrice,
  subtotal,
  activeTier,
  onVariant,
  onQty,
  onSnap,
  onRemove,
}: {
  line: BulkLine;
  quantityNum: number;
  unitPrice: number;
  subtotal: number;
  activeTier: ValidatedBulkLine['activeTier'];
  onVariant: (variantId: string | number | null) => void;
  onQty: (value: string) => void;
  onSnap: () => void;
  onRemove: () => void;
}) {
  const { t } = useAppTranslation();
  const [variantOpen, setVariantOpen] = useState(false);

  const selectedVariant = line.variantOptions.find(
    (variant) => String(variant.id) === String(line.selectedVariantId),
  );

  return (
    <>
      <View className="flex-row items-start border-b border-gray-100 px-4 py-3 dark:border-slate-700">
        <View className="w-44 flex-row gap-2">
          <View className="h-9 w-9 overflow-hidden rounded-md bg-gray-100 dark:bg-slate-700">
            <Image
              source={line.imageUrl ? { uri: line.imageUrl } : require('@/assets/images/placeholder-product.png')}
              className="h-full w-full"
              contentFit="cover"
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-xs font-medium text-gray-900 dark:text-white" numberOfLines={2}>
              {line.name}
            </Text>
            {line.slug ? (
              <Link href={`/products/${line.slug}`} asChild>
                <Text className="font-sans text-[10px] text-green-600 dark:text-green-400">
                  {t('bulk_order.view_product')}
                </Text>
              </Link>
            ) : null}
          </View>
        </View>
        <Text className="w-28 font-sans text-[11px] text-gray-600 dark:text-slate-300" numberOfLines={2}>
          {line.sellerLabel}
        </Text>
        <View className="w-36">
          {line.hasVariants ? (
            line.variantsLoading ? (
              <Text className="font-sans text-[10px] text-gray-500">{t('bulk_order.loading_variants')}</Text>
            ) : line.variantOptions.length === 0 ? (
              <Text className="font-sans text-[10px] text-red-500">{t('bulk_order.variants_unavailable')}</Text>
            ) : (
              <Pressable
                onPress={() => setVariantOpen(true)}
                className={`rounded-lg border px-2 py-1.5 ${
                  !line.selectedVariantId
                    ? 'border-amber-400 dark:border-amber-500'
                    : 'border-gray-200 dark:border-slate-600'
                }`}>
                <Text className="font-sans text-[10px] text-gray-800 dark:text-slate-200" numberOfLines={1}>
                  {selectedVariant
                    ? getVariantLabel(selectedVariant, t('bulk_order.col_variant'))
                    : t('bulk_order.select_variant')}
                </Text>
              </Pressable>
            )
          ) : (
            <Text className="font-sans text-xs text-gray-400">—</Text>
          )}
        </View>
        <View className="w-24">
          <Text className="font-sans text-[11px] text-gray-800 dark:text-slate-200">{formatMMK(unitPrice)}</Text>
          {activeTier ? (
            <View className="mt-0.5 self-start rounded bg-green-100 px-1.5 py-0.5 dark:bg-green-900/40">
              <Text className="font-sans text-[10px] font-semibold text-green-700 dark:text-green-300">
                {activeTier.discountPct > 0 ? `-${activeTier.discountPct}%` : t('bulk_order.tier_label')}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="w-24">
          <TextInput
            value={line.quantity}
            onChangeText={onQty}
            onBlur={onSnap}
            keyboardType="number-pad"
            className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-sans text-xs text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <Text className="mt-0.5 font-sans text-[9px] text-gray-400">
            {t('bulk_order.moq_label')} {line.moq}
            {line.quantityStep > 1 ? ` - ${t('bulk_order.step_label')} ${line.quantityStep}` : ''}{' '}
            {line.unitLabel}
          </Text>
        </View>
        <Text className="w-24 text-right font-sans text-xs font-medium text-gray-900 dark:text-white">
          {formatMMK(subtotal)}
        </Text>
        <Pressable onPress={onRemove} className="ml-2 h-8 w-8 items-center justify-center rounded-lg">
          <Feather name="trash-2" color="#9ca3af" size={16} />
        </Pressable>
      </View>

      <Modal visible={variantOpen} transparent animationType="fade" onRequestClose={() => setVariantOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setVariantOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-white p-4 dark:bg-slate-900" onPress={() => {}}>
            <Text className="mb-3 font-sans text-base font-semibold text-gray-900 dark:text-white">
              {t('bulk_order.col_variant')}
            </Text>
            <ScrollView>
              <Pressable
                onPress={() => {
                  onVariant(null);
                  setVariantOpen(false);
                }}
                className="border-b border-gray-100 py-3 dark:border-slate-700">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-200">
                  {t('bulk_order.select_variant')}
                </Text>
              </Pressable>
              {line.variantOptions.map((variant) => {
                const disabled = variant.inStock === false || variant.quantity <= 0;
                return (
                  <Pressable
                    key={String(variant.id)}
                    disabled={disabled}
                    onPress={() => {
                      onVariant(variant.id);
                      setVariantOpen(false);
                    }}
                    className={`border-b border-gray-100 py-3 dark:border-slate-700 ${disabled ? 'opacity-40' : 'opacity-100'}`}>
                    <Text
                      className={`font-sans text-sm ${
                        String(line.selectedVariantId) === String(variant.id)
                          ? 'font-semibold text-green-600 dark:text-green-400'
                          : 'text-gray-700 dark:text-slate-200'
                      }`}>
                      {getVariantLabel(variant, t('bulk_order.col_variant'))}
                      {disabled ? ` (${t('bulk_order.out_of_stock')})` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function BulkOrderActionBanner({
  message,
}: {
  message: { type: 'success' | 'error'; text: string } | null;
}) {
  if (!message) return null;
  const isSuccess = message.type === 'success';

  return (
    <View
      className={`mb-6 flex-row items-start gap-2 rounded-xl border px-4 py-3 ${
        isSuccess
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
      }`}>
      <Feather
        name={isSuccess ? 'send' : 'alert-triangle'}
        color={isSuccess ? '#166534' : '#b45309'}
        size={20}
      />
      <Text
        className={`min-w-0 flex-1 font-sans text-sm leading-5 ${
          isSuccess
            ? 'text-green-800 dark:text-green-200'
            : 'text-amber-900 dark:text-amber-100'
        }`}>
        {message.text}
      </Text>
    </View>
  );
}

function BulkOrderLinesTable({
  lines,
  onVariant,
  onQty,
  onSnap,
  onRemove,
}: {
  lines: ValidatedBulkLine[];
  onVariant: (key: string, variantId: string | number | null) => void;
  onQty: (key: string, value: string) => void;
  onSnap: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const { t } = useAppTranslation();

  if (Platform.OS === 'web') {
    return createElement(
      'div',
      { className: 'overflow-x-auto' },
      createElement(
        'table',
        { className: 'min-w-full text-sm' },
        createElement(
          'thead',
          { className: 'bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-slate-700/60 dark:text-slate-400' },
          createElement(
            'tr',
            null,
            ['col_product', 'col_seller', 'col_variant', 'col_price', 'col_qty', 'col_line', ''].map((key) =>
              createElement(
                'th',
                {
                  key: key || 'actions',
                  className: `px-4 py-3 ${key === 'col_line' ? 'text-right' : ''} ${key === '' ? 'w-10' : ''}`,
                },
                key ? t(`bulk_order.${key}`) : '',
              ),
            ),
          ),
        ),
        createElement(
          'tbody',
          { className: 'divide-y divide-gray-100 dark:divide-slate-700' },
          ...lines.map((line) =>
            createElement(
              'tr',
              { key: line.key, className: 'dark:text-slate-200' },
              createElement(
                'td',
                { className: 'px-4 py-3' },
                createElement(
                  'div',
                  { className: 'flex items-center gap-2' },
                  createElement('img', {
                    src: line.imageUrl || '/placeholder-product.png',
                    alt: '',
                    className: 'h-9 w-9 flex-shrink-0 rounded-md bg-gray-100 object-cover dark:bg-slate-700',
                  }),
                  createElement(
                    'div',
                    { className: 'min-w-0' },
                    createElement('p', { className: 'max-w-[200px] truncate font-medium text-gray-900 dark:text-white' }, line.name),
                    line.slug
                      ? createElement(
                          'a',
                          {
                            href: `/products/${line.slug}`,
                            className: 'text-[11px] text-green-600 hover:underline dark:text-green-400',
                          },
                          t('bulk_order.view_product'),
                        )
                      : null,
                  ),
                ),
              ),
              createElement('td', { className: 'max-w-[120px] px-4 py-3 text-xs text-gray-600 dark:text-slate-300' }, line.sellerLabel),
              createElement(
                'td',
                { className: 'min-w-[140px] px-4 py-3' },
                line.hasVariants
                  ? line.variantsLoading
                    ? createElement(
                        'div',
                        { className: 'flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500' },
                        createElement('div', {
                          className:
                            'h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent',
                        }),
                        t('bulk_order.loading_variants'),
                      )
                    : line.variantOptions.length === 0
                      ? createElement('span', { className: 'text-xs text-red-500' }, t('bulk_order.variants_unavailable'))
                      : createElement(
                          'select',
                          {
                            value: line.selectedVariantId ?? '',
                            onChange: (event: { target: { value: string } }) =>
                              onVariant(line.key, event.target.value || null),
                            className: `w-full rounded-lg border px-2 py-1.5 text-xs bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 ${
                              !line.selectedVariantId
                                ? 'border-amber-400 dark:border-amber-500'
                                : 'border-gray-200 dark:border-slate-600'
                            }`,
                          },
                          createElement('option', { value: '' }, t('bulk_order.select_variant')),
                          ...line.variantOptions.map((variant) =>
                            createElement(
                              'option',
                              {
                                key: String(variant.id),
                                value: String(variant.id),
                                disabled: variant.inStock === false || variant.quantity <= 0,
                              },
                              `${getVariantLabel(variant, t('bulk_order.col_variant'))}${
                                variant.inStock === false || variant.quantity <= 0
                                  ? ` (${t('bulk_order.out_of_stock')})`
                                  : ''
                              }`,
                            ),
                          ),
                        )
                  : '—',
              ),
              createElement(
                'td',
                { className: 'whitespace-nowrap px-4 py-3 text-xs' },
                createElement(
                  'span',
                  null,
                  formatMMK(line.unitPrice),
                  line.activeTier
                    ? createElement(
                        'span',
                        {
                          className:
                            'ml-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300',
                        },
                        line.activeTier.discountPct > 0
                          ? `-${line.activeTier.discountPct}%`
                          : t('bulk_order.tier_label'),
                      )
                    : null,
                ),
              ),
              createElement(
                'td',
                { className: 'px-4 py-3' },
                createElement('input', {
                  type: 'number',
                  min: line.moq,
                  step: line.quantityStep,
                  value: line.quantity,
                  onChange: (event: { target: { value: string } }) => onQty(line.key, event.target.value),
                  onBlur: () => onSnap(line.key),
                  className:
                    'w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
                }),
                createElement(
                  'p',
                  { className: 'mt-0.5 text-[10px] text-gray-400' },
                  `${t('bulk_order.moq_label')} ${line.moq}${
                    line.quantityStep > 1 ? ` - ${t('bulk_order.step_label')} ${line.quantityStep}` : ''
                  } ${line.unitLabel}`,
                ),
              ),
              createElement(
                'td',
                { className: 'whitespace-nowrap px-4 py-3 text-right font-medium' },
                formatMMK(line.subtotal),
              ),
              createElement(
                'td',
                { className: 'px-4 py-3' },
                createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => onRemove(line.key),
                    className: 'rounded-lg p-1.5 text-gray-400 hover:text-red-500',
                    title: t('bulk_order.remove'),
                    'aria-label': t('bulk_order.remove'),
                  },
                  createElement(
                    'svg',
                    {
                      xmlns: 'http://www.w3.org/2000/svg',
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      strokeWidth: 1.5,
                      stroke: 'currentColor',
                      className: 'h-4 w-4',
                    },
                    createElement('path', {
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      d: 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
                    }),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator className="w-full">
      <View className="min-w-[760px]">
        <View className="flex-row border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/60">
          {['col_product', 'col_seller', 'col_variant', 'col_price', 'col_qty', 'col_line'].map((key) => (
            <Text
              key={key}
              className={`font-sans text-[10px] font-semibold uppercase text-gray-500 dark:text-slate-400 ${
                key === 'col_product' ? 'w-44' : key === 'col_seller' ? 'w-28' : key === 'col_variant' ? 'w-36' : key === 'col_price' ? 'w-24' : key === 'col_qty' ? 'w-24' : 'w-24 text-right'
              }`}>
              {t(`bulk_order.${key}`)}
            </Text>
          ))}
        </View>
        {lines.map((line) => (
          <BulkOrderLineRow
            key={line.key}
            line={line}
            quantityNum={line.quantityNum}
            unitPrice={line.unitPrice}
            subtotal={line.subtotal}
            activeTier={line.activeTier}
            onVariant={(variantId) => onVariant(line.key, variantId)}
            onQty={(value) => onQty(line.key, value)}
            onSnap={() => onSnap(line.key)}
            onRemove={() => onRemove(line.key)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export function BulkOrderToolNative() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useNativeAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isWebStorageAvailable()) return;
    if (!lines.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const minimal = lines.map(
      ({
        key,
        id,
        name,
        slug,
        categoryId,
        sellerId,
        sellerLabel,
        unitLabel,
        moq,
        quantityStep,
        basePrice,
        wholesaleTiers,
        unitPrice,
        hasVariants,
        variantOptions,
        selectedVariantId,
        quantity,
        imageUrl,
      }) => ({
        key,
        productId: id,
        name,
        slug,
        categoryId,
        sellerUserId: sellerId,
        sellerLabel,
        unitLabel,
        moq,
        quantityStep,
        basePrice,
        wholesaleTiers,
        unitPrice,
        hasVariants,
        variantOptions: variantOptions ?? [],
        selectedVariantId: selectedVariantId ?? null,
        quantity,
        image: imageUrl,
      })
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
  }, [lines]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (!debouncedSearch) {
        setResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const products = await searchBulkOrderProducts(debouncedSearch, controller.signal);
        if (!controller.signal.aborted) setResults(products);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [debouncedSearch]);

  const validatedLines = useMemo<ValidatedBulkLine[]>(
    () =>
      lines.map((line) => {
        const moq = toPositiveInt(line.moq, 1);
        const quantityStep = resolveQuantityStep(line.quantityStep, moq);
        const quantityNum = snapQuantityToStep(line.quantity, moq, quantityStep);
        const tiers = Array.isArray(line.wholesaleTiers) ? line.wholesaleTiers : [];
        const activeTier = tiers.length
          ? [...tiers].sort((a, b) => b.minQty - a.minQty).find((tier) => quantityNum >= tier.minQty) ?? null
          : null;
        const unitPrice = activeTier?.priceValue ?? line.basePrice ?? line.unitPrice ?? 0;
        const subtotal = quantityNum * unitPrice;
        return {
          ...line,
          moq,
          quantityStep,
          quantityNum,
          unitPrice,
          subtotal,
          activeTier,
          valid: Boolean(line.sellerId && line.categoryId),
        };
      }),
    [lines]
  );

  const total = validatedLines.reduce((sum, line) => sum + line.subtotal, 0);
  const bySeller = useMemo<SellerGroup[]>(() => {
    const map = new Map<string, SellerGroup>();
    validatedLines.forEach((line) => {
      if (!line.sellerId) return;
      const key = String(line.sellerId);
      const existing = map.get(key);
      if (existing) {
        existing.lines.push(line);
        return;
      }
      map.set(key, {
        sellerId: line.sellerId,
        sellerLabel: line.sellerLabel,
        lines: [line],
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
      const options = (detail.variants || []).filter((variant) => variant.isActive !== false);
      setLines((current) =>
        current.map((line) =>
          line.key === key
            ? {
                ...line,
                variantOptions: options,
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
        const step = resolveQuantityStep(product.quantityStep ?? existing.quantityStep, existing.moq);
        return current.map((line) =>
          String(line.id) === String(product.id)
            ? {
                ...line,
                quantity: String(parseQty(line.quantity) + step),
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
          unitPrice: unitPriceAtMoq(product),
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
        const quantityStep = resolveQuantityStep(variant.quantityStep ?? line.quantityStep, moq);
        const priceValue = variant.priceValue || line.basePrice;
        return {
          ...line,
          selectedVariantId: variantId,
          moq,
          quantityStep,
          basePrice: priceValue,
          unitPrice: priceValue,
          price: variant.price || formatMMK(priceValue),
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

    const eligible = validatedLines.filter(
      (line) => line.quantityNum > 0 && (!line.hasVariants || line.selectedVariantId)
    );
    const needsVariant = validatedLines.filter((line) => line.hasVariants && !line.selectedVariantId);

    if (!eligible.length) {
      setMessage({ type: 'error', text: t('bulk_order.no_cart_lines') });
      return;
    }

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
    let lastTotalItems: number | undefined;
    try {
      for (const line of eligible) {
        const result = await addProductToCart(line.id, line.quantityNum, {
          variantId: line.selectedVariantId,
        });
        added += 1;
        if (typeof result.totalItems === 'number') lastTotalItems = result.totalItems;
      }
      if (typeof lastTotalItems === 'number') {
        emitCartCountChanged(lastTotalItems);
      } else {
        emitCartCountChanged({ delta: eligible.reduce((sum, line) => sum + line.quantityNum, 0) });
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

    const groups = bySeller.filter((group) => group.lines.every((line) => line.valid));
    if (!groups.length) {
      setMessage({ type: 'error', text: t('bulk_order.rfq_no_groups') });
      return;
    }

    const invalidQty = validatedLines.some((line) => line.quantityNum < line.moq);
    if (invalidQty) {
      setMessage({ type: 'error', text: t('bulk_order.moq_error') });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    let sent = 0;

    try {
      for (const group of groups) {
        const spec = [
          group.lines
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
            .join('\n'),
          buyerNotes ? t('bulk_order.rfq_buyer_notes', { notes: buyerNotes }) : '',
        ].join('');
        const totalQty = group.lines.reduce((sum, line) => sum + line.quantityNum, 0);
        await apiPost('/rfq', {
          product_name: t('bulk_order.rfq_product_name', { count: group.lines.length }),
          category_id: group.lines[0].categoryId,
          quantity: Math.max(0.001, totalQty),
          unit: (group.lines[0].unitLabel || 'piece').slice(0, 20),
          specifications: spec.slice(0, 5000),
          deadline: `${deadline}T23:59:59`,
          currency: 'MMK',
          broadcast: false,
          seller_ids: [group.sellerId],
        });
        sent += 1;
      }

      setMessage({ type: 'success', text: t('bulk_order.rfq_sent', { n: sent }) });
      setLines([]);
      if (isWebStorageAvailable()) localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => router.push('/rfq' as never), 1200);
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
      <View className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-slate-900 sm:px-6 sm:py-12">
        <View className="mx-auto w-full max-w-7xl">
          <View className="mb-8">
            <Text className="font-sans text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t('bulk_order.title')}
            </Text>
            <Text className="mt-2 max-w-3xl font-sans text-sm leading-6 text-gray-600 dark:text-slate-400 sm:text-base">
              {t('bulk_order.subtitle')}
            </Text>
          </View>

          <BulkOrderActionBanner message={message} />

          <View className="gap-8 xl:grid xl:grid-cols-12">
            <View className="space-y-4 xl:col-span-5">
              <View className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <View className="mb-3 flex-row items-center gap-2">
                  <Feather name="search" color="#16a34a" size={20} />
                  <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-white">
                    {t('bulk_order.search_title')}
                  </Text>
                </View>
                <View className="relative flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3 dark:border-slate-600 dark:bg-slate-700/50">
                  <Feather name="search" color="#9ca3af" size={16} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t('bulk_order.search_placeholder')}
                    placeholderTextColor="#9ca3af"
                    className="min-w-0 flex-1 px-3 py-2.5 font-sans text-sm text-gray-900 dark:text-white"
                    returnKeyType="search"
                  />
                </View>
                <View className="mt-4 max-h-[min(70vh,520px)] gap-2 overflow-y-auto">
                  {!debouncedSearch ? (
                    <Text className="py-6 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                      {t('bulk_order.search_hint')}
                    </Text>
                  ) : null}
                  {debouncedSearch && searchLoading ? (
                    <View className="items-center py-8">
                      <ActivityIndicator color="#16a34a" />
                    </View>
                  ) : null}
                  {debouncedSearch && !searchLoading && results.length === 0 ? (
                    <Text className="py-6 text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                      {t('bulk_order.no_results')}
                    </Text>
                  ) : null}
                  {results.map((product) => (
                    <SearchResultCard
                      key={String(product.id)}
                      product={product}
                      alreadyAdded={lines.some((line) => String(line.id) === String(product.id))}
                      onAdd={() => addProduct(product)}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View className="gap-4 xl:col-span-7">
              <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <View className="flex-row items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
                  <View className="flex-row items-center gap-2">
                    <Feather name="box" color="#6366f1" size={20} />
                    <Text className="font-sans text-lg font-semibold text-gray-900 dark:text-white">
                      {t('bulk_order.list_title')}{' '}
                      <Text className="font-sans text-sm font-normal text-gray-500 dark:text-slate-400">
                        ({lines.length})
                      </Text>
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
                  <BulkOrderLinesTable
                    lines={validatedLines}
                    onVariant={updateVariant}
                    onQty={(key, value) =>
                      setLines((current) =>
                        current.map((item) => (item.key === key ? { ...item, quantity: value } : item))
                      )
                    }
                    onSnap={(key) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.key === key
                            ? {
                                ...item,
                                quantity: String(
                                  snapQuantityToStep(item.quantity, item.moq, item.quantityStep)
                                ),
                              }
                            : item
                        )
                      )
                    }
                    onRemove={(key) => setLines((current) => current.filter((item) => item.key !== key))}
                  />
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

                <View className="gap-4 sm:grid sm:grid-cols-2">
                  {Platform.OS === 'web' ? (
                    <View>
                      <Text className="mb-1 font-sans text-xs font-medium text-gray-500 dark:text-slate-400">
                        {t('bulk_order.deadline')}
                      </Text>
                      {createElement('input', {
                        type: 'date',
                        value: deadline,
                        min: minRfqDeadline(),
                        onChange: (event: { target: { value: string } }) => setDeadline(event.target.value),
                        className:
                          'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
                      })}
                    </View>
                  ) : (
                    <NativeDateField
                      label={t('bulk_order.deadline')}
                      value={deadline}
                      placeholder={minRfqDeadline()}
                      minimumDate={minRfqDeadline()}
                      onChange={setDeadline}
                    />
                  )}
                  <View className="sm:col-span-2">
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
                          count: seller.lines.length,
                        })}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Pressable
                  onPress={sendRfqs}
                  disabled={submitting || !lines.length}
                  className="mt-4 w-full flex-row items-center justify-center gap-2 self-start rounded-xl bg-green-600 px-6 py-3 disabled:opacity-50 sm:w-auto">
                  <Feather name="send" color="#ffffff" size={18} />
                  <Text className="font-sans font-semibold text-white">
                    {submitting ? t('bulk_order.sending') : t('bulk_order.send_rfq')}
                  </Text>
                </Pressable>

                {!isAuthenticated ? (
                  <Text className="mt-2 font-sans text-xs text-gray-500 dark:text-slate-400">
                    <Link href="/login?returnTo=/bulk-order-tool" asChild>
                      <Text className="font-medium text-green-600 dark:text-green-400">
                        {t('bulk_order.login')}
                      </Text>
                    </Link>{' '}
                    {t('bulk_order.login_suffix')}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}
