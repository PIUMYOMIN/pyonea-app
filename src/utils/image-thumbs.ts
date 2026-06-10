import { IMAGE_BASE_URL } from '@/config/native';

/** Must match ImageThumbnailController::ALLOWED_WIDTHS on the backend. */
export type ThumbWidth = 160 | 300 | 480 | 800;

const THUMBABLE_EXTENSION = /\.(jpe?g|png|gif|webp)$/i;

/**
 * Rewrites a public storage image URL to the backend's cached-thumbnail
 * endpoint (`/storage/thumbs/{width}/{path}.webp`). Non-storage URLs, data
 * URIs and already-thumbed URLs pass through unchanged. The backend redirects
 * to the original image if thumbnail generation fails.
 */
export function getThumbUrl(url: string | undefined, width: ThumbWidth): string | undefined {
  if (!url || url.startsWith('data:')) return url;

  const prefix = `${IMAGE_BASE_URL}/`;
  if (!url.startsWith(prefix)) return url;

  const relativePath = url.slice(prefix.length);
  if (relativePath.startsWith('thumbs/') || !THUMBABLE_EXTENSION.test(relativePath)) {
    return url;
  }

  return `${prefix}thumbs/${width}/${relativePath}.webp`;
}
