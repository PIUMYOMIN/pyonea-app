export function shouldSkipDynamicSeoExport() {
  return process.env.EXPO_PUBLIC_SKIP_DYNAMIC_SEO_EXPORT === '1';
}
