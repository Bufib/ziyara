import { Colors } from '@/constants/theme';
import { useResolvedTheme } from '@/features/theme/theme-mode';

export function useTheme() {
  return Colors[useResolvedTheme()];
}
