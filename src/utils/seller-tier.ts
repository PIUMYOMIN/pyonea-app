export type SellerCommissionTier = 'bronze' | 'silver' | 'gold';

export type SellerTierConfig = {
  label: string;
  rate: string;
  next: string | null;
  threshold: number | null;
  emoji: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  progressClass: string;
};

export const SELLER_TIER_CONFIG: Record<SellerCommissionTier, SellerTierConfig> = {
  bronze: {
    label: 'Bronze',
    rate: '6%',
    next: 'Silver',
    threshold: 50,
    emoji: '🥉',
    borderClass: 'border-amber-200 dark:border-amber-800',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    progressClass: 'bg-amber-500',
  },
  silver: {
    label: 'Silver',
    rate: '5%',
    next: 'Gold',
    threshold: 500,
    emoji: '🥈',
    borderClass: 'border-slate-200 dark:border-slate-600',
    bgClass: 'bg-slate-50 dark:bg-slate-700/30',
    textClass: 'text-slate-700 dark:text-slate-300',
    progressClass: 'bg-slate-500',
  },
  gold: {
    label: 'Gold',
    rate: '4%',
    next: null,
    threshold: null,
    emoji: '🥇',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
    textClass: 'text-yellow-700 dark:text-yellow-300',
    progressClass: 'bg-yellow-500',
  },
};

export const normalizeSellerCommissionTier = (value: unknown): SellerCommissionTier => {
  const tier = String(value || 'bronze').toLowerCase();
  if (tier === 'silver' || tier === 'gold') return tier;
  return 'bronze';
};

export const getSellerTierConfig = (value: unknown): SellerTierConfig =>
  SELLER_TIER_CONFIG[normalizeSellerCommissionTier(value)];
