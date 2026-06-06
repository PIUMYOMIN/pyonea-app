import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

const CategorySelector = ({ categories, selectedCategory, onCategorySelect, mobile = false }) => {
  const { t, i18n } = useTranslation();

  const displayName = (cat) =>
    i18n.language === 'my'
      ? (cat.name_mm || cat.name_en || cat.name)
      : (cat.name_en || cat.name);

  const filterZeroProductCategories = (cats) =>
    cats
      .map(cat => ({
        ...cat,
        children: cat.children ? filterZeroProductCategories(cat.children) : []
      }))
      .filter(cat => cat.products_count > 0 || (cat.children && cat.children.length > 0));

  const filteredCategories = filterZeroProductCategories(categories);

  const renderCategory = (category, depth = 0) => {
    const isSelected = selectedCategory === String(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id} className="select-none">
        <div
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg cursor-pointer
                      transition-colors duration-150 ${depth > 0 ? 'ml-4' : ''}
                      ${isSelected
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
          onClick={() => onCategorySelect(category.id)}
        >
          <span className="text-sm truncate pr-2">{displayName(category)}</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {category.products_count > 0 && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                ({category.products_count})
              </span>
            )}
            {hasChildren && (
              <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </div>
        {hasChildren && category.children.map((child) => renderCategory(child, depth + 1))}
      </div>
    );
  };

  const isAllSelected = selectedCategory === null || selectedCategory === '';

  return (
    <div className={`space-y-0.5 ${mobile ? 'px-1' : ''}`}>
      <div
        className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg cursor-pointer
                    transition-colors duration-150
                    ${isAllSelected
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
        onClick={() => onCategorySelect(null)}
      >
        <span className="text-sm">{t('categories.all_categories')}</span>
      </div>

      {filteredCategories
        .filter((cat) => !cat.parent_id)
        .map((rootCat) => renderCategory(rootCat))}
    </div>
  );
};

export default CategorySelector;
