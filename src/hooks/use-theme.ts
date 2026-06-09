import { Colors } from '@/constants/theme';
import { useTheme as useAppTheme } from '@/context/theme';

export function useTheme() {
  const { theme } = useAppTheme();
  return Colors[theme];
}
