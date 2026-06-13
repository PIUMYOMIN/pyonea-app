import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { SocialShareModal } from '@/components/ui/social-share-modal';
import type { SocialSharePayload } from '@/utils/social-share';

type ProductDetailActionsProps = {
  compact: boolean;
  stockIsOut: boolean;
  variantReady: boolean;
  addingToCart: boolean;
  primaryCtaLabel: string;
  compared: boolean;
  savedToWishlist: boolean;
  wishlistLoading: boolean;
  shareOpen: boolean;
  sharePayload: SocialSharePayload | null;
  onPrimaryCta: () => void;
  onBuyNow: () => void;
  onToggleWishlist: () => void;
  onShare: () => void;
  onShareClose: () => void;
  onToggleCompare: () => void;
  labels: {
    outOfStock: string;
    buyNow: string;
    compared: string;
    compare: string;
    removeFromWishlist: string;
    addToWishlist: string;
    shareProduct: string;
    shareOn: string;
    copyLink: string;
    copied: string;
    close: string;
    removeFromCompare: string;
    addToCompare: string;
    shareFacebook: string;
    shareWhatsapp: string;
    shareViber: string;
    shareTelegram: string;
    shareX: string;
  };
};

function IconActionsRow({
  compared,
  savedToWishlist,
  wishlistLoading,
  shareOpen,
  onToggleWishlist,
  onShare,
  onToggleCompare,
  labels,
}: Pick<
  ProductDetailActionsProps,
  | 'compared'
  | 'savedToWishlist'
  | 'wishlistLoading'
  | 'shareOpen'
  | 'onToggleWishlist'
  | 'onShare'
  | 'onToggleCompare'
  | 'labels'
>) {
  return (
    <View className="min-w-0 flex-row items-center gap-1.5 sm:gap-2">
      <Pressable
        onPress={onToggleWishlist}
        disabled={wishlistLoading}
        accessibilityLabel={
          savedToWishlist ? labels.removeFromWishlist : labels.addToWishlist
        }
        className={`h-8 w-8 items-center justify-center rounded-md border sm:h-9 sm:w-9 ${
          savedToWishlist
            ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
        }`}>
        {wishlistLoading ? (
          <ActivityIndicator color="#16a34a" size="small" />
        ) : (
          <Feather name="heart" color={savedToWishlist ? '#ef4444' : '#64748b'} size={16} />
        )}
      </Pressable>

      <Pressable
        onPress={onShare}
        accessibilityLabel={labels.shareProduct}
        className={`h-8 w-8 items-center justify-center rounded-md border sm:h-9 sm:w-9 ${
          shareOpen
            ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/30'
            : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
        }`}>
        <Feather name="share-2" color={shareOpen ? '#16a34a' : '#64748b'} size={16} />
      </Pressable>

      <Pressable
        onPress={onToggleCompare}
        accessibilityLabel={compared ? labels.removeFromCompare : labels.addToCompare}
        className={`h-8 items-center justify-center rounded-md border px-2 sm:h-9 sm:min-w-[5.5rem] sm:px-2.5 ${
          compared
            ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30'
            : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
        }`}>
        <Text
          className={`font-sans text-[11px] font-semibold sm:text-xs ${
            compared ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-300'
          }`}
          numberOfLines={1}>
          {compared ? labels.compared : labels.compare}
        </Text>
      </Pressable>
    </View>
  );
}

function PrimaryCtaButton({
  variantReady,
  addingToCart,
  primaryCtaLabel,
  onPrimaryCta,
}: Pick<
  ProductDetailActionsProps,
  'variantReady' | 'addingToCart' | 'primaryCtaLabel' | 'onPrimaryCta'
>) {
  return (
    <Pressable
      onPress={onPrimaryCta}
      disabled={addingToCart}
      className={`min-h-9 flex-row items-center justify-center rounded-md px-3 py-1.5 sm:min-h-10 sm:px-4 ${
        variantReady ? 'bg-green-600' : 'bg-amber-500'
      } ${addingToCart ? 'opacity-50' : ''}`}>
      {addingToCart ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Feather name={variantReady ? 'shopping-cart' : 'sliders'} color="#ffffff" size={14} />
      )}
      <Text className="ml-1.5 font-sans text-xs font-semibold text-white sm:text-sm" numberOfLines={1}>
        {primaryCtaLabel}
      </Text>
    </Pressable>
  );
}

function BuyNowButton({
  addingToCart,
  buyNowLabel,
  onBuyNow,
}: {
  addingToCart: boolean;
  buyNowLabel: string;
  onBuyNow: () => void;
}) {
  return (
    <Pressable
      onPress={onBuyNow}
      disabled={addingToCart}
      className={`min-h-9 items-center justify-center rounded-md bg-gray-800 px-3 py-1.5 dark:bg-slate-700 sm:min-h-10 sm:px-4 ${
        addingToCart ? 'opacity-50' : ''
      }`}>
      <Text className="font-sans text-xs font-semibold text-white sm:text-sm" numberOfLines={1}>
        {buyNowLabel}
      </Text>
    </Pressable>
  );
}

export function ProductDetailActions(props: ProductDetailActionsProps) {
  const { compact, stockIsOut, labels, shareOpen, sharePayload, onShareClose } = props;

  if (stockIsOut) {
    return (
      <View className="gap-2 pt-4">
        <Pressable
          disabled
          className="min-h-9 items-center justify-center rounded-md bg-gray-300 px-3 py-1.5 dark:bg-slate-700">
          <Text className="font-sans text-xs font-semibold text-gray-500 dark:text-slate-400 sm:text-sm">
            🚫 {labels.outOfStock}
          </Text>
        </Pressable>
      </View>
    );
  }

  const shareModal =
    shareOpen && sharePayload ? (
      <SocialShareModal
        open={shareOpen}
        payload={sharePayload}
        onClose={onShareClose}
        labels={{
          heading: labels.shareProduct,
          shareOn: labels.shareOn,
          copyLink: labels.copyLink,
          copied: labels.copied,
          close: labels.close,
          shareFacebook: labels.shareFacebook,
          shareWhatsapp: labels.shareWhatsapp,
          shareViber: labels.shareViber,
          shareTelegram: labels.shareTelegram,
          shareX: labels.shareX,
        }}
      />
    ) : null;

  if (compact) {
    return (
      <>
        {shareModal}
        <View className="gap-2 pt-4">
          <PrimaryCtaButton
            variantReady={props.variantReady}
            addingToCart={props.addingToCart}
            primaryCtaLabel={props.primaryCtaLabel}
            onPrimaryCta={props.onPrimaryCta}
          />
          <BuyNowButton
            addingToCart={props.addingToCart}
            buyNowLabel={labels.buyNow}
            onBuyNow={props.onBuyNow}
          />
          <IconActionsRow
            compared={props.compared}
            savedToWishlist={props.savedToWishlist}
            wishlistLoading={props.wishlistLoading}
            shareOpen={props.shareOpen}
            onToggleWishlist={props.onToggleWishlist}
            onShare={props.onShare}
            onToggleCompare={props.onToggleCompare}
            labels={labels}
          />
        </View>
      </>
    );
  }

  return (
    <>
      {shareModal}
      <View className="gap-2 pt-4">
        <View className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2">
          <PrimaryCtaButton
            variantReady={props.variantReady}
            addingToCart={props.addingToCart}
            primaryCtaLabel={props.primaryCtaLabel}
            onPrimaryCta={props.onPrimaryCta}
          />
          <BuyNowButton
            addingToCart={props.addingToCart}
            buyNowLabel={labels.buyNow}
            onBuyNow={props.onBuyNow}
          />
          <IconActionsRow
            compared={props.compared}
            savedToWishlist={props.savedToWishlist}
            wishlistLoading={props.wishlistLoading}
            shareOpen={props.shareOpen}
            onToggleWishlist={props.onToggleWishlist}
            onShare={props.onShare}
            onToggleCompare={props.onToggleCompare}
            labels={labels}
          />
        </View>
      </View>
    </>
  );
}
