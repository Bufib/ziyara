import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SymbolIcon, type SymbolIconName } from '@/components/ui/symbol-icon';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AdminSectionHeaderProps = {
  description: string;
  expanded: boolean;
  icon: SymbolIconName;
  onToggle: () => void;
  status: string;
  statusColor?: ThemeColor;
  title: string;
};

export function AdminSectionHeader({
  description,
  expanded,
  icon,
  onToggle,
  status,
  statusColor = 'textSecondary',
  title,
}: AdminSectionHeaderProps) {
  const theme = useTheme();
  const color = theme[statusColor];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.header,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.icon, { backgroundColor: theme.background }]}>
        <SymbolIcon color={theme.textSecondary} name={icon} size={21} />
      </View>

      <View style={styles.text}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>

      <View style={styles.trailing}>
        <View style={[styles.status, { backgroundColor: `${color}1A`, borderColor: color }]}>
          <ThemedText type="tinyBold" style={{ color }}>
            {status}
          </ThemedText>
        </View>
        <View style={[styles.chevron, expanded && styles.chevronExpanded]}>
          <SymbolIcon color={theme.textSecondary} name="chevron" size={20} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 84,
    padding: Spacing.three,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 24,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  status: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 150,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  pressed: {
    opacity: 0.72,
  },
});
