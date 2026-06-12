import { Link, type Href } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';

import { BrandLogo } from '@/components/ui/brand-logo';
import { FOOTER_LINK_GRID_CLASS, SITE_CONTAINER_CLASS } from '@/constants/layout';
import { useCookies } from '@/context/cookies';
import { useAppTranslation } from '@/i18n';

import { NewsletterWidget } from './newsletter-widget';

const socialLinks = [
  { url: 'https://facebook.com/PyoneaOfficial', labelKey: 'footer.facebook' },
  { url: 'https://twitter.com/PyoneaOfficial', labelKey: 'footer.twitter' },
  { url: 'https://linkedin.com/company/pyoneaofficial', labelKey: 'footer.linkedin' },
  { url: 'https://instagram.com/PyoneaOfficial', labelKey: 'footer.instagram' },
  { url: 'https://www.threads.com/@PyoneaOfficial', labelKey: 'footer.threads' },
] as const;

function FooterLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable className="self-start py-0.5">
        <Text className="font-sans text-sm text-gray-400">{label}</Text>
      </Pressable>
    </Link>
  );
}

function FooterHeading({ children }: { children: string }) {
  return (
    <Text className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
      {children}
    </Text>
  );
}

/** Web footer — structure and content aligned with legacy pyonea Footer.jsx */
export function SiteFooter() {
  const { t } = useAppTranslation();
  const { openBanner } = useCookies();
  const year = new Date().getFullYear();

  return (
    <View className="min-w-0 border-t border-white/5 bg-gray-900 text-white dark:bg-slate-950">
      <View className={`${SITE_CONTAINER_CLASS} min-w-0 pb-8 pt-12`}>
        <View className="gap-4 border-b border-white/10 pb-10 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" asChild>
            <Pressable className="w-fit flex-row items-center gap-2.5 self-start">
              <BrandLogo size={36} opacity={0.9} />
              <View className="min-w-0">
                <Text className="text-lg text-white" style={{ fontFamily: 'Torus-SemiBold' }}>
                  {t('header.logo_text')}
                </Text>
                <Text className="mt-0.5 max-w-md font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t('footer.tagline')}
                </Text>
              </View>
            </Pressable>
          </Link>
        </View>

        <View className={`${FOOTER_LINK_GRID_CLASS} pt-10`}>
          <View className="min-w-0">
            <FooterHeading>{t('footer.section_discover')}</FooterHeading>
            <View className="gap-1.5">
              <FooterLink href="/local-deals" label={t('footer.local_deals')} />
              <FooterLink href="/compare" label={t('footer.compare_product')} />
              <FooterLink href="/bulk-order-tool" label={t('footer.bulk_order_tool')} />
              <FooterLink href="/blog" label={t('footer.blog')} />
            </View>
          </View>

          <View className="min-w-0">
            <FooterHeading>{t('footer.section_help')}</FooterHeading>
            <View className="gap-1.5">
              <FooterLink href="/help" label={t('footer.help_center')} />
              <FooterLink href="/faq" label={t('footer.faq')} />
              <FooterLink href="/shipping" label={t('footer.shipping')} />
              <FooterLink href="/track-order" label={t('footer.track_order')} />
              <FooterLink href="/return-policy" label={t('footer.returns')} />
              <FooterLink href="/report" label={t('footer.report_issue')} />
            </View>
          </View>

          <View className="min-w-0">
            <FooterHeading>{t('footer.section_sell')}</FooterHeading>
            <View className="gap-1.5">
              <FooterLink href="/seller-guidelines" label={t('footer.seller_guidelines')} />
              <FooterLink href="/pricing" label={t('footer.pricing')} />
            </View>
          </View>

          <View className="min-w-0">
            <FooterHeading>{t('footer.section_company')}</FooterHeading>
            <View className="gap-1.5">
              <FooterLink href="/about-us" label={t('footer.about')} />
              <FooterLink href="/contact" label={t('footer.contact')} />
            </View>
          </View>

          <View className="min-w-0">
            <FooterHeading>{t('footer.section_legal')}</FooterHeading>
            <View className="gap-1.5">
              <FooterLink href="/terms" label={t('footer.terms')} />
              <FooterLink href="/privacy-policy" label={t('footer.privacy')} />
              <FooterLink href="/legal" label={t('footer.legal')} />
              <Pressable onPress={openBanner} className="self-start py-0.5">
                <Text className="text-left font-sans text-sm text-gray-400">
                  {t('footer.cookie_settings')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="mt-12 grid gap-10 border-t border-white/10 pt-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          <View className="order-2 gap-8 lg:order-1">
            <View>
              <FooterHeading>{t('footer.contact_info')}</FooterHeading>
              <View className="gap-2">
                <Pressable onPress={() => void Linking.openURL('tel:+959792115547')} className="self-start">
                  <Text className="font-sans text-sm text-gray-400">{t('footer.phone')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void Linking.openURL('mailto:contact@pyonea.com')}
                  className="self-start">
                  <Text className="font-sans text-sm text-gray-400">{t('footer.email')}</Text>
                </Pressable>
                <Text className="max-w-sm pt-1 font-sans text-sm leading-relaxed text-gray-500 dark:text-slate-500">
                  {t('footer.address')}
                </Text>
              </View>
            </View>

            <View>
              <FooterHeading>{t('footer.follow_us')}</FooterHeading>
              <View className="flex-row flex-wrap gap-x-5 gap-y-2">
                {socialLinks.map((link) => (
                  <Pressable
                    key={link.url}
                    onPress={() => void Linking.openURL(link.url)}
                    accessibilityRole="link"
                    className="self-start">
                    <Text className="font-sans text-sm text-gray-400">{t(link.labelKey)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View className="order-1 w-full max-w-lg lg:order-2 lg:justify-self-end">
            <NewsletterWidget variant="footer" source="footer" />
          </View>
        </View>

        <View className="mt-10 flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <View className="min-w-0">
            <Text className="font-sans text-sm text-gray-500 dark:text-slate-500">
              © {year}{' '}
              <Text className="text-gray-400 dark:text-slate-400">{t('header.logo_text')}</Text>
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-500 dark:text-slate-500 sm:mt-0">
              <Text className="hidden sm:inline"> · </Text>
              {t('footer.rights_reserved')}
            </Text>
          </View>
          <Text className="max-w-md font-sans text-sm text-gray-500 dark:text-slate-500 sm:text-right">
            {t('footer.copyright')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function Footer() {
  return <SiteFooter />;
}
