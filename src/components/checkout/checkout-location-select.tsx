import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

type LocationOption = {
  value: string;
  label: string;
};

export function CheckoutLocationSelect({
  label,
  value,
  placeholder,
  options,
  disabled,
  loading,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: LocationOption[];
  disabled?: boolean;
  loading?: boolean;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const displayValue =
    options.find((option) => option.value === value)?.label || value;
  const canOpen = !disabled && !loading && options.length > 0;

  const close = () => setOpen(false);
  const select = (nextValue: string) => {
    onSelect(nextValue);
    close();
  };

  return (
    <View className="w-full gap-2 sm:w-[48%]">
      <Text className="font-sans text-sm font-semibold text-gray-700 dark:text-slate-300">
        {label}
      </Text>
      <Pressable
        onPress={() => {
          if (canOpen) setOpen(true);
        }}
        className={`min-h-12 flex-row items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
          disabled
            ? "border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60"
            : "border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800"
        }`}
      >
        <Text
          className={`min-w-0 flex-1 font-sans text-sm font-semibold ${
            value
              ? "text-gray-900 dark:text-slate-100"
              : "text-gray-400 dark:text-slate-500"
          }`}
          numberOfLines={1}
        >
          {loading ? "Loading..." : displayValue || placeholder}
        </Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          color={disabled ? "#94a3b8" : "#16a34a"}
          size={18}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable className="flex-1 justify-center bg-black/45 px-4 py-8" onPress={close}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">
                  {label.replace(" *", "")}
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                  {placeholder}
                </Text>
              </View>
              <Pressable onPress={close} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="x" color="#64748b" size={18} />
              </Pressable>
            </View>

            <ScrollView
              className="max-h-96"
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => select(option.value)}
                    className={`flex-row items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-800 ${
                      active ? "bg-green-50 dark:bg-green-900/20" : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    <Text
                      className={`min-w-0 flex-1 font-sans text-sm font-semibold ${
                        active
                          ? "text-green-700 dark:text-green-300"
                          : "text-gray-700 dark:text-slate-300"
                      }`}
                      numberOfLines={2}
                    >
                      {option.label}
                    </Text>
                    {active ? <Feather name="check" color="#16a34a" size={18} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
