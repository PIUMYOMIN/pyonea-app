import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';

export function ProductDetailToast({
  message,
  onDismiss,
}: {
  message: { type: 'success' | 'error' | 'info'; text: string } | null;
  onDismiss: () => void;
}) {
  if (!message) return null;

  const isError = message.type === 'error';

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0 top-4 z-50 items-center px-4">
      <View
        className={`w-full max-w-sm flex-row items-center justify-between gap-4 rounded-xl border px-4 py-3 shadow-lg ${
          isError
            ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/40'
            : 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/40'
        }`}
      >
        <Text
          className={`min-w-0 flex-1 font-sans text-sm font-medium ${
            isError ? 'text-red-700 dark:text-red-300' : 'text-green-800 dark:text-green-300'
          }`}
        >
          {message.text}
        </Text>
        <Pressable onPress={onDismiss} className="h-8 w-8 items-center justify-center">
          <Feather name="x" color={isError ? '#dc2626' : '#15803d'} size={16} />
        </Pressable>
      </View>
    </View>
  );
}
