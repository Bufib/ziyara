import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { SymbolIcon, type SymbolIconName } from '@/components/ui/symbol-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useResolvedTheme } from '@/features/theme/theme-mode';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  icon: SymbolIconName;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
};

export function Button({ icon, label, onPress, style, variant = 'primary' }: ButtonProps) {
  const theme = useTheme();
  const resolvedTheme = useResolvedTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const foreground = isPrimary
    ? resolvedTheme === 'dark'
      ? Colors.dark.background
      : Colors.dark.text
    : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary
            ? theme.accent
            : isGhost
              ? 'transparent'
              : theme.backgroundElement,
          borderColor: isGhost ? 'transparent' : isPrimary ? theme.accent : theme.border,
        },
        style,
        pressed && styles.pressed,
      ]}>
      <SymbolIcon color={foreground} name={icon} size={18} />
      <ThemedText type="smallBold" style={{ color: foreground }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
});
