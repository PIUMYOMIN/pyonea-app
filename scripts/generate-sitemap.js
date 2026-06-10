const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const siteUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_APP_URL || 'https://pyonea.com');
const apiUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL || process.env.VITE_API_URL || 'https://api.pyonea.com/api/v1'
);
const today = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/products', priority: '0.9', changefreq: 'daily' },
  { path: '/categories', priority: '0.9', changefreq: 'weekly' },
  { path: '/sellers', priority: '0.8', changefreq: 'daily' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/bulk-order-tool', priority: '0.7', changefreq: 'monthly' },
  { path: '/local-deals', priority: '0.7', changefreq: 'daily' },
  { path: '/pricing', priority: '0.7', changefreq: 'monthly' },
  { path: '/about-us', priority: '0.6', changefreq: 'monthly' },
  { path: '/help', priority: '0.6', changefreq: 'monthly' },
  { path: '/faq', priority: '0.6', changefreq: 'monthly' },
  { path: '/shipping', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/seller-guidelines', priority: '0.6', changefreq: 'monthly' },
  { path: '/compare', priority: '0.5', changefreq: 'monthly' },
  { path: '/legal', priority: '0.4', changefreq: 'yearly' },
  { path: '/terms', priority: '0.4', changefreq: 'yearly' },
  { path: '/privacy-policy', priority: '0.4', changefreq: 'yearly' },
  { path: '/return-policy', priority: '0.4', changefreq: 'yearly' },
  { path: '/report', priority: '0.3', changefreq: 'monthly' },
];

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function withLang(routePath, language) {
  const url = new URL(`${siteUrl}${routePath}`);
  url.searchParams.set('lang', language);
  return url.toString();
}

function getArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.data)) {
      return payload.data.data;
    }
  }
  return [];
}

async function getJson(routePath) {
  const response = await fetch(`${apiUrl}${routePath}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${routePath}`);
  }

  return response.json();
}

function getSlug(item, fields) {
  for (const field of fields) {
    const value = item && item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function getLastmod(item) {
  const value = item && (item.updated_at || item.updatedAt || item.published_at || item.created_at);
  if (!value) return today;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? today : date.toISOString().slice(0, 10);
}

function uniqueRoutes(routes) {
  const seen = new Set();
  return routes.filter((route) => {
    if (seen.has(route.path)) return false;
    seen.add(route.path);
    return true;
  });
}

async function fetchAllPaginatedRoutes(routePath, mapItem, pageSize = 100, maxPages = 50) {
  const routes = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const separator = routePath.includes('?') ? '&' : '?';
    const payload = await getJson(`${routePath}${separator}page=${page}&per_page=${pageSize}`).catch(
      (error) => {
        if (page === 1) console.warn(error.message);
        return [];
      }
    );

    const items = getArrayPayload(payload);
    if (items.length === 0) break;

    routes.push(...items.map(mapItem));
    if (items.length < pageSize) break;
  }

  return routes;
}

function flattenCategories(items) {
  const flat = [];

  const walk = (categories) => {
    for (const category of categories) {
      flat.push(category);
      if (Array.isArray(category.children) && category.children.length > 0) {
        walk(category.children);
      }
    }
  };

  walk(items);
  return flat;
}

async function getDynamicRoutes() {
  const [products, categoriesPayload, sellersPayload, posts] = await Promise.all([
    fetchAllPaginatedRoutes(
      '/products?sort_by=created_at&sort_order=desc&fields=id,slug_en,slug,updated_at,created_at',
      (item) => ({
        path: `/products/${getSlug(item, ['slug_en', 'slug', 'id'])}`,
        lastmod: getLastmod(item),
        priority: '0.8',
        changefreq: 'weekly',
      })
    ),
    getJson(
      '/categories?fields=id,slug_en,slug_mm,updated_at,created_at,children&with_products_only=true'
    ).catch((error) => {
      console.warn(error.message);
      return [];
    }),
    getJson('/sellers?fields=id,store_slug,slug,updated_at,created_at').catch((error) => {
      console.warn(error.message);
      return [];
    }),
    fetchAllPaginatedRoutes('/blog', (item) => ({
      path: `/blog/${getSlug(item, ['slug', 'slug_en', 'id'])}`,
      lastmod: getLastmod(item),
      priority: '0.7',
      changefreq: 'monthly',
    })),
  ]);

  const categoryRoutes = [];
  for (const item of flattenCategories(getArrayPayload(categoriesPayload))) {
    const slugEn = getSlug(item, ['slug_en']);
    const slugMm = getSlug(item, ['slug_mm']);
    const lastmod = getLastmod(item);
    if (slugEn) {
      categoryRoutes.push({
        path: `/categories/${slugEn}`,
        lastmod,
        priority: '0.7',
        changefreq: 'weekly',
      });
    }
    if (slugMm && slugMm !== slugEn) {
      categoryRoutes.push({
        path: `/categories/${slugMm}`,
        lastmod,
        priority: '0.7',
        changefreq: 'weekly',
      });
    }
  }

  const sellers = getArrayPayload(sellersPayload).map((item) => ({
    path: `/sellers/${getSlug(item, ['store_slug', 'slug', 'id'])}`,
    lastmod: getLastmod(item),
    priority: '0.7',
    changefreq: 'weekly',
  }));

  return [...products, ...categoryRoutes, ...sellers, ...posts].filter(
    (route) => !route.path.endsWith('/')
  );
}

function renderUrl(route) {
  const lastmod = route.lastmod || today;
  const englishUrl = withLang(route.path, 'en');
  const myanmarUrl = withLang(route.path, 'my');

  return [
    '  <url>',
    `    <loc>${escapeXml(englishUrl)}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(englishUrl)}" />`,
    `    <xhtml:link rel="alternate" hreflang="my" href="${escapeXml(myanmarUrl)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(englishUrl)}" />`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority}</priority>`,
    '  </url>',
  ].join('\n');
}

async function main() {
  const dynamicRoutes = await getDynamicRoutes();
  const routes = uniqueRoutes([...staticRoutes, ...dynamicRoutes]);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    routes.map(renderUrl).join('\n'),
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), xml);
  console.log(`Generated public/sitemap.xml with ${routes.length} routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
