import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createElement, useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import {
  FORM_DATE_FIELD_CLASS,
  FORM_DATE_TRIGGER_CLASS,
} from "@/components/ui/form-field-styles";

const toDateValue = (value: string) => {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const toInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type NativeDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
};

function DateFieldLabel({ label }: { label: string }) {
  return (
    <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
      {label}
    </Text>
  );
}

function WebDateInput({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
}: NativeDateFieldProps) {
  return createElement("input", {
    type: "date",
    "aria-label": label,
    value: value || "",
    min: minimumDate,
    max: maximumDate,
    disabled,
    onChange: (event: Event) => {
      const target = event.target as HTMLInputElement;
      onChange(target.value);
    },
    className:
      "native-date-field-input w-full min-h-10 border-0 bg-transparent font-sans text-sm font-semibold text-gray-900 outline-none dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
  });
}

function ClearDateButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="self-start rounded-xl border border-gray-200 px-3 py-2 dark:border-slate-700"
    >
      <Text className="font-sans text-xs font-semibold text-gray-600 dark:text-slate-300">
        Clear date
      </Text>
    </Pressable>
  );
}

function DateTrigger({
  value,
  placeholder,
  disabled,
  onPress,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`${FORM_DATE_TRIGGER_CLASS} ${disabled ? "opacity-60" : ""}`}
    >
      <Text
        className={`min-w-0 flex-1 font-sans text-sm font-semibold ${
          value
            ? "text-gray-900 dark:text-slate-100"
            : "text-gray-400 dark:text-slate-500"
        }`}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      <Feather
        name="calendar"
        color={disabled ? "#94a3b8" : "#16a34a"}
        size={18}
      />
    </Pressable>
  );
}

export function NativeDateField({
  label,
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  minimumDate,
  maximumDate,
  disabled,
}: NativeDateFieldProps) {
  const selectedDate = useMemo(() => toDateValue(value), [value]);
  const minDate = useMemo(
    () => (minimumDate ? toDateValue(minimumDate) : undefined),
    [minimumDate],
  );
  const maxDate = useMemo(
    () => (maximumDate ? toDateValue(maximumDate) : undefined),
    [maximumDate],
  );

  if (Platform.OS === "web") {
    return (
      <View className="w-full gap-2 md:flex-1">
        <DateFieldLabel label={label} />
        <View
          className={`${FORM_DATE_FIELD_CLASS} ${disabled ? "opacity-60" : ""}`}
        >
          <WebDateInput
            label={label}
            value={value}
            onChange={onChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            disabled={disabled}
            placeholder={placeholder}
          />
        </View>
        {value ? <ClearDateButton onPress={() => onChange("")} /> : null}
      </View>
    );
  }

  if (Platform.OS === "android") {
    return (
      <AndroidDateField
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        selectedDate={selectedDate}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
      />
    );
  }

  return (
    <IosDateField
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      selectedDate={selectedDate}
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
    />
  );
}

function AndroidDateField({
  label,
  value,
  onChange,
  placeholder,
  selectedDate,
  minDate,
  maxDate,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  selectedDate: Date;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View className="w-full gap-2 md:flex-1">
      <DateFieldLabel label={label} />
      <DateTrigger
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onPress={() => setShowPicker(true)}
      />
      {value ? <ClearDateButton onPress={() => onChange("")} /> : null}
      {showPicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={minDate}
          maximumDate={maxDate}
          accentColor="#16a34a"
          onChange={(_event, nextDate) => {
            onChange(toInputValue(nextDate || selectedDate));
            setShowPicker(false);
          }}
        />
      ) : null}
    </View>
  );
}

function IosDateField({
  label,
  value,
  onChange,
  placeholder,
  selectedDate,
  minDate,
  maxDate,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  selectedDate: Date;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(selectedDate);

  useEffect(() => {
    if (open) setDraft(selectedDate);
  }, [open, selectedDate]);

  const close = () => setOpen(false);

  return (
    <View className="w-full gap-2 md:flex-1">
      <DateFieldLabel label={label} />
      <DateTrigger
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      {value ? <ClearDateButton onPress={() => onChange("")} /> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable className="flex-1 justify-end bg-black/45" onPress={close}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-3xl border border-gray-100 bg-white p-4 pb-8 dark:border-slate-700 dark:bg-slate-900"
          >
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">
                  {label}
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                  {toInputValue(draft)}
                </Text>
              </View>
              <Pressable
                onPress={close}
                className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800"
              >
                <Feather name="x" color="#64748b" size={18} />
              </Pressable>
            </View>

            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              minimumDate={minDate}
              maximumDate={maxDate}
              accentColor="#16a34a"
              onChange={(_event, nextDate) => setDraft(nextDate || draft)}
            />

            <View className="mt-4 flex-row gap-3">
              {value ? (
                <Pressable
                  onPress={() => {
                    onChange("");
                    close();
                  }}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700"
                >
                  <Text className="text-center font-sans text-sm font-bold text-gray-600 dark:text-slate-300">
                    Clear
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  onChange(toInputValue(draft));
                  close();
                }}
                className="flex-1 rounded-xl bg-green-600 px-4 py-3"
              >
                <Text className="text-center font-sans text-sm font-bold text-white">
                  Done
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
