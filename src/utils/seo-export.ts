import {
    ApiError,
    fetchBlogPagePosts,
    fetchProductList,
    fetchSellers,
    isAbortError,
    type BlogPost,
    type HomeProduct,
    type HomeSeller,
} from "@/utils/native-api";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 50;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch SEO loader data with retries. During `expo export` the API receives a
 * burst of loader requests; transient slowdowns/timeouts must not silently bake
 * generic SEO into the static pages. Genuine 404s are not retried.
 */
export async function loadSeoDataWithRetry<T>(
  label: string,
  fetcher: (signal?: AbortSignal) => Promise<T>,
  attempts = 3,
  baseDelayMs = 2000,
  signal?: AbortSignal,
): Promise<T | null> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetcher(signal);
    } catch (error) {
      if (isAbortError(error, signal)) {
        return null;
      }
      if (error instanceof ApiError && error.status === 404) {
        console.warn(`[seo-export] not found (404), skipping: ${label}`);
        return null;
      }
      if (attempt === attempts) {
        console.warn(
          `[seo-export] loader failed after ${attempts} attempts: ${label} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return null;
      }
      await sleep(baseDelayMs * attempt);
    }
  }
  return null;
}

const getSlug = (
  item: { slug?: string; id?: string | number },
  fallbacks: string[] = [],
) => {
  if (item.slug) return item.slug;
  for (const key of fallbacks) {
    const value = (item as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return item.id != null ? String(item.id) : "";
};

export async function fetchAllProductSlugs(
  limitPages = MAX_PAGES,
): Promise<string[]> {
  const slugs = new Set<string>();

  for (let page = 1; page <= limitPages; page += 1) {
    const products = await fetchProductList({
      page,
      perPage: DEFAULT_PAGE_SIZE,
      sortBy: "created_at",
      sortOrder: "desc",
    }).catch(() => [] as HomeProduct[]);

    if (products.length === 0) break;

    products.forEach((product) => {
      const slug = getSlug(product, ["slug"]);
      if (slug) slugs.add(slug);
    });

    if (products.length < DEFAULT_PAGE_SIZE) break;
  }

  return [...slugs];
}

export async function fetchAllBlogSlugs(
  limitPages = MAX_PAGES,
): Promise<string[]> {
  const slugs = new Set<string>();

  for (let page = 1; page <= limitPages; page += 1) {
    const { posts } = await fetchBlogPagePosts({
      page,
      perPage: DEFAULT_PAGE_SIZE,
    }).catch(() => ({
      posts: [] as BlogPost[],
    }));

    if (posts.length === 0) break;

    posts.forEach((post) => {
      const slug = getSlug(post, ["slug"]);
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
    const slug = getSlug(seller, ["slug"]);
    if (slug) slugs.add(slug);
  });

  return [...slugs];
}
