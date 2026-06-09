import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { PaymentQrBadge, PaymentQrDisplay } from "@/components/checkout/payment-qr-display";
import { useAppTranslation } from "@/i18n";
import {
  initiateOrderPayment,
  verifyOrderPayment,
  fetchPaymentReceipt,
  type CheckoutOrderResult,
  type PaymentInitiationResult,
} from "@/utils/native-api";

const paymentColors: Record<string, string> = {
  mmqr: "#3b82f6",
  kbz_pay: "#8b5cf6",
  wave_pay: "#22c55e",
  cb_pay: "#ef4444",
  aya_pay: "#f97316",
  cash_on_delivery: "#eab308",
};

const paymentLabels: Record<string, string> = {
  mmqr: "MMQR Payment",
  kbz_pay: "KBZ Pay",
  wave_pay: "Wave Pay",
  cb_pay: "CB Pay",
  aya_pay: "AYA Pay",
  cash_on_delivery: "Cash on Delivery",
};

const walletMethods = new Set(["kbz_pay", "wave_pay", "cb_pay", "aya_pay"]);
const MAX_POLLS = 300;
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

type PaymentStage = "init" | "pending" | "polling" | "success" | "failed" | "expired";

export function CheckoutPaymentModal({
  visible,
  order,
  paymentMethod,
  onSuccess,
  onCancel,
}: {
  visible: boolean;
  order: CheckoutOrderResult | null;
  paymentMethod: string;
  onSuccess: (order: CheckoutOrderResult) => void;
  onCancel: () => void;
}) {
  const { t } = useAppTranslation();
  const { width, height } = useWindowDimensions();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const completedRef = useRef(false);
  const startedOrderRef = useRef<string | number | null>(null);
  const [stage, setStage] = useState<PaymentStage>("init");
  const [session, setSession] = useState<PaymentInitiationResult | null>(null);
  const [error, setError] = useState("");
  const [polls, setPolls] = useState(0);
  const methodLabel = paymentLabels[paymentMethod] || paymentMethod;
  const methodColor = paymentColors[paymentMethod] || "#16a34a";
  const canOpenWallet = Boolean(session?.deepLink);
  const qrSize = Math.min(260, Math.max(190, width - 112));
  const showQrPanel =
    paymentMethod === "mmqr" ||
    Boolean(session?.qrImageUrl || session?.qrString);
  const showWalletPanel = !showQrPanel && (walletMethods.has(paymentMethod) || canOpenWallet);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const resetModal = useCallback(() => {
    stopPolling();
    consecutiveErrorsRef.current = 0;
    completedRef.current = false;
    setStage("init");
    setSession(null);
    setError("");
    setPolls(0);
  }, []);

  useEffect(
    () => () => {
      stopPolling();
    },
    []
  );

  const completeSuccess = useCallback(
    async (nextOrder: CheckoutOrderResult) => {
      if (completedRef.current) return;

      try {
        const receipt = await fetchPaymentReceipt(nextOrder.id);
        const isPaid = String(receipt.paymentStatus).toLowerCase() === "paid";
        const isCod = receipt.paymentMethod === "cash_on_delivery";

        if (!isPaid && !isCod) {
          return;
        }

        completedRef.current = true;
        stopPolling();
        setStage("success");
        onSuccess({
          ...nextOrder,
          paymentStatus: receipt.paymentStatus,
          paymentMethod: receipt.paymentMethod,
        });
      } catch {
        completedRef.current = true;
        stopPolling();
        setStage("success");
        onSuccess({ ...nextOrder, paymentStatus: "paid" });
      }
    },
    [onSuccess]
  );

  const verifyPayment = useCallback(async () => {
    if (!order || completedRef.current) return;

    try {
      const result = await verifyOrderPayment(order.id);
      consecutiveErrorsRef.current = 0;

      if (result.paid) {
        completeSuccess(order);
      }
    } catch {
      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_POLL_ERRORS) {
        stopPolling();
        setError(
          t("checkout.payment_verify_failed", {
            defaultValue: "Payment verification failed. Please check your orders page or try again.",
          })
        );
        setStage("failed");
      }
    }
  }, [completeSuccess, order, t]);

  const startPolling = useCallback(() => {
    stopPolling();
    consecutiveErrorsRef.current = 0;
    setPolls(0);

    pollRef.current = setInterval(() => {
      setPolls((current) => {
        const next = current + 1;
        if (next > MAX_POLLS) {
          stopPolling();
          setStage("expired");
          return current;
        }
        void verifyPayment();
        return next;
      });
    }, 3000);
  }, [verifyPayment]);

  const initiatePayment = useCallback(async () => {
    if (!order) return;

    setStage("pending");
    setError("");
    setPolls(0);

    try {
      const result = await initiateOrderPayment(order.id);
      if (!result.success) {
        setError(result.message || t("checkout.payment_init_failed", { defaultValue: "Failed to initiate payment." }));
        setStage("init");
        return;
      }

      setSession(result);
      setStage("polling");
      startPolling();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("checkout.payment_gateway_unreachable", { defaultValue: "Could not reach payment gateway." })
      );
      setStage("init");
    }
  }, [order, startPolling, t]);

  useEffect(() => {
    if (!visible) {
      startedOrderRef.current = null;
      resetModal();
      return;
    }

    if (!order || startedOrderRef.current === order.id) return;
    startedOrderRef.current = order.id;
    void initiatePayment();
  }, [initiatePayment, order, resetModal, visible]);

  const openWallet = async () => {
    if (!session?.deepLink) return;

    try {
      const supported = await Linking.canOpenURL(session.deepLink);
      if (!supported) {
        setError(
          t("checkout.wallet_not_installed", {
            defaultValue: "{{method}} is not available on this device. Please scan the QR code or complete payment from your wallet app.",
            method: methodLabel,
          })
        );
        return;
      }
      await Linking.openURL(session.deepLink);
    } catch {
      setError(
        t("checkout.wallet_open_failed", {
          defaultValue: "Could not open {{method}}. Please complete payment from your wallet app.",
          method: methodLabel,
        })
      );
    }
  };

  const cancelPayment = async () => {
    stopPolling();
    resetModal();
    onCancel();
  };

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancelPayment}>
      <View className="flex-1 items-center justify-end bg-black/55 px-3 py-4 sm:justify-center sm:p-4">
        <View
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
          style={{ maxHeight: Math.max(520, height * 0.9) }}
        >
          <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: methodColor }}>
                <Feather name={paymentMethod === "mmqr" ? "grid" : "smartphone"} color="#ffffff" size={20} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100" numberOfLines={1}>
                  {methodLabel}
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400" numberOfLines={1}>
                  #{order.orderNumber}
                </Text>
              </View>
            </View>
            <Pressable onPress={cancelPayment} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
              <Feather name="x" color="#64748b" size={18} />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between bg-gray-50 px-5 py-3 dark:bg-slate-900/60">
            <Text className="font-sans text-sm text-gray-600 dark:text-slate-400">
              {t("checkout.amount_to_pay", { defaultValue: "Amount to pay" })}
            </Text>
            <Text className="font-sans text-lg font-black text-gray-950 dark:text-slate-100">
              {order.total}
            </Text>
          </View>

          <ScrollView
            className="flex-shrink"
            contentContainerClassName="gap-4 px-5 py-5"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <View className="flex-row items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <Feather name="alert-triangle" color="#dc2626" size={16} />
                <Text className="min-w-0 flex-1 font-sans text-sm text-red-700 dark:text-red-300">
                  {error}
                </Text>
              </View>
            ) : null}

            {stage === "init" ? (
              <View className="items-center gap-2 py-4">
                <Text className="text-center font-sans text-sm text-gray-600 dark:text-slate-400">
                  {t("checkout.preparing_payment", {
                    defaultValue: "Preparing your {{method}} payment session.",
                    method: methodLabel,
                  })}
                </Text>
              </View>
            ) : null}

            {stage === "pending" ? (
              <View className="items-center gap-3 py-8">
                <ActivityIndicator color="#16a34a" />
                <Text className="font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t("checkout.connecting_gateway", { defaultValue: "Connecting to payment gateway..." })}
                </Text>
              </View>
            ) : null}

            {stage === "polling" && session ? (
              <View className="items-center gap-4">
                {showQrPanel ? (
                  <>
                    <PaymentQrBadge paymentMethod={paymentMethod} />
                    <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                      {paymentMethod === "mmqr"
                        ? t("checkout.mmqr_scan_hint", {
                            defaultValue:
                              "Scan with KBZPay, WavePay, AYA Pay, CB Pay, or any banking app.",
                          })
                        : t("checkout.wallet_qr_hint", {
                            defaultValue: "Scan this QR code with {{method}}, or open the app if installed.",
                            method: methodLabel,
                          })}
                    </Text>
                    <View className="items-center justify-center rounded-2xl border-4 border-green-500 bg-white p-3">
                      <PaymentQrDisplay
                        qrImageUrl={session.qrImageUrl}
                        qrString={session.qrString}
                        size={qrSize}
                        loadingLabel={t("checkout.qr_generating", {
                          defaultValue: "QR code is being generated.",
                        })}
                      />
                    </View>
                    {canOpenWallet ? (
                      <Pressable onPress={openWallet} className="w-full rounded-xl bg-purple-600 px-5 py-3">
                        <Text className="text-center font-sans text-sm font-bold text-white">
                          {t("checkout.open_wallet_app", {
                            defaultValue: "Open {{method}} App",
                            method: methodLabel,
                          })}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : showWalletPanel ? (
                  <>
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/30">
                      <Feather name="smartphone" color="#7c3aed" size={30} />
                    </View>
                    <Text className="text-center font-sans text-sm text-gray-600 dark:text-slate-400">
                      {t("checkout.wallet_return_hint", {
                        defaultValue:
                          "Open {{method}}, complete payment, then return here. We will update the status automatically.",
                        method: methodLabel,
                      })}
                    </Text>
                    {canOpenWallet ? (
                      <Pressable onPress={openWallet} className="w-full rounded-xl bg-purple-600 px-5 py-3">
                        <Text className="text-center font-sans text-sm font-bold text-white">
                          {t("checkout.open_wallet_app", {
                            defaultValue: "Open {{method}} App",
                            method: methodLabel,
                          })}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <Text className="text-center font-sans text-sm text-gray-600 dark:text-slate-400">
                    {t("checkout.waiting_payment_confirmation", {
                      defaultValue: "Complete payment in your wallet app. Status updates automatically.",
                    })}
                  </Text>
                )}

                {session.sandbox ? (
                  <View className="w-full rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
                    <Text className="text-center font-sans text-xs text-amber-700 dark:text-amber-300">
                      {t("checkout.sandbox_mode", {
                        defaultValue: "Sandbox mode - no real payment will be processed.",
                      })}
                    </Text>
                  </View>
                ) : null}

                <View className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full bg-green-500" />
                  <Text className="font-sans text-xs text-gray-400 dark:text-slate-500">
                    {t("checkout.waiting_confirmation_count", {
                      defaultValue: "Waiting for payment confirmation... ({{count}})",
                      count: polls,
                    })}
                  </Text>
                </View>
              </View>
            ) : null}

            {stage === "success" ? (
              <View className="items-center gap-3 py-6">
                <Feather name="check-circle" color="#16a34a" size={54} />
                <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
                  {t("checkout.payment_confirmed", { defaultValue: "Payment Confirmed" })}
                </Text>
                <Text className="text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                  {t("checkout.order_processing", { defaultValue: "Your order is being processed." })}
                </Text>
              </View>
            ) : null}

            {stage === "failed" || stage === "expired" ? (
              <View className="items-center gap-3 py-6">
                <Feather
                  name={stage === "expired" ? "clock" : "x-circle"}
                  color={stage === "expired" ? "#d97706" : "#dc2626"}
                  size={54}
                />
                <Text className="font-sans text-lg font-bold text-gray-950 dark:text-slate-100">
                  {stage === "expired"
                    ? t("checkout.payment_session_expired", { defaultValue: "Payment Session Expired" })
                    : t("checkout.payment_failed_title", { defaultValue: "Payment Failed" })}
                </Text>
                <Text className="text-center font-sans text-sm text-gray-500 dark:text-slate-400">
                  {stage === "expired"
                    ? t("checkout.payment_session_expired_hint", {
                        defaultValue: "Generate a new payment session and try again.",
                      })
                    : t("checkout.payment_failed_hint", {
                        defaultValue: "Generate a new payment session and try again.",
                      })}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View className="gap-2 px-5 pb-5">
            {stage === "init" || stage === "failed" || stage === "expired" ? (
              <Pressable onPress={() => void initiatePayment()} className="rounded-xl bg-green-600 py-3">
                <Text className="text-center font-sans text-sm font-bold text-white">
                  {stage === "init"
                    ? t("checkout.generate_payment", {
                        defaultValue: "Generate {{method}} Payment",
                        method: methodLabel,
                      })
                    : t("checkout.try_again_payment", { defaultValue: "Try Again" })}
                </Text>
              </Pressable>
            ) : null}
            {stage !== "success" ? (
              <Pressable onPress={() => void cancelPayment()} className="rounded-xl border border-gray-300 py-3 dark:border-slate-600">
                <Text className="text-center font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {stage === "polling"
                    ? t("checkout.cancel_payment", { defaultValue: "Cancel Payment" })
                    : t("checkout.go_back", { defaultValue: "Go Back" })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
