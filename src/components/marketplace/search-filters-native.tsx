import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import SearchFilters from '@/components/marketplace/SearchFilters';
import { useAppTranslation } from '@/i18n';

export const priceRanges = [
  { value: '0-10000', minPrice: '', maxPrice: '10000', labelKey: 'filter.under_10000' },
  {
    value: '10000-50000',
    minPrice: '10000',
    maxPrice: '50000',
    labelKey: 'filter.10000_to_50000',
  },
  {
    value: '50000-100000',
    minPrice: '50000',
    maxPrice: '100000',
    labelKey: 'filter.50000_to_100000',
  },
  { value: '100000-', minPrice: '100000', maxPrice: '', labelKey: 'filter.over_100000' },
] as const;

export const sortOptions = [
  { value: 'created_at:desc', sortBy: 'created_at', sortOrder: 'desc', labelKey: 'filter.newest' },
  { value: 'price:asc', sortBy: 'price', sortOrder: 'asc', labelKey: 'filter.price_low_to_high' },
  { value: 'price:desc', sortBy: 'price', sortOrder: 'desc', labelKey: 'filter.price_high_to_low' },
  {
    value: 'average_rating:desc',
    sortBy: 'average_rating',
    sortOrder: 'desc',
    labelKey: 'filter.top_rated',
  },
  {
    value: 'review_count:desc',
    sortBy: 'review_count',
    sortOrder: 'desc',
    labelKey: 'filter.most_reviewed',
  },
] as const;

export type SearchFilterValues = {
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  sortOrder: string;
};

type SearchFiltersNativeProps = {
  filters: SearchFilterValues;
  onFilterChange: (updates: Partial<SearchFilterValues>) => void;
  mobile?: boolean;
};

function getSelectedPriceRange(minPrice: string, maxPrice: string) {
  if (!minPrice && !maxPrice) return '';
  if (minPrice === '' && maxPrice === '10000') return '0-10000';
  if (minPrice === '10000' && maxPrice === '50000') return '10000-50000';
  if (minPrice === '50000' && maxPrice === '100000') return '50000-100000';
  if (minPrice === '100000' && maxPrice === '') return '100000-';
  return '';
}

function resolvePriceRange(rangeValue: string) {
  const range = priceRanges.find((item) => item.value === rangeValue);
  if (!range) return { minPrice: '', maxPrice: '' };
  return { minPrice: range.minPrice, maxPrice: range.maxPrice };
}

function NativeSearchFilters({ filters, onFilterChange, mobile = false }: SearchFiltersNativeProps) {
  const { t } = useAppTranslation();
  const [sortOpen, setSortOpen] = useState(false);
  const selectedPriceRange = useMemo(
    () => getSelectedPriceRange(filters.minPrice, filters.maxPrice),
    [filters.maxPrice, filters.minPrice]
  );
  const selectedSort = `${filters.sortBy}:${filters.sortOrder}`;
  const selectedSortLabel =
    sortOptions.find((option) => option.value === selectedSort)?.labelKey ?? 'filter.newest';

  useEffect(() => {
    setSortOpen(false);
  }, [selectedSort]);

  const handlePriceChange = (rangeValue: string) => {
    onFilterChange(resolvePriceRange(rangeValue));
  };

  return (
    <View className={`gap-6 ${mobile ? 'px-1' : ''}`}>
      <View>
        <Text className="mb-3 font-sans text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('filter.price_range')}
        </Text>
        <View className="gap-2">
          {priceRanges.map((range) => {
            const active = selectedPriceRange === range.value;
            return (
              <Pressable
                key={range.value}
                onPress={() => handlePriceChange(range.value)}
                className="flex-row items-center gap-3 active:opacity-80"
              >
                <View
                  className={`h-4 w-4 items-center justify-center rounded border ${
                    active
                      ? 'border-green-600 bg-green-600'
                      : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'
                  }`}
                >
                  {active ? <Feather name="check" color="#ffffff" size={12} /> : null}
                </View>
                <Text
                  className={`flex-1 font-sans text-sm ${
                    active
                      ? 'text-gray-900 dark:text-gray-200'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t(range.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text className="mb-3 font-sans text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('filter.sort_by')}
        </Text>
        <Pressable
          onPress={() => setSortOpen((open) => !open)}
          className="min-h-10 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
        >
          <Text className="min-w-0 flex-1 font-sans text-sm text-gray-800 dark:text-gray-200">
            {t(selectedSortLabel)}
          </Text>
          <Feather
            name={sortOpen ? 'chevron-up' : 'chevron-down'}
            color="#9ca3af"
            size={16}
          />
        </Pressable>
        {sortOpen ? (
          <View className="mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700">
            {sortOptions.map((option) => {
              const active = selectedSort === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onFilterChange({ sortBy: option.sortBy, sortOrder: option.sortOrder });
                    setSortOpen(false);
                  }}
                  className={`min-h-10 justify-center border-b border-gray-100 px-3 py-2 last:border-b-0 dark:border-gray-600 ${
                    active ? 'bg-green-50 dark:bg-green-900/30' : ''
                  }`}
                >
                  <Text
                    className={`font-sans text-sm ${
                      active
                        ? 'font-medium text-green-700 dark:text-green-300'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function SearchFiltersNative(props: SearchFiltersNativeProps) {
  if (Platform.OS === 'web') {
    return <SearchFilters {...props} />;
  }

  return <NativeSearchFilters {...props} />;
}
