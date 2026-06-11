import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { SellerProductFormData, SellerProductImage } from '@/utils/native-api';

const DRAFT_KEY = 'pyonea_product_draft_v1';
const DRAFT_IMAGES_KEY = 'pyonea_product_draft_images_v1';

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

export async function loadProductDraft(): Promise<Partial<SellerProductFormData> | null> {
  const raw = await readRaw(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Partial<SellerProductFormData>)
      : null;
  } catch {
    await writeRaw(DRAFT_KEY, null);
    return null;
  }
}

export async function saveProductDraft(form: SellerProductFormData): Promise<void> {
  const draft: Partial<SellerProductFormData> = { ...form };
  delete draft.id;
  delete draft.images;
  await writeRaw(DRAFT_KEY, JSON.stringify(draft));
}

export async function loadProductDraftImages(): Promise<SellerProductImage[]> {
  const raw = await readRaw(DRAFT_IMAGES_KEY);
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
  await writeRaw(DRAFT_KEY, null);
  await writeRaw(DRAFT_IMAGES_KEY, null);
}
