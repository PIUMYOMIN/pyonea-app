import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const SearchFilters = ({ filters, onFilterChange, mobile = false }) => {
  const { t } = useTranslation();

  const getSelectedPriceRange = () => {
    const { minPrice, maxPrice } = filters;
    if (!minPrice && !maxPrice) return '';
    if (minPrice === '' && maxPrice === '10000') return '0-10000';
    if (minPrice === '10000' && maxPrice === '50000') return '10000-50000';
    if (minPrice === '50000' && maxPrice === '100000') return '50000-100000';
    if (minPrice === '100000' && maxPrice === '') return '100000-';
    return '';
  };

  const [selectedPriceRange, setSelectedPriceRange] = useState(getSelectedPriceRange());

  useEffect(() => {
    setSelectedPriceRange(getSelectedPriceRange());
  }, [filters.minPrice, filters.maxPrice]);

  const handlePriceChange = (rangeValue) => {
    let newMin = '', newMax = '';
    if (rangeValue === '0-10000')       { newMin = '';       newMax = '10000';  }
    else if (rangeValue === '10000-50000')  { newMin = '10000';  newMax = '50000';  }
    else if (rangeValue === '50000-100000') { newMin = '50000';  newMax = '100000'; }
    else if (rangeValue === '100000-')      { newMin = '100000'; newMax = '';       }
    onFilterChange({ minPrice: newMin, maxPrice: newMax });
  };

  const priceRanges = [
    { value: '0-10000',     label: t('filter.under_10000')    },
    { value: '10000-50000', label: t('filter.10000_to_50000') },
    { value: '50000-100000',label: t('filter.50000_to_100000')},
    { value: '100000-',     label: t('filter.over_100000')    },
  ];

  return (
    <div className={`space-y-6 ${mobile ? 'px-1' : ''}`}>
      {/* Price Range */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          {t('filter.price_range')}
        </h4>
        <div className="space-y-2">
          {priceRanges.map((range) => (
            <label
              key={range.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selectedPriceRange === range.value}
                onChange={() => handlePriceChange(range.value)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600
                           text-green-600 focus:ring-green-500 dark:focus:ring-green-600
                           dark:bg-gray-700 dark:checked:bg-green-600 cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400
                               group-hover:text-gray-900 dark:group-hover:text-gray-200
                               transition-colors">
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          {t('filter.sort_by')}
        </h4>
        <select
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split(':');
            onFilterChange({ sortBy, sortOrder });
          }}
          className="block w-full px-3 py-2 text-sm rounded-lg
                     border border-gray-200 dark:border-gray-600
                     bg-white dark:bg-gray-700
                     text-gray-800 dark:text-gray-200
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="created_at:desc">{t('filter.newest')}</option>
          <option value="price:asc">{t('filter.price_low_to_high')}</option>
          <option value="price:desc">{t('filter.price_high_to_low')}</option>
          <option value="average_rating:desc">{t('filter.top_rated')}</option>
          <option value="review_count:desc">{t('filter.most_reviewed')}</option>
        </select>
      </div>
    </div>
  );
};

export default SearchFilters;
