import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { formatMMK, type BulkOrderProduct, type ProductVariant } from '@/utils/native-api';

export const BULK_ORDER_STORAGE_KEY = 'pyonea_bulk_order_lines_v1';

export type StoredBulkLine = BulkOrderProduct & {
  key: string;
  quantity: string;
  selectedVariantId: string | number | null;
  variantOptions?: ProductVariant[];
  /** @deprecated Legacy web bulk-order saves */
  productId?: string | number;
  /** @deprecated Legacy web bulk-order saves */
  sellerUserId?: string | number;
};

const lineKey = () => `ln-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toPositiveInt = (value: unknown, fallback = 1) => {
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isWebStorageAvailable = () => Platform.OS === 'web' && typeof localStorage !== 'undefined';

const normalizeStoredLine = (line: StoredBulkLine): StoredBulkLine => {
  const id = line.id ?? line.productId;
  const sellerId = line.sellerId ?? line.sellerUserId;

  return {
    ...line,
    id: id!,
    sellerId,
    key: line.key || lineKey(),
    moq: toPositiveInt(line.moq, 1),
    quantityStep: toPositiveInt(line.quantityStep, toPositiveInt(line.moq, 1)),
    quantity: String(line.quantity || line.moq || 1),
    price: line.price || formatMMK(line.basePrice),
    variantOptions: Array.isArray(line.variantOptions) ? line.variantOptions : [],
    selectedVariantId: line.selectedVariantId ?? null,
  };
};

export const serializeBulkOrderLines = (lines: StoredBulkLine[]): string =>
  JSON.stringify(
    lines.map((line) => ({
      key: line.key,
      id: line.id,
      slug: line.slug,
      name: line.name,
      sellerId: line.sellerId,
      sellerLabel: line.sellerLabel,
      categoryId: line.categoryId,
      unitLabel: line.unitLabel,
      moq: line.moq,
      quantityStep: line.quantityStep,
      basePrice: line.basePrice,
      price: line.price,
      imageUrl: line.imageUrl,
      hasVariants: line.hasVariants,
      wholesaleTiers: line.wholesaleTiers,
      quantity: line.quantity,
      selectedVariantId: line.selectedVariantId,
      variantOptions: line.variantOptions ?? [],
    }))
  );

export const deserializeBulkOrderLines = (raw: string): StoredBulkLine[] => {
  const parsed = JSON.parse(raw) as StoredBulkLine[];
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeStoredLine);
};

const readRaw = async (): Promise<string | null> => {
  if (isWebStorageAvailable()) {
    return localStorage.getItem(BULK_ORDER_STORAGE_KEY);
  }

  try {
    return await AsyncStorage.getItem(BULK_ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeRaw = async (value: string | null): Promise<void> => {
  if (isWebStorageAvailable()) {
    if (value == null) {
      localStorage.removeItem(BULK_ORDER_STORAGE_KEY);
    } else {
      localStorage.setItem(BULK_ORDER_STORAGE_KEY, value);
    }
    return;
  }

  try {
    if (value == null) {
      await AsyncStorage.removeItem(BULK_ORDER_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(BULK_ORDER_STORAGE_KEY, value);
    }
  } catch {
    // Ignore native storage failures; in-memory session still works.
  }
};

export async function loadBulkOrderLines(): Promise<StoredBulkLine[]> {
  try {
    const raw = await readRaw();
    if (!raw) return [];
    return deserializeBulkOrderLines(raw);
  } catch {
    await writeRaw(null);
    return [];
  }
}

export async function saveBulkOrderLines(lines: StoredBulkLine[]): Promise<void> {
  if (!lines.length) {
    await writeRaw(null);
    return;
  }

  await writeRaw(serializeBulkOrderLines(lines));
}

export async function clearBulkOrderLines(): Promise<void> {
  await writeRaw(null);
}
