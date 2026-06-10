#!/usr/bin/env node
/**
 * Production web deploy bundle:
 * 1) Regenerate sitemap.xml from the live API
 * 2) Static export with full SEO routes (products/blog/sellers/categories)
 * 3) Copy Apache + SEO files from public/ into dist/
 *
 * Upload the dist/ folder contents to Namecheap public_html.
 *
 * Usage:
 *   npm run deploy:web
 *   npm run deploy:web -- --out ./release/pyonea-web
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const envPath = path.join(root, '.env');

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const outArgIndex = process.argv.indexOf('--out');
const customOut = outArgIndex >= 0 ? process.argv[outArgIndex + 1] : null;

const env = {
  ...process.env,
  EXPO_PUBLIC_SKIP_DYNAMIC_SEO_EXPORT: '',
};

function run(label, command, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    cwd: root,
  });

  if (result.status !== 0) {
    console.error(`\n✗ ${label} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) {
    console.warn(`  skip missing ${path.relative(root, from)}`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`  copied ${path.relative(root, from)} → ${path.relative(root, to)}`);
}

function copyPublicDeployFiles(distDir) {
  console.log('\n▶ Copying public deploy files into dist/');
  const publicDir = path.join(root, 'public');
  const files = [
    '.htaccess',
    'robots.txt',
    'sitemap.xml',
    'og-proxy.php',
    'site.webmanifest',
    'manifest.json',
    'favicon.ico',
  ];

  for (const file of files) {
    copyIfExists(path.join(publicDir, file), path.join(distDir, file));
  }
}

function summarize(distDir) {
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  const urlCount = fs.existsSync(sitemapPath)
    ? (fs.readFileSync(sitemapPath, 'utf8').match(/<loc>/g) || []).length
    : 0;

  console.log('\n✓ Production web bundle ready');
  console.log(`  Output: ${distDir}`);
  console.log(`  Sitemap URLs: ${urlCount}`);
  console.log(`  GA4: ${process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID || '(not set — add to .env)'}`);
  console.log(
    `  Search Console token: ${process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION ? 'set' : '(not set — add to .env)'}`
  );
  console.log('\nUpload everything inside dist/ to Namecheap public_html.');
  console.log('Then submit https://pyonea.com/sitemap.xml in Google Search Console.');
}

run('Generate sitemap', 'node', ['./scripts/generate-sitemap.js']);
run('Export static web (SSG)', 'npx', ['expo', 'export', '--platform', 'web']);

const distDir = customOut ? path.resolve(customOut) : path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  console.error(`\n✗ Expected export output at ${distDir}`);
  process.exit(1);
}

copyPublicDeployFiles(distDir);
summarize(distDir);
