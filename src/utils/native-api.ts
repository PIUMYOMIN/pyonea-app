import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_BASE_URL, DEFAULT_PRODUCT_IMAGE, IMAGE_BASE_URL } from '@/config/native';
import { DATA_CACHE_TTL, withDataCache, withInFlightRequest } from '@/utils/data-cache';

type ApiEnvelope<T> = {
  data?: T;
  success?: boolean;
};

export type HomeCategory = {
  id: string | number;
  name: string;
  nameEn: string;
  nameMm: string;
  slugEn?: string;
  slugMm?: string;
  descriptionEn?: string;
  descriptionMm?: string;
  productCount: number;
  childrenCount: number;
  imageUrl?: string;
  childPreview?: string[];
  discountPct?: number;
};

export type BrowserCategory = HomeCategory & {
  children: BrowserCategory[];
};

export type CategoryDetail = BrowserCategory & {
  slugEn: string;
  slugMm: string;
  descriptionEn: string;
  descriptionMm: string;
  canonicalSlug: string;
};

export type HomeProduct = {
  id: string | number;
  productId: string | number;
  slug?: string;
  name: string;
  nameEn: string;
  nameMm: string;
  seller: string;
  price: string;
  rating: string;
  imageUrl?: string;
  isNew?: boolean;
  originalPrice?: string;
  discountPct?: number;
  reviewCount?: number;
  moq?: number;
  categoryName?: string;
  categoryNameEn?: string;
  categoryNameMm?: string;
  hasVariants?: boolean;
};

export type ProductReview = {
  id: string | number;
  userId?: string | number;
  author: string;
  company?: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type ProductOptionValue = {
  id: string | number;
  label: string;
  meta: {
    hex?: string;
    imageUrl?: string;
  };
};

export type ProductOption = {
  id: string | number;
  name: string;
  type: string;
  isRequired: boolean;
  values: ProductOptionValue[];
};

export type ProductVariant = {
  id: string | number;
  sku: string;
  priceValue: number;
  price: string;
  quantity: number;
  moq?: number;
  quantityStep?: number;
  imageUrl?: string;
  optionValueIds: (string | number)[];
};

export type AnnouncementDisplayStyle = 'popup_card' | 'popup_banner' | 'page_banner';

export type Announcement = {
  id: string | number;
  title: string;
  content: string;
  type: string;
  displayStyle: AnnouncementDisplayStyle;
  imageUrl?: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaStyle: string;
  bannerLinkUrl: string;
  bannerAspectRatio: string;
  badgeLabel: string;
  badgeColor: string;
  targetAudience: string;
  isActive: boolean;
  showOnce: boolean;
  delaySeconds: number;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementPayload = {
  title: string;
  content?: string;
  type?: string;
  display_style?: AnnouncementDisplayStyle;
  cta_label?: string;
  cta_url?: string;
  cta_style?: string;
  banner_link_url?: string;
  banner_aspect_ratio?: string;
  badge_label?: string;
  badge_color?: string;
  target_audience?: string;
  is_active?: boolean;
  show_once?: boolean;
  delay_seconds?: number;
  starts_at?: string;
  ends_at?: string;
  sort_order?: number;
};

export type ProductDetail = {
  id: string | number;
  slug: string;
  name: string;
  nameEn?: string;
  nameMm?: string;
  description: string;
  descriptionEn?: string;
  descriptionMm?: string;
  sku?: string;
  priceValue: number;
  price: string;
  originalPrice?: string;
  discountPct: number;
  savedAmount?: string;
  rating: number;
  reviewCount: number;
  images: string[];
  moq: number;
  quantityUnit: string;
  quantityStep: number;
  stock: number;
  productType: string;
  hasVariants: boolean;
  options: ProductOption[];
  variants: ProductVariant[];
  specifications: Record<string, string>;
  wholesaleTiers: {
    minQty: number;
    price: string;
    discountPct: number;
  }[];
  categoryName?: string;
  sellerId?: string | number;
  seller?: {
    id: string | number;
    name: string;
    slug: string;
    rating: string;
    verified: boolean;
  };
  reviews: ProductReview[];
};

export type HomeSeller = {
  id: string | number;
  name: string;
  slug?: string;
  type: string;
  products: number;
  rating: string;
  reviews: number;
  city: string;
  verified: boolean;
  imageUrl?: string;
  joined?: string;
};

export type SellerProfile = HomeSeller & {
  showReviews?: boolean;
  bannerUrl?: string;
  description: string;
  address: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  createdAt: string;
  memberSince: string;
  followers: number;
  vacationMode: boolean;
  vacationMessage: string;
  businessName: string;
  businessHours: Record<string, { open?: string; close?: string; closed?: boolean }>;
  policies: {
    returnPolicy?: string;
    shippingPolicy?: string;
    warrantyPolicy?: string;
    privacyPolicy?: string;
    termsOfService?: string;
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
};

export type SellerReview = {
  id: string | number;
  userId?: string | number;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type SellerReviewStats = {
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
};

export type SellerReviewsResult = {
  reviews: SellerReview[];
  currentPage: number;
  lastPage: number;
  total: number;
};

export type AdminReview = {
  id: string | number;
  reviewerName: string;
  targetName: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
};

export type SellerDeliveryArea = {
  id: string | number;
  areaType: string;
  country: string;
  state: string;
  city: string;
  township: string;
  shippingFeeValue: number;
  shippingFee: string;
  freeShippingThresholdValue: number;
  freeShippingThreshold: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  estimatedDays: string;
  cashOnDelivery: boolean;
};

export type SellerDeliveryZonePayload = {
  area_type: 'country' | 'state' | 'city' | 'township';
  country: string;
  state: string | null;
  city: string | null;
  township: string | null;
  shipping_fee: number;
  free_shipping_threshold: number | null;
  estimated_delivery_days_min: number;
  estimated_delivery_days_max: number;
  is_active: boolean;
};

export type SellerStoreSummary = {
  id: string | number;
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  description: string;
  status: string;
  businessType: string;
  verificationStatus: string;
  documentsSubmitted: boolean;
  documentsSubmittedAt: string;
  documentStatus: string;
  documentRejectionReason: string;
  createdAt: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  registrationNumber: string;
  taxId: string;
  accountNumber: string;
  nrcDivision: string;
  nrcTownshipCode: string;
  nrcTownshipMm: string;
  nrcType: string;
  nrcNumber: string;
  nrcFull: string;
  nrcFullMm: string;
  nrcVerificationStatus: string;
  identityDocumentFrontUrl?: string;
  identityDocumentBackUrl?: string;
  businessRegistrationDocumentUrl?: string;
  taxRegistrationDocumentUrl?: string;
  businessCertificateUrl?: string;
  rating: number;
  reviewCount: number;
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  setupProgress?: UnknownRecord;
  returnPolicy?: string;
  shippingPolicy?: string;
  warrantyPolicy?: string;
  privacyPolicy?: string;
  termsOfService?: string;
  emailNotifications?: boolean;
  orderNotifications?: boolean;
  inventoryAlerts?: boolean;
  reviewNotifications?: boolean;
  autoWithdrawal?: boolean;
  withdrawalThreshold?: number;
  preferredPaymentMethod?: string;
  isActive?: boolean;
  vacationMode?: boolean;
  vacationMessage?: string;
  vacationStartDate?: string;
  vacationEndDate?: string;
  twoFactorAuth?: boolean;
  loginNotifications?: boolean;
  showSoldOut?: boolean;
  showReviews?: boolean;
  showInventoryCount?: boolean;
  currency?: string;
  businessHoursEnabled?: boolean;
  businessHours?: UnknownRecord;
  sellerTier: 'bronze' | 'silver' | 'gold';
  deliveredOrdersCount: number;
  completedOrdersCount: number;
  tierPromotedAt: string;
};

export type SellerDashboardStats = {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
};

export type SellerOnboardingStatus = {
  needsOnboarding: boolean;
  onboardingComplete: boolean;
  setupProgress?: UnknownRecord;
};

export type SellerDashboardOverview = {
  store: SellerStoreSummary | null;
  stats: SellerDashboardStats;
  onboarding: SellerOnboardingStatus | null;
};

export type SellerProfilePayload = {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  date_of_birth?: string;
};

export type SellerSettingsPayload = {
  return_policy?: string;
  shipping_policy?: string;
  warranty_policy?: string;
  privacy_policy?: string;
  terms_of_service?: string;
  email_notifications?: boolean;
  order_notifications?: boolean;
  inventory_alerts?: boolean;
  review_notifications?: boolean;
  auto_withdrawal?: boolean;
  withdrawal_threshold?: number;
  preferred_payment_method?: string;
  is_active?: boolean;
  vacation_mode?: boolean;
  vacation_message?: string;
  vacation_start_date?: string;
  vacation_end_date?: string;
  two_factor_auth?: boolean;
  login_notifications?: boolean;
  show_sold_out?: boolean;
  show_reviews?: boolean;
  show_inventory_count?: boolean;
  currency?: string;
  business_hours_enabled?: boolean;
  business_hours?: UnknownRecord;
};

export type SellerManagedProduct = {
  id: string | number;
  slug: string;
  name: string;
  nameEn: string;
  nameMm: string;
  description: string;
  sku: string;
  brand: string;
  categoryId: string | number;
  categoryName: string;
  imageUrl?: string;
  priceValue: number;
  price: string;
  salePriceValue: number;
  salePrice: string;
  discountPriceValue: number;
  discountPercentage: number;
  discountStart: string;
  discountEnd: string;
  isOnSale: boolean;
  isActive: boolean;
  inStock: boolean;
  totalStock: number;
};

export type SellerProductLimitUsage = {
  productLimit: number;
  productsUsed: number;
  planName: string;
  isNearLimit: boolean;
};

export type SellerProductsResult = {
  products: SellerManagedProduct[];
  limitUsage: SellerProductLimitUsage | null;
};

export type SellerBulkImportError = {
  row: number | string;
  errors: string[];
};

export type SellerBulkImportedProduct = {
  id: string | number;
  sku: string;
  nameEn: string;
};

export type SellerBulkImportResult = {
  imported: number;
  skipped: number;
  errors: SellerBulkImportError[];
  importedList: SellerBulkImportedProduct[];
};

export type SellerProductReview = {
  id: string | number;
  buyerName: string;
  productName: string;
  productId: string | number;
  rating: number;
  comment: string;
  reply: string;
  status: string;
  createdAt: string;
};

export type SellerProductReviewsResult = {
  reviews: SellerProductReview[];
  currentPage: number;
  lastPage: number;
  total: number;
};

export type SellerCustomer = {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpentValue: number;
  totalSpent: string;
  avgOrderValueValue: number;
  avgOrderValue: string;
  deliveredCount: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

export type SellerCustomerStats = {
  totalCustomers: number;
  totalOrders: number;
  totalRevenueValue: number;
  totalRevenue: string;
  avgOrderValueValue: number;
  avgOrderValue: string;
  active30d: number;
};

export type SellerCustomersResult = {
  customers: SellerCustomer[];
  stats: SellerCustomerStats;
  currentPage: number;
  lastPage: number;
  total: number;
};

export type SellerSalesTrendPoint = {
  label: string;
  date: string;
  salesValue: number;
  sales: string;
  orders: number;
};

export type SellerTopProductSale = {
  id: string | number;
  name: string;
  sales: number;
  revenueValue: number;
  revenue: string;
};

export type SellerSalesReportsData = {
  monthlyData: SellerSalesTrendPoint[];
  weeklyData: SellerSalesTrendPoint[];
  topProducts: SellerTopProductSale[];
  summary: {
    totalSalesValue: number;
    totalSales: string;
    totalOrders: number;
    newCustomers: number;
  };
};

export type SellerFinancialSummary = {
  from: string;
  to: string;
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalGmvValue: number;
  totalGmv: string;
  totalSubtotalValue: number;
  totalSubtotal: string;
  totalShippingValue: number;
  totalShipping: string;
  totalTaxValue: number;
  totalTax: string;
  totalCouponDiscountValue: number;
  totalCouponDiscount: string;
  totalCommissionValue: number;
  totalCommission: string;
  totalCommissionPendingValue: number;
  totalCommissionPending: string;
  totalCommissionConfirmedValue: number;
  totalCommissionConfirmed: string;
  totalSellerPayoutValue: number;
  totalSellerPayout: string;
  totalDeliveryFeesValue: number;
  totalDeliveryFees: string;
  totalDeliveryFeesPendingValue: number;
  totalDeliveryFeesPending: string;
  totalDeliveryFeesConfirmedValue: number;
  totalDeliveryFeesConfirmed: string;
  wallet?: SellerWalletSummary;
};

export type SellerFinancialTrendPoint = {
  period: string;
  orders: number;
  gmvValue: number;
  taxValue: number;
  commissionValue: number;
  deliveryFeeValue: number;
  platformValue: number;
};

export type SellerFinancialOrder = {
  orderId: string | number;
  orderNumber: string;
  orderDate: string;
  deliveredAt: string;
  buyerName: string;
  buyerEmail: string;
  itemsSummary: string;
  itemsCount: number;
  subtotalValue: number;
  shippingFeeValue: number;
  taxAmountValue: number;
  couponDiscountValue: number;
  totalAmountValue: number;
  totalAmount: string;
  commissionRate: number;
  commissionAmountValue: number;
  commissionAmount: string;
  commissionStatus: string;
  sellerPayoutValue: number;
  sellerPayout: string;
  deliveryFeeValue: number;
  deliveryFeeStatus: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
};

export type SellerFinancialReportData = {
  summary: SellerFinancialSummary;
  trend: SellerFinancialTrendPoint[];
  orders: SellerFinancialOrder[];
};

export type AdminFinancialOrderItem = {
  id: string | number;
  productId: string | number;
  sku: string;
  name: string;
  qty: number;
  priceValue: number;
  price: string;
  subtotalValue: number;
  subtotal: string;
};

export type AdminFinancialSummary = SellerFinancialSummary & {
  platformRevenueValue: number;
  platformRevenue: string;
  platformRevenuePendingValue: number;
  platformRevenuePending: string;
};

export type AdminFinancialOrder = SellerFinancialOrder & {
  sellerName: string;
  sellerEmail: string;
  subtotal: string;
  shippingFee: string;
  taxAmount: string;
  couponDiscount: string;
  commissionConfirmedValue: number;
  commissionConfirmed: string;
  commissionPendingValue: number;
  commissionPending: string;
  deliveryFee: string;
  deliveryFeeConfirmedValue: number;
  deliveryFeeConfirmed: string;
  deliveryFeePendingValue: number;
  deliveryFeePending: string;
  escrowStatus: string;
  items: AdminFinancialOrderItem[];
};

export type AdminFinancialReportData = {
  summary: AdminFinancialSummary;
  trend: SellerFinancialTrendPoint[];
  orders: AdminFinancialOrder[];
};

export type SellerDiscountType = 'percentage' | 'fixed' | 'free_shipping' | '';
export type SellerDiscountScope = 'all_products' | 'specific_products' | 'specific_categories';

export type SellerDiscount = {
  id: string | number;
  name: string;
  type: SellerDiscountType;
  value: number | null;
  minOrderAmount: number | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  applicableTo: SellerDiscountScope;
  applicableProductIds: (string | number)[];
  applicableCategoryIds: (string | number)[];
  isOneTimeUse: boolean;
  isActive: boolean;
};

export type SellerDiscountPayload = {
  name: string;
  type: Exclude<SellerDiscountType, ''>;
  value: number | null;
  min_order_amount: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  expires_at: string | null;
  applicable_to: SellerDiscountScope;
  applicable_product_ids: (string | number)[];
  applicable_category_ids: (string | number)[];
  is_one_time_use: boolean;
  is_active: boolean;
};

export type SellerCouponType = 'percentage' | 'fixed';

export type SellerCoupon = {
  id: string | number;
  name: string;
  code: string;
  type: SellerCouponType;
  value: number;
  minOrderAmount: number | null;
  applicableProductIds: (string | number)[] | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  usedCount: number;
  isOneTimeUse: boolean;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
};

export type SellerCouponPayload = {
  name: string;
  code: string | null;
  type: SellerCouponType;
  value: number;
  min_order_amount: number | null;
  applicable_product_ids: (string | number)[] | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  is_one_time_use: boolean;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
};

export type SellerProductCategory = {
  id: string | number;
  name: string;
  nameEn: string;
  nameMm: string;
  children: SellerProductCategory[];
};

export type SellerProductImage = {
  url: string;
  path: string;
  angle: string;
  isPrimary: boolean;
  name: string;
  size: string;
};

export type SellerWholesaleTier = {
  id?: string | number;
  minQty: string;
  pricePerUnit: string;
  label: string;
  isActive: boolean;
};

export type SellerProductFormData = {
  id?: string | number | null;
  name_en: string;
  name_mm: string;
  description_en: string;
  description_mm: string;
  product_type: string;
  price: string | number;
  category_id: string | number;
  quantity_unit: string;
  moq: string | number;
  min_order_unit?: string;
  lead_time: string;
  condition: string;
  is_active: boolean;
  brand: string;
  model: string;
  material: string;
  origin: string;
  weight_kg: string | number;
  warranty: string;
  warranty_type: string;
  warranty_period: string;
  return_policy: string;
  shipping_cost: string | number;
  shipping_time: string;
  packaging_details: string;
  additional_info: string;
  is_featured?: boolean;
  is_new: boolean;
  free_shipping?: boolean;
  discount_price: string | number;
  discount_start?: string;
  discount_end?: string;
  specifications: Record<string, string>;
  file_url: string;
  file_type: string;
  images?: SellerProductImage[];
};

export type SellerProductFormResult = {
  product: SellerProductFormData;
  images: SellerProductImage[];
};

export type SellerProfileResult = {
  seller: SellerProfile;
  products: HomeProduct[];
  currentPage: number;
  lastPage: number;
  isFollowing: boolean;
  isOwnStore: boolean;
  reviewStats: SellerReviewStats;
};

export type LocalDeal = {
  id: string | number;
  name: string;
  code: string;
  discount: string;
  seller: string;
  sellerSlug?: string;
  location: string;
  regionKey: string;
  minimumOrder: string;
  minimumOrderValue: number;
  expiresAt: string;
  expiresAtRaw: string;
};

export type LocalDealsResult = {
  deals: LocalDeal[];
  currentPage: number;
  lastPage: number;
  total: number;
};

export type CartWholesaleTier = {
  minQty: number;
  discountPct: number;
  label: string;
};

export type CartItem = {
  id: string | number;
  productId: string | number;
  variantId?: string | number;
  slug: string;
  name: string;
  category: string;
  seller: string;
  sellerSlug?: string;
  imageUrl?: string;
  priceValue: number;
  sellingPriceValue: number;
  price: string;
  sellingPrice: string;
  subtotalValue: number;
  subtotal: string;
  quantity: number;
  minOrder: number;
  quantityStep: number;
  quantityUnit: string;
  stock?: number;
  isAvailable: boolean;
  isQuantityValid: boolean;
  selectedOptions: Record<string, string>;
  wholesaleTiers: CartWholesaleTier[];
};

export type CartSummary = {
  subtotalValue: number;
  shippingFeeValue: number;
  taxRate: number;
  taxValue: number;
  totalValue: number;
  subtotal: string;
  shippingFee: string;
  tax: string;
  total: string;
};

export type CartResult = {
  items: CartItem[];
  subtotalValue: number;
  subtotal: string;
  totalItems: number;
  summary: CartSummary;
};

export type CheckoutAddress = {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  township: string;
  postal_code: string;
  country: string;
};

export type CheckoutLocationCity = {
  engCity: string;
  label: string;
};

export type CheckoutLocationRow = {
  engState: string;
  label: string;
  cities: CheckoutLocationCity[];
};

export type CheckoutProfile = {
  name: string;
  phone: string;
  address: string;
  state: string;
  city: string;
  township: string;
  postalCode: string;
};

export type CheckoutSellerPolicy = {
  sellerId: string | number;
  sellerName: string;
  slug: string;
  returnPolicy: string;
  shippingPolicy: string;
};

export type CheckoutSellerShippingFee = {
  sellerId: string | number;
  sellerName: string;
  shippingFeeValue: number;
  shippingFee: string;
};

export type CheckoutFees = {
  shippingFeeValue: number;
  taxRate: number;
  sellers: CheckoutSellerShippingFee[];
};

export type CheckoutCoupon = {
  couponId?: string | number;
  code: string;
  discountAmountValue: number;
  discountAmount: string;
  label: string;
};

export type CreateOrderPayload = {
  items: {
    product_id: string | number;
    variant_id?: string | number | null;
    quantity: number;
    price: number;
  }[];
  shipping_address: CheckoutAddress;
  payment_method: string;
  payment_status: string;
  payment_data?: unknown;
  notes: string;
  total_amount: number;
  subtotal_amount: number;
  shipping_fee: number;
  tax_amount: number;
  coupon_id?: string | number | null;
  coupon_code?: string | null;
  coupon_discount_amount?: number;
};

export type CheckoutOrderResult = {
  id: string | number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  totalValue: number;
  paymentMethod?: string;
};

export type CreateCheckoutOrderResult = {
  orders: CheckoutOrderResult[];
  primaryOrder: CheckoutOrderResult;
  totalOrders: number;
};

export type PaymentInitiationResult = {
  success: boolean;
  message: string;
  qrImageUrl?: string;
  qrString?: string;
  deepLink?: string;
  expiresAt?: string;
  sandbox: boolean;
};

export type PaymentVerificationResult = {
  paid: boolean;
  status: string;
  paymentStatus: string;
  message: string;
};

export type TrackedOrderItem = {
  id: string | number;
  productName: string;
  productSku: string;
  gtin?: string;
  imageUrl?: string;
  priceValue: number;
  price: string;
  quantity: number;
  subtotalValue: number;
  subtotal: string;
};

export type TrackedDeliveryUpdate = {
  status: string;
  location: string;
  notes: string;
  createdAt: string;
};

export type TrackedDelivery = {
  status: string;
  trackingNumber: string;
  carrierName: string;
  method: string;
  estimatedDeliveryDate: string;
  failureReason: string;
  updates: TrackedDeliveryUpdate[];
};

export type TrackedOrder = {
  id: string | number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  estimatedDelivery: string;
  deliveredAt: string;
  subtotalAmountValue: number;
  shippingFeeValue: number;
  taxAmountValue: number;
  couponDiscountAmountValue: number;
  totalAmountValue: number;
  subtotalAmount: string;
  shippingFee: string;
  taxAmount: string;
  couponDiscountAmount: string;
  totalAmount: string;
  seller?: {
    name: string;
    logoUrl?: string;
  };
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string;
  };
  delivery?: TrackedDelivery;
  items: TrackedOrderItem[];
};

export type PaymentReceiptAddress = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  township: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type PaymentReceiptCustomer = {
  name: string;
  email: string;
  phone: string;
};

export type PaymentReceiptOrder = {
  id: string | number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;
  paymentDate: string;
  estimatedDelivery: string;
  subtotalAmountValue: number;
  shippingFeeValue: number;
  taxAmountValue: number;
  taxRate: number;
  totalAmountValue: number;
  subtotalAmount: string;
  shippingFee: string;
  taxAmount: string;
  totalAmount: string;
  customer: PaymentReceiptCustomer;
  shippingAddress: PaymentReceiptAddress;
  items: TrackedOrderItem[];
};

export type NewsletterActionResult = {
  success: boolean;
  message: string;
};

export type BuyerProfile = {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  township: string;
  country: string;
  postalCode: string;
  emailVerifiedAt: string;
  createdAt: string;
  notificationPreferences: Record<string, unknown>;
};

export type BuyerProfilePayload = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  township: string;
  country: string;
  postal_code: string;
};

export type BlogPost = {
  id: string | number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  imageUrl?: string;
  featured: boolean;
  readMinutes: number;
  titleEn: string;
  titleMm: string;
  seoTitleEn: string;
  seoTitleMm: string;
  seoDescriptionEn: string;
  seoDescriptionMm: string;
  excerptEn: string;
  excerptMm: string;
  contentEn: string;
  contentMm: string;
  tags: string[];
};

export type BlogDetail = {
  post: BlogPost;
  related: BlogPost[];
};

export type AdminBlogStatus = 'draft' | 'published' | 'archived';

export type AdminManagedBlogPost = {
  id: string | number;
  titleEn: string;
  titleMm: string;
  slug: string;
  excerptEn: string;
  excerptMm: string;
  contentEn: string;
  contentMm: string;
  featuredImage: string;
  category: string;
  tags: string[];
  status: AdminBlogStatus | string;
  isFeatured: boolean;
  publishedAt: string;
  seoTitleEn: string;
  seoTitleMm: string;
  seoDescriptionEn: string;
  seoDescriptionMm: string;
};

export type AdminBlogFormPayload = {
  title_en: string;
  title_mm: string;
  slug: string;
  excerpt_en: string;
  excerpt_mm: string;
  content_en: string;
  content_mm: string;
  featured_image: string;
  category: string;
  tags: string[];
  status: string;
  is_featured: boolean;
  published_at: string | null;
  seo_title_en: string;
  seo_title_mm: string;
  seo_description_en: string;
  seo_description_mm: string;
};

export type AdminBlogListResult = {
  posts: AdminManagedBlogPost[];
  currentPage: number;
  lastPage: number;
  total: number;
};

export type AdminBlogFilters = {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
};

export type SubscriptionPlan = {
  id: string | number;
  slug: string;
  name: string;
  description: string;
  price: string;
  priceValue: number;
  billingCycle: string;
  productLimit: string;
  productLimitValue: number;
  productLimitLabel: string;
  commission: string;
  commissionRate: number;
  commissionPercent: string;
  features: string[];
  highlighted: boolean;
  analyticsEnabled: boolean;
  bulkImportEnabled: boolean;
  prioritySupport: boolean;
  customStorefront: boolean;
  isCurrent?: boolean;
  isPending?: boolean;
  productsUsed?: number;
};

export type SellerSubscription = {
  id: string | number;
  userId: string | number;
  status: string;
  statusLabel: string;
  startsAt: string;
  endsAt: string;
  nextBillingAt: string;
  daysRemaining: number | null;
  amountPaidValue: number;
  amountPaid: string;
  paymentReference: string;
  paymentMethod: string;
  notes: string;
  productsUsed: number;
  plan: SubscriptionPlan | null;
  pendingRequest?: SellerSubscription | null;
  seller?: {
    id: string | number;
    name: string;
    email: string;
    store: string;
  } | null;
};

export type SellerSubscriptionOverview = {
  current: SellerSubscription | null;
  pendingRequest: SellerSubscription | null;
  plans: SubscriptionPlan[];
  paymentMethods: string[];
};

export type AdminSubscriptionsMeta = {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
};

export type AdminSubscriptionsResponse = {
  subscriptions: SellerSubscription[];
  meta: AdminSubscriptionsMeta;
};

export type AdminSubscriptionFilters = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  planSlug?: string;
};

export type SellerSubscriptionPaymentSession = {
  success: boolean;
  amount: number;
  currency: string;
  reference: string;
  paymentMethod: string;
  qrImageUrl: string;
  qrString: string;
  deeplinkUrl: string;
  checkoutUrl: string;
  message: string;
};

export type SellerWalletSummary = {
  escrowBalanceValue: number;
  escrowBalance: string;
  availableBalanceValue: number;
  availableBalance: string;
  totalEarnedValue: number;
  totalEarned: string;
  totalCommissionPaidValue: number;
  totalCommissionPaid: string;
  codCommissionOutstandingValue: number;
  codCommissionOutstanding: string;
  codOverdueCount: number;
};

export type SellerWalletTransaction = {
  id: string | number;
  type: string;
  typeLabel: string;
  amountValue: number;
  amount: string;
  escrowBalanceAfterValue: number;
  escrowBalanceAfter: string;
  availableBalanceAfterValue: number;
  availableBalanceAfter: string;
  orderNumber: string;
  notes: string;
  createdAt: string;
};

export type SellerCodInvoice = {
  id: string | number;
  invoiceNumber: string;
  orderId: string | number;
  orderNumber: string;
  status: string;
  commissionAmountValue: number;
  commissionAmount: string;
  commissionRate: number;
  orderSubtotalValue: number;
  orderSubtotal: string;
  dueDate: string;
  paidAt: string;
  paymentReference: string;
  paymentMethod: string;
  sellerNotes: string;
  createdAt: string;
};

export type SellerWalletOverview = {
  wallet: SellerWalletSummary;
  recentTransactions: SellerWalletTransaction[];
  invoices: SellerCodInvoice[];
};

export type ReportAttachment = {
  id: string | number;
  label: string;
  url: string;
};

export type ReportComment = {
  id: string | number;
  body: string;
  authorType: string;
  authorName: string;
  isInternal: boolean;
  createdAt: string;
};

export type UserReport = {
  id: string | number;
  ticketId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  resolution?: string;
  createdAt: string;
  slaHours?: number;
  slaBreached: boolean;
  comments: ReportComment[];
  attachments: ReportAttachment[];
};

export type ReportListResult = {
  reports: UserReport[];
  currentPage: number;
  lastPage: number;
};

export type AdminReportReporter = {
  name: string;
  email: string;
};

export type AdminReportAssignee = {
  id: string | number;
  name: string;
};

export type AdminReport = UserReport & {
  reporter?: AdminReportReporter;
  guestName?: string;
  guestEmail?: string;
  reporterIp?: string;
  reporterLocale?: string;
  firstResponseAt?: string;
  adminNotes?: string;
  assignee?: AdminReportAssignee;
  assignedAt?: string;
};

export type AdminReportSummary = {
  open: number;
  inReview: number;
  critical: number;
  slaBreached: number;
};

export type AdminReportFilters = {
  page?: number;
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  assigned_to?: string;
};

export type AdminReportListResult = {
  reports: AdminReport[];
  summary: AdminReportSummary;
  currentPage: number;
  lastPage: number;
};

export type AdminReportUpdatePayload = {
  status?: string;
  priority?: string;
  resolution?: string;
  admin_notes?: string;
  assigned_to?: string | number;
};

export type SubmitReportPayload = {
  category: string;
  priority: string;
  subject: string;
  description: string;
  related_order_id?: string;
  related_url?: string;
  guest_name?: string;
  guest_email?: string;
};

export type SubmitReportResult = {
  ticketId: string;
};

export type BulkOrderProduct = {
  id: string | number;
  slug: string;
  name: string;
  sellerId?: string | number;
  sellerLabel: string;
  categoryId?: string | number;
  unitLabel: string;
  moq: number;
  quantityStep: number;
  basePrice: number;
  price: string;
  imageUrl?: string;
  hasVariants: boolean;
  wholesaleTiers: {
    minQty: number;
    priceValue: number;
    discountPct: number;
  }[];
};

export type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  totalSellers: number;
  totalSellersApproved: number;
  sellersPending: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  confirmedRevenue: number;
  commissionRevenue: number;
  collectedCommissions: number;
  pendingCommissions: number;
  totalDeliveryFees: number;
  confirmedDeliveryFees: number;
  submittedDeliveryFees: number;
  pendingDeliveryFees: number;
  totalBusinessTypes: number;
  activeBusinessTypes: number;
};

export type NativeNotification = {
  id: string | number;
  message: string;
  type: string;
  orderNumber: string;
  orderId: string;
  url: string;
  createdAt: string;
  readAt: string;
  rawData: Record<string, unknown>;
};

export type NotificationListResult = {
  notifications: NativeNotification[];
  unreadCount: number;
  currentPage: number;
  lastPage: number;
};

type UnknownRecord = Record<string, unknown>;

let authToken: string | null = null;

const TOKEN_STORAGE_KEY = 'pyonea.auth.token';

const getWebStorage = () => {
  if (typeof globalThis === 'undefined') return null;
  const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
  return storage || null;
};

export const getStoredAuthToken = () => authToken || getWebStorage()?.getItem(TOKEN_STORAGE_KEY) || null;

const readSecureAuthToken = async () => {
  if (Platform.OS === 'web') return null;

  try {
    return await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeSecureAuthToken = async (token: string | null) => {
  if (Platform.OS === 'web') return;

  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Keep the in-memory session active even if native secure persistence fails.
  }
};

export const hydrateStoredAuthToken = async () => {
  const webToken = getWebStorage()?.getItem(TOKEN_STORAGE_KEY) || null;
  const secureToken = await readSecureAuthToken();
  authToken = secureToken || webToken || authToken;
  return authToken;
};

export const setStoredAuthToken = async (token: string | null) => {
  authToken = token;
  const storage = getWebStorage();

  if (storage) {
    if (token) {
      storage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      storage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  await writeSecureAuthToken(token);
};

export class ApiError extends Error {
  status: number;
  errors?: unknown;

  constructor(message: string, status: number, errors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const getNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getArrayPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload)) {
    if (Array.isArray(payload.data)) return payload.data;
    if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data;
    const envelope = payload as ApiEnvelope<unknown[]>;
    if (Array.isArray(envelope.data)) return envelope.data;
  }
  return [];
};

const buildUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const buildHeaders = (extra?: HeadersInit) => {
  const token = getStoredAuthToken();
  const headers = new Headers(extra);
  headers.set('Accept', 'application/json');
  headers.set('X-Pyonea-Client', Platform.OS === 'web' ? 'web' : 'native');
  headers.set('X-Pyonea-Platform', Platform.OS);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

const API_REQUEST_TIMEOUT_MS = 20_000;

const fetchWithTimeout = async (path: string, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  const externalSignal = init.signal;
  const abortFromExternalSignal = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
    }
  }

  try {
    return await fetch(buildUrl(path), {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
  }
};

const parseApiResponse = async <T>(response: Response, path: string): Promise<T> => {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const data = isRecord(payload) ? payload : {};
    const message =
      getString(data.message) ||
      getString(data.error) ||
      `API request failed (${response.status}) for ${path}`;
    throw new ApiError(message, response.status, data.errors);
  }

  return payload as T;
};

export async function apiGet<T = unknown>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithTimeout(path, {
    headers: buildHeaders(),
    signal,
  });

  return parseApiResponse<T>(response, path);
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const response = await fetchWithTimeout(path, {
    method: 'POST',
    headers: buildHeaders({
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    }),
    body: JSON.stringify(body),
    signal,
  });

  return parseApiResponse<T>(response, path);
}

export async function apiPut<T = unknown>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetchWithTimeout(path, {
    method: 'PUT',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    signal,
  });

  return parseApiResponse<T>(response, path);
}

export async function apiPostForm<T = unknown>(
  path: string,
  body: FormData,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetchWithTimeout(path, {
    method: 'POST',
    headers: buildHeaders(),
    body,
    signal,
  });

  return parseApiResponse<T>(response, path);
}

export async function apiDelete<T = unknown>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithTimeout(path, {
    method: 'DELETE',
    headers: buildHeaders(),
    signal,
  });

  return parseApiResponse<T>(response, path);
}

export async function apiPatch<T = unknown>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetchWithTimeout(path, {
    method: 'PATCH',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    signal,
  });

  return parseApiResponse<T>(response, path);
}

export type NativeUser = {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  type: string;
  role?: string;
  roles: string[];
  emailVerifiedAt?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  dateOfBirth?: string;
};

export type AuthSession = {
  user: NativeUser;
  token: string;
};

export type LoginPayload = {
  phone: string;
  password: string;
  remember?: boolean;
  recaptcha_token?: string;
};

export type RegisterPayload = {
  name: string;
  email?: string;
  phone: string;
  password: string;
  password_confirmation: string;
  type: 'buyer' | 'seller';
  address?: string;
  city?: string;
  state?: string;
  recaptcha_token?: string;
  ref_code?: string;
};

const mapNativeUser = (value: unknown): NativeUser => {
  const user = isRecord(value) ? value : {};
  const roleRecords = Array.isArray(user.roles) ? user.roles.filter(isRecord) : [];
  const roleNames = roleRecords
    .map((role) => getString(role.name || role.slug))
    .filter(Boolean);
  const type = getString(user.type || user.role || roleNames[0], 'buyer');

  return {
    id: getString(user.id || user.user_id, 'user'),
    name: getString(user.name, 'User'),
    email: getString(user.email),
    phone: getString(user.phone),
    type,
    role: getString(user.role),
    roles: roleNames.length ? roleNames : [type],
    emailVerifiedAt: getString(user.email_verified_at || user.emailVerifiedAt),
    address: getString(user.address),
    city: getString(user.city),
    state: getString(user.state),
    country: getString(user.country),
    postalCode: getString(user.postal_code || user.postalCode),
    dateOfBirth: getString(user.date_of_birth || user.dateOfBirth),
  };
};

const extractAuthSession = (payload: unknown): AuthSession => {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const token = getString(data.token);
  const user = mapNativeUser(data.user);

  if (!token) {
    throw new Error('Missing auth token');
  }

  return { token, user };
};

export type SocialPendingAuth = {
  status: 'needs_role';
  pending: {
    tempToken: string;
    provider: string;
    socialUser: { name?: string; email?: string };
    missingFields: string[];
  };
};

export type GoogleAuthResult = AuthSession | SocialPendingAuth;

const parseGoogleAuthResponse = (payload: unknown): GoogleAuthResult => {
  const root = isRecord(payload) ? payload : {};

  if (getString(root.status) === 'needs_role') {
    const data = isRecord(root.data) ? root.data : {};
    const socialUser = isRecord(data.social_user) ? data.social_user : {};
    const missingFields = Array.isArray(data.missing_fields)
      ? data.missing_fields.map((field) => getString(field)).filter(Boolean)
      : [];

    return {
      status: 'needs_role',
      pending: {
        tempToken: getString(data.temp_token),
        provider: getString(data.provider, 'google'),
        socialUser: {
          name: getString(socialUser.name),
          email: getString(socialUser.email),
        },
        missingFields,
      },
    };
  }

  return extractAuthSession(payload);
};

export async function loginUser(payload: LoginPayload, signal?: AbortSignal): Promise<AuthSession> {
  const response = await apiPost('/login', payload, signal);
  const session = extractAuthSession(response);
  await setStoredAuthToken(session.token);
  return session;
}

export async function registerUser(
  payload: RegisterPayload,
  signal?: AbortSignal
): Promise<AuthSession> {
  const response = await apiPost('/register', payload, signal);
  const session = extractAuthSession(response);
  await setStoredAuthToken(session.token);
  return session;
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<NativeUser> {
  const payload = await apiGet('/auth/me', signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return mapNativeUser(data);
}

export async function logoutUser(signal?: AbortSignal): Promise<void> {
  try {
    await apiPost('/auth/logout', {}, signal);
  } finally {
    await setStoredAuthToken(null);
  }
}

export async function loginWithGoogleAccessToken(
  accessToken: string,
  signal?: AbortSignal
): Promise<AuthSession> {
  const result = await authenticateWithGoogleAccessToken(accessToken, signal);
  if ('status' in result) {
    throw new ApiError(
      'This Google account needs role and phone setup before it can continue.',
      409
    );
  }

  await setStoredAuthToken(result.token);
  return result;
}

export async function authenticateWithGoogleAccessToken(
  accessToken: string,
  signal?: AbortSignal
): Promise<GoogleAuthResult> {
  const response = await apiPost(
    '/auth/google',
    {
      credential: accessToken,
      token_type: 'access_token',
    },
    signal
  );
  const result = parseGoogleAuthResponse(response);

  if (!('status' in result)) {
    await setStoredAuthToken(result.token);
  }

  return result;
}

export async function completeSocialAuth(
  provider: string,
  tempToken: string,
  payload: {
    role: 'buyer' | 'seller';
    phone: string;
    email?: string;
  },
  signal?: AbortSignal
): Promise<AuthSession> {
  const response = await apiPost(
    `/auth/${provider}/complete`,
    payload,
    signal,
    { Authorization: `Bearer ${tempToken}` }
  );
  const session = extractAuthSession(response);
  await setStoredAuthToken(session.token);
  return session;
}

export async function sendPasswordResetLink(
  identity: string,
  recaptchaToken?: string,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    '/forgot-password',
    {
      email: identity,
      ...(recaptchaToken ? { recaptcha_token: recaptchaToken } : {}),
    },
    signal
  );
}

export async function resetUserPassword(
  payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
    recaptcha_token?: string;
  },
  signal?: AbortSignal
): Promise<void> {
  await apiPost('/reset-password', payload, signal);
}

const mapAdminStats = (stats: UnknownRecord): AdminStats => ({
  totalUsers: getNumber(stats.total_users),
  activeUsers: getNumber(stats.active_users),
  totalSellers: getNumber(stats.total_sellers),
  totalSellersApproved: getNumber(stats.total_sellers_approved),
  sellersPending: getNumber(stats.sellers_pending),
  totalProducts: getNumber(stats.total_products),
  activeProducts: getNumber(stats.active_products),
  totalOrders: getNumber(stats.total_orders),
  pendingOrders: getNumber(stats.pending_orders),
  completedOrders: getNumber(stats.completed_orders),
  cancelledOrders: getNumber(stats.cancelled_orders),
  totalRevenue: getNumber(stats.total_revenue),
  confirmedRevenue: getNumber(stats.confirmed_revenue),
  commissionRevenue: getNumber(stats.commission_revenue),
  collectedCommissions: getNumber(stats.collected_commissions),
  pendingCommissions: getNumber(stats.pending_commissions),
  totalDeliveryFees: getNumber(stats.total_delivery_fees),
  confirmedDeliveryFees: getNumber(stats.confirmed_delivery_fees),
  submittedDeliveryFees: getNumber(stats.submitted_delivery_fees),
  pendingDeliveryFees: getNumber(stats.pending_delivery_fees),
  totalBusinessTypes: getNumber(stats.total_business_types),
  activeBusinessTypes: getNumber(stats.active_business_types),
});

const parseNotificationData = (value: unknown): UnknownRecord => {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? parsed : {};
};

const mapNotification = (notification: UnknownRecord): NativeNotification => {
  const data = parseNotificationData(notification.data);

  return {
    id: getString(notification.id || data.id, 'notification'),
    message: getString(data.message || notification.message || notification.title),
    type: getString(data.type || notification.type, 'notification'),
    orderNumber: getString(data.order_number || data.orderNumber),
    orderId: getString(data.order_id || data.orderId),
    url: getString(data.url),
    createdAt: getString(notification.created_at || notification.createdAt),
    readAt: getString(notification.read_at || notification.readAt),
    rawData: data,
  };
};

export async function fetchNotifications(
  options: { page?: number; perPage?: number; unread?: boolean } = {},
  signal?: AbortSignal
): Promise<NotificationListResult> {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    per_page: String(options.perPage || 12),
  });

  if (options.unread) params.set('unread', 'true');

  const payload = await apiGet(`/notifications?${params.toString()}`, signal);
  const data = getArrayPayload(payload).filter(isRecord);
  const meta = isRecord(payload) && isRecord(payload.meta) ? payload.meta : {};

  return {
    notifications: data.map(mapNotification),
    unreadCount: isRecord(payload)
      ? getNumber(
          payload.unread_count ||
            payload.unreadCount ||
            meta.unread_count ||
            meta.unreadCount,
        )
      : 0,
    currentPage: getNumber(meta.current_page, options.page || 1),
    lastPage: getNumber(meta.last_page, options.page || 1),
  };
}

export async function fetchUnreadNotificationCount(signal?: AbortSignal): Promise<number> {
  const result = await fetchNotifications({ perPage: 1 }, signal);
  return result.unreadCount;
}

export async function markNotificationRead(
  id: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(`/notifications/${encodeURIComponent(String(id))}/read`, {}, signal);
}

export async function markAllNotificationsRead(signal?: AbortSignal): Promise<void> {
  await apiPost('/notifications/read-all', {}, signal);
}

export async function deleteNotification(
  id: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/notifications/${encodeURIComponent(String(id))}`, signal);
}

export async function clearNotifications(signal?: AbortSignal): Promise<void> {
  await apiDelete('/notifications', signal);
}

export async function fetchAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  const payload = await apiGet('/admin/stats', signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(data)) throw new Error('Admin statistics not found');

  return mapAdminStats(data);
}

const mapAdminReview = (review: UnknownRecord, index: number, type: 'seller' | 'product'): AdminReview => {
  const user = isRecord(review.user) ? review.user : undefined;
  const seller = isRecord(review.seller) ? review.seller : undefined;
  const product = isRecord(review.product) ? review.product : undefined;

  return {
    id: getString(review.id, `admin-review-${index}`),
    reviewerName: getString(user?.name || review.reviewer_name, '—'),
    targetName:
      type === 'seller'
        ? getString(seller?.store_name || seller?.name, '—')
        : getString(product?.name_en || product?.name || product?.name_mm, '—'),
    rating: getNumber(review.rating),
    comment: getString(review.comment),
    status: getString(review.status, 'pending'),
    createdAt: getString(review.created_at || review.createdAt),
  };
};

export async function fetchAdminSellerReviews(signal?: AbortSignal): Promise<AdminReview[]> {
  const payload = await apiGet('/admin/seller-reviews', signal);
  return getArrayPayload(payload).filter(isRecord).map((review, index) => mapAdminReview(review, index, 'seller'));
}

export async function fetchAdminProductReviews(signal?: AbortSignal): Promise<AdminReview[]> {
  const payload = await apiGet('/admin/reviews', signal);
  return getArrayPayload(payload).filter(isRecord).map((review, index) => mapAdminReview(review, index, 'product'));
}

export async function updateAdminReviewStatus(
  type: 'seller' | 'product',
  reviewId: string | number,
  status: 'approved' | 'rejected',
  signal?: AbortSignal
): Promise<void> {
  const base = type === 'seller' ? '/admin/seller-reviews' : '/admin/reviews';
  const action = status === 'approved' ? 'approve' : 'reject';
  await apiPost(`${base}/${encodeURIComponent(String(reviewId))}/${action}`, {}, signal);
}

const mapSellerStoreSummary = (store: UnknownRecord): SellerStoreSummary => ({
  id: getString(store.id),
  name: getString(store.store_name || store.name, 'My Store'),
  slug: getString(store.slug),
  logoUrl: getNativeImageUrl(store.store_logo || store.logo || store.image),
  bannerUrl: getNativeImageUrl(store.store_banner || store.banner || store.cover_image),
  description: getString(store.description || store.store_description),
  status: getString(store.status, 'active'),
  businessType: getString(store.business_type || store.businessType),
  verificationStatus: getString(store.verification_status || store.verificationStatus),
  documentsSubmitted: Boolean(store.documents_submitted ?? store.documentsSubmitted),
  documentsSubmittedAt: getString(store.documents_submitted_at || store.documentsSubmittedAt),
  documentStatus: getString(store.document_status || store.documentStatus),
  documentRejectionReason: getString(
    store.document_rejection_reason || store.documentRejectionReason
  ),
  createdAt: getString(store.created_at || store.createdAt),
  email: getString(store.contact_email || store.email),
  phone: getString(store.contact_phone || store.phone),
  website: getString(store.website),
  address: getString(store.address || store.store_address),
  city: getString(store.city),
  state: getString(store.state || store.region),
  country: getString(store.country, 'Myanmar'),
  registrationNumber: getString(store.business_registration_number || store.registration_number),
  taxId: getString(store.tax_id),
  accountNumber: getString(store.account_number),
  nrcDivision: getString(store.nrc_division),
  nrcTownshipCode: getString(store.nrc_township_code),
  nrcTownshipMm: getString(store.nrc_township_mm),
  nrcType: getString(store.nrc_type),
  nrcNumber: getString(store.nrc_number),
  nrcFull: getString(store.nrc_full),
  nrcFullMm: getString(store.nrc_full_mm),
  nrcVerificationStatus: getString(store.nrc_verification_status),
  identityDocumentFrontUrl: getNativeImageUrl(store.identity_document_front),
  identityDocumentBackUrl: getNativeImageUrl(store.identity_document_back),
  businessRegistrationDocumentUrl: getNativeImageUrl(store.business_registration_document),
  taxRegistrationDocumentUrl: getNativeImageUrl(store.tax_registration_document),
  businessCertificateUrl: getNativeImageUrl(store.business_certificate),
  rating: getNumber(store.reviews_avg_rating),
  reviewCount: getNumber(store.reviews_count),
  socialFacebook: getString(store.social_facebook),
  socialInstagram: getString(store.social_instagram),
  socialTwitter: getString(store.social_twitter),
  setupProgress: isRecord(store.setup_progress) ? store.setup_progress : undefined,
  returnPolicy: getString(store.return_policy),
  shippingPolicy: getString(store.shipping_policy),
  warrantyPolicy: getString(store.warranty_policy),
  privacyPolicy: getString(store.privacy_policy),
  termsOfService: getString(store.terms_of_service),
  emailNotifications: store.email_notifications !== false,
  orderNotifications: store.order_notifications !== false,
  inventoryAlerts: store.inventory_alerts !== false,
  reviewNotifications: store.review_notifications !== false,
  autoWithdrawal: Boolean(store.auto_withdrawal),
  withdrawalThreshold: getNumber(store.withdrawal_threshold, 100000),
  preferredPaymentMethod: getString(store.preferred_payment_method, 'bank_transfer'),
  isActive: store.is_active !== false,
  vacationMode: Boolean(store.vacation_mode),
  vacationMessage: getString(store.vacation_message),
  vacationStartDate: getString(store.vacation_start_date),
  vacationEndDate: getString(store.vacation_end_date),
  twoFactorAuth: Boolean(store.two_factor_auth),
  loginNotifications: store.login_notifications !== false,
  showSoldOut: store.show_sold_out !== false,
  showReviews: store.show_reviews !== false,
  showInventoryCount: Boolean(store.show_inventory_count),
  currency: getString(store.currency, 'MMK'),
  businessHoursEnabled: Boolean(store.business_hours_enabled),
  businessHours: isRecord(store.business_hours) ? store.business_hours : undefined,
  sellerTier: (() => {
    const tier = getString(store.seller_tier || store.sellerTier, 'bronze').toLowerCase();
    return tier === 'silver' || tier === 'gold' ? tier : 'bronze';
  })(),
  deliveredOrdersCount: getNumber(
    store.delivered_orders_count ?? store.deliveredOrdersCount ?? store.delivered_orders
  ),
  completedOrdersCount: getNumber(
    store.completed_orders_count ?? store.completedOrdersCount ?? store.completed_orders
  ),
  tierPromotedAt: getString(store.tier_promoted_at || store.tierPromotedAt),
});

const emptySellerDashboardStats: SellerDashboardStats = {
  totalProducts: 0,
  totalOrders: 0,
  totalRevenue: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
};

const mapSellerDashboardStats = (summary: UnknownRecord): SellerDashboardStats => {
  const sales = isRecord(summary.sales) ? summary.sales : {};
  const products = isRecord(summary.products) ? summary.products : {};
  const ordersByStatus = isRecord(summary.orders_by_status) ? summary.orders_by_status : {};

  return {
    totalProducts: getNumber(products.total ?? summary.total_products),
    totalOrders: getNumber(sales.total_orders ?? summary.total_orders),
    totalRevenue: getNumber(sales.total_revenue ?? summary.total_revenue),
    pendingOrders: getNumber(ordersByStatus.pending ?? summary.pending_orders),
    deliveredOrders: getNumber(
      ordersByStatus.delivered ??
        summary.delivered_orders_count ??
        summary.delivered_orders ??
        summary.completed_orders_count ??
        summary.completed_orders
    ),
  };
};

const mapSellerOnboardingStatus = (status: UnknownRecord): SellerOnboardingStatus => ({
  needsOnboarding: Boolean(status.needs_onboarding ?? status.needsOnboarding),
  onboardingComplete: Boolean(status.onboarding_complete ?? status.onboardingComplete),
  setupProgress: isRecord(status.setup_progress) ? status.setup_progress : undefined,
});

export async function fetchSellerDashboardOverview(
  signal?: AbortSignal
): Promise<SellerDashboardOverview> {
  const [storeResult, statsResult, onboardingResult] = await Promise.allSettled([
    apiGet('/seller/my-store', signal),
    apiGet('/seller/sales-summary', signal),
    apiGet('/seller/onboarding/status', signal),
  ]);

  if (storeResult.status === 'rejected') throw storeResult.reason;

  const storePayload = storeResult.value;
  const storeData = isRecord(storePayload) && isRecord(storePayload.data)
    ? storePayload.data
    : storePayload;

  const statsPayload = statsResult.status === 'fulfilled' ? statsResult.value : null;
  const statsData = isRecord(statsPayload) && isRecord(statsPayload.data)
    ? statsPayload.data
    : statsPayload;

  const onboardingPayload = onboardingResult.status === 'fulfilled' ? onboardingResult.value : null;
  const onboardingData = isRecord(onboardingPayload) && isRecord(onboardingPayload.data)
    ? onboardingPayload.data
    : onboardingPayload;

  return {
    store: isRecord(storeData) ? mapSellerStoreSummary(storeData) : null,
    stats: isRecord(statsData) ? mapSellerDashboardStats(statsData) : emptySellerDashboardStats,
    onboarding: isRecord(onboardingData) ? mapSellerOnboardingStatus(onboardingData) : null,
  };
}

export async function updateSellerProfile(
  profile: SellerProfilePayload,
  signal?: AbortSignal
): Promise<NativeUser> {
  const payload = await apiPut('/users/profile', profile, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data)) throw new Error('Profile update failed');
  return mapNativeUser(data);
}

export async function updateSellerPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(
    '/users/profile/password',
    {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: confirmPassword,
    },
    signal
  );
}

export async function updateSellerSettings(
  settings: SellerSettingsPayload,
  signal?: AbortSignal
): Promise<SellerStoreSummary | null> {
  const payload = await apiPut('/seller/settings', settings, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return isRecord(data) ? mapSellerStoreSummary(data) : null;
}

export type SellerStoreIdentityPayload = {
  business_registration_number?: string;
  tax_id?: string;
  website?: string;
  account_number?: string;
  nrc_division?: string;
  nrc_township_code?: string;
  nrc_township_mm?: string;
  nrc_type?: string;
  nrc_number?: string;
};

export type SellerDocumentType =
  | 'identity_document_front'
  | 'identity_document_back'
  | 'business_registration_document'
  | 'tax_registration_document'
  | 'business_certificate';

export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

const appendNativeFile = (form: FormData, field: string, file: NativeUploadFile) => {
  form.append(field, file as unknown as Blob);
};

export async function updateSellerStoreIdentity(
  payload: SellerStoreIdentityPayload,
  signal?: AbortSignal
): Promise<SellerStoreSummary | null> {
  const response = await apiPut('/seller/my-store/update', payload, signal);
  const data = isRecord(response) && isRecord(response.data) ? response.data : response;
  return isRecord(data) ? mapSellerStoreSummary(data) : null;
}

export async function uploadSellerStoreLogo(file: NativeUploadFile, signal?: AbortSignal): Promise<void> {
  const form = new FormData();
  appendNativeFile(form, 'logo', file);
  await apiPostForm('/seller/logo', form, signal);
}

export async function uploadSellerStoreBanner(file: NativeUploadFile, signal?: AbortSignal): Promise<void> {
  const form = new FormData();
  appendNativeFile(form, 'banner', file);
  await apiPostForm('/seller/banner', form, signal);
}

export async function uploadSellerVerificationDocument(
  documentType: SellerDocumentType,
  file: NativeUploadFile,
  signal?: AbortSignal
): Promise<void> {
  const form = new FormData();
  form.append('document_type', documentType);
  appendNativeFile(form, 'document', file);
  await apiPostForm('/seller/onboarding/documents', form, signal);
}

export type SubmitSellerDocumentsResult = {
  message: string;
  store: SellerStoreSummary;
};

export async function submitSellerDocumentsForVerification(
  signal?: AbortSignal
): Promise<SubmitSellerDocumentsResult> {
  const payload = await apiPost<UnknownRecord>(
    '/seller/onboarding/mark-documents-complete',
    {},
    signal
  );
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const profile =
    isRecord(data) && isRecord(data.seller_profile)
      ? data.seller_profile
      : isRecord(data)
        ? data
        : {};

  return {
    message: getString(
      isRecord(payload) ? payload.message : undefined,
      'Documents submitted successfully for verification'
    ),
    store: mapSellerStoreSummary(profile),
  };
}

export async function deleteSellerAccount(userId: string | number, signal?: AbortSignal): Promise<void> {
  await apiDelete(`/users/${encodeURIComponent(String(userId))}`, signal);
}

const mapSellerManagedProduct = (product: UnknownRecord): SellerManagedProduct => {
  const category = isRecord(product.category) ? product.category : {};
  const priceValue = getNumber(product.price);
  const discountPrice = getNumber(product.discount_price || product.sale_price);
  const discountPercentage = getNumber(product.discount_percentage || product.effective_discount_pct);
  const computedSalePrice = discountPrice || (discountPercentage > 0 ? priceValue - priceValue * (discountPercentage / 100) : 0);
  const isOnSale = Boolean(product.is_on_sale || discountPrice || discountPercentage);

  return {
    id: getString(product.id),
    slug: getString(product.slug),
    name: getString(product.name || product.name_en || product.name_mm, 'Unnamed product'),
    nameEn: getString(product.name_en || product.name),
    nameMm: getString(product.name_mm),
    description: getString(product.description),
    sku: getString(product.sku),
    brand: getString(product.brand),
    categoryId: getString(product.category_id || category.id),
    categoryName: getString(category.name_en || category.name_mm || product.category_name, 'Uncategorized'),
    imageUrl: getNativeImageUrl(product.image || product.primary_image || product.thumbnail || product.images),
    priceValue,
    price: formatMMK(priceValue),
    salePriceValue: computedSalePrice,
    salePrice: formatMMK(computedSalePrice),
    discountPriceValue: discountPrice,
    discountPercentage,
    discountStart: getString(product.discount_start),
    discountEnd: getString(product.discount_end),
    isOnSale,
    isActive: product.is_active !== false,
    inStock: product.in_stock !== false && getNumber(product.total_stock ?? product.stock) > 0,
    totalStock: getNumber(product.total_stock ?? product.stock),
  };
};

const mapSellerProductLimitUsage = (usage: UnknownRecord): SellerProductLimitUsage => ({
  productLimit: getNumber(usage.product_limit, -1),
  productsUsed: getNumber(usage.products_used),
  planName: getString(usage.plan_name),
  isNearLimit: Boolean(usage.is_near_limit),
});

const mapSellerProductReview = (review: UnknownRecord, index = 0): SellerProductReview => {
  const user = isRecord(review.user) ? review.user : undefined;
  const buyer = isRecord(review.buyer) ? review.buyer : undefined;
  const product = isRecord(review.product) ? review.product : undefined;

  return {
    id: getString(review.id, `seller-product-review-${index}`),
    buyerName: getString(user?.name || buyer?.name || review.user_name || review.buyer_name, 'Anonymous'),
    productName: getString(product?.name || product?.name_en || review.product_name, 'Unknown product'),
    productId: getString(product?.id || review.product_id),
    rating: Math.max(0, Math.min(5, Math.round(getNumber(review.rating)))),
    comment: getString(review.comment || review.review || review.body),
    reply: getString(review.reply || review.seller_reply || review.response),
    status: getString(review.status, 'approved'),
    createdAt: getString(review.created_at || review.createdAt),
  };
};

export async function fetchSellerManagedProducts(signal?: AbortSignal): Promise<SellerProductsResult> {
  const payload = await apiGet('/seller/products', signal);
  const products = getArrayPayload(payload).filter(isRecord).map(mapSellerManagedProduct);
  const meta = isRecord(payload) && isRecord(payload.meta) ? payload.meta : {};
  const usage = isRecord(meta.subscription_usage) ? mapSellerProductLimitUsage(meta.subscription_usage) : null;

  return { products, limitUsage: usage };
}

export async function fetchSellerProductReviews(
  page = 1,
  signal?: AbortSignal
): Promise<SellerProductReviewsResult> {
  const payload = await apiGet(`/seller/products/reviews?page=${page}`, signal);
  const paginator = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
  const reviews = getArrayPayload(payload).filter(isRecord).map(mapSellerProductReview);

  return {
    reviews,
    currentPage: getNumber(paginator.current_page, page),
    lastPage: getNumber(paginator.last_page, 1),
    total: getNumber(paginator.total, reviews.length),
  };
}

const emptySellerCustomerStats: SellerCustomerStats = {
  totalCustomers: 0,
  totalOrders: 0,
  totalRevenueValue: 0,
  totalRevenue: '0 MMK',
  avgOrderValueValue: 0,
  avgOrderValue: '0 MMK',
  active30d: 0,
};

const mapSellerCustomerStats = (stats: UnknownRecord): SellerCustomerStats => {
  const totalRevenueValue = getNumber(stats.total_revenue || stats.totalRevenue);
  const avgOrderValueValue = getNumber(stats.avg_order_value || stats.avgOrderValue);

  return {
    totalCustomers: getNumber(stats.total_customers || stats.totalCustomers),
    totalOrders: getNumber(stats.total_orders || stats.totalOrders),
    totalRevenueValue,
    totalRevenue: formatMMK(totalRevenueValue),
    avgOrderValueValue,
    avgOrderValue: formatMMK(avgOrderValueValue),
    active30d: getNumber(stats.active_30d || stats.active30d),
  };
};

const mapSellerCustomer = (customer: UnknownRecord, index = 0): SellerCustomer => {
  const totalSpentValue = getNumber(customer.total_spent || customer.totalSpent);
  const avgOrderValueValue = getNumber(customer.avg_order_value || customer.avgOrderValue);

  return {
    id: getString(customer.id || customer.user_id || customer.email, `customer-${index}`),
    name: getString(customer.name || customer.customer_name, 'Customer'),
    email: getString(customer.email || customer.customer_email),
    phone: getString(customer.phone || customer.phone_number || customer.customer_phone),
    totalOrders: getNumber(customer.total_orders || customer.totalOrders),
    totalSpentValue,
    totalSpent: formatMMK(totalSpentValue),
    avgOrderValueValue,
    avgOrderValue: formatMMK(avgOrderValueValue),
    deliveredCount: getNumber(customer.delivered_count || customer.deliveredCount),
    firstOrderAt: getString(customer.first_order_at || customer.firstOrderAt),
    lastOrderAt: getString(customer.last_order_at || customer.lastOrderAt),
  };
};

export async function fetchSellerCustomers(
  options: { page?: number; perPage?: number; search?: string; sort?: string } = {},
  signal?: AbortSignal
): Promise<SellerCustomersResult> {
  const page = options.page || 1;
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(options.perPage || 15),
    sort: options.sort || 'last_order',
  });

  if (options.search?.trim()) params.set('search', options.search.trim());

  const payload = await apiGet(`/seller/customers?${params.toString()}`, signal);
  const root = isRecord(payload) ? payload : {};
  const paginator = isRecord(root.data) && !Array.isArray(root.data) ? root.data : root;
  const customers = getArrayPayload(payload).filter(isRecord).map(mapSellerCustomer);
  const statsPayload = isRecord(root.stats)
    ? root.stats
    : isRecord(paginator.stats)
      ? paginator.stats
      : {};
  const stats = mapSellerCustomerStats(statsPayload);

  return {
    customers,
    stats: Object.keys(statsPayload).length ? stats : emptySellerCustomerStats,
    currentPage: getNumber(paginator.current_page, page),
    lastPage: getNumber(paginator.last_page, page),
    total: getNumber(paginator.total, customers.length),
  };
}

const mapSellerSalesTrendPoint = (item: UnknownRecord, compactLabel: Intl.DateTimeFormat): SellerSalesTrendPoint => {
  const date = getString(item.date || item.created_at || item.createdAt);
  const parsedDate = date ? new Date(date) : null;
  const label = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? compactLabel.format(parsedDate)
    : date || 'N/A';
  const salesValue = getNumber(item.revenue || item.sales || item.total_revenue);

  return {
    label,
    date,
    salesValue,
    sales: formatMMK(salesValue),
    orders: getNumber(item.orders_count || item.orders || item.total_orders),
  };
};

const mapSellerTopProductSale = (product: UnknownRecord, index = 0): SellerTopProductSale => {
  const revenueValue = getNumber(product.total_revenue || product.revenue || product.sales_revenue);

  return {
    id: getString(product.id || product.product_id, `top-product-${index}`),
    name: getString(product.name || product.name_en || product.name_mm || product.product_name, 'Unnamed product'),
    sales: getNumber(product.total_sold || product.sales || product.quantity_sold),
    revenueValue,
    revenue: formatMMK(revenueValue),
  };
};

export async function fetchSellerSalesReports(signal?: AbortSignal): Promise<SellerSalesReportsData> {
  const [summaryPayload, topProductsPayload] = await Promise.all([
    apiGet('/seller/sales-summary', signal),
    apiGet('/seller/top-products', signal),
  ]);
  const summaryRoot = isRecord(summaryPayload) && isRecord(summaryPayload.data) ? summaryPayload.data : summaryPayload;
  const summaryData = isRecord(summaryRoot) ? summaryRoot : {};
  const sales = isRecord(summaryData.sales) ? summaryData.sales : {};
  const customers = isRecord(summaryData.customers) ? summaryData.customers : {};
  const trend = Array.isArray(summaryData.recent_trend) ? summaryData.recent_trend.filter(isRecord) : [];
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const monthlyData = trend.map((item) => mapSellerSalesTrendPoint(item, monthFormatter));
  const weeklyData = trend.slice(-7).map((item) => mapSellerSalesTrendPoint(item, dayFormatter));
  const topProducts = getArrayPayload(topProductsPayload).filter(isRecord).map(mapSellerTopProductSale);
  const totalSalesValue = getNumber(sales.total_revenue || summaryData.total_revenue);

  return {
    monthlyData,
    weeklyData,
    topProducts,
    summary: {
      totalSalesValue,
      totalSales: formatMMK(totalSalesValue),
      totalOrders: getNumber(sales.total_orders || summaryData.total_orders),
      newCustomers: getNumber(customers.total || customers.total_customers || summaryData.new_customers),
    },
  };
}

const mapSellerFinancialSummary = (summary: UnknownRecord): SellerFinancialSummary => {
  const totalGmvValue = getNumber(summary.total_gmv);
  const totalSubtotalValue = getNumber(summary.total_subtotal);
  const totalShippingValue = getNumber(summary.total_shipping);
  const totalTaxValue = getNumber(summary.total_tax);
  const totalCouponDiscountValue = getNumber(summary.total_coupon_discount);
  const totalCommissionValue = getNumber(summary.total_commission);
  const totalCommissionPendingValue = getNumber(summary.total_commission_pending);
  const totalCommissionConfirmedValue = getNumber(summary.total_commission_confirmed);
  const totalSellerPayoutValue = getNumber(summary.total_seller_payout);
  const totalDeliveryFeesValue = getNumber(summary.total_delivery_fees);
  const totalDeliveryFeesPendingValue = getNumber(summary.total_delivery_fees_pending);
  const totalDeliveryFeesConfirmedValue = getNumber(summary.total_delivery_fees_confirmed);

  return {
    from: getString(summary.from),
    to: getString(summary.to),
    totalOrders: getNumber(summary.total_orders),
    deliveredOrders: getNumber(summary.delivered_orders),
    pendingOrders: getNumber(summary.pending_orders),
    cancelledOrders: getNumber(summary.cancelled_orders),
    totalGmvValue,
    totalGmv: formatMMK(totalGmvValue),
    totalSubtotalValue,
    totalSubtotal: formatMMK(totalSubtotalValue),
    totalShippingValue,
    totalShipping: formatMMK(totalShippingValue),
    totalTaxValue,
    totalTax: formatMMK(totalTaxValue),
    totalCouponDiscountValue,
    totalCouponDiscount: formatMMK(totalCouponDiscountValue),
    totalCommissionValue,
    totalCommission: formatMMK(totalCommissionValue),
    totalCommissionPendingValue,
    totalCommissionPending: formatMMK(totalCommissionPendingValue),
    totalCommissionConfirmedValue,
    totalCommissionConfirmed: formatMMK(totalCommissionConfirmedValue),
    totalSellerPayoutValue,
    totalSellerPayout: formatMMK(totalSellerPayoutValue),
    totalDeliveryFeesValue,
    totalDeliveryFees: formatMMK(totalDeliveryFeesValue),
    totalDeliveryFeesPendingValue,
    totalDeliveryFeesPending: formatMMK(totalDeliveryFeesPendingValue),
    totalDeliveryFeesConfirmedValue,
    totalDeliveryFeesConfirmed: formatMMK(totalDeliveryFeesConfirmedValue),
    wallet: isRecord(summary.wallet) ? mapSellerWalletSummary(summary.wallet) : undefined,
  };
};

const mapSellerFinancialTrendPoint = (item: UnknownRecord): SellerFinancialTrendPoint => ({
  period: getString(item.period, 'N/A'),
  orders: getNumber(item.orders),
  gmvValue: getNumber(item.gmv),
  taxValue: getNumber(item.tax),
  commissionValue: getNumber(item.commission),
  deliveryFeeValue: getNumber(item.delivery_fee),
  platformValue: getNumber(item.platform),
});

const mapSellerFinancialOrder = (order: UnknownRecord, index = 0): SellerFinancialOrder => {
  const totalAmountValue = getNumber(order.total_amount);
  const commissionAmountValue = getNumber(order.commission_amount);
  const sellerPayoutValue = getNumber(order.seller_payout);

  return {
    orderId: getString(order.order_id || order.id, `financial-order-${index}`),
    orderNumber: getString(order.order_number, 'Order'),
    orderDate: getString(order.order_date),
    deliveredAt: getString(order.delivered_at),
    buyerName: getString(order.buyer_name, 'Buyer'),
    buyerEmail: getString(order.buyer_email),
    itemsSummary: getString(order.items_summary, 'Items'),
    itemsCount: getNumber(order.items_count),
    subtotalValue: getNumber(order.subtotal),
    shippingFeeValue: getNumber(order.shipping_fee),
    taxAmountValue: getNumber(order.tax_amount),
    couponDiscountValue: getNumber(order.coupon_discount),
    totalAmountValue,
    totalAmount: formatMMK(totalAmountValue),
    commissionRate: getNumber(order.commission_rate),
    commissionAmountValue,
    commissionAmount: formatMMK(commissionAmountValue),
    commissionStatus: getString(order.commission_status),
    sellerPayoutValue,
    sellerPayout: formatMMK(sellerPayoutValue),
    deliveryFeeValue: getNumber(order.delivery_fee),
    deliveryFeeStatus: getString(order.delivery_fee_status),
    orderStatus: getString(order.order_status, 'pending'),
    paymentMethod: getString(order.payment_method),
    paymentStatus: getString(order.payment_status),
  };
};

export async function fetchSellerFinancialReport(
  options: { period?: string; groupBy?: string; from?: string; to?: string } = {},
  signal?: AbortSignal
): Promise<SellerFinancialReportData> {
  const params = new URLSearchParams({
    period: options.period || 'month',
    group_by: options.groupBy || 'day',
  });

  if (options.period === 'custom') {
    if (options.from) params.set('from', options.from);
    if (options.to) params.set('to', options.to);
  }

  const payload = await apiGet(`/seller/financial-report?${params.toString()}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const record = isRecord(data) ? data : {};
  const summary = isRecord(record.summary) ? record.summary : {};
  const trend = Array.isArray(record.trend) ? record.trend.filter(isRecord) : [];
  const orders = Array.isArray(record.orders) ? record.orders.filter(isRecord) : [];

  return {
    summary: mapSellerFinancialSummary(summary),
    trend: trend.map(mapSellerFinancialTrendPoint),
    orders: orders.map(mapSellerFinancialOrder),
  };
}

const mapAdminFinancialSummary = (summary: UnknownRecord): AdminFinancialSummary => {
  const base = mapSellerFinancialSummary(summary);
  const platformRevenueValue = getNumber(summary.platform_revenue);
  const platformRevenuePendingValue = getNumber(summary.platform_revenue_pending);

  return {
    ...base,
    platformRevenueValue,
    platformRevenue: formatMMK(platformRevenueValue),
    platformRevenuePendingValue,
    platformRevenuePending: formatMMK(platformRevenuePendingValue),
  };
};

const mapAdminFinancialOrderItem = (item: UnknownRecord, index = 0): AdminFinancialOrderItem => {
  const priceValue = getNumber(item.price);
  const subtotalValue = getNumber(item.subtotal);

  return {
    id: getString(item.id || item.product_id, `admin-financial-item-${index}`),
    productId: getString(item.product_id),
    sku: getString(item.sku),
    name: getString(item.name, 'Item'),
    qty: getNumber(item.qty),
    priceValue,
    price: formatMMK(priceValue),
    subtotalValue,
    subtotal: formatMMK(subtotalValue),
  };
};

const mapAdminFinancialOrder = (order: UnknownRecord, index = 0): AdminFinancialOrder => {
  const base = mapSellerFinancialOrder(order, index);
  const commissionConfirmedValue = getNumber(order.commission_confirmed);
  const commissionPendingValue = getNumber(order.commission_pending);
  const deliveryFeeConfirmedValue = getNumber(order.delivery_fee_confirmed);
  const deliveryFeePendingValue = getNumber(order.delivery_fee_pending);
  const items = Array.isArray(order.items)
    ? order.items.filter(isRecord).map(mapAdminFinancialOrderItem)
    : [];

  return {
    ...base,
    sellerName: getString(order.seller_name, 'Seller'),
    sellerEmail: getString(order.seller_email),
    subtotal: formatMMK(base.subtotalValue),
    shippingFee: formatMMK(base.shippingFeeValue),
    taxAmount: formatMMK(base.taxAmountValue),
    couponDiscount: formatMMK(base.couponDiscountValue),
    commissionConfirmedValue,
    commissionConfirmed: formatMMK(commissionConfirmedValue),
    commissionPendingValue,
    commissionPending: formatMMK(commissionPendingValue),
    deliveryFee: formatMMK(base.deliveryFeeValue),
    deliveryFeeConfirmedValue,
    deliveryFeeConfirmed: formatMMK(deliveryFeeConfirmedValue),
    deliveryFeePendingValue,
    deliveryFeePending: formatMMK(deliveryFeePendingValue),
    escrowStatus: getString(order.escrow_status),
    items,
  };
};

export async function fetchAdminFinancialReport(
  options: { period?: string; groupBy?: string; from?: string; to?: string } = {},
  signal?: AbortSignal
): Promise<AdminFinancialReportData> {
  const params = new URLSearchParams({
    period: options.period || 'month',
    group_by: options.groupBy || 'day',
  });

  if (options.period === 'custom') {
    if (options.from) params.set('from', options.from);
    if (options.to) params.set('to', options.to);
  }

  const payload = await apiGet(`/admin/financial-report?${params.toString()}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const record = isRecord(data) ? data : {};
  const summary = isRecord(record.summary) ? record.summary : {};
  const trend = Array.isArray(record.trend) ? record.trend.filter(isRecord) : [];
  const orders = Array.isArray(record.orders) ? record.orders.filter(isRecord) : [];

  return {
    summary: mapAdminFinancialSummary(summary),
    trend: trend.map(mapSellerFinancialTrendPoint),
    orders: orders.map(mapAdminFinancialOrder),
  };
}

const normalizeIdArray = (value: unknown): (string | number)[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'number' || typeof item === 'string') return item;
      if (isRecord(item)) return getString(item.id || item.product_id || item.category_id);
      return '';
    })
    .filter(Boolean);
};

const normalizeDiscountType = (value: unknown): SellerDiscountType => {
  const type = getString(value) as SellerDiscountType;
  return ['percentage', 'fixed', 'free_shipping'].includes(type) ? type : '';
};

const normalizeDiscountScope = (value: unknown): SellerDiscountScope => {
  const scope = getString(value, 'specific_products') as SellerDiscountScope;
  return ['all_products', 'specific_products', 'specific_categories'].includes(scope) ? scope : 'specific_products';
};

const mapSellerDiscount = (discount: UnknownRecord, index = 0): SellerDiscount => {
  const minOrderAmount = discount.min_order_amount == null ? null : getNumber(discount.min_order_amount);
  const maxUses = discount.max_uses == null ? null : getNumber(discount.max_uses);
  const maxUsesPerUser = discount.max_uses_per_user == null ? null : getNumber(discount.max_uses_per_user);
  const rawValue = discount.value == null ? null : getNumber(discount.value);

  return {
    id: getString(discount.id, `discount-${index}`),
    name: getString(discount.name, 'Discount'),
    type: normalizeDiscountType(discount.type),
    value: rawValue,
    minOrderAmount,
    maxUses,
    maxUsesPerUser,
    usedCount: getNumber(discount.used_count || discount.usedCount),
    startsAt: getString(discount.starts_at || discount.startsAt),
    expiresAt: getString(discount.expires_at || discount.expiresAt),
    applicableTo: normalizeDiscountScope(discount.applicable_to || discount.applicableTo),
    applicableProductIds: normalizeIdArray(discount.applicable_product_ids || discount.applicableProductIds),
    applicableCategoryIds: normalizeIdArray(discount.applicable_category_ids || discount.applicableCategoryIds),
    isOneTimeUse: Boolean(discount.is_one_time_use || discount.isOneTimeUse),
    isActive: discount.is_active !== false && discount.is_active !== 0,
  };
};

export async function fetchSellerDiscounts(signal?: AbortSignal): Promise<SellerDiscount[]> {
  const payload = await apiGet('/seller/discounts', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerDiscount);
}

export async function saveSellerDiscount(
  payload: SellerDiscountPayload,
  discountId?: string | number,
  signal?: AbortSignal
): Promise<SellerDiscount | null> {
  const response = discountId
    ? await apiPut(`/seller/discounts/${encodeURIComponent(String(discountId))}`, payload, signal)
    : await apiPost('/seller/discounts', payload, signal);
  const data = isRecord(response) && isRecord(response.data) ? response.data : response;
  return isRecord(data) ? mapSellerDiscount(data) : null;
}

export async function toggleSellerDiscountStatus(discountId: string | number, signal?: AbortSignal): Promise<void> {
  await apiPatch(`/seller/discounts/${encodeURIComponent(String(discountId))}/toggle-status`, {}, signal);
}

export async function deleteSellerDiscount(discountId: string | number, signal?: AbortSignal): Promise<void> {
  await apiDelete(`/seller/discounts/${encodeURIComponent(String(discountId))}`, signal);
}

const normalizeCouponType = (value: unknown): SellerCouponType => {
  const type = getString(value, 'percentage');
  return type === 'fixed' ? 'fixed' : 'percentage';
};

const mapSellerCoupon = (coupon: UnknownRecord, index = 0): SellerCoupon => {
  const minOrderAmount = coupon.min_order_amount == null ? null : getNumber(coupon.min_order_amount);
  const maxUses = coupon.max_uses == null ? null : getNumber(coupon.max_uses);
  const maxUsesPerUser = coupon.max_uses_per_user == null ? null : getNumber(coupon.max_uses_per_user);
  const rawProductIds = coupon.applicable_product_ids ?? coupon.applicableProductIds;
  const applicableProductIds = rawProductIds == null ? null : normalizeIdArray(rawProductIds);

  return {
    id: getString(coupon.id, `coupon-${index}`),
    name: getString(coupon.name, 'Coupon'),
    code: getString(coupon.code, 'CODE'),
    type: normalizeCouponType(coupon.type),
    value: getNumber(coupon.value),
    minOrderAmount,
    applicableProductIds,
    maxUses,
    maxUsesPerUser,
    usedCount: getNumber(coupon.used_count || coupon.usedCount),
    isOneTimeUse: Boolean(coupon.is_one_time_use || coupon.isOneTimeUse),
    isActive: coupon.is_active !== false && coupon.is_active !== 0,
    startsAt: getString(coupon.starts_at || coupon.startsAt),
    expiresAt: getString(coupon.expires_at || coupon.expiresAt),
  };
};

export async function fetchSellerCoupons(signal?: AbortSignal): Promise<SellerCoupon[]> {
  const payload = await apiGet('/seller/coupons', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerCoupon);
}

export async function saveSellerCoupon(
  payload: SellerCouponPayload,
  couponId?: string | number,
  signal?: AbortSignal
): Promise<SellerCoupon | null> {
  const response = couponId
    ? await apiPut(`/seller/coupons/${encodeURIComponent(String(couponId))}`, payload, signal)
    : await apiPost('/seller/coupons', payload, signal);
  const data = isRecord(response) && isRecord(response.data) ? response.data : response;
  return isRecord(data) ? mapSellerCoupon(data) : null;
}

export async function toggleSellerCouponStatus(couponId: string | number, signal?: AbortSignal): Promise<void> {
  await apiPatch(`/seller/coupons/${encodeURIComponent(String(couponId))}/toggle-status`, {}, signal);
}

export async function deleteSellerCoupon(couponId: string | number, signal?: AbortSignal): Promise<void> {
  await apiDelete(`/seller/coupons/${encodeURIComponent(String(couponId))}`, signal);
}

export async function updateSellerManagedProductStatus(
  productId: string | number,
  isActive: boolean,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(`/seller/products/${encodeURIComponent(String(productId))}`, { is_active: isActive }, signal);
}

export async function deleteSellerManagedProduct(
  productId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/seller/products/${encodeURIComponent(String(productId))}`, signal);
}

const mapSellerProductImage = (image: UnknownRecord, index = 0): SellerProductImage => {
  const path = getString(image.path || image.url || image.image);
  const url = getNativeImageUrl(image.url || image.path || image.image) || path;

  return {
    url,
    path,
    angle: getString(image.angle, 'default'),
    isPrimary: Boolean(image.is_primary || image.isPrimary || index === 0),
    name: getString(image.name) || path.split('/').pop() || 'Product image',
    size: getString(image.size, 'Existing'),
  };
};

const mapSellerProductCategory = (category: UnknownRecord): SellerProductCategory => ({
  id: getString(category.id),
  name: getString(category.name || category.name_en || category.name_mm, 'Category'),
  nameEn: getString(category.name_en || category.name),
  nameMm: getString(category.name_mm || category.name),
  children: Array.isArray(category.children)
    ? category.children.filter(isRecord).map(mapSellerProductCategory)
    : [],
});

const mapSellerProductForm = (product: UnknownRecord): SellerProductFormResult => {
  const images = Array.isArray(product.images)
    ? product.images.filter(isRecord).map(mapSellerProductImage)
    : [];
  const category = isRecord(product.category) ? product.category : {};
  const specifications = isRecord(product.specifications)
    ? Object.entries(product.specifications).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = getString(value);
        return acc;
      }, {})
    : {};

  return {
    product: {
      id: getString(product.id),
      name_en: getString(product.name_en || product.name),
      name_mm: getString(product.name_mm),
      description_en: getString(product.description_en || product.description),
      description_mm: getString(product.description_mm),
      product_type: getString(product.product_type, 'physical'),
      price: product.price as string | number,
      category_id: getString(product.category_id || category.id),
      quantity_unit: getString(product.quantity_unit, 'piece'),
      moq: product.moq as string | number,
      min_order_unit: getString(product.min_order_unit, 'piece'),
      lead_time: getString(product.lead_time),
      condition: getString(product.condition, 'new'),
      is_active: product.is_active !== false,
      brand: getString(product.brand),
      model: getString(product.model),
      material: getString(product.material),
      origin: getString(product.origin),
      weight_kg: product.weight_kg as string | number,
      warranty: getString(product.warranty),
      warranty_type: getString(product.warranty_type),
      warranty_period: getString(product.warranty_period),
      return_policy: getString(product.return_policy),
      shipping_cost: product.shipping_cost as string | number,
      shipping_time: getString(product.shipping_time),
      packaging_details: getString(product.packaging_details),
      additional_info: getString(product.additional_info),
      is_featured: Boolean(product.is_featured),
      is_new: product.is_new !== false,
      free_shipping: Boolean(product.free_shipping),
      discount_price: product.discount_price as string | number,
      discount_start: getString(product.discount_start),
      discount_end: getString(product.discount_end),
      specifications,
      file_url: getString(product.file_url),
      file_type: getString(product.file_type),
      images,
    },
    images,
  };
};

const extractRecordPayload = (payload: unknown): UnknownRecord => {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data;
  if (isRecord(payload)) return payload;
  return {};
};

export async function fetchSellerProductCategories(signal?: AbortSignal): Promise<SellerProductCategory[]> {
  const payload = await apiGet('/categories/all', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerProductCategory);
}

const mapSellerBulkImportError = (value: unknown): SellerBulkImportError => {
  const error = isRecord(value) ? value : {};
  const errors = Array.isArray(error.errors)
    ? error.errors.map((item) => getString(item)).filter(Boolean)
    : [getString(error.message || value)].filter(Boolean);

  return {
    row: getString(error.row, 'N/A'),
    errors,
  };
};

const mapSellerBulkImportedProduct = (value: unknown): SellerBulkImportedProduct => {
  const product = isRecord(value) ? value : {};
  return {
    id: getString(product.id),
    sku: getString(product.sku),
    nameEn: getString(product.name_en || product.nameEn || product.name),
  };
};

const mapSellerBulkImportResult = (payload: unknown): SellerBulkImportResult => {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  return {
    imported: getNumber(data.imported_count || data.imported, 0),
    skipped: getNumber(data.skipped_count || data.skipped, 0),
    errors: Array.isArray(data.errors) ? data.errors.map(mapSellerBulkImportError) : [],
    importedList: Array.isArray(data.imported) ? data.imported.map(mapSellerBulkImportedProduct) : [],
  };
};

export async function downloadSellerBulkImportTemplate(signal?: AbortSignal): Promise<Blob> {
  const response = await fetchWithTimeout('/seller/products/bulk-import/template', {
    headers: buildHeaders(),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    let payload: unknown = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }
    const data = isRecord(payload) ? payload : {};
    throw new ApiError(
      getString(data.message) || `Template download failed (${response.status})`,
      response.status,
      data.errors
    );
  }

  return response.blob();
}

export async function importSellerProductsBulk(
  file: Blob | NativeUploadFile,
  filename = 'bulk_import.csv',
  signal?: AbortSignal
): Promise<SellerBulkImportResult> {
  const form = new FormData();
  if (isRecord(file) && typeof file.uri === 'string') {
    appendNativeFile(form, 'file', file);
  } else {
    form.append('file', file as Blob, filename);
  }
  const payload = await apiPostForm('/seller/products/bulk-import', form, signal);
  return mapSellerBulkImportResult(payload);
}

export async function fetchSellerProductForEdit(
  productId: string | number,
  signal?: AbortSignal
): Promise<SellerProductFormResult> {
  const payload = await apiGet(`/seller/products/${encodeURIComponent(String(productId))}/edit`, signal);
  return mapSellerProductForm(extractRecordPayload(payload));
}

export async function createSellerProduct(
  body: unknown,
  signal?: AbortSignal
): Promise<SellerProductFormResult> {
  const payload = await apiPost('/seller/products', body, signal);
  return mapSellerProductForm(extractRecordPayload(payload));
}

export async function updateSellerProduct(
  productId: string | number,
  body: unknown,
  signal?: AbortSignal
): Promise<SellerProductFormResult> {
  const payload = await apiPut(`/seller/products/${encodeURIComponent(String(productId))}`, body, signal);
  return mapSellerProductForm(extractRecordPayload(payload));
}

export type SellerManagedVariantOptionValue = {
  valueId: string | number;
  label: string;
  optionType?: string;
  meta?: {
    hex?: string;
    imageUrl?: string;
  };
};

export type SellerManagedVariant = {
  id: string | number;
  label: string;
  price: number;
  quantity: number;
  quantityUnit: string;
  moq?: number;
  sku: string;
  isActive: boolean;
  optionValues: SellerManagedVariantOptionValue[];
};

export type SellerVariantGeneratePayload = {
  price: number;
  quantity: number;
  moq?: number | null;
  quantity_step?: number | null;
};

export type SellerVariantUpdatePayload = {
  price: number;
  quantity: number;
  quantity_unit?: string | null;
  moq?: number | null;
  quantity_step?: number | null;
  sku?: string | null;
  is_active: boolean;
};

const mapSellerManagedVariantOptionValue = (value: UnknownRecord): SellerManagedVariantOptionValue => {
  const meta = isRecord(value.meta) ? value.meta : undefined;

  return {
    valueId: getString(value.value_id || value.id),
    label: getString(value.label),
    optionType: getString(value.option_type),
    meta: meta
      ? {
          hex: getString(meta.hex),
          imageUrl: getString(meta.image_url || meta.imageUrl),
        }
      : undefined,
  };
};

const mapSellerManagedVariant = (variant: UnknownRecord): SellerManagedVariant => ({
  id: getString(variant.id),
  label: getString(variant.label),
  price: getNumber(variant.price),
  quantity: getNumber(variant.quantity || variant.stock),
  quantityUnit: getString(variant.quantity_unit),
  moq: variant.moq == null ? undefined : getNumber(variant.moq),
  sku: getString(variant.sku),
  isActive: variant.is_active !== false,
  optionValues: Array.isArray(variant.option_values)
    ? variant.option_values.filter(isRecord).map(mapSellerManagedVariantOptionValue)
    : [],
});

export async function fetchSellerProductVariants(
  productId: string | number,
  signal?: AbortSignal
): Promise<SellerManagedVariant[]> {
  const payload = await apiGet(`/seller/products/${encodeURIComponent(String(productId))}/variants`, signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerManagedVariant);
}

export async function updateSellerProductVariant(
  productId: string | number,
  variantId: string | number,
  body: SellerVariantUpdatePayload,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(
    `/seller/products/${encodeURIComponent(String(productId))}/variants/${encodeURIComponent(String(variantId))}`,
    body,
    signal
  );
}

export async function toggleSellerProductVariant(
  productId: string | number,
  variantId: string | number,
  signal?: AbortSignal
): Promise<boolean> {
  const payload = await apiPatch(
    `/seller/products/${encodeURIComponent(String(productId))}/variants/${encodeURIComponent(String(variantId))}/toggle`,
    {},
    signal
  );
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return isRecord(data) ? data.is_active !== false : true;
}

export async function deleteSellerProductVariant(
  productId: string | number,
  variantId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(
    `/seller/products/${encodeURIComponent(String(productId))}/variants/${encodeURIComponent(String(variantId))}`,
    signal
  );
}

export async function generateSellerProductVariants(
  productId: string | number,
  body: SellerVariantGeneratePayload,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/seller/products/${encodeURIComponent(String(productId))}/variants/generate`,
    body,
    signal
  );
}

const mapSellerWholesaleTier = (tier: UnknownRecord): SellerWholesaleTier => ({
  id: getString(tier.id || tier._id),
  minQty: getString(tier.min_qty || tier.minimum_quantity || tier.minQty),
  pricePerUnit: getString(tier.price_per_unit || tier.price || tier.pricePerUnit),
  label: getString(tier.label),
  isActive: tier.is_active !== false && tier.is_active !== 0,
});

export async function fetchSellerWholesaleTiers(
  productId: string | number,
  signal?: AbortSignal
): Promise<SellerWholesaleTier[]> {
  const payload = await apiGet(`/seller/products/${encodeURIComponent(String(productId))}/wholesale-tiers`, signal);
  return getArrayPayload(payload)
    .filter(isRecord)
    .filter((tier) => tier.variant_id == null)
    .map(mapSellerWholesaleTier);
}

export async function syncSellerWholesaleTiers(
  productId: string | number,
  tiers: SellerWholesaleTier[],
  signal?: AbortSignal
): Promise<SellerWholesaleTier[]> {
  const payload = await apiPost(
    `/seller/products/${encodeURIComponent(String(productId))}/wholesale-tiers/sync`,
    {
      variant_id: null,
      tiers: tiers.map((tier, index) => ({
        min_qty: parseInt(tier.minQty, 10),
        price_per_unit: parseFloat(tier.pricePerUnit),
        label: tier.label.trim() || null,
        sort_order: index,
        is_active: tier.isActive !== false,
      })),
    },
    signal
  );
  return getArrayPayload(payload).filter(isRecord).map(mapSellerWholesaleTier);
}

export async function uploadSellerProductImage(
  formData: FormData,
  productId?: string | number,
  signal?: AbortSignal
): Promise<SellerProductImage | null> {
  const path = productId
    ? `/seller/products/${encodeURIComponent(String(productId))}/upload-image`
    : '/seller/products/upload-image';
  const payload = await apiPostForm(path, formData, signal);
  const data = extractRecordPayload(payload);
  return isRecord(data) ? mapSellerProductImage(data) : null;
}

const toStorageUrl = (path: string) => {
  const cleanPath = path.replace('public/', '').replace(/^\/?storage\//, '');
  return `${IMAGE_BASE_URL}/${cleanPath}`;
};

export const getNativeImageUrl = (image: unknown): string | undefined => {
  if (image == null) return undefined;

  if (typeof image === 'string') {
    if (!image || image === DEFAULT_PRODUCT_IMAGE) return undefined;
    if (image.startsWith('http') || image.startsWith('data:')) return image;
    return toStorageUrl(image);
  }

  if (Array.isArray(image)) {
    return getNativeImageUrl(image[0]);
  }

  if (isRecord(image)) {
    return getNativeImageUrl(image.url ?? image.path ?? image.image);
  }

  return undefined;
};

const normalizeDisplayStyle = (value: unknown): AnnouncementDisplayStyle => {
  const style = getString(value, 'popup_card') as AnnouncementDisplayStyle;
  return ['popup_card', 'popup_banner', 'page_banner'].includes(style) ? style : 'popup_card';
};

const getAnnouncementBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true;
    if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false;
  }
  return fallback;
};

const mapAnnouncement = (value: UnknownRecord): Announcement => ({
  id: getString(value.id, 'announcement'),
  title: getString(value.title),
  content: getString(value.content),
  type: getString(value.type, 'announcement'),
  displayStyle: normalizeDisplayStyle(value.display_style || value.displayStyle),
  imageUrl: getNativeImageUrl(value.image || value.image_url || value.imageUrl),
  ctaLabel: getString(value.cta_label || value.ctaLabel),
  ctaUrl: getString(value.cta_url || value.ctaUrl),
  ctaStyle: getString(value.cta_style || value.ctaStyle, 'primary'),
  bannerLinkUrl: getString(value.banner_link_url || value.bannerLinkUrl),
  bannerAspectRatio: getString(value.banner_aspect_ratio || value.bannerAspectRatio, '16:9'),
  badgeLabel: getString(value.badge_label || value.badgeLabel),
  badgeColor: getString(value.badge_color || value.badgeColor, 'green'),
  targetAudience: getString(value.target_audience || value.targetAudience, 'all'),
  isActive: getAnnouncementBoolean(value.is_active ?? value.isActive, true),
  showOnce: getAnnouncementBoolean(value.show_once ?? value.showOnce, true),
  delaySeconds: getNumber(value.delay_seconds || value.delaySeconds, 1),
  startsAt: getString(value.starts_at || value.startsAt),
  endsAt: getString(value.ends_at || value.endsAt),
  sortOrder: getNumber(value.sort_order || value.sortOrder),
  createdAt: getString(value.created_at || value.createdAt),
  updatedAt: getString(value.updated_at || value.updatedAt),
});

const announcementData = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data.filter(isRecord);
  if (isRecord(payload) && isRecord(payload.data) && Array.isArray(payload.data.data)) {
    return payload.data.data.filter(isRecord);
  }
  return [];
};

export async function fetchAnnouncements(signal?: AbortSignal): Promise<Announcement[]> {
  const payload = await apiGet('/announcements', signal);
  return announcementData(payload).map(mapAnnouncement);
}

export async function fetchAdminAnnouncements(signal?: AbortSignal): Promise<Announcement[]> {
  const payload = await apiGet('/admin/announcements', signal);
  return announcementData(payload).map(mapAnnouncement);
}

export async function createAdminAnnouncement(
  body: AnnouncementPayload,
  signal?: AbortSignal
): Promise<Announcement | null> {
  const payload = await apiPost('/admin/announcements', body, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return isRecord(data) ? mapAnnouncement(data) : null;
}

export async function updateAdminAnnouncement(
  id: string | number,
  body: AnnouncementPayload,
  signal?: AbortSignal
): Promise<Announcement | null> {
  const payload = await apiPut(`/admin/announcements/${encodeURIComponent(String(id))}`, body, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return isRecord(data) ? mapAnnouncement(data) : null;
}

export async function toggleAdminAnnouncement(
  id: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiPatch(`/admin/announcements/${encodeURIComponent(String(id))}/toggle`, {}, signal);
}

export async function deleteAdminAnnouncement(
  id: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/admin/announcements/${encodeURIComponent(String(id))}`, signal);
}

export const formatMMK = (amount: unknown) => {
  const number = Number(amount);
  if (!Number.isFinite(number)) return '0 MMK';

  return `${new Intl.NumberFormat('en-MM', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(number)} MMK`;
};

const formatDate = (value: unknown) => {
  const rawValue = getString(value);
  if (!rawValue) return 'No expiry date';

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  return new Intl.DateTimeFormat('en-MM', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const stripHtml = (value: unknown) => getString(value).replace(/<[^>]*>/g, '').trim();

const readingTime = (value: unknown) => {
  const words = stripHtml(value).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
};

const formatDiscount = (type: unknown, value: unknown) => {
  const discountType = getString(type).toLowerCase();
  const amount = getNumber(value);

  if (discountType === 'percentage' || discountType === 'percent') {
    return `${amount}% off`;
  }

  if (discountType === 'fixed' || discountType === 'amount') {
    return `${formatMMK(amount)} off`;
  }

  return amount > 0 ? `${amount} off` : 'Special deal';
};

const getCategoryPreview = (category: UnknownRecord) =>
  Array.isArray(category.children)
    ? category.children
        .filter(isRecord)
        .filter((child) => getNumber(child.products_count) > 0)
        .slice(0, 3)
        .map(
          (child) =>
            `${getNumber(child.products_count)} ${getString(
              child.name_en || child.name_mm,
              'subcategory'
            )}`
        )
    : [];

const hasCategoryProducts = (category: BrowserCategory): boolean =>
  category.productCount > 0 || category.children.some(hasCategoryProducts);

const getDiscountPct = (record: UnknownRecord) => {
  const keys = [
    'effective_discount_pct',
    'max_discount_percentage',
    'discount_percentage',
    'discount_percent',
    'top_discount_percentage',
    'best_discount_percentage',
  ];

  return Math.round(Math.max(...keys.map((key) => getNumber(record[key])), 0));
};

const getEffectiveProductPrice = (product: UnknownRecord, discountPct: number) => {
  const basePrice = getNumber(product.price);
  const sellingPrice = getNumber(product.selling_price);

  if (sellingPrice > 0 && sellingPrice < basePrice) {
    return sellingPrice;
  }

  if (discountPct > 0 && basePrice > 0) {
    return basePrice * (1 - discountPct / 100);
  }

  return basePrice;
};

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeSpecifications = (value: unknown): Record<string, string> => {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return {};

  return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, item]) => {
    const cleanValue = getString(item).trim();
    if (cleanValue) acc[key] = cleanValue;
    return acc;
  }, {});
};

const normalizeProductImages = (image: unknown, fallback?: unknown): string[] => {
  const parsed = parseMaybeJson(image);
  const source = Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  const images = Array.isArray(source) ? source : [source];

  return images
    .map((item) => getNativeImageUrl(item))
    .filter((url): url is string => Boolean(url));
};

const normalizeStringArray = (value: unknown): string[] => {
  const parsed = parseMaybeJson(value);
  const items = Array.isArray(parsed) ? parsed : typeof parsed === 'string' ? parsed.split(',') : [];

  return items.map((item) => getString(item).trim()).filter(Boolean);
};

const normalizeBusinessHours = (
  value: unknown
): Record<string, { open?: string; close?: string; closed?: boolean }> => {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return {};

  return Object.entries(parsed).reduce<
    Record<string, { open?: string; close?: string; closed?: boolean }>
  >((acc, [day, item]) => {
    if (!isRecord(item)) return acc;
    acc[day] = {
      open: getString(item.open || item.open_time),
      close: getString(item.close || item.close_time),
      closed: item.closed === true || item.is_closed === true,
    };
    return acc;
  }, {});
};

const mapReportAttachment = (attachment: UnknownRecord, index = 0): ReportAttachment => ({
  id: getString(attachment.id || attachment.path || attachment.url, `attachment-${index}`),
  label: getString(attachment.name || attachment.filename, `Attachment ${index + 1}`),
  url: getString(
    attachment.url || attachment.file_url || (attachment.path ? toStorageUrl(getString(attachment.path)) : '')
  ),
});

const mapReportComment = (comment: UnknownRecord, index = 0): ReportComment => ({
  id: getString(comment.id, `comment-${index}`),
  body: getString(comment.body || comment.comment || comment.message),
  authorType: getString(comment.author_type || comment.authorType, 'reporter'),
  authorName: getString(comment.author_name || comment.authorName, 'User'),
  isInternal: comment.is_internal === true || comment.is_internal === 1,
  createdAt: getString(comment.created_at || comment.createdAt),
});

const mapAdminReport = (report: UnknownRecord, index = 0): AdminReport => {
  const base = mapUserReport(report, index);
  const reporter = isRecord(report.reporter) ? report.reporter : undefined;
  const assignee = isRecord(report.assignee) ? report.assignee : undefined;

  return {
    ...base,
    reporter: reporter
      ? {
          name: getString(reporter.name),
          email: getString(reporter.email),
        }
      : undefined,
    guestName: getString(report.guest_name || report.guestName),
    guestEmail: getString(report.guest_email || report.guestEmail),
    reporterIp: getString(report.reporter_ip || report.reporterIp),
    reporterLocale: getString(report.reporter_locale || report.reporterLocale),
    firstResponseAt: getString(report.first_response_at || report.firstResponseAt),
    adminNotes: getString(report.admin_notes || report.adminNotes),
    assignee: assignee
      ? {
          id: getString(assignee.id),
          name: getString(assignee.name),
        }
      : undefined,
    assignedAt: getString(report.assigned_at || report.assignedAt),
  };
};

const mapUserReport = (report: UnknownRecord, index = 0): UserReport => {
  const comments = Array.isArray(report.comments) ? report.comments.filter(isRecord) : [];
  const attachments = Array.isArray(report.attachments) ? report.attachments.filter(isRecord) : [];

  return {
    id: getString(report.id || report.ticket_id, `report-${index}`),
    ticketId: getString(report.ticket_id || report.ticketId || report.id, `REPORT-${index}`),
    subject: getString(report.subject, 'Untitled report'),
    description: getString(report.description),
    category: getString(report.category, 'other'),
    priority: getString(report.priority, 'medium'),
    status: getString(report.status, 'open'),
    resolution: getString(report.resolution),
    createdAt: getString(report.created_at || report.createdAt),
    slaHours: report.sla_hours == null ? undefined : getNumber(report.sla_hours),
    slaBreached: report.sla_breached === true || report.sla_breached === 1,
    comments: comments.map(mapReportComment),
    attachments: attachments.map(mapReportAttachment).filter((item) => Boolean(item.url)),
  };
};

const mapBulkOrderProduct = (product: UnknownRecord, index = 0): BulkOrderProduct => {
  const seller = isRecord(product.seller) ? product.seller : undefined;
  const moq = Math.max(getNumber(product.moq || product.minimum_order_quantity, 1), 1);
  const quantityStep = Math.max(getNumber(product.quantity_step || moq, moq), 1);
  const discountPct = getDiscountPct(product);
  const effectivePrice = getEffectiveProductPrice(product, discountPct);
  const wholesaleTiers = Array.isArray(product.wholesale_tiers)
    ? product.wholesale_tiers.filter(isRecord)
    : [];

  return {
    id: getString(product.id, `bulk-product-${index}`),
    slug: getString(product.slug_en || product.slug || product.id, `bulk-product-${index}`),
    name: getString(product.name_en || product.name_mm, 'Unnamed product'),
    sellerId: getString(seller?.id || product.seller_id),
    sellerLabel: getString(
      seller?.store_name || seller?.business_name || seller?.name || product.seller_name,
      'Pyonea seller'
    ),
    categoryId: getString(product.category_id),
    unitLabel: getString(product.quantity_unit || product.min_order_unit, 'piece').slice(0, 20),
    moq,
    quantityStep,
    basePrice: effectivePrice,
    price: formatMMK(effectivePrice),
    imageUrl: getNativeImageUrl(product.images || product.image),
    hasVariants: product.has_variants === true || product.has_variants === 1,
    wholesaleTiers: wholesaleTiers.map((tier) => ({
      minQty: getNumber(tier.min_qty || tier.minimum_quantity),
      priceValue: getNumber(tier.price_per_unit || tier.price),
      discountPct: getNumber(tier.discount_pct || tier.discount_percentage),
    })),
  };
};

const getProductEnvelope = (payload: unknown) => {
  if (!isRecord(payload)) return payload;
  if (isRecord(payload.data) && isRecord(payload.data.product)) return payload.data.product;
  if (isRecord(payload.data)) return payload.data;
  return payload;
};

const mapProductReview = (review: UnknownRecord, index: number): ProductReview => {
  const buyer = isRecord(review.buyer) ? review.buyer : undefined;
  const user = isRecord(review.user) ? review.user : undefined;

  return {
    id: getString(review.id, `review-${index}`),
    userId: getString(review.user_id || user?.id || buyer?.id, ''),
    author: getString(buyer?.name || user?.name || review.user, 'Anonymous'),
    company: getString(buyer?.company || user?.company_name),
    rating: getNumber(review.rating),
    comment: getString(review.comment),
    createdAt: getString(review.created_at || review.createdAt, ''),
  };
};

const normalizeProductOptionMeta = (value: unknown): ProductOptionValue['meta'] => {
  const meta = parseMaybeJson(value);
  const record = isRecord(meta) ? meta : {};
  return {
    hex: getString(record.hex || record.color || record.colour),
    imageUrl: getNativeImageUrl(record.image_url || record.imageUrl || record.image),
  };
};

const mapProductOptionValue = (value: UnknownRecord, index: number): ProductOptionValue => ({
  id: getString(value.id || value.value_id || value.label, `value-${index}`),
  label: getString(value.label || value.name || value.value, `Option ${index + 1}`),
  meta: normalizeProductOptionMeta(value.meta || value.metadata),
});

const mapProductOption = (option: UnknownRecord, index: number): ProductOption => {
  const values = Array.isArray(option.values)
    ? option.values.filter(isRecord)
    : Array.isArray(option.option_values)
      ? option.option_values.filter(isRecord)
      : [];

  return {
    id: getString(option.id || option.option_id || option.name, `option-${index}`),
    name: getString(option.name || option.label, `Option ${index + 1}`),
    type: getString(option.type || option.input_type, 'text').toLowerCase(),
    isRequired:
      option.is_required === true ||
      option.is_required === 1 ||
      option.required === true ||
      option.required === 1,
    values: values.map(mapProductOptionValue),
  };
};

const getVariantOptionValueIds = (variant: UnknownRecord): (string | number)[] => {
  const optionValues = Array.isArray(variant.option_values)
    ? variant.option_values.filter(isRecord)
    : Array.isArray(variant.values)
      ? variant.values.filter(isRecord)
      : [];

  return optionValues
    .map((value) => getString(value.value_id || value.id || value.option_value_id))
    .filter(Boolean);
};

const mapProductVariant = (variant: UnknownRecord, index: number): ProductVariant => {
  const priceValue = getNumber(variant.selling_price || variant.price);
  return {
    id: getString(variant.id || variant.variant_id, `variant-${index}`),
    sku: getString(variant.sku),
    priceValue,
    price: formatMMK(priceValue),
    quantity: getNumber(variant.quantity || variant.stock || variant.total_stock),
    moq: variant.moq == null ? undefined : getNumber(variant.moq),
    quantityStep: variant.quantity_step == null ? undefined : getNumber(variant.quantity_step),
    imageUrl: getNativeImageUrl(variant.image || variant.image_url || variant.imageUrl),
    optionValueIds: getVariantOptionValueIds(variant),
  };
};

export const getProductApiId = (product: Pick<HomeProduct, 'id' | 'productId'>) =>
  product.productId ?? product.id;

export const mapHomeProduct = (product: UnknownRecord, index = 0): HomeProduct => {
  const seller = isRecord(product.seller) ? product.seller : undefined;
  const category = isRecord(product.category) ? product.category : undefined;
  const discountPct = getDiscountPct(product);
  const effectivePrice = getEffectiveProductPrice(product, discountPct);
  const numericId = getString(product.id, `product-${index}`);
  const routeId = getString(product.slug_en || product.slug || product.id, numericId);

  const nameEn = getString(product.name_en || product.name, 'Unnamed product');
  const nameMm = getString(product.name_mm);
  const categoryNameEn = getString(category?.name_en || category?.name);
  const categoryNameMm = getString(category?.name_mm);

  return {
    id: routeId,
    productId: numericId,
    slug: routeId,
    name: nameEn || nameMm || 'Unnamed product',
    nameEn,
    nameMm,
    seller: getString(
      seller?.store_name || seller?.business_name || product.seller_name,
      'Pyonea seller'
    ),
    price: formatMMK(effectivePrice),
    rating: getString(product.average_rating || product.rating, '0'),
    imageUrl: getNativeImageUrl(product.images || product.image),
    isNew: product.is_new === true || product.is_new === 1,
    originalPrice: discountPct > 0 ? formatMMK(product.price) : undefined,
    discountPct,
    reviewCount: getNumber(product.review_count),
    moq: getNumber(product.moq || product.minimum_order_quantity || product.min_order, 1),
    categoryName: categoryNameEn || categoryNameMm,
    categoryNameEn,
    categoryNameMm,
    hasVariants: product.has_variants === true || product.has_variants === 1,
  };
};

const mapHomeSeller = (seller: UnknownRecord, index = 0): HomeSeller => {
  const user = isRecord(seller.user) ? seller.user : undefined;

  return {
    id: getString(seller.id, `seller-${index}`),
    name: getString(seller.store_name || seller.business_name, 'Unnamed seller'),
    slug: getString(seller.store_slug || seller.slug || seller.id, `seller-${index}`),
    type: getString(seller.business_type || seller.category, 'General Merchant'),
    products: getNumber(seller.products_count || seller.total_products),
    rating: getString(seller.reviews_avg_rating || seller.average_rating || seller.rating, '0'),
    reviews: getNumber(seller.reviews_count || seller.review_count),
    city: getString(seller.city || user?.city, 'Unknown City'),
    verified:
      seller.status === 'approved' ||
      seller.status === 'active' ||
      seller.is_verified === true ||
      seller.verification_status === 'verified',
    imageUrl: getNativeImageUrl(
      seller.store_logo ||
        seller.logo ||
        seller.profile_image ||
        seller.logo_url ||
        user?.avatar ||
        user?.profile_image
    ),
    joined: getString(seller.created_at || seller.createdAt),
  };
};

const mapSellerProfile = (seller: UnknownRecord, stats: UnknownRecord = {}): SellerProfile => {
  const homeSeller = mapHomeSeller(seller);
  const followers = getNumber(stats.followers_count || seller.followers_count);
  const createdAt = getString(seller.created_at || seller.createdAt);
  const user = isRecord(seller.user) ? seller.user : undefined;
  const userSettings = parseMaybeJson(user?.settings);
  const settingsRecord = isRecord(userSettings) ? userSettings : {};

  return {
    ...homeSeller,
    showReviews:
      seller.show_reviews !== false &&
      seller.showReviews !== false &&
      settingsRecord.show_reviews !== false,
    products: getNumber(stats.active_products || stats.total_products || seller.products_count, homeSeller.products),
    reviews: getNumber(seller.reviews_count || stats.reviews_count || seller.review_count, homeSeller.reviews),
    rating: getString(seller.reviews_avg_rating || stats.average_rating || seller.average_rating, homeSeller.rating),
    bannerUrl: getNativeImageUrl(seller.store_banner || seller.banner || seller.cover_image),
    description: stripHtml(seller.store_description || seller.description),
    address: getString(seller.address),
    state: getString(seller.state),
    country: getString(seller.country, 'Myanmar'),
    phone: getString(seller.contact_phone || seller.phone),
    email: getString(seller.contact_email || seller.email),
    website: getString(seller.website),
    createdAt,
    memberSince: createdAt ? formatDate(createdAt) : '',
    followers,
    vacationMode: seller.vacation_mode === true || seller.vacation_mode === 1,
    vacationMessage: getString(seller.vacation_message),
    businessName: getString(seller.business_name),
    businessHours: normalizeBusinessHours(seller.business_hours),
    policies: {
      returnPolicy: stripHtml(seller.return_policy),
      shippingPolicy: stripHtml(seller.shipping_policy),
      warrantyPolicy: stripHtml(seller.warranty_policy),
      privacyPolicy: stripHtml(seller.privacy_policy),
      termsOfService: stripHtml(seller.terms_of_service),
    },
    socialLinks: {
      facebook: getString(seller.facebook),
      instagram: getString(seller.instagram),
      linkedin: getString(seller.linkedin),
      twitter: getString(seller.twitter),
      youtube: getString(seller.youtube),
      tiktok: getString(seller.tiktok),
    },
  };
};

const mapSellerReviewStats = (stats: UnknownRecord): SellerReviewStats => ({
  star1: getNumber(stats.star_1 || stats.star1),
  star2: getNumber(stats.star_2 || stats.star2),
  star3: getNumber(stats.star_3 || stats.star3),
  star4: getNumber(stats.star_4 || stats.star4),
  star5: getNumber(stats.star_5 || stats.star5),
});

export const computeReviewStatsFromReviews = (reviews: SellerReview[]): SellerReviewStats =>
  reviews.reduce(
    (acc, review) => {
      const key = `star${Math.max(1, Math.min(5, Math.round(review.rating)))}` as keyof SellerReviewStats;
      acc[key] += 1;
      return acc;
    },
    { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 }
  );

const mapSellerReview = (review: UnknownRecord, index = 0): SellerReview => {
  const user = isRecord(review.user) ? review.user : undefined;
  const buyer = isRecord(review.buyer) ? review.buyer : undefined;

  return {
    id: getString(review.id, `seller-review-${index}`),
    userId: getString(review.user_id || user?.id || buyer?.id, ''),
    author: getString(user?.name || buyer?.name || review.name || review.author, 'Anonymous'),
    rating: getNumber(review.rating),
    comment: getString(review.comment || review.review || review.body),
    createdAt: getString(review.created_at || review.createdAt),
  };
};

const mapSellerDeliveryArea = (area: UnknownRecord, index = 0): SellerDeliveryArea => ({
  id: getString(area.id, `delivery-area-${index}`),
  areaType: getString(area.area_type || area.type, 'township'),
  country: getString(area.country, 'Myanmar'),
  state: getString(area.state || area.region),
  city: getString(area.city),
  township: getString(area.township || area.name),
  shippingFeeValue: getNumber(area.shipping_fee),
  shippingFee: area.shipping_fee == null ? 'Free' : formatMMK(area.shipping_fee),
  freeShippingThresholdValue: getNumber(area.free_shipping_threshold),
  freeShippingThreshold: area.free_shipping_threshold
    ? formatMMK(area.free_shipping_threshold)
    : '',
  estimatedDaysMin: getNumber(area.estimated_delivery_days_min || area.days_min, 3),
  estimatedDaysMax: getNumber(area.estimated_delivery_days_max || area.days_max, 5),
  estimatedDays: getString(area.estimated_delivery_days || area.delivery_days) ||
    `${getNumber(area.estimated_delivery_days_min || area.days_min, 3)}-${getNumber(area.estimated_delivery_days_max || area.days_max, 5)} days`,
  cashOnDelivery: area.cash_on_delivery === true || area.cod_available === true,
});

export async function fetchHomeCategories(signal?: AbortSignal): Promise<HomeCategory[]> {
  return withDataCache(
    'api:home-categories',
    DATA_CACHE_TTL.categories,
    async (requestSignal) => {
  const payload = await apiGet(
    '/categories?fields=id,name_en,name_mm,image,products_count,parent_id,children&with_products_only=true',
    requestSignal
  );

  return getArrayPayload(payload)
    .filter(isRecord)
    .filter((category) => category.parent_id == null)
    .slice(0, 6)
    .map((category, index) => {
      const nameEn = getString(category.name_en || category.name, 'Unnamed category');
      const nameMm = getString(category.name_mm);

      return {
        id: getString(category.id, `category-${index}`),
        name: nameEn || nameMm || 'Unnamed category',
        nameEn,
        nameMm,
        productCount: getNumber(category.products_count),
        childrenCount: Array.isArray(category.children) ? category.children.length : 0,
        imageUrl: getNativeImageUrl(category.image),
        childPreview: getCategoryPreview(category),
        discountPct: getDiscountPct(category),
      };
    });
    },
    signal,
  );
}

export async function fetchCategories(signal?: AbortSignal): Promise<HomeCategory[]> {
  const payload = await apiGet(
    '/categories?fields=id,name_en,name_mm,image,products_count,parent_id,children&with_products_only=true',
    signal
  );

  return getArrayPayload(payload)
    .filter(isRecord)
    .filter((category) => category.parent_id == null)
    .map((category, index) => {
      const nameEn = getString(category.name_en || category.name, 'Unnamed category');
      const nameMm = getString(category.name_mm);

      return {
        id: getString(category.id, `category-${index}`),
        name: nameEn || nameMm || 'Unnamed category',
        nameEn,
        nameMm,
        productCount: getNumber(category.products_count),
        childrenCount: Array.isArray(category.children) ? category.children.length : 0,
        imageUrl: getNativeImageUrl(category.image),
        childPreview: getCategoryPreview(category),
        discountPct: getDiscountPct(category),
      };
    });
}

const mapBrowserCategory = (category: UnknownRecord, index = 0): BrowserCategory => {
  const children = Array.isArray(category.children)
    ? category.children.filter(isRecord).map(mapBrowserCategory)
    : [];
  const nameEn = getString(category.name_en || category.name, 'Unnamed category');
  const nameMm = getString(category.name_mm);
  const slugEn = getString(category.slug_en || category.slugEn);
  const slugMm = getString(category.slug_mm || category.slugMm);

  return {
    id: getString(category.id, `category-${index}`),
    name: nameEn || nameMm || 'Unnamed category',
    nameEn,
    nameMm,
    slugEn,
    slugMm,
    descriptionEn: stripHtml(category.description_en || category.descriptionEn),
    descriptionMm: stripHtml(category.description_mm || category.descriptionMm),
    productCount: getNumber(category.products_count),
    childrenCount: children.length,
    imageUrl: getNativeImageUrl(category.image),
    childPreview: children
      .filter(hasCategoryProducts)
      .slice(0, 3)
      .map((child) => `${child.productCount} ${child.name}`),
    discountPct: Math.max(
      getDiscountPct(category),
      ...children.map((child) => child.discountPct || 0),
      0
    ),
    children,
  };
};

export async function fetchCategoryBrowser(signal?: AbortSignal): Promise<BrowserCategory[]> {
  return withDataCache(
    'api:category-browser',
    DATA_CACHE_TTL.categories,
    async (requestSignal) => {
      const payload = await apiGet(
        '/categories?fields=id,name_en,name_mm,slug_en,slug_mm,description_en,description_mm,image,products_count,parent_id,children&with_products_only=true',
        requestSignal
      );

      return getArrayPayload(payload)
        .filter(isRecord)
        .filter((category) => category.parent_id == null)
        .map(mapBrowserCategory)
        .filter(hasCategoryProducts);
    },
    signal,
  );
}

export function flattenBrowserCategories(categories: BrowserCategory[]): BrowserCategory[] {
  const flat: BrowserCategory[] = [];

  const walk = (items: BrowserCategory[]) => {
    for (const item of items) {
      flat.push(item);
      if (item.children.length > 0) walk(item.children);
    }
  };

  walk(categories);
  return flat;
}

const mapCategoryDetail = (
  category: UnknownRecord,
  fallback: BrowserCategory,
  index = 0
): CategoryDetail => {
  const mapped = mapBrowserCategory(category, index);
  const slugEn = mapped.slugEn || fallback.slugEn || String(mapped.id);
  const slugMm = mapped.slugMm || fallback.slugMm || '';

  return {
    ...fallback,
    ...mapped,
    slugEn,
    slugMm,
    descriptionEn: mapped.descriptionEn || fallback.descriptionEn || '',
    descriptionMm: mapped.descriptionMm || fallback.descriptionMm || '',
    canonicalSlug: slugEn || slugMm || String(mapped.id),
    children: mapped.children.length > 0 ? mapped.children : fallback.children,
  };
};

export async function fetchCategoryDetail(
  slug: string,
  signal?: AbortSignal
): Promise<CategoryDetail | null> {
  return withDataCache(
    `api:category-detail:${slug}`,
    DATA_CACHE_TTL.categories,
    async (requestSignal) => {
      const tree = await fetchCategoryBrowser(requestSignal);
      const match = flattenBrowserCategories(tree).find(
        (category) =>
          category.slugEn === slug ||
          category.slugMm === slug ||
          String(category.id) === slug
      );

      if (!match) return null;

      try {
        const payload = await apiGet(`/categories/${encodeURIComponent(String(match.id))}`, requestSignal);
        const record = isRecord(payload) && isRecord(payload.data) ? payload.data : extractRecordPayload(payload);
        if (!isRecord(record)) return mapCategoryDetail({}, match);
        return mapCategoryDetail(record, match);
      } catch {
        return {
          ...match,
          slugEn: match.slugEn || String(match.id),
          slugMm: match.slugMm || '',
          descriptionEn: match.descriptionEn || '',
          descriptionMm: match.descriptionMm || '',
          canonicalSlug: match.slugEn || match.slugMm || String(match.id),
        };
      }
    },
    signal,
  );
}

export async function fetchFeaturedProducts(signal?: AbortSignal): Promise<HomeProduct[]> {
  return withDataCache(
    'api:featured-products',
    DATA_CACHE_TTL.products,
    async (requestSignal) => {
      const payload = await apiGet(
        '/products?featured=true&per_page=20&fields=id,name_en,name_mm,slug_en,price,selling_price,effective_discount_pct,discount_percentage,image,images,average_rating,review_count,quantity,is_active,moq,min_order_unit,category_id,seller_id,is_on_sale,is_new,seller,category',
        requestSignal
      );

      return getArrayPayload(payload)
        .filter(isRecord)
        .slice(0, 8)
        .map((product, index) => ({ ...mapHomeProduct(product, index), isNew: index < 3 }));
    },
    signal,
  );
}

export async function fetchProducts(signal?: AbortSignal): Promise<HomeProduct[]> {
  const payload = await apiGet(
    '/products?per_page=24&fields=id,name_en,name_mm,slug_en,price,selling_price,effective_discount_pct,discount_percentage,image,images,average_rating,review_count,quantity,is_active,moq,min_order_unit,category_id,seller_id,is_on_sale,is_new,seller,category',
    signal
  );

  return getArrayPayload(payload)
    .filter(isRecord)
    .map(mapHomeProduct);
}

export type ProductListParams = {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  perPage?: number;
};

export async function fetchProductList(
  params: ProductListParams = {},
  signal?: AbortSignal
): Promise<HomeProduct[]> {
  const query = new URLSearchParams({
    per_page: String(params.perPage || 24),
    page: String(params.page || 1),
    sort_by: params.sortBy || 'created_at',
    sort_order: params.sortOrder || 'desc',
    fields:
      'id,name_en,name_mm,slug_en,slug,price,selling_price,effective_discount_pct,discount_percentage,image,images,average_rating,review_count,quantity,total_stock,in_stock,is_active,moq,min_order_unit,quantity_unit,category_id,seller_id,is_on_sale,is_currently_on_sale,has_variants,category,seller',
  });

  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.minPrice) query.set('min_price', params.minPrice);
  if (params.maxPrice) query.set('max_price', params.maxPrice);

  const payload = await apiGet(`/products?${query.toString()}`, signal);

  return getArrayPayload(payload).filter(isRecord).map(mapHomeProduct);
}

export async function searchBulkOrderProducts(
  queryText: string,
  signal?: AbortSignal
): Promise<BulkOrderProduct[]> {
  if (!queryText.trim()) return [];

  const query = new URLSearchParams({
    q: queryText.trim(),
    per_page: '12',
    sort: 'newest',
    fields:
      'id,name_en,name_mm,slug_en,slug,price,selling_price,effective_discount_pct,discount_percentage,image,images,moq,min_order_unit,quantity_unit,quantity_step,category_id,seller_id,has_variants,wholesale_tiers,seller',
  });

  const payload = await apiGet(`/products?${query.toString()}`, signal);

  return getArrayPayload(payload).filter(isRecord).map(mapBulkOrderProduct);
}

export async function fetchProductFilterCategories(
  signal?: AbortSignal
): Promise<BrowserCategory[]> {
  return withDataCache(
    'api:product-filter-categories',
    DATA_CACHE_TTL.categories,
    async (requestSignal) => {
      const payload = await apiGet(
        '/categories?fields=id,name_en,name_mm,parent_id,children,products_count',
        requestSignal
      );

      return getArrayPayload(payload)
        .filter(isRecord)
        .filter((category) => category.parent_id == null)
        .map(mapBrowserCategory)
        .filter(hasCategoryProducts);
    },
    signal,
  );
}

export async function fetchProductDetail(
  slug: string,
  signal?: AbortSignal
): Promise<ProductDetail> {
  return withDataCache(
    `api:product-detail:${slug}`,
    DATA_CACHE_TTL.productDetail,
    async (requestSignal) => fetchProductDetailUncached(slug, requestSignal),
    signal,
  );
}

async function fetchProductDetailUncached(
  slug: string,
  signal?: AbortSignal
): Promise<ProductDetail> {
  const payload = await apiGet(`/products/${encodeURIComponent(slug)}`, signal);
  const product = getProductEnvelope(payload);

  if (!isRecord(product)) {
    throw new Error('Product not found');
  }

  const seller = isRecord(product.seller) ? product.seller : undefined;
  const category = isRecord(product.category) ? product.category : undefined;
  const discountPct = getDiscountPct(product);
  const effectivePrice = getEffectiveProductPrice(product, discountPct);
  const basePrice = getNumber(product.price);
  const images = normalizeProductImages(product.images, product.image);
  const rawReviews = Array.isArray(product.reviews) ? product.reviews.filter(isRecord) : [];
  const rawTiers = Array.isArray(product.wholesale_tiers)
    ? product.wholesale_tiers.filter(isRecord)
    : [];
  const rawOptions = Array.isArray(product.options) ? product.options.filter(isRecord) : [];
  const rawVariants = Array.isArray(product.variants) ? product.variants.filter(isRecord) : [];
  const options = rawOptions.map(mapProductOption);
  const variants = rawVariants.map(mapProductVariant);

  const nameEn = getString(product.name_en || product.name, 'Unnamed product');
  const nameMm = getString(product.name_mm);
  const descriptionEn = stripHtml(product.description_en);
  const descriptionMm = stripHtml(product.description_mm);

  return {
    id: getString(product.id, slug),
    slug: getString(product.slug_en || product.slug || product.id, slug),
    name: nameEn || nameMm || 'Unnamed product',
    nameEn,
    nameMm,
    description: descriptionEn || descriptionMm,
    descriptionEn,
    descriptionMm,
    sku: getString(product.sku),
    priceValue: effectivePrice,
    price: formatMMK(effectivePrice),
    originalPrice: discountPct > 0 ? formatMMK(basePrice) : undefined,
    discountPct,
    savedAmount:
      discountPct > 0 && basePrice > effectivePrice ? formatMMK(basePrice - effectivePrice) : undefined,
    rating: getNumber(product.average_rating || product.rating),
    reviewCount: getNumber(product.review_count),
    images,
    moq: getNumber(product.moq || product.minimum_order_quantity, 1),
    quantityUnit: getString(product.quantity_unit || product.min_order_unit, 'piece'),
    quantityStep: getNumber(product.quantity_step || product.moq, 1),
    stock: getNumber(product.total_stock || product.quantity || product.stock),
    productType: getString(product.product_type, 'physical'),
    hasVariants:
      product.has_variants === true ||
      product.has_variants === 1 ||
      options.length > 0 ||
      variants.length > 0,
    options,
    variants,
    specifications: normalizeSpecifications(product.specifications),
    wholesaleTiers: rawTiers.map((tier) => ({
      minQty: getNumber(tier.min_qty || tier.minimum_quantity),
      price: formatMMK(tier.price_per_unit || tier.price),
      discountPct: getNumber(tier.discount_pct || tier.discount_percentage),
    })),
    categoryName: getString(category?.name_en || category?.name_mm),
    sellerId: getString(product.seller_id || seller?.id, ''),
    seller: seller
      ? {
          id: getString(seller.id || product.seller_id, 'seller'),
          name: getString(seller.store_name || seller.business_name || seller.name, 'Pyonea seller'),
          slug: getString(seller.store_slug || seller.slug || seller.id, 'seller'),
          rating: getString(seller.average_rating || seller.reviews_avg_rating || seller.rating, '0'),
          verified:
            seller.status === 'approved' ||
            seller.status === 'active' ||
            seller.is_verified === true ||
            seller.verification_status === 'verified',
        }
      : undefined,
    reviews: rawReviews.map(mapProductReview),
  };
}

export async function fetchProductReviews(
  productId: string | number,
  signal?: AbortSignal
): Promise<ProductReview[]> {
  const payload = await apiGet(`/reviews/products/${productId}`, signal);
  return getArrayPayload(payload).filter(isRecord).map(mapProductReview);
}

export async function submitProductReview(
  productId: string | number,
  rating: number,
  comment: string,
  signal?: AbortSignal
): Promise<{ review: ProductReview; rating?: number; reviewCount?: number; message: string }> {
  const payload = await apiPost(
    `/buyer/reviews/product/${encodeURIComponent(String(productId))}`,
    { product_id: productId, rating, comment },
    signal
  );
  const record = isRecord(payload) ? payload : {};
  const data = isRecord(record.data) ? record.data : record;
  const reviewRecord = isRecord(data.review)
    ? data.review
    : isRecord(record.data)
      ? record.data
      : data;

  return {
    review: mapProductReview(reviewRecord, 0),
    rating: getNumber(record.product_rating || data.product_rating || data.average_rating),
    reviewCount: getNumber(record.product_review_count || data.product_review_count || data.review_count),
    message: getString(record.message || data.message, 'Review submitted successfully.'),
  };
}

export async function fetchMoreProductsFromSeller(
  sellerId: string | number,
  currentProductId: string | number,
  signal?: AbortSignal
): Promise<HomeProduct[]> {
  const params = new URLSearchParams({
    per_page: '12',
    page: '1',
    seller_id: String(sellerId),
    sort_by: 'created_at',
    sort_order: 'desc',
    fields:
      'id,name_en,name_mm,slug_en,slug,price,selling_price,images,image,average_rating,review_count,quantity,total_stock,is_active,moq,min_order_unit,quantity_unit,category_id,seller_id,is_on_sale,is_currently_on_sale,effective_discount_pct,discount_percentage,category,seller',
  });

  const payload = await apiGet(`/products?${params.toString()}`, signal);

  return getArrayPayload(payload)
    .filter(isRecord)
    .filter((product) => String(product.id) !== String(currentProductId))
    .slice(0, 8)
    .map(mapHomeProduct);
}

export async function fetchTopSellers(signal?: AbortSignal): Promise<HomeSeller[]> {
  const payload = await apiGet(
    '/sellers?top=true&limit=4&fields=id,store_name,store_slug,business_name,business_type,category,city,user,reviews_avg_rating,reviews_count,products_count,total_products,status,is_verified,logo,profile_image,store_logo',
    signal
  );

  return getArrayPayload(payload)
    .filter(isRecord)
    .slice(0, 4)
    .map(mapHomeSeller);
}

export async function fetchSellers(signal?: AbortSignal): Promise<HomeSeller[]> {
  const payload = await apiGet(
    '/sellers?per_page=50&fields=id,store_name,store_slug,business_name,business_type,category,city,user,reviews_avg_rating,reviews_count,products_count,total_products,status,is_verified,logo,profile_image,store_logo,created_at',
    signal
  );

  return getArrayPayload(payload)
    .filter(isRecord)
    .map(mapHomeSeller);
}

export async function fetchSellerProfile(
  slug: string,
  page = 1,
  signal?: AbortSignal
): Promise<SellerProfileResult> {
  const params = new URLSearchParams({ page: String(page), per_page: '24' });
  const payload = await apiGet(`/sellers/${encodeURIComponent(slug)}?${params.toString()}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(data) || !isRecord(data.seller)) {
    throw new Error('Seller not found');
  }

  const productPayload = isRecord(data.products) ? data.products : {};
  const productItems = Array.isArray(productPayload.data) ? productPayload.data.filter(isRecord) : [];
  const stats = isRecord(data.stats) ? data.stats : {};
  const currentPage = getNumber(productPayload.current_page, page);
  const lastPage = getNumber(productPayload.last_page, currentPage);

  return {
    seller: mapSellerProfile(data.seller, stats),
    products: productItems.map(mapHomeProduct),
    currentPage,
    lastPage,
    isFollowing: data.is_following === true,
    isOwnStore: data.is_own_store === true,
    reviewStats: mapSellerReviewStats(stats),
  };
}

export async function fetchSellerReviews(
  slug: string,
  page = 1,
  signal?: AbortSignal,
  perPage = 5
): Promise<SellerReviewsResult> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  const payload = await apiGet(`/reviews/sellers/${encodeURIComponent(slug)}?${params.toString()}`, signal);
  const envelope = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const listSource =
    isRecord(envelope) && Array.isArray(envelope.data)
      ? envelope.data
      : getArrayPayload(payload);
  const envelopeRecord = isRecord(envelope) ? envelope : {};
  const meta = isRecord(envelopeRecord.meta) ? envelopeRecord.meta : {};
  const reviews = listSource.filter(isRecord).map(mapSellerReview);
  const currentPage = getNumber(meta.current_page || envelopeRecord.current_page, page);
  const lastPage = getNumber(meta.last_page || envelopeRecord.last_page, currentPage);
  const total = getNumber(meta.total || envelopeRecord.total, reviews.length);

  return {
    reviews,
    currentPage,
    lastPage,
    total,
  };
}

export async function submitSellerReview(
  slug: string,
  rating: number,
  comment: string,
  signal?: AbortSignal
): Promise<{ review: SellerReview; message: string }> {
  const payload = await apiPost(
    `/sellers/${encodeURIComponent(slug)}/reviews`,
    { rating, comment },
    signal
  );
  const record = isRecord(payload) ? payload : {};
  const data = isRecord(record.data) ? record.data : record;
  const reviewRecord = isRecord(data.review)
    ? data.review
    : isRecord(record.data)
      ? record.data
      : data;

  return {
    review: mapSellerReview(reviewRecord, 0),
    message: getString(record.message || data.message, 'Review submitted successfully.'),
  };
}

export async function fetchSellerDeliveryAreas(
  slug: string,
  signal?: AbortSignal
): Promise<SellerDeliveryArea[]> {
  const payload = await apiGet(`/sellers/${encodeURIComponent(slug)}/delivery-areas`, signal);

  return getArrayPayload(payload).filter(isRecord).map(mapSellerDeliveryArea);
}

export async function fetchSellerDeliveryZones(signal?: AbortSignal): Promise<SellerDeliveryArea[]> {
  const payload = await apiGet('/seller/delivery-areas', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerDeliveryArea);
}

export async function syncSellerDeliveryZones(
  zones: SellerDeliveryZonePayload[],
  signal?: AbortSignal
): Promise<{ message: string; zones: SellerDeliveryArea[]; count: number }> {
  const payload = await apiPost('/seller/delivery-areas/sync', { zones }, signal);
  const record = isRecord(payload) ? payload : {};
  return {
    message: getString(record.message, 'Delivery zones saved successfully.'),
    zones: getArrayPayload(record).filter(isRecord).map(mapSellerDeliveryArea),
    count: getNumber(record.count, zones.length),
  };
}

export async function fetchLocalDeals(signal?: AbortSignal): Promise<LocalDeal[]> {
  const result = await fetchLocalDealsPage({ perPage: 24 }, signal);
  return result.deals;
}

const mapLocalDeal = (deal: UnknownRecord, index = 0): LocalDeal => {
  const seller = isRecord(deal.seller) ? deal.seller : undefined;
  const location = [seller?.city, seller?.state].map((part) => getString(part)).filter(Boolean).join(', ');
  const minOrder = getNumber(deal.min_order_amount);

  return {
    id: getString(deal.id, `deal-${index}`),
    name: getString(deal.name, 'Local deal'),
    code: getString(deal.code, 'PYONEA'),
    discount: formatDiscount(deal.type, deal.value),
    seller: getString(seller?.store_name || seller?.business_name, 'Verified seller'),
    sellerSlug: getString(seller?.store_slug || seller?.slug),
    location: location || getString(deal.region_key, 'Myanmar'),
    regionKey: getString(deal.region_key, 'other'),
    minimumOrder: minOrder > 0 ? formatMMK(minOrder) : 'No minimum',
    minimumOrderValue: minOrder,
    expiresAt: formatDate(deal.expires_at),
    expiresAtRaw: getString(deal.expires_at),
  };
};

const mapCartItem = (item: UnknownRecord, index = 0): CartItem => {
  const selectedOptions = isRecord(item.selected_options) ? item.selected_options : {};
  const wholesaleTiers = Array.isArray(item.wholesale_tiers)
    ? item.wholesale_tiers.filter(isRecord)
    : [];
  const priceValue = getNumber(item.price);
  const sellingPriceValue = getNumber(item.selling_price, priceValue);
  const quantity = Math.max(getNumber(item.quantity, 1), 1);
  const subtotalValue = getNumber(item.subtotal, sellingPriceValue * quantity);
  const minOrder = Math.max(getNumber(item.min_order || item.moq, 1), 1);
  const quantityStep = Math.max(getNumber(item.quantity_step || minOrder, 1), 1);
  const productId = getString(item.product_id || item.id, `cart-product-${index}`);
  const seller = isRecord(item.seller) ? item.seller : undefined;

  return {
    id: getString(item.id, `cart-item-${index}`),
    productId,
    variantId: item.variant_id == null ? undefined : getString(item.variant_id),
    slug: getString(item.slug || item.product_slug || item.slug_en || productId, productId),
    name: getString(item.name || item.product_name, 'Cart item'),
    category: getString(item.category || item.category_name),
    seller: getString(item.seller_name || seller?.store_name || seller?.business_name),
    sellerSlug: getString(item.seller_slug || seller?.store_slug || seller?.slug),
    imageUrl: getNativeImageUrl(item.image || item.images),
    priceValue,
    sellingPriceValue,
    price: formatMMK(priceValue),
    sellingPrice: formatMMK(sellingPriceValue),
    subtotalValue,
    subtotal: formatMMK(subtotalValue),
    quantity,
    minOrder,
    quantityStep,
    quantityUnit: getString(item.quantity_unit || item.unit || item.min_order_unit, 'pcs'),
    stock: item.stock == null ? undefined : getNumber(item.stock),
    isAvailable: item.is_available !== false,
    isQuantityValid: item.is_quantity_valid !== false,
    selectedOptions: Object.entries(selectedOptions).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key] = getString(value);
        return acc;
      },
      {}
    ),
    wholesaleTiers: wholesaleTiers.map((tier) => ({
      minQty: getNumber(tier.min_qty || tier.minimum_quantity),
      discountPct: getNumber(tier.discount_pct || tier.discount_percentage),
      label: getString(tier.label),
    })),
  };
};

const mapCartSummary = (summary: UnknownRecord, subtotalValue: number): CartSummary => {
  const taxRate = getNumber(summary.tax_rate, 0.05);
  const taxValue = getNumber(summary.tax, Math.round(subtotalValue * taxRate * 100) / 100);
  const shippingFeeValue = getNumber(summary.shipping_fee);
  const totalValue = getNumber(summary.total, subtotalValue + taxValue + shippingFeeValue);

  return {
    subtotalValue,
    shippingFeeValue,
    taxRate,
    taxValue,
    totalValue,
    subtotal: formatMMK(subtotalValue),
    shippingFee: formatMMK(shippingFeeValue),
    tax: formatMMK(taxValue),
    total: formatMMK(totalValue),
  };
};

const mapCartResult = (payload: unknown): CartResult => {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const cartData = isRecord(data) ? data : {};
  const nestedCart = isRecord(cartData.cart) ? cartData.cart : {};
  const rowsSource = [cartData.cart_items, cartData.items, nestedCart.cart_items, nestedCart.items].find(
    Array.isArray,
  );
  const rows = Array.isArray(rowsSource) ? rowsSource.filter(isRecord) : [];
  const items = rows.map(mapCartItem);
  const subtotalValue = getNumber(
    cartData.subtotal,
    items.reduce((sum, item) => sum + item.subtotalValue, 0)
  );
  const totalItems = getNumber(
    cartData.total_items ?? nestedCart.total_items ?? cartData.totalItems ?? nestedCart.totalItems,
    items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const summarySource = isRecord(cartData.summary)
    ? cartData.summary
    : isRecord(nestedCart.summary)
      ? nestedCart.summary
      : {};
  const summary = mapCartSummary(summarySource, subtotalValue);

  return {
    items,
    subtotalValue,
    subtotal: formatMMK(subtotalValue),
    totalItems,
    summary,
  };
};

export async function fetchCart(signal?: AbortSignal): Promise<CartResult> {
  return withInFlightRequest('api:buyer-cart', async () => {
    const payload = await apiGet('/buyer/cart', signal);
    return mapCartResult(payload);
  });
}

export async function addProductToCart(
  productId: string | number,
  quantity: number,
  options: { variantId?: string | number | null; selectedOptions?: Record<string, string> | null } = {},
  signal?: AbortSignal
): Promise<{ message: string; totalItems: number; cart: CartResult }> {
  const payload = await apiPost(
    '/buyer/cart',
    {
      product_id: productId,
      quantity,
      variant_id: options.variantId ?? null,
      selected_options: options.selectedOptions ?? null,
    },
    signal
  );
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const cart = await fetchCart(signal);

  return {
    message: getString(
      isRecord(data) ? data.message : undefined,
      getString(isRecord(payload) ? payload.message : undefined, 'Added to cart')
    ),
    totalItems: cart.totalItems,
    cart,
  };
}

export async function updateCartItemQuantity(
  cartItemId: string | number,
  quantity: number,
  signal?: AbortSignal
): Promise<CartResult> {
  await apiPut(`/buyer/cart/${cartItemId}`, { quantity }, signal);
  return fetchCart(signal);
}

export async function removeCartItem(
  cartItemId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/buyer/cart/${cartItemId}`, signal);
}

export async function clearCartItems(signal?: AbortSignal): Promise<void> {
  await apiPost('/buyer/cart/clear', {}, signal);
}

export async function fetchCheckoutFees(
  address: Partial<CheckoutAddress>,
  signal?: AbortSignal
): Promise<CheckoutFees> {
  const params = new URLSearchParams();
  if (address.country) params.set('country', address.country);
  if (address.state) params.set('state', address.state);
  if (address.city) params.set('city', address.city);
  if (address.township) params.set('township', address.township);

  const payload = await apiGet(`/orders/checkout-fees?${params.toString()}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
  const sellers = Array.isArray(data.sellers) ? data.sellers.filter(isRecord) : [];

  return {
    shippingFeeValue: getNumber(data.shipping_fee, 5000),
    taxRate: getNumber(data.tax_rate, 0.05),
    sellers: sellers.map((seller) => {
      const shippingFeeValue = getNumber(seller.shipping_fee || seller.amount);
      return {
        sellerId: getString(seller.seller_id || seller.sellerId, 'seller'),
        sellerName: getString(seller.seller || seller.seller_name || seller.store_name, 'Seller'),
        shippingFeeValue,
        shippingFee: formatMMK(shippingFeeValue),
      };
    }),
  };
}

export async function fetchCheckoutLocations(signal?: AbortSignal): Promise<
  {
    state: string;
    cities: string[];
  }[]
> {
  return withDataCache(
    'api:checkout-locations',
    DATA_CACHE_TTL.checkoutStatic,
    async (requestSignal) => {
      const payload = await apiGet('/checkout-locations', requestSignal);
      const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
      const states = Array.isArray(data.states) ? data.states.filter(isRecord) : [];

      return states
        .map((state) => ({
          state: getString(state.state || state.name || state.label),
          cities: Array.isArray(state.cities)
            ? state.cities.map((city) => getString(city)).filter(Boolean)
            : [],
        }))
        .filter((state) => state.state);
    },
    signal,
  );
}

export async function fetchPaymentMethods(signal?: AbortSignal): Promise<string[]> {
  const fallback = ['cash_on_delivery', 'mmqr', 'kbz_pay', 'wave_pay', 'cb_pay', 'aya_pay'];

  return withDataCache(
    'api:payment-methods',
    DATA_CACHE_TTL.checkoutStatic,
    async (requestSignal) => {
      try {
        const payload = await apiGet('/payment-methods', requestSignal);
        const envelope = isRecord(payload) ? payload : {};
        const data = envelope.data;
        const methods = Array.isArray(data)
          ? data
          : isRecord(data) && Array.isArray(data.methods)
            ? data.methods
            : getArrayPayload(payload);

        const normalized = methods.map((item) => getString(item)).filter(Boolean);
        return normalized.length ? normalized : fallback;
      } catch {
        return fallback;
      }
    },
    signal,
  );
}

export async function fetchCheckoutProfile(signal?: AbortSignal): Promise<CheckoutProfile> {
  const payload = await apiGet('/auth/me', signal);
  const user = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const data = isRecord(user) ? user : {};

  return {
    name: getString(data.name),
    phone: getString(data.phone),
    address: getString(data.address),
    state: getString(data.state),
    city: getString(data.city),
    township: getString(data.township),
    postalCode: getString(data.postal_code || data.postalCode),
  };
}

export async function fetchCheckoutSellerPolicies(
  slugs: string[],
  signal?: AbortSignal
): Promise<CheckoutSellerPolicy[]> {
  const uniqueSlugs = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  if (!uniqueSlugs.length) return [];

  const policies: (CheckoutSellerPolicy | null)[] = await Promise.all(
    uniqueSlugs.map(async (slug) => {
      try {
        const payload = await apiGet(`/sellers/${encodeURIComponent(slug)}`, signal);
        const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
        const seller = isRecord(data) && isRecord(data.seller) ? data.seller : data;
        if (!isRecord(seller)) return null;
        const returnPolicy = getString(seller.return_policy || seller.returnPolicy);
        const shippingPolicy = getString(seller.shipping_policy || seller.shippingPolicy);
        if (!returnPolicy && !shippingPolicy) return null;

        return {
          sellerId: getString(seller.id || slug, slug),
          sellerName: getString(
            seller.store_name || seller.business_name || seller.name || seller.seller_name,
            'Seller'
          ),
          slug: getString(seller.store_slug || seller.slug || slug, slug),
          returnPolicy,
          shippingPolicy,
        };
      } catch {
        return null;
      }
    })
  );

  return policies.filter((policy): policy is CheckoutSellerPolicy => policy !== null);
}

export async function validateCheckoutCoupon(
  code: string,
  cart: CartResult,
  signal?: AbortSignal
): Promise<CheckoutCoupon> {
  const payload = await apiPost(
    '/buyer/coupons/validate',
    {
      code,
      items: cart.items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        quantity: item.quantity,
      })),
      subtotal: cart.subtotalValue,
    },
    signal
  );
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
  const coupon = isRecord(data.coupon) ? data.coupon : {};
  const discountAmountValue = getNumber(data.discount_amount);

  return {
    couponId: getString(coupon.id),
    code: getString(coupon.code || code, code),
    discountAmountValue,
    discountAmount: formatMMK(discountAmountValue),
    label: getString(coupon.code || code, code),
  };
}

export async function requestCheckoutOtp(
  cart: CartResult,
  address: CheckoutAddress,
  paymentMethod: string,
  signal?: AbortSignal
): Promise<{ emailHint: string; expiresIn: number }> {
  const payload = await apiPost(
    '/orders/request-otp',
    {
      items: cart.items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        quantity: item.quantity,
      })),
      shipping_address: address,
      payment_method: paymentMethod,
    },
    signal
  );

  const data = isRecord(payload) ? payload : {};

  return {
    emailHint: getString(data.email_hint),
    expiresIn: getNumber(data.expires_in, 600),
  };
}

export async function verifyCheckoutOtp(otp: string, signal?: AbortSignal): Promise<void> {
  await apiPost('/orders/verify-otp', { otp }, signal);
}

const mapCheckoutOrder = (order: UnknownRecord): CheckoutOrderResult => ({
  id: getString(order.id || order.order_id, 'order'),
  orderNumber: getString(order.order_number || order.number || order.id, 'order'),
  status: getString(order.status, 'pending'),
  paymentStatus: getString(order.payment_status, 'pending'),
  total: formatMMK(order.total_amount || order.total),
  totalValue: getNumber(order.total_amount || order.total),
  paymentMethod: getString(order.payment_method),
});

export async function createCheckoutOrder(
  payload: CreateOrderPayload,
  signal?: AbortSignal,
  idempotencyKey?: string
): Promise<CreateCheckoutOrderResult> {
  const headers = idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined;
  const response = await apiPost('/orders', payload, signal, headers);
  const envelope = isRecord(response) ? response : {};

  if (envelope.success === false) {
    throw new Error(getString(envelope.message, 'Order creation failed'));
  }

  const data = isRecord(envelope.data) ? envelope.data : envelope;
  const rawOrders = isRecord(data) && Array.isArray(data.orders)
    ? data.orders.filter(isRecord)
    : isRecord(data) && isRecord(data.order)
      ? [data.order]
      : isRecord(data)
        ? [data]
        : [];

  if (!rawOrders.length) throw new Error('Order creation failed');

  const orders = rawOrders.map((order) => mapCheckoutOrder(order));
  const primaryOrder = orders[0];

  return {
    orders,
    primaryOrder,
    totalOrders: getNumber(data.total_orders, orders.length),
  };
}

const resolvePaymentQrImageUrl = (value: unknown): string | undefined => {
  const raw = getString(value);
  if (!raw) return undefined;
  if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
  return getNativeImageUrl(raw);
};

const extractPaymentInitiationFields = (payload: unknown) => {
  const envelope = isRecord(payload) ? payload : {};
  const nested = isRecord(envelope.data) ? envelope.data : {};
  const session = isRecord(nested.session)
    ? nested.session
    : isRecord(envelope.session)
      ? envelope.session
      : isRecord(nested.payment_session)
        ? nested.payment_session
        : {};
  return { envelope, nested, source: { ...session, ...nested, ...envelope } };
};

export async function initiateOrderPayment(
  orderId: string | number,
  signal?: AbortSignal
): Promise<PaymentInitiationResult> {
  const payload = await apiPost('/payments/initiate', { order_id: orderId }, signal);
  const { envelope, nested, source } = extractPaymentInitiationFields(payload);
  const success = envelope.success !== false;

  return {
    success,
    message: getString(envelope.message || nested.message || source.message),
    qrImageUrl: resolvePaymentQrImageUrl(
      source.qr_image_url ||
        source.qrImageUrl ||
        source.qr_code_url ||
        source.qrCodeUrl ||
        nested.qr_image_url ||
        nested.qrImageUrl
    ),
    qrString: getString(
      source.qr_string ||
        source.qrString ||
        source.qr_payload ||
        source.qrPayload ||
        nested.qr_string ||
        nested.qrString
    ),
    deepLink: getString(
      source.deep_link || source.deepLink || nested.deep_link || nested.deepLink
    ),
    expiresAt: getString(
      source.expires_at || source.expiresAt || nested.expires_at || nested.expiresAt
    ),
    sandbox:
      source.sandbox === true ||
      source.sandbox === 1 ||
      nested.sandbox === true ||
      nested.sandbox === 1,
  };
}

export async function verifyOrderPayment(
  orderId: string | number,
  signal?: AbortSignal
): Promise<PaymentVerificationResult> {
  const payload = await apiPost('/payments/verify', { order_id: orderId }, signal);
  const envelope = isRecord(payload) ? payload : {};
  const nested = isRecord(envelope.data) ? envelope.data : {};
  const paymentStatus = getString(
    envelope.payment_status ||
      nested.payment_status ||
      envelope.status ||
      nested.status
  );

  return {
    paid:
      envelope.paid === true ||
      nested.paid === true ||
      paymentStatus === 'paid',
    status: getString(envelope.status || nested.status),
    paymentStatus,
    message: getString(envelope.message || nested.message),
  };
}

export async function updateOrderPaymentStatus(
  orderId: string | number,
  paymentStatus: string,
  paymentData?: unknown,
  signal?: AbortSignal
): Promise<void> {
  await apiPatch(
    `/orders/${encodeURIComponent(String(orderId))}/payment`,
    {
      payment_status: paymentStatus,
      payment_data: paymentData ?? null,
    },
    signal
  );
}

const mapTrackedOrderItem = (item: UnknownRecord, index = 0): TrackedOrderItem => {
  const product = isRecord(item.product) ? item.product : undefined;
  const productName = getString(item.product_name || product?.name_en || product?.name_mm, 'Order item');
  const priceValue = getNumber(item.price || item.unit_price);
  const quantity = getNumber(item.quantity, 1);
  const subtotalValue = getNumber(item.subtotal, priceValue * quantity);

  return {
    id: getString(item.id || item.product_id, `tracked-item-${index}`),
    productName,
    productSku: getString(item.product_sku || product?.sku),
    gtin: getString(item.gtin || item.product_gtin || product?.gtin),
    imageUrl: getNativeImageUrl(item.image || product?.image || product?.images),
    priceValue,
    price: formatMMK(priceValue),
    quantity,
    subtotalValue,
    subtotal: formatMMK(subtotalValue),
  };
};

const mapTrackedDelivery = (delivery: UnknownRecord): TrackedDelivery => {
  const updates = Array.isArray(delivery.updates) ? delivery.updates.filter(isRecord) : [];

  return {
    status: getString(delivery.status, 'pending'),
    trackingNumber: getString(delivery.tracking_number || delivery.trackingNumber),
    carrierName: getString(delivery.carrier_name || delivery.carrierName),
    method: getString(delivery.method),
    estimatedDeliveryDate: getString(
      delivery.estimated_delivery_date || delivery.estimatedDeliveryDate
    ),
    failureReason: getString(delivery.failure_reason || delivery.failureReason),
    updates: updates.map((update) => ({
      status: getString(update.status, 'pending'),
      location: getString(update.location),
      notes: getString(update.notes),
      createdAt: getString(update.created_at || update.createdAt),
    })),
  };
};

const mapTrackedOrder = (order: UnknownRecord): TrackedOrder => {
  const seller = isRecord(order.seller) ? order.seller : undefined;
  const parsedAddress = parseMaybeJson(order.shipping_address || order.shippingAddress);
  const address = isRecord(parsedAddress) ? parsedAddress : undefined;
  const delivery = isRecord(order.delivery) ? order.delivery : undefined;
  const items = Array.isArray(order.items) ? order.items.filter(isRecord) : [];
  const subtotalAmountValue = getNumber(order.subtotal_amount || order.subtotal);
  const shippingFeeValue = getNumber(order.shipping_fee);
  const taxAmountValue = getNumber(order.tax_amount);
  const couponDiscountAmountValue = getNumber(order.coupon_discount_amount);
  const totalAmountValue = getNumber(
    order.total_amount || order.total,
    subtotalAmountValue + shippingFeeValue + taxAmountValue - couponDiscountAmountValue
  );

  return {
    id: getString(order.id || order.order_number, 'tracked-order'),
    orderNumber: getString(order.order_number || order.number || order.id, 'Order'),
    status: getString(order.status, 'pending'),
    paymentStatus: getString(order.payment_status, 'unpaid'),
    paymentMethod: getString(order.payment_method),
    createdAt: getString(order.created_at || order.createdAt),
    estimatedDelivery: getString(order.estimated_delivery || order.estimatedDelivery),
    deliveredAt: getString(order.delivered_at || order.deliveredAt),
    subtotalAmountValue,
    shippingFeeValue,
    taxAmountValue,
    couponDiscountAmountValue,
    totalAmountValue,
    subtotalAmount: formatMMK(subtotalAmountValue),
    shippingFee: formatMMK(shippingFeeValue),
    taxAmount: formatMMK(taxAmountValue),
    couponDiscountAmount: formatMMK(couponDiscountAmountValue),
    totalAmount: formatMMK(totalAmountValue),
    seller: seller
      ? {
          name: getString(
            order.store_name || seller.store_name || seller.business_name || seller.name,
            'Seller'
          ),
          logoUrl: getNativeImageUrl(seller.store_logo || seller.logo),
        }
      : undefined,
    shippingAddress: address
      ? {
          name: getString(address.name || address.full_name),
          address: getString(address.address),
          city: getString(address.city),
          state: getString(address.state),
          phone: getString(address.phone),
        }
      : undefined,
    delivery: delivery ? mapTrackedDelivery(delivery) : undefined,
    items: items.map(mapTrackedOrderItem),
  };
};

const normalizeReceiptAddress = (value: unknown): PaymentReceiptAddress => {
  const parsed = parseMaybeJson(value);
  const address = isRecord(parsed) ? parsed : {};

  return {
    fullName: getString(address.full_name || address.name || address.customer_name),
    email: getString(address.email),
    phone: getString(address.phone || address.phone_number),
    address: getString(address.address || address.street_address || address.line1),
    township: getString(address.township),
    city: getString(address.city),
    state: getString(address.state || address.region),
    postalCode: getString(address.postal_code || address.zip || address.zip_code),
    country: getString(address.country, 'Myanmar'),
  };
};

const mapPaymentReceiptOrder = (order: UnknownRecord): PaymentReceiptOrder => {
  const data = isRecord(order.order) ? order.order : order;
  const user = isRecord(data.user) ? data.user : undefined;
  const delivery = isRecord(data.delivery) ? data.delivery : undefined;
  const items = Array.isArray(data.items) ? data.items.filter(isRecord) : [];
  const shippingAddress = normalizeReceiptAddress(data.shipping_address || data.shippingAddress);
  const subtotalAmountValue = getNumber(data.subtotal_amount || data.subtotal);
  const shippingFeeValue = getNumber(data.shipping_fee);
  const taxAmountValue = getNumber(data.tax_amount);
  const totalAmountValue = getNumber(
    data.total_amount || data.total,
    subtotalAmountValue + shippingFeeValue + taxAmountValue
  );

  return {
    id: getString(data.id || data.order_id || data.order_number, 'order'),
    orderNumber: getString(data.order_number || data.number || data.id, 'Order'),
    status: getString(data.status, 'confirmed'),
    paymentStatus: getString(data.payment_status, 'pending'),
    paymentMethod: getString(data.payment_method, 'cash_on_delivery'),
    paymentReference: getString(
      data.transaction_id || data.payment_reference || data.reference_id || data.payment_intent_id
    ),
    createdAt: getString(data.created_at || data.createdAt),
    paymentDate: getString(
      data.payment_confirmed_at || data.paid_at || data.updated_at || data.created_at
    ),
    estimatedDelivery: getString(
      data.estimated_delivery ||
        data.estimatedDelivery ||
        delivery?.estimated_delivery_date ||
        delivery?.estimatedDeliveryDate
    ),
    subtotalAmountValue,
    shippingFeeValue,
    taxAmountValue,
    taxRate: getNumber(data.tax_rate, subtotalAmountValue > 0 ? taxAmountValue / subtotalAmountValue : 0),
    totalAmountValue,
    subtotalAmount: formatMMK(subtotalAmountValue),
    shippingFee: formatMMK(shippingFeeValue),
    taxAmount: formatMMK(taxAmountValue),
    totalAmount: formatMMK(totalAmountValue),
    customer: {
      name: getString(user?.name || data.customer_name || shippingAddress.fullName),
      email: getString(user?.email || data.customer_email || shippingAddress.email),
      phone: getString(user?.phone || data.customer_phone || shippingAddress.phone),
    },
    shippingAddress,
    items: items.map(mapTrackedOrderItem),
  };
};

export async function trackOrder(
  orderNumber: string,
  email?: string,
  signal?: AbortSignal
): Promise<TrackedOrder> {
  const trimmed = orderNumber.trim().toUpperCase();
  const params = new URLSearchParams();
  if (email?.trim()) params.set('email', email.trim());

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await apiGet(`/track/${encodeURIComponent(trimmed)}${suffix}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(data)) throw new Error('Order not found');

  return mapTrackedOrder(data);
}

export async function fetchPaymentReceipt(
  orderId: string | number,
  signal?: AbortSignal
): Promise<PaymentReceiptOrder> {
  const payload = await apiGet(`/orders/${encodeURIComponent(String(orderId))}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(data)) throw new Error('Order not found');

  return mapPaymentReceiptOrder(data);
}

export async function unsubscribeNewsletter(
  token: string,
  signal?: AbortSignal
): Promise<NewsletterActionResult> {
  const payload = await apiGet(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, signal);
  const data = isRecord(payload) ? payload : {};

  return {
    success: data.success === true,
    message: getString(data.message),
  };
}

export async function confirmNewsletterSubscription(
  token: string,
  signal?: AbortSignal
): Promise<NewsletterActionResult> {
  const payload = await apiGet(`/newsletter/confirm?token=${encodeURIComponent(token)}`, signal);
  const data = isRecord(payload) ? payload : {};

  return {
    success: data.success === true,
    message: getString(data.message),
  };
}

export async function subscribeNewsletter(
  email: string,
  source = 'footer',
  name?: string,
  signal?: AbortSignal
): Promise<NewsletterActionResult> {
  const payload = await apiPost('/newsletter/subscribe', {
    email,
    source,
    name: name || undefined,
  }, signal);
  const data = isRecord(payload) ? payload : {};

  return {
    success: data.success !== false,
    message: getString(data.message),
  };
}

export async function fetchWishlist(signal?: AbortSignal): Promise<HomeProduct[]> {
  const payload = await apiGet('/wishlist', signal);
  return getArrayPayload(payload)
    .filter(isRecord)
    .map((product, index) => ({ ...mapHomeProduct(product, index), isNew: false }));
}

export async function checkWishlistItem(
  productId: string | number,
  signal?: AbortSignal
): Promise<boolean> {
  const payload = await apiGet(
    `/wishlist/check/${encodeURIComponent(String(productId))}`,
    signal
  );
  const data = isRecord(payload) ? payload : {};
  const nested = isRecord(data.data) ? data.data : {};
  return nested.is_in_wishlist === true || nested.is_in_wishlist === 1;
}

export async function fetchWishlistCount(signal?: AbortSignal): Promise<number> {
  const payload = await apiGet('/wishlist/count', signal);
  const data = isRecord(payload) ? payload : {};
  const nested = isRecord(data.data) ? data.data : {};
  return getNumber(nested.count);
}

export async function addWishlistItem(
  productId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiPost('/wishlist', { product_id: productId }, signal);
}

export async function removeWishlistItem(
  productId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/wishlist/${encodeURIComponent(String(productId))}`, signal);
}

const mapBuyerProfile = (profile: UnknownRecord): BuyerProfile => ({
  id: getString(profile.id, 'buyer'),
  name: getString(profile.name, 'Buyer'),
  email: getString(profile.email),
  phone: getString(profile.phone),
  address: getString(profile.address),
  city: getString(profile.city),
  state: getString(profile.state),
  township: getString(profile.township),
  country: getString(profile.country, 'Myanmar'),
  postalCode: getString(profile.postal_code || profile.postalCode),
  emailVerifiedAt: getString(profile.email_verified_at || profile.emailVerifiedAt),
  createdAt: getString(profile.created_at || profile.createdAt),
  notificationPreferences: isRecord(profile.notification_preferences)
    ? profile.notification_preferences
    : {},
});

export async function fetchBuyerProfile(signal?: AbortSignal): Promise<BuyerProfile> {
  const payload = await apiGet('/auth/me', signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(data)) throw new Error('Buyer profile not found');

  return mapBuyerProfile(data);
}

export async function updateBuyerProfile(
  profile: BuyerProfilePayload,
  signal?: AbortSignal
): Promise<BuyerProfile> {
  const payload = await apiPut('/users/profile', profile, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(data)) throw new Error('Profile update failed');

  return mapBuyerProfile(data);
}

export async function updateBuyerPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(
    '/users/profile/password',
    {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: confirmPassword,
    },
    signal
  );
}

export async function resendBuyerVerificationEmail(signal?: AbortSignal): Promise<void> {
  await apiPost('/email/resend', {}, signal);
}

export type EmailVerificationResult = {
  emailVerifiedAt: string;
  message: string;
};

const extractEmailVerificationResult = (payload: unknown): EmailVerificationResult => {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;

  return {
    emailVerifiedAt: getString(data.email_verified_at || data.emailVerifiedAt),
    message: getString(root.message),
  };
};

export async function verifyEmailWithCode(
  code: string,
  signal?: AbortSignal
): Promise<EmailVerificationResult> {
  const payload = await apiPost('/email/verify-code', { code: code.trim() }, signal);
  return extractEmailVerificationResult(payload);
}

export async function verifyEmailWithLink(
  id: string,
  hash: string,
  expires: string,
  signature: string,
  signal?: AbortSignal
): Promise<EmailVerificationResult> {
  const query = new URLSearchParams({ expires, signature }).toString();
  const payload = await apiGet(
    `/email/verify/${encodeURIComponent(id)}/${encodeURIComponent(hash)}?${query}`,
    signal
  );
  return extractEmailVerificationResult(payload);
}

export async function fetchBuyerOrders(signal?: AbortSignal): Promise<TrackedOrder[]> {
  const payload = await apiGet('/orders', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapTrackedOrder);
}

export async function cancelBuyerOrder(
  orderId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(`/orders/${encodeURIComponent(String(orderId))}/cancel`, {}, signal);
}

export async function confirmBuyerOrderDelivery(
  orderId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(`/orders/${encodeURIComponent(String(orderId))}/confirm-delivery`, {}, signal);
}

export type SellerOrderAddress = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  township: string;
  city: string;
  state: string;
  country: string;
};

export type SellerOrderItem = {
  id: string | number;
  productName: string;
  productSku: string;
  imageUrl?: string;
  quantity: number;
  priceValue: number;
  price: string;
  subtotalValue: number;
  subtotal: string;
};

export type SellerOrderDelivery = {
  id: string | number;
  status: string;
  deliveryMethod: string;
  trackingNumber: string;
  platformDeliveryFeeValue: number;
  platformDeliveryFee: string;
  pickupAddress: string;
  packageWeight: number;
  assignedDriverPhone: string;
  courierName: string;
};

export type SellerDeliveryUpdate = {
  id: string | number;
  status: string;
  notes: string;
  location: string;
  createdAt: string;
};

export type SellerDeliveryOrder = {
  id: string | number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  packageWeight: number;
};

export type SellerDelivery = {
  id: string | number;
  orderId: string | number;
  order: SellerDeliveryOrder;
  status: string;
  deliveryMethod: string;
  trackingNumber: string;
  platformDeliveryFeeValue: number;
  platformDeliveryFee: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageWeight: number;
  courierName: string;
  driverPhone: string;
  proofImageUrl?: string;
  recipientName: string;
  recipientPhone: string;
  createdAt: string;
  feeSubmittedAt: string;
  feeConfirmedAt: string;
  feeSubmissionNote: string;
  feeConfirmationNote: string;
  updates: SellerDeliveryUpdate[];
};

export type SellerManagedOrder = {
  id: string | number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  subtotalAmountValue: number;
  shippingFeeValue: number;
  taxAmountValue: number;
  couponDiscountAmountValue: number;
  totalAmountValue: number;
  subtotalAmount: string;
  shippingFee: string;
  taxAmount: string;
  couponDiscountAmount: string;
  totalAmount: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: SellerOrderAddress;
  items: SellerOrderItem[];
  delivery?: SellerOrderDelivery;
};

const normalizeSellerOrderAddress = (value: unknown): SellerOrderAddress => {
  const parsed = parseMaybeJson(value);
  const address = isRecord(parsed) ? parsed : {};

  return {
    fullName: getString(address.full_name || address.name || address.customer_name),
    email: getString(address.email),
    phone: getString(address.phone || address.phone_number),
    address: getString(address.address || address.street_address || address.line1),
    township: getString(address.township),
    city: getString(address.city),
    state: getString(address.state || address.region),
    country: getString(address.country, 'Myanmar'),
  };
};

const mapSellerOrderItem = (item: UnknownRecord, index = 0): SellerOrderItem => {
  const product = isRecord(item.product) ? item.product : undefined;
  const productName = getString(item.product_name || product?.name_en || product?.name_mm, 'Product');
  const priceValue = getNumber(item.price || item.unit_price);
  const quantity = getNumber(item.quantity, 1);
  const subtotalValue = getNumber(item.subtotal, priceValue * quantity);

  return {
    id: getString(item.id || item.product_id, `seller-order-item-${index}`),
    productName,
    productSku: getString(item.product_sku || item.sku || product?.sku),
    imageUrl: getNativeImageUrl(item.image || product?.image || product?.images),
    quantity,
    priceValue,
    price: formatMMK(priceValue),
    subtotalValue,
    subtotal: formatMMK(subtotalValue),
  };
};

const mapSellerOrderDelivery = (delivery: UnknownRecord): SellerOrderDelivery => {
  const courier = isRecord(delivery.platformCourier) ? delivery.platformCourier : isRecord(delivery.platform_courier) ? delivery.platform_courier : {};
  const feeValue = getNumber(delivery.platform_delivery_fee || delivery.delivery_fee);

  return {
    id: getString(delivery.id || delivery.delivery_id, 'delivery'),
    status: getString(delivery.status, 'pending'),
    deliveryMethod: getString(delivery.delivery_method || delivery.method),
    trackingNumber: getString(delivery.tracking_number || delivery.trackingNumber),
    platformDeliveryFeeValue: feeValue,
    platformDeliveryFee: formatMMK(feeValue),
    pickupAddress: getString(delivery.pickup_address || delivery.pickupAddress),
    packageWeight: getNumber(delivery.package_weight || delivery.weight, 5),
    assignedDriverPhone: getString(delivery.assigned_driver_phone || delivery.driver_phone),
    courierName: getString(courier.name || delivery.courier_name),
  };
};

const normalizeShippingAddress = (value: unknown): SellerOrderAddress => normalizeSellerOrderAddress(value);

const mapSellerDeliveryOrder = (value: unknown, delivery: UnknownRecord): SellerDeliveryOrder => {
  const order = isRecord(value) ? value : {};
  const address = normalizeShippingAddress(order.shipping_address || order.shippingAddress);
  const fullName = getString(order.customer_name || address.fullName);
  const addressLine = [
    address.fullName,
    address.phone,
    address.address,
    address.township,
    address.city,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    id: getString(order.id || delivery.order_id || delivery.orderId),
    orderNumber: getString(order.order_number || order.orderNumber || delivery.order_number, 'N/A'),
    customerName: fullName || 'N/A',
    customerPhone: getString(order.customer_phone || address.phone),
    deliveryAddress: getString(delivery.delivery_address) || addressLine,
    packageWeight: getNumber(delivery.package_weight || delivery.weight, 5),
  };
};

const mapSellerDeliveryUpdate = (update: UnknownRecord): SellerDeliveryUpdate => ({
  id: getString(update.id),
  status: getString(update.status, 'pending'),
  notes: getString(update.notes),
  location: getString(update.location),
  createdAt: getString(update.created_at || update.createdAt),
});

const mapSellerDelivery = (delivery: UnknownRecord): SellerDelivery => {
  const order = mapSellerDeliveryOrder(delivery.order, delivery);
  const courier = isRecord(delivery.platformCourier) ? delivery.platformCourier : isRecord(delivery.platform_courier) ? delivery.platform_courier : {};
  const feeValue = getNumber(delivery.platform_delivery_fee || delivery.delivery_fee);
  const updatesSource = Array.isArray(delivery.delivery_updates)
    ? delivery.delivery_updates
    : Array.isArray(delivery.deliveryUpdates)
      ? delivery.deliveryUpdates
      : [];

  return {
    id: getString(delivery.id),
    orderId: getString(delivery.order_id || delivery.orderId || order.id),
    order,
    status: getString(delivery.status, 'pending'),
    deliveryMethod: getString(delivery.delivery_method || delivery.method),
    trackingNumber: getString(delivery.tracking_number || delivery.trackingNumber),
    platformDeliveryFeeValue: feeValue,
    platformDeliveryFee: formatMMK(feeValue),
    pickupAddress: getString(delivery.pickup_address || delivery.pickupAddress),
    deliveryAddress: getString(delivery.delivery_address || order.deliveryAddress),
    packageWeight: getNumber(delivery.package_weight || delivery.weight || order.packageWeight, 5),
    courierName: getString(courier.name || delivery.courier_name || delivery.assigned_driver_name),
    driverPhone: getString(delivery.assigned_driver_phone || delivery.driver_phone),
    proofImageUrl: getNativeImageUrl(delivery.delivery_proof_image || delivery.proof_image),
    recipientName: getString(delivery.recipient_name),
    recipientPhone: getString(delivery.recipient_phone),
    createdAt: getString(delivery.created_at || delivery.createdAt),
    feeSubmittedAt: getString(delivery.fee_submitted_at || delivery.feeSubmittedAt),
    feeConfirmedAt: getString(delivery.fee_confirmed_at || delivery.feeConfirmedAt),
    feeSubmissionNote: getString(delivery.fee_submission_note || delivery.feeSubmissionNote),
    feeConfirmationNote: getString(delivery.fee_confirmation_note || delivery.feeConfirmationNote),
    updates: updatesSource.filter(isRecord).map(mapSellerDeliveryUpdate),
  };
};

const mapSellerManagedOrder = (order: UnknownRecord): SellerManagedOrder => {
  const user = isRecord(order.user) ? order.user : undefined;
  const shippingAddress = normalizeSellerOrderAddress(order.shipping_address || order.shippingAddress);
  const items = Array.isArray(order.items) ? order.items.filter(isRecord) : [];
  const delivery = isRecord(order.delivery) ? order.delivery : undefined;
  const subtotalAmountValue = getNumber(order.subtotal_amount || order.subtotal);
  const shippingFeeValue = getNumber(order.shipping_fee);
  const taxAmountValue = getNumber(order.tax_amount);
  const couponDiscountAmountValue = getNumber(order.coupon_discount_amount);
  const totalAmountValue = getNumber(
    order.total_amount || order.total,
    subtotalAmountValue + shippingFeeValue + taxAmountValue - couponDiscountAmountValue
  );

  return {
    id: getString(order.id || order.order_number, 'order'),
    orderNumber: getString(order.order_number || order.number || order.id, 'Order'),
    status: getString(order.status, 'pending'),
    paymentStatus: getString(order.payment_status, 'pending'),
    paymentMethod: getString(order.payment_method),
    createdAt: getString(order.created_at || order.createdAt),
    subtotalAmountValue,
    shippingFeeValue,
    taxAmountValue,
    couponDiscountAmountValue,
    totalAmountValue,
    subtotalAmount: formatMMK(subtotalAmountValue),
    shippingFee: formatMMK(shippingFeeValue),
    taxAmount: formatMMK(taxAmountValue),
    couponDiscountAmount: formatMMK(couponDiscountAmountValue),
    totalAmount: formatMMK(totalAmountValue),
    customerName: getString(user?.name || order.customer_name || shippingAddress.fullName, 'N/A'),
    customerEmail: getString(user?.email || order.customer_email || shippingAddress.email),
    customerPhone: getString(user?.phone || order.customer_phone || shippingAddress.phone),
    shippingAddress,
    items: items.map(mapSellerOrderItem),
    delivery: delivery ? mapSellerOrderDelivery(delivery) : undefined,
  };
};

export async function fetchSellerOrders(signal?: AbortSignal): Promise<SellerManagedOrder[]> {
  const payload = await apiGet('/orders', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerManagedOrder);
}

export type AdminManagedOrder = SellerManagedOrder & {
  buyerName: string;
  commissionAmountValue: number;
  commissionAmount: string;
  sellerPayoutValue: number;
  sellerPayout: string;
  escrowStatus: string;
  transactionId: string;
  paymentReference: string;
};

const mapAdminManagedOrder = (order: UnknownRecord): AdminManagedOrder => {
  const base = mapSellerManagedOrder(order);
  const buyer = isRecord(order.buyer) ? order.buyer : undefined;
  const commissionAmountValue = getNumber(order.commission_amount);
  const sellerPayoutValue = Math.max(0, base.subtotalAmountValue - commissionAmountValue);

  return {
    ...base,
    buyerName: getString(buyer?.name || order.buyer_name, base.customerName),
    commissionAmountValue,
    commissionAmount: formatMMK(commissionAmountValue),
    sellerPayoutValue,
    sellerPayout: formatMMK(sellerPayoutValue),
    escrowStatus: getString(order.escrow_status, 'not_applicable'),
    transactionId: getString(order.transaction_id),
    paymentReference: getString(order.payment_reference),
  };
};

const ADMIN_ORDER_STATUS_RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
};

const adminShipPayload = () => ({
  tracking_number: `ADM-${Date.now()}`,
  shipping_carrier: 'Admin',
});

async function advanceAdminOrderStatus(
  orderId: string | number,
  fromStatus: string,
  toStatus: string,
  signal?: AbortSignal
): Promise<void> {
  const id = encodeURIComponent(String(orderId));

  if (fromStatus === toStatus) return;

  if (toStatus === 'cancelled') {
    await apiPost(`/orders/${id}/cancel`, {}, signal);
    return;
  }

  if (fromStatus === 'cancelled') {
    throw new Error('Cannot change a cancelled order.');
  }

  const fromRank = ADMIN_ORDER_STATUS_RANK[fromStatus] ?? 0;
  const toRank = ADMIN_ORDER_STATUS_RANK[toStatus] ?? 0;
  if (toRank < fromRank) {
    throw new Error('Moving to an earlier stage is not supported here.');
  }

  let current = fromStatus;
  let guard = 0;

  while (current !== toStatus && guard++ < 10) {
    if (current === 'pending') {
      await apiPost(`/orders/${id}/confirm`, {}, signal);
      current = 'confirmed';
      continue;
    }

    if (current === 'confirmed') {
      if (toStatus === 'processing') {
        await apiPost(`/orders/${id}/process`, {}, signal);
        current = 'processing';
        continue;
      }
      if (toStatus === 'shipped' || toStatus === 'delivered') {
        await apiPost(`/orders/${id}/ship`, adminShipPayload(), signal);
        current = 'shipped';
        continue;
      }
    }

    if (current === 'processing' && (toStatus === 'shipped' || toStatus === 'delivered')) {
      await apiPost(`/orders/${id}/ship`, adminShipPayload(), signal);
      current = 'shipped';
      continue;
    }

    if (current === 'shipped' && toStatus === 'delivered') {
      await apiPost(`/orders/${id}/confirm-delivery`, {}, signal);
      current = 'delivered';
      continue;
    }

    throw new Error(`Cannot advance order from "${current}" to "${toStatus}".`);
  }
}

export async function fetchAdminOrders(signal?: AbortSignal): Promise<AdminManagedOrder[]> {
  const payload = await apiGet('/orders', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapAdminManagedOrder);
}

export async function fetchAdminOrder(
  orderId: string | number,
  signal?: AbortSignal
): Promise<AdminManagedOrder> {
  const payload = await apiGet(`/orders/${encodeURIComponent(String(orderId))}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data)) throw new Error('Order not found');
  return mapAdminManagedOrder(data);
}

export async function updateAdminOrderStatus(
  orderId: string | number,
  fromStatus: string,
  toStatus: string,
  signal?: AbortSignal
): Promise<AdminManagedOrder> {
  await advanceAdminOrderStatus(orderId, fromStatus, toStatus, signal);
  return fetchAdminOrder(orderId, signal);
}

export type AdminManagedProduct = SellerManagedProduct & {
  approvalStatus: string;
  sellerName: string;
  isFeatured: boolean;
  moq: number;
  createdAt: string;
};

export type AdminProductFilters = {
  search?: string;
  approvalStatus?: 'all' | 'approved' | 'pending' | 'rejected';
  activeStatus?: 'all' | 'active' | 'inactive';
  categoryId?: string | number;
};

const mapAdminManagedProduct = (product: UnknownRecord): AdminManagedProduct => {
  const base = mapSellerManagedProduct(product);
  const seller = isRecord(product.seller) ? product.seller : undefined;

  return {
    ...base,
    approvalStatus: getString(product.approval_status || product.status, 'pending'),
    sellerName: getString(seller?.name || seller?.store_name || product.seller_name),
    isFeatured: Boolean(product.is_featured),
    moq: getNumber(product.moq || product.min_order, 1),
    createdAt: getString(product.created_at || product.createdAt),
  };
};

export async function fetchAdminProducts(
  filters: AdminProductFilters = {},
  signal?: AbortSignal
): Promise<AdminManagedProduct[]> {
  const params = new URLSearchParams();
  params.set('per_page', '100');
  params.set('include', 'category,seller');
  if (filters.search) params.set('search', filters.search);
  if (filters.approvalStatus && filters.approvalStatus !== 'all') {
    params.set('status', filters.approvalStatus);
  }
  if (filters.activeStatus === 'active') params.set('is_active', '1');
  if (filters.activeStatus === 'inactive') params.set('is_active', '0');
  if (filters.categoryId && filters.categoryId !== 'all') {
    params.set('category_id', String(filters.categoryId));
  }

  const payload = await apiGet(`/admin/products?${params.toString()}`, signal);
  return getArrayPayload(payload).filter(isRecord).map(mapAdminManagedProduct);
}

export async function updateAdminProductActive(
  productId: string | number,
  isActive: boolean,
  signal?: AbortSignal
): Promise<void> {
  await apiPatch(
    `/admin/products/${encodeURIComponent(String(productId))}/toggle-status`,
    { is_active: isActive },
    signal
  );
}

export async function approveAdminProduct(
  productId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(`/admin/products/${encodeURIComponent(String(productId))}/approve`, {}, signal);
}

export async function rejectAdminProduct(
  productId: string | number,
  reason = '',
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/admin/products/${encodeURIComponent(String(productId))}/reject`,
    reason ? { reason } : {},
    signal
  );
}

export async function deleteAdminProduct(
  productId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/admin/products/${encodeURIComponent(String(productId))}`, signal);
}

export async function fetchAdminProductForEdit(
  productId: string | number,
  signal?: AbortSignal
): Promise<SellerProductFormResult> {
  const payload = await apiGet(`/admin/products/${encodeURIComponent(String(productId))}/edit`, signal);
  return mapSellerProductForm(extractRecordPayload(payload));
}

export async function updateAdminProduct(
  productId: string | number,
  body: unknown,
  signal?: AbortSignal
): Promise<SellerProductFormResult> {
  const payload = await apiPut(`/admin/products/${encodeURIComponent(String(productId))}`, body, signal);
  return mapSellerProductForm(extractRecordPayload(payload));
}

export async function uploadAdminProductImage(
  formData: FormData,
  productId: string | number,
  signal?: AbortSignal
): Promise<SellerProductImage | null> {
  const payload = await apiPostForm(
    `/admin/products/${encodeURIComponent(String(productId))}/upload-image`,
    formData,
    signal
  );
  const data = extractRecordPayload(payload);
  return isRecord(data) ? mapSellerProductImage(data) : null;
}

export type AdminManagedUser = {
  id: string | number;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  profilePhoto?: string;
  createdAt: string;
};

export type AdminUserFilters = {
  search?: string;
  role?: 'all' | 'admin' | 'seller' | 'buyer';
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  perPage?: number;
};

export type AdminUsersPagination = {
  currentPage: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
};

export type AdminUsersResult = {
  users: AdminManagedUser[];
  pagination: AdminUsersPagination;
};

const deriveAdminUserRole = (user: UnknownRecord): string => {
  const type = getString(user.type);
  if (type) return type;

  const roles = user.roles;
  if (Array.isArray(roles) && roles.length > 0) {
    const first = roles[0];
    if (typeof first === 'string') return first;
    if (isRecord(first)) return getString(first.name);
  }

  return 'buyer';
};

const resolveUserProfilePhoto = (user: UnknownRecord): string | undefined => {
  const profile = isRecord(user.profile) ? user.profile : undefined;
  const candidates = [
    user.profile_photo,
    user.profilePhoto,
    user.profile_photo_url,
    user.profilePhotoUrl,
    user.profile_image,
    user.profileImage,
    user.avatar,
    user.avatar_url,
    user.avatarUrl,
    user.photo,
    user.image,
    profile?.profile_photo,
    profile?.profilePhoto,
    profile?.profile_image,
    profile?.avatar,
    profile?.photo,
  ];

  for (const candidate of candidates) {
    const url = getNativeImageUrl(candidate);
    if (url) return url;
  }

  return undefined;
};

const mapAdminManagedUser = (user: UnknownRecord): AdminManagedUser => ({
  id: getString(user.id),
  userId: getString(user.user_id || user.id),
  name: getString(user.name, 'Unknown user'),
  email: getString(user.email),
  phone: getString(user.phone),
  role: deriveAdminUserRole(user),
  isActive: user.is_active !== false,
  profilePhoto: resolveUserProfilePhoto(user),
  createdAt: getString(user.created_at || user.createdAt),
});

const extractAdminUsersMeta = (payload: unknown, fallbackPage: number): UnknownRecord => {
  if (!isRecord(payload)) return {};
  if (isRecord(payload.meta)) return payload.meta;
  if (isRecord(payload.data) && isRecord(payload.data.meta)) return payload.data.meta;
  return {};
};

export async function fetchAdminUsers(
  filters: AdminUserFilters = {},
  signal?: AbortSignal
): Promise<AdminUsersResult> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('per_page', String(filters.perPage ?? 15));
  if (filters.search) params.set('search', filters.search);
  if (filters.role && filters.role !== 'all') params.set('role', filters.role);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);

  const payload = await apiGet(`/users?${params.toString()}`, signal);
  const users = getArrayPayload(payload).filter(isRecord).map(mapAdminManagedUser);
  const meta = extractAdminUsersMeta(payload, filters.page ?? 1);

  return {
    users,
    pagination: {
      currentPage: getNumber(meta.current_page, filters.page ?? 1),
      lastPage: getNumber(meta.last_page, 1),
      total: getNumber(meta.total, users.length),
      from: getNumber(meta.from, users.length ? 1 : 0),
      to: getNumber(meta.to, users.length),
    },
  };
}

export async function updateAdminUserActive(
  userId: string | number,
  isActive: boolean,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(`/users/${encodeURIComponent(String(userId))}`, { is_active: isActive }, signal);
}

export async function assignAdminUserRole(
  userId: string | number,
  role: 'admin' | 'seller' | 'buyer',
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/users/${encodeURIComponent(String(userId))}/assign-roles`,
    { roles: [role] },
    signal
  );
}

export async function deleteAdminUser(userId: string | number, signal?: AbortSignal): Promise<void> {
  await apiDelete(`/users/${encodeURIComponent(String(userId))}`, signal);
}

export type AdminSellerStatus =
  | 'setup_pending'
  | 'pending'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'suspended'
  | 'closed';

export type AdminManagedSeller = {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  contactEmail: string;
  contactPhone: string;
  businessType: string;
  status: AdminSellerStatus | string;
  rating: number;
  productsCount: number;
  createdAt: string;
};

export type AdminSellerFilters = {
  search?: string;
  status?: 'all' | AdminSellerStatus;
  page?: number;
  perPage?: number;
};

export type AdminSellersPagination = {
  currentPage: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
};

export type AdminSellersResult = {
  sellers: AdminManagedSeller[];
  pagination: AdminSellersPagination;
};

const mapAdminManagedSeller = (seller: UnknownRecord): AdminManagedSeller => ({
  id: getString(seller.id),
  storeId: getString(seller.store_id),
  storeName: getString(seller.store_name),
  storeSlug: getString(seller.store_slug || seller.slug),
  contactEmail: getString(seller.contact_email || seller.email),
  contactPhone: getString(seller.contact_phone || seller.phone),
  businessType: getString(seller.business_type),
  status: getString(seller.status, 'pending'),
  rating: getNumber(seller.reviews_avg_rating, 0),
  productsCount: getNumber(seller.products_count, 0),
  createdAt: getString(seller.created_at || seller.createdAt),
});

const extractAdminSellersMeta = (payload: unknown, fallbackPage: number): UnknownRecord => {
  if (!isRecord(payload)) return {};
  if (isRecord(payload.data) && isRecord(payload.data.meta)) return payload.data.meta;
  if (isRecord(payload.meta)) return payload.meta;
  if (isRecord(payload.data)) {
    const data = payload.data;
    if ('current_page' in data || 'total' in data) return data;
  }
  return {};
};

export async function fetchAdminSellers(
  filters: AdminSellerFilters = {},
  signal?: AbortSignal
): Promise<AdminSellersResult> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('per_page', String(filters.perPage ?? 15));
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);

  const payload = await apiGet(`/admin/sellers?${params.toString()}`, signal);
  const nested = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const rows = isRecord(nested) && Array.isArray(nested.data) ? nested.data : getArrayPayload(payload);
  const sellers = rows.filter(isRecord).map(mapAdminManagedSeller);
  const meta = extractAdminSellersMeta(payload, filters.page ?? 1);

  return {
    sellers,
    pagination: {
      currentPage: getNumber(meta.current_page, filters.page ?? 1),
      lastPage: getNumber(meta.last_page, 1),
      total: getNumber(meta.total, sellers.length),
      from: getNumber(meta.from, sellers.length ? 1 : 0),
      to: getNumber(meta.to, sellers.length),
    },
  };
}

export async function updateAdminSellerStatus(
  sellerId: string | number,
  newStatus: AdminSellerStatus | string,
  reason = '',
  signal?: AbortSignal
): Promise<void> {
  const payload: UnknownRecord = {};
  if (reason.trim()) {
    payload.reason = reason.trim();
    payload.notes = reason.trim();
  }

  if (newStatus === 'approved') {
    await apiPut(`/admin/seller/${encodeURIComponent(String(sellerId))}/approve`, payload, signal);
    return;
  }
  if (newStatus === 'suspended') {
    await apiPost(`/admin/seller/${encodeURIComponent(String(sellerId))}/suspend`, payload, signal);
    return;
  }
  if (newStatus === 'active') {
    await apiPost(`/admin/seller/${encodeURIComponent(String(sellerId))}/reactivate`, payload, signal);
    return;
  }

  await apiPut(
    `/admin/seller/${encodeURIComponent(String(sellerId))}/status`,
    { ...payload, status: newStatus },
    signal
  );
}

export type AdminVerificationSellerUser = {
  name: string;
  email: string;
};

export type AdminVerificationDocument = {
  url: string;
  label: string;
};

export type AdminVerificationSeller = {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeLogo: string;
  contactEmail: string;
  contactPhone: string;
  businessType: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: string;
  verificationStatus: string;
  documentStatus: string;
  documentsSubmitted: boolean;
  documentsSubmittedAt: string;
  documentRejectionReason: string;
  rejectionReason: string;
  nrcDivision: string;
  nrcTownshipCode: string;
  nrcTownshipMm: string;
  nrcType: string;
  nrcNumber: string;
  nrcFull: string;
  nrcFullMm: string;
  nrcVerificationStatus: string;
  nrcVerifiedAt: string;
  nrcVerificationNotes: string;
  identityDocumentFront: string;
  identityDocumentBack: string;
  businessRegistrationDocument: string;
  taxRegistrationDocument: string;
  businessCertificate: string;
  additionalDocuments: { name: string; url: string; path?: string }[];
  documents: Record<string, AdminVerificationDocument>;
  user?: AdminVerificationSellerUser;
};

export type AdminVerificationReviewFilters = {
  page?: number;
  perPage?: number;
  search?: string;
  documentStatus?: string;
};

export type AdminVerifiedSellerSummary = {
  total: number;
  basic: number;
  verified: number;
  premium: number;
  nrcVerified: number;
};

export type AdminVerifiedSeller = {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  contactEmail: string;
  contactPhone: string;
  businessType: string;
  businessRegistrationNumber: string;
  taxId: string;
  address: string;
  city: string;
  state: string;
  country: string;
  verificationLevel: string;
  badgeType: string;
  nrcFull: string;
  nrcVerificationStatus: string;
  verifiedAt: string;
  verifiedBy: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  memberSince: string;
  storeLogoUrl: string;
  identityDocumentFrontUrl: string;
  identityDocumentBackUrl: string;
  businessRegistrationDocumentUrl: string;
  taxRegistrationDocumentUrl: string;
  businessCertificateUrl: string;
  certificateUrl: string;
  additionalDocuments: { name: string; url: string }[];
};

export type AdminVerifiedSellerFilters = {
  page?: number;
  perPage?: number;
  search?: string;
  verificationLevel?: string;
  badgeType?: string;
  nrcStatus?: string;
  sortBy?: 'verified_at' | 'store_name' | 'contact_email' | 'verification_level';
  sortDir?: 'asc' | 'desc';
};

export type AdminVerifiedSellersResult = {
  sellers: AdminVerifiedSeller[];
  summary: AdminVerifiedSellerSummary;
  pagination: AdminSellersPagination;
};

const mapAdminVerificationSeller = (seller: UnknownRecord): AdminVerificationSeller => {
  const user = isRecord(seller.user) ? seller.user : undefined;
  const documentsRaw = isRecord(seller.documents) ? seller.documents : {};
  const documents: Record<string, AdminVerificationDocument> = {};

  Object.entries(documentsRaw).forEach(([key, value]) => {
    if (!isRecord(value)) return;
    documents[key] = {
      url: getString(value.url),
      label: getString(value.label, key.replace(/_/g, ' ')),
    };
  });

  const additionalRaw = Array.isArray(seller.additional_documents) ? seller.additional_documents : [];
  const additionalDocuments = additionalRaw
    .filter(isRecord)
    .map((doc, index) => ({
      name: getString(doc.name, `Additional ${index + 1}`),
      url: getString(doc.url || docUrlFromPath(doc.path)),
      path: getString(doc.path),
    }));

  return {
    id: getString(seller.id),
    storeId: getString(seller.store_id),
    storeName: getString(seller.store_name),
    storeSlug: getString(seller.store_slug),
    storeLogo: getString(seller.store_logo),
    contactEmail: getString(seller.contact_email),
    contactPhone: getString(seller.contact_phone),
    businessType: getString(seller.business_type || seller.business_type_name),
    address: getString(seller.address),
    city: getString(seller.city),
    state: getString(seller.state),
    country: getString(seller.country),
    status: getString(seller.status),
    verificationStatus: getString(seller.verification_status),
    documentStatus: getString(seller.document_status),
    documentsSubmitted: Boolean(seller.documents_submitted),
    documentsSubmittedAt: getString(seller.documents_submitted_at),
    documentRejectionReason: getString(seller.document_rejection_reason),
    rejectionReason: getString(seller.rejection_reason || seller.document_rejection_reason),
    nrcDivision: getString(seller.nrc_division),
    nrcTownshipCode: getString(seller.nrc_township_code),
    nrcTownshipMm: getString(seller.nrc_township_mm),
    nrcType: getString(seller.nrc_type),
    nrcNumber: getString(seller.nrc_number),
    nrcFull: getString(seller.nrc_full),
    nrcFullMm: getString(seller.nrc_full_mm),
    nrcVerificationStatus: getString(seller.nrc_verification_status, 'unverified'),
    nrcVerifiedAt: getString(seller.nrc_verified_at),
    nrcVerificationNotes: getString(seller.nrc_verification_notes),
    identityDocumentFront: getString(seller.identity_document_front),
    identityDocumentBack: getString(seller.identity_document_back),
    businessRegistrationDocument: getString(seller.business_registration_document),
    taxRegistrationDocument: getString(seller.tax_registration_document),
    businessCertificate: getString(seller.business_certificate),
    additionalDocuments,
    documents,
    user: user
      ? {
          name: getString(user.name),
          email: getString(user.email),
        }
      : undefined,
  };
};

const docUrlFromPath = (path: unknown) => {
  const value = getString(path);
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `${IMAGE_BASE_URL}/${value.replace(/^\/?storage\/?/, '')}`;
};

const mapAdminVerifiedSeller = (seller: UnknownRecord): AdminVerifiedSeller => ({
  id: getString(seller.id),
  storeId: getString(seller.store_id),
  storeName: getString(seller.store_name),
  storeSlug: getString(seller.store_slug),
  contactEmail: getString(seller.contact_email),
  contactPhone: getString(seller.contact_phone),
  businessType: getString(seller.business_type),
  businessRegistrationNumber: getString(seller.business_registration_number),
  taxId: getString(seller.tax_id),
  address: getString(seller.address),
  city: getString(seller.city),
  state: getString(seller.state),
  country: getString(seller.country),
  verificationLevel: getString(seller.verification_level),
  badgeType: getString(seller.badge_type),
  nrcFull: getString(seller.nrc_full),
  nrcVerificationStatus: getString(seller.nrc_verification_status),
  verifiedAt: getString(seller.verified_at),
  verifiedBy: getString(seller.verified_by),
  status: getString(seller.status),
  ownerName: getString(seller.owner_name),
  ownerEmail: getString(seller.owner_email),
  ownerPhone: getString(seller.owner_phone),
  memberSince: getString(seller.member_since),
  storeLogoUrl: getString(seller.store_logo_url),
  identityDocumentFrontUrl: getString(seller.identity_document_front_url),
  identityDocumentBackUrl: getString(seller.identity_document_back_url),
  businessRegistrationDocumentUrl: getString(seller.business_registration_document_url),
  taxRegistrationDocumentUrl: getString(seller.tax_registration_document_url),
  businessCertificateUrl: getString(seller.business_certificate_url),
  certificateUrl: getString(seller.certificate_url),
  additionalDocuments: (Array.isArray(seller.additional_documents) ? seller.additional_documents : [])
    .filter(isRecord)
    .map((doc, index) => ({
      name: getString(doc.name, `Additional ${index + 1}`),
      url: getString(doc.url),
    })),
});

export async function fetchAdminVerificationReview(
  filters: AdminVerificationReviewFilters = {},
  signal?: AbortSignal
): Promise<{ sellers: AdminVerificationSeller[]; pagination: AdminSellersPagination }> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('per_page', String(filters.perPage ?? 15));
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.documentStatus?.trim()) params.set('status', filters.documentStatus.trim());

  const payload = await apiGet(`/admin/seller/verification-review?${params.toString()}`, signal);
  const nested = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const rows = isRecord(nested) && Array.isArray(nested.data) ? nested.data : getArrayPayload(payload);
  const meta = extractAdminSellersMeta(payload, filters.page ?? 1);

  return {
    sellers: rows.filter(isRecord).map(mapAdminVerificationSeller),
    pagination: {
      currentPage: getNumber(meta.current_page, filters.page ?? 1),
      lastPage: getNumber(meta.last_page, 1),
      total: getNumber(meta.total, rows.length),
      from: getNumber(meta.from, rows.length ? 1 : 0),
      to: getNumber(meta.to, rows.length),
    },
  };
}

export async function verifyAdminSeller(
  sellerId: string | number,
  payload: { verificationLevel: string; badgeType?: string; notes?: string },
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/admin/seller/${encodeURIComponent(String(sellerId))}/verify`,
    {
      verification_level: payload.verificationLevel,
      badge_type: payload.badgeType ?? 'verified',
      notes: payload.notes,
    },
    signal
  );
}

export async function rejectAdminSellerVerification(
  sellerId: string | number,
  reason: string,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/admin/seller/${encodeURIComponent(String(sellerId))}/reject`,
    { reason },
    signal
  );
}

export async function verifyAdminSellerNrc(
  sellerId: string | number,
  payload: {
    nrcVerificationStatus: string;
    nrcVerificationNotes?: string;
    status?: string;
  },
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/admin/seller/${encodeURIComponent(String(sellerId))}/verify-nrc`,
    {
      nrc_verification_status: payload.nrcVerificationStatus,
      nrc_verification_notes: payload.nrcVerificationNotes ?? null,
      ...(payload.status ? { status: payload.status } : {}),
    },
    signal
  );
}

export async function setAdminSellerQuickStatus(
  sellerId: string | number,
  status: AdminSellerStatus | string,
  reason = '',
  signal?: AbortSignal
): Promise<void> {
  await apiPatch(
    `/admin/seller/${encodeURIComponent(String(sellerId))}/set-status`,
    { status, reason: reason.trim() || null },
    signal
  );
}

export async function fetchAdminVerifiedSellers(
  filters: AdminVerifiedSellerFilters = {},
  signal?: AbortSignal
): Promise<AdminVerifiedSellersResult> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('per_page', String(filters.perPage ?? 20));
  params.set('sort_by', filters.sortBy ?? 'verified_at');
  params.set('sort_dir', filters.sortDir ?? 'desc');
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.verificationLevel) params.set('verification_level', filters.verificationLevel);
  if (filters.badgeType) params.set('badge_type', filters.badgeType);
  if (filters.nrcStatus) params.set('nrc_status', filters.nrcStatus);

  const payload = await apiGet(`/admin/seller/verified-list?${params.toString()}`, signal);
  const nested = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const rows = isRecord(nested) && Array.isArray(nested.data) ? nested.data : getArrayPayload(payload);
  const summaryRaw = isRecord(payload) && isRecord(payload.summary) ? payload.summary : {};
  const meta = isRecord(payload) && isRecord(payload.meta) ? payload.meta : extractAdminSellersMeta(payload, filters.page ?? 1);

  return {
    sellers: rows.filter(isRecord).map(mapAdminVerifiedSeller),
    summary: {
      total: getNumber(summaryRaw.total, 0),
      basic: getNumber(summaryRaw.basic, 0),
      verified: getNumber(summaryRaw.verified, 0),
      premium: getNumber(summaryRaw.premium, 0),
      nrcVerified: getNumber(summaryRaw.nrc_verified, 0),
    },
    pagination: {
      currentPage: getNumber(meta.current_page, filters.page ?? 1),
      lastPage: getNumber(meta.last_page, 1),
      total: getNumber(meta.total, rows.length),
      from: getNumber(meta.from, rows.length ? 1 : 0),
      to: getNumber(meta.to, rows.length),
    },
  };
}

export async function fetchAdminVerifiedSellersExportCsv(
  filters: Omit<AdminVerifiedSellerFilters, 'page' | 'perPage'> = {},
  signal?: AbortSignal
): Promise<string> {
  const params = new URLSearchParams();
  params.set('sort_by', filters.sortBy ?? 'verified_at');
  params.set('sort_dir', filters.sortDir ?? 'desc');
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.verificationLevel) params.set('verification_level', filters.verificationLevel);
  if (filters.badgeType) params.set('badge_type', filters.badgeType);
  if (filters.nrcStatus) params.set('nrc_status', filters.nrcStatus);

  const response = await fetchWithTimeout(`/admin/seller/verified-list/export?${params.toString()}`, {
    headers: buildHeaders(),
    signal,
  });

  if (!response.ok) {
    throw new ApiError(`Export failed (${response.status})`, response.status);
  }

  return response.text();
}

export function resolveAdminSellerDocumentUrl(
  seller: AdminVerificationSeller,
  field: keyof AdminVerificationSeller | string
): string | undefined {
  const key = String(field);
  const fromDocuments = seller.documents[key]?.url;
  if (fromDocuments) return fromDocuments;
  const raw = seller[key as keyof AdminVerificationSeller];
  return getNativeImageUrl(raw);
}

export type AdminPlatformDelivery = SellerDelivery & {
  supplierName: string;
  platformCourierId: string | number | null;
  assignedDriverName: string;
  assignedVehicleType: string;
  assignedVehicleNumber: string;
  buyerName: string;
  buyerPhone: string;
};

export type AdminCourierCandidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

export type AdminPlatformDeliveriesResult = {
  deliveries: AdminPlatformDelivery[];
  pagination: AdminSellersPagination;
};

const mapAdminPlatformDelivery = (delivery: UnknownRecord): AdminPlatformDelivery => {
  const base = mapSellerDelivery(delivery);
  const supplier = isRecord(delivery.supplier) ? delivery.supplier : undefined;
  const order = isRecord(delivery.order) ? delivery.order : {};
  const shipping = normalizeSellerOrderAddress(order.shipping_address || order.shippingAddress);
  const courierId = delivery.platform_courier_id ?? delivery.platformCourierId;

  return {
    ...base,
    supplierName: getString(supplier?.name || supplier?.store_name),
    platformCourierId:
      courierId === null || courierId === undefined || courierId === '' ? null : getString(courierId),
    assignedDriverName: getString(delivery.assigned_driver_name || base.courierName),
    assignedVehicleType: getString(delivery.assigned_vehicle_type),
    assignedVehicleNumber: getString(delivery.assigned_vehicle_number),
    buyerName: getString(shipping.fullName || order.customer_name),
    buyerPhone: getString(shipping.phone || order.customer_phone),
  };
};

const extractDeliveriesMeta = (payload: unknown, fallbackPage: number): UnknownRecord => {
  if (!isRecord(payload)) return {};
  if (isRecord(payload.data) && isRecord(payload.data.meta)) return payload.data.meta;
  if (isRecord(payload.meta)) return payload.meta;
  if (isRecord(payload.data) && ('current_page' in payload.data || 'total' in payload.data)) {
    return payload.data;
  }
  return {};
};

export async function fetchAdminPlatformDeliveries(
  page = 1,
  perPage = 15,
  signal?: AbortSignal
): Promise<AdminPlatformDeliveriesResult> {
  const params = new URLSearchParams();
  params.set('delivery_method', 'platform');
  params.set('per_page', String(perPage));
  params.set('page', String(page));

  const payload = await apiGet(`/deliveries?${params.toString()}`, signal);
  const nested = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const rows = isRecord(nested) && Array.isArray(nested.data) ? nested.data : getArrayPayload(payload);
  const deliveries = rows.filter(isRecord).map(mapAdminPlatformDelivery);
  const meta = extractDeliveriesMeta(payload, page);

  return {
    deliveries,
    pagination: {
      currentPage: getNumber(meta.current_page, page),
      lastPage: getNumber(meta.last_page, 1),
      total: getNumber(meta.total, deliveries.length),
      from: getNumber(meta.from, deliveries.length ? 1 : 0),
      to: getNumber(meta.to, deliveries.length),
    },
  };
}

export async function fetchAdminCourierCandidates(signal?: AbortSignal): Promise<AdminCourierCandidate[]> {
  const [sellers, admins] = await Promise.all([
    fetchAdminUsers({ role: 'seller', perPage: 100 }, signal),
    fetchAdminUsers({ role: 'admin', perPage: 100 }, signal),
  ]);

  const seen = new Set<string>();
  return [...sellers.users, ...admins.users]
    .filter((user) => {
      const id = String(user.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((user) => ({
      id: String(user.id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    }));
}

export async function assignAdminDeliveryCourier(
  deliveryId: string | number,
  form: {
    platform_courier_id?: number;
    driver_name: string;
    driver_phone?: string;
    vehicle_type?: string;
    vehicle_number?: string;
  },
  signal?: AbortSignal
): Promise<void> {
  const payload: UnknownRecord = {
    driver_name: form.driver_name || null,
    driver_phone: form.driver_phone || null,
    vehicle_type: form.vehicle_type || null,
    vehicle_number: form.vehicle_number || null,
  };
  if (form.platform_courier_id) payload.platform_courier_id = form.platform_courier_id;

  await apiPost(`/deliveries/${encodeURIComponent(String(deliveryId))}/assign-courier`, payload, signal);
}

export async function updateAdminDeliveryStatus(
  deliveryId: string | number,
  status: string,
  notes = '',
  signal?: AbortSignal
): Promise<void> {
  await apiPost(`/deliveries/${encodeURIComponent(String(deliveryId))}/status`, { status, notes }, signal);
}

export type AdminDeliveryFeeSummary = {
  outstandingCount: number;
  outstandingAmount: number;
  collectedCount: number;
  collectedAmount: number;
};

export type AdminDeliveryFee = {
  id: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  supplierName: string;
  supplierEmail: string;
  status: string;
  platformDeliveryFeeValue: number;
  platformDeliveryFee: string;
  deliveryFeeStatus: string;
  deliveryFeeCollectedAt: string;
  deliveryFeeCollectionRef: string;
  feeSubmittedAt: string;
};

export type AdminDeliveryFeesResult = {
  deliveries: AdminDeliveryFee[];
  summary: AdminDeliveryFeeSummary;
};

const mapAdminDeliveryFee = (delivery: UnknownRecord): AdminDeliveryFee => {
  const base = mapAdminPlatformDelivery(delivery);
  const supplier = isRecord(delivery.supplier) ? delivery.supplier : undefined;

  return {
    id: getString(base.id),
    orderId: getString(base.orderId),
    orderNumber: base.order.orderNumber,
    createdAt: base.createdAt,
    supplierName: base.supplierName,
    supplierEmail: getString(supplier?.email),
    status: base.status,
    platformDeliveryFeeValue: base.platformDeliveryFeeValue,
    platformDeliveryFee: base.platformDeliveryFee,
    deliveryFeeStatus: getString(delivery.delivery_fee_status, 'not_applicable'),
    deliveryFeeCollectedAt: getString(delivery.delivery_fee_collected_at),
    deliveryFeeCollectionRef: getString(delivery.delivery_fee_collection_ref),
    feeSubmittedAt: getString(delivery.fee_submitted_at),
  };
};

export async function fetchAdminDeliveryFees(
  feeStatus = '',
  signal?: AbortSignal
): Promise<AdminDeliveryFeesResult> {
  const query = feeStatus ? `?fee_status=${encodeURIComponent(feeStatus)}` : '';
  const payload = await apiGet(`/admin/delivery-fees${query}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(data)) {
    return {
      deliveries: [],
      summary: {
        outstandingCount: 0,
        outstandingAmount: 0,
        collectedCount: 0,
        collectedAmount: 0,
      },
    };
  }

  const deliveriesSource = isRecord(data.deliveries) && Array.isArray(data.deliveries.data)
    ? data.deliveries.data
    : Array.isArray(data.deliveries)
      ? data.deliveries
      : getArrayPayload(data);
  const summaryRaw = isRecord(data.summary) ? data.summary : {};

  return {
    deliveries: deliveriesSource.filter(isRecord).map(mapAdminDeliveryFee),
    summary: {
      outstandingCount: getNumber(summaryRaw.outstanding_count),
      outstandingAmount: getNumber(summaryRaw.outstanding_amount),
      collectedCount: getNumber(summaryRaw.collected_count),
      collectedAmount: getNumber(summaryRaw.collected_amount),
    },
  };
}

export async function collectAdminDeliveryFee(
  deliveryId: string | number,
  form: { collection_ref: string; admin_notes?: string },
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/admin/deliveries/${encodeURIComponent(String(deliveryId))}/collect-fee`,
    {
      collection_ref: form.collection_ref,
      admin_notes: form.admin_notes || undefined,
    },
    signal
  );
}

export async function adjustAdminDeliveryFee(
  deliveryId: string | number,
  form: { platform_delivery_fee: number; adjustment_note?: string },
  signal?: AbortSignal
): Promise<void> {
  await apiPatch(
    `/admin/deliveries/${encodeURIComponent(String(deliveryId))}/platform-fee`,
    {
      platform_delivery_fee: form.platform_delivery_fee,
      adjustment_note: form.adjustment_note || undefined,
    },
    signal
  );
}

export type AdminPendingDeliveryFee = {
  id: string;
  orderId: string;
  orderNumber: string;
  sellerName: string;
  platformDeliveryFeeValue: number;
  platformDeliveryFee: string;
  feeSubmittedAt: string;
  feeSubmissionNote: string;
};

const mapAdminPendingDeliveryFee = (delivery: UnknownRecord, index = 0): AdminPendingDeliveryFee => {
  const order = isRecord(delivery.order) ? delivery.order : undefined;
  const supplier = isRecord(delivery.supplier) ? delivery.supplier : undefined;
  const feeValue = getNumber(delivery.platform_delivery_fee);

  return {
    id: getString(delivery.id, `pending-delivery-fee-${index}`),
    orderId: getString(delivery.order_id || order?.id),
    orderNumber: getString(order?.order_number, getString(delivery.order_id, '—')),
    sellerName: getString(supplier?.name, '—'),
    platformDeliveryFeeValue: feeValue,
    platformDeliveryFee: formatMMK(feeValue),
    feeSubmittedAt: getString(delivery.fee_submitted_at),
    feeSubmissionNote: getString(delivery.fee_submission_note),
  };
};

export async function fetchAdminPendingDeliveryFees(
  signal?: AbortSignal
): Promise<AdminPendingDeliveryFee[]> {
  const payload = await apiGet('/admin/delivery-fees/pending', signal);
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : getArrayPayload(payload);
  return data.filter(isRecord).map(mapAdminPendingDeliveryFee);
}

export async function confirmAdminDeliveryFee(
  deliveryId: string | number,
  note = 'Confirmed by admin.',
  signal?: AbortSignal
): Promise<void> {
  await apiPatch(
    `/admin/deliveries/${encodeURIComponent(String(deliveryId))}/confirm-fee`,
    { note: note || 'Confirmed by admin.' },
    signal
  );
}

export type AdminPaymentMethod = {
  method: string;
  label: string;
  enabled: boolean;
};

const mapAdminPaymentMethod = (item: UnknownRecord): AdminPaymentMethod => ({
  method: getString(item.method),
  label: getString(item.label, getString(item.method)),
  enabled: Boolean(item.enabled),
});

export async function fetchAdminPaymentSettings(signal?: AbortSignal): Promise<AdminPaymentMethod[]> {
  const payload = await apiGet('/admin/payment-settings', signal);
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : getArrayPayload(payload);
  return data.filter(isRecord).map(mapAdminPaymentMethod);
}

export async function updateAdminPaymentMethod(
  method: string,
  enabled: boolean,
  signal?: AbortSignal
): Promise<AdminPaymentMethod> {
  const payload = await apiPatch(
    `/admin/payment-settings/${encodeURIComponent(method)}`,
    { enabled },
    signal
  );
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data)) throw new Error('Failed to update payment method');
  return mapAdminPaymentMethod(data);
}

export type AdminContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  readAt: string;
  createdAt: string;
};

export type AdminContactMessageFilter = 'all' | 'read' | 'unread';

export type AdminContactMessageFilters = {
  page?: number;
  perPage?: number;
  search?: string;
  filter?: AdminContactMessageFilter;
};

export type AdminContactMessagesPagination = {
  currentPage: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
};

export type AdminContactMessagesResult = {
  messages: AdminContactMessage[];
  pagination: AdminContactMessagesPagination;
};

const mapAdminContactMessage = (row: UnknownRecord, index = 0): AdminContactMessage => ({
  id: getString(row.id, `contact-message-${index}`),
  name: getString(row.name),
  email: getString(row.email),
  phone: getString(row.phone),
  subject: getString(row.subject),
  message: getString(row.message),
  readAt: getString(row.read_at || row.readAt),
  createdAt: getString(row.created_at || row.createdAt),
});

export async function fetchAdminContactMessages(
  filters: AdminContactMessageFilters = {},
  signal?: AbortSignal
): Promise<AdminContactMessagesResult> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('per_page', String(filters.perPage ?? 15));
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.filter && filters.filter !== 'all') params.set('filter', filters.filter);

  const payload = await apiGet(`/admin/contact-messages?${params.toString()}`, signal);
  const nested = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const rows = isRecord(nested) && Array.isArray(nested.data) ? nested.data : getArrayPayload(payload);
  const messages = rows.filter(isRecord).map(mapAdminContactMessage);
  const meta = extractAdminSellersMeta(payload, filters.page ?? 1);

  return {
    messages,
    pagination: {
      currentPage: getNumber(meta.current_page, filters.page ?? 1),
      lastPage: getNumber(meta.last_page, 1),
      total: getNumber(meta.total, messages.length),
      from: getNumber(meta.from, messages.length ? 1 : 0),
      to: getNumber(meta.to, messages.length),
    },
  };
}

export async function markAdminContactMessageRead(
  messageId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(`/admin/contact-messages/${encodeURIComponent(String(messageId))}/read`, {}, signal);
}

export async function deleteAdminContactMessage(
  messageId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/admin/contact-messages/${encodeURIComponent(String(messageId))}`, signal);
}

export async function fetchSellerOrder(
  orderId: string | number,
  signal?: AbortSignal
): Promise<SellerManagedOrder> {
  const payload = await apiGet(`/orders/${encodeURIComponent(String(orderId))}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data)) throw new Error('Order not found');
  return mapSellerManagedOrder(data);
}

export async function updateSellerOrderStatus(
  orderId: string | number,
  status: 'confirmed' | 'processing' | 'shipped',
  signal?: AbortSignal
): Promise<SellerManagedOrder | null> {
  const endpoints = { confirmed: 'confirm', processing: 'process', shipped: 'ship' };
  const body =
    status === 'shipped'
      ? { tracking_number: `TRK-${Date.now()}`, shipping_carrier: 'Self Delivery' }
      : {};
  await apiPost(`/orders/${encodeURIComponent(String(orderId))}/${endpoints[status]}`, body, signal);

  try {
    return await fetchSellerOrder(orderId, signal);
  } catch {
    return null;
  }
}

export async function setSellerOrderDeliveryMethod(
  orderId: string | number,
  method: 'supplier' | 'platform',
  pickupAddress?: string,
  packageWeight = 5,
  signal?: AbortSignal
): Promise<SellerManagedOrder | null> {
  const platformDeliveryFee = method === 'platform' ? 5000 + packageWeight * 100 : 0;
  await apiPost(
    `/seller/delivery/${encodeURIComponent(String(orderId))}/delivery-method`,
    {
      delivery_method: method,
      platform_delivery_fee: platformDeliveryFee,
      pickup_address: pickupAddress || undefined,
    },
    signal
  );

  try {
    return await fetchSellerOrder(orderId, signal);
  } catch {
    return null;
  }
}

export async function fetchSellerDeliveries(signal?: AbortSignal): Promise<SellerDelivery[]> {
  const payload = await apiGet('/deliveries', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerDelivery);
}

export async function updateSellerDeliveryStatus(
  deliveryId: string | number,
  status: string,
  notes = '',
  location = '',
  signal?: AbortSignal
): Promise<SellerDelivery | null> {
  const payload = await apiPost(`/deliveries/${encodeURIComponent(String(deliveryId))}/status`, {
    status,
    notes,
    location,
  }, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return isRecord(data) ? mapSellerDelivery(data) : null;
}

export async function uploadSellerDeliveryProof(
  deliveryId: string | number,
  proofFile: Blob | NativeUploadFile,
  recipientName: string,
  recipientPhone: string,
  signal?: AbortSignal
): Promise<SellerDelivery | null> {
  const form = new FormData();
  if (isRecord(proofFile) && typeof proofFile.uri === 'string') {
    appendNativeFile(form, 'delivery_proof', proofFile);
  } else {
    form.append('delivery_proof', proofFile as Blob);
  }
  form.append('recipient_name', recipientName);
  form.append('recipient_phone', recipientPhone);
  const payload = await apiPostForm(`/deliveries/${encodeURIComponent(String(deliveryId))}/proof`, form, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return isRecord(data) ? mapSellerDelivery(data) : null;
}

export async function submitSellerDeliveryFee(
  deliveryId: string | number,
  note = '',
  signal?: AbortSignal
): Promise<SellerDelivery | null> {
  const payload = await apiPatch(
    `/deliveries/${encodeURIComponent(String(deliveryId))}/submit-fee`,
    { note: note.trim() || undefined },
    signal
  );
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return isRecord(data) ? mapSellerDelivery(data) : null;
}

export type SellerRfqBuyer = {
  id: string | number;
  name: string;
  email: string;
  phone: string;
};

export type SellerRfqQuote = {
  id: string | number;
  sellerId: string | number;
  sellerName: string;
  unitPriceValue: number;
  totalPriceValue: number;
  unitPrice: string;
  totalPrice: string;
  currency: string;
  deliveryDays: number;
  validityDays: number;
  notes: string;
  status: string;
  createdAt: string;
};

export type SellerRfqOrderLink = {
  id: string | number;
  orderNumber: string;
  status: string;
};

export type SellerRfq = {
  id: string | number;
  rfqNumber: string;
  productName: string;
  category: string;
  categoryId: string | number | null;
  quantity: number;
  unit: string;
  budgetMinValue: number;
  budgetMaxValue: number;
  budgetMin: string;
  budgetMax: string;
  currency: string;
  deadline: string;
  status: string;
  specifications: string;
  notes: string;
  createdAt: string;
  quotesCount: number;
  buyer?: SellerRfqBuyer;
  myQuote?: SellerRfqQuote;
  quotes: SellerRfqQuote[];
  order?: SellerRfqOrderLink;
};

export type RfqCreatePayload = {
  product_name: string;
  category_id: string | number;
  category?: string;
  quantity: number;
  unit: string;
  specifications?: string;
  budget_min?: number;
  budget_max?: number;
  currency?: string;
  deadline: string;
  notes?: string;
  broadcast?: boolean;
  seller_ids?: Array<string | number>;
};

export type RfqQuotePayload = {
  unit_price: number;
  total_price?: number;
  currency?: string;
  delivery_days: number;
  validity_days?: number;
  notes?: string;
};

const unwrapRecordPayload = (payload: unknown): UnknownRecord => {
  if (isRecord(payload) && isRecord(payload.data)) return payload.data;
  return isRecord(payload) ? payload : {};
};

const mapSellerRfqBuyer = (value: unknown): SellerRfqBuyer | undefined => {
  if (!isRecord(value)) return undefined;
  return {
    id: getString(value.id),
    name: getString(value.name || value.full_name || value.company_name, 'Buyer'),
    email: getString(value.email),
    phone: getString(value.phone || value.phone_number),
  };
};

const mapSellerRfqQuote = (quote: UnknownRecord): SellerRfqQuote => {
  const unitPriceValue = getNumber(quote.unit_price || quote.unitPrice);
  const totalPriceValue = getNumber(quote.total_price || quote.totalPrice);
  const seller = isRecord(quote.seller) ? quote.seller : undefined;
  const profile = isRecord(seller?.seller_profile)
    ? seller.seller_profile
    : isRecord(seller?.sellerProfile)
      ? seller.sellerProfile
      : undefined;

  return {
    id: getString(quote.id),
    sellerId: getString(quote.seller_id || quote.sellerId),
    sellerName: getString(profile?.store_name || seller?.store_name || seller?.name, 'Seller'),
    unitPriceValue,
    totalPriceValue,
    unitPrice: formatMMK(unitPriceValue),
    totalPrice: formatMMK(totalPriceValue),
    currency: getString(quote.currency, 'MMK'),
    deliveryDays: getNumber(quote.delivery_days || quote.deliveryDays),
    validityDays: getNumber(quote.validity_days || quote.validityDays),
    notes: getString(quote.notes),
    status: getString(quote.status, 'pending'),
    createdAt: getString(quote.created_at || quote.createdAt),
  };
};

const mapSellerRfq = (rfq: UnknownRecord): SellerRfq => {
  const budgetMinValue = getNumber(rfq.budget_min || rfq.budgetMin);
  const budgetMaxValue = getNumber(rfq.budget_max || rfq.budgetMax);
  const quotes = Array.isArray(rfq.quotes) ? rfq.quotes.filter(isRecord).map(mapSellerRfqQuote) : [];
  const myQuote = isRecord(rfq.my_quote || rfq.myQuote)
    ? mapSellerRfqQuote((rfq.my_quote || rfq.myQuote) as UnknownRecord)
    : undefined;
  const orderRecord = isRecord(rfq.order) ? rfq.order : undefined;

  return {
    id: getString(rfq.id),
    rfqNumber: getString(rfq.rfq_number || rfq.rfqNumber, `RFQ-${getString(rfq.id, 'N/A')}`),
    productName: getString(rfq.product_name || rfq.productName, 'Product request'),
    category: getString(rfq.category),
    categoryId: getString(rfq.category_id || rfq.categoryId) || null,
    quantity: getNumber(rfq.quantity, 1),
    unit: getString(rfq.unit, 'pcs'),
    budgetMinValue,
    budgetMaxValue,
    budgetMin: budgetMinValue > 0 ? formatMMK(budgetMinValue) : '',
    budgetMax: budgetMaxValue > 0 ? formatMMK(budgetMaxValue) : '',
    currency: getString(rfq.currency, 'MMK'),
    deadline: getString(rfq.deadline),
    status: getString(rfq.status, 'open'),
    specifications: getString(rfq.specifications),
    notes: getString(rfq.notes),
    createdAt: getString(rfq.created_at || rfq.createdAt),
    quotesCount: getNumber(rfq.quotes_count || rfq.quotesCount, quotes.length),
    buyer: mapSellerRfqBuyer(rfq.buyer),
    myQuote,
    quotes,
    order: orderRecord
      ? {
          id: getString(orderRecord.id),
          orderNumber: getString(orderRecord.order_number || orderRecord.orderNumber),
          status: getString(orderRecord.status),
        }
      : undefined,
  };
};

export async function createRfq(payload: RfqCreatePayload, signal?: AbortSignal): Promise<SellerRfq> {
  const response = await apiPost('/rfq', payload, signal);
  const data = unwrapRecordPayload(response);
  if (!Object.keys(data).length) throw new Error('RFQ creation failed');
  return mapSellerRfq(data);
}

export async function fetchSellerReceivedRfqs(signal?: AbortSignal): Promise<SellerRfq[]> {
  const payload = await apiGet('/rfq/received', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerRfq);
}

export async function fetchSentRfqs(signal?: AbortSignal): Promise<SellerRfq[]> {
  const payload = await apiGet('/rfq/sent', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerRfq);
}

export async function fetchSellerRfqDetail(
  rfqId: string | number,
  signal?: AbortSignal
): Promise<SellerRfq> {
  const payload = await apiGet(`/rfq/${encodeURIComponent(String(rfqId))}`, signal);
  const data = unwrapRecordPayload(payload);
  if (!Object.keys(data).length) throw new Error('RFQ not found');
  return mapSellerRfq(data);
}

export async function submitSellerRfqQuote(
  rfqId: string | number,
  body: RfqQuotePayload,
  signal?: AbortSignal
): Promise<SellerRfq | null> {
  await apiPost(`/rfq/${encodeURIComponent(String(rfqId))}/quotes`, body, signal);

  try {
    return await fetchSellerRfqDetail(rfqId, signal);
  } catch {
    return null;
  }
}

export async function cancelRfq(rfqId: string | number, signal?: AbortSignal): Promise<void> {
  await apiPatch(`/rfq/${encodeURIComponent(String(rfqId))}/cancel`, {}, signal);
}

export async function closeRfq(rfqId: string | number, signal?: AbortSignal): Promise<void> {
  await apiPatch(`/rfq/${encodeURIComponent(String(rfqId))}/close`, {}, signal);
}

export async function acceptRfqQuote(
  rfqId: string | number,
  quoteId: string | number,
  signal?: AbortSignal
): Promise<SellerRfq> {
  await apiPatch(
    `/rfq/${encodeURIComponent(String(rfqId))}/quotes/${encodeURIComponent(String(quoteId))}/accept`,
    {},
    signal
  );
  return fetchSellerRfqDetail(rfqId, signal);
}

export async function rejectRfqQuote(
  rfqId: string | number,
  quoteId: string | number,
  signal?: AbortSignal
): Promise<SellerRfq> {
  await apiPatch(
    `/rfq/${encodeURIComponent(String(rfqId))}/quotes/${encodeURIComponent(String(quoteId))}/reject`,
    {},
    signal
  );
  return fetchSellerRfqDetail(rfqId, signal);
}

export async function fetchLocalDealsPage(
  options: { page?: number; perPage?: number; region?: string; search?: string } = {},
  signal?: AbortSignal
): Promise<LocalDealsResult> {
  const params = new URLSearchParams({
    per_page: String(options.perPage || 12),
    page: String(options.page || 1),
    region: options.region || 'all',
  });

  if (options.search?.trim()) params.set('search', options.search.trim());

  const payload = await apiGet(`/local-deals?${params.toString()}`, signal);
  const meta = isRecord(payload) && isRecord(payload.meta) ? payload.meta : {};
  const deals = getArrayPayload(payload).filter(isRecord).map(mapLocalDeal);

  return {
    deals,
    currentPage: getNumber(meta.current_page, options.page || 1),
    lastPage: getNumber(meta.last_page, options.page || 1),
    total: getNumber(meta.total, deals.length),
  };
}

const getBlogCategories = (payload: unknown) => {
  if (!isRecord(payload) || !Array.isArray(payload.categories)) return [];
  return payload.categories.map((category) => getString(category)).filter(Boolean);
};

const mapBlogPost = (post: UnknownRecord, index = 0): BlogPost => {
  const author = isRecord(post.author) ? post.author : undefined;
  const titleEn = getString(post.title_en || post.title);
  const titleMm = getString(post.title_mm);
  const seoTitleEn = getString(post.seo_title_en);
  const seoTitleMm = getString(post.seo_title_mm);
  const seoDescriptionEn = getString(post.seo_description_en);
  const seoDescriptionMm = getString(post.seo_description_mm);
  const excerptEn = stripHtml(post.excerpt_en || post.excerpt || post.content_en);
  const excerptMm = stripHtml(post.excerpt_mm || post.content_mm);
  const contentEn = stripHtml(post.content_en || post.content);
  const contentMm = stripHtml(post.content_mm);
  const slug = getString(post.slug || post.id, `post-${index}`);

  return {
    id: getString(post.id || slug, `post-${index}`),
    slug,
    title: titleEn || titleMm || 'Untitled post',
    excerpt: excerptEn || excerptMm || contentEn || contentMm,
    category: getString(post.category, 'Marketplace'),
    author: getString(author?.name, 'Pyonea'),
    publishedAt: formatDate(post.published_at || post.created_at),
    updatedAt: getString(post.updated_at),
    imageUrl: getNativeImageUrl(post.featured_image),
    featured: post.is_featured === true || post.is_featured === 1,
    readMinutes: readingTime(contentEn || contentMm || excerptEn || excerptMm),
    titleEn,
    titleMm,
    seoTitleEn,
    seoTitleMm,
    seoDescriptionEn,
    seoDescriptionMm,
    excerptEn,
    excerptMm,
    contentEn,
    contentMm,
    tags: normalizeStringArray(post.tags),
  };
};

export type BlogPageParams = {
  search?: string;
  category?: string;
  page?: number;
  perPage?: number;
};

export async function fetchBlogPagePosts(
  params: BlogPageParams = {},
  signal?: AbortSignal
): Promise<{ posts: BlogPost[]; categories: string[] }> {
  const query = new URLSearchParams({
    per_page: String(params.perPage || 24),
    page: String(params.page || 1),
  });

  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);

  const payload = await apiGet(`/blog?${query.toString()}`, signal);

  return {
    posts: getArrayPayload(payload).filter(isRecord).map(mapBlogPost),
    categories: getBlogCategories(payload),
  };
}

export async function fetchBlogPosts(signal?: AbortSignal): Promise<BlogPost[]> {
  const { posts } = await fetchBlogPagePosts({ perPage: 12 }, signal);
  return posts;
}

export async function fetchBlogDetail(slug: string, signal?: AbortSignal): Promise<BlogDetail> {
  const payload = await apiGet(`/blog/${encodeURIComponent(slug)}`, signal);
  const postPayload = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const relatedPayload = isRecord(payload) && Array.isArray(payload.related) ? payload.related : [];

  if (!isRecord(postPayload)) {
    throw new Error('Blog post not found');
  }

  return {
    post: mapBlogPost(postPayload),
    related: relatedPayload.filter(isRecord).map(mapBlogPost),
  };
}

const mapAdminManagedBlogPost = (post: UnknownRecord, index = 0): AdminManagedBlogPost => ({
  id: getString(post.id, `admin-blog-${index}`),
  titleEn: getString(post.title_en || post.title),
  titleMm: getString(post.title_mm),
  slug: getString(post.slug, `post-${index}`),
  excerptEn: getString(post.excerpt_en || post.excerpt),
  excerptMm: getString(post.excerpt_mm),
  contentEn: getString(post.content_en || post.content),
  contentMm: getString(post.content_mm),
  featuredImage: getString(post.featured_image),
  category: getString(post.category, 'Business Guides'),
  tags: normalizeStringArray(post.tags),
  status: getString(post.status, 'draft'),
  isFeatured: post.is_featured === true || post.is_featured === 1,
  publishedAt: getString(post.published_at),
  seoTitleEn: getString(post.seo_title_en),
  seoTitleMm: getString(post.seo_title_mm),
  seoDescriptionEn: getString(post.seo_description_en),
  seoDescriptionMm: getString(post.seo_description_mm),
});

export async function fetchAdminBlogPosts(
  filters: AdminBlogFilters = {},
  signal?: AbortSignal
): Promise<AdminBlogListResult> {
  const params = new URLSearchParams({
    page: String(filters.page || 1),
    per_page: String(filters.perPage || 15),
    status: filters.status || 'all',
  });

  if (filters.search?.trim()) params.set('search', filters.search.trim());

  const payload = await apiGet(`/admin/blog?${params.toString()}`, signal);
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const postsPayload = isRecord(data) && Array.isArray(data.data) ? data.data : getArrayPayload(payload);

  return {
    posts: postsPayload.filter(isRecord).map(mapAdminManagedBlogPost),
    currentPage: isRecord(data) ? getNumber(data.current_page, filters.page || 1) : filters.page || 1,
    lastPage: isRecord(data) ? getNumber(data.last_page, 1) : 1,
    total: isRecord(data) ? getNumber(data.total) : postsPayload.length,
  };
}

export async function createAdminBlogPost(
  body: AdminBlogFormPayload,
  signal?: AbortSignal
): Promise<AdminManagedBlogPost> {
  const payload = await apiPost('/admin/blog', body, signal);
  const record = extractRecordPayload(payload);
  return mapAdminManagedBlogPost(record);
}

export async function updateAdminBlogPost(
  postId: string | number,
  body: AdminBlogFormPayload,
  signal?: AbortSignal
): Promise<AdminManagedBlogPost> {
  const payload = await apiPut(`/admin/blog/${encodeURIComponent(String(postId))}`, body, signal);
  const record = extractRecordPayload(payload);
  return mapAdminManagedBlogPost(record);
}

export async function deleteAdminBlogPost(
  postId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/admin/blog/${encodeURIComponent(String(postId))}`, signal);
}

export async function adminBlogQuickAction(
  postId: string | number,
  action: 'publish' | 'archive',
  signal?: AbortSignal
): Promise<void> {
  await apiPost(`/admin/blog/${encodeURIComponent(String(postId))}/${action}`, {}, signal);
}

const mapSubscriptionPlan = (plan: UnknownRecord, index = 0): SubscriptionPlan => {
  const productLimitValue = getNumber(plan.product_limit);
  const slug = getString(plan.slug || plan.id, `plan-${index}`).toLowerCase();
  const priceValue = getNumber(plan.price_mmk);
  const commissionRate = getNumber(plan.commission_rate);
  const commissionPercent =
    getString(plan.commission_percent) ||
    (commissionRate > 0 ? `${Math.round(commissionRate * 100)}%` : '0%');
  const productLimitLabel =
    productLimitValue === -1
      ? 'Unlimited'
      : getString(plan.product_limit_label, String(productLimitValue));
  const analyticsEnabled = Boolean(plan.analytics_enabled);
  const bulkImportEnabled = Boolean(plan.bulk_import_enabled);
  const prioritySupport = Boolean(plan.priority_support);
  const customStorefront = Boolean(plan.custom_storefront);
  const features = [
    productLimitValue === -1 ? 'Unlimited products' : `${productLimitLabel} products`,
    `${commissionPercent} commission`,
    analyticsEnabled ? 'Analytics dashboard' : '',
    bulkImportEnabled ? 'Bulk product import' : '',
    prioritySupport ? 'Priority support' : '',
    customStorefront ? 'Custom storefront' : '',
  ].filter(Boolean);

  return {
    id: getString(plan.id || slug, `plan-${index}`),
    slug,
    name: getString(plan.name, 'Seller plan'),
    description: getString(plan.description, 'Start selling on Pyonea with tools for your store.'),
    price: formatMMK(priceValue),
    priceValue,
    billingCycle: getString(plan.billing_cycle, 'month'),
    productLimit:
      productLimitValue === -1 ? 'Unlimited products' : `${productLimitLabel} products`,
    productLimitValue,
    productLimitLabel,
    commission: `${commissionPercent} commission`,
    commissionRate,
    commissionPercent,
    features,
    highlighted: slug === 'professional' || index === 1,
    analyticsEnabled,
    bulkImportEnabled,
    prioritySupport,
    customStorefront,
    isCurrent: plan.is_current === true || plan.is_current === 1,
    isPending: plan.is_pending === true || plan.is_pending === 1,
    productsUsed: plan.products_used == null ? undefined : getNumber(plan.products_used),
  };
};

const mapSellerSubscription = (subscription: UnknownRecord): SellerSubscription => {
  const amountPaidValue = getNumber(subscription.amount_paid_mmk);
  const plan = isRecord(subscription.plan) ? mapSubscriptionPlan(subscription.plan) : null;
  const pending = isRecord(subscription.pending_request)
    ? mapSellerSubscription(subscription.pending_request)
    : null;
  const seller = isRecord(subscription.seller)
    ? {
        id: getString(subscription.seller.id || subscription.user_id),
        name: getString(subscription.seller.name),
        email: getString(subscription.seller.email),
        store: getString(subscription.seller.store),
      }
    : null;

  return {
    id: getString(subscription.id),
    userId: getString(subscription.user_id),
    status: getString(subscription.status, 'active'),
    statusLabel: getString(subscription.status_label, getString(subscription.status, 'active').replaceAll('_', ' ')),
    startsAt: getString(subscription.starts_at),
    endsAt: getString(subscription.ends_at),
    nextBillingAt: getString(subscription.next_billing_at),
    daysRemaining:
      subscription.days_remaining === null || subscription.days_remaining === undefined
        ? null
        : getNumber(subscription.days_remaining),
    amountPaidValue,
    amountPaid: formatMMK(amountPaidValue),
    paymentReference: getString(subscription.payment_reference),
    paymentMethod: getString(subscription.payment_method),
    notes: getString(subscription.notes),
    productsUsed: getNumber(subscription.products_used),
    plan,
    pendingRequest: pending,
    seller,
  };
};

const mapAdminSubscriptionsMeta = (meta: unknown): AdminSubscriptionsMeta => {
  const record = isRecord(meta) ? meta : {};
  return {
    currentPage: getNumber(record.current_page, 1),
    lastPage: getNumber(record.last_page, 1),
    total: getNumber(record.total),
    perPage: getNumber(record.per_page, 20),
  };
};

export async function fetchSubscriptionPlans(signal?: AbortSignal): Promise<SubscriptionPlan[]> {
  const payload = await apiGet('/subscription-plans', signal);

  return getArrayPayload(payload)
    .filter(isRecord)
    .map(mapSubscriptionPlan);
}

export async function fetchAdminSubscriptions(
  filters: AdminSubscriptionFilters = {},
  signal?: AbortSignal
): Promise<AdminSubscriptionsResponse> {
  const query = new URLSearchParams();
  query.set('page', String(filters.page || 1));
  query.set('per_page', String(filters.perPage || 20));
  if (filters.search) query.set('search', filters.search);
  if (filters.status) query.set('status', filters.status);
  if (filters.planSlug) query.set('plan_slug', filters.planSlug);

  const payload = await apiGet(`/admin/subscriptions?${query.toString()}`, signal);
  const record = isRecord(payload) ? payload : {};

  return {
    subscriptions: getArrayPayload(record).filter(isRecord).map(mapSellerSubscription),
    meta: mapAdminSubscriptionsMeta(record.meta),
  };
}

export async function fetchAdminSubscriptionPlans(signal?: AbortSignal): Promise<SubscriptionPlan[]> {
  const payload = await apiGet('/admin/subscriptions/plans', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSubscriptionPlan);
}

export async function assignAdminSubscriptionPlan(
  userId: string | number,
  payload: { planSlug: string; endsAt?: string; notes?: string },
  signal?: AbortSignal
): Promise<{ message: string; subscription: SellerSubscription | null }> {
  const response = await apiPut(`/admin/subscriptions/${encodeURIComponent(String(userId))}`, {
    plan_slug: payload.planSlug,
    ends_at: payload.endsAt || undefined,
    notes: payload.notes || undefined,
  }, signal);
  const record = isRecord(response) ? response : {};
  const data = isRecord(record.data) ? record.data : null;
  return {
    message: getString(record.message, 'Plan updated successfully.'),
    subscription: data ? mapSellerSubscription(data) : null,
  };
}

export async function approveAdminSubscriptionRequest(
  subscriptionId: string | number,
  notes = 'Approved from admin subscription dashboard',
  signal?: AbortSignal
): Promise<{ message: string; subscription: SellerSubscription | null }> {
  const response = await apiPost(`/admin/subscriptions/requests/${encodeURIComponent(String(subscriptionId))}/approve`, {
    notes,
  }, signal);
  const record = isRecord(response) ? response : {};
  const data = isRecord(record.data) ? record.data : null;
  return {
    message: getString(record.message, 'Subscription request approved.'),
    subscription: data ? mapSellerSubscription(data) : null,
  };
}

export async function rejectAdminSubscriptionRequest(
  subscriptionId: string | number,
  reason: string,
  signal?: AbortSignal
): Promise<{ message: string; subscription: SellerSubscription | null }> {
  const response = await apiPost(`/admin/subscriptions/requests/${encodeURIComponent(String(subscriptionId))}/reject`, {
    reason,
  }, signal);
  const record = isRecord(response) ? response : {};
  const data = isRecord(record.data) ? record.data : null;
  return {
    message: getString(record.message, 'Subscription request rejected.'),
    subscription: data ? mapSellerSubscription(data) : null,
  };
}

export async function updateAdminSubscriptionPlan(
  planId: string | number,
  payload: {
    description?: string;
    priceValue?: number;
    productLimitValue?: number;
    commissionRate?: number;
    analyticsEnabled?: boolean;
    bulkImportEnabled?: boolean;
    prioritySupport?: boolean;
    customStorefront?: boolean;
    isActive?: boolean;
  },
  signal?: AbortSignal
): Promise<{ message: string; plan: SubscriptionPlan | null }> {
  const response = await apiPut(`/admin/subscriptions/plans/${encodeURIComponent(String(planId))}`, {
    description: payload.description,
    price_mmk: payload.priceValue,
    product_limit: payload.productLimitValue,
    commission_rate: payload.commissionRate,
    analytics_enabled: payload.analyticsEnabled,
    bulk_import_enabled: payload.bulkImportEnabled,
    priority_support: payload.prioritySupport,
    custom_storefront: payload.customStorefront,
    is_active: payload.isActive,
  }, signal);
  const record = isRecord(response) ? response : {};
  const data = isRecord(record.data) ? record.data : null;
  return {
    message: getString(record.message, 'Plan settings saved.'),
    plan: data ? mapSubscriptionPlan(data) : null,
  };
}

const mapSellerWalletSummary = (wallet: UnknownRecord): SellerWalletSummary => {
  const escrowBalanceValue = getNumber(wallet.escrow_balance);
  const availableBalanceValue = getNumber(wallet.available_balance);
  const totalEarnedValue = getNumber(wallet.total_earned);
  const totalCommissionPaidValue = getNumber(wallet.total_commission_paid);
  const codCommissionOutstandingValue = getNumber(wallet.cod_commission_outstanding);

  return {
    escrowBalanceValue,
    escrowBalance: formatMMK(escrowBalanceValue),
    availableBalanceValue,
    availableBalance: formatMMK(availableBalanceValue),
    totalEarnedValue,
    totalEarned: formatMMK(totalEarnedValue),
    totalCommissionPaidValue,
    totalCommissionPaid: formatMMK(totalCommissionPaidValue),
    codCommissionOutstandingValue,
    codCommissionOutstanding: formatMMK(codCommissionOutstandingValue),
    codOverdueCount: getNumber(wallet.cod_overdue_count),
  };
};

const mapSellerWalletTransaction = (transaction: UnknownRecord): SellerWalletTransaction => {
  const amountValue = getNumber(transaction.amount);
  const escrowBalanceAfterValue = getNumber(transaction.escrow_balance_after);
  const availableBalanceAfterValue = getNumber(transaction.available_balance_after);

  return {
    id: getString(transaction.id),
    type: getString(transaction.type, 'adjustment'),
    typeLabel: getString(transaction.type_label || transaction.type, 'Wallet transaction'),
    amountValue,
    amount: formatMMK(amountValue),
    escrowBalanceAfterValue,
    escrowBalanceAfter: formatMMK(escrowBalanceAfterValue),
    availableBalanceAfterValue,
    availableBalanceAfter: formatMMK(availableBalanceAfterValue),
    orderNumber: getString(transaction.order_number),
    notes: getString(transaction.notes),
    createdAt: getString(transaction.created_at || transaction.createdAt),
  };
};

const mapSellerCodInvoice = (invoice: UnknownRecord): SellerCodInvoice => {
  const order = isRecord(invoice.order) ? invoice.order : {};
  const commissionAmountValue = getNumber(invoice.commission_amount);
  const orderSubtotalValue = getNumber(invoice.order_subtotal);

  return {
    id: getString(invoice.id),
    invoiceNumber: getString(invoice.invoice_number, `INV-${getString(invoice.id)}`),
    orderId: getString(invoice.order_id),
    orderNumber: getString(order.order_number || invoice.order_number || invoice.order_id),
    status: getString(invoice.status, 'outstanding'),
    commissionAmountValue,
    commissionAmount: formatMMK(commissionAmountValue),
    commissionRate: getNumber(invoice.commission_rate),
    orderSubtotalValue,
    orderSubtotal: formatMMK(orderSubtotalValue),
    dueDate: getString(invoice.due_date),
    paidAt: getString(invoice.paid_at),
    paymentReference: getString(invoice.payment_reference),
    paymentMethod: getString(invoice.payment_method),
    sellerNotes: getString(invoice.seller_notes),
    createdAt: getString(invoice.created_at || invoice.createdAt),
  };
};

export async function fetchSellerWalletOverview(
  status = '',
  signal?: AbortSignal
): Promise<SellerWalletOverview> {
  const invoiceQuery = new URLSearchParams({ per_page: '50' });
  if (status) invoiceQuery.set('status', status);

  const [walletPayload, invoicePayload] = await Promise.all([
    apiGet('/seller/wallet', signal),
    apiGet(`/seller/cod-invoices?${invoiceQuery.toString()}`, signal),
  ]);

  const walletData = isRecord(walletPayload) && isRecord(walletPayload.data) ? walletPayload.data : {};
  const wallet = isRecord(walletData.wallet) ? walletData.wallet : {};
  const transactions = Array.isArray(walletData.recent_transactions)
    ? walletData.recent_transactions
    : [];

  return {
    wallet: mapSellerWalletSummary(wallet),
    recentTransactions: transactions.filter(isRecord).map(mapSellerWalletTransaction),
    invoices: getArrayPayload(invoicePayload).filter(isRecord).map(mapSellerCodInvoice),
  };
}

export async function fetchSellerCodInvoices(
  status = '',
  signal?: AbortSignal
): Promise<SellerCodInvoice[]> {
  const query = new URLSearchParams({ per_page: '50' });
  if (status) query.set('status', status);
  const payload = await apiGet(`/seller/cod-invoices?${query.toString()}`, signal);
  return getArrayPayload(payload).filter(isRecord).map(mapSellerCodInvoice);
}

export async function submitSellerCodInvoicePayment(
  invoiceId: string | number,
  payload: { paymentReference: string; paymentMethod: string; sellerNotes?: string },
  signal?: AbortSignal
): Promise<{ message: string; invoice: SellerCodInvoice | null }> {
  const response = await apiPost(`/seller/cod-invoices/${encodeURIComponent(String(invoiceId))}/submit-payment`, {
    payment_reference: payload.paymentReference,
    payment_method: payload.paymentMethod,
    seller_notes: payload.sellerNotes || undefined,
  }, signal);
  const record = isRecord(response) ? response : {};
  const data = isRecord(record.data) ? record.data : null;
  return {
    message: getString(record.message, 'Payment submitted. Awaiting admin confirmation.'),
    invoice: data ? mapSellerCodInvoice(data) : null,
  };
}

export type AdminCodInvoiceSummary = {
  outstandingCount: number;
  outstandingAmount: number;
  overdueCount: number;
  collectedThisMonth: number;
};

export type AdminCodInvoice = SellerCodInvoice & {
  sellerName: string;
  sellerEmail: string;
  confirmedAt: string;
};

export type AdminCodInvoicesResult = {
  invoices: AdminCodInvoice[];
  summary: AdminCodInvoiceSummary;
};

const mapAdminCodInvoice = (invoice: UnknownRecord): AdminCodInvoice => {
  const base = mapSellerCodInvoice(invoice);
  const seller = isRecord(invoice.seller) ? invoice.seller : {};

  return {
    ...base,
    sellerName: getString(seller.name || seller.store_name),
    sellerEmail: getString(seller.email),
    confirmedAt: getString(invoice.confirmed_at),
  };
};

export async function fetchAdminCodInvoices(
  status = '',
  signal?: AbortSignal
): Promise<AdminCodInvoicesResult> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const payload = await apiGet(`/admin/cod-invoices${query}`, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(data)) {
    return {
      invoices: [],
      summary: {
        outstandingCount: 0,
        outstandingAmount: 0,
        overdueCount: 0,
        collectedThisMonth: 0,
      },
    };
  }

  const invoicesSource = isRecord(data.invoices) && Array.isArray(data.invoices.data)
    ? data.invoices.data
    : Array.isArray(data.invoices)
      ? data.invoices
      : getArrayPayload(data);
  const summaryRaw = isRecord(data.summary) ? data.summary : {};

  return {
    invoices: invoicesSource.filter(isRecord).map(mapAdminCodInvoice),
    summary: {
      outstandingCount: getNumber(summaryRaw.outstanding_count),
      outstandingAmount: getNumber(summaryRaw.outstanding_amount),
      overdueCount: getNumber(summaryRaw.overdue_count),
      collectedThisMonth: getNumber(summaryRaw.collected_this_month),
    },
  };
}

export async function confirmAdminCodInvoicePayment(
  invoiceId: string | number,
  body: { admin_notes?: string },
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/admin/cod-invoices/${encodeURIComponent(String(invoiceId))}/confirm-payment`,
    { admin_notes: body.admin_notes || undefined },
    signal
  );
}

export async function waiveAdminCodInvoice(
  invoiceId: string | number,
  body: { admin_notes: string },
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/admin/cod-invoices/${encodeURIComponent(String(invoiceId))}/waive`,
    { admin_notes: body.admin_notes },
    signal
  );
}

export type AdminCommissionRuleType = 'default' | 'account_level' | 'category' | 'business_type';

export type AdminCommissionRule = {
  id: string;
  type: AdminCommissionRuleType;
  referenceId: string | number | null;
  referenceLabel: string;
  rate: number;
  notes: string;
  isActive: boolean;
};

export type AdminCommissionCategory = {
  id: string;
  name: string;
};

export type AdminBusinessType = {
  id: string;
  name: string;
};

const mapAdminCommissionRule = (rule: UnknownRecord): AdminCommissionRule => {
  const referenceId = rule.reference_id ?? rule.referenceId ?? null;

  return {
    id: getString(rule.id),
    type: getString(rule.type, 'default') as AdminCommissionRuleType,
    referenceId:
      referenceId === null || referenceId === undefined || referenceId === '' ? null : getString(referenceId),
    referenceLabel: getString(rule.reference_label || rule.referenceLabel),
    rate: getNumber(rule.rate),
    notes: getString(rule.notes),
    isActive: rule.is_active === true || rule.is_active === 1 || rule.is_active === '1',
  };
};

const flattenAdminCommissionCategories = (
  rows: UnknownRecord[],
  acc: AdminCommissionCategory[] = []
): AdminCommissionCategory[] => {
  for (const row of rows) {
    if (!isRecord(row)) continue;
    acc.push({
      id: getString(row.id),
      name: getString(row.name || row.name_en || row.name_mm, 'Category'),
    });
    if (Array.isArray(row.children)) {
      flattenAdminCommissionCategories(row.children.filter(isRecord), acc);
    }
  }
  return acc;
};

export async function fetchAdminCommissionRules(signal?: AbortSignal): Promise<AdminCommissionRule[]> {
  const payload = await apiGet('/admin/commission-rules', signal);
  const data =
    isRecord(payload) && Array.isArray(payload.data)
      ? payload.data
      : getArrayPayload(payload);
  return data.filter(isRecord).map(mapAdminCommissionRule);
}

export async function createAdminCommissionRule(
  body: {
    type: AdminCommissionRuleType;
    reference_id?: string | number | null;
    rate: string;
    notes?: string | null;
    is_active?: boolean;
  },
  signal?: AbortSignal
): Promise<void> {
  await apiPost('/admin/commission-rules', body, signal);
}

export async function updateAdminCommissionRule(
  ruleId: string | number,
  updates: { rate?: string; is_active?: boolean; notes?: string | null },
  signal?: AbortSignal
): Promise<void> {
  await apiPut(`/admin/commission-rules/${encodeURIComponent(String(ruleId))}`, updates, signal);
}

export async function fetchAdminCommissionCategories(
  signal?: AbortSignal
): Promise<AdminCommissionCategory[]> {
  const payload = await apiGet('/categories', signal);
  return flattenAdminCommissionCategories(getArrayPayload(payload).filter(isRecord));
}

export async function fetchAdminBusinessTypes(signal?: AbortSignal): Promise<AdminBusinessType[]> {
  const payload = await apiGet('/business-types', signal);
  return getArrayPayload(payload)
    .filter(isRecord)
    .map((item) => ({
      id: getString(item.id),
      name: getString(item.name || item.name_en || item.name_mm, 'Business Type'),
    }));
}

export type AdminManagedCategory = {
  id: string;
  nameEn: string;
  nameMm: string;
  slugEn: string;
  slugMm: string;
  descriptionEn: string;
  descriptionMm: string;
  commissionRate: number;
  parentId: string | null;
  isActive: boolean;
  image: string;
  imageUrl: string;
  children: AdminManagedCategory[];
};

export type AdminCategoryFormPayload = {
  name_en: string;
  name_mm?: string;
  description_en?: string;
  description_mm?: string;
  commission_rate: number;
  parent_id?: string;
  is_active: boolean;
  image?: NativeUploadFile | null;
  removeImage?: boolean;
};

const mapAdminManagedCategory = (category: UnknownRecord): AdminManagedCategory => {
  const image = getString(category.image);
  const children = Array.isArray(category.children)
    ? category.children.filter(isRecord).map(mapAdminManagedCategory)
    : [];

  return {
    id: getString(category.id),
    nameEn: getString(category.name_en || category.nameEn, 'Category'),
    nameMm: getString(category.name_mm || category.nameMm),
    slugEn: getString(category.slug_en || category.slugEn),
    slugMm: getString(category.slug_mm || category.slugMm),
    descriptionEn: getString(category.description_en || category.descriptionEn),
    descriptionMm: getString(category.description_mm || category.descriptionMm),
    commissionRate: getNumber(category.commission_rate),
    parentId: category.parent_id ? getString(category.parent_id) : null,
    isActive: category.is_active !== false && category.is_active !== 0 && category.is_active !== '0',
    image,
    imageUrl: getNativeImageUrl(image) || '',
    children,
  };
};

const buildAdminCategoryFormData = (payload: AdminCategoryFormPayload, mode: 'create' | 'edit') => {
  const form = new FormData();
  form.append('name_en', payload.name_en);
  form.append('name_mm', payload.name_mm || '');
  form.append('description_en', payload.description_en || '');
  form.append('description_mm', payload.description_mm || '');
  form.append('commission_rate', String(payload.commission_rate));
  form.append('parent_id', payload.parent_id || '');
  form.append('is_active', payload.is_active ? '1' : '0');

  if (payload.image?.uri) {
    appendNativeFile(form, 'image', payload.image);
  } else if (mode === 'edit' && payload.removeImage) {
    form.append('image', '');
  }

  return form;
};

export async function fetchAdminManagedCategories(signal?: AbortSignal): Promise<AdminManagedCategory[]> {
  const payload = await apiGet('/admin/categories', signal);
  const data =
    isRecord(payload) && Array.isArray(payload.data)
      ? payload.data
      : getArrayPayload(payload);

  return data.filter(isRecord).map(mapAdminManagedCategory);
}

export async function createAdminCategory(
  payload: AdminCategoryFormPayload,
  signal?: AbortSignal
): Promise<void> {
  await apiPostForm('/admin/categories', buildAdminCategoryFormData(payload, 'create'), signal);
}

export async function updateAdminCategory(
  categoryId: string | number,
  payload: AdminCategoryFormPayload,
  signal?: AbortSignal
): Promise<void> {
  const form = buildAdminCategoryFormData(payload, 'edit');
  form.append('_method', 'PUT');
  await apiPostForm(`/admin/categories/${encodeURIComponent(String(categoryId))}`, form, signal);
}

export async function deleteAdminCategory(
  categoryId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/admin/categories/${encodeURIComponent(String(categoryId))}`, signal);
}

export async function updateAdminCategoryStatus(
  categoryId: string | number,
  isActive: boolean,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(`/admin/categories/${encodeURIComponent(String(categoryId))}`, { is_active: isActive }, signal);
}

export type AdminManagedBusinessType = {
  id: string;
  nameEn: string;
  nameMm: string;
  slugEn: string;
  slugMm: string;
  descriptionEn: string;
  descriptionMm: string;
  requiresRegistration: boolean;
  requiresTaxDocument: boolean;
  requiresIdentityDocument: boolean;
  requiresBusinessCertificate: boolean;
  additionalRequirements: unknown;
  isActive: boolean;
  sortOrder: number;
  icon: string;
  color: string;
  sellersCount: number;
};

export type AdminBusinessTypeFormPayload = {
  name_en: string;
  name_mm?: string;
  slug_en: string;
  slug_mm?: string;
  description_en?: string;
  description_mm?: string;
  requires_registration: boolean;
  requires_tax_document: boolean;
  requires_identity_document: boolean;
  requires_business_certificate: boolean;
  additional_requirements: unknown;
  is_active: boolean;
  sort_order: number;
  icon: string;
  color: string;
};

const mapAdminManagedBusinessType = (item: UnknownRecord): AdminManagedBusinessType => ({
  id: getString(item.id),
  nameEn: getString(item.name_en || item.nameEn, 'Business Type'),
  nameMm: getString(item.name_mm || item.nameMm),
  slugEn: getString(item.slug_en || item.slugEn),
  slugMm: getString(item.slug_mm || item.slugMm),
  descriptionEn: getString(item.description_en || item.descriptionEn),
  descriptionMm: getString(item.description_mm || item.descriptionMm),
  requiresRegistration: item.requires_registration === true || item.requires_registration === 1,
  requiresTaxDocument: item.requires_tax_document === true || item.requires_tax_document === 1,
  requiresIdentityDocument: item.requires_identity_document === true || item.requires_identity_document === 1,
  requiresBusinessCertificate:
    item.requires_business_certificate === true || item.requires_business_certificate === 1,
  additionalRequirements: item.additional_requirements ?? [],
  isActive: item.is_active !== false && item.is_active !== 0 && item.is_active !== '0',
  sortOrder: getNumber(item.sort_order),
  icon: getString(item.icon, 'BuildingStorefrontIcon'),
  color: getString(item.color, '#3b82f6'),
  sellersCount: getNumber(item.sellers_count),
});

export async function fetchAdminManagedBusinessTypes(
  signal?: AbortSignal
): Promise<AdminManagedBusinessType[]> {
  const payload = await apiGet('/admin/business-types', signal);
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : getArrayPayload(payload);
  return data.filter(isRecord).map(mapAdminManagedBusinessType);
}

export async function createAdminBusinessType(
  payload: AdminBusinessTypeFormPayload,
  signal?: AbortSignal
): Promise<void> {
  await apiPost('/admin/business-types', payload, signal);
}

export async function updateAdminBusinessType(
  businessTypeId: string | number,
  payload: AdminBusinessTypeFormPayload,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(`/admin/business-types/${encodeURIComponent(String(businessTypeId))}`, payload, signal);
}

export async function toggleAdminBusinessType(
  businessTypeId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiPatch(`/admin/business-types/${encodeURIComponent(String(businessTypeId))}/toggle`, {}, signal);
}

export async function deleteAdminBusinessType(
  businessTypeId: string | number,
  signal?: AbortSignal
): Promise<void> {
  await apiDelete(`/admin/business-types/${encodeURIComponent(String(businessTypeId))}`, signal);
}

export type AdminEmailCampaignAudience =
  | 'newsletter_subscribers'
  | 'all_buyers'
  | 'all_sellers'
  | 'buyers_by_city'
  | 'sellers_by_tier'
  | 'custom_ids';

export type AdminEmailCampaign = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  audience: string;
  audienceFilter: Record<string, unknown>;
  status: string;
  recipientsCount: number;
  deliveredCount: number;
  openRate: number | null;
  sentAt: string;
  createdAt: string;
};

export type AdminEmailCampaignFormPayload = {
  name: string;
  subject: string;
  body_html: string;
  audience: string;
  audience_filter: Record<string, unknown>;
};

export type AdminNewsletterSubscriber = {
  id: string;
  email: string;
  name: string;
  source: string;
  confirmedAt: string;
};

export type AdminNewsletterSubscriberMeta = {
  total: number;
  unconfirmed: number;
};

const mapAdminEmailCampaign = (row: UnknownRecord): AdminEmailCampaign => ({
  id: getString(row.id),
  name: getString(row.name),
  subject: getString(row.subject),
  bodyHtml: getString(row.body_html || row.bodyHtml),
  audience: getString(row.audience, 'newsletter_subscribers'),
  audienceFilter: isRecord(row.audience_filter) ? row.audience_filter : {},
  status: getString(row.status, 'draft'),
  recipientsCount: getNumber(row.recipients_count),
  deliveredCount: getNumber(row.delivered_count),
  openRate: row.open_rate == null || row.open_rate === '' ? null : getNumber(row.open_rate),
  sentAt: getString(row.sent_at),
  createdAt: getString(row.created_at || row.createdAt),
});

const mapAdminNewsletterSubscriber = (row: UnknownRecord): AdminNewsletterSubscriber => ({
  id: getString(row.id),
  email: getString(row.email),
  name: getString(row.name),
  source: getString(row.source),
  confirmedAt: getString(row.confirmed_at || row.confirmedAt),
});

const extractNewsletterMeta = (payload: unknown): AdminNewsletterSubscriberMeta => {
  const root = isRecord(payload) ? payload : {};
  const meta = isRecord(root.meta) ? root.meta : root;
  return {
    total: getNumber(meta.total),
    unconfirmed: getNumber(meta.unconfirmed),
  };
};

export async function fetchAdminEmailCampaigns(signal?: AbortSignal): Promise<AdminEmailCampaign[]> {
  const payload = await apiGet('/admin/newsletter/campaigns', signal);
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : getArrayPayload(payload);
  return data.filter(isRecord).map(mapAdminEmailCampaign);
}

export async function createAdminEmailCampaign(
  body: AdminEmailCampaignFormPayload,
  signal?: AbortSignal
): Promise<void> {
  await apiPost('/admin/newsletter/campaigns', body, signal);
}

export async function updateAdminEmailCampaign(
  campaignId: string | number,
  body: AdminEmailCampaignFormPayload,
  signal?: AbortSignal
): Promise<void> {
  await apiPut(`/admin/newsletter/campaigns/${encodeURIComponent(String(campaignId))}`, body, signal);
}

export async function previewAdminEmailCampaign(
  campaignId: string | number,
  signal?: AbortSignal
): Promise<number> {
  const payload = await apiGet(
    `/admin/newsletter/campaigns/${encodeURIComponent(String(campaignId))}/preview`,
    signal
  );
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : isRecord(payload) ? payload : {};
  return getNumber(data.recipient_count ?? data.recipientCount);
}

export async function sendAdminEmailCampaign(
  campaignId: string | number,
  signal?: AbortSignal
): Promise<{ message: string }> {
  const payload = await apiPost(
    `/admin/newsletter/campaigns/${encodeURIComponent(String(campaignId))}/send`,
    {},
    signal
  );
  const record = isRecord(payload) ? payload : {};
  return { message: getString(record.message, 'Campaign sent!') };
}

export async function fetchAdminNewsletterSubscriberStats(
  signal?: AbortSignal
): Promise<AdminNewsletterSubscriberMeta> {
  const payload = await apiGet('/admin/newsletter/subscribers?per_page=1', signal);
  return extractNewsletterMeta(payload);
}

export async function fetchAdminNewsletterSubscribers(
  search = '',
  perPage = 20,
  signal?: AbortSignal
): Promise<{ subscribers: AdminNewsletterSubscriber[]; meta: AdminNewsletterSubscriberMeta }> {
  const query = new URLSearchParams({ per_page: String(perPage) });
  if (search.trim()) query.set('search', search.trim());
  const payload = await apiGet(`/admin/newsletter/subscribers?${query.toString()}`, signal);
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : getArrayPayload(payload);
  return {
    subscribers: data.filter(isRecord).map(mapAdminNewsletterSubscriber),
    meta: extractNewsletterMeta(payload),
  };
}

export type AdminAnalyticsStats = {
  platformRevenue: number;
  commissionRevenue: number;
  deliveryFeeRevenue: number;
  pendingCommissions: number;
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  paidCommissions: number;
};

export type AdminRevenueBreakdownRow = {
  month: string;
  commission: number;
  deliveryFee: number;
  platform: number;
  gmv: number;
};

const mapAdminAnalyticsStats = (stats: UnknownRecord): AdminAnalyticsStats => ({
  platformRevenue: getNumber(stats.platform_revenue),
  commissionRevenue: getNumber(stats.commission_revenue),
  deliveryFeeRevenue: getNumber(stats.delivery_fee_revenue),
  pendingCommissions: getNumber(stats.pending_commissions),
  totalRevenue: getNumber(stats.total_revenue),
  totalOrders: getNumber(stats.total_orders),
  completedOrders: getNumber(stats.completed_orders),
  paidCommissions: getNumber(stats.paid_commissions ?? stats.collected_commissions),
});

const mapAdminRevenueBreakdownRow = (row: UnknownRecord): AdminRevenueBreakdownRow => ({
  month: getString(row.month),
  commission: getNumber(row.commission),
  deliveryFee: getNumber(row.delivery_fee),
  platform: getNumber(row.platform),
  gmv: getNumber(row.gmv),
});

export async function fetchAdminAnalyticsStats(signal?: AbortSignal): Promise<AdminAnalyticsStats> {
  const payload = await apiGet('/admin/stats', signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(data)) throw new Error('Admin statistics not found');
  return mapAdminAnalyticsStats(data);
}

export async function fetchAdminRevenueBreakdown(
  signal?: AbortSignal
): Promise<AdminRevenueBreakdownRow[]> {
  const payload = await apiGet('/admin/revenue-breakdown', signal);
  return getArrayPayload(payload).filter(isRecord).map(mapAdminRevenueBreakdownRow);
}

export async function fetchSellerSubscriptionOverview(
  signal?: AbortSignal
): Promise<SellerSubscriptionOverview> {
  const [currentPayload, plansPayload, methodsPayload] = await Promise.all([
    apiGet('/seller/subscription', signal),
    apiGet('/seller/subscription/plans', signal),
    apiGet('/payment-methods', signal).catch(() => ({ data: [] })),
  ]);

  const currentData = isRecord(currentPayload) && isRecord(currentPayload.data) ? currentPayload.data : currentPayload;
  const plans = getArrayPayload(plansPayload).filter(isRecord).map(mapSubscriptionPlan);
  const pendingData =
    isRecord(plansPayload) && isRecord(plansPayload.pending_request)
      ? plansPayload.pending_request
      : isRecord(currentData) && isRecord(currentData.pending_request)
        ? currentData.pending_request
        : null;
  const methods = getArrayPayload(methodsPayload)
    .map((method) => getString(method))
    .filter((method) => ['mmqr', 'kbz_pay', 'wave_pay'].includes(method));

  return {
    current: isRecord(currentData) ? mapSellerSubscription(currentData) : null,
    pendingRequest: isRecord(pendingData) ? mapSellerSubscription(pendingData) : null,
    plans,
    paymentMethods: methods,
  };
}

export async function createSellerSubscriptionPaymentSession(
  planSlug: string,
  paymentMethod: string,
  signal?: AbortSignal
): Promise<SellerSubscriptionPaymentSession> {
  const payload = await apiPost('/seller/subscription/payment-session', {
    plan_slug: planSlug,
    payment_method: paymentMethod,
  }, signal);
  const data = isRecord(payload) ? payload : {};

  return {
    success: data.success !== false,
    amount: getNumber(data.amount),
    currency: getString(data.currency, 'MMK'),
    reference: getString(data.reference || data.payment_reference),
    paymentMethod: getString(data.payment_method, paymentMethod),
    qrImageUrl: resolvePaymentQrImageUrl(data.qr_image_url) || '',
    qrString: getString(data.qr_string),
    deeplinkUrl: getString(data.deeplink_url || data.deep_link_url || data.deep_link),
    checkoutUrl: getString(data.checkout_url || data.payment_url),
    message: getString(data.message),
  };
}

export async function verifySellerSubscriptionPayment(
  paymentMethod: string,
  paymentReference: string,
  signal?: AbortSignal
): Promise<boolean> {
  const payload = await apiPost('/seller/subscription/payment-session/verify', {
    payment_method: paymentMethod,
    payment_reference: paymentReference,
  }, signal);
  return isRecord(payload) && payload.paid === true;
}

export async function upgradeSellerSubscription(
  planSlug: string,
  paymentReference = '',
  paymentMethod = '',
  signal?: AbortSignal
): Promise<{ message: string; subscription: SellerSubscription | null }> {
  const body: Record<string, string> = { plan_slug: planSlug };
  if (paymentReference) body.payment_reference = paymentReference;
  if (paymentMethod) body.payment_method = paymentMethod;

  const payload = await apiPost('/seller/subscription/upgrade', body, signal);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null;

  return {
    message: isRecord(payload) ? getString(payload.message, 'Subscription updated successfully.') : 'Subscription updated successfully.',
    subscription: data ? mapSellerSubscription(data) : null,
  };
}

export async function fetchMyReports(page = 1, signal?: AbortSignal): Promise<ReportListResult> {
  const payload = await apiGet(`/reports?page=${page}`, signal);
  const data = isRecord(payload) ? payload.data : payload;
  const reportsPayload = isRecord(data) && Array.isArray(data.data) ? data.data : getArrayPayload(payload);

  return {
    reports: reportsPayload.filter(isRecord).map(mapUserReport),
    currentPage: isRecord(data) ? getNumber(data.current_page, 1) : 1,
    lastPage: isRecord(data) ? getNumber(data.last_page, 1) : 1,
  };
}

export async function fetchAdminReports(
  filters: AdminReportFilters = {},
  signal?: AbortSignal
): Promise<AdminReportListResult> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);

  const payload = await apiGet(`/admin/reports?${params.toString()}`, signal);
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const summary = isRecord(root.summary) ? root.summary : {};
  const reportsPayload = isRecord(data) && Array.isArray(data.data) ? data.data : getArrayPayload(payload);

  return {
    reports: reportsPayload.filter(isRecord).map(mapAdminReport),
    summary: {
      open: getNumber(summary.open),
      inReview: getNumber(summary.in_review ?? summary.inReview),
      critical: getNumber(summary.critical),
      slaBreached: getNumber(summary.sla_breached ?? summary.slaBreached),
    },
    currentPage: isRecord(data) ? getNumber(data.current_page, filters.page || 1) : filters.page || 1,
    lastPage: isRecord(data) ? getNumber(data.last_page, 1) : 1,
  };
}

export async function fetchAdminReportDetail(
  ticketId: string,
  signal?: AbortSignal
): Promise<AdminReport> {
  const payload = await apiGet(`/admin/reports/${encodeURIComponent(ticketId)}`, signal);
  const reportPayload = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(reportPayload)) {
    throw new Error('Report not found');
  }

  return mapAdminReport(reportPayload);
}

export async function updateAdminReport(
  ticketId: string,
  body: AdminReportUpdatePayload,
  signal?: AbortSignal
): Promise<void> {
  await apiPatch(`/admin/reports/${encodeURIComponent(ticketId)}`, body, signal);
}

export async function addAdminReportComment(
  ticketId: string,
  body: string,
  isInternal = false,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(
    `/admin/reports/${encodeURIComponent(ticketId)}/comments`,
    { body, is_internal: isInternal },
    signal
  );
}

export async function fetchMyReportDetail(
  ticketId: string,
  signal?: AbortSignal
): Promise<UserReport> {
  const payload = await apiGet(`/reports/${encodeURIComponent(ticketId)}`, signal);
  const reportPayload = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(reportPayload)) {
    throw new Error('Report not found');
  }

  return mapUserReport(reportPayload);
}

export async function addReportComment(
  ticketId: string,
  body: string,
  signal?: AbortSignal
): Promise<void> {
  await apiPost(`/reports/${encodeURIComponent(ticketId)}/comments`, { body }, signal);
}

export async function submitReport(
  payload: SubmitReportPayload,
  signal?: AbortSignal
): Promise<SubmitReportResult> {
  const response = await apiPost('/reports', payload, signal);
  const root = isRecord(response) ? response : {};
  const data = isRecord(root.data) ? root.data : {};
  const report = isRecord(data.report) ? data.report : {};
  const ticketId = getString(root.ticket_id || data.ticket_id || report.ticket_id);

  if (!ticketId) {
    throw new Error('Missing ticket ID');
  }

  return { ticketId };
}
