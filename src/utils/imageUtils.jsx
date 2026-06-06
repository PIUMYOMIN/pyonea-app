// src/utils/imageUtils.jsx
import { IMAGE_BASE_URL, DEFAULT_PLACEHOLDER } from "../config";

const getImageUrl = (image) => {
  if (image == null) return DEFAULT_PLACEHOLDER;

  if (typeof image === 'string') {
    if (!image) return DEFAULT_PLACEHOLDER;
    if (image.startsWith('http')) return image;
    const cleanPath = image.replace('public/', '');
    return `${IMAGE_BASE_URL}/${cleanPath}`;
  }

  if (typeof image === 'object') {
    if (image.url != null && image.url !== '') {
      if (image.url.startsWith('http')) return image.url;
      const cleanPath = image.url.replace('public/', '');
      return `${IMAGE_BASE_URL}/${cleanPath}`;
    }
    if (image.path != null && image.path !== '') {
      if (image.path.startsWith('http')) return image.path;
      const cleanPath = image.path.replace('public/', '');
      return `${IMAGE_BASE_URL}/${cleanPath}`;
    }
  }

  return DEFAULT_PLACEHOLDER;
};

export default getImageUrl;