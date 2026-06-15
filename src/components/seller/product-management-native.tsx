import Feather from '@expo/vector-icons/Feather';
import { ProductThumb } from '@/components/ui/product-image';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  deleteSellerManagedProduct,
  fetchSellerManagedProducts,
  updateSellerManagedProductStatus,
  type SellerManagedProduct,
  type SellerProductLimitUsage,

  formatApiErrorMessage,
} from '@/utils/native-api';

type StatusFilter = 'all' | 'active' | 'inactive';

const PRODUCTS_PER_PAGE = 10;

function ProductSummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const styles = {
    blue: ['bg-blue-50 dark:bg-blue-900/20', '#2563eb'],
    green: ['bg-green-50 dark:bg-green-900/20', '#16a34a'],
    yellow: ['bg-yellow-50 dark:bg-yellow-900/20', '#ca8a04'],
    red: ['bg-red-50 dark:bg-red-900/20', '#dc2626'],
  } as const;
  const [bg, iconColor] = styles[color];

  return (
    <View className={`w-[48%] rounded-xl p-4 lg:w-[23%] ${bg}`}>
      <Feather name={icon} color={iconColor} size={22} />
      <Text className="mt-3 font-sans text-2xl font-black text-gray-950 dark:text-slate-100">
        {value}
      </Text>
      <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400">
        {label}
      </Text>
    </View>
  );
}

function StockBadge({ product }: { product: SellerManagedProduct }) {
  const out = !product.inStock;
  const low = product.inStock && product.totalStock > 0 && product.totalStock <= 5;

  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${
        out
          ? 'bg-red-100 dark:bg-red-900/30'
          : low
            ? 'bg-yellow-100 dark:bg-yellow-900/30'
            : 'bg-green-100 dark:bg-green-900/30'
      }`}>
      <Text
        className={`font-sans text-xs font-medium ${
          out
            ? 'text-red-800 dark:text-red-300'
            : low
              ? 'text-yellow-800 dark:text-yellow-300'
              : 'text-green-800 dark:text-green-300'
        }`}>
        {out ? 'Out of stock' : low ? 'Low stock' : 'In stock'}
      </Text>
    </View>
  );
}

function ProductRow({
  product,
  onToggle,
  onDelete,
}: {
  product: SellerManagedProduct;
  onToggle: (product: SellerManagedProduct) => void;
  onDelete: (product: SellerManagedProduct) => void;
}) {
  const router = useRouter();

  return (
    <View className="min-h-[84px] w-full flex-row items-center border-b border-gray-100 bg-white px-4 py-3 last:border-b-0 dark:border-slate-700 dark:bg-slate-800">
      <View className="w-80 flex-row gap-3 pr-4">
        <ProductThumb imageUrl={product.imageUrl} size={56} />
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-medium text-gray-900 dark:text-slate-100" numberOfLines={2}>
            {product.name}
          </Text>
          {product.sku ? (
            <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">SKU: {product.sku}</Text>
          ) : null}
        </View>
      </View>

      <View className="w-44 pr-4">
        <Text className="font-sans text-xs font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>
          {product.categoryName || '-'}
        </Text>
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
          {product.brand || 'No brand'}
        </Text>
      </View>

      <View className="w-36 pr-4">
        {product.isOnSale ? (
          <>
            <Text className="font-sans text-sm font-bold text-red-600 dark:text-red-400" numberOfLines={1}>{product.salePrice}</Text>
            <Text className="mt-1 font-sans text-xs text-gray-400 line-through dark:text-slate-500" numberOfLines={1}>{product.price}</Text>
          </>
        ) : (
          <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100" numberOfLines={1}>{product.price}</Text>
        )}
      </View>

      <View className="w-36 pr-4">
        <StockBadge product={product} />
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
          {product.totalStock.toLocaleString()} units
        </Text>
      </View>

      <View className="w-32 pr-4">
        <Pressable
          onPress={() => onToggle(product)}
          className={`self-start rounded-full px-2.5 py-1 ${
            product.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-slate-700'
          }`}>
          <Text
            className={`font-sans text-xs font-medium ${
              product.isActive ? 'text-green-800 dark:text-green-300' : 'text-gray-800 dark:text-slate-300'
            }`}>
            {product.isActive ? 'Active' : 'Inactive'}
          </Text>
        </Pressable>
        {product.isOnSale ? (
          <View className="mt-1 self-start rounded-full bg-yellow-100 px-2 py-0.5 dark:bg-yellow-900/30">
            <Text className="font-sans text-[11px] font-medium text-yellow-800 dark:text-yellow-300">
              {product.discountPercentage ? `-${product.discountPercentage}%` : 'Sale'}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="w-36 flex-row items-center gap-2">
        <Pressable
          onPress={() => router.push(`/products/${product.slug || product.id}` as Href)}
          className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <Feather name="external-link" color="#2563eb" size={17} />
        </Pressable>
        <Pressable
          onPress={() => router.push(`/seller/products/${product.id}/edit` as Href)}
          className="h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
          <Feather name="edit-2" color="#16a34a" size={17} />
        </Pressable>
        <Pressable onPress={() => onDelete(product)} className="h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
          <Feather name="trash-2" color="#dc2626" size={17} />
        </Pressable>
      </View>
    </View>
  );
}

function DeleteProductModal({
  product,
  onClose,
  onConfirm,
}: {
  product: SellerManagedProduct | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={Boolean(product)} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/30 p-4">
        <View className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <Text className="mb-4 font-sans text-lg font-semibold text-gray-900 dark:text-slate-100">Confirm Delete</Text>
          <Text className="mb-6 font-sans text-sm text-gray-600 dark:text-slate-400">
            Delete {product?.name || 'this product'}? This action cannot be undone.
          </Text>
          <View className="flex-row justify-end gap-3">
            <Pressable onPress={onClose} className="rounded-md bg-gray-200 px-4 py-2 dark:bg-slate-700">
              <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} className="rounded-md bg-red-600 px-4 py-2">
              <Text className="font-sans text-sm font-medium text-white">Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ProductManagementNative() {
  const router = useRouter();
  const [products, setProducts] = useState<SellerManagedProduct[]>([]);
  const [limitUsage, setLimitUsage] = useState<SellerProductLimitUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<SellerManagedProduct | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadProducts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const result = await fetchSellerManagedProducts();
      setProducts(result.products);
      setLimitUsage(result.limitUsage);
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to load products.'));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => void loadProducts(true), 0);
    return () => clearTimeout(timeout);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? product.isActive : !product.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  const lastPage = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > lastPage) {
      setCurrentPage(lastPage);
    }
  }, [currentPage, lastPage]);

  const finiteLimit = limitUsage && limitUsage.productLimit !== -1;
  const productLimitReached = Boolean(finiteLimit && limitUsage.productsUsed >= limitUsage.productLimit);
  const showLimitWarning = Boolean(
    limitUsage?.isNearLimit ||
      (finiteLimit && limitUsage.productsUsed >= Math.max(0, limitUsage.productLimit - 1))
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadProducts(false);
    setRefreshing(false);
  };

  const toggleStatus = async (product: SellerManagedProduct) => {
    const next = !product.isActive;
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? { ...item, isActive: next } : item))
    );
    try {
      await updateSellerManagedProductStatus(product.id, next);
      void loadProducts(false);
    } catch (err) {
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, isActive: product.isActive } : item))
      );
      setError(formatApiErrorMessage(err, 'Failed to update status.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const product = deleteTarget;
    setDeleteTarget(null);
    setProducts((current) => current.filter((item) => item.id !== product.id));
    try {
      await deleteSellerManagedProduct(product.id);
      void loadProducts(false);
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Failed to delete product.'));
      void loadProducts(true);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator color="#16a34a" size="large" />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <DeleteProductModal product={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />

      <View className="gap-4 md:flex-row md:items-center md:justify-between">
        <View>
          <Text className="font-sans text-2xl font-bold text-gray-900 dark:text-slate-100">Product Management</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-400">Manage your products</Text>
        </View>
        <View className="gap-3 sm:flex-row">
          <Pressable
            onPress={refresh}
            className="h-10 flex-row items-center justify-center rounded-md border border-gray-300 bg-white px-4 dark:border-slate-600 dark:bg-slate-800">
            <Feather name="refresh-cw" color="#64748b" size={16} />
            <Text className="ml-2 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </Pressable>
          <Pressable
            disabled={productLimitReached}
            onPress={() => router.push('/seller/products/create' as Href)}
            className="h-10 flex-row items-center justify-center rounded-md bg-green-600 px-4 disabled:bg-gray-400">
            <Feather name="plus" color="#ffffff" size={16} />
            <Text className="ml-2 font-sans text-sm font-medium text-white">Add Product</Text>
          </Pressable>
        </View>
      </View>

      {showLimitWarning && limitUsage ? (
        <View className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <View className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <View className="min-w-0 flex-1 flex-row gap-3">
              <Feather name="alert-triangle" color="#d97706" size={20} />
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {productLimitReached ? 'Product limit reached' : 'Product limit is almost full'}
                </Text>
                <Text className="mt-1 font-sans text-sm text-amber-800 dark:text-amber-300">
                  You have posted {limitUsage.productsUsed} of {limitUsage.productLimit} products on your current plan.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/seller/dashboard?tab=subscription' as Href)}
              className="h-9 items-center justify-center rounded-md bg-amber-600 px-3">
              <Text className="font-sans text-sm font-semibold text-white">Upgrade plan</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? (
        <Pressable onPress={() => setError('')} className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <View className="flex-row gap-3">
            <Feather name="alert-triangle" color="#dc2626" size={20} />
            <Text className="min-w-0 flex-1 font-sans text-sm font-medium text-red-800 dark:text-red-300">{error}</Text>
          </View>
        </Pressable>
      ) : null}

      <View className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <View className="gap-4 sm:flex-row sm:items-center">
          <View className="min-w-0 flex-1">
            <View className="h-10 flex-row items-center rounded-md border border-gray-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-800">
              <Feather name="search" color="#94a3b8" size={17} />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search products..."
                placeholderTextColor="#94a3b8"
                className="ml-2 min-w-0 flex-1 font-sans text-sm text-gray-900 dark:text-slate-100"
              />
            </View>
          </View>
          <View className="flex-row gap-2">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((filter) => {
              const active = statusFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  className={`h-10 justify-center rounded-md border px-3 ${
                    active
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                  }`}>
                  <Text
                    className={`font-sans text-sm font-medium capitalize ${
                      active ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-slate-300'
                    }`}>
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {(searchTerm || statusFilter !== 'all') ? (
            <Pressable
              onPress={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="h-10 flex-row items-center justify-center rounded-md border border-gray-300 bg-white px-4 dark:border-slate-600 dark:bg-slate-800">
              <Feather name="x" color="#64748b" size={16} />
              <Text className="ml-2 font-sans text-sm font-medium text-gray-700 dark:text-slate-300">Clear</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <ProductSummaryCard icon="box" label="Total Products" value={products.length} color="blue" />
        <ProductSummaryCard icon="check-circle" label="Active Products" value={products.filter((p) => p.isActive).length} color="green" />
        <ProductSummaryCard icon="tag" label="On Sale" value={products.filter((p) => p.isOnSale).length} color="yellow" />
        <ProductSummaryCard icon="box" label="Out of Stock" value={products.filter((p) => !p.inStock).length} color="red" />
      </View>

      <View className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {filteredProducts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="min-w-full">
            <View className="w-full min-w-[1088px]">
              <View className="w-full flex-row bg-gray-50 px-4 py-3 dark:bg-slate-900">
                {[
                  { label: 'Product', width: 'w-80' },
                  { label: 'Category / Brand', width: 'w-44' },
                  { label: 'Price', width: 'w-36' },
                  { label: 'Stock', width: 'w-36' },
                  { label: 'Status', width: 'w-32' },
                  { label: 'Actions', width: 'w-36' },
                ].map((heading) => (
                  <Text key={heading.label} className={`${heading.width} pr-4 font-sans text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400`}>
                    {heading.label}
                  </Text>
                ))}
              </View>
              {paginatedProducts.map((product) => (
                <ProductRow key={String(product.id)} product={product} onToggle={toggleStatus} onDelete={setDeleteTarget} />
              ))}
            </View>
          </ScrollView>
        ) : null}

        {filteredProducts.length > 0 && lastPage > 1 ? (
          <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-4 dark:border-slate-700">
            <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
              Page {currentPage} of {lastPage} ({filteredProducts.length} products)
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                disabled={currentPage <= 1}
                onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Previous</Text>
              </Pressable>
              <Pressable
                disabled={currentPage >= lastPage}
                onPress={() => setCurrentPage((page) => page + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">
                <Text className="font-sans text-sm text-gray-700 dark:text-slate-300">Next</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {filteredProducts.length === 0 ? (
          <View className="items-center p-10">
            <Feather name="box" color="#94a3b8" size={58} />
            <Text className="mt-4 font-sans text-lg font-medium text-gray-900 dark:text-slate-100">No products found</Text>
            <Text className="mt-2 max-w-md text-center font-sans text-sm text-gray-600 dark:text-slate-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Try changing your filters.'
                : 'Create your first product to start selling.'}
            </Text>
            {!searchTerm && statusFilter === 'all' ? (
              <Pressable
                disabled={productLimitReached}
                onPress={() => router.push('/seller/products/create' as Href)}
                className="mt-4 rounded-md bg-green-600 px-4 py-2 disabled:bg-gray-400">
                <Text className="font-sans text-sm font-medium text-white">Add first product</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
