import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

export function SelectPickerNative({
  label,
  value,
  options,
  onChange,
  disabled,
  required,
  placeholder = 'Select…',
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text className="font-sans text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`h-12 flex-row items-center justify-between rounded-xl border border-gray-300 bg-white px-4 dark:border-slate-600 dark:bg-slate-800 ${
          disabled ? 'opacity-50' : ''
        }`}>
        <Text
          className={`min-w-0 flex-1 font-sans text-sm ${
            selected?.label ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'
          }`}
          numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#6b7280" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40 md:items-center md:justify-center">
          <View className="max-h-[70%] rounded-t-3xl bg-white p-5 dark:bg-slate-900 md:w-[420px] md:rounded-2xl">
            <Text className="mb-4 font-sans text-lg font-bold text-gray-900 dark:text-slate-100">{label}</Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={`${option.value}-${option.label}`}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-2 rounded-xl border px-4 py-3 ${
                    value === option.value
                      ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}>
                  <Text className="font-sans text-sm text-gray-900 dark:text-slate-100">{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
