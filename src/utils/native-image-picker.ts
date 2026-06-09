import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { NativeUploadFile } from '@/utils/native-api';

type PickImageOptions = {
  allowsMultipleSelection?: boolean;
  allowsEditing?: boolean;
  quality?: number;
};

type PickedImage = NativeUploadFile & {
  width?: number;
  height?: number;
  fileSize?: number;
};

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const maxImageSize = 5 * 1024 * 1024;

export const getUploadNameFromUri = (uri: string, fallback: string) => {
  const name = uri.split(/[\\/]/).pop()?.split('?')[0];
  return name || fallback;
};

const toUploadFile = (asset: ImagePicker.ImagePickerAsset, fallbackName: string): PickedImage => ({
  uri: asset.uri,
  name: asset.fileName || getUploadNameFromUri(asset.uri, fallbackName),
  type: asset.mimeType || 'image/jpeg',
  width: asset.width,
  height: asset.height,
  fileSize: asset.fileSize,
});

const validateImages = (files: PickedImage[]) => {
  const accepted = files.filter((file) => {
    const validType = imageMimeTypes.includes(file.type);
    const validSize = typeof file.fileSize === 'number' ? file.fileSize <= maxImageSize : true;
    return validType && validSize;
  });

  return {
    accepted,
    rejected: files.length - accepted.length,
  };
};

export async function pickImagesFromLibrary(options: PickImageOptions = {}) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: options.allowsMultipleSelection,
    allowsEditing: options.allowsEditing,
    quality: options.quality ?? 0.9,
  });

  if (result.canceled) return { accepted: [], rejected: 0 };

  const files = result.assets.map((asset, index) =>
    toUploadFile(asset, `pyonea-image-${index + 1}.jpg`)
  );
  return validateImages(files);
}

export async function pickImageFromCamera(options: PickImageOptions = {}) {
  if (Platform.OS === 'web') return { accepted: [], rejected: 0 };

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to take a product photo.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: options.allowsEditing,
    quality: options.quality ?? 0.9,
  });

  if (result.canceled || !result.assets[0]) return { accepted: [], rejected: 0 };

  return validateImages([toUploadFile(result.assets[0], 'pyonea-camera-photo.jpg')]);
}

export function appendUploadFile(form: FormData, field: string, file: NativeUploadFile) {
  form.append(field, file as unknown as Blob);
}
