import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { SellerProductFormData, SellerProductImage } from '@/utils/native-api';

const DRAFT_KEY = 'pyonea_product_draft_v1';
const DRAFT_IMAGES_KEY = 'pyonea_product_draft_images_v1';

/** Legacy Pyonea web keys (same origin migration). */
const LEGACY_DRAFT_KEY = 'product_draft';
const LEGACY_DRAFT_IMAGES_KEY = 'product_image_previews';

export type ProductDraftPersistContext = {
  isEditingExisting: boolean;
  draftRestored: boolean;
  draftPersistEnabled: boolean;
  hasCreatedProductId: boolean;
};

export function shouldAutoSaveProductDraft(context: ProductDraftPersistContext): boolean {
  return (
    !context.isEditingExisting &&
    context.draftRestored &&
    context.draftPersistEnabled &&
    !context.hasCreatedProductId
  );
}

const isWebStorageAvailable = () => Platform.OS === 'web' && typeof localStorage !== 'undefined';

const readRaw = async (key: string): Promise<string | null> => {
  if (isWebStorageAvailable()) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeRaw = async (key: string, value: string | null): Promise<void> => {
  if (isWebStorageAvailable()) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures (private browsing, quota).
    }
    return;
  }
  try {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  } catch {
    // Ignore native storage failures.
  }
};

const parseDraftRecord = (raw: string): Partial<SellerProductFormData> | null => {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const draft = { ...(parsed as Partial<SellerProductFormData>) };
    delete draft.id;
    delete draft.images;
    return draft;
  } catch {
    return null;
  }
};

export async function loadProductDraft(): Promise<Partial<SellerProductFormData> | null> {
  let raw = await readRaw(DRAFT_KEY);
  if (!raw) {
    raw = await readRaw(LEGACY_DRAFT_KEY);
    if (raw) {
      await writeRaw(DRAFT_KEY, raw);
      await writeRaw(LEGACY_DRAFT_KEY, null);
    }
  }
  if (!raw) return null;

  const draft = parseDraftRecord(raw);
  if (!draft) {
    await writeRaw(DRAFT_KEY, null);
    return null;
  }
  return draft;
}

export async function saveProductDraft(form: SellerProductFormData): Promise<void> {
  const draft: Partial<SellerProductFormData> = { ...form };
  delete draft.id;
  delete draft.images;
  await writeRaw(DRAFT_KEY, JSON.stringify(draft));
}

export async function loadProductDraftImages(): Promise<SellerProductImage[]> {
  let raw = await readRaw(DRAFT_IMAGES_KEY);
  if (!raw) {
    raw = await readRaw(LEGACY_DRAFT_IMAGES_KEY);
    if (raw) {
      await writeRaw(DRAFT_IMAGES_KEY, raw);
      await writeRaw(LEGACY_DRAFT_IMAGES_KEY, null);
    }
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SellerProductImage[]) : [];
  } catch {
    await writeRaw(DRAFT_IMAGES_KEY, null);
    return [];
  }
}

export async function saveProductDraftImages(images: SellerProductImage[]): Promise<void> {
  await writeRaw(
    DRAFT_IMAGES_KEY,
    JSON.stringify(
      images.map((image) => ({
        url: image.url,
        path: image.path,
        angle: image.angle,
        isPrimary: image.isPrimary,
        name: image.name,
        size: image.size,
      })),
    ),
  );
}

export async function clearProductDraft(): Promise<void> {
  await Promise.all([
    writeRaw(DRAFT_KEY, null),
    writeRaw(DRAFT_IMAGES_KEY, null),
    writeRaw(LEGACY_DRAFT_KEY, null),
    writeRaw(LEGACY_DRAFT_IMAGES_KEY, null),
  ]);
}
