import {
  fetchBlogPagePosts,
  fetchCategoryBrowser,
  fetchProductList,
  fetchSellers,
  flattenBrowserCategories,
  type BlogPost,
  type HomeProduct,
  type HomeSeller,
} from '@/utils/native-api';

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 50;

const getSlug = (item: { slug?: string; id?: string | number }, fallbacks: string[] = []) => {
  if (item.slug) return item.slug;
  for (const key of fallbacks) {
    const value = (item as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return item.id != null ? String(item.id) : '';
};

export async function fetchAllProductSlugs(limitPages = MAX_PAGES): Promise<string[]> {
  const slugs = new Set<string>();

  for (let page = 1; page <= limitPages; page += 1) {
    const products = await fetchProductList({
      page,
      perPage: DEFAULT_PAGE_SIZE,
      sortBy: 'created_at',
      sortOrder: 'desc',
    }).catch(() => [] as HomeProduct[]);

    if (products.length === 0) break;

    products.forEach((product) => {
      const slug = getSlug(product, ['slug']);
      if (slug) slugs.add(slug);
    });

    if (products.length < DEFAULT_PAGE_SIZE) break;
  }

  return [...slugs];
}

export async function fetchAllBlogSlugs(limitPages = MAX_PAGES): Promise<string[]> {
  const slugs = new Set<string>();

  for (let page = 1; page <= limitPages; page += 1) {
    const { posts } = await fetchBlogPagePosts({ page, perPage: DEFAULT_PAGE_SIZE }).catch(() => ({
      posts: [] as BlogPost[],
    }));

    if (posts.length === 0) break;

    posts.forEach((post) => {
      const slug = getSlug(post, ['slug']);
      if (slug) slugs.add(slug);
    });

    if (posts.length < DEFAULT_PAGE_SIZE) break;
  }

  return [...slugs];
}

export async function fetchAllSellerSlugs(): Promise<string[]> {
  const sellers = await fetchSellers().catch(() => [] as HomeSeller[]);
  const slugs = new Set<string>();

  sellers.forEach((seller) => {
    const slug = getSlug(seller, ['slug']);
    if (slug) slugs.add(slug);
  });

  return [...slugs];
}

export async function fetchAllCategorySlugs(): Promise<string[]> {
  const tree = await fetchCategoryBrowser().catch(() => []);
  const slugs = new Set<string>();

  flattenBrowserCategories(tree).forEach((category) => {
    if (category.slugEn) slugs.add(category.slugEn);
    if (category.slugMm && category.slugMm !== category.slugEn) slugs.add(category.slugMm);
    if (!category.slugEn && !category.slugMm) slugs.add(String(category.id));
  });

  return [...slugs];
}
