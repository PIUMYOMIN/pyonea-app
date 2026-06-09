import { useLocalSearchParams } from 'expo-router';

import { ProductFormNative } from '@/components/seller/product-form-native';

export default function SellerProductEditRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;

  return <ProductFormNative productId={id} />;
}
