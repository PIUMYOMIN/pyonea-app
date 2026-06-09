import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

const toDateValue = (value: string) => {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const toInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function NativeDateField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  minimumDate,
  maximumDate,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: string;
  maximumDate?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => toDateValue(value), [value]);
  const minDate = useMemo(() => (minimumDate ? toDateValue(minimumDate) : undefined), [minimumDate]);
  const maxDate = useMemo(() => (maximumDate ? toDateValue(maximumDate) : undefined), [maximumDate]);

  const close = () => setOpen(false);

  return (
    <View className="w-full gap-2 md:flex-1">
      <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
      </Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`min-h-12 flex-row items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
          disabled
            ? 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60'
            : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800'
        }`}
      >
        <Text
          className={`min-w-0 flex-1 font-sans text-sm font-semibold ${
            value ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'
          }`}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Feather name="calendar" color={disabled ? '#94a3b8' : '#16a34a'} size={18} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable className="flex-1 justify-center bg-black/45 px-4 py-8" onPress={close}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-base font-bold text-gray-950 dark:text-slate-100">
                  {label}
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-gray-500 dark:text-slate-400">
                  {value || placeholder}
                </Text>
              </View>
              <Pressable onPress={close} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                <Feather name="x" color="#64748b" size={18} />
              </Pressable>
            </View>

            <ExpoDateTimePicker
              value={selectedDate}
              mode="date"
              presentation="dialog"
              minimumDate={minDate}
              maximumDate={maxDate}
              accentColor="#16a34a"
              onDismiss={close}
              onValueChange={(_event: unknown, nextDate?: Date) => {
                if (nextDate) onChange(toInputValue(nextDate));
                close();
              }}
            />

            {value ? (
              <Pressable
                onPress={() => {
                  onChange('');
                  close();
                }}
                className="mt-4 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700"
              >
                <Text className="text-center font-sans text-sm font-bold text-gray-600 dark:text-slate-300">
                  Clear date
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
