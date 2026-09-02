import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { Spacing } from '@/constants/theme';
import {
  getSimCardCount,
  maximumSimCardCount,
  minimumSimCardCount,
} from '@/features/auth/sim-card-count';
import { useI18n } from '@/features/i18n/i18n';
import { useTheme } from '@/hooks/use-theme';

export function SimCardCountField({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const parsedValue = getSimCardCount(value);
  const displayedValue = parsedValue ?? minimumSimCardCount;

  const changeBy = (difference: number) => {
    const nextValue = Math.min(
      maximumSimCardCount,
      Math.max(minimumSimCardCount, displayedValue + difference),
    );
    onChange(String(nextValue));
  };

  const changeText = (nextValue: string) => {
    const digits = nextValue.replace(/\D/g, '').slice(0, 2);

    if (!digits) {
      onChange('');
      return;
    }

    onChange(String(Math.min(Number(digits), maximumSimCardCount)));
  };

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{t('simCards.count')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('simCards.countBody')}
      </ThemedText>

      <View style={styles.controls}>
        <SimCardCountButton
          disabled={disabled || displayedValue <= minimumSimCardCount}
          label={t('simCards.decrease')}
          name="minus"
          onPress={() => changeBy(-1)}
        />
        <TextInput
          accessibilityLabel={t('simCards.count')}
          editable={!disabled}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={2}
          onBlur={() => {
            if (parsedValue === null) {
              onChange(String(minimumSimCardCount));
            }
          }}
          onChangeText={changeText}
          selectTextOnFocus
          style={[
            styles.input,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={value}
        />
        <SimCardCountButton
          disabled={disabled || displayedValue >= maximumSimCardCount}
          label={t('simCards.increase')}
          name="plus"
          onPress={() => changeBy(1)}
        />
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {t('simCards.countLimit', {
          maximum: maximumSimCardCount,
          minimum: minimumSimCardCount,
        })}
      </ThemedText>
    </View>
  );
}

function SimCardCountButton({
  disabled,
  label,
  name,
  onPress,
}: {
  disabled: boolean;
  label: string;
  name: 'minus' | 'plus';
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <SymbolIcon color={theme.text} name={name} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
    minWidth: 0,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    minHeight: 52,
    minWidth: 72,
    paddingHorizontal: Spacing.two,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  stepButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
