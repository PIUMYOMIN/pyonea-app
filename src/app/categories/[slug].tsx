import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAppTranslation } from '@/i18n';
import { fetchCategoryDetail } from '@/utils/native-api';

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Legacy-style routing: category slugs open the product list in filter mode. */
export default function CategorySlugRedirect() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const { language } = useAppTranslation();
  const categorySlug = firstParam(params.slug);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!categorySlug) {
      setTarget(`/products?lang=${language}`);
      return;
    }

    const controller = new AbortController();

    void fetchCategoryDetail(categorySlug, controller.signal)
      .then((category) => {
        if (controller.signal.aborted) return;
        if (category?.id) {
          setTarget(
            `/products?category=${encodeURIComponent(String(category.id))}&lang=${language}`,
          );
          return;
        }
        setTarget(`/products?lang=${language}`);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTarget(`/products?lang=${language}`);
        }
      });

    return () => controller.abort();
  }, [categorySlug, language]);

  if (!target) {
    return (
      <View className="min-h-[40vh] items-center justify-center bg-gray-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return <Redirect href={target as never} />;
}
