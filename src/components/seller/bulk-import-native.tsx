import Feather from '@expo/vector-icons/Feather';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import {
  ApiError,
  downloadSellerBulkImportTemplate,
  importSellerProductsBulk,
  type NativeUploadFile,
  type SellerBulkImportError,
  type SellerBulkImportResult,

  formatApiErrorMessage,
} from '@/utils/native-api';
import { getUploadNameFromUri } from '@/utils/native-image-picker';

const COLUMNS = [
  { name: 'name_en', required: true, note: 'Product name (English)' },
  { name: 'name_mm', required: false, note: 'Product name (Myanmar)' },
  { name: 'price', required: true, note: 'Price in MMK e.g. 25000' },
  { name: 'category_id', required: true, note: 'Category ID from your admin panel' },
  { name: 'product_type', required: false, note: 'physical / digital / service (default: physical)' },
  { name: 'sku', required: false, note: 'Unique SKU code' },
  { name: 'brand', required: false, note: 'Brand name' },
  { name: 'model', required: false, note: 'Model name' },
  { name: 'description_en', required: false, note: 'Description (English)' },
  { name: 'description_mm', required: false, note: 'Description (Myanmar)' },
  { name: 'moq', required: false, note: 'Minimum order quantity (default: 1)' },
  { name: 'min_order_unit', required: false, note: 'Unit label e.g. piece, box (default: piece)' },
  { name: 'condition', required: false, note: 'new / used_like_new / used_good / used_fair' },
  { name: 'weight_kg', required: false, note: 'Weight in kg e.g. 0.5' },
  { name: 'material', required: false, note: 'Material' },
  { name: 'origin', required: false, note: 'Country of origin' },
];

type SelectedFile = {
  file: Blob | NativeUploadFile;
  name: string;
  size: number;
};

const documentToUploadFile = (asset: DocumentPicker.DocumentPickerAsset): SelectedFile => ({
  file: {
    uri: asset.uri,
    name: asset.name || getUploadNameFromUri(asset.uri, 'bulk_import.csv'),
    type: asset.mimeType || 'text/csv',
  },
  name: asset.name || getUploadNameFromUri(asset.uri, 'bulk_import.csv'),
  size: asset.size || 0,
});

const normalizeImportErrors = (value: unknown): SellerBulkImportError[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const record = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
      const rawErrors = Array.isArray(record.errors)
        ? record.errors
        : [record.message || item];
      const errors = rawErrors.map((message) => String(message)).filter(Boolean);

      return {
        row:
          typeof record.row === 'number' || typeof record.row === 'string'
            ? record.row
            : index + 1,
        errors,
      };
    })
    .filter((item) => item.errors.length > 0);
};

function pickFileFromBrowser(onSelected: (file: SelectedFile) => void, onError: (message: string) => void) {
  if (typeof document === 'undefined') {
    onError('File picker is only available on web for now.');
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.xlsx,.xls,.txt';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    onSelected({ file, name: file.name, size: file.size });
  };
  input.click();
}

function ResultSummary({ result }: { result: SellerBulkImportResult }) {
  return (
    <View className="gap-4">
      <View className="gap-4 sm:flex-row">
        <View className="min-w-0 flex-1 flex-row items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <Feather name="check-circle" color="#16a34a" size={32} />
          <View>
            <Text className="font-sans text-2xl font-bold text-green-700 dark:text-green-300">{result.imported}</Text>
            <Text className="font-sans text-sm text-green-600 dark:text-green-400">Imported</Text>
          </View>
        </View>
        <View className="min-w-0 flex-1 flex-row items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <Feather name="x-circle" color="#ef4444" size={32} />
          <View>
            <Text className="font-sans text-2xl font-bold text-red-600 dark:text-red-300">{result.skipped}</Text>
            <Text className="font-sans text-sm text-red-500 dark:text-red-400">Skipped</Text>
          </View>
        </View>
      </View>

      {result.errors.length > 0 ? (
        <View className="overflow-hidden rounded-xl border border-red-200 dark:border-red-800">
          <View className="border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
            <Text className="font-sans text-sm font-semibold text-red-700 dark:text-red-300">
              {result.errors.length} row(s) with errors
            </Text>
          </View>
          <View className="max-h-64">
            <ScrollView>
              {result.errors.map((error, index) => (
                <View key={`${error.row}-${index}`} className="border-b border-red-100 px-4 py-3 dark:border-red-900">
                  <Text className="mb-1 font-sans text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Row {error.row}
                  </Text>
                  {error.errors.map((message, messageIndex) => (
                    <Text key={`${message}-${messageIndex}`} className="font-sans text-sm text-red-600 dark:text-red-400">
                      - {message}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {result.imported > 0 ? (
        <Text className="font-sans text-sm text-gray-500 dark:text-gray-400">
          Imported products are in <Text className="font-semibold text-gray-700 dark:text-gray-300">Pending</Text> status and will be visible after admin approval.
        </Text>
      ) : null}
    </View>
  );
}

export function BulkImportNative({ onImported }: { onImported?: () => Promise<void> }) {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<SellerBulkImportResult | null>(null);
  const [error, setError] = useState('');

  const selectFile = async () => {
    if (Platform.OS !== 'web') {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/plain',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      setSelectedFile(documentToUploadFile(result.assets[0]));
      setResult(null);
      setError('');
      return;
    }

    pickFileFromBrowser(
      (file) => {
        setSelectedFile(file);
        setResult(null);
        setError('');
      },
      setError
    );
  };

  const downloadTemplate = async () => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      setError('Template download is only available on web for now.');
      return;
    }

    setDownloading(true);
    setError('');
    try {
      const blob = await downloadSellerBulkImportTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_import_template.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(formatApiErrorMessage(downloadError, 'Failed to download template.'));
    } finally {
      setDownloading(false);
    }
  };

  const upload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setResult(null);
    setError('');
    try {
      const nextResult = await importSellerProductsBulk(selectedFile.file, selectedFile.name);
      setResult(nextResult);
      setSelectedFile(null);
      await onImported?.();
    } catch (uploadError) {
      if (uploadError instanceof ApiError) {
        const rowErrors = normalizeImportErrors(uploadError.errors);
        if (rowErrors.length) {
          setResult({
            imported: 0,
            skipped: rowErrors.length,
            errors: rowErrors,
            importedList: [],
          });
        }
      }
      setError(formatApiErrorMessage(uploadError, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setResult(null);
    setError('');
  };

  return (
    <View className="gap-6">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View>
          <Text className="font-sans text-xl font-bold text-gray-900 dark:text-gray-100">
            Bulk Import Products
          </Text>
          <Text className="mt-0.5 font-sans text-sm text-gray-500 dark:text-gray-400">
            Upload a CSV or Excel file to add multiple products at once.
          </Text>
        </View>
        <Pressable
          onPress={downloadTemplate}
          disabled={downloading}
          className="flex-row items-center gap-2 rounded-xl border border-green-600 px-4 py-2 disabled:opacity-60"
        >
          {downloading ? <ActivityIndicator color="#16a34a" /> : <Feather name="download" color="#16a34a" size={16} />}
          <Text className="font-sans text-sm font-medium text-green-600">Download Template</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={selectFile}
        className="items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 px-6 py-14 hover:border-green-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800/50"
      >
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20">
          <Feather name="upload" color="#16a34a" size={24} />
        </View>
        {selectedFile ? (
          <View className="items-center">
            <Text className="font-sans font-semibold text-gray-800 dark:text-gray-100" numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Text className="font-sans text-sm text-gray-400">
              {(selectedFile.size / 1024).toFixed(1)} KB - click to change
            </Text>
          </View>
        ) : (
          <View className="items-center">
            <Text className="font-sans font-medium text-gray-700 dark:text-gray-300">
              Select your file to import
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-400">CSV, XLS, XLSX - max 5 MB, max 500 rows</Text>
          </View>
        )}
      </Pressable>

      {selectedFile ? (
        <View className="flex-row gap-3">
          <Pressable
            onPress={upload}
            disabled={uploading}
            className="min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 disabled:opacity-50"
          >
            {uploading ? <ActivityIndicator color="#ffffff" /> : <Feather name="upload" color="#ffffff" size={16} />}
            <Text className="font-sans font-semibold text-white">{uploading ? 'Importing...' : 'Import Products'}</Text>
          </Pressable>
          <Pressable
            onPress={reset}
            className="rounded-xl border border-gray-300 px-4 py-2.5 dark:border-gray-600"
          >
            <Text className="font-sans text-sm font-medium text-gray-600 dark:text-gray-300">Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {error && !result ? (
        <Pressable
          onPress={() => setError('')}
          className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
        >
          <Feather name="alert-triangle" color="#ef4444" size={20} />
          <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">{error}</Text>
          <Feather name="x" color="#ef4444" size={16} />
        </Pressable>
      ) : null}

      {result ? <ResultSummary result={result} /> : null}

      <View className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <Feather name="file-text" color="#6b7280" size={16} />
          <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-gray-300">Column Guide</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="min-w-[760px]">
            <View className="flex-row border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <Text className="w-44 px-4 py-2 font-sans text-sm font-medium text-gray-600 dark:text-gray-400">Column</Text>
              <Text className="w-28 px-4 py-2 font-sans text-sm font-medium text-gray-600 dark:text-gray-400">Required</Text>
              <Text className="min-w-0 flex-1 px-4 py-2 font-sans text-sm font-medium text-gray-600 dark:text-gray-400">Notes</Text>
            </View>
            {COLUMNS.map((column) => (
              <View key={column.name} className="flex-row border-b border-gray-100 dark:border-gray-800">
                <Text className="w-44 px-4 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">{column.name}</Text>
                <View className="w-28 px-4 py-2">
                  <View className={`self-start rounded-full px-2 py-0.5 ${column.required ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Text className={`font-sans text-xs font-medium ${column.required ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {column.required ? 'Required' : 'Optional'}
                    </Text>
                  </View>
                </View>
                <Text className="min-w-0 flex-1 px-4 py-2 font-sans text-sm text-gray-500 dark:text-gray-400">{column.note}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
