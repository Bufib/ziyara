import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useResolvedTheme } from '@/features/theme/theme-mode';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const resolvedTheme = useResolvedTheme();
  const overrideColor = resolvedTheme === 'dark' ? darkColor : lightColor;

  return (
    <View
      style={[{ backgroundColor: overrideColor ?? theme[type ?? 'background'] }, style]}
      {...otherProps}
    />
  );
}
