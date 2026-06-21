import { OptimizedImage as Image } from "@/components/ui/optimized-image";
import Feather from "@expo/vector-icons/Feather";
import { Link, useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import { CheckoutLocationSelect } from "@/components/checkout/checkout-location-select";
import { CheckoutPaymentModal } from "@/components/checkout/checkout-payment-modal";
import { AppLayout } from "@/components/layout/app-layout";
import { SITE_CONTAINER_CLASS } from "@/constants/layout";
import { useCartCount } from "@/context/cart-count-context";
import { useNativeAuth } from "@/context/native-auth";
import { getMyanmarStates } from "@/data/myanmar-locations";
import { useAppTranslation } from "@/i18n";
import { hasUserRole } from "@/utils/auth-routing";
import { getThumbUrl } from "@/utils/image-thumbs";
import {
    buildCheckoutLocationRows,
    myanmarLocationsEng,
    resolveCanonicalLocation,
    toLocationTree,
} from "@/utils/myanmarLocationTree";
import {
    clearCartItems,
    createCheckoutOrder,
    fetchCart,
    fetchCheckoutFees,
    fetchCheckoutLocations,
    fetchCheckoutProfile,
    fetchCheckoutSellerPolicies,
    fetchPaymentMethods,
    fetchPaymentReceipt,
    formatApiErrorMessage,
    formatMMK,
    requestCheckoutOtp,
    validateCheckoutCoupon,
    verifyCheckoutOtp,
    type CartItem,
    type CartResult,
    type CheckoutAddress,
    type CheckoutCoupon,
    type CheckoutLocationRow,
    type CheckoutOrderResult,
    type CheckoutProfile,
    type CheckoutSellerPolicy,
    type CheckoutSellerShippingFee,
} from "@/utils/native-api";
import { emitCartCountChanged } from "@/utils/native-cart-events";

const placeholderProduct = require("@/assets/images/placeholder-product.webp");

const paymentColors: Record<string, string> = {
  mmqr: "#3b82f6",
  kbz_pay: "#8b5cf6",
  wave_pay: "#22c55e",
  cb_pay: "#ef4444",
  aya_pay: "#f97316",
  cash_on_delivery: "#eab308",
};

type LocationCityNode = {
  city: string;
  engCity: string;
  townships: string[];
  engTownships: string[];
};

type LocationTreeNode = {
  state: string;
  engState: string;
  cities: LocationCityNode[];
};

const emptyAddress: CheckoutAddress = {
  full_name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  township: "",
  postal_code: "",
  country: "Myanmar",
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
  editable?: boolean;
}) {
  return (
    <View className="w-full gap-2 sm:w-[48%]">
      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        keyboardType={keyboardType}
        editable={editable}
        scrollEnabled={false}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-lg border border-gray-300 bg-white px-4 py-3 font-sans text-base text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${
          multiline ? "min-h-24" : "min-h-12"
        }`}
      />
    </View>
  );
}

function CheckoutItem({ item }: { item: CartItem }) {
  return (
    <View className="flex-row gap-3 border-b border-gray-100 py-4 dark:border-slate-800">
      <View className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
        <Image
          source={
            item.imageUrl
              ? { uri: getThumbUrl(item.imageUrl, 160) }
              : placeholderProduct
          }
          className="h-full w-full"
          contentFit="contain"
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100"
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.seller ? (
          <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-400">
            Sold by {item.seller}
          </Text>
        ) : null}
        <Text className="mt-1 font-sans text-xs text-gray-500 dark:text-slate-500">
          Qty {item.quantity} ·{" "}
          {item.sellingPriceValue < item.priceValue
            ? item.sellingPrice
            : item.price}
        </Text>
      </View>
      <Text className="font-sans text-sm font-bold text-gray-900 dark:text-slate-100">
        {item.subtotal}
      </Text>
    </View>
  );
}

function PaymentMethodCard({
  id,
  selected,
  onPress,
}: {
  id: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useAppTranslation();
  const color = paymentColors[id] || "#16a34a";

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg border-2 p-4 ${
        selected
          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
          : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <View className="flex-row items-center gap-4">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <Feather
            name={id === "cash_on_delivery" ? "dollar-sign" : "credit-card"}
            color="#ffffff"
            size={19}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
            {t(`checkout.payment_methods.${id}.name`)}
          </Text>
          <Text className="mt-0.5 font-sans text-xs leading-5 text-gray-600 dark:text-slate-400">
            {t(`checkout.payment_methods.${id}.description`)}
          </Text>
        </View>
        <View
          className={`h-5 w-5 rounded-full border-2 ${
            selected
              ? "border-green-500 bg-green-500"
              : "border-gray-300 dark:border-slate-600"
          }`}
        >
          {selected ? <Feather name="check" color="#ffffff" size={14} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function OtpModal({
  visible,
  emailHint,
  otp,
  countdown,
  error,
  loading,
  verified,
  onChangeOtp,
  onClose,
  onVerify,
  onResend,
}: {
  visible: boolean;
  emailHint: string;
  otp: string;
  countdown: number;
  error: string;
  loading: boolean;
  verified: boolean;
  onChangeOtp: (value: string) => void;
  onClose: () => void;
  onVerify: () => void;
  onResend: () => void;
}) {
  const { t } = useAppTranslation();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const minutes = Math.floor(countdown / 60);
  const seconds = String(countdown % 60).padStart(2, "0");
  const otpDigits = Array.from({ length: 6 }, (_, index) => otp[index] || "");

  const focusInput = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(index, 5))]?.focus();
  };

  const handleDigitChange = (value: string, index: number) => {
    const cleanValue = value.replace(/\D/g, "");

    if (cleanValue.length > 1) {
      const nextOtp = cleanValue.slice(0, 6);
      onChangeOtp(nextOtp);
      focusInput(nextOtp.length >= 6 ? 5 : nextOtp.length);
      return;
    }

    const digits = Array.from(
      { length: 6 },
      (_, digitIndex) => otp[digitIndex] || "",
    );
    digits[index] = cleanValue;
    onChangeOtp(digits.join("").slice(0, 6));

    if (cleanValue && index < 5) {
      focusInput(index + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior="padding" className="flex-1" enabled>
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          <View className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-slate-700">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                  <Feather name="shield" color="#16a34a" size={20} />
                </View>
                <View>
                  <Text className="font-sans text-base font-semibold text-gray-900 dark:text-slate-100">
                    {t("checkout.otp_title")}
                  </Text>
                  <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-500">
                    {t("checkout.otp_subtitle")}
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose}>
                <Feather name="x" color="#64748b" size={22} />
              </Pressable>
            </View>

            <View className="gap-3 px-4 py-4">
              {verified ? (
                <View className="items-center py-4">
                  <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                    <Feather name="check-circle" color="#16a34a" size={32} />
                  </View>
                  <Text className="text-center font-sans text-base font-semibold text-green-700 dark:text-green-300">
                    {t("checkout.otp_verified")}
                  </Text>
                </View>
              ) : (
                <>
                  <Text className="text-center font-sans text-sm leading-6 text-gray-600 dark:text-slate-400">
                    {t("checkout.otp_sent_prefix")}{" "}
                    <Text className="font-bold text-gray-700 dark:text-slate-200">
                      {t("checkout.otp_6_digit_code")}
                    </Text>{" "}
                    {t("checkout.otp_sent_to")}{" "}
                    <Text className="font-medium text-gray-900 dark:text-slate-100">
                      {emailHint || t("checkout.email")}
                    </Text>
                  </Text>

                  <View className="w-full flex-row gap-1.5">
                    {otpDigits.map((digit, index) => (
                      <TextInput
                        key={`otp-input-${index}`}
                        ref={(ref) => {
                          inputRefs.current[index] = ref;
                        }}
                        value={digit}
                        onChangeText={(value) =>
                          handleDigitChange(value, index)
                        }
                        onKeyPress={({ nativeEvent }) => {
                          if (
                            nativeEvent.key === "Backspace" &&
                            !otp[index] &&
                            index > 0
                          ) {
                            focusInput(index - 1);
                          }
                        }}
                        onSubmitEditing={() => {
                          if (otp.length === 6) {
                            onVerify();
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        className={`h-12 min-w-0 flex-1 max-w-10 rounded-xl border-2 text-center font-sans text-lg font-bold text-gray-900 transition-colors dark:bg-slate-700 dark:text-slate-100 ${
                          error
                            ? "border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/30"
                            : "border-gray-200 bg-white focus:border-green-500 dark:border-slate-600"
                        }`}
                      />
                    ))}
                  </View>

                  {error ? (
                    <View className="flex-row items-center justify-center gap-1.5">
                      <Feather name="x-circle" color="#dc2626" size={16} />
                      <Text className="text-center font-sans text-sm text-red-600">
                        {error}
                      </Text>
                    </View>
                  ) : null}
                  <View className="flex-row justify-center">
                    {countdown > 0 ? (
                      <Text className="text-center font-sans text-xs text-gray-400 dark:text-slate-600">
                        {t("checkout.otp_expires_in")}{" "}
                        <Text className="font-semibold text-gray-600 dark:text-slate-400">
                          {minutes}:{seconds}
                        </Text>
                      </Text>
                    ) : (
                      <Text className="text-center font-sans text-xs font-medium text-red-500">
                        {t("checkout.otp_expired")}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={onVerify}
                    disabled={loading || otp.length !== 6 || countdown === 0}
                    className="flex-row items-center justify-center gap-2 rounded-xl bg-green-600 py-3 disabled:opacity-50"
                  >
                    {loading ? <ActivityIndicator color="#ffffff" /> : null}
                    <Text className="text-center font-sans text-sm font-semibold text-white">
                      {loading
                        ? t("checkout.verifying")
                        : t("checkout.confirm_order")}
                    </Text>
                  </Pressable>
                  <Pressable onPress={onResend} disabled={countdown > 0}>
                    <Text
                      className={`text-center font-sans text-sm font-medium text-green-600 dark:text-green-300 ${
                        countdown > 0 ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      {t("checkout.otp_resend")}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CheckoutMessageToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={Boolean(message)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center px-4 pt-24" pointerEvents="box-none">
        <View
          className="w-full max-w-md flex-row items-start gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-2xl dark:border-red-900/60 dark:bg-slate-900"
          pointerEvents="auto"
        >
          <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <Feather name="alert-triangle" color="#dc2626" size={16} />
          </View>
          <Text className="min-w-0 flex-1 font-sans text-sm font-semibold leading-5 text-red-700 dark:text-red-200">
            {message}
          </Text>
          <Pressable
            onPress={onClose}
            className="h-8 w-8 items-center justify-center rounded-full"
            accessibilityRole="button"
          >
            <Feather name="x" color="#b91c1c" size={17} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function CheckoutNative() {
  const { language, t } = useAppTranslation();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useNativeAuth();
  const { cartSnapshot } = useCartCount();
  const isBuyer = hasUserRole(user, "buyer");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkoutBusyRef = useRef(false);
  const otpSessionVerifiedRef = useRef(false);
  const idempotencyKeyRef = useRef(
    globalThis.crypto?.randomUUID?.() ??
      `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [cart, setCart] = useState<CartResult | null>(() => cartSnapshot);
  const [address, setAddress] = useState<CheckoutAddress>(emptyAddress);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [enabledMethods, setEnabledMethods] = useState<string[]>([
    "cash_on_delivery",
  ]);
  const [checkoutApiStates, setCheckoutApiStates] = useState<
    { state: string; cities: string[] }[] | null
  >(null);
  const [savedProfile, setSavedProfile] = useState<CheckoutProfile | null>(
    null,
  );
  const [orderNotes, setOrderNotes] = useState("");
  const [shippingFee, setShippingFee] = useState(5000);
  const [taxRate, setTaxRate] = useState(0.05);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CheckoutCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [locationRows, setLocationRows] = useState<CheckoutLocationRow[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(true);
  const [feesError, setFeesError] = useState("");
  const [sellerShippingFees, setSellerShippingFees] = useState<
    CheckoutSellerShippingFee[]
  >([]);
  const [sellerPolicies, setSellerPolicies] = useState<CheckoutSellerPolicy[]>(
    [],
  );
  const [agreedSellers, setAgreedSellers] = useState<Record<string, boolean>>(
    {},
  );
  const [policyError, setPolicyError] = useState("");
  const [loading, setLoading] = useState(() => !cartSnapshot);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [otpVisible, setOtpVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpEmailHint, setOtpEmailHint] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<CheckoutOrderResult | null>(
    null,
  );
  const [paymentQueue, setPaymentQueue] = useState<CheckoutOrderResult[]>([]);
  const [paymentQueueIndex, setPaymentQueueIndex] = useState(0);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const addressCountry = address.country;
  const addressState = address.state;
  const addressCity = address.city;
  const addressTownship = address.township;
  const displayTree = useMemo(
    () =>
      toLocationTree(
        getMyanmarStates(language),
        myanmarLocationsEng,
      ) as LocationTreeNode[],
    [language],
  );
  const selectedTreeNode = useMemo(
    () =>
      displayTree.find(
        (node: LocationTreeNode) => node.engState === addressState,
      ),
    [addressState, displayTree],
  );
  const selectedCityNode = useMemo(
    () =>
      selectedTreeNode?.cities.find(
        (city: LocationCityNode) => city.engCity === addressCity,
      ),
    [addressCity, selectedTreeNode],
  );
  const selectedLocationRow = useMemo(
    () => locationRows.find((row) => row.engState === addressState),
    [addressState, locationRows],
  );
  const selectedLocationCity = useMemo(
    () =>
      selectedLocationRow?.cities.find((city) => city.engCity === addressCity),
    [addressCity, selectedLocationRow],
  );
  const shippingLocationSummary = useMemo(() => {
    const townshipIndex =
      selectedCityNode?.engTownships?.indexOf(addressTownship) ?? -1;
    const townshipLabel =
      townshipIndex >= 0 && selectedCityNode?.townships?.[townshipIndex]
        ? selectedCityNode.townships[townshipIndex]
        : addressTownship;

    return [
      selectedLocationCity?.label,
      townshipLabel,
      selectedLocationRow?.label,
    ]
      .filter(Boolean)
      .join(", ");
  }, [
    addressTownship,
    selectedCityNode,
    selectedLocationCity?.label,
    selectedLocationRow?.label,
  ]);
  const needsTownship = Boolean(selectedCityNode?.engTownships?.length);

  useEffect(() => {
    if (cartSnapshot) {
      setCart(cartSnapshot);
    }
  }, [cartSnapshot]);

  useEffect(() => {
    const controller = new AbortController();

    const loadCheckout = async () => {
      if (!cartSnapshot) {
        setLoading(true);
      }

      try {
        const [cartResult, methods, apiStates, profile] = await Promise.all([
          fetchCart(controller.signal),
          fetchPaymentMethods(controller.signal),
          fetchCheckoutLocations(controller.signal),
          fetchCheckoutProfile(controller.signal).catch(() => null),
        ]);

        if (controller.signal.aborted) return;

        setCart(cartResult);
        emitCartCountChanged({ cart: cartResult });
        setEnabledMethods(methods);
        setPaymentMethod((current) =>
          methods.includes(current)
            ? current
            : methods[0] || "cash_on_delivery",
        );
        setCheckoutApiStates(apiStates);

        if (profile) {
          setSavedProfile(profile);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setMessage(
            err instanceof Error
              ? err.message
              : t("checkout.load_failed", {
                  defaultValue: "Failed to load checkout",
                }),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLocationLoading(false);
        }
      }
    };

    void loadCheckout();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    setLocationRows(buildCheckoutLocationRows(checkoutApiStates, displayTree));
  }, [checkoutApiStates, displayTree]);

  useEffect(() => {
    if (!savedProfile) return;

    const { engState, engCity, engTownship } = resolveCanonicalLocation(
      displayTree,
      savedProfile.state,
      savedProfile.city,
      savedProfile.township,
    );

    setAddress((current) => ({
      ...current,
      full_name: current.full_name || savedProfile.name,
      phone: current.phone || savedProfile.phone,
      address: current.address || savedProfile.address,
      state: current.state || engState,
      city: current.city || engCity,
      township: current.township || engTownship,
      postal_code: current.postal_code || savedProfile.postalCode,
    }));
  }, [displayTree, savedProfile]);

  useEffect(() => {
    const controller = new AbortController();
    const slugs =
      cart?.items.map((item) => item.sellerSlug || "").filter(Boolean) || [];
    if (!slugs.length) {
      const timeout = setTimeout(() => {
        setSellerPolicies([]);
        setAgreedSellers({});
      }, 0);
      return () => {
        clearTimeout(timeout);
        controller.abort();
      };
    }

    void fetchCheckoutSellerPolicies(slugs, controller.signal).then(
      (policies) => {
        if (!controller.signal.aborted) setSellerPolicies(policies);
      },
    );

    return () => controller.abort();
  }, [cart?.items]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setFeesLoading(true);
      setFeesError("");
      void fetchCheckoutFees(
        {
          country: addressCountry,
          state: addressState,
          city: addressCity,
          township: addressTownship,
        },
        controller.signal,
      )
        .then((fees) => {
          if (!controller.signal.aborted) {
            setShippingFee(fees.shippingFeeValue);
            setTaxRate(fees.taxRate);
            setSellerShippingFees(fees.sellers);
            setFeesError("");
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setFeesError(
              err instanceof Error
                ? err.message
                : t("checkout.fees_load_failed", {
                    defaultValue:
                      "Could not calculate shipping and tax. Update your address and try again.",
                  }),
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setFeesLoading(false);
        });
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [addressCity, addressCountry, addressState, addressTownship]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    },
    [],
  );

  const totals = useMemo(() => {
    const subtotal = cart?.subtotalValue || 0;
    const tax = subtotal * taxRate;
    const discount = coupon?.discountAmountValue || 0;
    const total = Math.max(0, subtotal + shippingFee + tax - discount);

    return {
      subtotal,
      tax,
      discount,
      total,
      shippingAndHandling: shippingFee + tax,
    };
  }, [cart?.subtotalValue, coupon?.discountAmountValue, shippingFee, taxRate]);

  const hasCartIssues = Boolean(
    cart?.items.some((item) => !item.isAvailable || !item.isQuantityValid),
  );

  const uniqueSellerCount = useMemo(() => {
    const sellers = new Set(
      cart?.items
        .map((item) => item.sellerSlug || item.seller)
        .filter(Boolean) || [],
    );
    return sellers.size;
  }, [cart?.items]);

  const isMultiSellerCart = uniqueSellerCount > 1;
  const requiresSequentialPayments =
    isMultiSellerCart && paymentMethod !== "cash_on_delivery";

  const updateAddress = (key: keyof CheckoutAddress, value: string) => {
    setAddress((current) => ({ ...current, [key]: value }));
  };

  const selectState = (value: string) => {
    setAddress((current) => ({
      ...current,
      state: value,
      city: "",
      township: "",
    }));
  };

  const selectCity = (value: string) => {
    setAddress((current) => ({ ...current, city: value, township: "" }));
  };

  const selectTownship = (value: string) => {
    setAddress((current) => ({ ...current, township: value }));
  };

  const hideMessage = () => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = null;
    setMessage("");
  };

  const showMessage = (value: string) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage(value);
    messageTimerRef.current = setTimeout(() => {
      setMessage("");
      messageTimerRef.current = null;
    }, 4500);
  };

  const refreshCartFromServer = async () => {
    try {
      const nextCart = await fetchCart();
      setCart(nextCart);
      emitCartCountChanged({ cart: nextCart });
    } catch {
      // Keep the current snapshot if the cart refetch fails.
    }
  };

  const rotateIdempotencyKey = () => {
    idempotencyKeyRef.current =
      globalThis.crypto?.randomUUID?.() ??
      `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  useEffect(() => {
    if (authLoading) return;
    if (checkoutBusyRef.current || paymentVisible || otpVisible) return;

    if (!isAuthenticated) {
      router.replace("/login?returnTo=/checkout" as Href);
      return;
    }

    if (!isBuyer) {
      showMessage(
        t("checkout.buyer_only_checkout", {
          defaultValue: "Only buyer accounts can checkout.",
        }),
      );
      router.replace("/products" as Href);
    }
  }, [
    authLoading,
    isAuthenticated,
    isBuyer,
    otpVisible,
    paymentVisible,
    router,
    t,
  ]);

  const finishOrder = async (
    order: CheckoutOrderResult,
    allOrders: CheckoutOrderResult[] = [],
  ) => {
    checkoutBusyRef.current = true;
    setRedirecting(true);
    setPaymentVisible(false);
    setPaymentOrder(null);
    setPaymentQueue([]);
    setPaymentQueueIndex(0);
    setOtpVisible(false);
    await clearCartItems().catch(() => {});
    setCart((current) =>
      current
        ? {
            ...current,
            items: [],
            totalItems: 0,
            subtotalValue: 0,
            subtotal: "0 MMK",
          }
        : current,
    );
    emitCartCountChanged({
      cart: {
        items: [],
        subtotalValue: 0,
        subtotal: "0 MMK",
        totalItems: 0,
        summary: {
          subtotalValue: 0,
          shippingFeeValue: 0,
          taxRate: 0.05,
          taxValue: 0,
          totalValue: 0,
          subtotal: "0 MMK",
          shippingFee: "0 MMK",
          tax: "0 MMK",
          total: "0 MMK",
        },
      },
    });
    router.replace({
      pathname: "/payment-success",
      params: {
        order_id: String(order.id),
        order_ids: (allOrders.length ? allOrders : [order])
          .map((entry) => String(entry.id))
          .join(","),
      },
    } as Href);
  };

  const beginOnlinePayment = (orders: CheckoutOrderResult[]) => {
    if (!orders.length) return;

    const queue = orders.map((entry) => ({
      ...entry,
      paymentMethod: entry.paymentMethod || paymentMethod,
    }));

    checkoutBusyRef.current = true;
    setPaymentQueue(queue);
    setPaymentQueueIndex(0);
    setPaymentOrder(queue[0]);
    setPaymentVisible(true);
    setOtpVisible(false);
  };

  const startOtpCountdown = (seconds = 600) => {
    setOtpCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpCountdown((current) => {
        if (current <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const validateBeforeOtp = () => {
    if (!cart || cart.items.length === 0) {
      showMessage(t("checkout.empty_cart_message"));
      return false;
    }
    if (hasCartIssues) {
      showMessage(t("checkout.cart_quantity_issue"));
      return false;
    }
    if (!address.full_name || !address.phone || !address.address) {
      showMessage(t("checkout.fill_required_shipping"));
      return false;
    }
    if (!address.state || !address.city) {
      showMessage(t("checkout.fill_state_city"));
      return false;
    }
    if (needsTownship && !address.township) {
      showMessage(t("checkout.fill_township"));
      return false;
    }
    const unagreed = sellerPolicies.filter(
      (policy) => !agreedSellers[String(policy.sellerId)],
    );
    if (unagreed.length > 0) {
      setPolicyError(
        t("checkout.policy_agree_error", {
          sellers: unagreed.map((policy) => policy.sellerName).join(", "),
        }),
      );
      return false;
    }
    setPolicyError("");
    return true;
  };

  const handleApplyCoupon = async () => {
    if (!cart) return;
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError(t("checkout.coupon_enter_code"));
      return;
    }
    setCouponError("");

    try {
      const result = await validateCheckoutCoupon(code, cart);
      setCoupon(result);
      setCouponInput("");
    } catch (err) {
      setCoupon(null);
      setCouponError(formatApiErrorMessage(err, t("checkout.coupon_invalid")));
    }
  };

  const handleRequestOtp = async () => {
    if (!cart || !validateBeforeOtp() || submitting) return;
    checkoutBusyRef.current = true;
    setSubmitting(true);
    setOtpError("");

    try {
      const result = await requestCheckoutOtp(
        cart,
        address,
        paymentMethod,
        coupon,
      );
      setOtpEmailHint(result.emailHint);
      setOtp("");
      setOtpVerified(false);
      otpSessionVerifiedRef.current = false;
      setOtpVisible(true);
      startOtpCountdown(result.expiresIn);
    } catch (err) {
      checkoutBusyRef.current = false;
      showMessage(formatApiErrorMessage(err, t("checkout.otp_send_failed")));
    } finally {
      setSubmitting(false);
    }
  };

  const buildOrderPayload = (paymentStatus: string) => {
    if (!cart) throw new Error("Missing cart");

    return {
      items: cart.items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        quantity: item.quantity,
        price:
          item.sellingPriceValue > 0 && item.sellingPriceValue < item.priceValue
            ? item.sellingPriceValue
            : item.priceValue,
      })),
      shipping_address: address,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      notes: orderNotes,
      total_amount: totals.total,
      subtotal_amount: totals.subtotal,
      shipping_fee: shippingFee,
      tax_amount: totals.tax,
      coupon_id: coupon?.couponId ?? null,
      coupon_code: coupon?.code ?? null,
      coupon_discount_amount: coupon?.discountAmountValue ?? 0,
    };
  };

  const placeOrder = async (): Promise<
    { success: true } | { success: false; message: string }
  > => {
    setSubmitting(true);
    try {
      const pendingPayment = paymentMethod !== "cash_on_delivery";
      const result = await createCheckoutOrder(
        buildOrderPayload("pending"),
        undefined,
        idempotencyKeyRef.current,
      );

      if (pendingPayment) {
        // Backend keeps cart until payment is confirmed — do not clear locally yet.
        beginOnlinePayment(result.orders);
        return { success: true };
      }

      // COD: backend clears cart on order create; finishOrder syncs local state.
      await finishOrder(result.primaryOrder, result.orders);
      return { success: true };
    } catch (err) {
      checkoutBusyRef.current = false;
      return {
        success: false,
        message: formatApiErrorMessage(err, t("checkout.order_create_failed")),
      };
    } finally {
      setSubmitting(false);
    }
  };

  const completePaidOrder = async (order: CheckoutOrderResult) => {
    const queue = paymentQueue.length ? paymentQueue : [order];
    const currentIndex = queue.findIndex(
      (entry) => String(entry.id) === String(order.id),
    );
    const resolvedIndex = currentIndex >= 0 ? currentIndex : paymentQueueIndex;
    const nextIndex = resolvedIndex + 1;

    if (nextIndex < queue.length) {
      void refreshCartFromServer();
      showMessage(
        t("checkout.payment_step_complete", {
          defaultValue:
            "Payment {{step}} of {{total}} complete. Continue with the next seller.",
          step: nextIndex,
          total: queue.length,
        }),
      );
      setPaymentQueueIndex(nextIndex);
      setPaymentOrder(queue[nextIndex]);
      return;
    }

    // The modal already verified payment and populated order.paymentStatus before
    // calling onSuccess — trust it rather than re-fetching, which would introduce
    // a second network round-trip that can fail and silently block navigation.
    const alreadyConfirmed =
      String(order.paymentStatus).toLowerCase() === "paid" ||
      order.paymentMethod === "cash_on_delivery";

    if (alreadyConfirmed) {
      setPaymentVisible(false);
      setPaymentOrder(null);
      await finishOrder(queue[0], queue);
      return;
    }

    // Fallback: re-verify when the modal did not supply a confirmed status.
    try {
      const receipt = await fetchPaymentReceipt(order.id);
      const isPaid = String(receipt.paymentStatus).toLowerCase() === "paid";
      const isCod = receipt.paymentMethod === "cash_on_delivery";

      if (!isCod && !isPaid) {
        showMessage(
          t("checkout.payment_not_confirmed_yet", {
            defaultValue:
              "Payment is not confirmed yet. Please complete payment first.",
          }),
        );
        setPaymentOrder({ ...order, paymentMethod: receipt.paymentMethod });
        setPaymentVisible(true);
        return;
      }

      setPaymentVisible(false);
      setPaymentOrder(null);
      await finishOrder(queue[0], queue);
    } catch (err) {
      showMessage(
        err instanceof Error
          ? err.message
          : t("checkout.payment_confirmed_load_failed"),
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError(t("checkout.otp_enter_code"));
      return;
    }
    setOtpLoading(true);
    setOtpError("");

    try {
      if (!otpSessionVerifiedRef.current) {
        await verifyCheckoutOtp(otp);
        otpSessionVerifiedRef.current = true;
      }

      setOtpVerified(true);
      checkoutBusyRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);

      const orderResult = await placeOrder();
      if (!orderResult.success) {
        checkoutBusyRef.current = false;
        setOtpVerified(false);
        setOtpError(orderResult.message);
        return;
      }
    } catch (err) {
      checkoutBusyRef.current = false;
      otpSessionVerifiedRef.current = false;
      setOtpVerified(false);
      setOtpError(formatApiErrorMessage(err, t("checkout.otp_incorrect")));
    } finally {
      setOtpLoading(false);
    }
  };

  if (authLoading || redirecting) {
    return (
      <AppLayout>
        <View className="flex-1 items-center justify-center bg-gray-50 px-4 py-16 dark:bg-slate-950">
          <ActivityIndicator color="#16a34a" size="large" />
          <Text className="mt-4 font-sans text-sm text-gray-500 dark:text-slate-400">
            {redirecting
              ? t("checkout.processing_order")
              : t("checkout.loading", { defaultValue: "Loading checkout..." })}
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <View
          className={`${SITE_CONTAINER_CLASS} bg-gray-50 py-8 dark:bg-slate-950`}
        >
          <View className="gap-6">
            <View className="h-8 w-48 rounded bg-gray-200 dark:bg-slate-800" />
            <View className="gap-6 lg:flex-row">
              <View className="min-h-96 flex-1 rounded-2xl bg-gray-200 dark:bg-slate-800" />
              <View className="min-h-96 rounded-2xl bg-gray-200 dark:bg-slate-800 lg:w-[34%]" />
            </View>
          </View>
        </View>
      </AppLayout>
    );
  }

  const paymentFlowActive = paymentVisible || paymentQueue.length > 0;
  const showEmptyCart =
    !redirecting &&
    !paymentFlowActive &&
    !otpVisible &&
    (!cart || cart.items.length === 0);
  const showCheckoutForm = Boolean(cart?.items.length);

  const checkoutOverlays = (
    <>
      <OtpModal
        visible={otpVisible}
        emailHint={otpEmailHint}
        otp={otp}
        countdown={otpCountdown}
        error={otpError}
        loading={otpLoading}
        verified={otpVerified}
        onChangeOtp={setOtp}
        onClose={() => {
          checkoutBusyRef.current = false;
          otpSessionVerifiedRef.current = false;
          setOtpVisible(false);
          setOtp("");
          setOtpError("");
          setOtpLoading(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }}
        onVerify={handleVerifyOtp}
        onResend={handleRequestOtp}
      />
      <CheckoutPaymentModal
        key={String(paymentOrder?.id ?? "checkout-payment")}
        visible={paymentVisible}
        order={paymentOrder}
        paymentMethod={paymentOrder?.paymentMethod || paymentMethod}
        paymentStep={paymentQueueIndex + 1}
        paymentStepCount={paymentQueue.length || 1}
        onSuccess={(order) => {
          void completePaidOrder(order);
        }}
        onCancel={() => {
          checkoutBusyRef.current = false;
          rotateIdempotencyKey();
          setPaymentVisible(false);
          setPaymentOrder(null);
          const remaining = Math.max(
            0,
            paymentQueue.length - paymentQueueIndex,
          );
          setPaymentQueue([]);
          setPaymentQueueIndex(0);
          void refreshCartFromServer();
          showMessage(
            remaining > 1
              ? t("checkout.payment_cancelled_partial", {
                  defaultValue:
                    "Payment was cancelled. Unpaid seller orders remain in your dashboard.",
                })
              : t("checkout.payment_cancelled_saved", {
                  defaultValue:
                    "Payment was cancelled. Your order is saved in My Orders — use Pay Now to complete payment.",
                }),
          );
        }}
      />
      <CheckoutMessageToast message={message} onClose={hideMessage} />
    </>
  );

  if (showEmptyCart) {
    return (
      <AppLayout showNativeBottomTabs={!paymentVisible && !otpVisible}>
        <View className="bg-gray-50 px-4 py-16 dark:bg-slate-950">
          <View className="mx-auto w-full max-w-2xl items-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
              <Feather name="shopping-cart" color="#94a3b8" size={38} />
            </View>
            <Text className="mt-6 text-center font-sans text-2xl font-bold text-gray-950 dark:text-slate-100">
              {t("checkout.empty_cart_title")}
            </Text>
            <Text className="mt-2 text-center font-sans text-sm text-gray-600 dark:text-slate-400">
              {t("checkout.empty_cart_message")}
            </Text>
            <Link href="/products" asChild>
              <Pressable className={Platform.OS === 'web' ? 'mt-8 rounded-lg bg-green-600 px-6 py-3' : 'mt-6 rounded-lg bg-green-600 px-6 py-3'}>
                <Text className="font-sans text-sm font-semibold text-white">
                  {t("checkout.continue_shopping")}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
        {checkoutOverlays}
      </AppLayout>
    );
  }

  if (!showCheckoutForm) {
    return (
      <AppLayout showNativeBottomTabs={!paymentVisible && !otpVisible}>
        <View className="flex-1 bg-gray-50 dark:bg-slate-950" />
        {checkoutOverlays}
      </AppLayout>
    );
  }

  return (
    <AppLayout showNativeBottomTabs={!paymentVisible && !otpVisible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
      >
        <View
          className={`${SITE_CONTAINER_CLASS} bg-gray-50 py-8 dark:bg-slate-950`}
        >
          <View className="mb-8">
            <Text className="font-sans text-3xl font-bold text-gray-950 dark:text-slate-100">
              {t("checkout.title")}
            </Text>
            <Text className="mt-2 font-sans text-base text-gray-600 dark:text-slate-400">
              {t("checkout.subtitle")}
            </Text>
          </View>

          <View className="gap-8 lg:flex-row lg:items-start">
            <View className="min-w-0 flex-1 gap-6">
              <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <View className="mb-5 flex-row items-center gap-3">
                  <Feather name="map-pin" color="#16a34a" size={22} />
                  <Text className="font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                    {t("checkout.shipping_info")}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-4">
                  <Field
                    label={`${t("checkout.full_name")} *`}
                    value={address.full_name}
                    onChangeText={(value) => updateAddress("full_name", value)}
                    placeholder={t("checkout.full_name_placeholder")}
                  />
                  <Field
                    label={`${t("checkout.phone_number")} *`}
                    value={address.phone}
                    onChangeText={(value) => updateAddress("phone", value)}
                    placeholder={t("checkout.phone_placeholder")}
                    keyboardType="phone-pad"
                  />
                  <CheckoutLocationSelect
                    label={`${t("checkout.state_region")} *`}
                    value={address.state}
                    placeholder={t("checkout.select_state_region")}
                    loading={locationLoading}
                    options={locationRows.map((row) => ({
                      value: row.engState,
                      label: row.label,
                    }))}
                    onSelect={selectState}
                  />
                  <CheckoutLocationSelect
                    label={`${t("checkout.city")} *`}
                    value={address.city}
                    placeholder={
                      address.state
                        ? t("checkout.select_city")
                        : t("checkout.select_state_first")
                    }
                    disabled={!address.state}
                    options={(selectedLocationRow?.cities || []).map(
                      (city) => ({
                        value: city.engCity,
                        label: city.label,
                      }),
                    )}
                    onSelect={selectCity}
                  />
                  {needsTownship ? (
                    <CheckoutLocationSelect
                      label={`${t("checkout.township")} *`}
                      value={address.township}
                      placeholder={t("checkout.select_township")}
                      disabled={!address.city}
                      options={(selectedCityNode?.engTownships || []).map(
                        (township, index) => ({
                          value: township,
                          label:
                            selectedCityNode?.townships?.[index] || township,
                        }),
                      )}
                      onSelect={selectTownship}
                    />
                  ) : null}
                  <View className="w-full">
                    <Field
                      label={`${t("checkout.address")} *`}
                      value={address.address}
                      onChangeText={(value) => updateAddress("address", value)}
                      placeholder={t("checkout.address_placeholder")}
                      multiline
                    />
                  </View>
                  <Field
                    label={t("checkout.postal_code")}
                    value={address.postal_code}
                    onChangeText={(value) =>
                      updateAddress("postal_code", value)
                    }
                  />
                  <Field
                    label={t("checkout.country")}
                    value={t("checkout.country_myanmar")}
                    onChangeText={() => undefined}
                    editable={false}
                  />
                </View>
              </View>

              <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <View className="mb-5 flex-row items-center gap-3">
                  <Feather name="credit-card" color="#16a34a" size={22} />
                  <Text className="font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                    {t("checkout.payment_method")}
                  </Text>
                </View>
                <View className="gap-3">
                  {enabledMethods.map((method) => (
                    <PaymentMethodCard
                      key={method}
                      id={method}
                      selected={paymentMethod === method}
                      onPress={() => setPaymentMethod(method)}
                    />
                  ))}
                </View>
                <View className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <Text className="font-sans text-sm font-semibold text-blue-800 dark:text-blue-200">
                    {paymentMethod === "cash_on_delivery"
                      ? t("checkout.cod_title")
                      : t("checkout.mmqr_how_title")}
                  </Text>
                  <Text className="mt-1 font-sans text-sm leading-6 text-blue-700 dark:text-blue-200">
                    {paymentMethod === "cash_on_delivery"
                      ? t("checkout.cod_text")
                      : t("checkout.mmqr_how_text")}
                  </Text>
                </View>
                {requiresSequentialPayments ? (
                  <View className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <Text className="font-sans text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {t("checkout.multi_seller_payment_title", {
                        defaultValue: "Multiple sellers in your cart",
                      })}
                    </Text>
                    <Text className="mt-1 font-sans text-sm leading-6 text-amber-800 dark:text-amber-300">
                      {t("checkout.multi_seller_payment_text", {
                        defaultValue:
                          "Items ship from {{count}} sellers. You will complete one payment per seller after placing the order.",
                        count: uniqueSellerCount,
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <Text className="mb-3 font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                  {t("checkout.order_notes_optional")}
                </Text>
                <TextInput
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  placeholder={t("checkout.order_notes_placeholder")}
                  placeholderTextColor="#94a3b8"
                  multiline
                  className="min-h-28 rounded-lg border border-gray-300 bg-white px-4 py-3 font-sans text-base text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </View>
            </View>

            <View className="w-full gap-6 lg:w-[36%]">
              <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <Text className="font-sans text-lg font-semibold text-gray-950 dark:text-slate-100">
                  {t("checkout.order_summary")}
                </Text>
                <View className="mt-4">
                  {cart?.items.map((item) => (
                    <CheckoutItem key={String(item.id)} item={item} />
                  ))}
                </View>

                <View className="mt-5 gap-3">
                  <View className="flex-row gap-2">
                    <TextInput
                      value={couponInput}
                      onChangeText={setCouponInput}
                      placeholder={t("checkout.enter_coupon_code")}
                      placeholderTextColor="#94a3b8"
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 font-sans text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <Pressable
                      onPress={handleApplyCoupon}
                      className="rounded-lg bg-green-600 px-4 py-3"
                    >
                      <Text className="font-sans text-sm font-semibold text-white">
                        {t("checkout.apply")}
                      </Text>
                    </Pressable>
                  </View>
                  {couponError ? (
                    <Text className="font-sans text-xs text-red-600">
                      {couponError}
                    </Text>
                  ) : null}
                  {coupon ? (
                    <View className="flex-row items-center justify-between rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
                      <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                        {t("checkout.coupon_with_code", { code: coupon.code })}{" "}
                        ·{" "}
                        {t("checkout.saves", { amount: coupon.discountAmount })}
                      </Text>
                      <Pressable onPress={() => setCoupon(null)}>
                        <Feather name="x" color="#15803d" size={16} />
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <View className="mt-6 gap-3 border-t border-gray-100 pt-5 dark:border-slate-800">
                  <View className="flex-row justify-between">
                    <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                      {t("checkout.subtotal_items", {
                        count: cart?.totalItems ?? 0,
                      })}
                    </Text>
                    <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {cart?.subtotal}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
                        {t("checkout.shipping_handling")}
                      </Text>
                      {address.city || address.state ? (
                        <Text className="mt-0.5 font-sans text-[10px] text-gray-400 dark:text-slate-500">
                          {t("checkout.to_location", {
                            location:
                              shippingLocationSummary ||
                              [address.city, address.state]
                                .filter(Boolean)
                                .join(", "),
                          })}
                        </Text>
                      ) : null}
                      <Text className="mt-0.5 font-sans text-xs text-gray-400 dark:text-slate-500">
                        {t("checkout.shipping_handling_note")}
                      </Text>
                    </View>
                    {feesLoading ? (
                      <Text className="font-sans text-xs font-semibold text-gray-400 dark:text-slate-500">
                        {t("checkout.updating")}
                      </Text>
                    ) : (
                      <Text className="font-sans text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {formatMMK(totals.shippingAndHandling)}
                      </Text>
                    )}
                  </View>
                  {sellerShippingFees.length > 1 ? (
                    <View className="gap-1 rounded-lg bg-gray-50 p-3 dark:bg-slate-900/50">
                      {sellerShippingFees.map((sellerFee) => (
                        <View
                          key={String(sellerFee.sellerId)}
                          className="flex-row justify-between gap-3"
                        >
                          <Text
                            className="min-w-0 flex-1 font-sans text-xs text-gray-500 dark:text-slate-400"
                            numberOfLines={1}
                          >
                            {sellerFee.sellerName}
                          </Text>
                          <Text className="font-sans text-xs font-medium text-gray-700 dark:text-slate-300">
                            {sellerFee.shippingFee}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {coupon ? (
                    <View className="flex-row justify-between">
                      <Text className="font-sans text-sm text-green-700 dark:text-green-300">
                        {t("checkout.coupon_with_code", { code: coupon.code })}
                      </Text>
                      <Text className="font-sans text-sm font-semibold text-green-700 dark:text-green-300">
                        -{coupon.discountAmount}
                      </Text>
                    </View>
                  ) : null}
                  {feesError ? (
                    <Text className="font-sans text-sm text-red-600 dark:text-red-300">
                      {feesError}
                    </Text>
                  ) : null}
                  <View className="flex-row justify-between border-t border-gray-100 pt-4 dark:border-slate-800">
                    <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
                      {t("checkout.total")}
                    </Text>
                    {feesLoading ? (
                      <Text className="font-sans text-sm font-semibold text-gray-400 dark:text-slate-500">
                        {t("checkout.calculating")}
                      </Text>
                    ) : (
                      <Text className="font-sans text-lg font-bold text-green-700 dark:text-green-300">
                        {formatMMK(totals.total)}
                      </Text>
                    )}
                  </View>
                </View>

                {hasCartIssues ? (
                  <View className="mt-5 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                    <Text className="font-sans text-sm leading-6 text-amber-700 dark:text-amber-300">
                      {t("checkout.cart_quantity_issue")}
                    </Text>
                  </View>
                ) : null}

                {sellerPolicies.length > 0 ? (
                  <View className="mt-5 gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <View className="flex-row items-center gap-2">
                      <Feather name="file-text" color="#d97706" size={16} />
                      <Text className="font-sans text-sm font-bold text-amber-900 dark:text-amber-200">
                        {t("checkout.seller_policies_title")}
                      </Text>
                    </View>
                    {sellerPolicies.map((policy) => {
                      const key = String(policy.sellerId);
                      const agreed = Boolean(agreedSellers[key]);
                      return (
                        <View
                          key={key}
                          className="gap-2 rounded-lg border border-amber-100 bg-white p-3 dark:border-amber-800/70 dark:bg-slate-800"
                        >
                          <Text className="font-sans text-sm font-bold text-gray-950 dark:text-slate-100">
                            {policy.sellerName}
                          </Text>
                          {policy.returnPolicy ? (
                            <Text
                              className="font-sans text-xs leading-5 text-gray-600 dark:text-slate-400"
                              numberOfLines={1}
                            >
                              {t("checkout.return_refund_policy")}:{" "}
                              {policy.returnPolicy}
                            </Text>
                          ) : null}
                          {policy.shippingPolicy ? (
                            <Text
                              className="font-sans text-xs leading-5 text-gray-600 dark:text-slate-400"
                              numberOfLines={1}
                            >
                              {t("checkout.shipping_policy")}:{" "}
                              {policy.shippingPolicy}
                            </Text>
                          ) : null}
                          <Pressable
                            onPress={() => {
                              setAgreedSellers((current) => ({
                                ...current,
                                [key]: !agreed,
                              }));
                              setPolicyError("");
                            }}
                            className="flex-row items-start gap-2 pt-1"
                          >
                            <View
                              className={`mt-0.5 h-5 w-5 items-center justify-center rounded border-2 ${
                                agreed
                                  ? "border-green-600 bg-green-600"
                                  : "border-gray-300 dark:border-slate-500"
                              }`}
                            >
                              {agreed ? (
                                <Feather
                                  name="check"
                                  color="#ffffff"
                                  size={13}
                                />
                              ) : null}
                            </View>
                            <Text className="min-w-0 flex-1 font-sans text-xs leading-5 text-gray-700 dark:text-slate-300">
                              {t("checkout.agree_seller_policies", {
                                seller: policy.sellerName,
                              })}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                    {policyError ? (
                      <Text className="font-sans text-sm text-red-600 dark:text-red-300">
                        {policyError}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <Pressable
                  onPress={handleRequestOtp}
                  disabled={
                    submitting ||
                    feesLoading ||
                    hasCartIssues ||
                    Boolean(feesError)
                  }
                  className="mt-6 rounded-lg bg-green-600 px-4 py-3 disabled:opacity-50"
                >
                  <Text className="text-center font-sans text-base font-semibold text-white">
                    {submitting
                      ? t("checkout.processing_order")
                      : paymentMethod === "cash_on_delivery"
                        ? t("checkout.confirm_cash_order_amount", {
                            amount: formatMMK(totals.total),
                          })
                        : t("checkout.proceed_payment_amount", {
                            amount: formatMMK(totals.total),
                          })}
                  </Text>
                </Pressable>
                <Text className="mt-3 text-center font-sans text-xs text-gray-500 dark:text-slate-400">
                  {t("checkout.secure_checkout")}
                </Text>
              </View>

              <View className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <View className="mb-4 flex-row gap-3">
                  <Feather name="truck" color="#16a34a" size={20} />
                  <View>
                    <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100">
                      {t("checkout.fast_delivery")}
                    </Text>
                    <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                      {t("checkout.delivery_days")}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <Feather name="shield" color="#16a34a" size={20} />
                  <View>
                    <Text className="font-sans text-sm font-semibold text-gray-950 dark:text-slate-100">
                      {t("checkout.secure_payment")}
                    </Text>
                    <Text className="font-sans text-xs text-gray-500 dark:text-slate-400">
                      {t("checkout.ssl_protected")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      {checkoutOverlays}
    </AppLayout>
  );
}
