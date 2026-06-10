/** Shared marketplace layout width — must match pyonea web:
 * `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` on the same element.
 */
export const SITE_CONTAINER_CLASS =
  'site-container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';

export const SITE_CONTAINER_6XL_CLASS =
  'site-container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

export const SITE_CONTAINER_5XL_CLASS =
  'site-container mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8';

export const SITE_CONTAINER_4XL_CLASS =
  'site-container mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8';

/** Home page grids — match pyonea Home.jsx column counts. */
export const HOME_CATEGORY_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';

export const HOME_PRODUCT_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5';

export const HOME_SELLER_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4';

export const HOME_VALUE_GRID_CLASS =
  'grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-10';

/** Product grids — match pyonea ProductList.jsx / seller profile tabs. */
export const PRODUCT_LIST_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 xl:grid-cols-4';

/** Category browser — match pyonea CategoryBrowser.jsx. */
export const CATEGORY_BROWSER_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-6';

/** Seller directory — match pyonea Sellers.jsx. */
export const SELLER_DIRECTORY_GRID_CLASS =
  'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

/** Blog post cards — match pyonea Blog.jsx. */
export const BLOG_POST_GRID_CLASS = 'grid gap-6 md:grid-cols-2 lg:grid-cols-3';

/** Local deals — match pyonea LocalDeals.jsx. */
export const LOCAL_DEALS_GRID_CLASS = 'grid grid-cols-1 gap-4 md:grid-cols-2';

/** Footer link columns — match pyonea Footer.jsx. */
export const FOOTER_LINK_GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-8 gap-y-10';

/** Native bottom tab bar + safe padding used by floating UI (compare FAB, etc.). */
export const NATIVE_BOTTOM_TAB_OFFSET_CLASS = 'bottom-24';
